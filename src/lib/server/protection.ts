import { getDB, getRuntimeEnv } from './db';

type RateLimitOptions = {
	action: string;
	limit: number;
	windowMinutes: number;
	blockMinutes?: number;
};

function toSqlTimestamp(date: Date) {
	return date.toISOString().slice(0, 19).replace('T', ' ');
}

async function hashValue(value: string) {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return Array.from(new Uint8Array(digest), (part) => part.toString(16).padStart(2, '0')).join('');
}

export function getClientAddress(request: Request) {
	return (
		request.headers.get('cf-connecting-ip') ??
		request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
		'unknown'
	);
}

export async function enforceRateLimit(
	locals: App.Locals,
	request: Request,
	options: RateLimitOptions,
) {
	try {
		const db = getDB(locals);
		const identifierHash = await hashValue(`${options.action}:${getClientAddress(request)}`);
		const bucketKey = `${options.action}:${identifierHash}`;
		const row = await db
			.prepare(
				`SELECT
					window_started_at AS windowStartedAt,
					request_count AS requestCount,
					blocked_until AS blockedUntil
				FROM request_rate_limits
				WHERE bucket_key = ?
				LIMIT 1`,
			)
			.bind(bucketKey)
			.first<{
				windowStartedAt: string;
				requestCount: number;
				blockedUntil: string | null;
			}>();

		const now = new Date();
		const windowStartedAt = row?.windowStartedAt ? new Date(`${row.windowStartedAt.replace(' ', 'T')}Z`) : now;
		const windowExpired = now.getTime() - windowStartedAt.getTime() >= options.windowMinutes * 60 * 1000;
		const blockedUntil = row?.blockedUntil ? new Date(`${row.blockedUntil.replace(' ', 'T')}Z`) : null;

		if (blockedUntil && blockedUntil > now) {
			return {
				ok: false as const,
				status: 429,
				error: 'Too many requests. Please slow down and try again shortly.',
			};
		}

		const nextCount = windowExpired ? 1 : (row?.requestCount ?? 0) + 1;
		const nextWindowStartedAt = windowExpired ? now : windowStartedAt;
		const nextBlockedUntil =
			nextCount > options.limit
				? toSqlTimestamp(new Date(now.getTime() + (options.blockMinutes ?? options.windowMinutes) * 60 * 1000))
				: null;

		await db
			.prepare(
				`INSERT INTO request_rate_limits (
					bucket_key,
					action,
					identifier_hash,
					window_started_at,
					request_count,
					blocked_until,
					updated_at
				) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
				ON CONFLICT(bucket_key) DO UPDATE SET
					window_started_at = excluded.window_started_at,
					request_count = excluded.request_count,
					blocked_until = excluded.blocked_until,
					updated_at = CURRENT_TIMESTAMP`,
			)
			.bind(
				bucketKey,
				options.action,
				identifierHash,
				toSqlTimestamp(nextWindowStartedAt),
				nextCount,
				nextBlockedUntil,
			)
			.run();

		if (nextCount > options.limit) {
			return {
				ok: false as const,
				status: 429,
				error: 'Too many requests. Please slow down and try again shortly.',
			};
		}
	} catch (_error) {
		return { ok: true as const, skipped: true };
	}

	return { ok: true as const };
}

export async function verifyTurnstile(
	locals: App.Locals,
	request: Request,
	token: string | null | undefined,
) {
	const runtimeEnv = getRuntimeEnv(locals);
	if (!runtimeEnv.TURNSTILE_SECRET_KEY) {
		return { ok: true as const, skipped: true };
	}

	if (!token) {
		return {
			ok: false as const,
			status: 400,
			error: 'Verification is required before this action can continue.',
		};
	}

	const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
		method: 'POST',
		headers: {
			'content-type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams({
			secret: runtimeEnv.TURNSTILE_SECRET_KEY,
			response: token,
			remoteip: getClientAddress(request),
		}),
	});
	const payload = (await response.json().catch(() => null)) as
		| { success?: boolean; 'error-codes'?: string[] }
		| null;

	if (!payload?.success) {
		return {
			ok: false as const,
			status: 400,
			error: 'Verification failed. Please try again.',
			details: payload?.['error-codes'] ?? [],
		};
	}

	return { ok: true as const, skipped: false };
}
