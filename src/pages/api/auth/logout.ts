import type { APIRoute } from 'astro';
import { destroySession, SESSION_COOKIE_NAME } from '../../../lib/server/auth';

export const POST: APIRoute = async ({ locals, cookies }) => {
	const sessionId = cookies.get(SESSION_COOKIE_NAME)?.value;
	if (sessionId) {
		await destroySession(locals, sessionId);
	}

	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
	return new Response(null, { status: 204 });
};
