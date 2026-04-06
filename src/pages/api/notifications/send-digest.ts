import type { APIRoute } from 'astro';
import {
	buildNotificationDigest,
	getNotificationPreferences,
} from '../../../lib/server/communications';
import { sendDigestEmail } from '../../../lib/server/email';
import { enforceRateLimit, verifyTrustedOrigin } from '../../../lib/server/protection';

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

	const rateLimit = await enforceRateLimit(locals, request, {
		action: 'notifications-send-digest',
		limit: 4,
		windowMinutes: 60,
	});
	if (!rateLimit.ok) {
		return json({ error: rateLimit.error }, rateLimit.status);
	}

	const preferences = await getNotificationPreferences(locals, user.userId);
	if (!preferences.emailEnabled) {
		return json({ error: 'Email notifications are currently turned off in your preferences.' }, 400);
	}

	const digest = await buildNotificationDigest(locals, user.userId, { limit: 12 });
	const result = await sendDigestEmail({
		email: user.email,
		name: user.displayName,
		total: digest.total,
		unread: digest.unread,
		items: digest.notifications.map((notification) => ({
			title: notification.title,
			body: notification.body,
			createdAt: notification.createdAt,
			ctaPath: notification.ctaPath,
		})),
	});

	if (!result.sent) {
		return json({ error: 'Unable to send the digest email right now.' }, 503);
	}

	return json({ ok: true, total: digest.total, unread: digest.unread });
};
