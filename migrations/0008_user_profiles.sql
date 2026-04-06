CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY,
  handle TEXT UNIQUE COLLATE NOCASE,
  bio TEXT,
  avatar_url TEXT,
  profile_visibility TEXT NOT NULL DEFAULT 'community' CHECK (profile_visibility IN ('public', 'community', 'private')),
  home_authority_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (user_id),
  FOREIGN KEY (home_authority_id) REFERENCES authorities (authority_id)
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_home_authority
  ON user_profiles (home_authority_id);
