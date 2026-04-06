import type { APIRoute } from 'astro';
import { getMediaBucket } from '../../../lib/server/db';
import { enforceRateLimit, verifyTrustedOrigin } from '../../../lib/server/protection';

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

function matchesAllowedImageSignature(bytes: Uint8Array) {
	if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
	if (
		bytes.length >= 8 &&
		bytes[0] === 0x89 &&
		bytes[1] === 0x50 &&
		bytes[2] === 0x4e &&
		bytes[3] === 0x47 &&
		bytes[4] === 0x0d &&
		bytes[5] === 0x0a &&
		bytes[6] === 0x1a &&
		bytes[7] === 0x0a
	) return true;
	if (
		bytes.length >= 6 &&
		bytes[0] === 0x47 &&
		bytes[1] === 0x49 &&
		bytes[2] === 0x46 &&
		bytes[3] === 0x38 &&
		(bytes[4] === 0x37 || bytes[4] === 0x39) &&
		bytes[5] === 0x61
	) return true;
	if (
		bytes.length >= 12 &&
		bytes[0] === 0x52 &&
		bytes[1] === 0x49 &&
		bytes[2] === 0x46 &&
		bytes[3] === 0x46 &&
		bytes[8] === 0x57 &&
		bytes[9] === 0x45 &&
		bytes[10] === 0x42 &&
		bytes[11] === 0x50
	) return true;
	return false;
}

export const POST: APIRoute = async ({ request, locals }) => {
	if (!locals.currentUser) {
		return json({ error: 'Sign in is required before uploading report media.' }, 401);
	}

	const trustedOrigin = verifyTrustedOrigin(locals, request);
	if (!trustedOrigin.ok) return json({ error: trustedOrigin.error }, trustedOrigin.status);

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

	const bytes = new Uint8Array(await file.arrayBuffer());
	if (!matchesAllowedImageSignature(bytes)) {
		return json({ error: 'Uploaded media does not look like a valid supported image.' }, 400);
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
