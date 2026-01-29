-- Add balance field to pluggy_credit_cards table
-- Balance represents the current invoice balance (amount used/owed)
ALTER TABLE pluggy_credit_cards
ADD COLUMN IF NOT EXISTS balance NUMERIC(15, 2) DEFAULT 0;
