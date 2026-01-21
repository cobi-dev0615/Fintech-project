-- Migration: Create login_history table
-- This migration creates a table to track user login attempts and history

CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON login_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_ip_address ON login_history(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_history_user_created ON login_history(user_id, created_at DESC);
