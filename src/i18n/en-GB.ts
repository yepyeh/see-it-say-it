const enGB = {
	'meta.title': 'See It Say It',
	'meta.description':
		'Report local issues quickly with a visual, location-aware workflow built for public reporting and council routing.',
	'nav.locale': 'English (UK)',
	'hero.eyebrow': 'UK-first. Global-ready.',
	'hero.title': 'Community issue reporting built for fast capture and accurate routing.',
	'hero.body':
		'See It Say It is a public reporting platform for potholes, graffiti, fly-tipping, and other local issues. The product starts in the UK, with a data model designed to scale across countries, authorities, and moderation teams.',
	'hero.primaryCta': 'Report an issue',
	'hero.secondaryCta': 'Review project brief',
	'hero.tertiaryCta': 'Browse public reports',
	'pill.locale': 'Locale layer enabled',
	'pill.roles': 'Warden role included',
	'pill.cloudflare': 'Cloudflare SSR ready',
	'section.foundation': 'Foundation',
	'section.workflow': 'Reporting workflow',
	'section.architecture': 'Scale strategy',
	'foundation.locale.title': 'Translation-first text model',
	'foundation.locale.body':
		'All user-facing copy resolves through a locale dictionary, starting with English (UK) so later markets do not require a content rewrite.',
	'foundation.roles.title': 'Role-aware moderation',
	'foundation.roles.body':
		'The access model includes residents, wardens, moderators, and admins so community review and escalation can evolve without reworking authorization.',
	'foundation.platform.title': 'Cloudflare-native deployment path',
	'foundation.platform.body':
		'Astro SSR is configured for Cloudflare, with room for D1, R2, Turnstile, and Worker-based routing and dispatch flows.',
	'workflow.capture.title': '1. Capture',
	'workflow.capture.body': 'Take or upload a photo and persist media in R2 through a signed upload flow.',
	'workflow.locate.title': '2. Locate',
	'workflow.locate.body':
		'Use GPS first, then allow manual pin adjustment so reports can be trusted without forcing typed addresses.',
	'workflow.categorize.title': '3. Categorize',
	'workflow.categorize.body':
		'Use a visual category grid with icons and concise labels for fast, low-friction issue selection.',
	'workflow.detail.title': '4. Detail',
	'workflow.detail.body':
		'Collect a short description, severity, and any structured metadata needed for routing or triage.',
	'workflow.submit.title': '5. Submit',
	'workflow.submit.body':
		'Show a review step and optimistic status updates while asynchronous routing and dispatch continue in the background.',
	'architecture.geography.title': 'Geography model',
	'architecture.geography.body':
		'The schema should separate country, region, authority, and boundary datasets so UK councils are only the first deployment slice.',
	'architecture.routing.title': 'Routing pipeline',
	'architecture.routing.body':
		'Submission, geo-routing, dispatch, and status updates should be isolated into retryable Worker responsibilities.',
	'architecture.wardens.title': 'Warden operations',
	'architecture.wardens.body':
		'Wardens can review reports, merge duplicates, validate severity, and moderate visibility before or after authority dispatch.',
	'footer.brief': 'Working brief stored in docs/brief-summary.md',
} as const;

export default enGB;
