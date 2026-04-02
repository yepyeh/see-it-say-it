import type { APIRoute } from 'astro';
import { reversePhoton } from '../../../lib/server/geocoding';

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
	});
}

export const GET: APIRoute = async ({ url }) => {
	const latitude = Number(url.searchParams.get('lat'));
	const longitude = Number(url.searchParams.get('lng'));
	if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
		return json({ error: 'Latitude and longitude are required.' }, 400);
	}

	try {
		const result = await reversePhoton(latitude, longitude);
		return json({ provider: 'photon', result });
	} catch (error) {
		return json({ error: error instanceof Error ? error.message : 'Reverse geocoding failed.' }, 502);
	}
};
