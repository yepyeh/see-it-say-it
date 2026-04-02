import type { APIRoute } from 'astro';
import { confirmReport } from '../../../../lib/server/reports';

export const POST: APIRoute = async ({ params, request, locals }) => {
	const reportId = params.id;
	if (!reportId) {
		return new Response('Missing report id.', { status: 400 });
	}

	const payload = await request.json().catch(() => ({}));
	const total = await confirmReport(
		locals,
		reportId,
		typeof payload.name === 'string' ? payload.name.trim() || null : null,
	);

	return new Response(JSON.stringify({ confirmationCount: total }), {
		status: 200,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
	});
};
