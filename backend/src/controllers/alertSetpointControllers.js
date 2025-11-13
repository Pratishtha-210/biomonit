// src/controllers/alertSetpointControllers.js

const { SetPoint, Alert } = require('../models/Alert');
const logger = require('../utils/logger');

// ============================================
// SETPOINT CONTROLLERS
// ============================================

// @desc    Create or update setpoint
// @route   POST /api/v1/setpoints/:reactorId
// @access  Private (with write access)
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
      minValue: minValue !== undefined ? parseFloat(minValue) : null,
      maxValue: maxValue !== undefined ? parseFloat(maxValue) : null
    };

    const setpoint = await SetPoint.create(setpointData);

    logger.info(`Setpoint created/updated for reactor ${reactorId}: ${fieldName} by user ${req.user.username}`);

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

// @desc    Get setpoints for reactor
// @route   GET /api/v1/setpoints/:reactorId
// @access  Private (with reactor access)
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

// @desc    Get user's setpoints
// @route   GET /api/v1/setpoints/user/my-setpoints
// @access  Private
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

// @desc    Update setpoint
// @route   PUT /api/v1/setpoints/update/:setpointId
// @access  Private (owner or admin)
exports.updateSetPoint = async (req, res, next) => {
  try {
    const { setpointId } = req.params;
    const { minValue, maxValue, isActive } = req.body;

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
        message: 'Not authorized to update this setpoint'
      });
    }

    const updates = {};
    if (minValue !== undefined) updates.min_value = parseFloat(minValue);
    if (maxValue !== undefined) updates.max_value = parseFloat(maxValue);
    if (isActive !== undefined) updates.is_active = isActive;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    const updatedSetpoint = await SetPoint.update(setpointId, updates);

    logger.info(`Setpoint updated: ${setpointId} by ${req.user.username}`);

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

// @desc    Delete setpoint
// @route   DELETE /api/v1/setpoints/:setpointId
// @access  Private (owner or admin)
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

    logger.info(`Setpoint deleted: ${setpointId} by ${req.user.username}`);

    res.json({
      success: true,
      message: 'Setpoint deleted successfully'
    });
  } catch (error) {
    logger.error('Delete setpoint error:', error);
    next(error);
  }
};

// ============================================
// ALERT CONTROLLERS
// ============================================

// @desc    Get alerts for reactor
// @route   GET /api/v1/alerts/:reactorId
// @access  Private (with reactor access)
exports.getAlerts = async (req, res, next) => {
  try {
    const { reactorId } = req.params;
    const { isAcknowledged, severity, startDate, endDate, limit, offset } = req.query;

    const options = {
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0
    };

    if (isAcknowledged !== undefined) options.isAcknowledged = isAcknowledged === 'true';
    if (severity) options.severity = severity;
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);

    const alerts = await Alert.getByReactor(reactorId, options);

    res.json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    logger.error('Get alerts error:', error);
    next(error);
  }
};

// @desc    Get all alerts (admin only)
// @route   GET /api/v1/alerts/all
// @access  Private/Admin
exports.getAllAlerts = async (req, res, next) => {
  try {
    const { isAcknowledged, severity, startDate, endDate, limit, offset } = req.query;

    const options = {
      limit: parseInt(limit) || 100,
      offset: parseInt(offset) || 0
    };

    if (isAcknowledged !== undefined) options.isAcknowledged = isAcknowledged === 'true';
    if (severity) options.severity = severity;
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);

    const alerts = await Alert.getAllAlerts(options);

    res.json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    logger.error('Get all alerts error:', error);
    next(error);
  }
};

// @desc    Get unacknowledged alerts
// @route   GET /api/v1/alerts/:reactorId/unacknowledged
// @access  Private (with reactor access)
exports.getUnacknowledgedAlerts = async (req, res, next) => {
  try {
    let alerts;
    
    if (req.user.role === 'admin') {
      // Admin sees all unacknowledged alerts
      alerts = await Alert.getUnacknowledged();
    } else {
      // Normal users see only their reactor's alerts
      const { reactorId } = req.params;
      alerts = await Alert.getUnacknowledged(reactorId);
    }

    res.json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (error) {
    logger.error('Get unacknowledged alerts error:', error);
    next(error);
  }
};

// @desc    Acknowledge alert
// @route   PUT /api/v1/alerts/:alertId/acknowledge
// @access  Private
exports.acknowledgeAlert = async (req, res, next) => {
  try {
    const { alertId } = req.params;

    const alert = await Alert.findById(alertId);
    
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    if (alert.is_acknowledged) {
      return res.status(400).json({
        success: false,
        message: 'Alert already acknowledged'
      });
    }

    const acknowledgedAlert = await Alert.acknowledge(alertId, req.user.userId);

    logger.info(`Alert acknowledged: ${alertId} by user ${req.user.username}`);

    res.json({
      success: true,
      message: 'Alert acknowledged successfully',
      data: acknowledgedAlert
    });
  } catch (error) {
    logger.error('Acknowledge alert error:', error);
    next(error);
  }
};

// @desc    Acknowledge multiple alerts
// @route   POST /api/v1/alerts/acknowledge-multiple
// @access  Private
exports.acknowledgeMultipleAlerts = async (req, res, next) => {
  try {
    const { alertIds } = req.body;

    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'alertIds array is required'
      });
    }

    const acknowledgedAlerts = await Alert.acknowledgeMultiple(alertIds, req.user.userId);

    logger.info(`${acknowledgedAlerts.length} alerts acknowledged by user ${req.user.username}`);

    res.json({
      success: true,
      message: `${acknowledgedAlerts.length} alerts acknowledged successfully`,
      count: acknowledgedAlerts.length,
      data: acknowledgedAlerts
    });
  } catch (error) {
    logger.error('Acknowledge multiple alerts error:', error);
    next(error);
  }
};

// @desc    Get alert statistics
// @route   GET /api/v1/alerts/:reactorId/statistics
// @access  Private (with reactor access)
exports.getAlertStats = async (req, res, next) => {
  try {
    let stats;

    if (req.user.role === 'admin') {
      // Admin gets global stats
      stats = await Alert.getAlertStats();
    } else {
      // Normal users get stats for their reactor
      const { reactorId } = req.params;
      stats = await Alert.getAlertStats(reactorId);
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Get alert stats error:', error);
    next(error);
  }
};

// @desc    Get alert by ID
// @route   GET /api/v1/alerts/detail/:alertId
// @access  Private
exports.getAlertById = async (req, res, next) => {
  try {
    const { alertId } = req.params;

    const alert = await Alert.findById(alertId);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Alert not found'
      });
    }

    // Get notification history
    const notifications = await Alert.getNotifications(alertId);

    res.json({
      success: true,
      data: {
        ...alert,
        notifications
      }
    });
  } catch (error) {
    logger.error('Get alert by ID error:', error);
    next(error);
  }
};