import { getDB } from './db';

export type ProfileVisibility = 'public' | 'community' | 'private';

export type AccountProfile = {
	userId: string;
	email: string;
	displayName: string | null;
	handle: string | null;
	bio: string | null;
	avatarUrl: string | null;
	profileVisibility: ProfileVisibility;
	homeAuthorityCode: string | null;
	homeAuthorityName: string | null;
	createdAt: string;
};

export type PublicProfileSummary = {
	userId: string;
	handle: string;
	displayName: string | null;
	bio: string | null;
	avatarUrl: string | null;
	profileVisibility: ProfileVisibility;
	homeAuthorityCode: string | null;
	homeAuthorityName: string | null;
	createdAt: string;
	reportCount: number;
	resolvedCount: number;
	confirmationsMade: number;
	duplicateReports: number;
	recentReports: {
		reportId: string;
		category: string;
		description: string;
		status: string;
		locationLabel: string | null;
		createdAt: string;
	}[];
};

export type ReporterAttribution = {
	label: string;
	handle: string | null;
	profileHref: string | null;
	visibility: ProfileVisibility;
};

export type AuthorityReporterTrustSummary = {
	accountAgeDays: number;
	reportCount: number;
	resolvedCount: number;
	confirmationsMade: number;
	last30DayReports: number;
	distinctAuthorityCount: number;
	duplicateReports: number;
	riskFlags: string[];
};

const handlePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isMissingProfilesTable(error: unknown) {
	return error instanceof Error && error.message.includes('no such table: user_profiles');
}

function normalizeHandle(handle: string) {
	return handle.trim().toLowerCase();
}

function validateHandle(handle: string) {
	return handlePattern.test(handle) && handle.length >= 3 && handle.length <= 24;
}

function asVisibility(value: unknown): ProfileVisibility {
	return value === 'public' || value === 'private' ? value : 'community';
}

export async function getAccountProfile(locals: App.Locals, userId: string) {
	let row: AccountProfile | null = null;
	try {
		row = await getDB(locals)
			.prepare(
				`SELECT
					u.user_id AS userId,
					u.email AS email,
					u.display_name AS displayName,
					u.created_at AS createdAt,
					up.handle AS handle,
					up.bio AS bio,
					up.avatar_url AS avatarUrl,
					COALESCE(up.profile_visibility, 'community') AS profileVisibility,
					a.code AS homeAuthorityCode,
					a.name AS homeAuthorityName
				FROM users u
				LEFT JOIN user_profiles up ON up.user_id = u.user_id
				LEFT JOIN authorities a ON a.authority_id = up.home_authority_id
				WHERE u.user_id = ?
				LIMIT 1`,
			)
			.bind(userId)
			.first<AccountProfile>();
	} catch (error) {
		if (!isMissingProfilesTable(error)) throw error;
		row = await getDB(locals)
			.prepare(
				`SELECT
					u.user_id AS userId,
					u.email AS email,
					u.display_name AS displayName,
					u.created_at AS createdAt,
					NULL AS handle,
					NULL AS bio,
					NULL AS avatarUrl,
					'community' AS profileVisibility,
					NULL AS homeAuthorityCode,
					NULL AS homeAuthorityName
				FROM users u
				WHERE u.user_id = ?
				LIMIT 1`,
			)
			.bind(userId)
			.first<AccountProfile>();
	}

	if (!row) return null;

	return {
		...row,
		profileVisibility: asVisibility(row.profileVisibility),
	};
}

export async function updateAccountProfile(
	locals: App.Locals,
	userId: string,
	input: {
		displayName: string;
		handle?: string | null;
		bio?: string | null;
		profileVisibility?: ProfileVisibility;
		homeAuthorityCode?: string | null;
	},
) {
	const db = getDB(locals);
	const displayName = input.displayName.trim();
	if (!displayName) throw new Error('A full name is required.');

	const handle = input.handle?.trim() ? normalizeHandle(input.handle) : null;
	if (handle && !validateHandle(handle)) {
		throw new Error('Handles must be 3-24 characters, lowercase, and use letters, numbers, or hyphens.');
	}

	const bio = input.bio?.trim() || null;
	if (bio && bio.length > 280) {
		throw new Error('Bio must be 280 characters or fewer.');
	}

	const visibility = asVisibility(input.profileVisibility);
	if (visibility === 'public' && !handle) {
		throw new Error('Add a public handle before making your profile public.');
	}

	if (handle) {
		const existing = await db
			.prepare('SELECT user_id AS userId FROM user_profiles WHERE handle = ? LIMIT 1')
			.bind(handle)
			.first<{ userId: string }>();
		if (existing?.userId && existing.userId !== userId) {
			throw new Error('That handle is already in use.');
		}
	}

	let homeAuthorityId: string | null = null;
	if (input.homeAuthorityCode?.trim()) {
		const authority = await db
			.prepare('SELECT authority_id AS authorityId FROM authorities WHERE code = ? LIMIT 1')
			.bind(input.homeAuthorityCode.trim())
			.first<{ authorityId: string }>();
		if (!authority?.authorityId) {
			throw new Error('Unknown home authority code.');
		}
		homeAuthorityId = authority.authorityId;
	}

	await db
		.prepare('UPDATE users SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?')
		.bind(displayName, userId)
		.run();

	try {
		await db
			.prepare(
				`INSERT INTO user_profiles (
					user_id,
					handle,
					bio,
					avatar_url,
					profile_visibility,
					home_authority_id,
					updated_at
				) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
				ON CONFLICT(user_id) DO UPDATE SET
					handle = excluded.handle,
					bio = excluded.bio,
					avatar_url = excluded.avatar_url,
					profile_visibility = excluded.profile_visibility,
					home_authority_id = excluded.home_authority_id,
					updated_at = CURRENT_TIMESTAMP`,
			)
			.bind(userId, handle, bio, null, visibility, homeAuthorityId)
			.run();
	} catch (error) {
		if (isMissingProfilesTable(error)) {
			throw new Error('Profile features are waiting on the latest database migration.');
		}
		throw error;
	}

	return getAccountProfile(locals, userId);
}

export async function getReporterAttribution(locals: App.Locals, userId: string | null) {
	if (!userId) return null;
	let row:
		| {
				displayName: string | null;
				handle: string | null;
				profileVisibility: ProfileVisibility;
		  }
		| null = null;
	try {
		row = await getDB(locals)
			.prepare(
				`SELECT
					u.display_name AS displayName,
					up.handle AS handle,
					COALESCE(up.profile_visibility, 'community') AS profileVisibility
				FROM users u
				LEFT JOIN user_profiles up ON up.user_id = u.user_id
				WHERE u.user_id = ?
				LIMIT 1`,
			)
			.bind(userId)
			.first<{ displayName: string | null; handle: string | null; profileVisibility: ProfileVisibility }>();
	} catch (error) {
		if (!isMissingProfilesTable(error)) throw error;
		row = await getDB(locals)
			.prepare(
				`SELECT
					u.display_name AS displayName,
					NULL AS handle,
					'community' AS profileVisibility
				FROM users u
				WHERE u.user_id = ?
				LIMIT 1`,
			)
			.bind(userId)
			.first<{ displayName: string | null; handle: string | null; profileVisibility: ProfileVisibility }>();
	}

	if (!row) return null;
	const visibility = asVisibility(row.profileVisibility);
	if (visibility === 'private') {
		return {
			label: 'Community member',
			handle: null,
			profileHref: null,
			visibility,
		} satisfies ReporterAttribution;
	}

	const label = row.displayName?.trim() || row.handle?.trim() || 'Community member';
	return {
		label,
		handle: row.handle ?? null,
		profileHref: visibility === 'public' && row.handle ? `/people/${row.handle}` : null,
		visibility,
	} satisfies ReporterAttribution;
}

export async function getPublicProfileByHandle(locals: App.Locals, handle: string) {
	let profile:
		| {
				userId: string;
				displayName: string | null;
				createdAt: string;
				handle: string;
				bio: string | null;
				avatarUrl: string | null;
				profileVisibility: ProfileVisibility;
				homeAuthorityCode: string | null;
				homeAuthorityName: string | null;
		  }
		| null = null;
	try {
		profile = await getDB(locals)
			.prepare(
				`SELECT
					u.user_id AS userId,
					u.display_name AS displayName,
					u.created_at AS createdAt,
					up.handle AS handle,
					up.bio AS bio,
					up.avatar_url AS avatarUrl,
					up.profile_visibility AS profileVisibility,
					a.code AS homeAuthorityCode,
					a.name AS homeAuthorityName
				FROM user_profiles up
				INNER JOIN users u ON u.user_id = up.user_id
				LEFT JOIN authorities a ON a.authority_id = up.home_authority_id
				WHERE up.handle = ?
				  AND up.profile_visibility = 'public'
				LIMIT 1`,
			)
			.bind(normalizeHandle(handle))
			.first<{
				userId: string;
				displayName: string | null;
				createdAt: string;
				handle: string;
				bio: string | null;
				avatarUrl: string | null;
				profileVisibility: ProfileVisibility;
				homeAuthorityCode: string | null;
				homeAuthorityName: string | null;
			}>();
	} catch (error) {
		if (!isMissingProfilesTable(error)) throw error;
		return null;
	}

	if (!profile) return null;

	const [stats, recentReports] = await Promise.all([
		getDB(locals)
			.prepare(
				`SELECT
					COALESCE((SELECT COUNT(*) FROM reports WHERE user_id = ?), 0) AS reportCount,
					COALESCE((SELECT COUNT(*) FROM reports WHERE user_id = ? AND status = 'resolved'), 0) AS resolvedCount,
					COALESCE((SELECT COUNT(*) FROM report_confirmations WHERE user_id = ?), 0) AS confirmationsMade,
					COALESCE((SELECT COUNT(*) FROM reports WHERE user_id = ? AND duplicate_of_report_id IS NOT NULL), 0) AS duplicateReports`,
			)
			.bind(profile.userId, profile.userId, profile.userId, profile.userId)
			.first<{
				reportCount: number;
				resolvedCount: number;
				confirmationsMade: number;
				duplicateReports: number;
			}>(),
		getDB(locals)
			.prepare(
				`SELECT
					report_id AS reportId,
					category AS category,
					description AS description,
					status AS status,
					location_label AS locationLabel,
					created_at AS createdAt
				FROM reports
				WHERE user_id = ?
				ORDER BY created_at DESC
				LIMIT 8`,
			)
			.bind(profile.userId)
			.all<PublicProfileSummary['recentReports'][number]>(),
	]);

	return {
		...profile,
		profileVisibility: 'public' as const,
		reportCount: stats?.reportCount ?? 0,
		resolvedCount: stats?.resolvedCount ?? 0,
		confirmationsMade: stats?.confirmationsMade ?? 0,
		duplicateReports: stats?.duplicateReports ?? 0,
		recentReports: recentReports.results,
	} satisfies PublicProfileSummary;
}

export async function getAuthorityReporterTrustSummary(locals: App.Locals, userId: string | null) {
	if (!userId) return null;
	const row = await getDB(locals)
		.prepare(
			`SELECT
				u.created_at AS createdAt,
				COALESCE((SELECT COUNT(*) FROM reports WHERE user_id = u.user_id), 0) AS reportCount,
				COALESCE((SELECT COUNT(*) FROM reports WHERE user_id = u.user_id AND status = 'resolved'), 0) AS resolvedCount,
				COALESCE((SELECT COUNT(*) FROM report_confirmations WHERE user_id = u.user_id), 0) AS confirmationsMade,
				COALESCE((SELECT COUNT(*) FROM reports WHERE user_id = u.user_id AND created_at >= datetime('now', '-30 day')), 0) AS last30DayReports,
				COALESCE((SELECT COUNT(DISTINCT authority_id) FROM reports WHERE user_id = u.user_id AND authority_id IS NOT NULL), 0) AS distinctAuthorityCount,
				COALESCE((SELECT COUNT(*) FROM reports WHERE user_id = u.user_id AND duplicate_of_report_id IS NOT NULL), 0) AS duplicateReports
			FROM users u
			WHERE u.user_id = ?
			LIMIT 1`,
		)
		.bind(userId)
		.first<{
			createdAt: string;
			reportCount: number;
			resolvedCount: number;
			confirmationsMade: number;
			last30DayReports: number;
			distinctAuthorityCount: number;
			duplicateReports: number;
		}>();

	if (!row) return null;
	const accountAgeDays = Math.max(0, Math.floor((Date.now() - new Date(row.createdAt).getTime()) / (1000 * 60 * 60 * 24)));
	const riskFlags: string[] = [];
	if (row.last30DayReports >= 10) riskFlags.push('High submission volume in the last 30 days');
	if (row.distinctAuthorityCount >= 4) riskFlags.push('Reports span several different authorities');
	if (row.duplicateReports >= 3) riskFlags.push('Multiple reports were logged as duplicates');

	return {
		accountAgeDays,
		reportCount: row.reportCount,
		resolvedCount: row.resolvedCount,
		confirmationsMade: row.confirmationsMade,
		last30DayReports: row.last30DayReports,
		distinctAuthorityCount: row.distinctAuthorityCount,
		duplicateReports: row.duplicateReports,
		riskFlags,
	} satisfies AuthorityReporterTrustSummary;
}
