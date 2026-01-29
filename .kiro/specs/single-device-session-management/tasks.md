# Implementation Plan: Single Device Session Management

## Overview

This implementation plan breaks down the single-device session management feature into discrete coding tasks. The approach follows a layered implementation: first building the session service layer, then enhancing the authentication middleware, and finally integrating with the login/logout flows. Each task builds incrementally on previous work, with testing integrated throughout.

## Tasks

- [x] 1. Create session service with core session management functions
  - Create `src/services/sessionService.js` file
  - Implement `hashToken()` method using Node.js crypto SHA-256
  - Implement `createSession(userId, token, expiresAt)` method to insert session records
  - Implement `revokeAllUserSessions(userId)` method to mark all user sessions as revoked
  - Implement `revokeSession(token)` method to revoke a specific session
  - Implement `validateSession(token)` method to check if session is active and not expired
  - Implement `updateSession(oldToken, newToken, newExpiresAt)` method for token refresh
  - Import and use the existing UserSession model from `src/models/index.js`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 8.2, 8.4_

- [x] 1.1 Write property test for session service
  - **Property 2: Session Revocation Completeness**
  - **Validates: Requirements 1.1, 1.2, 1.3**
  - Generate random user ID and array of active sessions
  - Call `revokeAllUserSessions(userId)`
  - Assert all sessions have `is_revoked=true`
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 1.2 Write property test for token hashing consistency
  - **Property 3: Token-Session Correspondence (partial)**
  - **Validates: Requirements 2.1, 2.2**
  - Generate random JWT token strings
  - Call `hashToken()` multiple times with same input
  - Assert hash output is consistent and has correct length (64 chars for SHA-256)
  - _Requirements: 2.1, 2.2_

- [x] 1.3 Write unit tests for session service edge cases
  - Test creating session with invalid user ID
  - Test revoking sessions for user with no sessions
  - Test validating expired session returns null
  - Test validating revoked session returns null
  - Test updating non-existent session
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2_

- [x] 2. Enhance authentication middleware to validate sessions
  - Modify `src/middleware/auth.js` `authenticateToken()` function
  - After JWT verification, extract token from Authorization header
  - Call `sessionService.validateSession(token)` to check session status
  - If session is null or invalid, return 401 with appropriate error code (SESSION_REVOKED, SESSION_EXPIRED, or SESSION_NOT_FOUND)
  - If session is valid, continue with existing flow
  - Add error handling for database errors during session validation
  - Import sessionService at top of file
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2.1 Write property test for session validation rejection
  - **Property 4: Session Validation Rejection**
  - **Validates: Requirements 3.2, 3.3, 5.4**
  - Generate random revoked and expired sessions
  - Create mock requests with corresponding JWT tokens
  - Call authentication middleware
  - Assert requests are rejected with 401 status
  - _Requirements: 3.2, 3.3, 5.4_

- [x] 2.2 Write property test for revoked session rejection
  - **Property 8: Revoked Session Rejection**
  - **Validates: Requirements 3.2, 5.4, 8.3**
  - Generate random sessions marked as `is_revoked=true`
  - Create valid JWT tokens for these sessions
  - Attempt API requests with these tokens
  - Assert all requests are rejected with SESSION_REVOKED error
  - _Requirements: 3.2, 5.4, 8.3_

- [x] 2.3 Write unit tests for authentication middleware
  - Test valid JWT with active session allows request
  - Test valid JWT with revoked session denies request
  - Test valid JWT with expired session denies request
  - Test valid JWT with no session record denies request
  - Test missing Authorization header denies request
  - Test malformed token denies request
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Update login endpoint to manage sessions
  - Modify `src/routes/auth.js` POST `/login` endpoint
  - After successful credential validation, call `sessionService.revokeAllUserSessions(user.id)` before generating JWT
  - After generating JWT token, extract expiration time from JWT payload
  - Call `sessionService.createSession(user.id, token, expiresAt)` to create new session
  - Add error handling for session creation failures (log error, return 500 with SESSION_CREATION_FAILED)
  - Ensure JWT token is still returned in the same format as before
  - Import sessionService at top of file
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3_

- [x] 3.1 Write property test for single active session invariant
  - **Property 1: Single Active Session Invariant**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
  - Generate random user with random number of existing sessions
  - Perform login for that user
  - Query database for active sessions for that user
  - Assert exactly one active (non-revoked, non-expired) session exists
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3.2 Write property test for session expiration consistency
  - **Property 6: Session Expiration Consistency**
  - **Validates: Requirements 2.3, 6.1, 6.2**
  - Generate random JWT expiration times
  - Perform login with different JWT expiration configurations
  - Query created session from database
  - Assert session `expires_at` matches JWT `exp` claim
  - _Requirements: 2.3, 6.1, 6.2_

- [x] 3.3 Write unit tests for login flow
  - Test login with no existing sessions creates one session
  - Test login with multiple existing sessions revokes all and creates one new session
  - Test login returns JWT token in expected format
  - Test session creation failure returns appropriate error
  - Test session record has correct user_id, token_hash, expires_at, and is_revoked=false
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 4. Update logout endpoint to revoke sessions
  - Modify `src/routes/auth.js` POST `/logout` endpoint
  - Extract token from Authorization header in request
  - Call `sessionService.revokeSession(token)` to mark session as revoked
  - Return success response as before
  - Add error handling for session revocation failures
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 4.1 Write property test for logout session revocation
  - **Property 5: Logout Session Revocation**
  - **Validates: Requirements 5.1, 5.2**
  - Generate random active sessions
  - Call logout endpoint with session tokens
  - Query sessions from database
  - Assert all sessions have `is_revoked=true`
  - _Requirements: 5.1, 5.2_

- [x] 4.2 Write unit tests for logout flow
  - Test logout marks session as revoked in database
  - Test logout returns success response
  - Test subsequent API request with revoked token fails
  - Test logout with invalid token handles gracefully
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5. Update token refresh endpoint to maintain sessions
  - Modify `src/routes/auth.js` POST `/refresh` endpoint
  - Extract current token from Authorization header
  - Validate current session is active using `sessionService.validateSession(token)`
  - If session is revoked or expired, return 401 error
  - Generate new JWT token as before
  - Extract new expiration time from new JWT payload
  - Call `sessionService.updateSession(oldToken, newToken, newExpiresAt)` to update session
  - Return new token in response
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 5.1 Write property test for token refresh session continuity
  - **Property 7: Token Refresh Session Continuity**
  - **Validates: Requirements 8.2, 8.4**
  - Generate random active sessions
  - Call token refresh endpoint
  - Query session from database before and after refresh
  - Assert session ID remains unchanged
  - Assert token_hash and expires_at are updated
  - _Requirements: 8.2, 8.4_

- [x] 5.2 Write unit tests for token refresh flow
  - Test refresh with active session succeeds and returns new token
  - Test refresh with revoked session fails with 401
  - Test refresh with expired session fails with 401
  - Test refresh updates session record with new token hash
  - Test refresh maintains same session ID
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 6. Add integration tests for multi-device login scenario
  - Create test file `src/routes/__tests__/auth.multidevice.test.js`
  - Test: Login from device A, then login from device B, verify device A token is rejected
  - Test: Login, logout, attempt API request with old token, verify rejection
  - Test: Login, refresh token, verify old token rejected and new token works
  - Test: Simulate concurrent logins, verify only last login's session is active
  - _Requirements: 1.1, 3.2, 5.4, 8.1_

- [x] 7. Checkpoint - Ensure all tests pass
  - Run all unit tests and property-based tests
  - Verify session service functions work correctly
  - Verify authentication middleware validates sessions
  - Verify login/logout/refresh flows manage sessions properly
  - Ask the user if questions arise

- [x] 8. Add database indexes for session performance (if not already present)
  - Check if index on `user_sessions.token_hash` exists
  - Check if index on `user_sessions.user_id` exists
  - Add indexes if missing using Sequelize migrations or raw SQL
  - Document index creation in migration file
  - _Requirements: 4.4_

- [x] 9. Add session cleanup utility
  - Create `src/services/sessionCleanupService.js`
  - Implement method to delete or archive sessions older than 30 days
  - Add scheduled job or manual cleanup script
  - _Requirements: 6.3_

- [x] 10. Final checkpoint - Integration testing and verification
  - Test complete login flow from multiple devices
  - Verify session revocation works correctly
  - Verify error messages are appropriate and don't expose sensitive data
  - Test token refresh maintains session continuity
  - Ensure all tests pass
  - Ask the user if questions arise
