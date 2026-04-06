CREATE TABLE IF NOT EXISTS access_audit_log (
  access_audit_log_id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  target_user_id TEXT NOT NULL,
  authority_id TEXT,
  authority_code TEXT,
  action_type TEXT NOT NULL,
  role_before TEXT,
  role_after TEXT,
  request_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users (user_id),
  FOREIGN KEY (target_user_id) REFERENCES users (user_id),
  FOREIGN KEY (authority_id) REFERENCES authorities (authority_id)
);

CREATE INDEX IF NOT EXISTS idx_access_audit_log_created_at ON access_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_audit_log_target_user ON access_audit_log (target_user_id, created_at DESC);
