import { getDB } from './db';
import { getOrCreateUser } from './auth';
import { sendSubmissionEmail } from './email';
import { resolveAuthorityByPoint } from './routing';

type ReportInput = {
	email?: string;
	name?: string;
	category: string;
	description: string;
	notesMarkdown: string;
	severity: number;
	latitude: number;
	longitude: number;
	locationLabel: string;
	sourceChannel?: string;
	media?: {
		storageKey: string;
		url: string;
		mimeType: string;
	}[];
};

export type ReportSummary = {
	reportId: string;
	category: string;
	description: string;
	notesMarkdown: string;
	severity: number;
	status: string;
	latitude: number;
	longitude: number;
	locationLabel: string | null;
	authorityId: string | null;
	authorityName: string | null;
	countryCode: string;
	createdAt: string;
	duplicateCount: number;
	confirmationCount: number;
	reporterEmail: string | null;
	reporterName: string | null;
};

export type ReportMediaSummary = {
	reportMediaId: string;
	storageKey: string;
	url: string;
	mimeType: string | null;
};

export type ReportDetail = ReportSummary & {
	media: ReportMediaSummary[];
};

function asRadians(value: number) {
	return (value * Math.PI) / 180;
}

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
	const earthRadius = 6371000;
	const deltaLat = asRadians(bLat - aLat);
	const deltaLng = asRadians(bLng - aLng);
	const first =
		Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
		Math.cos(asRadians(aLat)) *
			Math.cos(asRadians(bLat)) *
			Math.sin(deltaLng / 2) *
			Math.sin(deltaLng / 2);
	const second = 2 * Math.atan2(Math.sqrt(first), Math.sqrt(1 - first));
	return earthRadius * second;
}

export async function createReport(locals: App.Locals, input: ReportInput) {
	const db = getDB(locals);
	const userId = input.email ? await getOrCreateUser(db, input.email, input.name) : null;
	const authority = await resolveAuthorityByPoint(locals, input.latitude, input.longitude);
	const sourceChannel = input.sourceChannel ?? 'web';
	const duplicateCandidates = await db
		.prepare(
			`SELECT report_id, latitude, longitude, category, location_label
			 FROM reports
			 WHERE status IN ('submitted', 'dispatched', 'in_progress')
			   AND latitude BETWEEN ? AND ?
			   AND longitude BETWEEN ? AND ?
			 ORDER BY created_at DESC
			 LIMIT 20`,
		)
		.bind(
			input.latitude - 0.002,
			input.latitude + 0.002,
			input.longitude - 0.002,
			input.longitude + 0.002,
		)
		.all<{
			report_id: string;
			latitude: number;
			longitude: number;
			category: string;
			location_label: string | null;
		}>();

	const duplicateMatch =
		duplicateCandidates.results.find(
			(candidate) =>
				haversineMeters(
					input.latitude,
					input.longitude,
					candidate.latitude,
					candidate.longitude,
				) <= 50,
		) ?? null;

	const reportId = crypto.randomUUID();
	await db
		.prepare(
			`INSERT INTO reports (
				report_id,
				user_id,
				locale,
				country_code,
				authority_id,
				category,
				description,
				notes_markdown,
				severity,
				status,
				latitude,
				longitude,
				location_label,
				submitted_at,
				source_channel,
				duplicate_of_report_id
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`,
		)
		.bind(
			reportId,
			userId,
			'en-GB',
			'GB',
			authority?.authorityId ?? null,
			input.category,
			input.description,
			input.notesMarkdown,
			input.severity,
			'submitted',
			input.latitude,
			input.longitude,
			input.locationLabel || null,
			sourceChannel,
			duplicateMatch?.report_id ?? null,
			)
			.run();

	for (const media of input.media ?? []) {
		await db
			.prepare(
				`INSERT INTO report_media (
					report_media_id,
					report_id,
					storage_provider,
					storage_key,
					public_url,
					mime_type
				) VALUES (?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				crypto.randomUUID(),
				reportId,
				'r2',
				media.storageKey,
				media.url,
				media.mimeType,
			)
			.run();
	}

	await db
		.prepare(
			'INSERT INTO report_events (report_event_id, report_id, actor_user_id, event_type, event_payload_json) VALUES (?, ?, ?, ?, ?)',
		)
		.bind(
			crypto.randomUUID(),
			reportId,
			userId,
			'report_submitted',
			JSON.stringify({
				sourceChannel,
				duplicateCandidateId: duplicateMatch?.report_id ?? null,
				authorityId: authority?.authorityId ?? null,
			}),
		)
		.run();

	if (authority) {
		const destination =
			(
				await db
					.prepare('SELECT contact_email AS contactEmail FROM authorities WHERE authority_id = ? LIMIT 1')
					.bind(authority.authorityId)
					.first<{ contactEmail: string | null }>()
			)?.contactEmail ?? `${authority.code}@placeholder.local`;

		await db
			.prepare(
				`INSERT INTO authority_dispatches (
					dispatch_id,
					report_id,
					authority_id,
					destination,
					channel,
					status
				) VALUES (?, ?, ?, ?, ?, ?)`,
			)
				.bind(
					crypto.randomUUID(),
					reportId,
					authority.authorityId,
					destination,
					'email',
					'queued',
				)
			.run();
	}

	if (input.email) {
		const emailResult = await sendSubmissionEmail({
			reportId,
			email: input.email,
			name: input.name,
			category: input.category,
			description: input.description,
			locationLabel: input.locationLabel || 'Location provided in report',
			authorityName: authority?.name ?? null,
		}).catch((error) => ({ sent: false, error }));

		await db
			.prepare(
				'INSERT INTO report_events (report_event_id, report_id, actor_user_id, event_type, event_payload_json) VALUES (?, ?, ?, ?, ?)',
			)
			.bind(
				crypto.randomUUID(),
				reportId,
				userId,
				emailResult.sent ? 'submission_email_sent' : 'submission_email_failed',
				JSON.stringify(emailResult),
			)
			.run();
	}

	return {
		reportId,
		duplicateMatch,
		authority,
	};
}

export async function listReports(
	locals: App.Locals,
	options: {
		limit?: number;
		email?: string | null;
		userId?: string | null;
		authorityCode?: string | null;
		authorityCodes?: string[];
	} = {},
) {
	const db = getDB(locals);
	const clauses: string[] = [];
	const bindings: (string | number)[] = [];

	if (options.userId) {
		clauses.push('r.user_id = ?');
		bindings.push(options.userId);
	}

	if (options.email) {
		clauses.push('u.email = ?');
		bindings.push(options.email.trim().toLowerCase());
	}

	if (options.authorityCode) {
		clauses.push('a.code = ?');
		bindings.push(options.authorityCode);
	}

	if (options.authorityCodes?.length) {
		clauses.push(`a.code IN (${options.authorityCodes.map(() => '?').join(', ')})`);
		bindings.push(...options.authorityCodes);
	}

	const limit = Math.min(Math.max(options.limit ?? 24, 1), 50);
	bindings.push(limit);

	const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
	const query = `SELECT
		r.report_id AS reportId,
		r.category AS category,
		r.description AS description,
		r.notes_markdown AS notesMarkdown,
		r.severity AS severity,
		r.status AS status,
		r.latitude AS latitude,
		r.longitude AS longitude,
		r.location_label AS locationLabel,
		r.authority_id AS authorityId,
		a.name AS authorityName,
		r.country_code AS countryCode,
		r.created_at AS createdAt,
		u.email AS reporterEmail,
		u.display_name AS reporterName,
		COALESCE((SELECT COUNT(*) FROM reports child WHERE child.duplicate_of_report_id = r.report_id), 0) AS duplicateCount,
		COALESCE((SELECT COUNT(*) FROM report_confirmations rc WHERE rc.report_id = r.report_id), 0) AS confirmationCount
	FROM reports r
	LEFT JOIN users u ON u.user_id = r.user_id
	LEFT JOIN authorities a ON a.authority_id = r.authority_id
	${whereClause}
	ORDER BY r.created_at DESC
	LIMIT ?`;

	const result = await db.prepare(query).bind(...bindings).all<ReportSummary>();
	return result.results;
}

export async function getReportById(locals: App.Locals, reportId: string) {
	const report = await getDB(locals)
		.prepare(
			`SELECT
				r.report_id AS reportId,
				r.category AS category,
				r.description AS description,
				r.notes_markdown AS notesMarkdown,
				r.severity AS severity,
				r.status AS status,
				r.latitude AS latitude,
				r.longitude AS longitude,
				r.location_label AS locationLabel,
				r.authority_id AS authorityId,
				a.name AS authorityName,
				r.country_code AS countryCode,
				r.created_at AS createdAt,
				u.email AS reporterEmail,
				u.display_name AS reporterName,
				COALESCE((SELECT COUNT(*) FROM reports child WHERE child.duplicate_of_report_id = r.report_id), 0) AS duplicateCount,
				COALESCE((SELECT COUNT(*) FROM report_confirmations rc WHERE rc.report_id = r.report_id), 0) AS confirmationCount
			FROM reports r
			LEFT JOIN users u ON u.user_id = r.user_id
			LEFT JOIN authorities a ON a.authority_id = r.authority_id
			WHERE r.report_id = ?
			LIMIT 1`,
			)
			.bind(reportId)
			.first<ReportSummary>();
	if (!report) return null;

	const media = await getDB(locals)
		.prepare(
			`SELECT
				report_media_id AS reportMediaId,
				storage_key AS storageKey,
				public_url AS url,
				mime_type AS mimeType
			FROM report_media
			WHERE report_id = ?
			ORDER BY created_at ASC`,
		)
		.bind(reportId)
		.all<ReportMediaSummary>();

	return {
		...report,
		media: media.results,
	} satisfies ReportDetail;
}

export async function confirmReport(
	locals: App.Locals,
	reportId: string,
	confirmationName: string | null,
	userId?: string | null,
) {
	const db = getDB(locals);
	if (userId) {
		const existing = await db
			.prepare(
				'SELECT report_confirmation_id FROM report_confirmations WHERE report_id = ? AND user_id = ? LIMIT 1',
			)
			.bind(reportId, userId)
			.first<{ report_confirmation_id: string }>();

		if (existing?.report_confirmation_id) {
			const current = await db
				.prepare('SELECT COUNT(*) AS total FROM report_confirmations WHERE report_id = ?')
				.bind(reportId)
				.first<{ total: number }>();
			return current?.total ?? 0;
		}
	}

	await db
		.prepare(
			`INSERT INTO report_confirmations (
				report_confirmation_id,
				report_id,
				user_id,
				confirmer_name
			) VALUES (?, ?, ?, ?)`,
		)
		.bind(crypto.randomUUID(), reportId, userId ?? null, confirmationName)
		.run();

	const confirmationCount = await db
		.prepare('SELECT COUNT(*) AS total FROM report_confirmations WHERE report_id = ?')
		.bind(reportId)
		.first<{ total: number }>();

	return confirmationCount?.total ?? 0;
}
