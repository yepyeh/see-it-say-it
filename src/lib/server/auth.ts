import { getDB } from './db';

export const SESSION_COOKIE_NAME = 'sis_session';
const OTP_TTL_MINUTES = 15;
const SESSION_TTL_DAYS = 30;

export type RoleName = 'resident' | 'warden' | 'moderator' | 'admin';

export type AuthenticatedRole = {
	role: RoleName;
	authorityId: string | null;
	authorityCode: string | null;
	authorityName: string | null;
};

export type AuthenticatedUser = {
	userId: string;
	email: string;
	displayName: string | null;
	roles: AuthenticatedRole[];
};

export type AuthorityTeamMember = {
	userId: string;
	displayName: string | null;
	email: string;
	role: RoleName;
	authorityId: string | null;
	authorityCode: string | null;
	authorityName: string | null;
};

type SessionRow = {
	userId: string;
	email: string;
	displayName: string | null;
};

function addMinutes(base: Date, minutes: number) {
	return new Date(base.getTime() + minutes * 60 * 1000);
}

function addDays(base: Date, days: number) {
	return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

function toSqlTimestamp(date: Date) {
	return date.toISOString().slice(0, 19).replace('T', ' ');
}

async function hashOtp(email: string, code: string) {
	const encoder = new TextEncoder();
	const payload = encoder.encode(`${normalizeEmail(email)}:${code}`);
	const digest = await crypto.subtle.digest('SHA-256', payload);
	return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
}

function generateOtpCode() {
	return String(Math.floor(100000 + Math.random() * 900000));
}

export function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

export async function getOrCreateUser(db: D1Database, email: string, name?: string | null) {
	const normalizedEmail = normalizeEmail(email);
	const existing = await db
		.prepare('SELECT user_id AS userId, display_name AS displayName FROM users WHERE email = ?')
		.bind(normalizedEmail)
		.first<{ userId: string; displayName: string | null }>();

	if (existing?.userId) {
		if (name?.trim() && name.trim() !== existing.displayName) {
			await db
				.prepare('UPDATE users SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
				.bind(name.trim(), existing.userId)
				.run();
		}
		return existing.userId;
	}

	const userId = crypto.randomUUID();
	await db
		.prepare(
			'INSERT INTO users (user_id, email, display_name, preferred_locale, home_country_code) VALUES (?, ?, ?, ?, ?)',
		)
		.bind(userId, normalizedEmail, name?.trim() || null, 'en-GB', 'GB')
		.run();

	await db
		.prepare(
			'INSERT INTO user_roles (user_role_id, user_id, role, country_code) VALUES (?, ?, ?, ?)',
		)
		.bind(crypto.randomUUID(), userId, 'resident', 'GB')
		.run();

	return userId;
}

export async function createOtpChallenge(
	locals: App.Locals,
	email: string,
	name?: string | null,
) {
	const db = getDB(locals);
	const normalizedEmail = normalizeEmail(email);
	await getOrCreateUser(db, normalizedEmail, name);
	const code = generateOtpCode();
	const challengeId = crypto.randomUUID();
	const expiresAt = toSqlTimestamp(addMinutes(new Date(), OTP_TTL_MINUTES));
	const codeHash = await hashOtp(normalizedEmail, code);

	await db
		.prepare(
			'INSERT INTO otp_challenges (challenge_id, email, code_hash, requested_name, expires_at) VALUES (?, ?, ?, ?, ?)',
		)
		.bind(challengeId, normalizedEmail, codeHash, name?.trim() || null, expiresAt)
		.run();

	return {
		challengeId,
		code,
		expiresAt,
		email: normalizedEmail,
	};
}

async function loadRoles(db: D1Database, userId: string) {
	const result = await db
		.prepare(
			`SELECT
				ur.role AS role,
				ur.authority_id AS authorityId,
				a.code AS authorityCode,
				a.name AS authorityName
			FROM user_roles ur
			LEFT JOIN authorities a ON a.authority_id = ur.authority_id
			WHERE ur.user_id = ?`,
		)
		.bind(userId)
		.all<AuthenticatedRole>();
	return result.results;
}

export async function getAuthenticatedUser(
	locals: App.Locals,
	sessionId: string,
	updateLastSeen = false,
) {
	const db = getDB(locals);
	const session = await db
		.prepare(
			`SELECT
				s.user_id AS userId,
				s.email AS email,
				u.display_name AS displayName
			FROM auth_sessions s
			JOIN users u ON u.user_id = s.user_id
			WHERE s.session_id = ?
			  AND s.expires_at > CURRENT_TIMESTAMP
			LIMIT 1`,
		)
		.bind(sessionId)
		.first<SessionRow>();

	if (!session) return null;

	if (updateLastSeen) {
		await db
			.prepare('UPDATE auth_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE session_id = ?')
			.bind(sessionId)
			.run();
	}

	return {
		...session,
		roles: await loadRoles(db, session.userId),
	} satisfies AuthenticatedUser;
}

export async function verifyOtpAndCreateSession(
	locals: App.Locals,
	email: string,
	code: string,
) {
	const db = getDB(locals);
	const normalizedEmail = normalizeEmail(email);
	const challenge = await db
		.prepare(
			`SELECT challenge_id AS challengeId, code_hash AS codeHash, requested_name AS requestedName, attempts AS attempts
			FROM otp_challenges
			WHERE email = ?
			  AND used_at IS NULL
			  AND expires_at > CURRENT_TIMESTAMP
			ORDER BY created_at DESC
			LIMIT 1`,
		)
		.bind(normalizedEmail)
		.first<{
			challengeId: string;
			codeHash: string;
			requestedName: string | null;
			attempts: number;
		}>();

	if (!challenge) {
		return { ok: false as const, reason: 'expired_or_missing' };
	}

	if (challenge.attempts >= 5) {
		return { ok: false as const, reason: 'too_many_attempts' };
	}

	const providedHash = await hashOtp(normalizedEmail, code.trim());
	if (providedHash !== challenge.codeHash) {
		await db
			.prepare('UPDATE otp_challenges SET attempts = attempts + 1 WHERE challenge_id = ?')
			.bind(challenge.challengeId)
			.run();
		return { ok: false as const, reason: 'invalid_code' };
	}

	await db
		.prepare('UPDATE otp_challenges SET used_at = CURRENT_TIMESTAMP WHERE challenge_id = ?')
		.bind(challenge.challengeId)
		.run();

	const userId = await getOrCreateUser(db, normalizedEmail, challenge.requestedName);
	const sessionId = crypto.randomUUID();
	const expiresAt = toSqlTimestamp(addDays(new Date(), SESSION_TTL_DAYS));

	await db
		.prepare(
			'INSERT INTO auth_sessions (session_id, user_id, email, expires_at) VALUES (?, ?, ?, ?)',
		)
		.bind(sessionId, userId, normalizedEmail, expiresAt)
		.run();

	const user = await getAuthenticatedUser(locals, sessionId, true);
	return {
		ok: true as const,
		sessionId,
		expiresAt,
		user,
	};
}

export async function destroySession(locals: App.Locals, sessionId: string) {
	await getDB(locals)
		.prepare('DELETE FROM auth_sessions WHERE session_id = ?')
		.bind(sessionId)
		.run();
}

export function getAuthorityScope(user: AuthenticatedUser | null) {
	if (!user) return { isAuthorized: false, authorityCodes: [] as string[] };
	const elevatedRoles = new Set<RoleName>(['warden', 'moderator', 'admin']);
	const authorityCodes = user.roles
		.filter((role) => role.authorityCode)
		.map((role) => role.authorityCode as string);
	const isAuthorized = user.roles.some(
		(role) => elevatedRoles.has(role.role) || Boolean(role.authorityCode),
	);
	return {
		isAuthorized,
		authorityCodes,
		isAdmin: user.roles.some((role) => role.role === 'admin'),
	};
}

export async function listAuthorityTeamMembers(
	locals: App.Locals,
	options: { authorityCode?: string; authorityCodes?: string[] } = {},
) {
	const db = getDB(locals);
	const bindings: string[] = [];
	const clauses: string[] = [];

	if (options.authorityCode) {
		clauses.push('a.code = ?');
		bindings.push(options.authorityCode);
	} else if (options.authorityCodes?.length) {
		clauses.push(`a.code IN (${options.authorityCodes.map(() => '?').join(', ')})`);
		bindings.push(...options.authorityCodes);
	}

	const whereClause = clauses.length
		? `WHERE (${clauses.join(' OR ')}) OR ur.role IN ('moderator', 'admin')`
		: `WHERE ur.role IN ('moderator', 'admin')`;

	const result = await db
		.prepare(
			`SELECT DISTINCT
				u.user_id AS userId,
				u.display_name AS displayName,
				u.email AS email,
				ur.role AS role,
				ur.authority_id AS authorityId,
				a.code AS authorityCode,
				a.name AS authorityName
			FROM user_roles ur
			JOIN users u ON u.user_id = ur.user_id
			LEFT JOIN authorities a ON a.authority_id = ur.authority_id
			${whereClause}
			ORDER BY
				CASE ur.role
					WHEN 'admin' THEN 0
					WHEN 'moderator' THEN 1
					WHEN 'warden' THEN 2
					ELSE 3
				END,
				COALESCE(u.display_name, u.email)`,
		)
		.bind(...bindings)
		.all<AuthorityTeamMember>();

	return result.results;
}
