import type { APIRoute } from 'astro';
import { getAuthorityScope } from '../../../../../lib/server/auth';
import { adoptReportIntoAuthorityQueue, getReportById } from '../../../../../lib/server/reports';
import { enforceRateLimit } from '../../../../../lib/server/protection';

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
	});
}

const elevatedRoles = new Set(['warden', 'moderator', 'admin']);

export const POST: APIRoute = async ({ params, request, locals }) => {
	try {
		const user = locals.currentUser;
		if (!user) return json({ error: 'Authentication required.' }, 401);

		const rateLimit = await enforceRateLimit(locals, request, {
			action: 'authority-backlog-adoption',
			limit: 20,
			windowMinutes: 30,
		});
		if (!rateLimit.ok) return json({ error: rateLimit.error }, rateLimit.status);

		const scope = getAuthorityScope(user);
		if (!scope.isAuthorized) return json({ error: 'Authority access required.' }, 403);

		const reportId = params.id;
		if (!reportId) return json({ error: 'Missing report id.' }, 400);

		const report = await getReportById(locals, reportId);
		if (!report) return json({ error: 'Report not found.' }, 404);

		const canAccess =
			scope.isAdmin ||
			(scope.authorityCodes.length > 0 && user.roles.some((role) => role.authorityId === report.authorityId));
		if (!canAccess) return json({ error: 'You are not scoped to this report.' }, 403);

		const actorRole =
			user.roles.find((role) => elevatedRoles.has(role.role) && (scope.isAdmin || role.authorityId === report.authorityId))
				?.role ?? (scope.isAdmin ? 'admin' : null);
		if (!actorRole || !elevatedRoles.has(actorRole)) {
			return json({ error: 'A triage-capable role is required.' }, 403);
		}

		const payload = await request.json().catch(() => null);
		await adoptReportIntoAuthorityQueue(locals, {
			reportId,
			actorUserId: user.userId,
			actorRole,
			adoptionNote: String(payload?.note ?? '').trim() || null,
		});

		return json({ ok: true, reportId, adopted: true });
	} catch (error) {
		console.error('authority backlog adoption failed', error);
		return json({ error: 'Unable to adopt this report right now.' }, 500);
	}
};
