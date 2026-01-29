#!/usr/bin/env node

/**
 * Session Cleanup Script
 * Cleans up old, expired, and revoked sessions from the database
 * Feature: single-device-session-management
 * 
 * Usage:
 *   node scripts/cleanup-sessions.js [options]
 * 
 * Options:
 *   --all              Clean up all old sessions (30+ days)
 *   --expired          Clean up expired sessions only
 *   --revoked          Clean up revoked sessions (7+ days)
 *   --stats            Show session statistics
 *   --days=N           Specify number of days for cleanup (default: 30)
 */

import sessionCleanupService from '../src/services/sessionCleanupService.js';
import { sequelize } from '../src/models/index.js';

async function main() {
  try {
    const args = process.argv.slice(2);
    const options = {
      all: args.includes('--all'),
      expired: args.includes('--expired'),
      revoked: args.includes('--revoked'),
      stats: args.includes('--stats')
    };

    // Extract days parameter
    const daysArg = args.find(arg => arg.startsWith('--days='));
    const days = daysArg ? parseInt(daysArg.split('=')[1]) : 30;

    console.log('Session Cleanup Script');
    console.log('======================\n');

    // Show stats if requested
    if (options.stats || (!options.all && !options.expired && !options.revoked)) {
      console.log('Fetching session statistics...');
      const stats = await sessionCleanupService.getSessionStats();
      console.log('\nSession Statistics:');
      console.log(`  Total sessions:   ${stats.total}`);
      console.log(`  Active sessions:  ${stats.active}`);
      console.log(`  Revoked sessions: ${stats.revoked}`);
      console.log(`  Expired sessions: ${stats.expired}`);
      console.log('');
    }

    // Perform cleanup operations
    if (options.all) {
      console.log(`Cleaning up sessions older than ${days} days...`);
      const count = await sessionCleanupService.cleanupOldSessions(days);
      console.log(`✓ Deleted ${count} old sessions\n`);
    }

    if (options.expired) {
      console.log('Cleaning up expired sessions...');
      const count = await sessionCleanupService.cleanupExpiredSessions();
      console.log(`✓ Deleted ${count} expired sessions\n`);
    }

    if (options.revoked) {
      const revokedDays = daysArg ? days : 7;
      console.log(`Cleaning up revoked sessions older than ${revokedDays} days...`);
      const count = await sessionCleanupService.cleanupRevokedSessions(revokedDays);
      console.log(`✓ Deleted ${count} revoked sessions\n`);
    }

    // Show final stats if cleanup was performed
    if (options.all || options.expired || options.revoked) {
      console.log('Fetching updated statistics...');
      const stats = await sessionCleanupService.getSessionStats();
      console.log('\nUpdated Session Statistics:');
      console.log(`  Total sessions:   ${stats.total}`);
      console.log(`  Active sessions:  ${stats.active}`);
      console.log(`  Revoked sessions: ${stats.revoked}`);
      console.log(`  Expired sessions: ${stats.expired}`);
      console.log('');
    }

    console.log('Cleanup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await sequelize.close();
  }
}

// Run the script
main();
