const { query } = require('../config/database');

// ============================================
// SETPOINT MODEL
// ============================================
class SetPoint {
  static async create(data) {
    const { reactorId, userId, dataType, fieldName, minValue, maxValue } = data;

    const result = await query(
      `INSERT INTO setpoints 
       (reactor_id, user_id, data_type, field_name, min_value, max_value)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (reactor_id, data_type, field_name, user_id) 
       DO UPDATE SET 
         min_value = $5,
         max_value = $6,
         is_active = true,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [reactorId, userId, dataType, fieldName, minValue, maxValue]
    );

    return result.rows[0];
  }

  static async findById(setpointId) {
    const result = await query(
      'SELECT * FROM setpoints WHERE setpoint_id = $1',
      [setpointId]
    );

    return result.rows[0];
  }

  static async getByReactor(reactorId, options = {}) {
    const { dataType, isActive } = options;
    
    let queryText = `
      SELECT s.*, u.username, u.full_name
      FROM setpoints s
      JOIN users u ON s.user_id = u.user_id
      WHERE s.reactor_id = $1
    `;
    const params = [reactorId];
    let paramCount = 2;

    if (dataType) {
      queryText += ` AND s.data_type = $${paramCount}`;
      params.push(dataType);
      paramCount++;
    }

    if (isActive !== undefined) {
      queryText += ` AND s.is_active = $${paramCount}`;
      params.push(isActive);
      paramCount++;
    }

    queryText += ' ORDER BY s.data_type, s.field_name';

    const result = await query(queryText, params);
    return result.rows;
  }

  static async getByUser(userId, reactorId = null) {
    let queryText = `
      SELECT s.*, r.reactor_name
      FROM setpoints s
      JOIN reactors r ON s.reactor_id = r.reactor_id
      WHERE s.user_id = $1
    `;
    const params = [userId];

    if (reactorId) {
      queryText += ' AND s.reactor_id = $2';
      params.push(reactorId);
    }

    queryText += ' ORDER BY r.reactor_name, s.data_type, s.field_name';

    const result = await query(queryText, params);
    return result.rows;
  }

  static async getActiveSetpoints(reactorId) {
    const result = await query(
      `SELECT * FROM setpoints 
       WHERE reactor_id = $1 AND is_active = true`,
      [reactorId]
    );

    return result.rows;
  }

  static async update(setpointId, updates) {
    const allowedFields = ['min_value', 'max_value', 'is_active'];
    const updateFields = [];
    const params = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = $${paramCount}`);
        params.push(updates[key]);
        paramCount++;
      }
    });

    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }

    params.push(setpointId);

    const result = await query(
      `UPDATE setpoints
       SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE setpoint_id = $${paramCount}
       RETURNING *`,
      params
    );

    return result.rows[0];
  }

  static async delete(setpointId) {
    await query('DELETE FROM setpoints WHERE setpoint_id = $1', [setpointId]);
    return true;
  }

  static async checkViolation(reactorId, dataType, fieldName, value) {
    const result = await query(
      `SELECT * FROM setpoints 
       WHERE reactor_id = $1 
       AND data_type = $2 
       AND field_name = $3 
       AND is_active = true
       AND (
         (min_value IS NOT NULL AND $4 < min_value) OR
         (max_value IS NOT NULL AND $4 > max_value)
       )`,
      [reactorId, dataType, fieldName, value]
    );

    return result.rows;
  }
}

// ============================================
// ALERT MODEL
// ============================================
class Alert {
  static async create(data) {
    const {
      reactorId, setpointId, dataType, fieldName, currentValue,
      thresholdValue, thresholdType, severity, message
    } = data;

    const result = await query(
      `INSERT INTO alerts 
       (reactor_id, setpoint_id, data_type, field_name, current_value,
        threshold_value, threshold_type, severity, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [reactorId, setpointId, dataType, fieldName, currentValue,
       thresholdValue, thresholdType, severity, message]
    );

    return result.rows[0];
  }

  static async findById(alertId) {
    const result = await query(
      `SELECT a.*, r.reactor_name, r.location
       FROM alerts a
       JOIN reactors r ON a.reactor_id = r.reactor_id
       WHERE a.alert_id = $1`,
      [alertId]
    );

    return result.rows[0];
  }

  static async getByReactor(reactorId, options = {}) {
    const { 
      isAcknowledged, 
      severity, 
      startDate, 
      endDate, 
      limit = 100, 
      offset = 0 
    } = options;

    let queryText = `
      SELECT a.*, u.username as acknowledged_by_username
      FROM alerts a
      LEFT JOIN users u ON a.acknowledged_by = u.user_id
      WHERE a.reactor_id = $1
    `;
    const params = [reactorId];
    let paramCount = 2;

    if (isAcknowledged !== undefined) {
      queryText += ` AND a.is_acknowledged = $${paramCount}`;
      params.push(isAcknowledged);
      paramCount++;
    }

    if (severity) {
      queryText += ` AND a.severity = $${paramCount}`;
      params.push(severity);
      paramCount++;
    }

    if (startDate) {
      queryText += ` AND a.created_at >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      queryText += ` AND a.created_at <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    queryText += ` ORDER BY a.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(queryText, params);
    return result.rows;
  }

  static async getAllAlerts(options = {}) {
    const { 
      isAcknowledged, 
      severity, 
      startDate, 
      endDate, 
      limit = 100, 
      offset = 0 
    } = options;

    let queryText = `
      SELECT a.*, r.reactor_name, r.location, u.username as acknowledged_by_username
      FROM alerts a
      JOIN reactors r ON a.reactor_id = r.reactor_id
      LEFT JOIN users u ON a.acknowledged_by = u.user_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (isAcknowledged !== undefined) {
      queryText += ` AND a.is_acknowledged = $${paramCount}`;
      params.push(isAcknowledged);
      paramCount++;
    }

    if (severity) {
      queryText += ` AND a.severity = $${paramCount}`;
      params.push(severity);
      paramCount++;
    }

    if (startDate) {
      queryText += ` AND a.created_at >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      queryText += ` AND a.created_at <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    queryText += ` ORDER BY a.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(queryText, params);
    return result.rows;
  }

  static async getUnacknowledged(reactorId = null) {
    let queryText = `
      SELECT a.*, r.reactor_name
      FROM alerts a
      JOIN reactors r ON a.reactor_id = r.reactor_id
      WHERE a.is_acknowledged = false
    `;
    const params = [];

    if (reactorId) {
      queryText += ' AND a.reactor_id = $1';
      params.push(reactorId);
    }

    queryText += ' ORDER BY a.severity DESC, a.created_at DESC';

    const result = await query(queryText, params);
    return result.rows;
  }

  static async acknowledge(alertId, userId) {
    const result = await query(
      `UPDATE alerts
       SET is_acknowledged = true,
           acknowledged_by = $1,
           acknowledged_at = CURRENT_TIMESTAMP
       WHERE alert_id = $2
       RETURNING *`,
      [userId, alertId]
    );

    return result.rows[0];
  }

  static async acknowledgeMultiple(alertIds, userId) {
    const result = await query(
      `UPDATE alerts
       SET is_acknowledged = true,
           acknowledged_by = $1,
           acknowledged_at = CURRENT_TIMESTAMP
       WHERE alert_id = ANY($2)
       RETURNING *`,
      [userId, alertIds]
    );

    return result.rows;
  }

  static async getAlertStats(reactorId = null) {
    let queryText = `
      SELECT 
        COUNT(*) as total_alerts,
        COUNT(*) FILTER (WHERE is_acknowledged = false) as unacknowledged,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical,
        COUNT(*) FILTER (WHERE severity = 'warning') as warning,
        COUNT(*) FILTER (WHERE severity = 'info') as info,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h
      FROM alerts
    `;

    const params = [];
    if (reactorId) {
      queryText += ' WHERE reactor_id = $1';
      params.push(reactorId);
    }

    const result = await query(queryText, params);
    return result.rows[0];
  }

  static async deleteOldAlerts(beforeDate) {
    const result = await query(
      'DELETE FROM alerts WHERE created_at < $1 AND is_acknowledged = true',
      [beforeDate]
    );

    return result.rowCount;
  }

  // Record alert notification
  static async recordNotification(alertId, userId, notificationType = 'email') {
    const result = await query(
      `INSERT INTO alert_notifications (alert_id, user_id, notification_type)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [alertId, userId, notificationType]
    );

    return result.rows[0];
  }

  static async getNotifications(alertId) {
    const result = await query(
      `SELECT an.*, u.username, u.email
       FROM alert_notifications an
       JOIN users u ON an.user_id = u.user_id
       WHERE an.alert_id = $1
       ORDER BY an.sent_at DESC`,
      [alertId]
    );

    return result.rows;
  }
}

module.exports = {
  SetPoint,
  Alert
};