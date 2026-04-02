import { env } from 'cloudflare:workers';

export function getDB(locals?: App.Locals): D1Database {
	return locals?.cfContext?.env?.DB ?? env.DB;
}
