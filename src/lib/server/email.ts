import { env } from 'cloudflare:workers';
import { Resend } from 'resend';
import { formatPrettyDate } from '../utils';

type OtpEmailInput = {
	email: string;
	code: string;
	name?: string | null;
};

type SubmissionEmailInput = {
	reportId: string;
	email: string;
	name?: string | null;
	category: string;
	description: string;
	locationLabel: string;
	authorityName?: string | null;
};

type StatusEmailInput = {
	reportId: string;
	email: string;
	name?: string | null;
	category: string;
	status: string;
	authorityName?: string | null;
	note?: string | null;
};

type ResolutionEmailInput = {
	reportId: string;
	email: string;
	name?: string | null;
	category: string;
	summary: string;
	authorityName?: string | null;
};

type SupportConfirmationEmailInput = {
	email: string;
	name?: string | null;
	tierLabel: string;
	contributionType: 'one_time' | 'recurring';
};

type DigestEmailInput = {
	email: string;
	name?: string | null;
	total: number;
	unread: number;
	items: Array<{
		title: string;
		body: string;
		createdAt: string;
		ctaPath?: string | null;
	}>;
};

type EmailTemplateKey =
	| 'otp_code'
	| 'report_submitted'
	| 'status_changed'
	| 'resolution_published'
	| 'support_confirmed'
	| 'daily_digest';

type EmailFact = {
	label: string;
	value: string;
};

type EmailRender = {
	subject: string;
	html: string;
};

function getResendClient() {
	if (!env.RESEND_API_KEY) return null;
	return new Resend(env.RESEND_API_KEY);
}

function getBaseUrl() {
	return env.APP_BASE_URL ?? 'https://see-it-say-it.steven-896.workers.dev';
}

function getFromEmail() {
	return env.RESEND_FROM_EMAIL ?? 'noreply@updates.seeitsayit.app';
}

function baseEmailTemplate(input: {
	preview?: string;
	kicker?: string;
	title: string;
	greeting?: string;
	intro: string;
	facts?: EmailFact[];
	highlight?: string;
	ctaHref?: string;
	ctaLabel?: string;
	closing?: string;
}) {
	const factsHtml =
		input.facts && input.facts.length
			? `
				<div style="margin: 24px 0; padding: 18px; border-radius: 18px; background: #f8fafc; border: 1px solid #e2e8f0;">
					${input.facts
						.map(
							(fact) => `
								<div style="margin-bottom: 10px;">
									<div style="font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; color: #64748b; font-weight: 700;">${fact.label}</div>
									<div style="font-size: 15px; line-height: 1.45; color: #0f172a;">${fact.value}</div>
								</div>`,
						)
						.join('')}
				</div>
			`
			: '';

	const ctaHtml =
		input.ctaHref && input.ctaLabel
			? `<p style="margin: 28px 0 8px;">
				<a href="${input.ctaHref}" style="display: inline-block; padding: 12px 18px; border-radius: 999px; background: #0ea5e9; color: #f8fafc; text-decoration: none; font-weight: 700;">${input.ctaLabel}</a>
			</p>`
			: '';

	const highlightHtml = input.highlight
		? `<div style="margin: 24px 0; padding: 20px; border-radius: 20px; background: #020617; color: #f8fafc; text-align: center; font-size: 32px; font-weight: 700; letter-spacing: 0.14em;">${input.highlight}</div>`
		: '';

	return `
		<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${input.preview ?? input.title}</div>
		<div style="margin:0; padding:32px 16px; background:#f1f5f9; font-family:'Geist Variable', Inter, system-ui, sans-serif; color:#0f172a;">
			<div style="max-width:620px; margin:0 auto; background:#ffffff; border-radius:28px; border:1px solid #e2e8f0; overflow:hidden; box-shadow:0 20px 45px rgba(15, 23, 42, 0.08);">
				<div style="padding:32px 28px 10px;">
					<div style="font-size:12px; letter-spacing:0.12em; text-transform:uppercase; color:#0ea5e9; font-weight:800;">${input.kicker ?? 'See It Say It'}</div>
					<h1 style="margin:12px 0 12px; font-size:28px; line-height:1.1; letter-spacing:-0.03em;">${input.title}</h1>
					${input.greeting ? `<p style="margin:0 0 12px; font-size:15px; line-height:1.55;">${input.greeting}</p>` : ''}
					<p style="margin:0; font-size:15px; line-height:1.6; color:#334155;">${input.intro}</p>
					${highlightHtml}
					${factsHtml}
					${ctaHtml}
					<p style="margin:24px 0 0; font-size:14px; line-height:1.6; color:#475569;">
						${input.closing ?? 'This message was sent by See It Say It so you can track real activity on your reports and account.'}
					</p>
				</div>
				<div style="padding:18px 28px 24px; font-size:12px; color:#64748b;">
					<p style="margin:0;">See It Say It • ${formatPrettyDate(new Date(), { includeTime: true })}</p>
				</div>
			</div>
		</div>
	`;
}

function renderTemplate(key: EmailTemplateKey, payload: Record<string, unknown>): EmailRender {
	switch (key) {
		case 'otp_code': {
			const input = payload as OtpEmailInput;
			return {
				subject: 'See It Say It: your sign-in code',
				html: baseEmailTemplate({
					preview: 'Your one-time code is ready.',
					kicker: 'Sign-in code',
					title: 'Verify your sign-in',
					greeting: input.name ? `Hi ${input.name},` : 'Hello,',
					intro: 'Use the code below to sign in. It expires in 15 minutes and only works once.',
					highlight: input.code,
					closing: 'If you did not request this code, you can ignore this email.',
				}),
			};
		}
		case 'report_submitted': {
			const input = payload as SubmissionEmailInput;
			const reportUrl = `${getBaseUrl()}/reports/${input.reportId}`;
			return {
				subject: `See It Say It: report received for ${input.category}`,
				html: baseEmailTemplate({
					preview: 'Your report is in the queue.',
					kicker: 'Report received',
					title: 'Your report is now in the queue',
					greeting: input.name ? `Hi ${input.name},` : 'Hello,',
					intro: 'We have received your report and added it to the live timeline so you can track what happens next.',
					facts: [
						{ label: 'Category', value: input.category },
						{ label: 'Location', value: input.locationLabel },
						{ label: 'Authority', value: input.authorityName ?? 'Routing in progress' },
						{ label: 'Description', value: input.description },
					],
					ctaHref: reportUrl,
					ctaLabel: 'Open report timeline',
				}),
			};
		}
		case 'status_changed': {
			const input = payload as StatusEmailInput;
			const reportUrl = `${getBaseUrl()}/reports/${input.reportId}`;
			return {
				subject: `See It Say It: ${input.category} is now ${input.status.replaceAll('_', ' ')}`,
				html: baseEmailTemplate({
					preview: 'There is a new status update on your report.',
					kicker: 'Status update',
					title: 'Your report status changed',
					greeting: input.name ? `Hi ${input.name},` : 'Hello,',
					intro: 'There is a new update on your report timeline.',
					facts: [
						{ label: 'Category', value: input.category },
						{ label: 'New status', value: input.status.replaceAll('_', ' ') },
						{ label: 'Authority', value: input.authorityName ?? 'Assigned authority' },
						...(input.note ? [{ label: 'Update note', value: input.note }] : []),
					],
					ctaHref: reportUrl,
					ctaLabel: 'Review the latest update',
				}),
			};
		}
		case 'resolution_published': {
			const input = payload as ResolutionEmailInput;
			const reportUrl = `${getBaseUrl()}/reports/${input.reportId}`;
			return {
				subject: `See It Say It: resolution published for ${input.category}`,
				html: baseEmailTemplate({
					preview: 'A resolution story has been added to your report.',
					kicker: 'Resolution published',
					title: 'A resolution story is now live',
					greeting: input.name ? `Hi ${input.name},` : 'Hello,',
					intro: 'The authority or moderator team has published a resolution update on your report.',
					facts: [
						{ label: 'Category', value: input.category },
						{ label: 'Authority', value: input.authorityName ?? 'Assigned authority' },
						{ label: 'Resolution summary', value: input.summary },
					],
					ctaHref: reportUrl,
					ctaLabel: 'Open resolution story',
				}),
			};
		}
		case 'support_confirmed': {
			const input = payload as SupportConfirmationEmailInput;
			return {
				subject: `See It Say It: thanks for backing the build`,
				html: baseEmailTemplate({
					preview: 'Your support is active.',
					kicker: 'Support confirmed',
					title: 'Thank you for supporting the platform',
					greeting: input.name ? `Hi ${input.name},` : 'Hello,',
					intro: 'Your contribution is now recorded against the platform. Reporting stays free, and support helps keep the service independent.',
					facts: [
						{ label: 'Support tier', value: input.tierLabel },
						{ label: 'Contribution type', value: input.contributionType === 'recurring' ? 'Recurring' : 'One-time' },
					],
					ctaHref: `${getBaseUrl()}/support`,
					ctaLabel: 'Open support page',
				}),
			};
		}
		case 'daily_digest': {
			const input = payload as DigestEmailInput;
			const intro =
				input.total === 0
					? 'There are no new updates in your inbox right now.'
					: 'Here is a grouped round-up of the latest activity across your reports, support, and authority updates.';
			const digestFacts = input.items.slice(0, 8).map((item, index) => ({
				label: `${index + 1}. ${formatPrettyDate(item.createdAt, { includeTime: true })}`,
				value: `${item.title} — ${item.body}`,
			}));

			return {
				subject: `See It Say It: your ${input.unread > 0 ? `${input.unread} unread / ` : ''}${input.total} item digest`,
				html: baseEmailTemplate({
					preview: input.total ? 'Your latest inbox activity in one message.' : 'Your inbox is currently quiet.',
					kicker: 'Daily digest',
					title: 'Your updates in one message',
					greeting: input.name ? `Hi ${input.name},` : 'Hello,',
					intro,
					facts: [
						{ label: 'Total items', value: String(input.total) },
						{ label: 'Unread items', value: String(input.unread) },
						...digestFacts,
					],
					ctaHref: `${getBaseUrl()}/notifications`,
					ctaLabel: 'Open inbox',
				}),
			};
		}
	}
}

async function sendTemplatedEmail<T extends Record<string, unknown>>(
	key: EmailTemplateKey,
	to: string,
	payload: T,
) {
	const resend = getResendClient();
	if (!resend) return { sent: false, reason: 'missing_api_key' as const, template: key };

	const rendered = renderTemplate(key, payload);
	const result = await resend.emails.send({
		from: getFromEmail(),
		to,
		subject: rendered.subject,
		html: rendered.html,
	});

	return { sent: !result.error, result, template: key };
}

export function sendOtpEmail(input: OtpEmailInput) {
	return sendTemplatedEmail('otp_code', input.email, input);
}

export function sendSubmissionEmail(input: SubmissionEmailInput) {
	return sendTemplatedEmail('report_submitted', input.email, input);
}

export function sendStatusUpdateEmail(input: StatusEmailInput) {
	return sendTemplatedEmail('status_changed', input.email, input);
}

export function sendResolutionPublishedEmail(input: ResolutionEmailInput) {
	return sendTemplatedEmail('resolution_published', input.email, input);
}

export function sendSupportConfirmationEmail(input: SupportConfirmationEmailInput) {
	return sendTemplatedEmail('support_confirmed', input.email, input);
}

export function sendDigestEmail(input: DigestEmailInput) {
	return sendTemplatedEmail('daily_digest', input.email, input);
}
