-- Migration: Create notification preferences table
-- Created: 2024-02-17
-- Description: Creates user_notification_preferences table to allow users to configure which notifications they receive

-- Notification Types Enum
DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'account_activity',
    'transaction_alert',
    'investment_update',
    'report_ready',
    'message_received',
    'consultant_assignment',
    'subscription_update',
    'system_announcement',
    'goal_milestone',
    'connection_status'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- User Notification Preferences Table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type  notification_type NOT NULL,
  enabled            BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  push_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON user_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_type ON user_notification_preferences(notification_type);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_notification_preferences
DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON user_notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Add metadata_json column to alerts table to store notification_type
-- This allows us to track what type of notification each alert is
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'alerts' AND column_name = 'notification_type'
  ) THEN
    ALTER TABLE alerts ADD COLUMN notification_type notification_type;
    CREATE INDEX IF NOT EXISTS idx_alerts_notification_type ON alerts(notification_type);
  END IF;
END $$;

-- Add helpful comments
COMMENT ON TABLE user_notification_preferences IS 'User preferences for different types of notifications';
COMMENT ON COLUMN user_notification_preferences.enabled IS 'Whether this notification type is enabled at all';
COMMENT ON COLUMN user_notification_preferences.email_enabled IS 'Whether email notifications are enabled for this type';
COMMENT ON COLUMN user_notification_preferences.push_enabled IS 'Whether push/in-app notifications are enabled for this type';
