import { getDB, getRuntimeEnv } from './db';

export type SupportTierId = 'lights' | 'routing' | 'patron';

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

export async function getSupporterState(locals: App.Locals, userId: string | null | undefined) {
	if (!userId) return { isSupporter: false, latestContributionAt: null as string | null };
	const row = await getDB(locals)
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
	return {
		isSupporter: Boolean(row?.createdAt),
		latestContributionAt: row?.createdAt ?? null,
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
	await getDB(locals)
		.prepare(
			`UPDATE support_contributions
			SET provider_reference = ?, status = ?, updated_at = CURRENT_TIMESTAMP
			WHERE support_contribution_id = ?`,
		)
		.bind(input.stripeSessionId, input.status, input.supportContributionId)
		.run();
}
