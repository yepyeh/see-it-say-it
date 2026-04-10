import type { APIRoute } from 'astro';
import {
	followReport,
	unfollowReport,
	updateReportFollowNotifications,
} from '../../../../lib/server/reports';
import { enforceRateLimit, verifyTrustedOrigin } from '../../../../lib/server/protection';

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json; charset=utf-8' },
	});
}

function requireUser(locals: App.Locals) {
	return locals.currentUser;
}

export const POST: APIRoute = async ({ params, request, locals }) => {
	const reportId = params.id;
	const user = requireUser(locals);
	if (!user) return json({ error: 'Sign in is required to follow a report.' }, 401);
	if (!reportId) return json({ error: 'Missing report id.' }, 400);

	const trustedOrigin = verifyTrustedOrigin(locals, request);
	if (!trustedOrigin.ok) return json({ error: trustedOrigin.error }, trustedOrigin.status);

	const rateLimit = await enforceRateLimit(locals, request, {
		action: 'report-follow',
		limit: 30,
		windowMinutes: 60,
	});
	if (!rateLimit.ok) return json({ error: rateLimit.error }, rateLimit.status);

	try {
		const result = await followReport(locals, reportId, user.userId);
		return json(result);
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : 'Unable to follow report.' }, 400);
	}
};

export const DELETE: APIRoute = async ({ params, request, locals }) => {
	const reportId = params.id;
	const user = requireUser(locals);
	if (!user) return json({ error: 'Sign in is required to unfollow a report.' }, 401);
	if (!reportId) return json({ error: 'Missing report id.' }, 400);

	const trustedOrigin = verifyTrustedOrigin(locals, request);
	if (!trustedOrigin.ok) return json({ error: trustedOrigin.error }, trustedOrigin.status);

	try {
		const result = await unfollowReport(locals, reportId, user.userId);
		return json(result);
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : 'Unable to unfollow report.' }, 400);
	}
};

export const PATCH: APIRoute = async ({ params, request, locals }) => {
	const reportId = params.id;
	const user = requireUser(locals);
	if (!user) return json({ error: 'Sign in is required to manage report follows.' }, 401);
	if (!reportId) return json({ error: 'Missing report id.' }, 400);

	const trustedOrigin = verifyTrustedOrigin(locals, request);
	if (!trustedOrigin.ok) return json({ error: trustedOrigin.error }, trustedOrigin.status);

	const payload = await request.json().catch(() => null);
	if (!payload || typeof payload.notificationsEnabled !== 'boolean') {
		return json({ error: 'notificationsEnabled must be provided.' }, 400);
	}

	try {
		const result = await updateReportFollowNotifications(
			locals,
			reportId,
			user.userId,
			payload.notificationsEnabled,
		);
		return json(result);
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : 'Unable to update follow settings.' }, 400);
	}
};
