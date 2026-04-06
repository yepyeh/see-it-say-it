import type { APIRoute } from 'astro';
import { getAuthorityScope } from '../../../../../lib/server/auth';
import { getReportById, updateReportTriage } from '../../../../../lib/server/reports';
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
const allowedPriorities = new Set(['low', 'normal', 'high', 'urgent']);

export const POST: APIRoute = async ({ params, request, locals }) => {
	try {
		const user = locals.currentUser;
		if (!user) return json({ error: 'Authentication required.' }, 401);

		const rateLimit = await enforceRateLimit(locals, request, {
			action: 'authority-triage-update',
			limit: 30,
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

		const payload = await request.json().catch(() => null);
		if (!payload) return json({ error: 'Invalid JSON body.' }, 400);

		const priority = String(payload.priority ?? 'normal').trim();
		if (!allowedPriorities.has(priority)) return json({ error: 'Invalid priority.' }, 400);

		const actorRole =
			user.roles.find((role) => elevatedRoles.has(role.role) && (scope.isAdmin || role.authorityId === report.authorityId))
				?.role ?? (scope.isAdmin ? 'admin' : null);
		if (!actorRole || !elevatedRoles.has(actorRole)) {
			return json({ error: 'A triage-capable role is required.' }, 403);
		}

		await updateReportTriage(locals, {
			reportId,
			actorUserId: user.userId,
			actorRole,
			ownerLabel: String(payload.ownerLabel ?? '').trim() || null,
			priority: priority as 'low' | 'normal' | 'high' | 'urgent',
			dueAt: String(payload.dueAt ?? '').trim() || null,
			queueNote: String(payload.queueNote ?? '').trim() || null,
		});

		return json({
			ok: true,
			reportId,
			priority,
		});
	} catch (error) {
		console.error('authority triage update failed', error);
		return json({ error: 'Unable to save triage right now.' }, 500);
	}
};
