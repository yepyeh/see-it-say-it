import type { APIRoute } from 'astro';
import { createOtpChallenge } from '../../../lib/server/auth';
import { sendOtpEmail } from '../../../lib/server/email';
import { enforceRateLimit, verifyTurnstile } from '../../../lib/server/protection';

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
		action: 'auth-request-otp',
		limit: 6,
		windowMinutes: 15,
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
	const name = String(payload.name ?? '').trim();
	if (!email || !email.includes('@')) {
		return json({ error: 'A valid email address is required.' }, 400);
	}

	const challenge = await createOtpChallenge(locals, email, name || null);
	const emailResult = await sendOtpEmail({
		email: challenge.email,
		code: challenge.code,
		name: name || null,
	});

	if (!emailResult.sent) {
		return json({ error: 'Unable to send sign-in code right now.' }, 502);
	}

	return json({
		ok: true,
		email: challenge.email,
		expiresAt: challenge.expiresAt,
	});
};
