//controller to handle push data API hit.
const { DilutionData, GasData, LevelControlData } = require('../models/Data');
const logger = require('../utils/logger');

class PushDataController {
  constructor() {
    // Bind all methods to maintain 'this' context
    this.pushDataToDatabase = this.pushDataToDatabase.bind(this);
    this.bulkPushData = this.bulkPushData.bind(this);
    this.handleGasData = this.handleGasData.bind(this);
    this.handleLevelControlData = this.handleLevelControlData.bind(this);
    this.handleDilutionData = this.handleDilutionData.bind(this);
  }

  /**
   * Main endpoint to handle data pushes from the Python watcher
   * Accepts gas, level_control, or dilution data types
   */
  async pushDataToDatabase(req, res) {
    try {
      const payload = req.body;

      // Validate payload structure
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({
          success: false,
          error: 'Invalid payload format'
        });
      }

      // Determine data type and route to appropriate handler
      let result;
      
      if (payload.gas) {
        result = await this.handleGasData(payload.gas);
      } else if (payload.level_control) {
        result = await this.handleLevelControlData(payload.level_control);
      } else if (payload.type === 'dilution') {
        result = await this.handleDilutionData(payload);
      } else {
        return res.status(400).json({
          success: false,
          error: 'Unknown data type. Expected gas, level_control, or dilution data'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Data successfully inserted',
        data: result
      });

    } catch (error) {
      console.error('Error in pushDataToDatabase:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Handle gas data insertion
   */
  async handleGasData(gasData) {
    // Validate required fields
    if (!gasData.reactor_id || !gasData.timestamp) {
      throw new Error('reactor_id and timestamp are required for gas data');
    }

    // Map Python field names to database field names
    const data = {
      reactorId: gasData.reactor_id,
      timestamp: gasData.timestamp,
      our: gasData.OUR,
      rq: gasData.RQ,
      kla1h: gasData.Kla_1h,
      klaBar: gasData.Kla_bar,
      stirrerSpeed: gasData.stirrer_speed,
      pH: gasData.pH,
      do: gasData.DO,
      reactorTemp: gasData.reactor_temp,
      pio2: gasData.pio2,
      gasFlowIn: gasData.gas_flow_in,
      reactorVolume: gasData.reactor_volume,
      tout: gasData.Tout,
      tin: gasData.Tin,
      pout: gasData.Pout,
      pin: gasData.Pin,
      gasOut: gasData.gas_out,
      ni: gasData.Ni,
      nout: gasData.Nout,
      cpr: gasData.CPR,
      yo2in: gasData.Yo2in,
      yo2out: gasData.Yo2out,
      yco2in: gasData.Yco2in,
      yco2out: gasData.Yco2out,
      yinertIn: gasData.Yinert_in,
      yinertOut: gasData.Yinert_out,
      uploadedAt: gasData.uploaded_at
    };

    const result = await GasData.create(data);
    return result;
  }

  /**
   * Handle level control data insertion
   */
  async handleLevelControlData(levelData) {
    // Validate required fields
    if (!levelData.reactor_id || !levelData.timestamp) {
      throw new Error('reactor_id and timestamp are required for level control data');
    }

    // Map Python field names to database field names
    const data = {
      reactorId: levelData.reactor_id,
      timestamp: levelData.timestamp,
      reactorWeight: levelData.reactor_weight,
      volumeReactor: levelData.volume_reactor,
      pidValue: levelData.pid_value,
      pumpRpm: levelData.pump_rpm,
      uploadedAt: levelData.uploaded_at
    };

    const result = await LevelControlData.create(data);
    return result;
  }

  /**
   * Handle dilution data insertion
   */
  async handleDilutionData(dilutionData) {
    // Validate required fields
    if (!dilutionData.reactor_id || !dilutionData.timestamp) {
      throw new Error('reactor_id and timestamp are required for dilution data');
    }

    // Map Python field names to database field names
    const data = {
      reactorId: dilutionData.reactor_id,
      timestamp: dilutionData.timestamp,
      timePassed: dilutionData.time_passed,
      flowrate: dilutionData.flowrate,
      dilutionRate: dilutionData.dilution_rate,
      volumeReactor: dilutionData.volume_reactor,
      massInTank: dilutionData.mass_in_tank,
      filteredMassInTank: dilutionData.filtered_mass_in_tank,
      totalTankBalance: dilutionData.total_tank_balance,
      uploadedAt: dilutionData.uploaded_at
    };

    const result = await DilutionData.create(data);
    return result;
  }

  /**
   * Bulk insert endpoint for batch data uploads
   * Optional enhancement for future use
   */
  async bulkPushData(req, res) {
    try {
      const { dataArray } = req.body;

      if (!Array.isArray(dataArray) || dataArray.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'dataArray must be a non-empty array'
        });
      }

      // Group by data type
      const gasDataArray = [];
      const levelDataArray = [];
      const dilutionDataArray = [];

      for (const payload of dataArray) {
        if (payload.gas) {
          gasDataArray.push(payload.gas);
        } else if (payload.level_control) {
          levelDataArray.push(payload.level_control);
        } else if (payload.type === 'dilution') {
          dilutionDataArray.push(payload);
        }
      }

      // Bulk insert each type
      const results = {
        gas: gasDataArray.length > 0 ? await this.bulkInsertGasData(gasDataArray) : [],
        levelControl: levelDataArray.length > 0 ? await this.bulkInsertLevelData(levelDataArray) : [],
        dilution: dilutionDataArray.length > 0 ? await this.bulkInsertDilutionData(dilutionDataArray) : []
      };

      return res.status(200).json({
        success: true,
        message: 'Bulk data successfully inserted',
        counts: {
          gas: results.gas.length,
          levelControl: results.levelControl.length,
          dilution: results.dilution.length
        },
        data: results
      });

    } catch (error) {
      console.error('Error in bulkPushData:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  async bulkInsertGasData(dataArray) {
    const mappedData = dataArray.map(gasData => ({
      reactorId: gasData.reactor_id,
      timestamp: gasData.timestamp,
      our: gasData.OUR,
      rq: gasData.RQ,
      kla1h: gasData.Kla_1h,
      klaBar: gasData.Kla_bar,
      stirrerSpeed: gasData.stirrer_speed,
      pH: gasData.pH,
      do: gasData.DO,
      reactorTemp: gasData.reactor_temp,
      pio2: gasData.pio2,
      gasFlowIn: gasData.gas_flow_in,
      reactorVolume: gasData.reactor_volume,
      tout: gasData.Tout,
      tin: gasData.Tin,
      pout: gasData.Pout,
      pin: gasData.Pin,
      gasOut: gasData.gas_out,
      ni: gasData.Ni,
      nout: gasData.Nout,
      cpr: gasData.CPR,
      yo2in: gasData.Yo2in,
      yo2out: gasData.Yo2out,
      yco2in: gasData.Yco2in,
      yco2out: gasData.Yco2out,
      yinertIn: gasData.Yinert_in,
      yinertOut: gasData.Yinert_out,
      uploadedAt: gasData.uploaded_at
    }));

    return await GasData.bulkCreate(mappedData);
  }

  async bulkInsertLevelData(dataArray) {
    const mappedData = dataArray.map(levelData => ({
      reactorId: levelData.reactor_id,
      timestamp: levelData.timestamp,
      reactorWeight: levelData.reactor_weight,
      volumeReactor: levelData.volume_reactor,
      pidValue: levelData.pid_value,
      pumpRpm: levelData.pump_rpm
    }));

    return await LevelControlData.bulkCreate(mappedData);
  }

  async bulkInsertDilutionData(dataArray) {
    const mappedData = dataArray.map(dilutionData => ({
      reactorId: dilutionData.reactor_id,
      timestamp: dilutionData.timestamp,
      timePassed: dilutionData.time_passed,
      flowrate: dilutionData.flowrate,
      dilutionRate: dilutionData.dilution_rate,
      volumeReactor: dilutionData.volume_reactor,
      massInTank: dilutionData.mass_in_tank,
      filteredMassInTank: dilutionData.filtered_mass_in_tank,
      totalTankBalance: dilutionData.total_tank_balance,
      uploadedAt: dilutionData.uploaded_at
    }));

    return await DilutionData.bulkCreate(mappedData);
  }
}

// Export a singleton instance
module.exports = new PushDataController();