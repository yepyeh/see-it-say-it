import type { APIRoute } from 'astro';
import { getMediaBucket } from '../../../lib/server/db';

export const GET: APIRoute = async ({ params, locals }) => {
	const key = params.key;
	if (!key) {
		return new Response('Missing media key.', { status: 400 });
	}

	const object = await getMediaBucket(locals).get(key);
	if (!object) {
		return new Response('Media not found.', { status: 404 });
	}

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set('etag', object.httpEtag);
	headers.set('cache-control', 'public, max-age=604800');

	return new Response(object.body, {
		status: 200,
		headers,
	});
};
