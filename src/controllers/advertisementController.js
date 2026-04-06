import { Advertisement, User, College } from '../models/index.js';
import { Op } from 'sequelize';
import fileUploadService from '../services/fileUploadService.js';
import { extractS3Key } from '../config/aws.js';

/**
 * Advertisement Controller
 * Handles advertisement management with S3 image storage
 */

class AdvertisementController {
  /**
   * Upload advertisement image
   */
  async uploadAdvertisementImage(req, res) {
    try {
      const { adId } = req.params;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          success: false,
          message: 'No image file provided',
          error: 'NO_FILE'
        });
      }

      // Find the advertisement
      const advertisement = await Advertisement.findByPk(adId);
      if (!advertisement) {
        return res.status(404).json({
          success: false,
          message: 'Advertisement not found',
          error: 'ADVERTISEMENT_NOT_FOUND'
        });
      }

      // Check permissions
      const userRole = req.user.role;
      const userId = req.user.id;

      // College admin can only upload to their own ads
      if (userRole === 'college_admin' && advertisement.created_by !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied to this advertisement',
          error: 'ACCESS_DENIED'
        });
      }

      if (!['super_admin', 'college_admin'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to upload advertisement images',
          error: 'INSUFFICIENT_PERMISSIONS'
        });
      }

      // Delete old image if exists
      if (advertisement.image_url) {
        try {
          const oldKey = extractS3Key(advertisement.image_url);
          if (oldKey) {
            await fileUploadService.deleteFile(oldKey);
          }
        } catch (deleteError) {
          console.warn('Failed to delete old advertisement image:', deleteError.message);
        }
      }

      // Upload new image to S3
      const uploadResult = await fileUploadService.uploadAdvertisementImage(file, adId);

      // Verify the upload was successful
      if (!uploadResult || !uploadResult.publicUrl) {
        throw new Error('File upload failed - no URL returned');
      }

      console.log(`✅ Advertisement image uploaded successfully to S3: ${uploadResult.publicUrl}`);

      // Update advertisement record with S3 URL
      await advertisement.update({
        image_url: uploadResult.publicUrl
      });

      return res.json({
        success: true,
        message: 'Advertisement image uploaded successfully',
        data: {
          ad_id: adId,
          image_url: uploadResult.publicUrl,
          original_name: uploadResult.originalName
        }
      });

    } catch (error) {
      console.error('Upload advertisement image error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload advertisement image',
        error: 'UPLOAD_ERROR',
        details: error.message
      });
    }
  }

  /**
   * Get all advertisements
   */
  async getAdvertisements(req, res) {
    try {
      const { page = 1, limit = 10, college_id, type, status } = req.query;
      const offset = (page - 1) * limit;

      const whereClause = { is_active: true };
      if (college_id) whereClause.college_id = college_id;
      if (type) whereClause.type = type;
      if (status) whereClause.status = status;

      // Only show approved ads to public/students
      const userRole = req.user?.role;
      if (!userRole || userRole === 'student' || userRole === 'user') {
        whereClause.status = 'approved';
      }

      const advertisements = await Advertisement.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: College,
            as: 'college',
            attributes: ['id', 'name', 'code']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'full_name', 'email']
          }
        ],
        order: [['priority', 'DESC'], ['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return res.json({
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
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve advertisements',
        error: 'SERVER_ERROR'
      });
    }
  }

  /**
   * Get single advertisement by ID
   */
  async getAdvertisement(req, res) {
    try {
      const { adId } = req.params;

      const advertisement = await Advertisement.findByPk(adId, {
        include: [
          {
            model: College,
            as: 'college',
            attributes: ['id', 'name', 'code']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'full_name', 'email']
          }
        ]
      });

      if (!advertisement) {
        return res.status(404).json({
          success: false,
          message: 'Advertisement not found',
          error: 'ADVERTISEMENT_NOT_FOUND'
        });
      }

      // Only show approved ads to public users
      const userRole = req.user?.role;
      if ((!userRole || userRole === 'student' || userRole === 'user') && advertisement.status !== 'approved') {
        return res.status(404).json({
          success: false,
          message: 'Advertisement not found',
          error: 'ADVERTISEMENT_NOT_FOUND'
        });
      }

      return res.json({
        success: true,
        data: {
          advertisement
        }
      });

    } catch (error) {
      console.error('Get advertisement error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve advertisement',
        error: 'SERVER_ERROR'
      });
    }
  }

  /**
   * Create new advertisement
   */
  async createAdvertisement(req, res) {
    try {
      const {
        title,
        description,
        content,
        type,
        link_url,
        start_date,
        end_date,
        priority = 1,
        target_audience
      } = req.body;

      const userId = req.user.id;
      const userRole = req.user.role;

      // Validate permissions
      if (!['super_admin', 'college_admin'].includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: 'Only Super Admins and College Admins can create advertisements',
          error: 'INSUFFICIENT_PERMISSIONS'
        });
      }

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
        link_url,
        start_date: start_date || new Date(),
        end_date,
        priority,
        target_audience,
        college_id: collegeId,
        created_by: userId,
        status: userRole === 'super_admin' ? 'approved' : 'pending',
        is_active: true
      });

      const advertisementWithDetails = await Advertisement.findByPk(advertisement.id, {
        include: [
          {
            model: College,
            as: 'college',
            attributes: ['id', 'name', 'code']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'full_name', 'email']
          }
        ]
      });

      return res.status(201).json({
        success: true,
        message: `Advertisement created successfully${userRole === 'college_admin' ? ' and is pending approval' : ''}`,
        data: {
          advertisement: advertisementWithDetails
        }
      });

    } catch (error) {
      console.error('Create advertisement error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create advertisement',
        error: 'SERVER_ERROR'
      });
    }
  }

  /**
   * Update advertisement
   */
  async updateAdvertisement(req, res) {
    try {
      const { adId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const advertisement = await Advertisement.findByPk(adId);
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
        link_url: link_url !== undefined ? link_url : advertisement.link_url,
        start_date: start_date || advertisement.start_date,
        end_date: end_date !== undefined ? end_date : advertisement.end_date,
        priority: priority !== undefined ? priority : advertisement.priority,
        target_audience: target_audience || advertisement.target_audience,
        is_active: is_active !== undefined ? is_active : advertisement.is_active,
        // Reset status to pending if college_admin makes changes to approved ad
        status: userRole === 'college_admin' && advertisement.status === 'approved' ? 'pending' : advertisement.status
      });

      const updatedAdvertisement = await Advertisement.findByPk(adId, {
        include: [
          {
            model: College,
            as: 'college',
            attributes: ['id', 'name', 'code']
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'full_name', 'email']
          }
        ]
      });

      return res.json({
        success: true,
        message: 'Advertisement updated successfully',
        data: {
          advertisement: updatedAdvertisement
        }
      });

    } catch (error) {
      console.error('Update advertisement error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update advertisement',
        error: 'SERVER_ERROR'
      });
    }
  }

  /**
   * Delete advertisement
   */
  async deleteAdvertisement(req, res) {
    try {
      const { adId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const advertisement = await Advertisement.findByPk(adId);
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

      // Delete image from S3 if exists
      if (advertisement.image_url) {
        try {
          const key = extractS3Key(advertisement.image_url);
          if (key) {
            await fileUploadService.deleteFile(key);
          }
        } catch (deleteError) {
          console.warn('Failed to delete advertisement image from S3:', deleteError.message);
        }
      }

      // Soft delete
      await advertisement.update({ is_active: false });

      return res.json({
        success: true,
        message: 'Advertisement deleted successfully'
      });

    } catch (error) {
      console.error('Delete advertisement error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete advertisement',
        error: 'SERVER_ERROR'
      });
    }
  }
}

// Export singleton instance
const advertisementController = new AdvertisementController();
export default advertisementController;
