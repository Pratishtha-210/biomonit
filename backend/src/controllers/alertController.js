const { SetPoint, Alert } = require('../models/Alert');
const logger = require('../utils/logger');



// ============================================
// ALERT CONTROLLER
// ============================================

// Get alerts for reactor
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

// Get all alerts (admin only)
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

// Get unacknowledged alerts
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

// Acknowledge alert
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

    logger.info(`Alert acknowledged: ${alertId} by user ${req.user.userId}`);

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

// Acknowledge multiple alerts
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

    logger.info(`${acknowledgedAlerts.length} alerts acknowledged by user ${req.user.userId}`);

    res.json({
      success: true,
      message: `${acknowledgedAlerts.length} alerts acknowledged successfully`,
      data: acknowledgedAlerts
    });
  } catch (error) {
    logger.error('Acknowledge multiple alerts error:', error);
    next(error);
  }
};

// Get alert statistics
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

// Get alert by ID
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

module.exports = exports;