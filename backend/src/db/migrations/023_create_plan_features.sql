-- Migration: Create plan_features table for feature-based plan restrictions
-- Each row maps a plan to a feature with a limit value:
--   null  = unlimited access
--   0     = blocked (feature not available)
--   > 0   = max count (e.g., 3 reports/month, 1 goal)

CREATE TABLE IF NOT EXISTS plan_features (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id       UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  feature_code  TEXT NOT NULL,
  limit_value   INTEGER,
  UNIQUE(plan_id, feature_code)
);

CREATE INDEX IF NOT EXISTS idx_plan_features_plan ON plan_features(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_features_code ON plan_features(feature_code);

-- Seed feature limits for all plans
-- Feature codes: connections, reports, goals, ai, alerts, b3, calculators,
--   messages, clients, pipeline, invitations, simulator, whitelabel, api_access

DO $$
DECLARE
  v_plan_id UUID;
BEGIN
  -- ── FREE ──────────────────────────────────────────────
  SELECT id INTO v_plan_id FROM plans WHERE code = 'free';
  IF v_plan_id IS NOT NULL THEN
    INSERT INTO plan_features (plan_id, feature_code, limit_value) VALUES
      (v_plan_id, 'connections',  1),
      (v_plan_id, 'reports',      0),
      (v_plan_id, 'goals',        1),
      (v_plan_id, 'ai',           0),
      (v_plan_id, 'alerts',       0),
      (v_plan_id, 'b3',           0),
      (v_plan_id, 'calculators',  1),
      (v_plan_id, 'messages',     0),
      (v_plan_id, 'clients',      0),
      (v_plan_id, 'pipeline',     0),
      (v_plan_id, 'invitations',  0),
      (v_plan_id, 'simulator',    0),
      (v_plan_id, 'whitelabel',   0),
      (v_plan_id, 'api_access',   0)
    ON CONFLICT (plan_id, feature_code) DO UPDATE SET limit_value = EXCLUDED.limit_value;
  END IF;

  -- ── BASIC ─────────────────────────────────────────────
  SELECT id INTO v_plan_id FROM plans WHERE code = 'basic';
  IF v_plan_id IS NOT NULL THEN
    INSERT INTO plan_features (plan_id, feature_code, limit_value) VALUES
      (v_plan_id, 'connections',  3),
      (v_plan_id, 'reports',      3),
      (v_plan_id, 'goals',        3),
      (v_plan_id, 'ai',           0),
      (v_plan_id, 'alerts',       0),
      (v_plan_id, 'b3',           NULL),
      (v_plan_id, 'calculators',  NULL),
      (v_plan_id, 'messages',     NULL),
      (v_plan_id, 'clients',      0),
      (v_plan_id, 'pipeline',     0),
      (v_plan_id, 'invitations',  0),
      (v_plan_id, 'simulator',    0),
      (v_plan_id, 'whitelabel',   0),
      (v_plan_id, 'api_access',   0)
    ON CONFLICT (plan_id, feature_code) DO UPDATE SET limit_value = EXCLUDED.limit_value;
  END IF;

  -- ── PRO ───────────────────────────────────────────────
  SELECT id INTO v_plan_id FROM plans WHERE code = 'pro';
  IF v_plan_id IS NOT NULL THEN
    INSERT INTO plan_features (plan_id, feature_code, limit_value) VALUES
      (v_plan_id, 'connections',  10),
      (v_plan_id, 'reports',      NULL),
      (v_plan_id, 'goals',        NULL),
      (v_plan_id, 'ai',           NULL),
      (v_plan_id, 'alerts',       NULL),
      (v_plan_id, 'b3',           NULL),
      (v_plan_id, 'calculators',  NULL),
      (v_plan_id, 'messages',     NULL),
      (v_plan_id, 'clients',      0),
      (v_plan_id, 'pipeline',     0),
      (v_plan_id, 'invitations',  0),
      (v_plan_id, 'simulator',    0),
      (v_plan_id, 'whitelabel',   0),
      (v_plan_id, 'api_access',   0)
    ON CONFLICT (plan_id, feature_code) DO UPDATE SET limit_value = EXCLUDED.limit_value;
  END IF;

  -- ── CONSULTANT ────────────────────────────────────────
  SELECT id INTO v_plan_id FROM plans WHERE code = 'consultant';
  IF v_plan_id IS NOT NULL THEN
    INSERT INTO plan_features (plan_id, feature_code, limit_value) VALUES
      (v_plan_id, 'connections',  NULL),
      (v_plan_id, 'reports',      NULL),
      (v_plan_id, 'goals',        NULL),
      (v_plan_id, 'ai',           NULL),
      (v_plan_id, 'alerts',       NULL),
      (v_plan_id, 'b3',           NULL),
      (v_plan_id, 'calculators',  NULL),
      (v_plan_id, 'messages',     NULL),
      (v_plan_id, 'clients',      NULL),
      (v_plan_id, 'pipeline',     NULL),
      (v_plan_id, 'invitations',  NULL),
      (v_plan_id, 'simulator',    NULL),
      (v_plan_id, 'whitelabel',   NULL),
      (v_plan_id, 'api_access',   0)
    ON CONFLICT (plan_id, feature_code) DO UPDATE SET limit_value = EXCLUDED.limit_value;
  END IF;

  -- ── ENTERPRISE ────────────────────────────────────────
  SELECT id INTO v_plan_id FROM plans WHERE code = 'enterprise';
  IF v_plan_id IS NOT NULL THEN
    INSERT INTO plan_features (plan_id, feature_code, limit_value) VALUES
      (v_plan_id, 'connections',  NULL),
      (v_plan_id, 'reports',      NULL),
      (v_plan_id, 'goals',        NULL),
      (v_plan_id, 'ai',           NULL),
      (v_plan_id, 'alerts',       NULL),
      (v_plan_id, 'b3',           NULL),
      (v_plan_id, 'calculators',  NULL),
      (v_plan_id, 'messages',     NULL),
      (v_plan_id, 'clients',      NULL),
      (v_plan_id, 'pipeline',     NULL),
      (v_plan_id, 'invitations',  NULL),
      (v_plan_id, 'simulator',    NULL),
      (v_plan_id, 'whitelabel',   NULL),
      (v_plan_id, 'api_access',   NULL)
    ON CONFLICT (plan_id, feature_code) DO UPDATE SET limit_value = EXCLUDED.limit_value;
  END IF;
END $$;
