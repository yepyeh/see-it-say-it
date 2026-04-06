import { getAuthorityDirectoryEntryBySlug } from '../../data/authority-directory';
import { getZoneByAuthorityCode, getZoneBySlug } from '../../data/zones';
import { getDB } from './db';
import { listReports, type ReportSummary } from './reports';

export type CivicAuthoritySummary = {
	authorityId: string;
	authorityCode: string;
	authorityName: string;
	routingMode: string;
	contactEmail: string | null;
	reportUrl: string | null;
};

export type CivicRankingSummary = {
	highSeverityRank: number | null;
	highSeverityCount: number;
	fixSpeedRank: number | null;
	averageResolutionHours: number | null;
};

export type CivicCategorySummary = {
	category: string;
	count: number;
};

export type CivicMetricsSummary = {
	totalReports: number;
	openReports: number;
	resolvedThisMonth: number;
	highSeverityThisMonth: number;
	averageResolutionHours: number | null;
};

export type CivicSnapshot = {
	authority: CivicAuthoritySummary;
	zone: {
		slug: string;
		name: string;
	} | null;
	metrics: CivicMetricsSummary;
	rankings: CivicRankingSummary;
	categoryBreakdown: CivicCategorySummary[];
	recentReports: ReportSummary[];
};

function roundHours(value: number | null | undefined) {
	if (typeof value !== 'number' || Number.isNaN(value)) return null;
	return Math.round(value * 10) / 10;
}

export async function getAuthoritySummaryBySlug(locals: App.Locals, authorityCode: string) {
	const authority = await getDB(locals)
		.prepare(
			`SELECT
				authority_id AS authorityId,
				code AS authorityCode,
				name AS authorityName,
				routing_mode AS routingMode,
				contact_email AS contactEmail
			FROM authorities
			WHERE code = ?
			LIMIT 1`,
		)
		.bind(authorityCode)
		.first<CivicAuthoritySummary & { contactEmail: string | null }>();

	if (!authority) return null;

	const directoryEntry = getAuthorityDirectoryEntryBySlug(authority.authorityCode);

	return {
		...authority,
		authorityName: directoryEntry?.name ?? authority.authorityName,
		reportUrl: directoryEntry?.reportUrl ?? null,
	} satisfies CivicAuthoritySummary;
}

async function getMetrics(locals: App.Locals, authorityCode: string) {
	const row = await getDB(locals)
		.prepare(
			`SELECT
				COUNT(r.report_id) AS totalReports,
				SUM(CASE WHEN r.status != 'resolved' THEN 1 ELSE 0 END) AS openReports,
				SUM(CASE WHEN r.status = 'resolved' AND r.updated_at >= datetime('now', 'start of month') THEN 1 ELSE 0 END) AS resolvedThisMonth,
				SUM(CASE WHEN r.severity >= 4 AND r.created_at >= datetime('now', 'start of month') THEN 1 ELSE 0 END) AS highSeverityThisMonth,
				AVG(
					CASE
						WHEN r.status = 'resolved'
						THEN (julianday(r.updated_at) - julianday(COALESCE(r.submitted_at, r.created_at))) * 24
						ELSE NULL
					END
				) AS averageResolutionHours
			FROM reports r
			INNER JOIN authorities a ON a.authority_id = r.authority_id
			WHERE a.code = ?`,
		)
		.bind(authorityCode)
		.first<{
			totalReports: number | null;
			openReports: number | null;
			resolvedThisMonth: number | null;
			highSeverityThisMonth: number | null;
			averageResolutionHours: number | null;
		}>();

	return {
		totalReports: row?.totalReports ?? 0,
		openReports: row?.openReports ?? 0,
		resolvedThisMonth: row?.resolvedThisMonth ?? 0,
		highSeverityThisMonth: row?.highSeverityThisMonth ?? 0,
		averageResolutionHours: roundHours(row?.averageResolutionHours ?? null),
	} satisfies CivicMetricsSummary;
}

async function getRankings(locals: App.Locals, authorityCode: string) {
	const highSeverityRows = await getDB(locals)
		.prepare(
			`SELECT
				a.code AS authorityCode,
				COUNT(r.report_id) AS highSeverityCount
			FROM reports r
			INNER JOIN authorities a ON a.authority_id = r.authority_id
			WHERE r.created_at >= datetime('now', 'start of month')
			  AND r.severity >= 4
			GROUP BY a.code
			ORDER BY highSeverityCount DESC, a.name ASC`,
		)
		.all<{ authorityCode: string; highSeverityCount: number }>();

	const speedRows = await getDB(locals)
		.prepare(
			`SELECT
				a.code AS authorityCode,
				AVG((julianday(r.updated_at) - julianday(COALESCE(r.submitted_at, r.created_at))) * 24) AS averageResolutionHours
			FROM reports r
			INNER JOIN authorities a ON a.authority_id = r.authority_id
			WHERE r.status = 'resolved'
			  AND r.updated_at >= datetime('now', 'start of month')
			GROUP BY a.code
			HAVING COUNT(r.report_id) > 0
			ORDER BY averageResolutionHours ASC, a.name ASC`,
		)
		.all<{ authorityCode: string; averageResolutionHours: number }>();

	const highSeverityRank =
		highSeverityRows.results.findIndex((row) => row.authorityCode === authorityCode) + 1 || null;
	const speedRank =
		speedRows.results.findIndex((row) => row.authorityCode === authorityCode) + 1 || null;
	const highSeverityRow =
		highSeverityRows.results.find((row) => row.authorityCode === authorityCode) ?? null;
	const speedRow =
		speedRows.results.find((row) => row.authorityCode === authorityCode) ?? null;

	return {
		highSeverityRank,
		highSeverityCount: highSeverityRow?.highSeverityCount ?? 0,
		fixSpeedRank: speedRank,
		averageResolutionHours: roundHours(speedRow?.averageResolutionHours ?? null),
	} satisfies CivicRankingSummary;
}

async function getCategoryBreakdown(locals: App.Locals, authorityCode: string) {
	const rows = await getDB(locals)
		.prepare(
			`SELECT
				r.category AS category,
				COUNT(r.report_id) AS count
			FROM reports r
			INNER JOIN authorities a ON a.authority_id = r.authority_id
			WHERE a.code = ?
			GROUP BY r.category
			ORDER BY count DESC, r.category ASC
			LIMIT 6`,
		)
		.bind(authorityCode)
		.all<CivicCategorySummary>();

	return rows.results;
}

export async function getCivicSnapshotForAuthority(
	locals: App.Locals,
	authorityCode: string,
) {
	const authority = await getAuthoritySummaryBySlug(locals, authorityCode);
	if (!authority) return null;

	const [metrics, rankings, categoryBreakdown, recentReports] = await Promise.all([
		getMetrics(locals, authorityCode),
		getRankings(locals, authorityCode),
		getCategoryBreakdown(locals, authorityCode),
		listReports(locals, { authorityCode, limit: 12 }),
	]);

	const zone = getZoneByAuthorityCode(authorityCode);

	return {
		authority,
		zone: zone ? { slug: zone.slug, name: zone.name } : null,
		metrics,
		rankings,
		categoryBreakdown,
		recentReports,
	} satisfies CivicSnapshot;
}

export async function getCivicSnapshotForZone(locals: App.Locals, zoneSlug: string) {
	const zone = getZoneBySlug(zoneSlug);
	if (!zone) return null;

	const snapshot = await getCivicSnapshotForAuthority(locals, zone.authorityCode);
	if (!snapshot) return null;

	return {
		...snapshot,
		zone: {
			slug: zone.slug,
			name: zone.name,
		},
	} satisfies CivicSnapshot;
}
