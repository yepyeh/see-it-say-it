/// <reference types="astro/client" />

interface Window {
	pmtiles?: {
		Protocol: new () => {
			tile: unknown;
		};
	};
	basemaps?: {
		layers: (source: string, flavor: unknown, options?: { lang?: string }) => unknown[];
		namedFlavor: (name: string) => unknown;
	};
}

declare namespace App {
	interface Locals {
		currentUser: {
			userId: string;
			email: string;
			displayName: string | null;
			roles: {
				role: 'resident' | 'warden' | 'moderator' | 'admin';
				authorityId: string | null;
				authorityCode: string | null;
				authorityName: string | null;
			}[];
		} | null;
		cfContext?: {
			env: {
				DB: D1Database;
				REPORT_MEDIA: R2Bucket;
				GEO_DATA: R2Bucket;
				APP_BASE_URL?: string;
				RESEND_API_KEY?: string;
				RESEND_FROM_EMAIL?: string;
				TURNSTILE_SITE_KEY?: string;
				TURNSTILE_SECRET_KEY?: string;
				STRIPE_SUPPORT_LINK_LIGHTS?: string;
				STRIPE_SUPPORT_LINK_ROUTING?: string;
				STRIPE_SUPPORT_LINK_PATRON?: string;
				STRIPE_WEBHOOK_SECRET?: string;
				VAPID_PUBLIC_KEY?: string;
			};
		};
	}
}
