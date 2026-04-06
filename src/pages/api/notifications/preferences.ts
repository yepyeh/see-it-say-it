import type { APIRoute } from 'astro';
import { updateNotificationPreferences } from '../../../lib/server/communications';
import { verifyTrustedOrigin } from '../../../lib/server/protection';

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
	if (!user) return json({ error: 'Sign in required.' }, 401);

	const trustedOrigin = verifyTrustedOrigin(locals, request);
	if (!trustedOrigin.ok) return json({ error: trustedOrigin.error }, trustedOrigin.status);

	const payload = await request.json().catch(() => null);
	if (!payload) return json({ error: 'Invalid JSON body.' }, 400);

	const digestMode =
		payload.digestMode === 'daily_digest' ? 'daily_digest' : 'immediate';

	await updateNotificationPreferences(locals, user.userId, {
		emailEnabled: Boolean(payload.emailEnabled),
		inAppEnabled: Boolean(payload.inAppEnabled),
		pushEnabled: Boolean(payload.pushEnabled),
		digestMode,
	});

	return json({ ok: true });
};
