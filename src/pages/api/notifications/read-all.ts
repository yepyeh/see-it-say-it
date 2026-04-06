import type { APIRoute } from 'astro';
import { markAllNotificationsRead } from '../../../lib/server/communications';
import { verifyTrustedOrigin } from '../../../lib/server/protection';

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
	});
}

export const POST: APIRoute = async ({ locals, request }) => {
	const user = locals.currentUser;
	if (!user) return json({ error: 'Sign in required.' }, 401);

	const trustedOrigin = verifyTrustedOrigin(locals, request);
	if (!trustedOrigin.ok) return json({ error: trustedOrigin.error }, trustedOrigin.status);

	await markAllNotificationsRead(locals, user.userId);
	return json({ ok: true });
};
