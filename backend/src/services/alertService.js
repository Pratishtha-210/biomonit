const { SetPoint, Alert } = require('../models/Alert');
const { DilutionData, GasData, LevelControlData } = require('../models/Data');
const Reactor = require('../models/Reactor');
const { emitAlert } = require('../config/socket');
const { sendAlertEmail } = require('./emailService');
const logger = require('../utils/logger');

class AlertService {
  constructor() {
    this.isRunning = false;
    this.checkInterval = null;
  }

  // Start alert monitoring
  start() {
    if (this.isRunning) {
      logger.warn('Alert service is already running');
      return;
    }

    const interval = parseInt(process.env.ALERT_CHECK_INTERVAL) || 120000; // 2 minutes default

    this.checkInterval = setInterval(() => {
      this.checkAllReactors();
    }, interval);

    this.isRunning = true;
    logger.info(`Alert service started (checking every ${interval}ms)`);
  }

  // Stop alert monitoring
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    logger.info('Alert service stopped');
  }

  // Check all active reactors
  async checkAllReactors() {
    try {
      const reactors = await Reactor.findAll({ isActive: true });

      for (const reactor of reactors) {
        await this.checkReactor(reactor.reactor_id);
      }
    } catch (error) {
      logger.error('Error checking reactors:', error);
    }
  }

  // Check single reactor
  async checkReactor(reactorId) {
    try {
      // Get active setpoints for this reactor
      const setpoints = await SetPoint.getActiveSetpoints(reactorId);

      if (setpoints.length === 0) {
        return; // No setpoints configured
      }

      // Get latest data for each type
      const latestDilution = await DilutionData.getLatest(reactorId);
      const latestGas = await GasData.getLatest(reactorId);
      const latestLevel = await LevelControlData.getLatest(reactorId);

      const dataMap = {
        dilution: latestDilution,
        gas: latestGas,
        level_control: latestLevel
      };

      // Check each setpoint
      for (const setpoint of setpoints) {
        const data = dataMap[setpoint.data_type];
        
        if (!data) continue; // No data available yet

        await this.checkSetpoint(setpoint, data, reactorId);
      }
    } catch (error) {
      logger.error(`Error checking reactor ${reactorId}:`, error);
    }
  }

  // Check individual setpoint
  async checkSetpoint(setpoint, data, reactorId) {
    try {
      const fieldValue = data[setpoint.field_name];

      if (fieldValue === null || fieldValue === undefined) {
        return; // Field not available in data
      }

      let violated = false;
      let thresholdType = null;
      let thresholdValue = null;
      let severity = 'warning';

      // Check min threshold
      if (setpoint.min_value !== null && fieldValue < setpoint.min_value) {
        violated = true;
        thresholdType = 'min';
        thresholdValue = setpoint.min_value;
        
        // Calculate severity based on how far below threshold
        const deviation = ((setpoint.min_value - fieldValue) / setpoint.min_value) * 100;
        if (deviation > 20) severity = 'critical';
      }

      // Check max threshold
      if (setpoint.max_value !== null && fieldValue > setpoint.max_value) {
        violated = true;
        thresholdType = 'max';
        thresholdValue = setpoint.max_value;
        
        // Calculate severity based on how far above threshold
        const deviation = ((fieldValue - setpoint.max_value) / setpoint.max_value) * 100;
        if (deviation > 20) severity = 'critical';
      }

      if (violated) {
        await this.createAlert({
          reactorId,
          setpointId: setpoint.setpoint_id,
          dataType: setpoint.data_type,
          fieldName: setpoint.field_name,
          currentValue: fieldValue,
          thresholdValue,
          thresholdType,
          severity,
          message: this.generateAlertMessage(
            setpoint.field_name,
            fieldValue,
            thresholdValue,
            thresholdType
          )
        });
      }
    } catch (error) {
      logger.error('Error checking setpoint:', error);
    }
  }

  // Create alert
  async createAlert(alertData) {
    try {
      // Check if similar alert was created recently (prevent spam)
      const recentAlerts = await Alert.getByReactor(alertData.reactorId, {
        limit: 10,
        isAcknowledged: false
      });

      const isDuplicate = recentAlerts.some(alert => 
        alert.field_name === alertData.fieldName &&
        alert.threshold_type === alertData.thresholdType &&
        (Date.now() - new Date(alert.created_at).getTime()) < 300000 // 5 minutes
      );

      if (isDuplicate) {
        return; // Don't create duplicate alert
      }

      // Create the alert
      const alert = await Alert.create(alertData);

      logger.info(`Alert created: ${alert.message}`);

      // Emit real-time alert
      emitAlert(alertData.reactorId, alert);

      // Send email notification if enabled
      if (process.env.ALERT_EMAIL_ENABLED === 'true') {
        await this.sendAlertNotifications(alert);
      }

    } catch (error) {
      logger.error('Error creating alert:', error);
    }
  }

  // Send email notifications for alert
  async sendAlertNotifications(alert) {
    try {
      const reactor = await Reactor.findById(alert.reactor_id);
      const users = await Reactor.getAssignedUsers(alert.reactor_id);

      // Send to all assigned users
      for (const user of users) {
        try {
          await sendAlertEmail(user.email, {
            reactorName: reactor.reactor_name,
            alertMessage: alert.message,
            severity: alert.severity,
            fieldName: alert.field_name,
            currentValue: alert.current_value,
            thresholdValue: alert.threshold_value
          });

          // Record notification
          await Alert.recordNotification(alert.alert_id, user.user_id, 'email');
        } catch (emailError) {
          logger.error(`Failed to send email to ${user.email}:`, emailError);
        }
      }
    } catch (error) {
      logger.error('Error sending alert notifications:', error);
    }
  }

  // Generate alert message
  generateAlertMessage(fieldName, currentValue, thresholdValue, thresholdType) {
    const formattedField = fieldName.replace(/_/g, ' ').toUpperCase();
    const comparison = thresholdType === 'min' ? 'below' : 'above';
    
    return `${formattedField} is ${comparison} threshold: Current value ${currentValue.toFixed(2)}, Threshold ${thresholdValue.toFixed(2)}`;
  }

  // Manual trigger for testing
  async checkNow(reactorId) {
    await this.checkReactor(reactorId);
    logger.info(`Manual alert check triggered for reactor ${reactorId}`);
  }
}

// Export singleton instance
const alertService = new AlertService();
module.exports = alertService;