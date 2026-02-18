-- Add flag to prevent Pluggy sync from overwriting user-set categories
ALTER TABLE pluggy_transactions
  ADD COLUMN IF NOT EXISTS category_is_manual BOOLEAN NOT NULL DEFAULT false;
