-- Migration: Fix users created from failed Google OAuth attempts
-- Created: 2025-01-26
-- Description: Sets users with NULL password_hash (OAuth users) to pending/inactive if they don't have approval

-- Set OAuth users (password_hash is NULL) to pending approval and inactive
-- unless they are auto-approved test accounts
UPDATE users 
SET approval_status = 'pending',
    is_active = false,
    updated_at = NOW()
WHERE password_hash IS NULL
  AND approval_status = 'approved'
  AND is_active = true
  AND LOWER(email) NOT IN ('admin@zurt.com', 'customer@zurt.com', 'consultant@zurt.com')
  AND email LIKE '%@gmail.com'; -- Only Gmail users (Google OAuth)
