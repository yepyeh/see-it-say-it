import { createUserNotification } from './communications';
import { getDB } from './db';

export type AccessRequestType = 'authority_access' | 'warden_application';
export type AccessRequestRole = 'warden' | 'moderator';
export type AccessRequestStatus = 'pending' | 'approved' | 'rejected';

export type AccessRequestSummary = {
	requestId: string;
	userId: string;
	requestType: AccessRequestType;
	requestedRole: AccessRequestRole;
	authorityId: string | null;
	authorityCode: string | null;
	authorityName: string | null;
	organization: string | null;
	teamName: string | null;
	workEmail: string | null;
	notes: string | null;
	status: AccessRequestStatus;
	reviewNotes: string | null;
	reviewedByUserId: string | null;
	reviewedByName: string | null;
	applicantEmail: string;
	applicantName: string | null;
	createdAt: string;
	updatedAt: string;
	reviewedAt: string | null;
};

export type ManagedAuthorityRoleSummary = {
	userRoleId: string;
	userId: string;
	displayName: string | null;
	email: string;
	role: 'warden' | 'moderator';
	authorityId: string | null;
	authorityCode: string | null;
	authorityName: string | null;
	assignedAt: string;
};

async function ensureAccessRequestTable(locals: App.Locals) {
	const db = getDB(locals);
	await db.batch([
		db.prepare(
			`CREATE TABLE IF NOT EXISTS access_requests (
				request_id TEXT PRIMARY KEY,
				user_id TEXT NOT NULL,
				request_type TEXT NOT NULL CHECK (request_type IN ('authority_access', 'warden_application')),
				requested_role TEXT NOT NULL CHECK (requested_role IN ('warden', 'moderator')),
				authority_id TEXT,
				authority_code TEXT,
				organization TEXT,
				team_name TEXT,
				work_email TEXT,
				notes TEXT,
				status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
				review_notes TEXT,
				reviewed_by_user_id TEXT,
				reviewed_at TEXT,
				created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
				updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY (user_id) REFERENCES users (user_id),
				FOREIGN KEY (authority_id) REFERENCES authorities (authority_id),
				FOREIGN KEY (reviewed_by_user_id) REFERENCES users (user_id)
			)`,
		),
		db.prepare(
			`CREATE INDEX IF NOT EXISTS idx_access_requests_status
				ON access_requests (status, created_at DESC)`,
		),
		db.prepare(
			`CREATE INDEX IF NOT EXISTS idx_access_requests_user
				ON access_requests (user_id, created_at DESC)`,
		),
	]);
}

export async function listAccessRequests(
	locals: App.Locals,
	options: {
		userId?: string;
		status?: AccessRequestStatus | 'all';
		limit?: number;
	} = {},
) {
	await ensureAccessRequestTable(locals);
	const db = getDB(locals);
	const clauses: string[] = [];
	const bindings: (string | number)[] = [];

	if (options.userId) {
		clauses.push('ar.user_id = ?');
		bindings.push(options.userId);
	}

	if (options.status && options.status !== 'all') {
		clauses.push('ar.status = ?');
		bindings.push(options.status);
	}

	const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
	const limit = options.limit ?? 20;
	bindings.push(limit);

	const rows = await db
		.prepare(
			`SELECT
				ar.request_id AS requestId,
				ar.user_id AS userId,
				ar.request_type AS requestType,
				ar.requested_role AS requestedRole,
				ar.authority_id AS authorityId,
				ar.authority_code AS authorityCode,
				a.name AS authorityName,
				ar.organization AS organization,
				ar.team_name AS teamName,
				ar.work_email AS workEmail,
				ar.notes AS notes,
				ar.status AS status,
				ar.review_notes AS reviewNotes,
				ar.reviewed_by_user_id AS reviewedByUserId,
				reviewer.display_name AS reviewedByName,
				applicant.email AS applicantEmail,
				applicant.display_name AS applicantName,
				ar.created_at AS createdAt,
				ar.updated_at AS updatedAt,
				ar.reviewed_at AS reviewedAt
			FROM access_requests ar
			INNER JOIN users applicant ON applicant.user_id = ar.user_id
			LEFT JOIN authorities a ON a.authority_id = ar.authority_id
			LEFT JOIN users reviewer ON reviewer.user_id = ar.reviewed_by_user_id
			${whereClause}
			ORDER BY
				CASE ar.status
					WHEN 'pending' THEN 0
					WHEN 'approved' THEN 1
					ELSE 2
				END,
				ar.created_at DESC
			LIMIT ?`,
		)
		.bind(...bindings)
		.all<AccessRequestSummary>();

	return rows.results;
}

export async function createAccessRequest(
	locals: App.Locals,
	input: {
		userId: string;
		requestType: AccessRequestType;
		requestedRole: AccessRequestRole;
		authorityCode?: string | null;
		organization?: string | null;
		teamName?: string | null;
		workEmail?: string | null;
		notes?: string | null;
	},
) {
	await ensureAccessRequestTable(locals);
	const db = getDB(locals);
	const authority =
		input.authorityCode?.trim()
			? await db
					.prepare(
						`SELECT authority_id AS authorityId, code AS authorityCode, name AS authorityName
						FROM authorities
						WHERE code = ?
						LIMIT 1`,
					)
					.bind(input.authorityCode.trim())
					.first<{ authorityId: string; authorityCode: string; authorityName: string }>()
			: null;

	if (input.requestType === 'warden_application' && !authority?.authorityId) {
		throw new Error('Please choose a known authority before applying to be a warden.');
	}

	if (input.requestType === 'authority_access' && input.requestedRole === 'moderator' && !authority?.authorityId) {
		throw new Error('Authority access requests need a known authority selection.');
	}

	const existing = await db
		.prepare(
			`SELECT request_id AS requestId
			FROM access_requests
			WHERE user_id = ?
			  AND request_type = ?
			  AND COALESCE(authority_code, '') = COALESCE(?, '')
			  AND requested_role = ?
			  AND status = 'pending'
			LIMIT 1`,
		)
		.bind(
			input.userId,
			input.requestType,
			authority?.authorityCode ?? input.authorityCode?.trim() ?? null,
			input.requestedRole,
		)
		.first<{ requestId: string }>();

	const requestId = existing?.requestId ?? crypto.randomUUID();
	await db
		.prepare(
			`INSERT INTO access_requests (
				request_id,
				user_id,
				request_type,
				requested_role,
				authority_id,
				authority_code,
				organization,
				team_name,
				work_email,
				notes,
				status,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
			ON CONFLICT(request_id) DO UPDATE SET
				request_type = excluded.request_type,
				requested_role = excluded.requested_role,
				authority_id = excluded.authority_id,
				authority_code = excluded.authority_code,
				organization = excluded.organization,
				team_name = excluded.team_name,
				work_email = excluded.work_email,
				notes = excluded.notes,
				status = 'pending',
				review_notes = NULL,
				reviewed_by_user_id = NULL,
				reviewed_at = NULL,
				updated_at = CURRENT_TIMESTAMP`,
		)
		.bind(
			requestId,
			input.userId,
			input.requestType,
			input.requestedRole,
			authority?.authorityId ?? null,
			authority?.authorityCode ?? input.authorityCode?.trim() ?? null,
			input.organization?.trim() || null,
			input.teamName?.trim() || null,
			input.workEmail?.trim() || null,
			input.notes?.trim() || null,
		)
		.run();

	const admins = await db
		.prepare(
			`SELECT DISTINCT user_id AS userId
			FROM user_roles
			WHERE role IN ('admin', 'moderator')`,
		)
		.all<{ userId: string }>();

	for (const admin of admins.results) {
		await createUserNotification(locals, {
			userId: admin.userId,
			type: 'authority_action',
			title:
				input.requestType === 'warden_application'
					? 'New warden application'
					: 'New authority access request',
			body: authority?.authorityName
				? `${input.requestedRole} request submitted for ${authority.authorityName}.`
				: `${input.requestedRole} request submitted and waiting for review.`,
			ctaPath: '/authority/access-requests',
			metadata: {
				requestId,
				requestType: input.requestType,
				requestedRole: input.requestedRole,
				authorityCode: authority?.authorityCode ?? input.authorityCode?.trim() ?? null,
			},
		});
	}

	return requestId;
}

export async function reviewAccessRequest(
	locals: App.Locals,
	input: {
		requestId: string;
		reviewerUserId: string;
		status: 'approved' | 'rejected';
		reviewNotes?: string | null;
	},
) {
	await ensureAccessRequestTable(locals);
	const db = getDB(locals);
	const request = await db
		.prepare(
			`SELECT
				request_id AS requestId,
				user_id AS userId,
				request_type AS requestType,
				requested_role AS requestedRole,
				authority_id AS authorityId,
				authority_code AS authorityCode,
				status AS status
			FROM access_requests
			WHERE request_id = ?
			LIMIT 1`,
		)
		.bind(input.requestId)
		.first<{
			requestId: string;
			userId: string;
			requestType: AccessRequestType;
			requestedRole: AccessRequestRole;
			authorityId: string | null;
			authorityCode: string | null;
			status: AccessRequestStatus;
		}>();

	if (!request?.requestId) {
		throw new Error('Access request not found.');
	}

	if (request.status !== 'pending') {
		throw new Error('This request has already been reviewed.');
	}

	if (input.status === 'approved') {
		const existingRole = await db
			.prepare(
				`SELECT user_role_id AS userRoleId
				FROM user_roles
				WHERE user_id = ?
				  AND role = ?
				  AND COALESCE(authority_id, '') = COALESCE(?, '')
				LIMIT 1`,
			)
			.bind(request.userId, request.requestedRole, request.authorityId)
			.first<{ userRoleId: string }>();

		if (!existingRole?.userRoleId) {
			await db
				.prepare(
					`INSERT INTO user_roles (
						user_role_id,
						user_id,
						role,
						country_code,
						authority_id,
						assigned_at
					) VALUES (?, ?, ?, 'GB', ?, CURRENT_TIMESTAMP)`,
				)
				.bind(crypto.randomUUID(), request.userId, request.requestedRole, request.authorityId)
				.run();
		}
	}

	await db
		.prepare(
			`UPDATE access_requests
			SET status = ?,
				review_notes = ?,
				reviewed_by_user_id = ?,
				reviewed_at = CURRENT_TIMESTAMP,
				updated_at = CURRENT_TIMESTAMP
			WHERE request_id = ?`,
		)
		.bind(
			input.status,
			input.reviewNotes?.trim() || null,
			input.reviewerUserId,
			input.requestId,
		)
		.run();

	await createUserNotification(locals, {
		userId: request.userId,
		type: 'authority_action',
		title:
			input.status === 'approved'
				? 'Access request approved'
				: 'Access request reviewed',
		body:
			input.status === 'approved'
				? `Your ${request.requestedRole} access request has been approved.`
				: `Your ${request.requestedRole} access request was not approved at this time.`,
		ctaPath: '/notifications',
		metadata: {
			requestId: request.requestId,
			status: input.status,
			requestedRole: request.requestedRole,
			authorityCode: request.authorityCode,
		},
	});
}

export async function listManagedAuthorityRoles(
	locals: App.Locals,
	options: { limit?: number } = {},
) {
	const db = getDB(locals);
	const rows = await db
		.prepare(
			`SELECT
				ur.user_role_id AS userRoleId,
				ur.user_id AS userId,
				u.display_name AS displayName,
				u.email AS email,
				ur.role AS role,
				ur.authority_id AS authorityId,
				a.code AS authorityCode,
				a.name AS authorityName,
				ur.assigned_at AS assignedAt
			FROM user_roles ur
			INNER JOIN users u ON u.user_id = ur.user_id
			LEFT JOIN authorities a ON a.authority_id = ur.authority_id
			WHERE ur.role IN ('warden', 'moderator')
			ORDER BY
				CASE ur.role
					WHEN 'moderator' THEN 0
					ELSE 1
				END,
				COALESCE(a.name, ''),
				COALESCE(u.display_name, u.email)
			LIMIT ?`,
		)
		.bind(options.limit ?? 100)
		.all<ManagedAuthorityRoleSummary>();

	return rows.results;
}

export async function updateManagedAuthorityRole(
	locals: App.Locals,
	input: {
		userRoleId: string;
		reviewerUserId: string;
		action: 'update' | 'revoke';
		role?: AccessRequestRole | null;
		authorityCode?: string | null;
		notes?: string | null;
	},
) {
	const db = getDB(locals);
	const managedRole = await db
		.prepare(
			`SELECT
				ur.user_role_id AS userRoleId,
				ur.user_id AS userId,
				ur.role AS role,
				ur.authority_id AS authorityId,
				a.code AS authorityCode,
				a.name AS authorityName,
				u.display_name AS displayName,
				u.email AS email
			FROM user_roles ur
			INNER JOIN users u ON u.user_id = ur.user_id
			LEFT JOIN authorities a ON a.authority_id = ur.authority_id
			WHERE ur.user_role_id = ?
			  AND ur.role IN ('warden', 'moderator')
			LIMIT 1`,
		)
		.bind(input.userRoleId)
		.first<{
			userRoleId: string;
			userId: string;
			role: AccessRequestRole;
			authorityId: string | null;
			authorityCode: string | null;
			authorityName: string | null;
			displayName: string | null;
			email: string;
		}>();

	if (!managedRole?.userRoleId) {
		throw new Error('Managed role not found.');
	}

	if (input.action === 'revoke') {
		await db
			.prepare('DELETE FROM user_roles WHERE user_role_id = ?')
			.bind(input.userRoleId)
			.run();

		await createUserNotification(locals, {
			userId: managedRole.userId,
			type: 'authority_action',
			title: 'Authority access removed',
			body: input.notes?.trim()
				? input.notes.trim()
				: `Your ${managedRole.role} access for ${managedRole.authorityName ?? managedRole.authorityCode ?? 'the authority workspace'} has been removed.`,
			ctaPath: '/notifications',
			metadata: {
				userRoleId: managedRole.userRoleId,
				action: 'revoke',
				role: managedRole.role,
				authorityCode: managedRole.authorityCode,
				reviewerUserId: input.reviewerUserId,
			},
		});

		return { action: 'revoke' as const };
	}

	if (!input.role || !['warden', 'moderator'].includes(input.role)) {
		throw new Error('Choose a valid role to save.');
	}

	const authorityCode = input.authorityCode?.trim() ?? managedRole.authorityCode ?? '';
	if (!authorityCode) {
		throw new Error('Choose a valid authority scope.');
	}

	const authority = await db
		.prepare(
			`SELECT authority_id AS authorityId, code AS authorityCode, name AS authorityName
			FROM authorities
			WHERE code = ?
			LIMIT 1`,
		)
		.bind(authorityCode)
		.first<{ authorityId: string; authorityCode: string; authorityName: string }>();

	if (!authority?.authorityId) {
		throw new Error('Choose a known authority before saving access changes.');
	}

	await db
		.prepare(
			`UPDATE user_roles
			SET role = ?,
				country_code = 'GB',
				region_id = NULL,
				authority_id = ?
			WHERE user_role_id = ?`,
		)
		.bind(input.role, authority.authorityId, input.userRoleId)
		.run();

	await createUserNotification(locals, {
		userId: managedRole.userId,
		type: 'authority_action',
		title: 'Authority access updated',
		body: input.notes?.trim()
			? input.notes.trim()
			: `Your authority access is now ${input.role} for ${authority.authorityName}.`,
		ctaPath: '/notifications',
		metadata: {
			userRoleId: managedRole.userRoleId,
			action: 'update',
			role: input.role,
			authorityCode: authority.authorityCode,
			reviewerUserId: input.reviewerUserId,
		},
	});

	return {
		action: 'update' as const,
		role: input.role,
		authorityCode: authority.authorityCode,
	};
}
