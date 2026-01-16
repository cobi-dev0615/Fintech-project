-- schema.sql
-- Financial Consolidation Platform - Core Schema (PostgreSQL)
-- Recommended: run in a clean database. Use migrations for updates.

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- ENUMS
-- =========================
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'consultant', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE connection_provider AS ENUM ('open_finance', 'b3');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE connection_status AS ENUM ('connected', 'pending', 'needs_reauth', 'failed', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE subscription_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'paused');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE crm_stage AS ENUM ('lead', 'contacted', 'meeting', 'proposal', 'won', 'lost');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE alert_severity AS ENUM ('info', 'warning', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE report_type AS ENUM ('consolidated', 'transactions', 'monthly_evolution', 'advisor_custom');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE investment_source AS ENUM ('open_finance', 'b3', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE asset_class AS ENUM ('cash', 'fixed_income', 'equities', 'funds', 'etf', 'reit', 'derivatives', 'crypto', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =========================
-- BASE TABLES
-- =========================

-- Users (all types)
CREATE TABLE IF NOT EXISTS users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role               user_role NOT NULL,
  full_name          TEXT NOT NULL,
  email              TEXT NOT NULL UNIQUE,
  password_hash      TEXT, -- if using external auth, may be null
  phone              TEXT,
  country_code       TEXT DEFAULT 'BR',
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,

  -- optional profile fields
  birth_date         DATE,
  risk_profile       TEXT, -- e.g., conservative/moderate/aggressive (can be normalized later)

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Consultant profile (optional extra data)
CREATE TABLE IF NOT EXISTS consultant_profiles (
  user_id            UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  company_name       TEXT,
  certification      TEXT, -- CFP, etc.
  watermark_text     TEXT, -- for PDF reports
  calendly_url       TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customer linked to Consultant(s)
CREATE TABLE IF NOT EXISTS customer_consultants (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consultant_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- permission & relationship status
  is_primary         BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_all       BOOLEAN NOT NULL DEFAULT TRUE,
  can_message        BOOLEAN NOT NULL DEFAULT TRUE,
  can_generate_reports BOOLEAN NOT NULL DEFAULT TRUE,

  status             TEXT NOT NULL DEFAULT 'active', -- active/paused/revoked
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(customer_id, consultant_id)
);

CREATE INDEX IF NOT EXISTS idx_customer_consultants_customer ON customer_consultants(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_consultants_consultant ON customer_consultants(consultant_id);

-- =========================
-- PLANS, SUBSCRIPTIONS, PAYMENTS
-- =========================

CREATE TABLE IF NOT EXISTS plans (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code               TEXT NOT NULL UNIQUE, -- free/basic/pro/consultant/enterprise
  name               TEXT NOT NULL,
  price_cents        INTEGER NOT NULL DEFAULT 0,
  currency           TEXT NOT NULL DEFAULT 'BRL',
  connection_limit   INTEGER, -- null = unlimited
  features_json      JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coupons (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code               TEXT NOT NULL UNIQUE,
  percent_off        INTEGER, -- 0-100
  amount_off_cents   INTEGER,
  max_redemptions    INTEGER,
  redeemed_count     INTEGER NOT NULL DEFAULT 0,
  valid_from         TIMESTAMPTZ,
  valid_until        TIMESTAMPTZ,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id            UUID NOT NULL REFERENCES plans(id),
  status             subscription_status NOT NULL,
  started_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at        TIMESTAMPTZ,

  provider           TEXT, -- stripe/mercadopago
  provider_customer_id TEXT,
  provider_subscription_id TEXT,

  coupon_id          UUID REFERENCES coupons(id),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

CREATE TABLE IF NOT EXISTS payments (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id    UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_cents       INTEGER NOT NULL,
  currency           TEXT NOT NULL DEFAULT 'BRL',
  status             payment_status NOT NULL DEFAULT 'pending',
  paid_at            TIMESTAMPTZ,

  provider           TEXT,
  provider_payment_id TEXT,
  provider_payload   JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- =========================
-- CONNECTIONS (OPEN FINANCE / B3)
-- =========================

CREATE TABLE IF NOT EXISTS institutions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider           connection_provider NOT NULL,
  external_id        TEXT, -- e.g., Puggy institution id
  name               TEXT NOT NULL,
  logo_url           TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, external_id)
);

CREATE TABLE IF NOT EXISTS connections (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider           connection_provider NOT NULL,
  institution_id     UUID REFERENCES institutions(id),
  status             connection_status NOT NULL DEFAULT 'pending',

  -- Open Finance consent identifiers / B3 auth identifiers
  external_consent_id TEXT,
  external_account_id TEXT,

  scopes_json         JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at        TIMESTAMPTZ,
  last_sync_status    TEXT, -- ok/partial/error
  last_error          TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connections_user ON connections(user_id);
CREATE INDEX IF NOT EXISTS idx_connections_provider ON connections(provider);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);

-- =========================
-- BANK ACCOUNTS + TRANSACTIONS (Open Finance)
-- =========================

CREATE TABLE IF NOT EXISTS bank_accounts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connection_id      UUID REFERENCES connections(id) ON DELETE SET NULL,
  institution_id     UUID REFERENCES institutions(id),

  external_account_id TEXT, -- provider id
  account_type       TEXT,  -- checking/savings/etc.
  display_name       TEXT,
  currency           TEXT NOT NULL DEFAULT 'BRL',
  balance_cents      BIGINT NOT NULL DEFAULT 0,

  last_refreshed_at  TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, external_account_id)
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_user ON bank_accounts(user_id);

CREATE TABLE IF NOT EXISTS transactions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id         UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
  connection_id      UUID REFERENCES connections(id) ON DELETE SET NULL,

  external_tx_id     TEXT, -- provider transaction id
  occurred_at        TIMESTAMPTZ NOT NULL,
  description        TEXT,
  merchant           TEXT,
  category           TEXT,
  amount_cents       BIGINT NOT NULL, -- negative = expense, positive = income
  currency           TEXT NOT NULL DEFAULT 'BRL',

  raw_payload        JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, external_tx_id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_time ON transactions(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account_time ON transactions(account_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);

-- =========================
-- CREDIT CARDS + INVOICES (Open Finance)
-- =========================

CREATE TABLE IF NOT EXISTS credit_cards (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connection_id      UUID REFERENCES connections(id) ON DELETE SET NULL,
  institution_id     UUID REFERENCES institutions(id),

  external_card_id   TEXT,
  display_name       TEXT,
  brand              TEXT,
  last4              TEXT,
  currency           TEXT NOT NULL DEFAULT 'BRL',
  limit_cents        BIGINT,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, external_card_id)
);

CREATE INDEX IF NOT EXISTS idx_credit_cards_user ON credit_cards(user_id);

CREATE TABLE IF NOT EXISTS card_invoices (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id            UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  external_invoice_id TEXT,

  period_start       DATE,
  period_end         DATE,
  due_date           DATE,
  total_cents        BIGINT NOT NULL DEFAULT 0,
  minimum_cents      BIGINT,
  status             TEXT, -- open/closed/paid

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, external_invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_card_invoices_user_due ON card_invoices(user_id, due_date DESC);

CREATE TABLE IF NOT EXISTS invoice_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invoice_id         UUID NOT NULL REFERENCES card_invoices(id) ON DELETE CASCADE,

  external_item_id   TEXT,
  occurred_at        TIMESTAMPTZ,
  description        TEXT,
  merchant           TEXT,
  category           TEXT,
  amount_cents        BIGINT NOT NULL,
  currency           TEXT NOT NULL DEFAULT 'BRL',
  raw_payload        JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, external_item_id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

-- =========================
-- INVESTMENTS (Unified holdings)
-- =========================

CREATE TABLE IF NOT EXISTS assets (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol             TEXT, -- e.g., PETR4, IVVB11
  name               TEXT,
  class              asset_class NOT NULL DEFAULT 'other',
  currency           TEXT NOT NULL DEFAULT 'BRL',
  metadata_json      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(symbol, currency)
);

CREATE TABLE IF NOT EXISTS holdings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source             investment_source NOT NULL,
  connection_id      UUID REFERENCES connections(id) ON DELETE SET NULL,

  asset_id           UUID REFERENCES assets(id) ON DELETE SET NULL,
  asset_name_fallback TEXT, -- for cases without standardized asset
  quantity           NUMERIC(24,8) NOT NULL DEFAULT 0,
  avg_price_cents    BIGINT,
  current_price_cents BIGINT,
  market_value_cents BIGINT,
  pnl_cents          BIGINT,

  as_of_date         DATE, -- snapshot date

  raw_payload        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_holdings_user ON holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_user_asset ON holdings(user_id, asset_id);

-- B3 positions (optional more structured)
CREATE TABLE IF NOT EXISTS b3_positions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  connection_id      UUID REFERENCES connections(id) ON DELETE SET NULL,
  asset_id           UUID REFERENCES assets(id) ON DELETE SET NULL,
  quantity           NUMERIC(24,8) NOT NULL DEFAULT 0,
  avg_price_cents    BIGINT,
  last_sync_at       TIMESTAMPTZ,
  raw_payload        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_b3_positions_user ON b3_positions(user_id);

CREATE TABLE IF NOT EXISTS dividends (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset_id           UUID REFERENCES assets(id) ON DELETE SET NULL,
  pay_date           DATE,
  amount_cents       BIGINT NOT NULL DEFAULT 0,
  currency           TEXT NOT NULL DEFAULT 'BRL',
  description        TEXT,
  raw_payload        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dividends_user_date ON dividends(user_id, pay_date DESC);

CREATE TABLE IF NOT EXISTS corporate_events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID REFERENCES users(id) ON DELETE CASCADE,
  asset_id           UUID REFERENCES assets(id) ON DELETE SET NULL,
  event_date         DATE,
  event_type         TEXT, -- split, subscription, meeting, etc.
  description        TEXT,
  raw_payload        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_corporate_events_user_date ON corporate_events(user_id, event_date DESC);

-- =========================
-- GOALS + ALERTS/NOTIFICATIONS
-- =========================

CREATE TABLE IF NOT EXISTS goals (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  target_amount_cents BIGINT NOT NULL,
  current_amount_cents BIGINT NOT NULL DEFAULT 0,
  currency           TEXT NOT NULL DEFAULT 'BRL',
  target_date        DATE,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);

CREATE TABLE IF NOT EXISTS alerts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  severity           alert_severity NOT NULL DEFAULT 'info',
  title              TEXT NOT NULL,
  message            TEXT NOT NULL,
  is_read            BOOLEAN NOT NULL DEFAULT FALSE,
  link_url           TEXT, -- deep link to page
  metadata_json      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_user_read ON alerts(user_id, is_read, created_at DESC);

-- =========================
-- CONSULTANT: CRM + TASKS + NOTES
-- =========================

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

CREATE INDEX IF NOT EXISTS idx_crm_leads_consultant_stage ON crm_leads(consultant_id, stage);

CREATE TABLE IF NOT EXISTS tasks (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id        UUID REFERENCES users(id) ON DELETE SET NULL,
  title              TEXT NOT NULL,
  description        TEXT,
  due_at             TIMESTAMPTZ,
  is_done            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tasks_consultant_due ON tasks(consultant_id, is_done, due_at);

CREATE TABLE IF NOT EXISTS client_notes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note               TEXT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_notes_consultant_customer ON client_notes(consultant_id, customer_id, created_at DESC);

-- =========================
-- MESSAGING (simple internal chat)
-- =========================

CREATE TABLE IF NOT EXISTS conversations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consultant_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, consultant_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id    UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body               TEXT NOT NULL,
  is_read            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_time ON messages(conversation_id, created_at DESC);

-- =========================
-- REPORTS HISTORY
-- =========================

CREATE TABLE IF NOT EXISTS reports (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- who generated
  target_user_id     UUID REFERENCES users(id) ON DELETE SET NULL, -- customer for advisor reports
  type               report_type NOT NULL,
  params_json        JSONB NOT NULL DEFAULT '{}'::jsonb,
  file_url           TEXT, -- storage URL
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reports_owner_time ON reports(owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_target_time ON reports(target_user_id, created_at DESC);

-- =========================
-- ADMIN: INTEGRATION MONITORING + AUDIT LOGS
-- =========================

CREATE TABLE IF NOT EXISTS integration_health (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider           TEXT NOT NULL, -- puggy/b3/mercadopago/stripe/resend
  status             TEXT NOT NULL, -- ok/degraded/down
  checked_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  details_json       JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_integration_health_provider_time ON integration_health(provider, checked_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  action             TEXT NOT NULL, -- e.g., "user.block", "subscription.cancel"
  entity_type        TEXT,
  entity_id          UUID,
  metadata_json      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_time ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_time ON audit_logs(actor_user_id, created_at DESC);

-- =========================
-- UPDATED_AT TRIGGER (optional)
-- =========================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t RECORD;
BEGIN
  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN (
        'users','consultant_profiles','customer_consultants',
        'plans','coupons','subscriptions','payments',
        'institutions','connections',
        'bank_accounts','transactions',
        'credit_cards','card_invoices','invoice_items',
        'assets','holdings','b3_positions','dividends','corporate_events',
        'goals','alerts',
        'crm_leads','tasks','client_notes',
        'conversations',
        'integration_health'
      )
  LOOP
    EXECUTE format('
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger
          WHERE tgname = %L
        ) THEN
          CREATE TRIGGER %I
          BEFORE UPDATE ON %I
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
      END $$;',
      'trg_set_updated_at_' || t.tablename,
      'trg_set_updated_at_' || t.tablename,
      t.tablename
    );
  END LOOP;
END $$;

-- =========================
-- SEED PLANS (optional)
-- =========================
INSERT INTO plans (code, name, price_cents, currency, connection_limit, features_json)
VALUES
 ('free','Free',0,'BRL',1,'{"reports":"basic","alerts":true}'::jsonb),
 ('basic','Basic',2990,'BRL',3,'{"reports":"simple","alerts":true}'::jsonb),
 ('pro','Pro',7990,'BRL',10,'{"reports":"advanced","alerts":true,"ai":"enabled"}'::jsonb),
 ('consultant','Consultant',29990,'BRL',NULL,'{"white_label":true,"client_area":true}'::jsonb),
 ('enterprise','Enterprise',49990,'BRL',NULL,'{"api_access":true,"white_label":true}'::jsonb)
ON CONFLICT (code) DO NOTHING;
