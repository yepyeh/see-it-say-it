import type { APIRoute } from 'astro';
import { getDB } from '../../../lib/server/db';
import { enforceRateLimit } from '../../../lib/server/protection';

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
	});
}

export const POST: APIRoute = async ({ request, locals }) => {
	const rateLimit = await enforceRateLimit(locals, request, {
		action: 'routing-suggestion',
		limit: 12,
		windowMinutes: 60,
	});
	if (!rateLimit.ok) {
		return json({ error: rateLimit.error }, rateLimit.status);
	}

	const payload = await request.json().catch(() => null);
	const suggestedDepartment = String(payload?.suggestedDepartment ?? '').trim();
	const suggestedContactEmail = String(payload?.suggestedContactEmail ?? '').trim();
	const notes = String(payload?.notes ?? '').trim();
	const submitterEmail = String(payload?.submitterEmail ?? '').trim();
	const authorityId = String(payload?.authorityId ?? '').trim() || null;
	const reportId = String(payload?.reportId ?? '').trim() || null;
	const groupId = String(payload?.groupId ?? '').trim() || null;
	const categoryId = String(payload?.categoryId ?? '').trim() || null;
	const routingState = String(payload?.routingState ?? '').trim() || 'unknown';
	const latitude = Number(payload?.latitude);
	const longitude = Number(payload?.longitude);

	if (!suggestedDepartment) {
		return json({ error: 'A suggested department is required.' }, 400);
	}
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return json({ error: 'Latitude and longitude are required.' }, 400);
	}

	await getDB(locals)
		.prepare(
			`INSERT INTO routing_suggestions (
				routing_suggestion_id,
				report_id,
				authority_id,
				latitude,
				longitude,
				routing_state,
				group_id,
				category_id,
				suggested_department,
				suggested_contact_email,
				notes,
				submitter_email
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			crypto.randomUUID(),
			reportId,
			authorityId,
			latitude,
			longitude,
			routingState,
			groupId,
			categoryId,
			suggestedDepartment,
			suggestedContactEmail || null,
			notes || null,
			submitterEmail || null,
		)
		.run();

	return json({ ok: true });
};
