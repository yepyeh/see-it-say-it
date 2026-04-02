import type { APIRoute } from 'astro';
import { getDataBucket } from '../../../lib/server/db';

function parseRangeHeader(rangeHeader: string | null) {
	if (!rangeHeader?.startsWith('bytes=')) return null;
	const [rawStart, rawEnd] = rangeHeader.replace('bytes=', '').split('-');
	const start = rawStart ? Number(rawStart) : undefined;
	const end = rawEnd ? Number(rawEnd) : undefined;
	if (start === undefined && end === undefined) return null;
	return { start, end };
}

async function respondWithObject(request: Request, locals: App.Locals, key: string) {
	const range = parseRangeHeader(request.headers.get('range'));
	const object = await getDataBucket(locals).get(key, range ? { range } : undefined);
	if (!object) {
		return new Response('Map archive not found.', { status: 404 });
	}

	const headers = new Headers();
	object.writeHttpMetadata(headers);
	headers.set('accept-ranges', 'bytes');
	headers.set('etag', object.httpEtag);
	headers.set('cache-control', 'public, max-age=604800');

	if (range && object.range) {
		headers.set(
			'content-range',
			`bytes ${object.range.offset}-${object.range.end ?? object.size - 1}/${object.size}`,
		);
		headers.set('content-length', String(object.range.length));
		return new Response(request.method === 'HEAD' ? null : object.body, {
			status: 206,
			headers,
		});
	}

	headers.set('content-length', String(object.size));
	return new Response(request.method === 'HEAD' ? null : object.body, {
		status: 200,
		headers,
	});
}

export const GET: APIRoute = async ({ params, request, locals }) => {
	const key = params.key;
	if (!key) {
		return new Response('Missing map key.', { status: 400 });
	}
	return respondWithObject(request, locals, key);
};

export const HEAD: APIRoute = async ({ params, request, locals }) => {
	const key = params.key;
	if (!key) {
		return new Response('Missing map key.', { status: 400 });
	}
	return respondWithObject(request, locals, key);
};
