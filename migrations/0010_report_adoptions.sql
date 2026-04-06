CREATE TABLE IF NOT EXISTS report_adoptions (
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
);

CREATE INDEX IF NOT EXISTS idx_report_adoptions_authority ON report_adoptions (authority_id, adopted_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_adoptions_report ON report_adoptions (report_id);
