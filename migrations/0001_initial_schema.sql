CREATE TABLE IF NOT EXISTS locales (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1))
);

CREATE TABLE IF NOT EXISTS countries (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  default_locale TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (default_locale) REFERENCES locales (code)
);

CREATE TABLE IF NOT EXISTS regions (
  region_id TEXT PRIMARY KEY,
  country_code TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (country_code) REFERENCES countries (code)
);

CREATE TABLE IF NOT EXISTS authorities (
  authority_id TEXT PRIMARY KEY,
  country_code TEXT NOT NULL,
  region_id TEXT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  authority_type TEXT NOT NULL,
  contact_email TEXT,
  routing_mode TEXT NOT NULL DEFAULT 'email',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (country_code) REFERENCES countries (code),
  FOREIGN KEY (region_id) REFERENCES regions (region_id)
);

CREATE TABLE IF NOT EXISTS boundary_sets (
  boundary_set_id TEXT PRIMARY KEY,
  country_code TEXT NOT NULL,
  authority_id TEXT,
  source_name TEXT NOT NULL,
  source_version TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (country_code) REFERENCES countries (code),
  FOREIGN KEY (authority_id) REFERENCES authorities (authority_id)
);

CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  display_name TEXT,
  preferred_locale TEXT NOT NULL DEFAULT 'en-GB',
  home_country_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (preferred_locale) REFERENCES locales (code),
  FOREIGN KEY (home_country_code) REFERENCES countries (code)
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_role_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('resident', 'warden', 'moderator', 'admin')),
  country_code TEXT,
  region_id TEXT,
  authority_id TEXT,
  assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (user_id),
  FOREIGN KEY (country_code) REFERENCES countries (code),
  FOREIGN KEY (region_id) REFERENCES regions (region_id),
  FOREIGN KEY (authority_id) REFERENCES authorities (authority_id)
);

CREATE TABLE IF NOT EXISTS reports (
  report_id TEXT PRIMARY KEY,
  user_id TEXT,
  locale TEXT NOT NULL DEFAULT 'en-GB',
  country_code TEXT NOT NULL,
  region_id TEXT,
  authority_id TEXT,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  severity INTEGER NOT NULL DEFAULT 3 CHECK (severity BETWEEN 1 AND 5),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'dispatched', 'in_progress', 'resolved')),
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  location_label TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users (user_id),
  FOREIGN KEY (locale) REFERENCES locales (code),
  FOREIGN KEY (country_code) REFERENCES countries (code),
  FOREIGN KEY (region_id) REFERENCES regions (region_id),
  FOREIGN KEY (authority_id) REFERENCES authorities (authority_id)
);

CREATE TABLE IF NOT EXISTS report_media (
  report_media_id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  storage_provider TEXT NOT NULL DEFAULT 'r2',
  storage_key TEXT NOT NULL,
  public_url TEXT,
  mime_type TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports (report_id)
);

CREATE TABLE IF NOT EXISTS report_events (
  report_event_id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  actor_user_id TEXT,
  event_type TEXT NOT NULL,
  event_payload_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports (report_id),
  FOREIGN KEY (actor_user_id) REFERENCES users (user_id)
);

CREATE TABLE IF NOT EXISTS authority_dispatches (
  dispatch_id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  authority_id TEXT NOT NULL,
  destination TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed')),
  last_error TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports (report_id),
  FOREIGN KEY (authority_id) REFERENCES authorities (authority_id)
);

CREATE TABLE IF NOT EXISTS moderation_actions (
  moderation_action_id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  actor_user_id TEXT NOT NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('warden', 'moderator', 'admin')),
  action_type TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports (report_id),
  FOREIGN KEY (actor_user_id) REFERENCES users (user_id)
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_country ON reports (country_code);
CREATE INDEX IF NOT EXISTS idx_reports_authority ON reports (authority_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_report ON authority_dispatches (report_id);

INSERT OR IGNORE INTO locales (code, name, is_default)
VALUES ('en-GB', 'English (UK)', 1);

INSERT OR IGNORE INTO countries (code, name, default_locale)
VALUES ('GB', 'United Kingdom', 'en-GB');
