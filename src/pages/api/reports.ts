import type { APIRoute } from 'astro';
import { createReport, listReports } from '../../lib/server/reports';
import { enforceRateLimit } from '../../lib/server/protection';

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
	});
}

export const GET: APIRoute = async ({ locals, url }) => {
	const email = url.searchParams.get('email');
	const authorityCode = url.searchParams.get('authority');
	const limit = Number(url.searchParams.get('limit') ?? '24');
	const reports = await listReports(locals, { email, authorityCode, limit });
	return json({ reports });
};

export const POST: APIRoute = async ({ request, locals }) => {
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
	const email = String(payload.email ?? '').trim();
	const name = String(payload.name ?? '').trim();
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
					url: String(item?.url ?? '').trim(),
					mimeType: String(item?.mimeType ?? '').trim(),
				}))
				.filter((item) => item.storageKey && item.url && item.mimeType)
		: [];

	if (!category || !description) {
		return json({ error: 'Category and description are required.' }, 400);
	}

	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return json({ error: 'Latitude and longitude are required.' }, 400);
	}

	const result = await createReport(locals, {
		email: email || undefined,
		name: name || undefined,
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
