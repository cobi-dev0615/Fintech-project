-- Migration: Auto-approve and activate test accounts
-- Created: 2025-01-26
-- Description: Sets approval_status to 'approved' and is_active to true for specific test accounts

-- Auto-approve and activate specific test accounts
UPDATE users 
SET approval_status = 'approved', 
    is_active = true,
    updated_at = NOW()
WHERE LOWER(email) IN ('admin@zurt.com', 'customer@zurt.com', 'consultant@zurt.com')
  AND (approval_status != 'approved' OR is_active = false);
