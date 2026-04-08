import type { APIRoute } from 'astro';
import { createSupportIntent } from '../../../lib/server/support';
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
	const originCheck = verifyTrustedOrigin(locals, request);
	if (!originCheck.ok) {
		return json({ error: originCheck.error }, originCheck.status);
	}

	if (!locals.currentUser?.userId) {
		return json(
			{
				error: 'Please sign in before starting support checkout.',
				authPath: '/auth?next=/support',
			},
			401,
		);
	}

	const rateLimit = await enforceRateLimit(locals, request, {
		action: 'support-checkout',
		limit: 8,
		windowMinutes: 30,
	});
	if (!rateLimit.ok) {
		return json({ error: rateLimit.error }, rateLimit.status);
	}

	const payload = await request.json().catch(() => null);
	const tierId = String(payload?.tierId ?? '').trim();
	if (!tierId) {
		return json({ error: 'A support tier is required.' }, 400);
	}

	try {
		const result = await createSupportIntent(locals, {
			tierId: tierId as 'lights' | 'routing' | 'patron',
			userId: locals.currentUser.userId,
		});
		if (!result.checkoutUrl) {
			return json({
				error: 'Stripe checkout is not configured yet for this environment.',
				supportContributionId: result.supportContributionId,
			}, 503);
		}
		return json({
			supportContributionId: result.supportContributionId,
			tier: result.tier,
			checkoutUrl: result.checkoutUrl,
		});
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : 'Unable to start checkout.' }, 400);
	}
};
