import type { APIRoute } from 'astro';
import { getDB } from '../../../lib/server/db';

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
	});
}

export const POST: APIRoute = async ({ request, locals }) => {
	const user = locals.currentUser;
	if (!user) return json({ error: 'Authentication required.' }, 401);

	const payload = await request.json().catch(() => null);
	if (!payload) return json({ error: 'Invalid JSON body.' }, 400);

	const displayName = String(payload.displayName ?? '').trim();
	if (!displayName) return json({ error: 'A full name is required.' }, 400);

	await getDB(locals)
		.prepare('UPDATE users SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
		.bind(displayName, user.userId)
		.run();

	return json({
		ok: true,
		displayName,
	});
};
