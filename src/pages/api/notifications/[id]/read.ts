import type { APIRoute } from 'astro';
import { markNotificationRead } from '../../../../lib/server/communications';

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
	});
}

export const POST: APIRoute = async ({ locals, params }) => {
	const user = locals.currentUser;
	if (!user) return json({ error: 'Sign in required.' }, 401);

	const notificationId = String(params.id ?? '').trim();
	if (!notificationId) return json({ error: 'Notification id is required.' }, 400);

	await markNotificationRead(locals, user.userId, notificationId);
	return json({ ok: true });
};
