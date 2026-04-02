import type { APIRoute } from 'astro';
import { searchPhoton } from '../../../lib/server/geocoding';

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
	});
}

export const GET: APIRoute = async ({ url }) => {
	const query = String(url.searchParams.get('q') ?? '').trim();
	if (!query) {
		return json({ results: [] });
	}

	try {
		const results = await searchPhoton(query);
		return json({ provider: 'photon', results });
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : 'Geocoding search failed.' }, 502);
	}
};
