-- Verification session: attempt limit and resend cooldown
ALTER TABLE pending_registrations
  ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_resend_at TIMESTAMPTZ;

-- Backfill: existing rows get last_resend_at = created_at so resend works
UPDATE pending_registrations SET last_resend_at = created_at WHERE last_resend_at IS NULL;
