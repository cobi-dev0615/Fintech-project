-- Migration: Update report_type enum to include all report types used by frontend
-- This migration adds new report types while keeping existing ones

-- First, check if we need to add new enum values
DO $$ 
BEGIN
  -- Add new report types if they don't exist
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'portfolio_analysis' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'report_type')) THEN
    ALTER TYPE report_type ADD VALUE 'portfolio_analysis';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'financial_planning' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'report_type')) THEN
    ALTER TYPE report_type ADD VALUE 'financial_planning';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'monthly' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'report_type')) THEN
    ALTER TYPE report_type ADD VALUE 'monthly';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'custom' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'report_type')) THEN
    ALTER TYPE report_type ADD VALUE 'custom';
  END IF;
END $$;

-- Ensure reports table exists with all necessary columns
CREATE TABLE IF NOT EXISTS reports (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  type               report_type NOT NULL,
  params_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
  file_url           TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_reports_owner_time ON reports(owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_target_time ON reports(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
