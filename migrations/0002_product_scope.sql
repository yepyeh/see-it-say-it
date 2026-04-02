ALTER TABLE reports ADD COLUMN notes_markdown TEXT NOT NULL DEFAULT '';
ALTER TABLE reports ADD COLUMN source_channel TEXT NOT NULL DEFAULT 'web';
ALTER TABLE reports ADD COLUMN duplicate_of_report_id TEXT;

CREATE TABLE IF NOT EXISTS report_confirmations (
  report_confirmation_id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  user_id TEXT,
  confirmer_name TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (report_id) REFERENCES reports (report_id),
  FOREIGN KEY (user_id) REFERENCES users (user_id)
);

CREATE TABLE IF NOT EXISTS support_contributions (
  support_contribution_id TEXT PRIMARY KEY,
  user_id TEXT,
  provider TEXT NOT NULL,
  provider_reference TEXT,
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  contribution_type TEXT NOT NULL CHECK (contribution_type IN ('one_time', 'recurring')),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (user_id)
);

CREATE INDEX IF NOT EXISTS idx_reports_duplicate_of_report ON reports (duplicate_of_report_id);
CREATE INDEX IF NOT EXISTS idx_report_confirmations_report ON report_confirmations (report_id);

INSERT OR IGNORE INTO regions (region_id, country_code, code, name, type)
VALUES
  ('region-bristol', 'GB', 'bristol', 'Bristol', 'city'),
  ('region-london-westminster', 'GB', 'westminster', 'Westminster', 'borough'),
  ('region-manchester', 'GB', 'manchester', 'Manchester', 'city');

INSERT OR IGNORE INTO authorities (
  authority_id,
  country_code,
  region_id,
  code,
  name,
  authority_type,
  contact_email,
  routing_mode,
  is_active
)
VALUES
  ('auth-bristol-city', 'GB', 'region-bristol', 'bristol-city-council', 'Bristol City Council', 'council', 'highways@bristol.gov.uk', 'email', 1),
  ('auth-westminster', 'GB', 'region-london-westminster', 'westminster-city-council', 'Westminster City Council', 'council', 'streetcare@westminster.gov.uk', 'email', 1),
  ('auth-manchester', 'GB', 'region-manchester', 'manchester-city-council', 'Manchester City Council', 'council', 'environment@manchester.gov.uk', 'email', 1);
