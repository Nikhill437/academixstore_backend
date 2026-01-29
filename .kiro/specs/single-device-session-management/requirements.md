# Requirements Document

## Introduction

This document specifies the requirements for implementing single-device session management in the educational book subscription system. The feature ensures that when a user logs in from a new mobile device, they are automatically logged out from any previously logged-in device, maintaining a single active session per user at any given time.

## Glossary

- **System**: The educational book subscription backend API
- **User**: Any authenticated user in the system (super_admin, college_admin, student, or user role)
- **Session**: An authenticated connection between a user and the system, represented by a JWT token and tracked in the user_sessions table
- **Device**: A mobile device or client application from which a user accesses the system
- **Active_Session**: A session that is not expired and not revoked
- **Token_Hash**: A hashed representation of the JWT token stored in the database for session tracking
- **Session_Revocation**: The process of marking a session as invalid, preventing further API access with that session's token

## Requirements

### Requirement 1: Single Active Session Enforcement

**User Story:** As a system administrator, I want to ensure only one device can be logged in per user account at a time, so that account security is maintained and unauthorized access is prevented.

#### Acceptance Criteria

1. WHEN a user logs in from a new device, THE System SHALL revoke all existing active sessions for that user
2. WHEN a user's session is revoked, THE System SHALL mark the session as revoked in the user_sessions table
3. WHEN multiple active sessions exist for a user at login time, THE System SHALL revoke all of them before creating the new session
4. THE System SHALL create exactly one new active session record when a user successfully logs in

### Requirement 2: Session Tracking and Storage

**User Story:** As a developer, I want all user sessions to be tracked in the database, so that I can manage and revoke sessions as needed.

#### Acceptance Criteria

1. WHEN a user successfully logs in, THE System SHALL create a session record in the user_sessions table
2. THE System SHALL store a hashed version of the JWT token in the session record
3. THE System SHALL store the session expiration time matching the JWT token expiration
4. THE System SHALL associate each session with the user_id of the authenticated user
5. WHEN creating a session record, THE System SHALL set is_revoked to false by default

### Requirement 3: Session Validation on API Requests

**User Story:** As a user, I want to be immediately logged out from my old device when I log in from a new device, so that my account remains secure.

#### Acceptance Criteria

1. WHEN an API request includes a JWT token, THE System SHALL verify the token exists in the user_sessions table
2. WHEN a session is marked as revoked, THE System SHALL reject API requests using that session's token
3. WHEN a session is expired, THE System SHALL reject API requests using that session's token
4. WHEN a valid non-revoked session is found, THE System SHALL allow the API request to proceed
5. WHEN no session record exists for a valid JWT token, THE System SHALL reject the API request

### Requirement 4: Login Flow Integration

**User Story:** As a user, I want my login process to remain fast and seamless, so that the security improvements don't impact my experience.

#### Acceptance Criteria

1. WHEN a user submits valid login credentials, THE System SHALL complete the session revocation and creation process before returning the JWT token
2. THE System SHALL return the same JWT token format and structure as the current implementation
3. WHEN session operations fail, THE System SHALL log the error and return an appropriate error response
4. THE System SHALL complete the entire login process including session management within 2 seconds under normal conditions

### Requirement 5: Logout Flow Enhancement

**User Story:** As a user, I want my logout action to properly invalidate my session, so that my token cannot be reused after logout.

#### Acceptance Criteria

1. WHEN a user logs out, THE System SHALL revoke the current session in the user_sessions table
2. WHEN a user logs out, THE System SHALL mark the session's is_revoked field as true
3. WHEN logout is successful, THE System SHALL return a success response
4. WHEN a revoked session token is used, THE System SHALL return an authentication error

### Requirement 6: Session Cleanup and Maintenance

**User Story:** As a system administrator, I want expired sessions to be properly managed, so that the database doesn't accumulate stale session records indefinitely.

#### Acceptance Criteria

1. THE System SHALL consider sessions expired when the current time exceeds the expires_at timestamp
2. WHEN validating a session, THE System SHALL check both the is_revoked flag and the expires_at timestamp
3. WHERE a cleanup mechanism is implemented, THE System SHALL remove or archive sessions older than 30 days
4. THE System SHALL handle expired sessions gracefully without requiring manual intervention

### Requirement 7: Error Handling and Security

**User Story:** As a security-conscious user, I want clear feedback when my session is invalid, so that I know when to log in again.

#### Acceptance Criteria

1. WHEN a revoked session token is used, THE System SHALL return a 401 status code with error code 'SESSION_REVOKED'
2. WHEN an expired session token is used, THE System SHALL return a 401 status code with error code 'SESSION_EXPIRED'
3. WHEN a session is not found for a valid JWT, THE System SHALL return a 401 status code with error code 'SESSION_NOT_FOUND'
4. WHEN session validation fails, THE System SHALL not expose sensitive session information in error messages
5. THE System SHALL log all session validation failures for security monitoring

### Requirement 8: Token Refresh Compatibility

**User Story:** As a user, I want my token refresh requests to work with the session management system, so that I can maintain my authenticated state without re-logging in.

#### Acceptance Criteria

1. WHEN a user requests a token refresh, THE System SHALL validate the current session is active and not revoked
2. WHEN a token refresh is successful, THE System SHALL update the existing session record with the new token hash and expiration time
3. WHEN a token refresh is attempted with a revoked session, THE System SHALL reject the request
4. THE System SHALL maintain the same session ID when refreshing tokens
