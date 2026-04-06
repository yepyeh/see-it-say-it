import type { APIRoute } from 'astro';
import { getAuthorityScope } from '../../../../lib/server/auth';
import { sendDailyDigestsBatch } from '../../../../lib/server/communications';
import { enforceRateLimit, verifyTrustedOrigin } from '../../../../lib/server/protection';

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
	if (!user) return json({ error: 'Authentication required.' }, 401);

	const scope = getAuthorityScope(user);
	if (!scope.isAdmin) {
		return json({ error: 'Admin access required.' }, 403);
	}

	const trustedOrigin = verifyTrustedOrigin(locals, request);
	if (!trustedOrigin.ok) return json({ error: trustedOrigin.error }, trustedOrigin.status);

	const rateLimit = await enforceRateLimit(locals, request, {
		action: 'admin-run-digests',
		limit: 4,
		windowMinutes: 60,
	});
	if (!rateLimit.ok) return json({ error: rateLimit.error }, rateLimit.status);

	const result = await sendDailyDigestsBatch(locals, { limit: 100 });
	return json({ ok: true, ...result });
};
