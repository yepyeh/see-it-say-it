import { getDB } from './db';

export type AuthorityParticipationSummary = {
	authorityId: string | null;
	authorityCode: string | null;
	authorityName: string | null;
	state: 'claimed' | 'unclaimed' | 'unknown';
	isMonitored: boolean;
	claimedByCount: number;
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
}): AuthorityParticipationSummary {
	if (!input.authorityId) {
		return unknownSummary();
	}

	if (input.claimedByCount > 0) {
		return {
			authorityId: input.authorityId,
			authorityCode: input.authorityCode,
			authorityName: input.authorityName,
			state: 'claimed',
			isMonitored: true,
			claimedByCount: input.claimedByCount,
			label: 'Authority monitored',
			description: `${input.authorityName ?? 'This authority'} has claimed its workspace in See It Say It, so reports here are visible in the operational queue.`,
			shortDescription: 'This area is monitored through See It Say It.',
		};
	}

	return {
		authorityId: input.authorityId,
		authorityCode: input.authorityCode,
		authorityName: input.authorityName,
		state: 'unclaimed',
		isMonitored: false,
		claimedByCount: 0,
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
				COALESCE(COUNT(DISTINCT ur.user_role_id), 0) AS claimedByCount
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
		}>();

	if (!row?.authorityId) {
		return unknownSummary();
	}

	return formatSummary({
		authorityId: row.authorityId,
		authorityCode: row.authorityCode,
		authorityName: row.authorityName,
		claimedByCount: row.claimedByCount ?? 0,
	});
}
