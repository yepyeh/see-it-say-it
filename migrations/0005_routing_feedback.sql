CREATE TABLE IF NOT EXISTS routing_suggestions (
  routing_suggestion_id TEXT PRIMARY KEY,
  report_id TEXT,
  authority_id TEXT,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  routing_state TEXT NOT NULL,
  group_id TEXT,
  category_id TEXT,
  suggested_department TEXT NOT NULL,
  suggested_contact_email TEXT,
  notes TEXT,
  submitter_email TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports (report_id),
  FOREIGN KEY (authority_id) REFERENCES authorities (authority_id)
);

CREATE INDEX IF NOT EXISTS idx_routing_suggestions_authority
  ON routing_suggestions (authority_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_routing_suggestions_location
  ON routing_suggestions (latitude, longitude);
