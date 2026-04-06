import type { APIRoute } from 'astro';
import { destroySession, SESSION_COOKIE_NAME } from '../../../lib/server/auth';
import { verifyTrustedOrigin } from '../../../lib/server/protection';

export const POST: APIRoute = async ({ locals, cookies, request }) => {
	const trustedOrigin = verifyTrustedOrigin(locals, request);
	if (!trustedOrigin.ok) {
		return new Response(JSON.stringify({ error: trustedOrigin.error }), {
			status: trustedOrigin.status,
			headers: { 'content-type': 'application/json; charset=utf-8' },
		});
	}

	const sessionId = cookies.get(SESSION_COOKIE_NAME)?.value;
	if (sessionId) {
		await destroySession(locals, sessionId);
	}

	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
	return new Response(null, { status: 204 });
};
