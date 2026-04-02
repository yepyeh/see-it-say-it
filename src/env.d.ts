/// <reference types="astro/client" />

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
			};
		};
	}
}
