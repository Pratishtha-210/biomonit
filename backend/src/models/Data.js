// src/models/Data.js

const { query } = require('../config/database');

// ============================================
// DILUTION DATA MODEL
// ============================================
class DilutionData {
  static async create(data) {
    const {
      reactorId, timestamp, timePassed, flowrate, dilutionRate,
      volumeReactor, massInTank, filteredMassInTank, totalTankBalance
    } = data;

    const result = await query(
      `INSERT INTO dilution_data 
       (reactor_id, timestamp, time_passed, flowrate, dilution_rate, 
        volume_reactor, mass_in_tank, filtered_mass_in_tank, total_tank_balance)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [reactorId, timestamp, timePassed, flowrate, dilutionRate,
       volumeReactor, massInTank, filteredMassInTank, totalTankBalance]
    );

    return result.rows[0];
  }

  static async bulkCreate(dataArray) {
    if (dataArray.length === 0) return [];

    const values = [];
    const params = [];
    let paramCount = 1;

    dataArray.forEach((data) => {
      const rowParams = [
        data.reactorId, data.timestamp, data.timePassed, data.flowrate,
        data.dilutionRate, data.volumeReactor, data.massInTank,
        data.filteredMassInTank, data.totalTankBalance
      ];

      const placeholders = rowParams.map(() => `$${paramCount++}`).join(', ');
      values.push(`(${placeholders})`);
      params.push(...rowParams);
    });

    const result = await query(
      `INSERT INTO dilution_data 
       (reactor_id, timestamp, time_passed, flowrate, dilution_rate, 
        volume_reactor, mass_in_tank, filtered_mass_in_tank, total_tank_balance)
       VALUES ${values.join(', ')}
       RETURNING *`,
      params
    );

    return result.rows;
  }

  static async getByReactor(reactorId, options = {}) {
    const { startTime, endTime, limit = 1000, offset = 0, fields } = options;
    
    let queryText = `SELECT ${fields || '*'} FROM dilution_data WHERE reactor_id = $1`;
    const params = [reactorId];
    let paramCount = 2;

    if (startTime) {
      queryText += ` AND timestamp >= $${paramCount}`;
      params.push(startTime);
      paramCount++;
    }

    if (endTime) {
      queryText += ` AND timestamp <= $${paramCount}`;
      params.push(endTime);
      paramCount++;
    }

    queryText += ` ORDER BY timestamp DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(queryText, params);
    return result.rows;
  }

  static async getLatest(reactorId, count = 1) {
    const result = await query(
      `SELECT * FROM dilution_data 
       WHERE reactor_id = $1 
       ORDER BY timestamp DESC 
       LIMIT $2`,
      [reactorId, count]
    );

    return count === 1 ? result.rows[0] : result.rows;
  }

  static async deleteOldData(reactorId, beforeDate) {
    const result = await query(
      `DELETE FROM dilution_data 
       WHERE reactor_id = $1 AND timestamp < $2`,
      [reactorId, beforeDate]
    );

    return result.rowCount;
  }

  static async getFieldStats(reactorId, fieldName, startTime, endTime) {
    const result = await query(
      `SELECT 
        MIN(${fieldName}) as min_value,
        MAX(${fieldName}) as max_value,
        AVG(${fieldName}) as avg_value,
        STDDEV(${fieldName}) as std_dev,
        COUNT(*) as data_points
       FROM dilution_data
       WHERE reactor_id = $1 
       AND timestamp BETWEEN $2 AND $3
       AND ${fieldName} IS NOT NULL`,
      [reactorId, startTime, endTime]
    );

    return result.rows[0];
  }
}

// ============================================
// GAS DATA MODEL
// ============================================
class GasData {
  static async create(data) {
    const fields = [
      'reactor_id', 'timestamp', 'OUR', 'RQ', 'Kla_1h', 'Kla_bar', 
      'stirrer_speed', 'pH', 'DO', 'reactor_temp', 'pio2', 'gas_flow_in',
      'reactor_volume', 'Tout', 'Tin', 'Pout', 'Pin', 'gas_out',
      'Ni', 'Nout', 'CPR', 'Yo2in', 'Yo2out', 'Yco2in', 'Yco2out',
      'Yinert_in', 'Yinert_out'
    ];

    const values = fields.map(field => {
      const key = field === 'reactor_id' ? 'reactorId' : 
                  field === 'reactor_temp' ? 'reactorTemp' :
                  field === 'reactor_volume' ? 'reactorVolume' :
                  field === 'gas_flow_in' ? 'gasFlowIn' :
                  field === 'gas_out' ? 'gasOut' :
                  field === 'stirrer_speed' ? 'stirrerSpeed' :
                  field;
      return data[key];
    });

    const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

    const result = await query(
      `INSERT INTO gas_data (${fields.join(', ')})
       VALUES (${placeholders})
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  static async bulkCreate(dataArray) {
    if (dataArray.length === 0) return [];

    const fields = [
      'reactor_id', 'timestamp', 'OUR', 'RQ', 'Kla_1h', 'Kla_bar', 
      'stirrer_speed', 'pH', 'DO', 'reactor_temp', 'pio2', 'gas_flow_in',
      'reactor_volume', 'Tout', 'Tin', 'Pout', 'Pin', 'gas_out',
      'Ni', 'Nout', 'CPR', 'Yo2in', 'Yo2out', 'Yco2in', 'Yco2out',
      'Yinert_in', 'Yinert_out'
    ];

    const values = [];
    const params = [];
    let paramCount = 1;

    dataArray.forEach(data => {
      const rowValues = fields.map(field => {
        const key = field === 'reactor_id' ? 'reactorId' : 
                    field === 'reactor_temp' ? 'reactorTemp' :
                    field === 'reactor_volume' ? 'reactorVolume' :
                    field === 'gas_flow_in' ? 'gasFlowIn' :
                    field === 'gas_out' ? 'gasOut' :
                    field === 'stirrer_speed' ? 'stirrerSpeed' :
                    field;
        return data[key];
      });

      const placeholders = rowValues.map(() => `$${paramCount++}`).join(', ');
      values.push(`(${placeholders})`);
      params.push(...rowValues);
    });

    const result = await query(
      `INSERT INTO gas_data (${fields.join(', ')})
       VALUES ${values.join(', ')}
       RETURNING *`,
      params
    );

    return result.rows;
  }

  static async getByReactor(reactorId, options = {}) {
    const { startTime, endTime, limit = 1000, offset = 0, fields } = options;
    
    let queryText = `SELECT ${fields || '*'} FROM gas_data WHERE reactor_id = $1`;
    const params = [reactorId];
    let paramCount = 2;

    if (startTime) {
      queryText += ` AND timestamp >= $${paramCount}`;
      params.push(startTime);
      paramCount++;
    }

    if (endTime) {
      queryText += ` AND timestamp <= $${paramCount}`;
      params.push(endTime);
      paramCount++;
    }

    queryText += ` ORDER BY timestamp DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(queryText, params);
    return result.rows;
  }

  static async getLatest(reactorId, count = 1) {
    const result = await query(
      `SELECT * FROM gas_data 
       WHERE reactor_id = $1 
       ORDER BY timestamp DESC 
       LIMIT $2`,
      [reactorId, count]
    );

    return count === 1 ? result.rows[0] : result.rows;
  }

  static async deleteOldData(reactorId, beforeDate) {
    const result = await query(
      `DELETE FROM gas_data 
       WHERE reactor_id = $1 AND timestamp < $2`,
      [reactorId, beforeDate]
    );

    return result.rowCount;
  }

  static async getFieldStats(reactorId, fieldName, startTime, endTime) {
    const result = await query(
      `SELECT 
        MIN(${fieldName}) as min_value,
        MAX(${fieldName}) as max_value,
        AVG(${fieldName}) as avg_value,
        STDDEV(${fieldName}) as std_dev,
        COUNT(*) as data_points
       FROM gas_data
       WHERE reactor_id = $1 
       AND timestamp BETWEEN $2 AND $3
       AND ${fieldName} IS NOT NULL`,
      [reactorId, startTime, endTime]
    );

    return result.rows[0];
  }
}

// ============================================
// LEVEL CONTROL DATA MODEL
// ============================================
class LevelControlData {
  static async create(data) {
    const { reactorId, timestamp, reactorWeight, volumeReactor, pidValue, pumpRpm } = data;

    const result = await query(
      `INSERT INTO level_control_data 
       (reactor_id, timestamp, reactor_weight, volume_reactor, pid_value, pump_rpm)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [reactorId, timestamp, reactorWeight, volumeReactor, pidValue, pumpRpm]
    );

    return result.rows[0];
  }

  static async bulkCreate(dataArray) {
    if (dataArray.length === 0) return [];

    const values = [];
    const params = [];
    let paramCount = 1;

    dataArray.forEach(data => {
      const rowParams = [
        data.reactorId, data.timestamp, data.reactorWeight,
        data.volumeReactor, data.pidValue, data.pumpRpm
      ];

      const placeholders = rowParams.map(() => `$${paramCount++}`).join(', ');
      values.push(`(${placeholders})`);
      params.push(...rowParams);
    });

    const result = await query(
      `INSERT INTO level_control_data 
       (reactor_id, timestamp, reactor_weight, volume_reactor, pid_value, pump_rpm)
       VALUES ${values.join(', ')}
       RETURNING *`,
      params
    );

    return result.rows;
  }

  static async getByReactor(reactorId, options = {}) {
    const { startTime, endTime, limit = 1000, offset = 0, fields } = options;
    
    let queryText = `SELECT ${fields || '*'} FROM level_control_data WHERE reactor_id = $1`;
    const params = [reactorId];
    let paramCount = 2;

    if (startTime) {
      queryText += ` AND timestamp >= $${paramCount}`;
      params.push(startTime);
      paramCount++;
    }

    if (endTime) {
      queryText += ` AND timestamp <= $${paramCount}`;
      params.push(endTime);
      paramCount++;
    }

    queryText += ` ORDER BY timestamp DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(queryText, params);
    return result.rows;
  }

  static async getLatest(reactorId, count = 1) {
    const result = await query(
      `SELECT * FROM level_control_data 
       WHERE reactor_id = $1 
       ORDER BY timestamp DESC 
       LIMIT $2`,
      [reactorId, count]
    );

    return count === 1 ? result.rows[0] : result.rows;
  }

  static async deleteOldData(reactorId, beforeDate) {
    const result = await query(
      `DELETE FROM level_control_data 
       WHERE reactor_id = $1 AND timestamp < $2`,
      [reactorId, beforeDate]
    );

    return result.rowCount;
  }

  static async getFieldStats(reactorId, fieldName, startTime, endTime) {
    const result = await query(
      `SELECT 
        MIN(${fieldName}) as min_value,
        MAX(${fieldName}) as max_value,
        AVG(${fieldName}) as avg_value,
        STDDEV(${fieldName}) as std_dev,
        COUNT(*) as data_points
       FROM level_control_data
       WHERE reactor_id = $1 
       AND timestamp BETWEEN $2 AND $3
       AND ${fieldName} IS NOT NULL`,
      [reactorId, startTime, endTime]
    );

    return result.rows[0];
  }
}

module.exports = {
  DilutionData,
  GasData,
  LevelControlData
};