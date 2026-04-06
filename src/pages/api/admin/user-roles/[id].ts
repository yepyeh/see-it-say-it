import type { APIRoute } from 'astro';
import { getAuthorityScope } from '../../../../lib/server/auth';
import { updateManagedAuthorityRole } from '../../../../lib/server/access-requests';

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

	try {
		const payload = await request.json().catch(() => null);
		const action = String(payload?.action ?? '').trim();
		if (!['update', 'revoke'].includes(action)) {
			return new Response(JSON.stringify({ error: 'Choose a valid management action.' }), {
				status: 400,
				headers: { 'content-type': 'application/json' },
			});
		}

		const result = await updateManagedAuthorityRole(locals, {
			userRoleId: params.id ?? '',
			reviewerUserId: user.userId,
			action: action as 'update' | 'revoke',
			role: String(payload?.role ?? '').trim() || null,
			authorityCode: String(payload?.authorityCode ?? '').trim() || null,
			notes: String(payload?.notes ?? '').trim() || null,
		});

		return new Response(JSON.stringify({ ok: true, ...result }), {
			status: 200,
			headers: { 'content-type': 'application/json' },
		});
	} catch (error) {
		return new Response(
			JSON.stringify({
				error: error instanceof Error ? error.message : 'Unable to manage authority access right now.',
			}),
			{
				status: 500,
				headers: { 'content-type': 'application/json' },
			},
		);
	}
};
