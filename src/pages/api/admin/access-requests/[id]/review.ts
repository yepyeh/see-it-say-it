import type { APIRoute } from 'astro';
import { reviewAccessRequest } from '../../../../../lib/server/access-requests';
import { getAuthorityScope } from '../../../../../lib/server/auth';
import { verifyTrustedOrigin } from '../../../../../lib/server/protection';

export const POST: APIRoute = async ({ locals, params, request }) => {
	const user = locals.currentUser;
	if (!user) {
		return new Response(JSON.stringify({ error: 'Sign in is required.' }), {
			status: 401,
			headers: { 'content-type': 'application/json' },
		});
	}

	const scope = getAuthorityScope(user);
	if (!scope.isAdmin) {
		return new Response(JSON.stringify({ error: 'Admin access is required.' }), {
			status: 403,
			headers: { 'content-type': 'application/json' },
		});
	}

	const trustedOrigin = verifyTrustedOrigin(locals, request);
	if (!trustedOrigin.ok) {
		return new Response(JSON.stringify({ error: trustedOrigin.error }), {
			status: trustedOrigin.status,
			headers: { 'content-type': 'application/json' },
		});
	}

	try {
		const payload = await request.json().catch(() => null);
		const status = String(payload?.status ?? '').trim();
		if (!['approved', 'rejected'].includes(status)) {
			return new Response(JSON.stringify({ error: 'Choose a valid review decision.' }), {
				status: 400,
				headers: { 'content-type': 'application/json' },
			});
		}

		await reviewAccessRequest(locals, {
			requestId: params.id ?? '',
			reviewerUserId: user.userId,
			status: status as 'approved' | 'rejected',
			reviewNotes: String(payload?.reviewNotes ?? '').trim() || null,
		});

		return new Response(JSON.stringify({ ok: true, status }), {
			status: 200,
			headers: { 'content-type': 'application/json' },
		});
	} catch (error) {
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : 'Unable to review access request right now.',
			}),
			{
				status: 500,
				headers: { 'content-type': 'application/json' },
			},
		);
	}
};
