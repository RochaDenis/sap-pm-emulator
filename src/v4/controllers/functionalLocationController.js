const db = require('../database');

/**
 * Helper to build OData v4 style filters
 */
const applyFilters = (queryStr, queryParams, filterString) => {
  if (!filterString) return { queryStr, queryParams };
  
  const filterParts = filterString.split(' and ');
  const conditions = [];

  filterParts.forEach(part => {
    const match = part.trim().match(/(\w+)\s+eq\s+['"]?([^'"]+)['"]?/i);
    if (match) {
      const field = match[1];
      const value = match[2];
      
      const allowedFields = ['MaintenancePlant', 'CompanyCode', 'CostCenter', 'FunctLocIsAvailable'];
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

exports.getFunctionalLocationCollection = (req, res) => {
  try {
    let sql = `SELECT * FROM S4_FUNCTIONALLOCATION`;
    let params = [];

    // Apply $filter
    if (req.query.$filter) {
      const filtered = applyFilters(sql, params, req.query.$filter);
      sql = filtered.queryStr;
      params = filtered.queryParams;
    }

    if (req.query.$select) {
      const fields = req.query.$select.split(',').map(f => f.trim());
      sql = sql.replace('SELECT *', `SELECT ${fields.map(f => `"${f}"`).join(', ')}`);
    }

    const top = parseInt(req.query.$top) || 100;
    const skip = parseInt(req.query.$skip) || 0;
    
    // Total count calculation
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

exports.getFunctionalLocation = (req, res) => {
  try {
    const { FunctionalLocation } = req.params;
    const record = db.prepare('SELECT * FROM S4_FUNCTIONALLOCATION WHERE FunctionalLocation = ?').get(FunctionalLocation);

    if (!record) {
      return res.status(404).json({
        error: {
          code: "FUNCTIONALLOCATION_NOT_FOUND",
          message: `Functional Location '${FunctionalLocation}' not found.`
        }
      });
    }

    return res.s4Single(record);
  } catch (error) {
    return res.s4Error(500, error.message);
  }
};

exports.createFunctionalLocation = (req, res) => {
  try {
    const data = req.body;
    
    // Auto-generate if not provided
    if (!data.FunctionalLocation) {
        const countRecord = db.prepare('SELECT COUNT(*) as count FROM S4_FUNCTIONALLOCATION').get();
        const nextIdNum = countRecord.count + 1;
        data.FunctionalLocation = "FL-" + String(nextIdNum).padStart(4, '0');
    }

    if (!data.FunctLocIsAvailable) {
        data.FunctLocIsAvailable = "true";
    }

    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(data);

    const sql = `INSERT INTO S4_FUNCTIONALLOCATION (${fields.map(f => `"${f}"`).join(', ')}) VALUES (${placeholders})`;
    
    db.prepare(sql).run(...values);

    const created = db.prepare('SELECT * FROM S4_FUNCTIONALLOCATION WHERE FunctionalLocation = ?').get(data.FunctionalLocation);
    return res.s4Single(created, 201);
  } catch (error) {
    return res.s4Error(500, error.message);
  }
};

exports.updateFunctionalLocation = (req, res) => {
  try {
    const { FunctionalLocation } = req.params;
    const data = req.body;

    const existing = db.prepare('SELECT FunctionalLocation FROM S4_FUNCTIONALLOCATION WHERE FunctionalLocation = ?').get(FunctionalLocation);
    if (!existing) {
      return res.status(404).json({
        error: {
          code: "FUNCTIONALLOCATION_NOT_FOUND",
          message: `Functional Location '${FunctionalLocation}' not found.`
        }
      });
    }

    if (Object.keys(data).length === 0) {
      return res.s4Single(existing);
    }

    const fields = Object.keys(data);
    const setClause = fields.map(f => `"${f}" = ?`).join(', ');
    const values = Object.values(data);
    values.push(FunctionalLocation);

    const sql = `UPDATE S4_FUNCTIONALLOCATION SET ${setClause} WHERE FunctionalLocation = ?`;
    db.prepare(sql).run(...values);

    const updated = db.prepare('SELECT * FROM S4_FUNCTIONALLOCATION WHERE FunctionalLocation = ?').get(FunctionalLocation);
    return res.s4Single(updated);
  } catch (error) {
    return res.s4Error(500, error.message);
  }
};

exports.deleteFunctionalLocation = (req, res) => {
  try {
    const { FunctionalLocation } = req.params;

    // Check FKs: S4_MAINTENANCENOTIFICATION or S4_EQUIPMENT
    const notifRef = db.prepare('SELECT COUNT(*) as count FROM S4_MAINTENANCENOTIFICATION WHERE FunctionalLocation = ?').get(FunctionalLocation);
    const equipRef = db.prepare('SELECT COUNT(*) as count FROM S4_EQUIPMENT WHERE FunctionalLocation = ?').get(FunctionalLocation);

    if (notifRef.count > 0 || equipRef.count > 0) {
      return res.status(400).json({
        error: {
          code: "DEPENDENCY_EXISTS",
          message: `Cannot delete Functional Location '${FunctionalLocation}' because it is referenced in notifications or equipment.`
        }
      });
    }

    const info = db.prepare('DELETE FROM S4_FUNCTIONALLOCATION WHERE FunctionalLocation = ?').run(FunctionalLocation);

    if (info.changes === 0) {
      return res.status(404).json({
        error: {
           code: "FUNCTIONALLOCATION_NOT_FOUND",
           message: `Functional Location '${FunctionalLocation}' not found.`
        }
      });
    }

    return res.status(204).send();
  } catch (error) {
    return res.s4Error(500, error.message);
  }
};
