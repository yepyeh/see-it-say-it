import type { APIRoute } from 'astro';
import { getAuthorityScope } from '../../../../../lib/server/auth';
import { addResolutionStory, getReportById } from '../../../../../lib/server/reports';
import { enforceRateLimit, verifyTrustedOrigin } from '../../../../../lib/server/protection';

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
	});
}

export const POST: APIRoute = async ({ params, request, locals }) => {
	try {
		const user = locals.currentUser;
		if (!user) {
			return json({ error: 'Authentication is required.' }, 401);
		}

		const scope = getAuthorityScope(user);
		if (!scope.isAuthorized) {
			return json({ error: 'Authority access is required.' }, 403);
		}

		const trustedOrigin = verifyTrustedOrigin(locals, request);
		if (!trustedOrigin.ok) {
			return json({ error: trustedOrigin.error }, trustedOrigin.status);
		}

		const rateLimit = await enforceRateLimit(locals, request, {
			action: 'authority-resolution-story',
			limit: 20,
			windowMinutes: 30,
		});
		if (!rateLimit.ok) {
			return json({ error: rateLimit.error }, rateLimit.status);
		}

		const payload = await request.json().catch(() => null);

		const reportId = String(params.id ?? '').trim();
		const report = reportId ? await getReportById(locals, reportId) : null;
		if (!report) {
			return json({ error: 'Report not found.' }, 404);
		}

		const canOperate =
			scope.isAdmin || user.roles.some((role) => role.authorityId && role.authorityId === report.authorityId);
		if (!canOperate) {
			return json({ error: 'This report is outside your authority scope.' }, 403);
		}

		const summary = String(payload?.summary ?? '').trim();
		const notes = String(payload?.notes ?? '').trim();
		const media = Array.isArray(payload?.media)
			? payload.media
					.map((item: Record<string, unknown>) => ({
						storageKey: String(item?.storageKey ?? '').trim(),
						mimeType: String(item?.mimeType ?? '').trim() || null,
					}))
					.filter(
						(item) =>
							item.storageKey.startsWith('reports/') &&
							/^[a-zA-Z0-9/_\-.]+$/.test(item.storageKey),
					)
					.map((item) => ({
						...item,
						url: `/api/media/${item.storageKey}`,
					}))
			: [];

		if (!summary) {
			return json({ error: 'A public resolution summary is required.' }, 400);
		}

		const actorRole =
			user.roles.find((role) => ['warden', 'moderator', 'admin'].includes(role.role))?.role ?? 'warden';
		const resolutionStoryId = await addResolutionStory(locals, {
			reportId,
			actorUserId: user.userId,
			summary,
			notes: notes || null,
			media,
		});

		return json({
			ok: true,
			resolutionStoryId,
			actorRole,
		});
	} catch (error) {
		console.error('resolution-story publish failed', error);
		return json({ error: 'Unable to publish the resolution story right now.' }, 500);
	}
};
