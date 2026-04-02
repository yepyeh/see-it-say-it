import type { APIRoute } from 'astro';
import { confirmReport } from '../../../../lib/server/reports';
import { enforceRateLimit } from '../../../../lib/server/protection';

export const POST: APIRoute = async ({ params, request, locals }) => {
	const reportId = params.id;
	if (!reportId) {
		return new Response('Missing report id.', { status: 400 });
	}

	const rateLimit = await enforceRateLimit(locals, request, {
		action: 'report-confirm',
		limit: 30,
		windowMinutes: 60,
	});
	if (!rateLimit.ok) {
		return new Response(JSON.stringify({ error: rateLimit.error }), {
			status: rateLimit.status,
			headers: { 'content-type': 'application/json; charset=utf-8' },
		});
	}

	const payload = await request.json().catch(() => ({}));
	const total = await confirmReport(
		locals,
		reportId,
		typeof payload.name === 'string' ? payload.name.trim() || null : null,
		locals.currentUser?.userId ?? null,
	);

	return new Response(JSON.stringify({ confirmationCount: total }), {
		status: 200,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
	});
};
