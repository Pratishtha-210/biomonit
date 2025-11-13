const { DilutionData, GasData, LevelControlData } = require('../models/Data');
const { Alert } = require('../models/Alert');
const Reactor = require('../models/Reactor');
const logger = require('../utils/logger');

class DataRetentionService {
  constructor() {
    this.isRunning = false;
    this.cleanupInterval = null;
  }

  // Start data retention service
  start() {
    if (this.isRunning) {
      logger.warn('Data retention service is already running');
      return;
    }

    // Run immediately on start
    this.runCleanup();

    // Then run periodically (default: daily)
    const interval = parseInt(process.env.DATA_RETENTION_CHECK_INTERVAL) || 86400000; // 24 hours

    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, interval);

    this.isRunning = true;
    logger.info(`Data retention service started (running every ${interval}ms)`);
  }

  // Stop data retention service
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.isRunning = false;
    logger.info('Data retention service stopped');
  }

  // Run cleanup process
  async runCleanup() {
    try {
      logger.info('Starting data retention cleanup...');

      const reactors = await Reactor.findAll({ isActive: true });

      let totalDeleted = {
        dilution: 0,
        gas: 0,
        level_control: 0,
        alerts: 0
      };

      for (const reactor of reactors) {
        const deleted = await this.cleanupReactorData(reactor);
        totalDeleted.dilution += deleted.dilution;
        totalDeleted.gas += deleted.gas;
        totalDeleted.level_control += deleted.level_control;
        totalDeleted.alerts += deleted.alerts;
      }

      logger.info('Data retention cleanup completed:', totalDeleted);
    } catch (error) {
      logger.error('Error in data retention cleanup:', error);
    }
  }

  // Cleanup data for a single reactor
  async cleanupReactorData(reactor) {
    const deleted = {
      dilution: 0,
      gas: 0,
      level_control: 0,
      alerts: 0
    };

    try {
      const retentionDays = reactor.data_retention_days || 
                           parseInt(process.env.DEFAULT_DATA_RETENTION_DAYS) || 
                           365;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      logger.info(`Cleaning data for reactor ${reactor.reactor_id} (${reactor.reactor_name}): keeping last ${retentionDays} days`);

      // Delete old dilution data
      deleted.dilution = await DilutionData.deleteOldData(
        reactor.reactor_id,
        cutoffDate
      );

      // Delete old gas data
      deleted.gas = await GasData.deleteOldData(
        reactor.reactor_id,
        cutoffDate
      );

      // Delete old level control data
      deleted.level_control = await LevelControlData.deleteOldData(
        reactor.reactor_id,
        cutoffDate
      );

      // Delete old acknowledged alerts (keep last 90 days)
      const alertCutoffDate = new Date();
      alertCutoffDate.setDate(alertCutoffDate.getDate() - 90);
      
      deleted.alerts = await Alert.deleteOldAlerts(alertCutoffDate);

      if (deleted.dilution > 0 || deleted.gas > 0 || deleted.level_control > 0) {
        logger.info(`Reactor ${reactor.reactor_id} cleanup: ${JSON.stringify(deleted)}`);
      }

    } catch (error) {
      logger.error(`Error cleaning reactor ${reactor.reactor_id}:`, error);
    }

    return deleted;
  }

  // Manual cleanup trigger
  async cleanupNow(reactorId = null) {
    try {
      if (reactorId) {
        const reactor = await Reactor.findById(reactorId);
        if (!reactor) {
          throw new Error('Reactor not found');
        }
        const deleted = await this.cleanupReactorData(reactor);
        logger.info(`Manual cleanup for reactor ${reactorId}:`, deleted);
        return deleted;
      } else {
        await this.runCleanup();
        return { success: true, message: 'Cleanup completed for all reactors' };
      }
    } catch (error) {
      logger.error('Manual cleanup error:', error);
      throw error;
    }
  }

  // Get cleanup statistics
  async getCleanupStats() {
    try {
      const reactors = await Reactor.findAll({ isActive: true });
      const stats = [];

      for (const reactor of reactors) {
        const retentionDays = reactor.data_retention_days || 
                             parseInt(process.env.DEFAULT_DATA_RETENTION_DAYS) || 
                             365;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        stats.push({
          reactorId: reactor.reactor_id,
          reactorName: reactor.reactor_name,
          retentionDays,
          cutoffDate,
          nextCleanup: this.getNextCleanupTime()
        });
      }

      return stats;
    } catch (error) {
      logger.error('Error getting cleanup stats:', error);
      throw error;
    }
  }

  // Get next cleanup time
  getNextCleanupTime() {
    if (!this.isRunning || !this.cleanupInterval) {
      return null;
    }

    const interval = parseInt(process.env.DATA_RETENTION_CHECK_INTERVAL) || 86400000;
    const nextRun = new Date(Date.now() + interval);
    return nextRun;
  }
}

// Export singleton instance
const dataRetentionService = new DataRetentionService();
module.exports = dataRetentionService;