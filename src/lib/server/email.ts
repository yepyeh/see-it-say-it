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

function getResendClient() {
	if (!env.RESEND_API_KEY) return null;
	return new Resend(env.RESEND_API_KEY);
}

export async function sendSubmissionEmail(input: SubmissionEmailInput) {
	const resend = getResendClient();
	if (!resend) return { sent: false, reason: 'missing_api_key' as const };

	const appBaseUrl = env.APP_BASE_URL ?? 'https://see-it-say-it.steven-896.workers.dev';
	const fromEmail = env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
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
