-- Migration: Ensure system_settings table exists with default values
-- Fixes automatic account approval not working when this table was missing

CREATE TABLE IF NOT EXISTS system_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Default: require admin approval for new user registrations
INSERT INTO system_settings (key, value) VALUES ('registration_requires_approval', 'true')
ON CONFLICT (key) DO NOTHING;
