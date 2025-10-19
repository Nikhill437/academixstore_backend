import express from 'express';
import { SystemSettings, User } from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireSuperAdmin, requireRoles } from '../middleware/rbac.js';

const router = express.Router();

/**
 * Get all system settings (Super Admin only)
 */
router.get('/', 
  authenticateToken, 
  requireSuperAdmin, 
  async (req, res) => {
    try {
      const settings = await SystemSettings.findAllSettings();

      return res.json({
        success: true,
        data: { settings }
      });
    } catch (error) {
      console.error('Get system settings error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve system settings',
        error: 'SERVER_ERROR'
      });
    }
  }
);

/**
 * Get public system settings (no authentication required)
 */
router.get('/public', async (req, res) => {
  try {
    const settings = await SystemSettings.findPublicSettings();

    return res.json({
      success: true,
      data: { settings }
    });
  } catch (error) {
    console.error('Get public system settings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve public system settings',
      error: 'SERVER_ERROR'
    });
  }
});

/**
 * Get specific setting by key (Super Admin only)
 */
router.get('/:key', 
  authenticateToken, 
  requireSuperAdmin, 
  async (req, res) => {
    try {
      const { key } = req.params;
      const setting = await SystemSettings.findByKey(key);

      if (!setting) {
        return res.status(404).json({
          success: false,
          message: 'Setting not found',
          error: 'SETTING_NOT_FOUND'
        });
      }

      return res.json({
        success: true,
        data: { setting }
      });
    } catch (error) {
      console.error('Get system setting error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve system setting',
        error: 'SERVER_ERROR'
      });
    }
  }
);

/**
 * Create or update a system setting (Super Admin only)
 */
router.put('/:key', 
  authenticateToken, 
  requireSuperAdmin, 
  async (req, res) => {
    try {
      const { key } = req.params;
      const { value, description, is_public = false } = req.body;
      const userId = req.user.userId;

      if (value === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Value is required',
          error: 'VALUE_REQUIRED'
        });
      }

      const [setting, created] = await SystemSettings.findOrCreate({
        where: { key },
        defaults: {
          key,
          value,
          description,
          is_public,
          updated_by: userId
        }
      });

      if (!created) {
        await setting.update({
          value,
          description: description !== undefined ? description : setting.description,
          is_public: is_public !== undefined ? is_public : setting.is_public,
          updated_by: userId
        });
      }

      return res.json({
        success: true,
        message: created ? 'Setting created successfully' : 'Setting updated successfully',
        data: { setting }
      });
    } catch (error) {
      console.error('Update system setting error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update system setting',
        error: 'SERVER_ERROR'
      });
    }
  }
);

/**
 * Delete a system setting (Super Admin only)
 */
router.delete('/:key', 
  authenticateToken, 
  requireSuperAdmin, 
  async (req, res) => {
    try {
      const { key } = req.params;
      const setting = await SystemSettings.findByKey(key);

      if (!setting) {
        return res.status(404).json({
          success: false,
          message: 'Setting not found',
          error: 'SETTING_NOT_FOUND'
        });
      }

      await setting.destroy();

      return res.json({
        success: true,
        message: 'Setting deleted successfully'
      });
    } catch (error) {
      console.error('Delete system setting error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete system setting',
        error: 'SERVER_ERROR'
      });
    }
  }
);

/**
 * Bulk update system settings (Super Admin only)
 */
router.post('/bulk-update', 
  authenticateToken, 
  requireSuperAdmin, 
  async (req, res) => {
    try {
      const { settings } = req.body;
      const userId = req.user.userId;

      if (!Array.isArray(settings)) {
        return res.status(400).json({
          success: false,
          message: 'Settings must be an array',
          error: 'INVALID_SETTINGS_FORMAT'
        });
      }

      const results = [];
      const errors = [];

      for (const settingData of settings) {
        try {
          const { key, value, description, is_public } = settingData;

          if (!key || value === undefined) {
            errors.push({ key: key || 'unknown', error: 'Key and value are required' });
            continue;
          }

          const setting = await SystemSettings.updateSetting(key, value, userId);
          
          if (description !== undefined || is_public !== undefined) {
            await setting.update({
              description: description !== undefined ? description : setting.description,
              is_public: is_public !== undefined ? is_public : setting.is_public
            });
          }

          results.push({ key, success: true });
        } catch (error) {
          errors.push({ key: settingData.key || 'unknown', error: error.message });
        }
      }

      return res.json({
        success: true,
        message: `${results.length} settings updated successfully`,
        data: { 
          results, 
          errors: errors.length > 0 ? errors : undefined 
        }
      });
    } catch (error) {
      console.error('Bulk update system settings error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to bulk update system settings',
        error: 'SERVER_ERROR'
      });
    }
  }
);

/**
 * Get system settings history/audit (Super Admin only)
 * This would require additional audit logging implementation
 */
router.get('/:key/history', 
  authenticateToken, 
  requireSuperAdmin, 
  async (req, res) => {
    try {
      // This is a placeholder - you'd need to implement audit logging
      return res.json({
        success: false,
        message: 'Settings history not implemented yet',
        error: 'NOT_IMPLEMENTED'
      });
    } catch (error) {
      console.error('Get system setting history error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve system setting history',
        error: 'SERVER_ERROR'
      });
    }
  }
);

export default router;