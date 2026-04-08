import { getDB, getRuntimeEnv } from './db';
import { createUserNotification, getNotificationPreferences } from './communications';
import { sendSupportConfirmationEmail } from './email';

export type SupportTierId = 'lights' | 'routing' | 'patron';
export type SupportContributionStatus = 'checkout_pending' | 'succeeded' | 'active' | 'cancelled' | 'failed';

export type SupportContributionSummary = {
	supportContributionId: string;
	provider: string;
	providerReference: string | null;
	amountMinor: number;
	currency: string;
	contributionType: 'one_time' | 'recurring';
	status: SupportContributionStatus;
	createdAt: string;
	updatedAt: string;
	tierLabel: string;
};

export type SupporterState = {
	isSupporter: boolean;
	latestContributionAt: string | null;
	firstContributionAt: string | null;
	activeContributionType: 'one_time' | 'recurring' | null;
	activeTierLabel: string | null;
	badgeLabel: string | null;
	manageLabel: string | null;
	manageUrl: string | null;
	history: SupportContributionSummary[];
};

const supportTiers: Record<
	SupportTierId,
	{ amountMinor: number; label: string; contributionType: 'one_time' | 'recurring' }
> = {
	lights: { amountMinor: 300, label: 'Keep the lights on', contributionType: 'recurring' },
	routing: { amountMinor: 500, label: 'Support routing quality', contributionType: 'recurring' },
	patron: { amountMinor: 2000, label: 'Back the build', contributionType: 'one_time' },
};

export function getSupportTier(id: string | null | undefined) {
	if (!id) return null;
	return supportTiers[id as SupportTierId] ? { id: id as SupportTierId, ...supportTiers[id as SupportTierId] } : null;
}

function getTierLabel(amountMinor: number) {
	return amountMinor >= 2000
		? 'Back the build'
		: amountMinor >= 500
			? 'Support routing quality'
			: 'Keep the lights on';
}

function getSupportBadge(firstContributionAt: string | null) {
	if (!firstContributionAt) return null;
	const firstDate = new Date(firstContributionAt);
	if (Number.isNaN(firstDate.getTime())) return 'Supporter';
	const yearInMs = 365 * 24 * 60 * 60 * 1000;
	return Date.now() - firstDate.getTime() >= yearInMs ? '1-year supporter' : 'Supporter';
}

function getManageLabel(contributionType: 'one_time' | 'recurring' | null) {
	if (contributionType === 'recurring') return 'Manage recurring support';
	if (contributionType === 'one_time') return 'View support history';
	return null;
}

export function getSupportCheckoutUrl(locals: App.Locals, tierId: SupportTierId) {
	const runtimeEnv = getRuntimeEnv(locals);
	switch (tierId) {
		case 'lights':
			return runtimeEnv.STRIPE_SUPPORT_LINK_LIGHTS ?? null;
		case 'routing':
			return runtimeEnv.STRIPE_SUPPORT_LINK_ROUTING ?? null;
		case 'patron':
			return runtimeEnv.STRIPE_SUPPORT_LINK_PATRON ?? null;
		default:
			return null;
	}
}

function appendClientReferenceId(url: string, supportContributionId: string) {
	try {
		const checkoutUrl = new URL(url);
		checkoutUrl.searchParams.set('client_reference_id', supportContributionId);
		return checkoutUrl.toString();
	} catch (_error) {
		return url;
	}
}

export async function createSupportIntent(
	locals: App.Locals,
	input: {
		tierId: SupportTierId;
		userId?: string | null;
	},
) {
	const tier = getSupportTier(input.tierId);
	if (!tier) throw new Error('Unknown support tier.');
	const db = getDB(locals);
	const supportContributionId = crypto.randomUUID();
	await db
		.prepare(
			`INSERT INTO support_contributions (
				support_contribution_id,
				user_id,
				provider,
				provider_reference,
				amount_minor,
				currency,
				contribution_type,
				status
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			supportContributionId,
			input.userId ?? null,
			'stripe',
			tier.id,
			tier.amountMinor,
			'GBP',
			tier.contributionType,
			'checkout_pending',
		)
		.run();

	return {
		supportContributionId,
		tier,
		checkoutUrl: getSupportCheckoutUrl(locals, tier.id)
			? appendClientReferenceId(getSupportCheckoutUrl(locals, tier.id) as string, supportContributionId)
			: null,
	};
}

export async function getSupporterState(
	locals: App.Locals,
	userId: string | null | undefined,
): Promise<SupporterState> {
	if (!userId)
		return {
			isSupporter: false,
			latestContributionAt: null,
			firstContributionAt: null,
			activeContributionType: null,
			activeTierLabel: null,
			badgeLabel: null,
			manageLabel: null,
			manageUrl: null,
			history: [],
		};
	const db = getDB(locals);
	const row = await db
		.prepare(
			`SELECT created_at AS createdAt
			FROM support_contributions
			WHERE user_id = ?
			  AND status IN ('succeeded', 'active')
			ORDER BY created_at DESC
			LIMIT 1`,
		)
		.bind(userId)
		.first<{ createdAt: string }>();
	const oldestRow = await db
		.prepare(
			`SELECT created_at AS createdAt
			FROM support_contributions
			WHERE user_id = ?
			  AND status IN ('succeeded', 'active')
			ORDER BY created_at ASC
			LIMIT 1`,
		)
		.bind(userId)
		.first<{ createdAt: string }>();
	const activeRow = await db
		.prepare(
			`SELECT
				amount_minor AS amountMinor,
				contribution_type AS contributionType
			FROM support_contributions
			WHERE user_id = ?
			  AND status IN ('succeeded', 'active')
			ORDER BY created_at DESC
			LIMIT 1`,
		)
		.bind(userId)
		.first<{
			amountMinor: number;
			contributionType: 'one_time' | 'recurring';
		}>();
	const historyResults = await db
		.prepare(
			`SELECT
				support_contribution_id AS supportContributionId,
				provider,
				provider_reference AS providerReference,
				amount_minor AS amountMinor,
				currency,
				contribution_type AS contributionType,
				status,
				created_at AS createdAt,
				updated_at AS updatedAt
			FROM support_contributions
			WHERE user_id = ?
			ORDER BY created_at DESC
			LIMIT 12`,
		)
		.bind(userId)
		.all<{
			supportContributionId: string;
			provider: string;
			providerReference: string | null;
			amountMinor: number;
			currency: string;
			contributionType: 'one_time' | 'recurring';
			status: SupportContributionStatus;
			createdAt: string;
			updatedAt: string;
		}>();
	const firstContributionAt = oldestRow?.createdAt ?? null;
	const activeContributionType = activeRow?.contributionType ?? null;
	const activeTierLabel = activeRow ? getTierLabel(activeRow.amountMinor) : null;
	return {
		isSupporter: Boolean(row?.createdAt),
		latestContributionAt: row?.createdAt ?? null,
		firstContributionAt,
		activeContributionType,
		activeTierLabel,
		badgeLabel: row?.createdAt ? getSupportBadge(firstContributionAt) : null,
		manageLabel: getManageLabel(activeContributionType),
		manageUrl: null,
		history: historyResults.results.map((item) => ({
			...item,
			tierLabel: getTierLabel(item.amountMinor),
		})),
	};
}

export async function reconcileSupportContribution(
	locals: App.Locals,
	input: {
		supportContributionId: string;
		stripeSessionId: string;
		status: 'succeeded' | 'active';
	},
) {
	const db = getDB(locals);
	const existingContribution = await db
		.prepare(
			`SELECT
				status AS status,
				provider_reference AS providerReference
			FROM support_contributions
			WHERE support_contribution_id = ?
			LIMIT 1`,
		)
		.bind(input.supportContributionId)
		.first<{
			status: string;
			providerReference: string | null;
		}>();

	if (!existingContribution) {
		return { updated: false, reason: 'missing_contribution' as const };
	}

	const alreadyReconciled =
		existingContribution.status === input.status &&
		(existingContribution.providerReference === input.stripeSessionId ||
			(existingContribution.providerReference && !input.stripeSessionId));

	await db
		.prepare(
			`UPDATE support_contributions
			SET provider_reference = ?, status = ?, updated_at = CURRENT_TIMESTAMP
			WHERE support_contribution_id = ?`,
		)
		.bind(input.stripeSessionId, input.status, input.supportContributionId)
		.run();

	if (alreadyReconciled) {
		return { updated: true, notified: false, reason: 'already_reconciled' as const };
	}

	const contribution = await db
		.prepare(
			`SELECT
				sc.user_id AS userId,
				sc.contribution_type AS contributionType,
				sc.provider_reference AS providerReference,
				sc.amount_minor AS amountMinor,
				u.email AS email,
				u.display_name AS displayName
			FROM support_contributions sc
			LEFT JOIN users u ON u.user_id = sc.user_id
			WHERE sc.support_contribution_id = ?
			LIMIT 1`,
		)
		.bind(input.supportContributionId)
		.first<{
			userId: string | null;
			contributionType: 'one_time' | 'recurring';
			providerReference: string | null;
			amountMinor: number;
			email: string | null;
			displayName: string | null;
		}>();

	if (!contribution?.userId) {
		return { updated: true, notified: false, reason: 'no_user' as const };
	}

	const tierLabel = getTierLabel(contribution.amountMinor);

	await createUserNotification(locals, {
		userId: contribution.userId,
		type: 'support_confirmed',
		title: 'Support confirmed',
		body: `${tierLabel} is now active on your account.`,
		ctaPath: '/support',
		metadata: {
			supportContributionId: input.supportContributionId,
			status: input.status,
			tierLabel,
		},
	});

	if (contribution.email) {
		const preferences = await getNotificationPreferences(locals, contribution.userId);
		if (preferences.emailEnabled && preferences.digestMode === 'immediate') {
			await sendSupportConfirmationEmail({
				email: contribution.email,
				name: contribution.displayName,
				tierLabel,
				contributionType: contribution.contributionType,
			}).catch(() => null);
		}
	}

	return { updated: true, notified: true, reason: 'reconciled' as const };
}

export async function updateSupportContributionStatus(
	locals: App.Locals,
	input: {
		supportContributionId: string;
		status: 'failed' | 'cancelled';
		stripeSessionId?: string | null;
	},
) {
	const db = getDB(locals);
	const existingContribution = await db
		.prepare(
			`SELECT
				status AS status,
				provider_reference AS providerReference
			FROM support_contributions
			WHERE support_contribution_id = ?
			LIMIT 1`,
		)
		.bind(input.supportContributionId)
		.first<{
			status: SupportContributionStatus;
			providerReference: string | null;
		}>();

	if (!existingContribution) {
		return { updated: false, reason: 'missing_contribution' as const };
	}

	const providerReference = input.stripeSessionId?.trim() || existingContribution.providerReference || null;
	const alreadyUpdated =
		existingContribution.status === input.status &&
		existingContribution.providerReference === providerReference;

	if (alreadyUpdated) {
		return { updated: true, reason: 'already_updated' as const };
	}

	await db
		.prepare(
			`UPDATE support_contributions
			SET provider_reference = ?, status = ?, updated_at = CURRENT_TIMESTAMP
			WHERE support_contribution_id = ?`,
		)
		.bind(providerReference, input.status, input.supportContributionId)
		.run();

	return { updated: true, reason: 'updated' as const };
}
