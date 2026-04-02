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
				description: 'MapLibre now points at a UK PMTiles archive served from GEO_DATA via the Worker.',
				state: 'in_progress',
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
				state: 'planned',
			},
			{
				title: 'Authority operations',
				description: 'Role-based actions, status updates, moderation flows, and resolution stories.',
				state: 'planned',
			},
			{
				title: 'Notification lifecycle',
				description: 'Status emails and push notification groundwork beyond OTP and submission receipts.',
				state: 'planned',
			},
			{
				title: 'Optimistic post-submit journey',
				description: 'Immediate success state and clean transition into the My Reports timeline.',
				state: 'planned',
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
				state: 'planned',
			},
			{
				title: 'Safety controls',
				description: 'Turnstile and rate-limiting on submission and auth surfaces.',
				state: 'planned',
			},
			{
				title: 'CI/CD and production domain',
				description: 'GitHub Actions deployment flow and attachment of app.seeitsayit.app.',
				state: 'planned',
			},
			{
				title: 'Investor-ready reporting',
				description: 'Visible roadmap, changelog, and milestone reporting without exposing the pages in primary nav.',
				state: 'in_progress',
			},
		],
	},
];

export const changelogEntries: ChangelogEntry[] = [
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
	{ label: 'Latest shipped version', value: '0.4.0 on 2026-04-02' },
];
