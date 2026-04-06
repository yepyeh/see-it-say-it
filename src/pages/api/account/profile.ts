import type { APIRoute } from 'astro';
import { updateAccountProfile } from '../../../lib/server/profiles';
import { verifyTrustedOrigin } from '../../../lib/server/protection';

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

	const payload = await request.json().catch(() => null);
	if (!payload) return json({ error: 'Invalid JSON body.' }, 400);

	try {
		const profile = await updateAccountProfile(locals, user.userId, {
			displayName: String(payload.displayName ?? ''),
			handle: payload.handle ? String(payload.handle) : null,
			bio: payload.bio ? String(payload.bio) : null,
			profileVisibility: payload.profileVisibility,
			homeAuthorityCode: payload.homeAuthorityCode ? String(payload.homeAuthorityCode) : null,
		});

		return json({
			ok: true,
			profile,
		});
	} catch (error) {
		return json(
			{ error: error instanceof Error ? error.message : 'Unable to save your profile right now.' },
			400,
		);
	}
};
