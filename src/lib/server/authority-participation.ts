import { getDB } from './db';

export type AuthorityParticipationSummary = {
	authorityId: string | null;
	authorityCode: string | null;
	authorityName: string | null;
	state: 'claimed' | 'unclaimed' | 'unknown';
	isMonitored: boolean;
	claimedByCount: number;
	claimedAt: string | null;
	recentlyClaimed: boolean;
	label: string;
	description: string;
	shortDescription: string;
};

function unknownSummary(): AuthorityParticipationSummary {
	return {
		authorityId: null,
		authorityCode: null,
		authorityName: null,
		state: 'unknown',
		isMonitored: false,
		claimedByCount: 0,
		claimedAt: null,
		recentlyClaimed: false,
		label: 'Authority not yet matched',
		description: 'This report still helps map issues publicly, even before a specific authority route is confirmed.',
		shortDescription: 'Public evidence only until authority matching is confirmed.',
	};
}

function formatSummary(input: {
	authorityId: string | null;
	authorityCode: string | null;
	authorityName: string | null;
	claimedByCount: number;
	claimedAt: string | null;
}): AuthorityParticipationSummary {
	if (!input.authorityId) {
		return unknownSummary();
	}

	const recentlyClaimed =
		Boolean(input.claimedAt) &&
		Date.now() - new Date(input.claimedAt as string).getTime() < 1000 * 60 * 60 * 24 * 30;

	if (input.claimedByCount > 0) {
		return {
			authorityId: input.authorityId,
			authorityCode: input.authorityCode,
			authorityName: input.authorityName,
			state: 'claimed',
			isMonitored: true,
			claimedByCount: input.claimedByCount,
			claimedAt: input.claimedAt,
			recentlyClaimed,
			label: recentlyClaimed ? 'Authority recently claimed' : 'Authority monitored',
			description: recentlyClaimed
				? `${input.authorityName ?? 'This authority'} has recently claimed its workspace in See It Say It. New reports are visible in the operational queue, while historic backlog may still need review and adoption.`
				: `${input.authorityName ?? 'This authority'} has claimed its workspace in See It Say It, so reports here are visible in the operational queue.`,
			shortDescription: recentlyClaimed
				? 'This area is now monitored, and historic backlog may still be under review.'
				: 'This area is monitored through See It Say It.',
		};
	}

	return {
		authorityId: input.authorityId,
		authorityCode: input.authorityCode,
		authorityName: input.authorityName,
		state: 'unclaimed',
		isMonitored: false,
		claimedByCount: 0,
		claimedAt: null,
		recentlyClaimed: false,
		label: 'Authority not yet participating',
		description: `This area is not currently monitored by ${input.authorityName ?? 'the matched authority'} through See It Say It. Reports still help map issues, surface trends, and build public evidence.`,
		shortDescription: 'This area is not currently monitored by the authority through See It Say It.',
	};
}

export async function getAuthorityParticipationByAuthorityCode(
	locals: App.Locals,
	authorityCode: string | null | undefined,
) {
	if (!authorityCode?.trim()) {
		return unknownSummary();
	}

	const db = getDB(locals);
	const row = await db
		.prepare(
			`SELECT
				a.authority_id AS authorityId,
				a.code AS authorityCode,
				a.name AS authorityName,
				COALESCE(COUNT(DISTINCT ur.user_role_id), 0) AS claimedByCount,
				MIN(ur.assigned_at) AS claimedAt
			FROM authorities a
			LEFT JOIN user_roles ur
				ON ur.authority_id = a.authority_id
				AND ur.role IN ('warden', 'moderator')
			WHERE a.code = ?
			GROUP BY a.authority_id, a.code, a.name
			LIMIT 1`,
		)
		.bind(authorityCode.trim())
		.first<{
			authorityId: string | null;
			authorityCode: string | null;
			authorityName: string | null;
			claimedByCount: number | null;
			claimedAt: string | null;
		}>();

	if (!row?.authorityId) {
		return unknownSummary();
	}

	return formatSummary({
		authorityId: row.authorityId,
		authorityCode: row.authorityCode,
		authorityName: row.authorityName,
		claimedByCount: row.claimedByCount ?? 0,
		claimedAt: row.claimedAt ?? null,
	});
}
