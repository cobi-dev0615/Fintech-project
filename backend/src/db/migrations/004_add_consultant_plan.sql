-- Migration: Add consultant plan similar to customer plans structure
-- This migration adds a new consultant plan with monthly and annual pricing

-- Add a new consultant plan similar to customer "basic" plan structure
-- This plan will be for consultants who need basic features
INSERT INTO plans (code, name, price_cents, monthly_price_cents, annual_price_cents, currency, connection_limit, features_json, is_active, role)
VALUES (
  'consultant-basic',
  'Consultant Básico',
  19990, -- price_cents (legacy, will use monthly_price_cents)
  19990, -- monthly_price_cents (R$199.90/month)
  199900, -- annual_price_cents (R$1,999.00/year - 10x monthly, 2 months free)
  'BRL',
  5, -- connection_limit
  '{"features":["5 conexões bancárias","Dashboard de clientes","Relatórios mensais","Suporte por email","Área do cliente básica"]}'::jsonb,
  true,
  'consultant'
)
ON CONFLICT (code) DO UPDATE
SET 
  name = EXCLUDED.name,
  price_cents = EXCLUDED.price_cents,
  monthly_price_cents = EXCLUDED.monthly_price_cents,
  annual_price_cents = EXCLUDED.annual_price_cents,
  connection_limit = EXCLUDED.connection_limit,
  features_json = EXCLUDED.features_json,
  is_active = EXCLUDED.is_active,
  role = EXCLUDED.role,
  updated_at = now();

-- Ensure existing consultant plans have monthly and annual pricing set
-- Update consultant plan (if it exists)
UPDATE plans 
SET 
  monthly_price_cents = COALESCE(monthly_price_cents, price_cents),
  annual_price_cents = COALESCE(annual_price_cents, 
    CASE 
      WHEN price_cents > 0 THEN price_cents * 10 
      ELSE 0 
    END
  ),
  updated_at = now()
WHERE code = 'consultant' AND role = 'consultant';

-- Update enterprise plan (if it exists)
UPDATE plans 
SET 
  monthly_price_cents = COALESCE(monthly_price_cents, price_cents),
  annual_price_cents = COALESCE(annual_price_cents, 
    CASE 
      WHEN price_cents > 0 THEN price_cents * 10 
      ELSE 0 
    END
  ),
  updated_at = now()
WHERE code = 'enterprise' AND role = 'consultant';
