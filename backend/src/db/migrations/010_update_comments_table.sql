-- Migration to update comments table with title and status
ALTER TABLE comments ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE comments ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES users(id) ON DELETE SET NULL;
