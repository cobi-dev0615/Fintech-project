-- Migration: Create conversations and messages tables for consultant-customer messaging
-- This migration creates the conversations and messages tables if they don't exist

-- Create conversations table if it doesn't exist
CREATE TABLE IF NOT EXISTS conversations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consultant_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, consultant_id)
);

-- Create messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS messages (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id    UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body               TEXT NOT NULL,
  is_read            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_time ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_conversations_consultant ON conversations(consultant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id, updated_at DESC);
