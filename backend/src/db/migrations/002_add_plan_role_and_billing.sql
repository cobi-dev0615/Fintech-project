-- Migration: Add role and billing period support to plans table
-- This migration adds columns to support role-based plans and monthly/annual billing

-- Add role column to plans (NULL means available for all roles)
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('customer', 'consultant') OR role IS NULL);

-- Add monthly and annual price columns
ALTER TABLE plans 
ADD COLUMN IF NOT EXISTS monthly_price_cents INTEGER,
ADD COLUMN IF NOT EXISTS annual_price_cents INTEGER;

-- Migrate existing price_cents to monthly_price_cents if monthly_price_cents is NULL
UPDATE plans 
SET monthly_price_cents = price_cents 
WHERE monthly_price_cents IS NULL;

-- Set annual_price_cents to 10x monthly (2 months free) if not set
UPDATE plans 
SET annual_price_cents = monthly_price_cents * 10 
WHERE annual_price_cents IS NULL AND monthly_price_cents > 0;

-- Set annual_price_cents to 0 if monthly is 0
UPDATE plans 
SET annual_price_cents = 0 
WHERE annual_price_cents IS NULL;

-- Create index on role for faster filtering
CREATE INDEX IF NOT EXISTS idx_plans_role ON plans(role);

-- Example: Update existing plans to have role assignments
-- Customer plans (free, basic, pro)
UPDATE plans SET role = 'customer' WHERE code IN ('free', 'basic', 'pro');

-- Consultant plans
UPDATE plans SET role = 'consultant' WHERE code IN ('consultant', 'enterprise');
