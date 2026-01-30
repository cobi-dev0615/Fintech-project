-- Pending registrations for 2FA (email OTP) before creating user
CREATE TABLE IF NOT EXISTS pending_registrations (
  email              TEXT NOT NULL PRIMARY KEY,
  full_name          TEXT NOT NULL,
  password_hash      TEXT NOT NULL,
  role               TEXT NOT NULL,
  invitation_token   TEXT,
  invited_by_id      UUID,
  otp_hash           TEXT NOT NULL,
  otp_expires_at     TIMESTAMPTZ NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_registrations_otp_expires
  ON pending_registrations (otp_expires_at);
