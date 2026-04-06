import type { APIRoute } from 'astro';
import { getDB, getMediaBucket } from '../../../lib/server/db';

export const GET: APIRoute = async ({ params, locals }) => {
	const key = params.key;
	if (!key) {
		return new Response('Missing media key.', { status: 400 });
	}

	const mediaRecord = await getDB(locals)
		.prepare(
			`SELECT report_media_id AS reportMediaId
			FROM report_media
			WHERE storage_key = ?
			LIMIT 1`,
		)
		.bind(key)
		.first<{ reportMediaId: string }>();

	if (!mediaRecord?.reportMediaId) {
		return new Response('Media not found.', { status: 404 });
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
