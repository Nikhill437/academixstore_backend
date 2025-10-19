import express from 'express';
import { Advertisement, User, College } from '../models/index.js';
import { requireRoles } from '../middleware/rbac.js';

const router = express.Router();

// Get all advertisements (public)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, collegeId, type, status } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { is_active: true };
    if (collegeId) whereClause.college_id = collegeId;
    if (type) whereClause.type = type;
    if (status) whereClause.status = status;

    // Only show approved ads to public
    if (!req.user || req.user.role === 'student') {
      whereClause.status = 'approved';
    }

    const advertisements = await Advertisement.findAndCountAll({
      where: whereClause,
      include: ['college', 'creator'],
      order: [['priority', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        advertisements: advertisements.rows,
        pagination: {
          total: advertisements.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(advertisements.count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get advertisements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get advertisements',
      error: 'ADVERTISEMENTS_FETCH_FAILED'
    });
  }
});

// Get advertisement by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const advertisement = await Advertisement.findByPk(id, {
      include: ['college', 'creator']
    });

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found',
        error: 'ADVERTISEMENT_NOT_FOUND'
      });
    }

    // Only show approved ads to public users
    if ((!req.user || req.user.role === 'student') && advertisement.status !== 'approved') {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found',
        error: 'ADVERTISEMENT_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: { advertisement }
    });
  } catch (error) {
    console.error('Get advertisement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get advertisement',
      error: 'ADVERTISEMENT_FETCH_FAILED'
    });
  }
});

// Create advertisement
router.post('/', requireRoles(['admin', 'college_admin']), async (req, res) => {
  try {
    const {
      title,
      description,
      content,
      type,
      image_url,
      link_url,
      start_date,
      end_date,
      priority = 1,
      target_audience
    } = req.body;

    const userId = req.user.userId;
    const userRole = req.user.role;

    // Get user's college if they are college_admin
    let collegeId = null;
    if (userRole === 'college_admin') {
      const user = await User.findByPk(userId);
      collegeId = user.college_id;
      
      if (!collegeId) {
        return res.status(400).json({
          success: false,
          message: 'College admin must be associated with a college',
          error: 'NO_COLLEGE_ASSOCIATION'
        });
      }
    }

    const advertisement = await Advertisement.create({
      title,
      description,
      content,
      type: type || 'general',
      image_url,
      link_url,
      start_date: start_date || new Date(),
      end_date,
      priority,
      target_audience,
      college_id: collegeId,
      created_by: userId,
      status: userRole === 'admin' ? 'approved' : 'pending', // Admin ads are auto-approved
      is_active: true
    });

    const advertisementWithDetails = await Advertisement.findByPk(advertisement.id, {
      include: ['college', 'creator']
    });

    res.status(201).json({
      success: true,
      message: `Advertisement created successfully${userRole === 'college_admin' ? ' and is pending approval' : ''}`,
      data: { advertisement: advertisementWithDetails }
    });
  } catch (error) {
    console.error('Create advertisement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create advertisement',
      error: 'ADVERTISEMENT_CREATE_FAILED'
    });
  }
});

// Update advertisement
router.put('/:id', requireRoles(['admin', 'college_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const advertisement = await Advertisement.findByPk(id);
    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found',
        error: 'ADVERTISEMENT_NOT_FOUND'
      });
    }

    // College admin can only update their own ads
    if (userRole === 'college_admin' && advertisement.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        error: 'ACCESS_DENIED'
      });
    }

    const {
      title,
      description,
      content,
      type,
      image_url,
      link_url,
      start_date,
      end_date,
      priority,
      target_audience,
      is_active
    } = req.body;

    await advertisement.update({
      title: title || advertisement.title,
      description: description || advertisement.description,
      content: content || advertisement.content,
      type: type || advertisement.type,
      image_url: image_url || advertisement.image_url,
      link_url: link_url || advertisement.link_url,
      start_date: start_date || advertisement.start_date,
      end_date: end_date || advertisement.end_date,
      priority: priority !== undefined ? priority : advertisement.priority,
      target_audience: target_audience || advertisement.target_audience,
      is_active: is_active !== undefined ? is_active : advertisement.is_active,
      // Reset status to pending if college_admin makes changes to approved ad
      status: userRole === 'college_admin' && advertisement.status === 'approved' ? 'pending' : advertisement.status
    });

    const updatedAdvertisement = await Advertisement.findByPk(id, {
      include: ['college', 'creator']
    });

    res.json({
      success: true,
      message: 'Advertisement updated successfully',
      data: { advertisement: updatedAdvertisement }
    });
  } catch (error) {
    console.error('Update advertisement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update advertisement',
      error: 'ADVERTISEMENT_UPDATE_FAILED'
    });
  }
});

// Approve/reject advertisement (admin only)
router.put('/:id/status', requireRoles(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;

    const advertisement = await Advertisement.findByPk(id);
    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found',
        error: 'ADVERTISEMENT_NOT_FOUND'
      });
    }

    const updateData = { 
      status,
      approved_by: req.user.userId,
      approved_at: new Date()
    };

    if (status === 'rejected' && rejection_reason) {
      updateData.rejection_reason = rejection_reason;
    }

    await advertisement.update(updateData);

    const updatedAdvertisement = await Advertisement.findByPk(id, {
      include: ['college', 'creator']
    });

    res.json({
      success: true,
      message: `Advertisement ${status} successfully`,
      data: { advertisement: updatedAdvertisement }
    });
  } catch (error) {
    console.error('Update advertisement status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update advertisement status',
      error: 'ADVERTISEMENT_STATUS_UPDATE_FAILED'
    });
  }
});

// Delete advertisement
router.delete('/:id', requireRoles(['admin', 'college_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const advertisement = await Advertisement.findByPk(id);
    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found',
        error: 'ADVERTISEMENT_NOT_FOUND'
      });
    }

    // College admin can only delete their own ads
    if (userRole === 'college_admin' && advertisement.created_by !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
        error: 'ACCESS_DENIED'
      });
    }

    // Soft delete by setting is_active to false
    await advertisement.update({ is_active: false });

    res.json({
      success: true,
      message: 'Advertisement deleted successfully'
    });
  } catch (error) {
    console.error('Delete advertisement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete advertisement',
      error: 'ADVERTISEMENT_DELETE_FAILED'
    });
  }
});

// Get advertisements by college
router.get('/college/:collegeId', async (req, res) => {
  try {
    const { collegeId } = req.params;
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = { 
      college_id: collegeId, 
      is_active: true 
    };

    // Only show approved ads to public users
    if (!req.user || req.user.role === 'student') {
      whereClause.status = 'approved';
    } else if (status) {
      whereClause.status = status;
    }

    const advertisements = await Advertisement.findAndCountAll({
      where: whereClause,
      include: ['creator'],
      order: [['priority', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        advertisements: advertisements.rows,
        pagination: {
          total: advertisements.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(advertisements.count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get college advertisements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get college advertisements',
      error: 'COLLEGE_ADVERTISEMENTS_FETCH_FAILED'
    });
  }
});

// Get my advertisements (college_admin)
router.get('/my-ads', requireRoles(['college_admin', 'admin']), async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    
    // College admin sees only their ads, admin sees all
    if (userRole === 'college_admin') {
      whereClause.created_by = userId;
    }
    
    if (status) whereClause.status = status;

    const advertisements = await Advertisement.findAndCountAll({
      where: whereClause,
      include: ['college', 'creator'],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        advertisements: advertisements.rows,
        pagination: {
          total: advertisements.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(advertisements.count / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get my advertisements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get advertisements',
      error: 'MY_ADVERTISEMENTS_FETCH_FAILED'
    });
  }
});

export default router;