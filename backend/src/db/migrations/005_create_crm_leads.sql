-- Migration: Create CRM leads table and enum type for consultant pipeline
-- This migration creates the crm_stage enum type and crm_leads table if they don't exist

-- Create crm_stage enum type if it doesn't exist
DO $$ BEGIN
  CREATE TYPE crm_stage AS ENUM ('lead', 'contacted', 'meeting', 'proposal', 'won', 'lost');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create crm_leads table if it doesn't exist
CREATE TABLE IF NOT EXISTS crm_leads (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id        UUID REFERENCES users(id) ON DELETE SET NULL, -- may be linked later
  full_name          TEXT,
  email              TEXT,
  phone              TEXT,
  stage              crm_stage NOT NULL DEFAULT 'lead',
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_crm_leads_consultant_stage ON crm_leads(consultant_id, stage);
CREATE INDEX IF NOT EXISTS idx_crm_leads_consultant_id ON crm_leads(consultant_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_stage ON crm_leads(stage);
