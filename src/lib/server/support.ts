import { getDB, getRuntimeEnv } from './db';
import { createUserNotification, getNotificationPreferences } from './communications';
import { sendSupportConfirmationEmail } from './email';

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
	const db = getDB(locals);
	await db
		.prepare(
			`UPDATE support_contributions
			SET provider_reference = ?, status = ?, updated_at = CURRENT_TIMESTAMP
			WHERE support_contribution_id = ?`,
		)
		.bind(input.stripeSessionId, input.status, input.supportContributionId)
		.run();

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

	if (!contribution?.userId) return;

	const tierLabel =
		contribution.amountMinor >= 2000
			? 'Back the build'
			: contribution.amountMinor >= 500
				? 'Support routing quality'
				: 'Keep the lights on';

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
}
