import crypto from 'crypto';
import { UserSession } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Session Service
 * Handles all session-related database operations for JWT token management
 */
class SessionService {
  /**
   * Hash a JWT token for secure storage using SHA-256
   * DEVELOPMENT MODE: Returns token as-is without hashing
   * @param {string} token - JWT token
   * @returns {string} Token (plain text in development)
   */
  hashToken(token) {
    // DEVELOPMENT MODE: No hashing - store tokens as plain text
    return token;
  }

  /**
   * Create a new session record
   * @param {string} userId - User UUID
   * @param {string} token - JWT token (will be hashed)
   * @param {Date} expiresAt - Session expiration timestamp
   * @returns {Promise<Object>} Created session object
   */
  async createSession(userId, token, expiresAt) {
    try {
      const tokenHash = this.hashToken(token);
      
      const session = await UserSession.create({
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
        is_revoked: false
      });

      return session;
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error('Failed to create session');
    }
  }

  /**
   * Revoke all active sessions for a user
   * @param {string} userId - User UUID
   * @returns {Promise<number>} Number of sessions revoked
   */
  async revokeAllUserSessions(userId) {
    try {
      const [updatedCount] = await UserSession.update(
        { is_revoked: true },
        {
          where: {
            user_id: userId,
            is_revoked: false
          }
        }
      );

      return updatedCount;
    } catch (error) {
      console.error('Error revoking user sessions:', error);
      throw new Error('Failed to revoke user sessions');
    }
  }

  /**
   * Revoke a specific session by token
   * @param {string} token - JWT token
   * @returns {Promise<boolean>} True if session was revoked, false if not found
   */
  async revokeSession(token) {
    try {
      const tokenHash = this.hashToken(token);
      
      const [updatedCount] = await UserSession.update(
        { is_revoked: true },
        {
          where: {
            token_hash: tokenHash,
            is_revoked: false
          }
        }
      );

      return updatedCount > 0;
    } catch (error) {
      console.error('Error revoking session:', error);
      throw new Error('Failed to revoke session');
    }
  }

  /**
   * Validate if a session is active (not revoked and not expired)
   * @param {string} token - JWT token
   * @returns {Promise<Object|null>} Session object if valid, null otherwise
   */
  async validateSession(token) {
    try {
      const tokenHash = this.hashToken(token);
      const now = new Date();

      const session = await UserSession.findOne({
        where: {
          token_hash: tokenHash,
          is_revoked: false,
          expires_at: {
            [Op.gt]: now
          }
        }
      });

      return session;
    } catch (error) {
      console.error('Error validating session:', error);
      throw new Error('Failed to validate session');
    }
  }

  /**
   * Update session with new token (for refresh)
   * @param {string} oldToken - Current JWT token
   * @param {string} newToken - New JWT token
   * @param {Date} newExpiresAt - New expiration timestamp
   * @returns {Promise<Object>} Updated session object
   */
  async updateSession(oldToken, newToken, newExpiresAt) {
    try {
      const oldTokenHash = this.hashToken(oldToken);
      const newTokenHash = this.hashToken(newToken);

      const session = await UserSession.findOne({
        where: {
          token_hash: oldTokenHash,
          is_revoked: false
        }
      });

      if (!session) {
        throw new Error('Session not found or already revoked');
      }

      await session.update({
        token_hash: newTokenHash,
        expires_at: newExpiresAt
      });

      return session;
    } catch (error) {
      console.error('Error updating session:', error);
      throw new Error('Failed to update session');
    }
  }
}

// Export singleton instance
export default new SessionService();
