const db = require('../database');

/**
 * Helper to build OData v4 style filters
 */
const applyFilters = (queryStr, queryParams, filterString) => {
  if (!filterString) return { queryStr, queryParams };
  
  // Very basic $filter support for eq only
  // Example: MaintenancePlant eq '1000'
  const filterParts = filterString.split(' and ');
  const conditions = [];

  filterParts.forEach(part => {
    const match = part.trim().match(/(\w+)\s+eq\s+['"]?([^'"]+)['"]?/i);
    if (match) {
      const field = match[1];
      const value = match[2];
      
      // Basic validation of allowed fields to prevent arbitrary injection
      const allowedFields = ['EquipmentCategory', 'MaintenancePlant', 'FunctionalLocation', 'EquipmentIsAvailable'];
      if (allowedFields.includes(field)) {
        conditions.push(`"${field}" = ?`);
        queryParams.push(value);
      }
    }
  });

  if (conditions.length > 0) {
    queryStr += ` WHERE ${conditions.join(' AND ')}`;
  }

  return { queryStr, queryParams };
};

/**
 * GET /EquipmentCollection
 */
exports.getEquipmentCollection = (req, res) => {
  try {
    let sql = `SELECT * FROM S4_EQUIPMENT`;
    let params = [];

    // Apply $filter
    if (req.query.$filter) {
      const filtered = applyFilters(sql, params, req.query.$filter);
      sql = filtered.queryStr;
      params = filtered.queryParams;
    }

    // Apply $select (basic support)
    if (req.query.$select) {
      const fields = req.query.$select.split(',').map(f => f.trim());
      // Re-build select clause
      // In production, we'd validate fields against the schema
      sql = sql.replace('SELECT *', `SELECT ${fields.map(f => `"${f}"`).join(', ')}`);
    }

    // Pagination
    const top = parseInt(req.query.$top) || 100;
    const skip = parseInt(req.query.$skip) || 0;
    
    // Total count query for inlinecount equivalent if needed, though pure v4 uses $count
    const countSql = sql.replace(/SELECT .*? FROM/i, 'SELECT COUNT(*) as count FROM');
    const totalCount = db.prepare(countSql).get(...params).count;

    sql += ` LIMIT ? OFFSET ?`;
    params.push(top, skip);

    const records = db.prepare(sql).all(...params);

    return res.s4Result(records, 200, { '@odata.count': totalCount });
  } catch (error) {
    return res.s4Error(500, error.message);
  }
};

/**
 * GET /EquipmentCollection(':Equipment')
 */
exports.getEquipment = (req, res) => {
  try {
    const { Equipment } = req.params;
    const record = db.prepare('SELECT * FROM S4_EQUIPMENT WHERE Equipment = ?').get(Equipment);

    if (!record) {
      return res.status(404).json({
        error: {
          code: "EQUIPMENT_NOT_FOUND",
          message: `Equipment '${Equipment}' not found.`
        }
      });
    }

    return res.s4Single(record);
  } catch (error) {
    return res.s4Error(500, error.message);
  }
};

/**
 * POST /EquipmentCollection
 */
exports.createEquipment = (req, res) => {
  try {
    const data = req.body;
    
    // Required fields check
    const required = ['EquipmentName', 'EquipmentCategory', 'MaintenancePlant'];
    const missing = required.filter(f => !data[f]);
    if (missing.length > 0) {
      return res.s4Error(400, `Missing required fields: ${missing.join(', ')}`);
    }

    // Generate Equipment ID (EQ-XXXXX)
    const countRecord = db.prepare('SELECT COUNT(*) as count FROM S4_EQUIPMENT').get();
    const nextIdNum = countRecord.count + 1;
    const newEquipmentId = "EQ-" + String(nextIdNum).padStart(5, '0');

    data.Equipment = newEquipmentId;
    data.EquipmentIsAvailable = "true";
    data.MaintenanceObjectIsDown = "false";

    // Build insert query
    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(data);

    const sql = `INSERT INTO S4_EQUIPMENT (${fields.map(f => `"${f}"`).join(', ')}) VALUES (${placeholders})`;
    
    db.prepare(sql).run(...values);

    const created = db.prepare('SELECT * FROM S4_EQUIPMENT WHERE Equipment = ?').get(newEquipmentId);
    return res.s4Single(created, 201);
  } catch (error) {
    return res.s4Error(500, error.message);
  }
};

/**
 * PATCH /EquipmentCollection(':Equipment')
 */
exports.updateEquipment = (req, res) => {
  try {
    const { Equipment } = req.params;
    const data = req.body;

    // Check existence
    const existing = db.prepare('SELECT Equipment FROM S4_EQUIPMENT WHERE Equipment = ?').get(Equipment);
    if (!existing) {
      return res.status(404).json({
        error: {
          code: "EQUIPMENT_NOT_FOUND",
          message: `Equipment '${Equipment}' not found.`
        }
      });
    }

    if (Object.keys(data).length === 0) {
      return res.s4Single(existing); // nothing to update
    }

    // Build update query
    const fields = Object.keys(data);
    const setClause = fields.map(f => `"${f}" = ?`).join(', ');
    const values = Object.values(data);
    
    values.push(Equipment); // for WHERE

    const sql = `UPDATE S4_EQUIPMENT SET ${setClause} WHERE Equipment = ?`;
    db.prepare(sql).run(...values);

    const updated = db.prepare('SELECT * FROM S4_EQUIPMENT WHERE Equipment = ?').get(Equipment);
    return res.s4Single(updated);
  } catch (error) {
    return res.s4Error(500, error.message);
  }
};

/**
 * DELETE /EquipmentCollection(':Equipment')
 */
exports.deleteEquipment = (req, res) => {
  try {
    const { Equipment } = req.params;

    // Check FKs: S4_MAINTENANCENOTIFICATION or S4_MAINTPLAN_ITEM
    const notifRef = db.prepare('SELECT COUNT(*) as count FROM S4_MAINTENANCENOTIFICATION WHERE TechnicalObject = ?').get(Equipment);
    const maintPlanRef = db.prepare('SELECT COUNT(*) as count FROM S4_MAINTPLAN_ITEM WHERE TechnicalObject = ?').get(Equipment);

    if (notifRef.count > 0 || maintPlanRef.count > 0) {
      return res.status(400).json({
        error: {
          code: "DEPENDENCY_EXISTS",
          message: `Cannot delete Equipment '${Equipment}' because it is referenced in maintenance notifications or maintenance plans.`
        }
      });
    }

    const info = db.prepare('DELETE FROM S4_EQUIPMENT WHERE Equipment = ?').run(Equipment);

    if (info.changes === 0) {
      return res.status(404).json({
        error: {
           code: "EQUIPMENT_NOT_FOUND",
           message: `Equipment '${Equipment}' not found.`
        }
      });
    }

    return res.status(204).send();
  } catch (error) {
    return res.s4Error(500, error.message);
  }
};

/**
 * GET /EquipmentCollection(':Equipment')/to_MeasuringPoint
 * (Returns maintenance notifications linked to this equipment as per instructions)
 */
exports.getEquipmentMeasuringPoints = (req, res) => {
  try {
    const { Equipment } = req.params;

    // Verify equipment exists
    const existing = db.prepare('SELECT Equipment FROM S4_EQUIPMENT WHERE Equipment = ?').get(Equipment);
    if (!existing) {
       return res.status(404).json({
        error: {
          code: "EQUIPMENT_NOT_FOUND",
          message: `Equipment '${Equipment}' not found.`
        }
      });
    }

    const sql = `SELECT * FROM S4_MAINTENANCENOTIFICATION WHERE TechnicalObject = ?`;
    const records = db.prepare(sql).all(Equipment);

    return res.s4Result(records);
  } catch (error) {
    return res.s4Error(500, error.message);
  }
};
