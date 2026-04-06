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
	if (!locals.currentUser) {
		return json({ error: 'Sign in required.' }, 401);
	}

	const rateLimit = await enforceRateLimit(locals, request, {
		action: 'push-subscribe',
		limit: 20,
		windowMinutes: 60,
	});
	if (!rateLimit.ok) {
		return json({ error: rateLimit.error }, rateLimit.status);
	}

	const payload = await request.json().catch(() => null);
	const endpoint = String(payload?.endpoint ?? '').trim();
	const keys = payload?.keys ?? {};
	const p256dh = String(keys?.p256dh ?? '').trim();
	const auth = String(keys?.auth ?? '').trim();

	if (!endpoint || !p256dh || !auth) {
		return json({ error: 'A valid push subscription payload is required.' }, 400);
	}

	try {
		await getDB(locals)
			.prepare(
				`INSERT INTO push_subscriptions (
					push_subscription_id,
					user_id,
					endpoint,
					p256dh,
					auth,
					user_agent,
					updated_at
				) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
				ON CONFLICT(endpoint) DO UPDATE SET
					user_id = excluded.user_id,
					p256dh = excluded.p256dh,
					auth = excluded.auth,
					user_agent = excluded.user_agent,
					updated_at = CURRENT_TIMESTAMP`,
			)
			.bind(
				crypto.randomUUID(),
				locals.currentUser.userId,
				endpoint,
				p256dh,
				auth,
				request.headers.get('user-agent'),
			)
			.run();
		await getDB(locals)
			.prepare(
				`INSERT INTO notification_preferences (
					user_id,
					email_enabled,
					in_app_enabled,
					push_enabled,
					digest_mode,
					updated_at
				)
				VALUES (?, 1, 1, 1, 'immediate', CURRENT_TIMESTAMP)
				ON CONFLICT(user_id) DO UPDATE SET
					push_enabled = 1,
					updated_at = CURRENT_TIMESTAMP`,
			)
			.bind(locals.currentUser.userId)
			.run();
	} catch (_error) {
		return json({ error: 'Push subscription storage is not available yet in this environment.' }, 503);
	}

	return json({ ok: true });
};
