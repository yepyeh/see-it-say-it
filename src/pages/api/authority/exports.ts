import type { APIRoute } from 'astro';
import { getAuthorityScope } from '../../../lib/server/auth';
import { exportReports } from '../../../lib/server/reports';

export const GET: APIRoute = async ({ locals, url }) => {
	const user = locals.currentUser;
	if (!user) return new Response('Authentication required.', { status: 401 });

	const scope = getAuthorityScope(user);
	if (!scope.isAuthorized) return new Response('Authority access required.', { status: 403 });

	const requestedAuthorityCode = url.searchParams.get('authority');
	const authorityCode =
		requestedAuthorityCode && (scope.isAdmin || scope.authorityCodes.includes(requestedAuthorityCode))
			? requestedAuthorityCode
			: scope.authorityCodes[0] ?? null;

	const format = url.searchParams.get('format') === 'json' ? 'json' : 'csv';
	const statusFilter = url.searchParams.get('status');
	const priorityFilter = url.searchParams.get('priority');
	const ownerFilter = url.searchParams.get('owner');
	const focusFilter = url.searchParams.get('focus');
	const sortFilter = url.searchParams.get('sort');
	const searchFilter = url.searchParams.get('q');
	const currentOwnerLabel = user.displayName?.trim() || user.email;
	const body = await exportReports(locals, {
		authorityCode,
		authorityCodes: authorityCode ? undefined : scope.authorityCodes,
		format,
		statusFilter,
		priorityFilter,
		ownerFilter,
		focusFilter,
		sortFilter,
		searchFilter,
		currentOwnerLabel,
	});

	return new Response(body, {
		status: 200,
		headers: {
			'content-type':
				format === 'json'
					? 'application/json; charset=utf-8'
					: 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="authority-queue.${format}"`,
		},
	});
};
