import type { APIRoute } from 'astro';
import { SESSION_COOKIE_NAME, verifyOtpAndCreateSession } from '../../../lib/server/auth';
import { enforceRateLimit, verifyTurnstile } from '../../../lib/server/protection';

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
	});
}

export const POST: APIRoute = async ({ request, locals, cookies }) => {
	const rateLimit = await enforceRateLimit(locals, request, {
		action: 'auth-verify-otp',
		limit: 8,
		windowMinutes: 20,
	});
	if (!rateLimit.ok) {
		return json({ error: rateLimit.error }, rateLimit.status);
	}

	const payload = await request.json().catch(() => null);
	if (!payload) return json({ error: 'Invalid JSON body.' }, 400);
	const turnstileCheck = await verifyTurnstile(locals, request, payload.turnstileToken);
	if (!turnstileCheck.ok) {
		return json({ error: turnstileCheck.error }, turnstileCheck.status);
	}

	const email = String(payload.email ?? '').trim().toLowerCase();
	const code = String(payload.code ?? '').trim();
	const next = String(payload.next ?? '/my-reports').trim() || '/my-reports';

	if (!email || !code) {
		return json({ error: 'Email and code are required.' }, 400);
	}

	const result = await verifyOtpAndCreateSession(locals, email, code);
	if (!result.ok) {
		const message =
			result.reason === 'invalid_code'
				? 'The sign-in code is incorrect.'
				: result.reason === 'too_many_attempts'
					? 'Too many incorrect attempts. Request a new code.'
					: 'The sign-in code has expired. Request a new one.';
		return json({ error: message }, 400);
	}

	cookies.set(SESSION_COOKIE_NAME, result.sessionId, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 30,
	});

	return json({
		ok: true,
		next,
		user: result.user,
	});
};
