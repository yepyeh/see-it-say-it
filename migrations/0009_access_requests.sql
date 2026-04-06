CREATE TABLE IF NOT EXISTS access_requests (
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
);

CREATE INDEX IF NOT EXISTS idx_access_requests_status
  ON access_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_access_requests_user
  ON access_requests (user_id, created_at DESC);
