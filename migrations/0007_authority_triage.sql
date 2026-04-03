CREATE TABLE IF NOT EXISTS report_triage (
  report_id TEXT PRIMARY KEY,
  owner_label TEXT,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_at TEXT,
  queue_note TEXT,
  updated_by_user_id TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports (report_id),
  FOREIGN KEY (updated_by_user_id) REFERENCES users (user_id)
);

CREATE INDEX IF NOT EXISTS idx_report_triage_priority
  ON report_triage (priority, due_at);
