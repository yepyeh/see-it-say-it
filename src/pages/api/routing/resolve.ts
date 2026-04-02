import type { APIRoute } from 'astro';
import { getBoundaryDatasetMeta, resolveIssueRouting } from '../../../lib/server/routing';

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
	});
}

export const GET: APIRoute = async ({ url, locals }) => {
	const latitude = Number(url.searchParams.get('lat'));
	const longitude = Number(url.searchParams.get('lng'));
	const groupId = url.searchParams.get('groupId');
	const categoryId = url.searchParams.get('categoryId');

	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return json({ error: 'lat and lng query params are required.' }, 400);
	}

	const route = await resolveIssueRouting(locals, {
		latitude,
		longitude,
		groupId,
		categoryId,
	});
	const dataset = await getBoundaryDatasetMeta(locals);

	return json({
		match: route.authority,
		route,
		dataset,
	});
};
