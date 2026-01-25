-- Migration: Add approval_status to users table
-- Created: 2024-02-17
-- Description: Adds approval_status field to track user registration approval

-- Create enum type for approval status
DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add approval_status column to users table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'approval_status'
  ) THEN
    -- Add approval_status column with default 'pending' for new users
    ALTER TABLE users ADD COLUMN approval_status approval_status DEFAULT 'pending';
    
    -- Set existing users to 'approved' (grandfather clause)
    UPDATE users SET approval_status = 'approved' WHERE approval_status IS NULL;
    
    -- Make the column NOT NULL after setting defaults
    ALTER TABLE users ALTER COLUMN approval_status SET NOT NULL;
    
    -- Create index for faster queries
    CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users(approval_status);
  END IF;
END $$;
