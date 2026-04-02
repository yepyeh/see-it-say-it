CREATE TABLE IF NOT EXISTS request_rate_limits (
  bucket_key TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  identifier_hash TEXT NOT NULL,
  window_started_at TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  blocked_until TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  push_subscription_id TEXT PRIMARY KEY,
  user_id TEXT,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (user_id)
);

CREATE TABLE IF NOT EXISTS resolution_stories (
  resolution_story_id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports (report_id),
  FOREIGN KEY (actor_user_id) REFERENCES users (user_id)
);

CREATE TABLE IF NOT EXISTS resolution_story_media (
  resolution_story_media_id TEXT PRIMARY KEY,
  resolution_story_id TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  public_url TEXT NOT NULL,
  mime_type TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (resolution_story_id) REFERENCES resolution_stories (resolution_story_id)
);

CREATE INDEX IF NOT EXISTS idx_request_rate_limits_action_identifier
  ON request_rate_limits (action, identifier_hash);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON push_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_resolution_stories_report
  ON resolution_stories (report_id, created_at DESC);
