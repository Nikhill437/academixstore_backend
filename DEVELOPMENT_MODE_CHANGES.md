# Development Mode Changes - No Hashing

## Overview
For development phase, both passwords and tokens are now stored as plain text (no hashing) to make debugging easier.

## Changes Made

### 1. Password Storage (Already Implemented)
- **Status**: ✅ Already done
- **Location**: `src/models/User.js`
- **Details**: 
  - Passwords stored in `password_hash` field as plain text
  - `User.prototype.comparePassword()` does simple string comparison: `password === this.password_hash`
  - No bcrypt or hashing applied

### 2. Token Storage (Just Implemented)
- **Status**: ✅ Completed
- **Location**: `src/services/sessionService.js`
- **Changes**:
  - Modified `hashToken(token)` method to return token as-is (no SHA-256 hashing)
  - Tokens now stored in `user_sessions.token_hash` column as plain text
  - All session operations (create, validate, revoke, update) now use plain tokens

### 3. Test Updates
- **Status**: ✅ Completed
- **Location**: `src/services/__tests__/sessionService.test.js`
- **Changes**:
  - Updated all tests to expect plain text tokens instead of SHA-256 hashes
  - Removed crypto import (no longer needed)
  - All 11 tests passing

### 4. Database Schema
- **Status**: ✅ No changes needed
- **Location**: `database/schema.sql`
- **Details**:
  - `user_sessions.token_hash` column is `VARCHAR(255)`
  - This is sufficient for full JWT tokens (typically 200-300 characters)
  - Previously stored 64-character SHA-256 hashes, now stores full tokens

## How It Works Now

### Login Flow
1. User provides email and password
2. Password compared directly: `password === user.password_hash`
3. JWT token generated
4. Token stored as-is in `user_sessions.token_hash` (no hashing)
5. Token returned to client

### Authentication Flow
1. Client sends JWT token in Authorization header
2. JWT verified and decoded
3. Token looked up in `user_sessions` table (exact match, no hashing)
4. Session validated (not revoked, not expired)
5. Request proceeds if valid

### Logout Flow
1. Client sends JWT token
2. Token looked up in `user_sessions` table (exact match)
3. Session marked as `is_revoked = true`

### Token Refresh Flow
1. Client sends old JWT token
2. Old token validated in `user_sessions` table
3. New JWT token generated
4. Session updated with new token (plain text)
5. New token returned to client

## Files Modified

1. `src/services/sessionService.js` - Disabled token hashing
2. `src/services/__tests__/sessionService.test.js` - Updated tests for plain text

## Files Checked (No Changes Needed)

1. `src/routes/auth.js` - Uses sessionService, works with plain tokens
2. `src/middleware/auth.js` - Uses sessionService, works with plain tokens
3. `src/models/User.js` - Already using plain text passwords
4. `database/schema.sql` - Column size already sufficient

## Testing

All tests pass:
```bash
npm test -- src/services/__tests__/sessionService.test.js
```

Result: ✅ 11 tests passed

## Security Warning

⚠️ **IMPORTANT**: This configuration is for DEVELOPMENT ONLY!

Before deploying to production:
1. Re-enable password hashing (bcrypt) in `src/models/User.js`
2. Re-enable token hashing (SHA-256) in `src/services/sessionService.js`
3. Update tests accordingly
4. Consider using environment variable to toggle hashing based on NODE_ENV

## Benefits for Development

1. **Easy Debugging**: Can see actual tokens in database
2. **Simple Testing**: Can manually test with known tokens
3. **Quick Verification**: Can check session state directly in database
4. **No Crypto Overhead**: Faster development iterations

## Next Steps

When ready for production:
1. Add environment check: `if (process.env.NODE_ENV === 'production')`
2. Enable hashing only in production
3. Update database migration if needed
4. Run full test suite
