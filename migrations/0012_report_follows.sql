CREATE TABLE IF NOT EXISTS report_follows (
	report_follow_id TEXT PRIMARY KEY,
	report_id TEXT NOT NULL,
	user_id TEXT NOT NULL,
	notifications_enabled INTEGER NOT NULL DEFAULT 1,
	created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
	UNIQUE(report_id, user_id),
	FOREIGN KEY (report_id) REFERENCES reports (report_id),
	FOREIGN KEY (user_id) REFERENCES users (user_id)
);

CREATE INDEX IF NOT EXISTS idx_report_follows_user_id ON report_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_report_follows_report_id ON report_follows(report_id);
