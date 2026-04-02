import type { APIRoute } from 'astro';
import { getRuntimeEnv } from '../../../lib/server/db';
import { reconcileSupportContribution } from '../../../lib/server/support';

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			'content-type': 'application/json; charset=utf-8',
		},
	});
}

function timingSafeEqualHex(first: string, second: string) {
	if (first.length !== second.length) return false;
	let mismatch = 0;
	for (let index = 0; index < first.length; index += 1) {
		mismatch |= first.charCodeAt(index) ^ second.charCodeAt(index);
	}
	return mismatch === 0;
}

async function signStripePayload(secret: string, payload: string) {
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	);
	const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
	return Array.from(new Uint8Array(signed))
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}

async function verifyStripeSignature(secret: string, signatureHeader: string | null, body: string) {
	if (!signatureHeader) return false;
	const parts = Object.fromEntries(
		signatureHeader
			.split(',')
			.map((part) => part.trim().split('='))
			.filter((entry) => entry.length === 2),
	);
	const timestamp = parts.t;
	const signature = parts.v1;
	if (!timestamp || !signature) return false;
	const expected = await signStripePayload(secret, `${timestamp}.${body}`);
	return timingSafeEqualHex(expected, signature);
}

export const POST: APIRoute = async ({ request, locals }) => {
	const webhookSecret = getRuntimeEnv(locals).STRIPE_WEBHOOK_SECRET ?? '';
	if (!webhookSecret) {
		return json({ error: 'Stripe webhook secret is not configured.' }, 503);
	}

	const rawBody = await request.text();
	const verified = await verifyStripeSignature(
		webhookSecret,
		request.headers.get('stripe-signature'),
		rawBody,
	);

	if (!verified) {
		return json({ error: 'Invalid Stripe signature.' }, 400);
	}

	const event = JSON.parse(rawBody) as {
		type?: string;
		data?: {
			object?: {
				id?: string;
				mode?: string;
				client_reference_id?: string;
				payment_status?: string;
				status?: string;
			};
		};
	};

	const session = event.data?.object;
	const supportContributionId = session?.client_reference_id ?? null;
	if (!supportContributionId) {
		return json({ received: true, ignored: true });
	}

	if (
		event.type === 'checkout.session.completed' ||
		event.type === 'checkout.session.async_payment_succeeded'
	) {
		await reconcileSupportContribution(locals, {
			supportContributionId,
			stripeSessionId: session?.id ?? '',
			status: session?.mode === 'subscription' ? 'active' : 'succeeded',
		});
	}

	return json({ received: true });
};
