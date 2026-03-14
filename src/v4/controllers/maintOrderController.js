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
      
      const allowedFields = ['MaintenanceOrderType', 'MaintOrdProcessingPhase', 'MaintenancePlant', 'MaintenanceNotification'];
      if (allowedFields.includes(field)) {
        conditions.push(`"${field}" = ?`);
        queryParams.push(value);
      }
    }
  });

  if (conditions.length > 0) {
    queryStr += (queryStr.includes('WHERE') ? ' AND ' : ' WHERE ') + conditions.join(' AND ');
  }

  return { queryStr, queryParams };
};

/**
 * GET /MaintenanceOrderCollection
 */
exports.getCollection = (req, res) => {
  try {
    let sql = `SELECT * FROM S4_MAINTENANCEORDER`;
    let params = [];

    // Apply $filter
    if (req.query.$filter) {
      const filtered = applyFilters(sql, params, req.query.$filter);
      sql = filtered.queryStr;
      params = filtered.queryParams;
    }

    // Default Order By
    let orderByClause = ' ORDER BY MaintOrdBasicStartDate DESC';
    if (req.query.$orderby) {
      // Basic support for $orderby=Field desc/asc
      const orderParts = req.query.$orderby.split(' ');
      const orderField = orderParts[0];
      const orderDir = orderParts[1] && orderParts[1].toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      
      const allowedOrderFields = ['MaintOrdBasicStartDate', 'MaintenanceOrder'];
      if (allowedOrderFields.includes(orderField)) {
         orderByClause = ` ORDER BY "${orderField}" ${orderDir}`;
      }
    }
    sql += orderByClause;

    // Pagination
    const top = parseInt(req.query.$top) || 100;
    const skip = parseInt(req.query.$skip) || 0;
    
    // Count query
    const countSql = sql.replace(/SELECT .*? FROM/i, 'SELECT COUNT(*) as count FROM').replace(/ ORDER BY .*/, '');
    let totalCount = 0;
    try {
        totalCount = db.prepare(countSql).get(...params).count;
    } catch (e) {
        // Fallback or ignore if query format is complex.
    }

    sql += ` LIMIT ? OFFSET ?`;
    params.push(top, skip);

    const records = db.prepare(sql).all(...params);

    return res.s4Result(records, 200, { '__count': totalCount });
  } catch (error) {
    return res.s4Error(500, error.message);
  }
};

/**
 * GET /MaintenanceOrderCollection(':MaintenanceOrder')
 */
exports.getSingle = (req, res) => {
  try {
    const { MaintenanceOrder } = req.params;
    const record = db.prepare('SELECT * FROM S4_MAINTENANCEORDER WHERE MaintenanceOrder = ?').get(MaintenanceOrder);

    if (!record) {
      return res.status(404).json({
        error: {
          code: "ORDER_NOT_FOUND",
          message: `Maintenance Order '${MaintenanceOrder}' not found.`
        }
      });
    }

    return res.s4Single(record);
  } catch (error) {
    return res.s4Error(500, error.message);
  }
};

/**
 * POST /MaintenanceOrderCollection
 */
exports.create = (req, res) => {
  try {
    const data = req.body;
    
    // Required fields check
    const required = ['MaintenanceOrderDesc', 'MaintenanceOrderType', 'MaintenancePlant'];
    const missing = required.filter(f => !data[f]);
    if (missing.length > 0) {
      return res.s4Error(400, `Missing required fields: ${missing.join(', ')}`);
    }

    // Auto-generate MaintenanceOrder: "OR-" + YYYYMMDD + "-" + padStart(4,'0')
    const dateStr = new Date().toISOString().replace(/-/g, '').substring(0, 8); // YYYYMMDD
    const countRecord = db.prepare('SELECT COUNT(*) as count FROM S4_MAINTENANCEORDER WHERE MaintenanceOrder LIKE ?').get(`OR-${dateStr}-%`);
    const nextIdNum = countRecord.count + 1;
    const newId = `OR-${dateStr}-${String(nextIdNum).padStart(4, '0')}`;

    data.MaintenanceOrder = newId;

    // Set defaults
    if (!data.MaintOrdProcessingPhase) data.MaintOrdProcessingPhase = "01";
    if (!data.MaintOrdProcessingPhaseDesc) data.MaintOrdProcessingPhaseDesc = "Created";
    if (!data.OrderIsCreated) data.OrderIsCreated = "true";
    if (!data.MaintOrdBasicStartDate) {
        data.MaintOrdBasicStartDate = new Date().toISOString();
    }

    // Build insert query
    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(data);

    const sql = `INSERT INTO S4_MAINTENANCEORDER (${fields.map(f => `"${f}"`).join(', ')}) VALUES (${placeholders})`;
    
    db.prepare(sql).run(...values);

    const created = db.prepare('SELECT * FROM S4_MAINTENANCEORDER WHERE MaintenanceOrder = ?').get(newId);
    return res.s4Single(created, 201);
  } catch (error) {
    return res.s4Error(500, error.message);
  }
};
