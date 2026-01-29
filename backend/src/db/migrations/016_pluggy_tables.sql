-- =========================
-- PLUGGY DATA TABLES
-- =========================

-- Pluggy Accounts
CREATE TABLE IF NOT EXISTS pluggy_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  pluggy_account_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- checking/savings/etc.
  currency TEXT NOT NULL DEFAULT 'BRL',
  current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
  available_balance NUMERIC(15, 2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, pluggy_account_id)
);

CREATE INDEX IF NOT EXISTS idx_pluggy_accounts_user ON pluggy_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_pluggy_accounts_item ON pluggy_accounts(item_id);

-- Pluggy Transactions
CREATE TABLE IF NOT EXISTS pluggy_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  pluggy_transaction_id TEXT NOT NULL,
  pluggy_account_id TEXT NOT NULL,
  date DATE NOT NULL,
  amount NUMERIC(15, 2) NOT NULL, -- signed (negative = expense, positive = income)
  description TEXT,
  category TEXT,
  merchant TEXT,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, pluggy_transaction_id)
);

CREATE INDEX IF NOT EXISTS idx_pluggy_transactions_user ON pluggy_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_pluggy_transactions_item ON pluggy_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_pluggy_transactions_account ON pluggy_transactions(pluggy_account_id);
CREATE INDEX IF NOT EXISTS idx_pluggy_transactions_date ON pluggy_transactions(date DESC);

-- Pluggy Investments
CREATE TABLE IF NOT EXISTS pluggy_investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  pluggy_investment_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- fund/cdb/lci/etc.
  quantity NUMERIC(15, 4),
  unit_price NUMERIC(15, 2),
  current_value NUMERIC(15, 2) NOT NULL DEFAULT 0,
  profitability NUMERIC(15, 4),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, pluggy_investment_id)
);

CREATE INDEX IF NOT EXISTS idx_pluggy_investments_user ON pluggy_investments(user_id);
CREATE INDEX IF NOT EXISTS idx_pluggy_investments_item ON pluggy_investments(item_id);

-- Pluggy Credit Cards
CREATE TABLE IF NOT EXISTS pluggy_credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  pluggy_card_id TEXT NOT NULL,
  brand TEXT,
  last4 TEXT,
  "limit" NUMERIC(15, 2),
  available_limit NUMERIC(15, 2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, pluggy_card_id)
);

CREATE INDEX IF NOT EXISTS idx_pluggy_credit_cards_user ON pluggy_credit_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_pluggy_credit_cards_item ON pluggy_credit_cards(item_id);

-- Pluggy Card Invoices
CREATE TABLE IF NOT EXISTS pluggy_card_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pluggy_invoice_id TEXT NOT NULL,
  pluggy_card_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  due_date DATE,
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  status TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(pluggy_invoice_id)
);

CREATE INDEX IF NOT EXISTS idx_pluggy_card_invoices_user ON pluggy_card_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_pluggy_card_invoices_card ON pluggy_card_invoices(pluggy_card_id);
CREATE INDEX IF NOT EXISTS idx_pluggy_card_invoices_item ON pluggy_card_invoices(item_id);
