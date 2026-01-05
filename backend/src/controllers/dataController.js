const { DilutionData, GasData, LevelControlData } = require('../models/Data');
const logger = require('../utils/logger');
const { emitReactorData } = require('../config/socket');
const e = require('express');

// Helper to get model based on data type
const getDataModel = (dataType) => {
  switch (dataType) {
    case 'dilution':
      return DilutionData;
    case 'gas':
      return GasData;
    case 'level_control':
      return LevelControlData;
    default:
      throw new Error('Invalid data type');
  }
};

// Get reactor data
exports.getReactorData = async (req, res, next) => {
  try {
    const { reactorId, dataType } = req.params;
    const { startTime, endTime, limit, offset, fields } = req.query;
    //console.log("get reactor data---> ", reactorId, dataType, req.query);
    //console.log ('query', req);
    const DataModel = getDataModel(dataType);
    //console.log(DataModel, 'DataModel');
    const options = {
      startTime,
      endTime,
      limit: parseInt(limit) || 1000,
      offset: parseInt(offset) || 0,
      fields
    };

    const data = await DataModel.getByReactor(reactorId, options);
    //console.log("data:",data)
    res.json({
      success: true,
      count: data.length,
      dataType,
      data
    });
  } catch (error) {
    logger.error('Get reactor data error:', error);
    next(error);
  }
};

// Get latest reactor data
exports.getLatestData = async (req, res, next) => {
  try {
    const { reactorId, dataType } = req.params;
    const { count } = req.query;

    const DataModel = getDataModel(dataType);

    const data = await DataModel.getLatest(reactorId, parseInt(count) || 1);
    //console.log("latest data:",data)
    // emitReactorData(reactorId, dataType, Array.isArray(data) ? data[0] : data);
    res.json({
      success: true,
      dataType,
      data
    });
  } catch (error) {
    logger.error('Get latest data error:', error);
    next(error);
  }
};

// Insert reactor data (from LabVIEW or external source)
exports.insertReactorData = async (req, res, next) => {
  try {
    const { reactorId, dataType } = req.params;
    const dataPayload = req.body;

    const DataModel = getDataModel(dataType);

    // Handle single or bulk insert
    let result;
    if (Array.isArray(dataPayload)) {
      // Bulk insert
      const dataWithReactorId = dataPayload.map(item => ({
        ...item,
        reactorId: parseInt(reactorId)
      }));
      result = await DataModel.bulkCreate(dataWithReactorId);
    } else {
      // Single insert
      const data = {
        ...dataPayload,
        reactorId: parseInt(reactorId)
      };
      result = await DataModel.create(data);
    }

    // Emit real-time data to connected clients
    emitReactorData(reactorId, dataType, Array.isArray(result) ? result[0] : result);

    logger.info(`Data inserted for reactor ${reactorId}, type: ${dataType}`);

    res.status(201).json({
      success: true,
      message: 'Data inserted successfully',
      data: result
    });
  } catch (error) {
    logger.error('Insert reactor data error:', error);
    next(error);
  }
};

// Get field statistics
exports.getFieldStatistics = async (req, res, next) => {
  try {
    const { reactorId, dataType } = req.params;
    const { fieldName, startTime, endTime } = req.query;

    if (!fieldName || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'fieldName, startTime, and endTime are required'
      });
    }

    const DataModel = getDataModel(dataType);

    const stats = await DataModel.getFieldStats(
      reactorId,
      fieldName,
      new Date(startTime),
      new Date(endTime)
    );

    res.json({
      success: true,
      dataType,
      fieldName,
      data: stats
    });
  } catch (error) {
    logger.error('Get field statistics error:', error);
    next(error);
  }
};

// Get multiple fields data (for multi-axis charts)
exports.getMultiFieldData = async (req, res, next) => {
  try {
    const { reactorId, dataType } = req.params;
    const { fields, startTime, endTime, limit } = req.query;

    if (!fields) {
      return res.status(400).json({
        success: false,
        message: 'fields parameter is required (comma-separated field names)'
      });
    }

    const DataModel = getDataModel(dataType);

    const fieldList = `record_id, reactor_id, timestamp, ${fields}`;

    const options = {
      startTime,
      endTime,
      limit: parseInt(limit) || 1000,
      offset: 0,
      fields: fieldList
    };

    const data = await DataModel.getByReactor(reactorId, options);

    res.json({
      success: true,
      count: data.length,
      dataType,
      fields: fields.split(','),
      data
    });
  } catch (error) {
    logger.error('Get multi-field data error:', error);
    next(error);
  }
};

// Get data for time range (for historical analysis)
exports.getDataByTimeRange = async (req, res, next) => {
  try {
    const { reactorId } = req.params;
    const { hours } = req.query;

    if (!hours) {
      return res.status(400).json({
        success: false,
        message: 'hours parameter is required'
      });
    }

    const endTime = new Date();
    const startTime = new Date(endTime - hours * 60 * 60 * 1000);
    console.log("reactor Id: ", reactorId)
    console.log("start time: ", startTime)
    console.log("end Time: ", endTime)
    // Get data from all three types
    const dilutionData = await DilutionData.getByReactor(reactorId, {
      startTime,
      endTime,
      limit: 10000
    });

    const gasData = await GasData.getByReactor(reactorId, {
      startTime,
      endTime,
      limit: 10000
    });

    const levelData = await LevelControlData.getByReactor(reactorId, {
      startTime,
      endTime,
      limit: 10000
    });

    res.json({
      success: true,
      timeRange: {
        startTime,
        endTime,
        hours: parseInt(hours)
      },
      data: {
        dilution: dilutionData,
        gas: gasData,
        level_control: levelData
      }
    });
  } catch (error) {
    logger.error('Get data by time range error:', error);
    next(error);
  }
};

// Get all latest data for dashboard
exports.getDashboardData = async (req, res, next) => {
  try {
    const { reactorId } = req.params;
    console.log('gerDashboardData called', reactorId);
    const latestDilution = await DilutionData.getLatest(reactorId);
    const latestGas = await GasData.getLatest(reactorId);
    const latestLevel = await LevelControlData.getLatest(reactorId);
    console.log(latestLevel, 'latestLevel', reactorId);
    // Get last 10 records for mini charts
    const recentDilution = await DilutionData.getLatest(reactorId, 10);
    const recentGas = await GasData.getLatest(reactorId, 10);
    const recentLevel = await LevelControlData.getLatest(reactorId, 10);

    res.json({
      success: true,
      data: {
        latest: {
          dilution: latestDilution,
          gas: latestGas,
          level_control: latestLevel
        },
        recent: {
          dilution: recentDilution,
          gas: recentGas,
          level_control: recentLevel
        }
      }
    });
  } catch (error) {
    console.log(error, 'error');
    logger.error('Get dashboard data error:', error);
    next(error);
  }
};

// Delete old data (admin only - called manually or by cron)
exports.deleteOldData = async (req, res, next) => {
  try {
    const { reactorId, dataType } = req.params;
    const { beforeDate } = req.body;

    if (!beforeDate) {
      return res.status(400).json({
        success: false,
        message: 'beforeDate is required'
      });
    }

    const DataModel = getDataModel(dataType);

    const deletedCount = await DataModel.deleteOldData(
      reactorId,
      new Date(beforeDate)
    );

    logger.info(`Deleted ${deletedCount} old records for reactor ${reactorId}, type: ${dataType}`);

    res.json({
      success: true,
      message: `Deleted ${deletedCount} records`,
      deletedCount
    });
  } catch (error) {
    logger.error('Delete old data error:', error);
    next(error);
  }
};

// Export data as CSV (for download)
exports.exportData = async (req, res, next) => {
  try {
    const { reactorId, dataType } = req.params;
    const { startTime, endTime } = req.query;

    if (!startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'startTime and endTime are required'
      });
    }

    const DataModel = getDataModel(dataType);

    const data = await DataModel.getByReactor(reactorId, {
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      limit: 100000
    });

    if (data.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No data found for specified time range'
      });
    }

    // Convert to CSV
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(val => 
        typeof val === 'string' ? `"${val}"` : val
      ).join(',')
    );
    const csv = [headers, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=reactor_${reactorId}_${dataType}_${Date.now()}.csv`);
    res.send(csv);

  } catch (error) {
    logger.error('Export data error:', error);
    next(error);
  }
};

module.exports = exports;