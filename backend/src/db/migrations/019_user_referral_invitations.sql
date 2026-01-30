-- Migration: User referral invitations (customer invites external users)
-- Invitation link, invited_by_id on users, 10+ invites = 20% discount on monthly

-- Add invited_by_id to users (who invited this user; set when they register via invitation link)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'invited_by_id'
  ) THEN
    ALTER TABLE users
    ADD COLUMN invited_by_id UUID REFERENCES users(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_users_invited_by ON users(invited_by_id);
  END IF;
END $$;

-- Table: one reusable invitation link per user (customer inviter)
CREATE TABLE IF NOT EXISTS user_invite_links (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(inviter_id)
);

CREATE INDEX IF NOT EXISTS idx_user_invite_links_inviter ON user_invite_links(inviter_id);
CREATE INDEX IF NOT EXISTS idx_user_invite_links_token ON user_invite_links(token);
