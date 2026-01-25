-- Migration to add comment_received notification type
DO $$ 
BEGIN
  -- Check if the enum value already exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'comment_received' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')
  ) THEN
    ALTER TYPE notification_type ADD VALUE 'comment_received';
  END IF;
END $$;
