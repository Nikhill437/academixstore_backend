-- Migration: Add index on user_sessions.token_hash for fast session validation
-- Feature: single-device-session-management
-- Date: 2025-01-25

-- Add index on token_hash for fast session lookup during authentication
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);

-- This index improves performance of session validation queries:
-- SELECT * FROM user_sessions WHERE token_hash = ? AND is_revoked = false AND expires_at > NOW();
