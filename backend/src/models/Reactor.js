const { query } = require('../config/database');

class Reactor {
  // Create new reactor
  static async create(reactorData) {
    const { reactorName, location, description, dataRetentionDays } = reactorData;

    const result = await query(
      `INSERT INTO reactors (reactor_name, location, description, data_retention_days)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [reactorName, location, description, dataRetentionDays || 365]
    );

    return result.rows[0];
  }

  // Find reactor by ID
  static async findById(reactorId) {
    const result = await query(
      'SELECT * FROM reactors WHERE reactor_id = $1',
      [reactorId]
    );

    return result.rows[0];
  }

  // Get all reactors
  static async findAll(filters = {}) {
    let queryText = 'SELECT * FROM reactors WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters.isActive !== undefined) {
      queryText += ` AND is_active = $${paramCount}`;
      params.push(filters.isActive);
      paramCount++;
    }

    queryText += ' ORDER BY reactor_name';

    const result = await query(queryText, params);
    return result.rows;
  }

  // Get reactors accessible by user
  static async findByUserId(userId, userRole) {
    // Admin can see all reactors
    if (userRole === 'admin') {
      return await this.findAll({ isActive: true });
    }

    // Normal users see only assigned reactors
    const result = await query(
      `SELECT 
        r.*,
        ura.access_level
       FROM reactors r
       JOIN user_reactor_access ura ON r.reactor_id = ura.reactor_id
       WHERE ura.user_id = $1 AND r.is_active = true
       ORDER BY r.reactor_name`,
      [userId]
    );

    return result.rows;
  }

  // Update reactor
  static async update(reactorId, updates) {
    const allowedFields = ['reactor_name', 'location', 'description', 'data_retention_days', 'is_active'];
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

    params.push(reactorId);

    const result = await query(
      `UPDATE reactors
       SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE reactor_id = $${paramCount}
       RETURNING *`,
      params
    );

    return result.rows[0];
  }

  // Delete reactor
  static async delete(reactorId) {
    await query('DELETE FROM reactors WHERE reactor_id = $1', [reactorId]);
    return true;
  }

  // Get reactor equipment
  static async getEquipment(reactorId) {
    const result = await query(
      `SELECT * FROM equipment 
       WHERE reactor_id = $1 AND is_active = true
       ORDER BY name`,
      [reactorId]
    );

    return result.rows;
  }

  // Add equipment to reactor
  static async addEquipment(reactorId, equipmentData) {
    const { name, type, manufacturer, serialNumber, description } = equipmentData;

    const result = await query(
      `INSERT INTO equipment (reactor_id, name, type, manufacturer, serial_number, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [reactorId, name, type, manufacturer, serialNumber, description]
    );

    return result.rows[0];
  }

  // Get assigned users
  static async getAssignedUsers(reactorId) {
    const result = await query(
      `SELECT 
        u.user_id,
        u.username,
        u.full_name,
        u.email,
        u.role,
        ura.access_level,
        ura.assigned_on
       FROM user_reactor_access ura
       JOIN users u ON ura.user_id = u.user_id
       WHERE ura.reactor_id = $1 AND u.is_active = true
       ORDER BY u.full_name`,
      [reactorId]
    );

    return result.rows;
  }

  // Get latest status
  static async getLatestStatus(reactorId) {
    const result = await query(
      `SELECT * FROM latest_reactor_status WHERE reactor_id = $1`,
      [reactorId]
    );

    return result.rows[0];
  }

  // Check if reactor name exists
  static async nameExists(reactorName, excludeReactorId = null) {
    let queryText = 'SELECT reactor_id FROM reactors WHERE reactor_name = $1';
    const params = [reactorName];

    if (excludeReactorId) {
      queryText += ' AND reactor_id != $2';
      params.push(excludeReactorId);
    }

    const result = await query(queryText, params);
    return result.rows.length > 0;
  }

  // Get reactor statistics
  static async getStatistics(reactorId) {
    const result = await query(
      `SELECT
        (SELECT COUNT(*) FROM dilution_data WHERE reactor_id = $1) as dilution_records,
        (SELECT COUNT(*) FROM gas_data WHERE reactor_id = $1) as gas_records,
        (SELECT COUNT(*) FROM level_control_data WHERE reactor_id = $1) as level_records,
        (SELECT COUNT(*) FROM alerts WHERE reactor_id = $1) as total_alerts,
        (SELECT COUNT(*) FROM alerts WHERE reactor_id = $1 AND is_acknowledged = false) as unack_alerts,
        (SELECT MAX(timestamp) FROM dilution_data WHERE reactor_id = $1) as last_dilution_data,
        (SELECT MAX(timestamp) FROM gas_data WHERE reactor_id = $1) as last_gas_data,
        (SELECT MAX(timestamp) FROM level_control_data WHERE reactor_id = $1) as last_level_data
      `,
      [reactorId]
    );

    return result.rows[0];
  }
}

module.exports = Reactor;