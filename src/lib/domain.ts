export const reportStatuses = [
	'draft',
	'submitted',
	'dispatched',
	'in_progress',
	'resolved',
] as const;

export type ReportStatus = (typeof reportStatuses)[number];

export const userRoles = ['resident', 'warden', 'moderator', 'admin'] as const;

export type UserRole = (typeof userRoles)[number];

export const roleCapabilities: Record<UserRole, string[]> = {
	resident: ['report:create', 'report:view:own'],
	warden: ['report:create', 'report:view:local', 'report:triage', 'report:merge_duplicates'],
	moderator: ['report:view:all', 'report:triage', 'report:moderate_visibility'],
	admin: ['report:view:all', 'report:manage_routing', 'report:manage_roles', 'system:configure'],
};

export type GeographyScope = {
	countryCode: string;
	regionCode?: string;
	authorityCode?: string;
};

export type ReportRecord = {
	reportId: string;
	userId: string;
	status: ReportStatus;
	category: string;
	description: string;
	severity: number;
	latitude: number;
	longitude: number;
	mediaUrls: string[];
	authorityId?: string;
	countryCode: string;
	locale: string;
	createdAt: string;
	updatedAt: string;
};
