-- Migration: Add is_revoked column to user_sessions table
-- Date: 2026-02-04
-- Description: Adds the is_revoked column to support session revocation for single-device login

-- Add is_revoked column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_sessions' 
        AND column_name = 'is_revoked'
    ) THEN
        ALTER TABLE user_sessions 
        ADD COLUMN is_revoked BOOLEAN DEFAULT false;
        
        -- Update existing sessions to not be revoked
        UPDATE user_sessions SET is_revoked = false WHERE is_revoked IS NULL;
        
        RAISE NOTICE 'Column is_revoked added to user_sessions table';
    ELSE
        RAISE NOTICE 'Column is_revoked already exists in user_sessions table';
    END IF;
END $$;

-- Add index for performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_revoked ON user_sessions(is_revoked);
