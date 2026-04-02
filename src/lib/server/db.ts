import { env } from 'cloudflare:workers';

export function getRuntimeEnv(locals?: App.Locals) {
	return locals?.cfContext?.env ?? env;
}

export function getDB(locals?: App.Locals): D1Database {
	return getRuntimeEnv(locals).DB;
}

export function getMediaBucket(locals?: App.Locals): R2Bucket {
	return getRuntimeEnv(locals).REPORT_MEDIA;
}

export function getDataBucket(locals?: App.Locals): R2Bucket {
	return getRuntimeEnv(locals).GEO_DATA;
}
