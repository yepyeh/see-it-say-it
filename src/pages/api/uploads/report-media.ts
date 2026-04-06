import type { APIRoute } from 'astro';
import { getMediaBucket } from '../../../lib/server/db';
import { enforceRateLimit } from '../../../lib/server/protection';

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
	});
}

function sanitizeFilename(filename: string) {
	return filename.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(-80);
}

export const POST: APIRoute = async ({ request, locals }) => {
	if (!locals.currentUser) {
		return json({ error: 'Sign in is required before uploading report media.' }, 401);
	}

	const rateLimit = await enforceRateLimit(locals, request, {
		action: 'report-upload-media',
		limit: 16,
		windowMinutes: 30,
	});
	if (!rateLimit.ok) {
		return json({ error: rateLimit.error }, rateLimit.status);
	}

	const formData = await request.formData().catch(() => null);
	const file = formData?.get('file');
	if (!(file instanceof File)) {
		return json({ error: 'An image file is required.' }, 400);
	}

	if (!file.type.startsWith('image/')) {
		return json({ error: 'Only image uploads are supported.' }, 400);
	}

	if (file.size > 10 * 1024 * 1024) {
		return json({ error: 'Images must be 10MB or smaller.' }, 400);
	}

	const bucket = getMediaBucket(locals);
	const datePath = new Date().toISOString().slice(0, 10);
	const filename = sanitizeFilename(file.name || 'image');
	const extension = filename.includes('.') ? filename.split('.').pop() : 'jpg';
	const storageKey = `reports/${datePath}/${crypto.randomUUID()}.${extension}`;

	await bucket.put(storageKey, file.stream(), {
		httpMetadata: {
			contentType: file.type,
			contentDisposition: `inline; filename="${filename}"`,
		},
	});

	return json({
		media: {
			storageKey,
			url: `/api/media/${storageKey}`,
			mimeType: file.type,
			filename,
		},
	});
};
