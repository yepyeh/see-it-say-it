import { env } from 'cloudflare:workers';
import { Resend } from 'resend';

type SubmissionEmailInput = {
	reportId: string;
	email: string;
	name?: string;
	category: string;
	description: string;
	locationLabel: string;
	authorityName?: string | null;
};

type OtpEmailInput = {
	email: string;
	code: string;
	name?: string | null;
};

function getResendClient() {
	if (!env.RESEND_API_KEY) return null;
	return new Resend(env.RESEND_API_KEY);
}

export async function sendSubmissionEmail(input: SubmissionEmailInput) {
	const resend = getResendClient();
	if (!resend) return { sent: false, reason: 'missing_api_key' as const };

	const appBaseUrl = env.APP_BASE_URL ?? 'https://see-it-say-it.steven-896.workers.dev';
	const fromEmail = env.RESEND_FROM_EMAIL ?? 'noreply@updates.seeitsayit.app';
	const reportUrl = `${appBaseUrl}/reports/${input.reportId}`;
	const greeting = input.name ? `Hi ${input.name},` : 'Hello,';

	const result = await resend.emails.send({
		from: fromEmail,
		to: input.email,
		subject: `Report received: ${input.category}`,
		html: `
			<p>${greeting}</p>
			<p>We have received your report and queued it for authority routing.</p>
			<p><strong>Category:</strong> ${input.category}</p>
			<p><strong>Location:</strong> ${input.locationLabel}</p>
			<p><strong>Description:</strong> ${input.description}</p>
			<p><strong>Authority:</strong> ${input.authorityName ?? 'Routing in progress'}</p>
			<p>You can view the report here: <a href="${reportUrl}">${reportUrl}</a></p>
			<p>Thank you for reporting it.</p>
		`,
	});

	return { sent: !result.error, result };
}

export async function sendOtpEmail(input: OtpEmailInput) {
	const resend = getResendClient();
	if (!resend) return { sent: false, reason: 'missing_api_key' as const };

	const fromEmail = env.RESEND_FROM_EMAIL ?? 'noreply@updates.seeitsayit.app';
	const greeting = input.name ? `Hi ${input.name},` : 'Hello,';

	const result = await resend.emails.send({
		from: fromEmail,
		to: input.email,
		subject: 'Your See It Say It sign-in code',
		html: `
			<p>${greeting}</p>
			<p>Your one-time sign-in code is:</p>
			<p style="font-size: 32px; font-weight: 700; letter-spacing: 0.16em;">${input.code}</p>
			<p>This code expires in 15 minutes.</p>
			<p>If you did not request it, you can ignore this email.</p>
		`,
	});

	return { sent: !result.error, result };
}
