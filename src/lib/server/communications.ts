import { getDB } from './db';

export type NotificationType =
	| 'report_submitted'
	| 'status_changed'
	| 'resolution_published'
	| 'support_confirmed'
	| 'authority_action'
	| 'routing_feedback';

export type NotificationPreferences = {
	emailEnabled: boolean;
	inAppEnabled: boolean;
	pushEnabled: boolean;
	digestMode: 'immediate' | 'daily_digest';
};

export type UserNotification = {
	notificationId: string;
	notificationType: NotificationType;
	title: string;
	body: string;
	ctaPath: string | null;
	readAt: string | null;
	createdAt: string;
	metadata: Record<string, unknown>;
};

const defaultPreferences: NotificationPreferences = {
	emailEnabled: true,
	inAppEnabled: true,
	pushEnabled: false,
	digestMode: 'immediate',
};

export async function getNotificationPreferences(locals: App.Locals, userId: string) {
	const db = getDB(locals);
	const row = await db
		.prepare(
			`SELECT
				email_enabled AS emailEnabled,
				in_app_enabled AS inAppEnabled,
				push_enabled AS pushEnabled,
				digest_mode AS digestMode
			FROM notification_preferences
			WHERE user_id = ?
			LIMIT 1`,
		)
		.bind(userId)
		.first<{
			emailEnabled: number;
			inAppEnabled: number;
			pushEnabled: number;
			digestMode: NotificationPreferences['digestMode'];
		}>();

	if (!row) {
		await db
			.prepare(
				`INSERT INTO notification_preferences (
					user_id,
					email_enabled,
					in_app_enabled,
					push_enabled,
					digest_mode
				) VALUES (?, ?, ?, ?, ?)`,
			)
			.bind(
				userId,
				defaultPreferences.emailEnabled ? 1 : 0,
				defaultPreferences.inAppEnabled ? 1 : 0,
				defaultPreferences.pushEnabled ? 1 : 0,
				defaultPreferences.digestMode,
			)
			.run();
		return defaultPreferences;
	}

	return {
		emailEnabled: Boolean(row.emailEnabled),
		inAppEnabled: Boolean(row.inAppEnabled),
		pushEnabled: Boolean(row.pushEnabled),
		digestMode: row.digestMode,
	} satisfies NotificationPreferences;
}

export async function updateNotificationPreferences(
	locals: App.Locals,
	userId: string,
	input: NotificationPreferences,
) {
	await getDB(locals)
		.prepare(
			`INSERT INTO notification_preferences (
				user_id,
				email_enabled,
				in_app_enabled,
				push_enabled,
				digest_mode,
				updated_at
			) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
			ON CONFLICT(user_id) DO UPDATE SET
				email_enabled = excluded.email_enabled,
				in_app_enabled = excluded.in_app_enabled,
				push_enabled = excluded.push_enabled,
				digest_mode = excluded.digest_mode,
				updated_at = CURRENT_TIMESTAMP`,
		)
		.bind(
			userId,
			input.emailEnabled ? 1 : 0,
			input.inAppEnabled ? 1 : 0,
			input.pushEnabled ? 1 : 0,
			input.digestMode,
		)
		.run();
}

export async function createUserNotification(
	locals: App.Locals,
	input: {
		userId: string;
		type: NotificationType;
		title: string;
		body: string;
		ctaPath?: string | null;
		metadata?: Record<string, unknown>;
	},
) {
	const preferences = await getNotificationPreferences(locals, input.userId);
	if (!preferences.inAppEnabled) return null;

	const notificationId = crypto.randomUUID();
	await getDB(locals)
		.prepare(
			`INSERT INTO user_notifications (
				notification_id,
				user_id,
				notification_type,
				title,
				body,
				cta_path,
				metadata_json
			) VALUES (?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			notificationId,
			input.userId,
			input.type,
			input.title,
			input.body,
			input.ctaPath ?? null,
			JSON.stringify(input.metadata ?? {}),
		)
		.run();

	return notificationId;
}

export async function listUserNotifications(
	locals: App.Locals,
	userId: string,
	options: { limit?: number } = {},
) {
	const limit = Math.min(Math.max(options.limit ?? 40, 1), 100);
	const rows = await getDB(locals)
		.prepare(
			`SELECT
				notification_id AS notificationId,
				notification_type AS notificationType,
				title,
				body,
				cta_path AS ctaPath,
				read_at AS readAt,
				created_at AS createdAt,
				metadata_json AS metadataJson
			FROM user_notifications
			WHERE user_id = ?
			ORDER BY created_at DESC
			LIMIT ?`,
		)
		.bind(userId, limit)
		.all<{
			notificationId: string;
			notificationType: NotificationType;
			title: string;
			body: string;
			ctaPath: string | null;
			readAt: string | null;
			createdAt: string;
			metadataJson: string | null;
		}>();

	return rows.results.map((row) => ({
		notificationId: row.notificationId,
		notificationType: row.notificationType,
		title: row.title,
		body: row.body,
		ctaPath: row.ctaPath,
		readAt: row.readAt,
		createdAt: row.createdAt,
		metadata: row.metadataJson ? JSON.parse(row.metadataJson) : {},
	})) satisfies UserNotification[];
}

export async function countUnreadNotifications(locals: App.Locals, userId: string) {
	const row = await getDB(locals)
		.prepare(
			`SELECT COUNT(*) AS total
			FROM user_notifications
			WHERE user_id = ?
			  AND read_at IS NULL`,
		)
		.bind(userId)
		.first<{ total: number }>();
	return Number(row?.total ?? 0);
}

export async function markAllNotificationsRead(locals: App.Locals, userId: string) {
	await getDB(locals)
		.prepare(
			`UPDATE user_notifications
			SET read_at = CURRENT_TIMESTAMP
			WHERE user_id = ?
			  AND read_at IS NULL`,
		)
		.bind(userId)
		.run();
}
