import type { APIRoute } from 'astro';
import { createReport, listReports } from '../../lib/server/reports';
import { getAuthorityScope, normalizeEmail } from '../../lib/server/auth';
import { enforceRateLimit, verifyTrustedOrigin } from '../../lib/server/protection';

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
	});
}

function toPublicReport(report: Awaited<ReturnType<typeof listReports>>[number]) {
	return {
		reportId: report.reportId,
		category: report.category,
		description: report.description,
		severity: report.severity,
		status: report.status,
		latitude: report.latitude,
		longitude: report.longitude,
		locationLabel: report.locationLabel,
		authorityId: report.authorityId,
		authorityCode: report.authorityCode,
		authorityName: report.authorityName,
		countryCode: report.countryCode,
		createdAt: report.createdAt,
		updatedAt: report.updatedAt,
		duplicateCount: report.duplicateCount,
		confirmationCount: report.confirmationCount,
		participationStateAtSubmission: report.participationStateAtSubmission,
		isHistoricBacklog: report.isHistoricBacklog,
		isAdopted: report.isAdopted,
		adoptedAt: report.adoptedAt,
	};
}

export const GET: APIRoute = async ({ locals, url }) => {
	const user = locals.currentUser;
	const scope = getAuthorityScope(user);
	const email = url.searchParams.get('email');
	const authorityCode = url.searchParams.get('authority');
	const limit = Number(url.searchParams.get('limit') ?? '24');
	const normalizedEmail = email ? normalizeEmail(email) : null;
	if (normalizedEmail && (!user || (normalizedEmail !== user.email && !scope.isAdmin))) {
		return json({ error: 'You are not allowed to inspect reports for that email address.' }, 403);
	}

	const reports = await listReports(locals, {
		email: normalizedEmail,
		authorityCode,
		limit,
	});

	const canSeePrivateFields = Boolean(
		user &&
			((normalizedEmail && normalizedEmail === user.email) ||
				scope.isAdmin ||
				(authorityCode && scope.authorityCodes.includes(authorityCode))),
	);

	if (!canSeePrivateFields) {
		return json({ reports: reports.map(toPublicReport) });
	}

	return json({ reports });
};

export const POST: APIRoute = async ({ request, locals }) => {
	const user = locals.currentUser;
	if (!user) {
		return json({ error: 'Sign in is required before submitting a report.' }, 401);
	}

	const trustedOrigin = verifyTrustedOrigin(locals, request);
	if (!trustedOrigin.ok) {
		return json({ error: trustedOrigin.error }, trustedOrigin.status);
	}

	const rateLimit = await enforceRateLimit(locals, request, {
		action: 'report-submit',
		limit: 10,
		windowMinutes: 30,
	});
	if (!rateLimit.ok) {
		return json({ error: rateLimit.error }, rateLimit.status);
	}

	const payload = await request.json().catch(() => null);
	if (!payload) {
		return json({ error: 'Invalid JSON body.' }, 400);
	}

	const category = String(payload.category ?? '').trim();
	const description = String(payload.description ?? '').trim();
	const notesMarkdown = String(payload.notesMarkdown ?? '').trim();
	const locationLabel = String(payload.locationLabel ?? '').trim();
	const groupId = String(payload.groupId ?? '').trim();
	const categoryId = String(payload.categoryId ?? '').trim();
	const severity = Number(payload.severity ?? 3);
	const latitude = Number(payload.latitude);
	const longitude = Number(payload.longitude);
	const sourceChannel = String(payload.sourceChannel ?? 'web').trim();
	const media = Array.isArray(payload.media)
		? payload.media
				.map((item) => ({
					storageKey: String(item?.storageKey ?? '').trim(),
					mimeType: String(item?.mimeType ?? '').trim(),
				}))
				.filter(
					(item) =>
						item.storageKey.startsWith('reports/') &&
						/^[a-zA-Z0-9/_\-.]+$/.test(item.storageKey) &&
						item.mimeType,
				)
				.map((item) => ({
					...item,
					url: `/api/media/${item.storageKey}`,
				}))
		: [];

	if (!category || !description) {
		return json({ error: 'Category and description are required.' }, 400);
	}

	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return json({ error: 'Latitude and longitude are required.' }, 400);
	}

	const result = await createReport(locals, {
		email: user.email,
		name: user.displayName ?? undefined,
		groupId: groupId || undefined,
		categoryId: categoryId || undefined,
		category,
		description,
		notesMarkdown,
		severity: Math.min(Math.max(Math.round(severity), 1), 5),
		latitude,
		longitude,
		locationLabel,
		sourceChannel,
		media,
	});

	return json({
		reportId: result.reportId,
		reportUrl: `/reports/${result.reportId}`,
		successUrl: `/submitted/?reportId=${encodeURIComponent(result.reportId)}`,
		myReportsUrl: '/my-reports',
		authority: result.authority,
		duplicateMatch: result.duplicateMatch,
	});
};
