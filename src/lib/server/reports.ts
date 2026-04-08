import { getDB } from './db';
import { getOrCreateUser } from './auth';
import {
	sendResolutionPublishedEmail,
	sendStatusUpdateEmail,
	sendSubmissionEmail,
} from './email';
import {
	createUserNotification,
	getNotificationPreferences,
} from './communications';
import { getAuthorityParticipationByAuthorityCode } from './authority-participation';
import { resolveIssueRouting } from './routing';
import { reportStatuses, type ReportStatus } from '../domain';

type ReportInput = {
	email?: string;
	name?: string;
	groupId?: string;
	categoryId?: string;
	category: string;
	description: string;
	notesMarkdown: string;
	severity: number;
	latitude: number;
	longitude: number;
	locationLabel: string;
	sourceChannel?: string;
	media?: {
		storageKey: string;
		url: string;
		mimeType: string;
	}[];
};

export type ReportSummary = {
	reportId: string;
	userId: string | null;
	category: string;
	description: string;
	notesMarkdown: string;
	severity: number;
	status: string;
	latitude: number;
	longitude: number;
	locationLabel: string | null;
	authorityId: string | null;
	authorityCode: string | null;
	authorityName: string | null;
	countryCode: string;
	createdAt: string;
	updatedAt: string;
	ownerLabel: string | null;
	priority: 'low' | 'normal' | 'high' | 'urgent';
	dueAt: string | null;
	queueNote: string | null;
	duplicateCount: number;
	confirmationCount: number;
	reporterEmail: string | null;
	reporterName: string | null;
	participationStateAtSubmission: 'claimed' | 'unclaimed' | 'unknown' | null;
	isHistoricBacklog: boolean;
	isAdopted: boolean;
	adoptedAt: string | null;
	adoptedByName: string | null;
	adoptionNote: string | null;
};

export type ReportMediaSummary = {
	reportMediaId: string;
	storageKey: string;
	url: string;
	mimeType: string | null;
};

export type ReportDetail = ReportSummary & {
	media: ReportMediaSummary[];
};

export type ReportEventSummary = {
	reportEventId: string;
	eventType: string;
	createdAt: string;
	actorName: string | null;
	actorEmail: string | null;
	payload: Record<string, unknown>;
};

export type ResolutionStorySummary = {
	resolutionStoryId: string;
	summary: string;
	notes: string | null;
	status: string;
	createdAt: string;
	actorName: string | null;
	actorEmail: string | null;
	media: ReportMediaSummary[];
};

const allowedStatusSet = new Set(reportStatuses);

export async function ensureReportAdoptionsTable(locals: App.Locals) {
	await getDB(locals)
		.prepare(
			`CREATE TABLE IF NOT EXISTS report_adoptions (
				report_adoption_id TEXT PRIMARY KEY,
				report_id TEXT NOT NULL UNIQUE,
				authority_id TEXT NOT NULL,
				adopted_by_user_id TEXT NOT NULL,
				adoption_note TEXT,
				adopted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
				created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
				FOREIGN KEY (report_id) REFERENCES reports (report_id),
				FOREIGN KEY (authority_id) REFERENCES authorities (authority_id),
				FOREIGN KEY (adopted_by_user_id) REFERENCES users (user_id)
			)`,
		)
		.run();
}

function asRadians(value: number) {
	return (value * Math.PI) / 180;
}

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
	const earthRadius = 6371000;
	const deltaLat = asRadians(bLat - aLat);
	const deltaLng = asRadians(bLng - aLng);
	const first =
		Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
		Math.cos(asRadians(aLat)) *
			Math.cos(asRadians(bLat)) *
			Math.sin(deltaLng / 2) *
			Math.sin(deltaLng / 2);
	const second = 2 * Math.atan2(Math.sqrt(first), Math.sqrt(1 - first));
	return earthRadius * second;
}

export async function createReport(locals: App.Locals, input: ReportInput) {
	const db = getDB(locals);
	const userId = input.email ? await getOrCreateUser(db, input.email, input.name) : null;
	const route = await resolveIssueRouting(locals, {
		latitude: input.latitude,
		longitude: input.longitude,
		groupId: input.groupId,
		categoryId: input.categoryId,
	});
	const authority = route.authority;
	const participation = await getAuthorityParticipationByAuthorityCode(locals, authority?.code ?? null);
	const sourceChannel = input.sourceChannel ?? 'web';
	const duplicateCandidates = await db
		.prepare(
			`SELECT report_id, latitude, longitude, category, location_label
			 FROM reports
			 WHERE status IN ('submitted', 'dispatched', 'in_progress')
			   AND latitude BETWEEN ? AND ?
			   AND longitude BETWEEN ? AND ?
			 ORDER BY created_at DESC
			 LIMIT 20`,
		)
		.bind(
			input.latitude - 0.002,
			input.latitude + 0.002,
			input.longitude - 0.002,
			input.longitude + 0.002,
		)
		.all<{
			report_id: string;
			latitude: number;
			longitude: number;
			category: string;
			location_label: string | null;
		}>();

	const duplicateMatch =
		duplicateCandidates.results.find(
			(candidate) =>
				haversineMeters(
					input.latitude,
					input.longitude,
					candidate.latitude,
					candidate.longitude,
				) <= 50,
		) ?? null;

	const reportId = crypto.randomUUID();
	await db
		.prepare(
			`INSERT INTO reports (
				report_id,
				user_id,
				locale,
				country_code,
				authority_id,
				category,
				description,
				notes_markdown,
				severity,
				status,
				latitude,
				longitude,
				location_label,
				submitted_at,
				source_channel,
				duplicate_of_report_id
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)`,
		)
		.bind(
			reportId,
			userId,
			'en-GB',
			'GB',
			authority?.authorityId ?? null,
			input.category,
			input.description,
			input.notesMarkdown,
			input.severity,
			'submitted',
			input.latitude,
			input.longitude,
			input.locationLabel || null,
			sourceChannel,
			duplicateMatch?.report_id ?? null,
			)
			.run();

	for (const media of input.media ?? []) {
		await db
			.prepare(
				`INSERT INTO report_media (
					report_media_id,
					report_id,
					storage_provider,
					storage_key,
					public_url,
					mime_type
				) VALUES (?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				crypto.randomUUID(),
				reportId,
				'r2',
				media.storageKey,
				media.url,
				media.mimeType,
			)
			.run();
	}

	await db
		.prepare(
			'INSERT INTO report_events (report_event_id, report_id, actor_user_id, event_type, event_payload_json) VALUES (?, ?, ?, ?, ?)',
		)
		.bind(
			crypto.randomUUID(),
			reportId,
			userId,
			'report_submitted',
			JSON.stringify({
				sourceChannel,
				duplicateCandidateId: duplicateMatch?.report_id ?? null,
				authorityId: authority?.authorityId ?? null,
				groupId: input.groupId ?? null,
				categoryId: input.categoryId ?? null,
				routingState: route.state,
				departmentRoute: route.departmentRoute,
				destinationType: route.destinationType,
				destinationTarget: route.destinationTarget,
				participationState: participation.state,
			}),
		)
		.run();

	if (authority) {
		const destination =
			route.destinationTarget ??
			(
				await db
					.prepare('SELECT contact_email AS contactEmail FROM authorities WHERE authority_id = ? LIMIT 1')
					.bind(authority.authorityId)
					.first<{ contactEmail: string | null }>()
			)?.contactEmail ??
			`${authority.code}@placeholder.local`;
		const channel = route.destinationType ?? 'email';

		await db
			.prepare(
				`INSERT INTO authority_dispatches (
					dispatch_id,
					report_id,
					authority_id,
					destination,
					channel,
					status
				) VALUES (?, ?, ?, ?, ?, ?)`,
			)
				.bind(
					crypto.randomUUID(),
					reportId,
					authority.authorityId,
					destination,
					channel,
					'queued',
			)
			.run();

		const queueUsers = await db
			.prepare(
				`SELECT DISTINCT ur.user_id AS userId
				FROM user_roles ur
				WHERE ur.authority_id = ?
				   OR ur.role IN ('moderator', 'admin')`,
			)
			.bind(authority.authorityId)
			.all<{ userId: string }>();

		for (const queueUser of queueUsers.results) {
			await createUserNotification(locals, {
				userId: queueUser.userId,
				type: 'authority_action',
				title: 'New report routed into queue',
				body: `${input.category} has been routed to ${authority.name}.`,
				ctaPath: `/authority?authority=${authority.code}`,
				metadata: {
					reportId,
					authorityId: authority.authorityId,
					authorityCode: authority.code,
					category: input.category,
				},
			});
		}

		await db
			.prepare(
				'INSERT INTO report_events (report_event_id, report_id, actor_user_id, event_type, event_payload_json) VALUES (?, ?, ?, ?, ?)',
			)
			.bind(
				crypto.randomUUID(),
				reportId,
				userId,
				'authority_route_resolved',
				JSON.stringify({
					routingState: route.state,
					authorityName: authority.name,
					destinationType: channel,
					destinationTarget: destination,
					departmentRoute: route.departmentRoute,
					participationState: participation.state,
					participationLabel: participation.label,
					isMonitored: participation.isMonitored,
				}),
			)
			.run();
	}

	if (input.email) {
		if (userId) {
			await createUserNotification(locals, {
				userId,
				type: 'report_submitted',
				title: 'Report submitted',
				body: participation.isMonitored
					? `${input.category} was added to your timeline and routed ${authority?.name ? `toward ${authority.name}` : 'into the queue'}.`
					: `${input.category} was added to your timeline and mapped publicly${authority?.name ? ` in ${authority.name}` : ''}.`,
				ctaPath: `/reports/${reportId}`,
				metadata: {
					reportId,
					category: input.category,
					routingState: route.state,
					participationState: participation.state,
				},
			});
		}

		const preferences = userId
			? await getNotificationPreferences(locals, userId)
			: { emailEnabled: true, inAppEnabled: true, pushEnabled: false, digestMode: 'immediate' as const };
		const emailResult =
			preferences.emailEnabled && preferences.digestMode === 'immediate'
				? await sendSubmissionEmail({
						reportId,
						email: input.email,
						name: input.name,
						category: input.category,
						description: input.description,
						locationLabel: input.locationLabel || 'Location provided in report',
						authorityName: authority?.name ?? null,
					}).catch((error) => ({ sent: false, error, template: 'report_submitted' }))
				: { sent: false, skipped: true, reason: 'preference_disabled_or_digest' };

		await db
			.prepare(
				'INSERT INTO report_events (report_event_id, report_id, actor_user_id, event_type, event_payload_json) VALUES (?, ?, ?, ?, ?)',
			)
			.bind(
				crypto.randomUUID(),
				reportId,
				userId,
				preferences.emailEnabled && preferences.digestMode === 'immediate'
					? emailResult.sent
						? 'submission_email_sent'
						: 'submission_email_failed'
					: 'submission_email_skipped',
				JSON.stringify(
					preferences.emailEnabled && preferences.digestMode === 'immediate'
						? emailResult
						: { skipped: true, reason: 'preference_disabled_or_digest' },
				),
			)
			.run();
	}

	return {
		reportId,
		duplicateMatch,
		authority,
		participation,
	};
}

export async function listReports(
	locals: App.Locals,
	options: {
		limit?: number;
		email?: string | null;
		userId?: string | null;
		authorityCode?: string | null;
		authorityCodes?: string[];
	} = {},
) {
	const db = getDB(locals);
	await ensureReportAdoptionsTable(locals);
	const clauses: string[] = [];
	const bindings: (string | number)[] = [];

	if (options.userId) {
		clauses.push('r.user_id = ?');
		bindings.push(options.userId);
	}

	if (options.email) {
		clauses.push('u.email = ?');
		bindings.push(options.email.trim().toLowerCase());
	}

	if (options.authorityCode) {
		clauses.push('a.code = ?');
		bindings.push(options.authorityCode);
	}

	if (options.authorityCodes?.length) {
		clauses.push(`a.code IN (${options.authorityCodes.map(() => '?').join(', ')})`);
		bindings.push(...options.authorityCodes);
	}

	const limit = Math.min(Math.max(options.limit ?? 24, 1), 50);
	bindings.push(limit);

	const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
	const query = `SELECT
		r.report_id AS reportId,
		r.user_id AS userId,
		r.category AS category,
		r.description AS description,
		r.notes_markdown AS notesMarkdown,
		r.severity AS severity,
		r.status AS status,
		r.latitude AS latitude,
		r.longitude AS longitude,
		r.location_label AS locationLabel,
		r.authority_id AS authorityId,
		a.code AS authorityCode,
		a.name AS authorityName,
		r.country_code AS countryCode,
		r.created_at AS createdAt,
		r.updated_at AS updatedAt,
		rt.owner_label AS ownerLabel,
		COALESCE(rt.priority, 'normal') AS priority,
		rt.due_at AS dueAt,
		rt.queue_note AS queueNote,
		(SELECT json_extract(re.event_payload_json, '$.participationState')
			FROM report_events re
			WHERE re.report_id = r.report_id
			  AND re.event_type = 'report_submitted'
			ORDER BY re.created_at ASC
			LIMIT 1) AS participationStateAtSubmission,
		CASE WHEN ra.report_id IS NOT NULL THEN 1 ELSE 0 END AS isAdopted,
		ra.adopted_at AS adoptedAt,
		ra.adoption_note AS adoptionNote,
		au.display_name AS adoptedByName,
		u.email AS reporterEmail,
		u.display_name AS reporterName,
		COALESCE((SELECT COUNT(*) FROM reports child WHERE child.duplicate_of_report_id = r.report_id), 0) AS duplicateCount,
		COALESCE((SELECT COUNT(*) FROM report_confirmations rc WHERE rc.report_id = r.report_id), 0) AS confirmationCount
	FROM reports r
	LEFT JOIN users u ON u.user_id = r.user_id
	LEFT JOIN authorities a ON a.authority_id = r.authority_id
	LEFT JOIN report_triage rt ON rt.report_id = r.report_id
	LEFT JOIN report_adoptions ra ON ra.report_id = r.report_id
	LEFT JOIN users au ON au.user_id = ra.adopted_by_user_id
	${whereClause}
	ORDER BY r.created_at DESC
	LIMIT ?`;

	try {
		const result = await db.prepare(query).bind(...bindings).all<ReportSummary>();
		return result.results.map((report) => ({
			...report,
			isHistoricBacklog:
				(report.participationStateAtSubmission ?? 'unknown') !== 'claimed' && !Boolean(report.isAdopted),
			isAdopted: Boolean(report.isAdopted),
		}));
	} catch (error) {
		if (
			!(error instanceof Error) ||
			(!error.message.includes('report_triage') && !error.message.includes('report_adoptions'))
		) {
			throw error;
		}

		const fallbackQuery = `SELECT
			r.report_id AS reportId,
			r.user_id AS userId,
			r.category AS category,
			r.description AS description,
			r.notes_markdown AS notesMarkdown,
			r.severity AS severity,
			r.status AS status,
			r.latitude AS latitude,
			r.longitude AS longitude,
			r.location_label AS locationLabel,
			r.authority_id AS authorityId,
			a.code AS authorityCode,
			a.name AS authorityName,
			r.country_code AS countryCode,
			r.created_at AS createdAt,
			r.updated_at AS updatedAt,
			NULL AS ownerLabel,
			'normal' AS priority,
			NULL AS dueAt,
			NULL AS queueNote,
			(SELECT json_extract(re.event_payload_json, '$.participationState')
				FROM report_events re
				WHERE re.report_id = r.report_id
				  AND re.event_type = 'report_submitted'
				ORDER BY re.created_at ASC
				LIMIT 1) AS participationStateAtSubmission,
			0 AS isAdopted,
			NULL AS adoptedAt,
			NULL AS adoptionNote,
			NULL AS adoptedByName,
			u.email AS reporterEmail,
			u.display_name AS reporterName,
			COALESCE((SELECT COUNT(*) FROM reports child WHERE child.duplicate_of_report_id = r.report_id), 0) AS duplicateCount,
			COALESCE((SELECT COUNT(*) FROM report_confirmations rc WHERE rc.report_id = r.report_id), 0) AS confirmationCount
		FROM reports r
		LEFT JOIN users u ON u.user_id = r.user_id
		LEFT JOIN authorities a ON a.authority_id = r.authority_id
		${whereClause}
		ORDER BY r.created_at DESC
		LIMIT ?`;

		const fallback = await db.prepare(fallbackQuery).bind(...bindings).all<ReportSummary>();
		return fallback.results.map((report) => ({
			...report,
			isHistoricBacklog:
				(report.participationStateAtSubmission ?? 'unknown') !== 'claimed' && !Boolean(report.isAdopted),
			isAdopted: Boolean(report.isAdopted),
		}));
	}
}

export async function getReportById(locals: App.Locals, reportId: string) {
	await ensureReportAdoptionsTable(locals);
	let report = await getDB(locals)
		.prepare(
			`SELECT
				r.report_id AS reportId,
				r.user_id AS userId,
				r.category AS category,
				r.description AS description,
				r.notes_markdown AS notesMarkdown,
				r.severity AS severity,
				r.status AS status,
				r.latitude AS latitude,
				r.longitude AS longitude,
				r.location_label AS locationLabel,
				r.authority_id AS authorityId,
				a.code AS authorityCode,
				a.name AS authorityName,
				r.country_code AS countryCode,
				r.created_at AS createdAt,
				r.updated_at AS updatedAt,
				rt.owner_label AS ownerLabel,
				COALESCE(rt.priority, 'normal') AS priority,
				rt.due_at AS dueAt,
				rt.queue_note AS queueNote,
				(SELECT json_extract(re.event_payload_json, '$.participationState')
					FROM report_events re
					WHERE re.report_id = r.report_id
					  AND re.event_type = 'report_submitted'
					ORDER BY re.created_at ASC
					LIMIT 1) AS participationStateAtSubmission,
				CASE WHEN ra.report_id IS NOT NULL THEN 1 ELSE 0 END AS isAdopted,
				ra.adopted_at AS adoptedAt,
				ra.adoption_note AS adoptionNote,
				au.display_name AS adoptedByName,
				u.email AS reporterEmail,
				u.display_name AS reporterName,
				COALESCE((SELECT COUNT(*) FROM reports child WHERE child.duplicate_of_report_id = r.report_id), 0) AS duplicateCount,
				COALESCE((SELECT COUNT(*) FROM report_confirmations rc WHERE rc.report_id = r.report_id), 0) AS confirmationCount
			FROM reports r
			LEFT JOIN users u ON u.user_id = r.user_id
			LEFT JOIN authorities a ON a.authority_id = r.authority_id
			LEFT JOIN report_triage rt ON rt.report_id = r.report_id
			LEFT JOIN report_adoptions ra ON ra.report_id = r.report_id
			LEFT JOIN users au ON au.user_id = ra.adopted_by_user_id
			WHERE r.report_id = ?
			LIMIT 1`,
			)
			.bind(reportId)
			.first<ReportSummary>()
		.catch(async (error) => {
			if (
				!(error instanceof Error) ||
				(!error.message.includes('report_triage') && !error.message.includes('report_adoptions'))
			) {
				throw error;
			}

			return await getDB(locals)
				.prepare(
					`SELECT
						r.report_id AS reportId,
						r.user_id AS userId,
						r.category AS category,
						r.description AS description,
						r.notes_markdown AS notesMarkdown,
						r.severity AS severity,
						r.status AS status,
						r.latitude AS latitude,
						r.longitude AS longitude,
						r.location_label AS locationLabel,
						r.authority_id AS authorityId,
						a.code AS authorityCode,
						a.name AS authorityName,
					r.country_code AS countryCode,
					r.created_at AS createdAt,
					r.updated_at AS updatedAt,
					NULL AS ownerLabel,
						'normal' AS priority,
						NULL AS dueAt,
						NULL AS queueNote,
						(SELECT json_extract(re.event_payload_json, '$.participationState')
							FROM report_events re
							WHERE re.report_id = r.report_id
							  AND re.event_type = 'report_submitted'
							ORDER BY re.created_at ASC
							LIMIT 1) AS participationStateAtSubmission,
						0 AS isAdopted,
						NULL AS adoptedAt,
						NULL AS adoptionNote,
						NULL AS adoptedByName,
						u.email AS reporterEmail,
						u.display_name AS reporterName,
						COALESCE((SELECT COUNT(*) FROM reports child WHERE child.duplicate_of_report_id = r.report_id), 0) AS duplicateCount,
						COALESCE((SELECT COUNT(*) FROM report_confirmations rc WHERE rc.report_id = r.report_id), 0) AS confirmationCount
					FROM reports r
					LEFT JOIN users u ON u.user_id = r.user_id
					LEFT JOIN authorities a ON a.authority_id = r.authority_id
					WHERE r.report_id = ?
					LIMIT 1`,
				)
				.bind(reportId)
				.first<ReportSummary>();
		});
	if (!report) return null;

	const media = await getDB(locals)
		.prepare(
			`SELECT
				report_media_id AS reportMediaId,
				storage_key AS storageKey,
				public_url AS url,
				mime_type AS mimeType
			FROM report_media
			WHERE report_id = ?
			ORDER BY created_at ASC`,
		)
		.bind(reportId)
		.all<ReportMediaSummary>();

	return {
		...report,
		isHistoricBacklog:
			(report.participationStateAtSubmission ?? 'unknown') !== 'claimed' && !Boolean(report.isAdopted),
		isAdopted: Boolean(report.isAdopted),
		media: media.results,
	} satisfies ReportDetail;
}

export async function listReportEvents(locals: App.Locals, reportId: string) {
	const rows = await getDB(locals)
		.prepare(
			`SELECT
				re.report_event_id AS reportEventId,
				re.event_type AS eventType,
				re.event_payload_json AS payloadJson,
				re.created_at AS createdAt,
				u.display_name AS actorName,
				u.email AS actorEmail
			FROM report_events re
			LEFT JOIN users u ON u.user_id = re.actor_user_id
			WHERE re.report_id = ?
			ORDER BY re.created_at ASC`,
		)
		.bind(reportId)
		.all<{
			reportEventId: string;
			eventType: string;
			payloadJson: string;
			createdAt: string;
			actorName: string | null;
			actorEmail: string | null;
		}>();

	return rows.results.map((row) => ({
		reportEventId: row.reportEventId,
		eventType: row.eventType,
		createdAt: row.createdAt,
		actorName: row.actorName,
		actorEmail: row.actorEmail,
		payload: JSON.parse(row.payloadJson || '{}') as Record<string, unknown>,
	})) satisfies ReportEventSummary[];
}

export async function listResolutionStories(locals: App.Locals, reportId: string) {
	const db = getDB(locals);
	try {
		const rows = await db
			.prepare(
				`SELECT
					rs.resolution_story_id AS resolutionStoryId,
					rs.summary AS summary,
					rs.notes AS notes,
					rs.status AS status,
					rs.created_at AS createdAt,
					u.display_name AS actorName,
					u.email AS actorEmail
				FROM resolution_stories rs
				LEFT JOIN users u ON u.user_id = rs.actor_user_id
				WHERE rs.report_id = ?
				ORDER BY rs.created_at DESC`,
			)
			.bind(reportId)
			.all<{
				resolutionStoryId: string;
				summary: string;
				notes: string | null;
				status: string;
				createdAt: string;
				actorName: string | null;
				actorEmail: string | null;
			}>();

		const stories: ResolutionStorySummary[] = [];
		for (const row of rows.results) {
			const media = await db
				.prepare(
					`SELECT
						resolution_story_media_id AS reportMediaId,
						storage_key AS storageKey,
						public_url AS url,
						mime_type AS mimeType
					FROM resolution_story_media
					WHERE resolution_story_id = ?
					ORDER BY created_at ASC`,
				)
				.bind(row.resolutionStoryId)
				.all<ReportMediaSummary>();
			stories.push({
				...row,
				media: media.results,
			});
		}
		return stories;
	} catch (_error) {
		return [];
	}
}

export async function updateReportStatus(
	locals: App.Locals,
	input: {
		reportId: string;
		status: ReportStatus;
		actorUserId: string;
		actorRole: 'warden' | 'moderator' | 'admin';
		note?: string | null;
	},
) {
	if (!allowedStatusSet.has(input.status)) {
		throw new Error('Invalid status update.');
	}

	const db = getDB(locals);
	const existing = await db
		.prepare(
			`SELECT
				r.report_id AS reportId,
				r.status AS status,
				r.category AS category,
				r.user_id AS userId,
				r.authority_id AS authorityId,
				rt.owner_label AS ownerLabel,
				a.name AS authorityName,
				u.email AS reporterEmail,
				u.display_name AS reporterName
			FROM reports r
			LEFT JOIN report_triage rt ON rt.report_id = r.report_id
			LEFT JOIN authorities a ON a.authority_id = r.authority_id
			LEFT JOIN users u ON u.user_id = r.user_id
			WHERE r.report_id = ?
			LIMIT 1`,
		)
		.bind(input.reportId)
		.first<{
			reportId: string;
			status: string;
			category: string;
			userId: string | null;
			authorityId: string | null;
			ownerLabel: string | null;
			authorityName: string | null;
			reporterEmail: string | null;
			reporterName: string | null;
		}>();

	if (!existing?.reportId) {
		throw new Error('Report not found.');
	}

	await db
		.prepare('UPDATE reports SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE report_id = ?')
		.bind(input.status, input.reportId)
		.run();

	await db
		.prepare(
			'INSERT INTO moderation_actions (moderation_action_id, report_id, actor_user_id, actor_role, action_type, notes) VALUES (?, ?, ?, ?, ?, ?)',
		)
		.bind(
			crypto.randomUUID(),
			input.reportId,
			input.actorUserId,
			input.actorRole,
			'status_update',
			input.note?.trim() || null,
		)
		.run();

	await db
		.prepare(
			'INSERT INTO report_events (report_event_id, report_id, actor_user_id, event_type, event_payload_json) VALUES (?, ?, ?, ?, ?)',
		)
		.bind(
			crypto.randomUUID(),
			input.reportId,
			input.actorUserId,
			'report_status_updated',
			JSON.stringify({
				fromStatus: existing.status,
				toStatus: input.status,
				note: input.note?.trim() || null,
			}),
		)
		.run();

	const normalizedOwner = existing.ownerLabel?.trim().toLowerCase() || null;
	if (normalizedOwner && existing.authorityId) {
		const assignee = await db
			.prepare(
				`SELECT DISTINCT
					u.user_id AS userId,
					u.email AS email,
					u.display_name AS displayName
				FROM user_roles ur
				INNER JOIN users u ON u.user_id = ur.user_id
				WHERE ur.authority_id = ?
				  AND (
					LOWER(u.email) = ?
					OR LOWER(COALESCE(u.display_name, '')) = ?
				  )
				LIMIT 1`,
			)
			.bind(existing.authorityId, normalizedOwner, normalizedOwner)
			.first<{ userId: string; email: string; displayName: string | null }>();

		if (assignee?.userId && assignee.userId !== input.actorUserId) {
			await createUserNotification(locals, {
				userId: assignee.userId,
				type: 'authority_action',
				title: `Queue status changed to ${input.status.replaceAll('_', ' ')}`,
				body: input.note?.trim()
					? `${existing.category}: ${input.note.trim()}`
					: `${existing.category} is now ${input.status.replaceAll('_', ' ')} in your queue.`,
				ctaPath: `/reports/${input.reportId}`,
				metadata: {
					reportId: input.reportId,
					status: input.status,
					ownerLabel: existing.ownerLabel?.trim() || null,
				},
			});
		}
	}

	if (existing.reporterEmail) {
		if (existing.userId) {
			await createUserNotification(locals, {
				userId: existing.userId,
				type: 'status_changed',
				title: `Status changed to ${input.status.replaceAll('_', ' ')}`,
				body: input.note?.trim()
					? `${existing.category}: ${input.note.trim()}`
					: `${existing.category} is now ${input.status.replaceAll('_', ' ')}.`,
				ctaPath: `/reports/${input.reportId}`,
				metadata: {
					reportId: input.reportId,
					status: input.status,
					authorityName: existing.authorityName,
				},
			});
		}

		const preferences = existing.userId
			? await getNotificationPreferences(locals, existing.userId)
			: { emailEnabled: true, inAppEnabled: true, pushEnabled: false, digestMode: 'immediate' as const };
		const emailResult =
			preferences.emailEnabled && preferences.digestMode === 'immediate'
				? await sendStatusUpdateEmail({
						reportId: input.reportId,
						email: existing.reporterEmail,
						name: existing.reporterName,
						category: existing.category,
						status: input.status,
						authorityName: existing.authorityName,
						note: input.note?.trim() || null,
					}).catch((error) => ({ sent: false, error, template: 'status_changed' }))
				: { sent: false, skipped: true, reason: 'preference_disabled_or_digest' };

		await db
			.prepare(
				'INSERT INTO report_events (report_event_id, report_id, actor_user_id, event_type, event_payload_json) VALUES (?, ?, ?, ?, ?)',
			)
			.bind(
				crypto.randomUUID(),
				input.reportId,
				input.actorUserId,
				'skipped' in emailResult
					? 'status_email_skipped'
					: emailResult.sent
						? 'status_email_sent'
						: 'status_email_failed',
				JSON.stringify({
					status: input.status,
					note: input.note?.trim() || null,
					email: existing.reporterEmail,
					result: emailResult,
				}),
			)
			.run();
	}
}

export async function updateReportTriage(
	locals: App.Locals,
	input: {
		reportId: string;
		actorUserId: string;
		actorRole: 'warden' | 'moderator' | 'admin';
		ownerLabel?: string | null;
		priority: 'low' | 'normal' | 'high' | 'urgent';
		dueAt?: string | null;
		queueNote?: string | null;
	},
) {
	const db = getDB(locals);
	const existing = await db
		.prepare(
			`SELECT
				r.report_id AS reportId,
				r.category AS category,
				r.user_id AS userId,
				r.authority_id AS authorityId
			FROM reports r
			WHERE r.report_id = ?
			LIMIT 1`,
		)
		.bind(input.reportId)
		.first<{
			reportId: string;
			category: string;
			userId: string | null;
			authorityId: string | null;
		}>();

	if (!existing?.reportId) {
		throw new Error('Report not found.');
	}

	try {
		await db
			.prepare(
			`INSERT INTO report_triage (
				report_id,
				owner_label,
				priority,
				due_at,
				queue_note,
				updated_by_user_id,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
			ON CONFLICT(report_id) DO UPDATE SET
				owner_label = excluded.owner_label,
				priority = excluded.priority,
				due_at = excluded.due_at,
				queue_note = excluded.queue_note,
				updated_by_user_id = excluded.updated_by_user_id,
				updated_at = CURRENT_TIMESTAMP`,
			)
			.bind(
			input.reportId,
			input.ownerLabel?.trim() || null,
			input.priority,
			input.dueAt?.trim() || null,
			input.queueNote?.trim() || null,
			input.actorUserId,
			)
			.run();
	} catch (error) {
		if (error instanceof Error && error.message.includes('report_triage')) {
			throw new Error('Triage features are waiting on the latest database migration.');
		}
		throw error;
	}

	await db
		.prepare(
			'INSERT INTO moderation_actions (moderation_action_id, report_id, actor_user_id, actor_role, action_type, notes) VALUES (?, ?, ?, ?, ?, ?)',
		)
		.bind(
			crypto.randomUUID(),
			input.reportId,
			input.actorUserId,
			input.actorRole,
			'triage_update',
			input.queueNote?.trim() || input.ownerLabel?.trim() || null,
		)
		.run();

	const normalizedOwner = input.ownerLabel?.trim().toLowerCase() || null;
	if (normalizedOwner && existing.authorityId) {
		const assignee = await db
			.prepare(
				`SELECT DISTINCT
					u.user_id AS userId,
					u.email AS email,
					u.display_name AS displayName
				FROM user_roles ur
				INNER JOIN users u ON u.user_id = ur.user_id
				WHERE ur.authority_id = ?
				  AND (
					LOWER(u.email) = ?
					OR LOWER(COALESCE(u.display_name, '')) = ?
				  )
				LIMIT 1`,
			)
			.bind(existing.authorityId, normalizedOwner, normalizedOwner)
			.first<{ userId: string; email: string; displayName: string | null }>();

		if (assignee?.userId && assignee.userId !== input.actorUserId) {
			await createUserNotification(locals, {
				userId: assignee.userId,
				type: 'authority_action',
				title: 'Report assigned to you',
				body: `${existing.category} is now in your queue with ${input.priority} priority.`,
				ctaPath: `/authority?owner=mine`,
				metadata: {
					reportId: input.reportId,
					priority: input.priority,
					ownerLabel: input.ownerLabel?.trim() || null,
					dueAt: input.dueAt?.trim() || null,
				},
			});
		}
	}

	await db
		.prepare(
			'INSERT INTO report_events (report_event_id, report_id, actor_user_id, event_type, event_payload_json) VALUES (?, ?, ?, ?, ?)',
		)
		.bind(
			crypto.randomUUID(),
			input.reportId,
			input.actorUserId,
			'report_triage_updated',
			JSON.stringify({
				ownerLabel: input.ownerLabel?.trim() || null,
				priority: input.priority,
				dueAt: input.dueAt?.trim() || null,
				queueNote: input.queueNote?.trim() || null,
			}),
		)
		.run();

	if (existing.userId) {
		await createUserNotification(locals, {
			userId: existing.userId,
			type: 'authority_action',
			title: 'Authority triage updated',
			body: `${existing.category} now has ${input.priority} priority${input.ownerLabel?.trim() ? ` and is owned by ${input.ownerLabel.trim()}` : ''}.`,
			ctaPath: `/reports/${input.reportId}`,
			metadata: {
				reportId: input.reportId,
				priority: input.priority,
				ownerLabel: input.ownerLabel?.trim() || null,
				dueAt: input.dueAt?.trim() || null,
			},
		});
	}
}

export async function adoptReportIntoAuthorityQueue(
	locals: App.Locals,
	input: {
		reportId: string;
		actorUserId: string;
		actorRole: 'warden' | 'moderator' | 'admin';
		adoptionNote?: string | null;
	},
) {
	await ensureReportAdoptionsTable(locals);
	const db = getDB(locals);
	const existing = await db
		.prepare(
			`SELECT
				r.report_id AS reportId,
				r.category AS category,
				r.user_id AS userId,
				r.authority_id AS authorityId,
				a.name AS authorityName,
				(SELECT json_extract(re.event_payload_json, '$.participationState')
					FROM report_events re
					WHERE re.report_id = r.report_id
					  AND re.event_type = 'report_submitted'
					ORDER BY re.created_at ASC
					LIMIT 1) AS participationStateAtSubmission
			FROM reports r
			LEFT JOIN authorities a ON a.authority_id = r.authority_id
			WHERE r.report_id = ?
			LIMIT 1`,
		)
		.bind(input.reportId)
		.first<{
			reportId: string;
			category: string;
			userId: string | null;
			authorityId: string | null;
			authorityName: string | null;
			participationStateAtSubmission: 'claimed' | 'unclaimed' | 'unknown' | null;
		}>();

	if (!existing?.reportId || !existing.authorityId) {
		throw new Error('Report not found.');
	}

	await db
		.prepare(
			`INSERT INTO report_adoptions (
				report_adoption_id,
				report_id,
				authority_id,
				adopted_by_user_id,
				adoption_note,
				adopted_at,
				created_at
			) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			ON CONFLICT(report_id) DO UPDATE SET
				adopted_by_user_id = excluded.adopted_by_user_id,
				adoption_note = excluded.adoption_note,
				adopted_at = CURRENT_TIMESTAMP`,
		)
		.bind(
			crypto.randomUUID(),
			input.reportId,
			existing.authorityId,
			input.actorUserId,
			input.adoptionNote?.trim() || null,
		)
		.run();

	await db
		.prepare(
			'INSERT INTO moderation_actions (moderation_action_id, report_id, actor_user_id, actor_role, action_type, notes) VALUES (?, ?, ?, ?, ?, ?)',
		)
		.bind(
			crypto.randomUUID(),
			input.reportId,
			input.actorUserId,
			input.actorRole,
			'backlog_adoption',
			input.adoptionNote?.trim() || null,
		)
		.run();

	await db
		.prepare(
			'INSERT INTO report_events (report_event_id, report_id, actor_user_id, event_type, event_payload_json) VALUES (?, ?, ?, ?, ?)',
		)
		.bind(
			crypto.randomUUID(),
			input.reportId,
			input.actorUserId,
			'authority_backlog_adopted',
			JSON.stringify({
				adoptionNote: input.adoptionNote?.trim() || null,
				previousParticipationState: existing.participationStateAtSubmission ?? 'unknown',
				authorityName: existing.authorityName,
			}),
		)
		.run();

	if (existing.userId) {
		await createUserNotification(locals, {
			userId: existing.userId,
			type: 'authority_action',
			title: 'Authority adopted this report',
			body: existing.authorityName
				? `${existing.authorityName} has now adopted ${existing.category} into its monitored queue.`
				: `${existing.category} has now been adopted into a monitored authority queue.`,
			ctaPath: `/reports/${input.reportId}`,
			metadata: {
				reportId: input.reportId,
				authorityName: existing.authorityName,
				adopted: true,
			},
		});
	}
}

export async function addResolutionStory(
	locals: App.Locals,
	input: {
		reportId: string;
		actorUserId: string;
		summary: string;
		notes?: string | null;
		media?: {
			storageKey: string;
			url: string;
			mimeType?: string | null;
		}[];
	},
) {
	const db = getDB(locals);
	const report = await db
		.prepare(
			`SELECT
				r.report_id AS reportId,
				r.category AS category,
				r.user_id AS reporterUserId,
				a.name AS authorityName,
				u.email AS reporterEmail,
				u.display_name AS reporterName
			FROM reports r
			LEFT JOIN authorities a ON a.authority_id = r.authority_id
			LEFT JOIN users u ON u.user_id = r.user_id
			WHERE r.report_id = ?
			LIMIT 1`,
		)
		.bind(input.reportId)
		.first<{
			reportId: string;
			category: string;
			reporterUserId: string | null;
			authorityName: string | null;
			reporterEmail: string | null;
			reporterName: string | null;
		}>();

	if (!report?.reportId) {
		throw new Error('Report not found.');
	}

	const resolutionStoryId = crypto.randomUUID();
	await db
		.prepare(
			`INSERT INTO resolution_stories (
				resolution_story_id,
				report_id,
				actor_user_id,
				summary,
				notes,
				status
			) VALUES (?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			resolutionStoryId,
			input.reportId,
			input.actorUserId,
			input.summary.trim(),
			input.notes?.trim() || null,
			'published',
		)
		.run();

	for (const media of input.media ?? []) {
		await db
			.prepare(
				`INSERT INTO resolution_story_media (
					resolution_story_media_id,
					resolution_story_id,
					storage_key,
					public_url,
					mime_type
				) VALUES (?, ?, ?, ?, ?)`,
			)
			.bind(
				crypto.randomUUID(),
				resolutionStoryId,
				media.storageKey,
				media.url,
				media.mimeType ?? null,
			)
			.run();
	}

	await db
		.prepare(
			'INSERT INTO report_events (report_event_id, report_id, actor_user_id, event_type, event_payload_json) VALUES (?, ?, ?, ?, ?)',
		)
		.bind(
			crypto.randomUUID(),
			input.reportId,
			input.actorUserId,
			'resolution_story_published',
			JSON.stringify({
				resolutionStoryId,
				summary: input.summary.trim(),
				mediaCount: input.media?.length ?? 0,
			}),
		)
		.run();

	if (report.reporterUserId) {
		await createUserNotification(locals, {
			userId: report.reporterUserId,
			type: 'resolution_published',
			title: 'Resolution story published',
			body: input.summary.trim(),
			ctaPath: `/reports/${input.reportId}`,
			metadata: {
				reportId: input.reportId,
				category: report.category,
				resolutionStoryId,
			},
		});
	}

	if (report.reporterEmail) {
		const preferences = report.reporterUserId
			? await getNotificationPreferences(locals, report.reporterUserId)
			: { emailEnabled: true, inAppEnabled: true, pushEnabled: false, digestMode: 'immediate' as const };
		if (preferences.emailEnabled && preferences.digestMode === 'immediate') {
			await sendResolutionPublishedEmail({
				reportId: input.reportId,
				email: report.reporterEmail,
				name: report.reporterName,
				category: report.category,
				summary: input.summary.trim(),
				authorityName: report.authorityName,
			}).catch(() => null);
		}
	}

	return resolutionStoryId;
}

export async function exportReports(
	locals: App.Locals,
	options: {
		authorityCode?: string | null;
		authorityCodes?: string[];
		format?: 'json' | 'csv';
		statusFilter?: string | null;
		priorityFilter?: string | null;
		ownerFilter?: string | null;
		focusFilter?: string | null;
		sortFilter?: string | null;
		searchFilter?: string | null;
		currentOwnerLabel?: string | null;
	},
) {
	const reports = (await listReports(locals, {
		authorityCode: options.authorityCode,
		authorityCodes: options.authorityCodes,
		limit: 50,
	})).filter((report) => {
		if (options.statusFilter && options.statusFilter !== 'all' && report.status !== options.statusFilter) return false;
		if (options.priorityFilter && options.priorityFilter !== 'all' && report.priority !== options.priorityFilter) return false;
		if (options.ownerFilter === 'mine') {
			if ((report.ownerLabel ?? '').trim().toLowerCase() !== (options.currentOwnerLabel ?? '').trim().toLowerCase()) return false;
		}
		if (options.ownerFilter === 'unassigned') {
			if ((report.ownerLabel ?? '').trim()) return false;
		}
		if (options.ownerFilter && options.ownerFilter !== 'all' && options.ownerFilter !== 'mine' && options.ownerFilter !== 'unassigned') {
			if ((report.ownerLabel ?? '').trim().toLowerCase() !== options.ownerFilter.toLowerCase()) return false;
		}
		if (options.searchFilter) {
			const haystack = `${report.category} ${report.description} ${report.locationLabel ?? ''} ${report.reporterEmail ?? ''}`.toLowerCase();
			if (!haystack.includes(options.searchFilter.toLowerCase())) return false;
		}
		if (!options.focusFilter || options.focusFilter === 'all') return true;
		if (options.focusFilter === 'backlog') {
			return report.isHistoricBacklog;
		}
		if (options.focusFilter === 'overdue') {
			return Boolean(report.dueAt && new Date(report.dueAt).getTime() < Date.now() && report.status !== 'resolved');
		}
		if (options.focusFilter === 'stale') {
			return Date.now() - new Date(report.updatedAt).getTime() > 1000 * 60 * 60 * 48 && report.status !== 'resolved';
		}
		if (options.focusFilter === 'urgent') {
			return report.priority === 'urgent';
		}
		if (options.focusFilter === 'unassigned') {
			return !(report.ownerLabel ?? '').trim();
		}
		return true;
	}).sort((first, second) => {
		const firstCreatedAt = new Date(first.createdAt).getTime();
		const secondCreatedAt = new Date(second.createdAt).getTime();
		const firstDueAt = first.dueAt ? new Date(first.dueAt).getTime() : Number.POSITIVE_INFINITY;
		const secondDueAt = second.dueAt ? new Date(second.dueAt).getTime() : Number.POSITIVE_INFINITY;
		const priorityWeight = { urgent: 4, high: 3, normal: 2, low: 1 } as const;
		const firstPriority = priorityWeight[first.priority as keyof typeof priorityWeight] ?? 0;
		const secondPriority = priorityWeight[second.priority as keyof typeof priorityWeight] ?? 0;
		const firstNeedsOwner = first.ownerLabel?.trim() ? 0 : 1;
		const secondNeedsOwner = second.ownerLabel?.trim() ? 0 : 1;
		const firstOverdue = first.dueAt && first.status !== 'resolved' && firstDueAt < Date.now() ? 1 : 0;
		const secondOverdue = second.dueAt && second.status !== 'resolved' && secondDueAt < Date.now() ? 1 : 0;
		switch (options.sortFilter) {
			case 'oldest':
				return firstCreatedAt - secondCreatedAt;
			case 'newest':
				return secondCreatedAt - firstCreatedAt;
			case 'due':
				return firstDueAt - secondDueAt;
			case 'severity':
				return second.severity - first.severity || secondCreatedAt - firstCreatedAt;
			case 'priority':
				return secondPriority - firstPriority || secondCreatedAt - firstCreatedAt;
			default:
				return (
					secondOverdue - firstOverdue ||
					secondNeedsOwner - firstNeedsOwner ||
					secondPriority - firstPriority ||
					firstDueAt - secondDueAt ||
					firstCreatedAt - secondCreatedAt
				);
		}
	});

	if (options.format === 'json') {
		return JSON.stringify(
			{
				exportedAt: new Date().toISOString(),
				total: reports.length,
				reports,
			},
			null,
			2,
		);
	}

	const header = [
		'reportId',
		'status',
		'category',
		'severity',
		'authorityName',
		'participationStateAtSubmission',
		'ownerLabel',
		'priority',
		'dueAt',
		'queueNote',
		'isHistoricBacklog',
		'isAdopted',
		'adoptedAt',
		'adoptedByName',
		'adoptionNote',
		'locationLabel',
		'latitude',
		'longitude',
		'createdAt',
		'updatedAt',
		'confirmationCount',
		'duplicateCount',
		'reporterEmail',
	].join(',');

	const rows = reports.map((report) =>
		[
			report.reportId,
			report.status,
			report.category,
			report.severity,
			report.authorityName ?? '',
			report.participationStateAtSubmission ?? '',
			report.ownerLabel ?? '',
			report.priority,
			report.dueAt ?? '',
			report.queueNote ?? '',
			report.isHistoricBacklog ? 'yes' : 'no',
			report.isAdopted ? 'yes' : 'no',
			report.adoptedAt ?? '',
			report.adoptedByName ?? '',
			report.adoptionNote ?? '',
			report.locationLabel ?? '',
			report.latitude,
			report.longitude,
			report.createdAt,
			report.updatedAt,
			report.confirmationCount,
			report.duplicateCount,
			report.reporterEmail ?? '',
		]
			.map((value) => `"${String(value).replaceAll('"', '""')}"`)
			.join(','),
	);

	return [header, ...rows].join('\n');
}

export async function confirmReport(
	locals: App.Locals,
	reportId: string,
	confirmationName: string | null,
	userId?: string | null,
) {
	const db = getDB(locals);
	if (userId) {
		const existing = await db
			.prepare(
				'SELECT report_confirmation_id FROM report_confirmations WHERE report_id = ? AND user_id = ? LIMIT 1',
			)
			.bind(reportId, userId)
			.first<{ report_confirmation_id: string }>();

		if (existing?.report_confirmation_id) {
			const current = await db
				.prepare('SELECT COUNT(*) AS total FROM report_confirmations WHERE report_id = ?')
				.bind(reportId)
				.first<{ total: number }>();
			return current?.total ?? 0;
		}
	}

	await db
		.prepare(
			`INSERT INTO report_confirmations (
				report_confirmation_id,
				report_id,
				user_id,
				confirmer_name
			) VALUES (?, ?, ?, ?)`,
		)
		.bind(crypto.randomUUID(), reportId, userId ?? null, confirmationName)
		.run();

	const confirmationCount = await db
		.prepare('SELECT COUNT(*) AS total FROM report_confirmations WHERE report_id = ?')
		.bind(reportId)
		.first<{ total: number }>();

	return confirmationCount?.total ?? 0;
}
