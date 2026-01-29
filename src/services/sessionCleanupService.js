import { UserSession } from '../models/index.js';
import { Op } from 'sequelize';

/**
 * Session Cleanup Service
 * Handles cleanup of old session records from the database
 * Feature: single-device-session-management
 */
class SessionCleanupService {
  /**
   * Delete sessions older than specified days
   * @param {number} daysOld - Number of days (default: 30)
   * @returns {Promise<number>} Number of sessions deleted
   */
  async cleanupOldSessions(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deletedCount = await UserSession.destroy({
        where: {
          created_at: {
            [Op.lt]: cutoffDate
          }
        }
      });

      console.log(`Cleaned up ${deletedCount} sessions older than ${daysOld} days`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old sessions:', error);
      throw new Error('Failed to cleanup old sessions');
    }
  }

  /**
   * Delete expired sessions
   * @returns {Promise<number>} Number of sessions deleted
   */
  async cleanupExpiredSessions() {
    try {
      const now = new Date();

      const deletedCount = await UserSession.destroy({
        where: {
          expires_at: {
            [Op.lt]: now
          }
        }
      });

      console.log(`Cleaned up ${deletedCount} expired sessions`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
      throw new Error('Failed to cleanup expired sessions');
    }
  }

  /**
   * Delete revoked sessions older than specified days
   * @param {number} daysOld - Number of days (default: 7)
   * @returns {Promise<number>} Number of sessions deleted
   */
  async cleanupRevokedSessions(daysOld = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const deletedCount = await UserSession.destroy({
        where: {
          is_revoked: true,
          created_at: {
            [Op.lt]: cutoffDate
          }
        }
      });

      console.log(`Cleaned up ${deletedCount} revoked sessions older than ${daysOld} days`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up revoked sessions:', error);
      throw new Error('Failed to cleanup revoked sessions');
    }
  }

  /**
   * Get session statistics
   * @returns {Promise<Object>} Session statistics
   */
  async getSessionStats() {
    try {
      const now = new Date();

      const [totalSessions, activeSessions, revokedSessions, expiredSessions] = await Promise.all([
        UserSession.count(),
        UserSession.count({
          where: {
            is_revoked: false,
            expires_at: {
              [Op.gt]: now
            }
          }
        }),
        UserSession.count({
          where: {
            is_revoked: true
          }
        }),
        UserSession.count({
          where: {
            expires_at: {
              [Op.lt]: now
            }
          }
        })
      ]);

      return {
        total: totalSessions,
        active: activeSessions,
        revoked: revokedSessions,
        expired: expiredSessions
      };
    } catch (error) {
      console.error('Error getting session stats:', error);
      throw new Error('Failed to get session statistics');
    }
  }
}

// Export singleton instance
export default new SessionCleanupService();
