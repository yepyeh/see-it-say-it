export type StatusState = 'complete' | 'in_progress' | 'planned';

export type RoadmapItem = {
	title: string;
	description: string;
	state: StatusState;
};

export type RoadmapPhase = {
	id: string;
	name: string;
	timeframe: string;
	focus: string;
	items: RoadmapItem[];
};

export type ChangelogEntry = {
	version: string;
	date: string;
	status: string;
	added: string[];
	changed: string[];
	next?: string[];
};

export const investorLinks = {
	roadmapPath: '/inside/roadmap',
	changelogPath: '/inside/changelog',
};

export const roadmapPhases: RoadmapPhase[] = [
	{
		id: 'phase-1',
		name: 'Phase 1: Foundation',
		timeframe: 'Current build track',
		focus: 'Reliable reporting, authentication, offline resilience, and low-cost infrastructure.',
		items: [
			{
				title: 'Passwordless auth',
				description: 'OTP sign-in via Resend with session-gated resident and authority views.',
				state: 'complete',
			},
			{
				title: 'Offline queue',
				description: 'Service Worker-backed report replay, including queued media uploads.',
				state: 'complete',
			},
			{
				title: 'Media engine',
				description: 'R2-backed evidence upload and media rendering on report detail pages.',
				state: 'complete',
			},
			{
				title: 'Spatial routing',
				description: 'ONS LAD polygon matching is live in the Worker with a routing test endpoint.',
				state: 'complete',
			},
			{
				title: 'Map infrastructure',
				description: 'MapLibre uses a UK PMTiles archive from GEO_DATA, and geocoding now runs through internal Photon-backed API routes.',
				state: 'complete',
			},
		],
	},
	{
		id: 'phase-2',
		name: 'Phase 2: Intelligence & UX',
		timeframe: 'Next sprint block',
		focus: 'Refine the product journey and replace prototype UI with the intended premium system.',
		items: [
			{
				title: 'Adaptive shell',
				description: 'Bottom dock on mobile, split-pane navigation on desktop, flatter utility-first surfaces.',
				state: 'complete',
			},
			{
				title: 'Drawer-first reporting',
				description: 'Vaul-style mobile reporting flow with map context retained behind the sheet.',
				state: 'in_progress',
			},
			{
				title: 'Modern OTP UI',
				description: 'Replace the plain code form with an InputOTP-style interaction.',
				state: 'in_progress',
			},
			{
				title: 'Preferences engine',
				description: 'Persist light/dark/system and comfy/compact settings across device and account.',
				state: 'complete',
			},
		],
	},
	{
		id: 'phase-3',
		name: 'Phase 3: Journey & Accountability',
		timeframe: 'After UI foundation',
		focus: 'Tighten onboarding, authority operations, and end-to-end feedback loops.',
		items: [
			{
				title: 'Onboarding flow',
				description: 'Permission onboarding, privacy framing, and a stronger first-entry welcome state.',
				state: 'complete',
			},
			{
				title: 'Authority operations',
				description: 'Role-based actions, status updates, moderation flows, and resolution stories.',
				state: 'in_progress',
			},
			{
				title: 'Notification lifecycle',
				description: 'Status emails and push notification groundwork beyond OTP and submission receipts.',
				state: 'in_progress',
			},
			{
				title: 'Optimistic post-submit journey',
				description: 'Immediate success state and clean transition into the My Reports timeline.',
				state: 'complete',
			},
		],
	},
	{
		id: 'phase-4',
		name: 'Phase 4: Sustainability & Production',
		timeframe: 'Production hardening',
		focus: 'Funding, safety, and deployment discipline.',
		items: [
			{
				title: 'Stripe support flow',
				description: 'Supporter tiers, checkout, and supporter badge state.',
				state: 'in_progress',
			},
			{
				title: 'Safety controls',
				description: 'Turnstile and rate-limiting on submission and auth surfaces.',
				state: 'in_progress',
			},
			{
				title: 'CI/CD and production domain',
				description: 'GitHub Actions deployment flow and attachment of app.seeitsayit.app.',
				state: 'in_progress',
			},
			{
				title: 'Investor-ready reporting',
				description: 'Visible roadmap, changelog, and milestone reporting without exposing the pages in primary nav.',
				state: 'complete',
			},
		],
	},
];

export const changelogEntries: ChangelogEntry[] = [
	{
		version: '0.7.3',
		date: '2026-04-02',
		status: 'Live',
		added: [
			'Support tiers now open real Stripe Payment Links from the live app instead of returning a configuration error.',
		],
		changed: [
			'The support page now reflects that checkout is live, while still being explicit that supporter-state reconciliation will improve further with webhook automation.',
		],
		next: [
			'Add a Stripe webhook so successful payments can promote supporter state automatically instead of relying on manual status reconciliation.',
			'Continue the reporting UX work with contributor-help drawers for unverified and unknown jurisdictions.',
		],
	},
	{
		version: '0.7.2',
		date: '2026-04-02',
		status: 'Live',
		added: [
			'The routing resolver now returns a suggested council department and queue based on the chosen reporting taxonomy, not just the LAD match.',
			'The report flow now shows a department-routing hint in the map and category steps and persists that routing context into report events.',
		],
		changed: [
			'Routing is now category-aware, so the app can distinguish between a council match and the likely operational owner inside that council.',
			'Report review now summarizes both the routing state and the suggested department instead of only showing a generic council match label.',
		],
		next: [
			'Expand the authority directory so more councils move from boundary-only matches to verified department destinations.',
			'Use the new routing context to open contributor-help drawers for unverified and unknown jurisdictions.',
		],
	},
	{
		version: '0.7.1',
		date: '2026-04-02',
		status: 'Live',
		added: [
			'D1 migration 0004 is now applied remotely, so rate-limit storage, push subscription persistence, and resolution-story tables are active in production.',
		],
		changed: [
			'Roadmap and changelog now reflect the real post-migration state instead of listing the D1 activation as still pending.',
			'Notification and support messaging now point to the actual remaining setup blockers: web-push keys, Turnstile secrets, Stripe payment links, and production domain attachment.',
		],
		next: [
			'Set real Turnstile site and secret keys so the guarded auth path moves from scaffolded to enforced.',
			'Set Stripe payment links and attach the production app domain to close the remaining production hardening items.',
		],
	},
	{
		version: '0.7.0',
		date: '2026-04-02',
		status: 'Live',
		added: [
			'Home now includes a clearer first-action section instead of relying on buried next steps.',
			'My Reports now has an empty-state journey with reporting, notifications, and support entry points.',
			'Onboarding now ends with a stronger “ready to go” step and notification activation surface.',
		],
		changed: [
			'The journey surfaces now emphasize what the user should do next rather than leaving the backend features implicit.',
			'The roadmap now reflects onboarding and optimistic post-submit flow as completed product surfaces.',
		],
		next: [
			'Activate push delivery with a production key once the notification infrastructure is configured.',
			'Complete the remaining vendor-bound production setup for Turnstile, Stripe links, and web-push delivery keys.',
		],
	},
	{
		version: '0.6.0',
		date: '2026-04-02',
		status: 'Live',
		added: [
			'Photon geocoding is now routed through internal API endpoints instead of direct client calls.',
			'Rate limiting is wired into auth, report submission, media upload, confirmation, and authority mutation endpoints.',
			'Turnstile support is wired into the OTP auth flow and can be activated as soon as secrets are present.',
			'Support checkout intents are stored in D1 and can redirect into Stripe payment links when configured.',
			'Resolution stories now exist as first-class authority content on public report detail pages.',
			'GitHub Actions now includes a Cloudflare deployment workflow for build-and-deploy automation.',
			'Report submission now lands on a success state before sending users into the timeline.',
		],
		changed: [
			'The support page now starts real checkout intents instead of acting as a static placeholder.',
			'The public report detail page now has a dedicated resolution-story surface rather than status-only accountability.',
			'The roadmap and changelog are now aligned to the actual safety and deployment work shipped in this pass.',
		],
		next: [
			'Attach real Turnstile secrets and Stripe payment links to move these guarded paths from scaffolded to fully active.',
			'Configure real web-push delivery keys so stored subscriptions can be used for live notifications.',
		],
	},
	{
		version: '0.5.0',
		date: '2026-04-02',
		status: 'Live',
		added: [
			'Authority export endpoints for CSV and JSON queue exports.',
			'Authority-side status updates with resident email notifications.',
			'Report detail timeline showing submission and operational events.',
			'Support and transparency page grounded in live cost assumptions.',
		],
		changed: [
			'Authority dashboard now includes quick triage actions instead of read-only report cards.',
			'Report detail pages now expose an accountability trail rather than just static metadata.',
			'The support surface is now present even before final Stripe keys are connected.',
		],
		next: [
			'Connect Stripe Checkout and persist supporter badge state.',
			'Add Turnstile and rate limiting to submission and auth endpoints.',
		],
	},
	{
		version: '0.4.0',
		date: '2026-04-02',
		status: 'Live',
		added: [
			'Two-tap reporting taxonomy with Tier 1 groups and Tier 2 sub-category search.',
			'Drawer-style reporting sheet that keeps the map visible during category selection.',
			'Live routing-state surface inside the reporting drawer using the ONS resolver endpoint.',
			'Half/full sheet behavior and urgent category intercept styling for the reporting flow.',
		],
		changed: [
			'The old flat category radio step was replaced with a grouped taxonomy interaction.',
			'The reporting map now persists into category selection instead of disappearing between steps.',
			'Project references now include the reporting drawer refinement note and UX interaction checklist.',
		],
		next: [
			'Polish the sheet motion further toward Vaul-style rubber-banding and desktop dialog parity.',
			'Add routing-state-specific contributor drawers for unverified and unknown jurisdictions.',
		],
	},
	{
		version: '0.3.0',
		date: '2026-04-02',
		status: 'Live',
		added: [
			'OTP auth and session middleware backed by D1 and Resend.',
			'Protected My Reports and Authority views using account session scope.',
			'R2-backed media upload API and Worker-served media proxy.',
			'Map-enabled reporting step with Photon search and reverse geocoding.',
			'Hidden investor-facing roadmap and changelog pages.',
			'ONS LAD polygon routing endpoint and UK PMTiles archive served from R2.',
		],
		changed: [
			'Reporting now supports online evidence upload and offline media replay.',
			'Report detail pages now include attached evidence and stronger OpenGraph metadata.',
			'Project references now include the manager sprint roadmap plus component and user flow maps.',
			'Authority matching now uses live ONS boundary data instead of seeded geographic boxes.',
		],
		next: [
			'Increase the PMTiles zoom coverage beyond the current conservative UK archive.',
			'Add category-driven department routing on top of the council lookup path.',
		],
	},
	{
		version: '0.2.0',
		date: '2026-04-02',
		status: 'Completed',
		added: [
			'Live D1-backed reporting pipeline and public report pages.',
			'Offline-safe report queue through the service worker.',
			'Authority queue and My Reports prototype surfaces.',
			'Resend submission email integration and branded assets.',
		],
		changed: [
			'The app moved from scaffold to a real UK-first, global-ready reporting foundation.',
			'Cloudflare Worker became the canonical runtime target for the Astro server build.',
		],
	},
	{
		version: '0.1.0',
		date: '2026-04-02',
		status: 'Completed',
		added: [
			'Astro SSR setup on Cloudflare with D1 wiring.',
			'Initial locale layer, role model, and brief-driven project foundation.',
			'Brand assets, PWA manifest, and Cloudflare deployment baseline.',
		],
		changed: [],
	},
];

export const vitalSigns = [
	{ label: 'Stack', value: 'Astro, Cloudflare Workers, D1, R2, Resend, MapLibre' },
	{ label: 'Current market', value: 'UK-first, global-ready' },
	{ label: 'Live runtime', value: 'Cloudflare Worker deployment is active' },
	{ label: 'Routing data', value: 'ONS LAD 2024 boundaries live in GEO_DATA' },
	{ label: 'Latest shipped version', value: '0.7.3 on 2026-04-02' },
];
