import type { APIRoute } from 'astro';
import { createAccessRequest } from '../../lib/server/access-requests';
import { verifyTrustedOrigin } from '../../lib/server/protection';

export const POST: APIRoute = async ({ locals, request }) => {
	const user = locals.currentUser;
	if (!user) {
		return new Response(JSON.stringify({ error: 'Sign in is required before applying for access.' }), {
			status: 401,
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
		const requestType = String(payload?.requestType ?? '').trim();
		const requestedRole = String(payload?.requestedRole ?? '').trim();
		if (!['authority_access', 'warden_application'].includes(requestType)) {
			return new Response(JSON.stringify({ error: 'Choose a valid request type.' }), {
				status: 400,
				headers: { 'content-type': 'application/json' },
			});
		}
		if (!['warden', 'moderator'].includes(requestedRole)) {
			return new Response(JSON.stringify({ error: 'Choose a valid requested role.' }), {
				status: 400,
				headers: { 'content-type': 'application/json' },
			});
		}
		if (requestType === 'warden_application' && requestedRole !== 'warden') {
			return new Response(JSON.stringify({ error: 'Warden applications can only request the warden role.' }), {
				status: 400,
				headers: { 'content-type': 'application/json' },
			});
		}

		const requestId = await createAccessRequest(locals, {
			userId: user.userId,
			requestType: requestType as 'authority_access' | 'warden_application',
			requestedRole: requestedRole as 'warden' | 'moderator',
			authorityCode: String(payload?.authorityCode ?? '').trim() || null,
			organization: String(payload?.organization ?? '').trim() || null,
			teamName: String(payload?.teamName ?? '').trim() || null,
			workEmail: String(payload?.workEmail ?? '').trim() || null,
			notes: String(payload?.notes ?? '').trim() || null,
		});

		return new Response(JSON.stringify({ ok: true, requestId }), {
			status: 200,
			headers: { 'content-type': 'application/json' },
		});
	} catch (error) {
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : 'Unable to submit access request right now.',
			}),
			{
				status: 500,
				headers: { 'content-type': 'application/json' },
			},
		);
	}
};
