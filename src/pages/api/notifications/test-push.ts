import type { APIRoute } from 'astro';
import { enforceRateLimit, verifyTrustedOrigin } from '../../../lib/server/protection';
import { sendUserTestPush } from '../../../lib/server/communications';

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

	const trustedOrigin = verifyTrustedOrigin(locals, request);
	if (!trustedOrigin.ok) return json({ error: trustedOrigin.error }, trustedOrigin.status);

	const rateLimit = await enforceRateLimit(locals, request, {
		action: 'notifications-test-push',
		limit: 10,
		windowMinutes: 30,
	});
	if (!rateLimit.ok) return json({ error: rateLimit.error }, rateLimit.status);

	try {
		const result = await sendUserTestPush(locals, {
			userId: user.userId,
			email: user.email,
		});

		if (!result.push.attempted) {
			return json(
				{
					error:
						result.reason === 'push_disabled'
							? 'Push is not enabled for this account yet.'
							: 'No device subscription was found for this account.',
				},
				409,
			);
		}

		if (!result.push.sent) {
			return json({ error: 'Push delivery was attempted but no device accepted it.' }, 502);
		}

		return json({
			ok: true,
			notificationId: result.notificationId,
			pushed: result.push.sent,
		});
	} catch (error) {
		console.error('test push failed', error);
		return json({ error: 'Unable to send a test push right now.' }, 500);
	}
};
