const { SetPoint, Alert } = require('../models/Alert');
const logger = require('../utils/logger');

// ============================================
// SETPOINT CONTROLLER
// ============================================

// Create or update setpoint
exports.createSetPoint = async (req, res, next) => {
    try {
      const { reactorId } = req.params;
      const { dataType, fieldName, minValue, maxValue } = req.body;
  
      if (!dataType || !fieldName) {
        return res.status(400).json({
          success: false,
          message: 'dataType and fieldName are required'
        });
      }
  
      if (minValue === undefined && maxValue === undefined) {
        return res.status(400).json({
          success: false,
          message: 'At least one of minValue or maxValue is required'
        });
      }
  
      const setpointData = {
        reactorId,
        userId: req.user.userId,
        dataType,
        fieldName,
        minValue,
        maxValue
      };
  
      const setpoint = await SetPoint.create(setpointData);
  
      logger.info(`Setpoint created/updated for reactor ${reactorId}: ${fieldName}`);
  
      res.status(201).json({
        success: true,
        message: 'Setpoint created/updated successfully',
        data: setpoint
      });
    } catch (error) {
      logger.error('Create setpoint error:', error);
      next(error);
    }
  };
  
  // Get setpoints for reactor
  exports.getSetPoints = async (req, res, next) => {
    try {
      const { reactorId } = req.params;
      const { dataType, isActive } = req.query;
  
      const options = {};
      if (dataType) options.dataType = dataType;
      if (isActive !== undefined) options.isActive = isActive === 'true';
  
      const setpoints = await SetPoint.getByReactor(reactorId, options);
  
      res.json({
        success: true,
        count: setpoints.length,
        data: setpoints
      });
    } catch (error) {
      logger.error('Get setpoints error:', error);
      next(error);
    }
  };
  
  // Get user's setpoints
  exports.getUserSetPoints = async (req, res, next) => {
    try {
      const { reactorId } = req.query;
  
      const setpoints = await SetPoint.getByUser(req.user.userId, reactorId);
  
      res.json({
        success: true,
        count: setpoints.length,
        data: setpoints
      });
    } catch (error) {
      logger.error('Get user setpoints error:', error);
      next(error);
    }
  };
  
  // Update setpoint
  exports.updateSetPoint = async (req, res, next) => {
    try {
      const { setpointId } = req.params;
      const { minValue, maxValue, isActive } = req.body;
  
      const updates = {};
      if (minValue !== undefined) updates.min_value = minValue;
      if (maxValue !== undefined) updates.max_value = maxValue;
      if (isActive !== undefined) updates.is_active = isActive;
  
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }
  
      const updatedSetpoint = await SetPoint.update(setpointId, updates);
  
      if (!updatedSetpoint) {
        return res.status(404).json({
          success: false,
          message: 'Setpoint not found'
        });
      }
  
      logger.info(`Setpoint updated: ${setpointId}`);
  
      res.json({
        success: true,
        message: 'Setpoint updated successfully',
        data: updatedSetpoint
      });
    } catch (error) {
      logger.error('Update setpoint error:', error);
      next(error);
    }
  };
  
  // Delete setpoint
  exports.deleteSetPoint = async (req, res, next) => {
    try {
      const { setpointId } = req.params;
  
      const setpoint = await SetPoint.findById(setpointId);
      if (!setpoint) {
        return res.status(404).json({
          success: false,
          message: 'Setpoint not found'
        });
      }
  
      // Check if user owns this setpoint or is admin
      if (req.user.role !== 'admin' && setpoint.user_id !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this setpoint'
        });
      }
  
      await SetPoint.delete(setpointId);
  
      logger.info(`Setpoint deleted: ${setpointId}`);
  
      res.json({
        success: true,
        message: 'Setpoint deleted successfully'
      });
    } catch (error) {
      logger.error('Delete setpoint error:', error);
      next(error);
    }
  };

  module.exports = exports;