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
      
      const allowedFields = ['NotificationType', 'MaintPriority', 'NotifProcessingPhase', 'TechnicalObject', 'MaintenancePlant'];
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
 * GET /MaintenanceNotificationCollection
 */
exports.getCollection = (req, res) => {
  try {
    let sql = `SELECT * FROM S4_MAINTENANCENOTIFICATION`;
    let params = [];

    // Apply $filter
    if (req.query.$filter) {
      const filtered = applyFilters(sql, params, req.query.$filter);
      sql = filtered.queryStr;
      params = filtered.queryParams;
    }

    // Default Order By
    let orderByClause = ' ORDER BY CreationDate DESC';
    if (req.query.$orderby) {
      // Basic support for $orderby=Field desc/asc
      const orderParts = req.query.$orderby.split(' ');
      const orderField = orderParts[0];
      const orderDir = orderParts[1] && orderParts[1].toLowerCase() === 'desc' ? 'DESC' : 'ASC';
      
      const allowedOrderFields = ['CreationDate', 'MaintenanceNotification'];
      if (allowedOrderFields.includes(orderField)) {
         orderByClause = ` ORDER BY "${orderField}" ${orderDir}`;
      }
    }
    sql += orderByClause;

    // Pagination
    const top = parseInt(req.query.$top) || 100;
    const skip = parseInt(req.query.$skip) || 0;
    
    const countSql = sql.replace(/SELECT .*? FROM/i, 'SELECT COUNT(*) as count FROM').replace(/ ORDER BY .*/, '');
    const totalCount = db.prepare(countSql).get(...params).count;

    sql += ` LIMIT ? OFFSET ?`;
    params.push(top, skip);

    const records = db.prepare(sql).all(...params);

    return res.s4Result(records, 200, { '__count': totalCount });
  } catch (error) {
    return res.s4Error(500, error.message);
  }
};

/**
 * GET /MaintenanceNotificationCollection(':MaintenanceNotification')
 */
exports.getSingle = (req, res) => {
  try {
    const { MaintenanceNotification } = req.params;
    const record = db.prepare('SELECT * FROM S4_MAINTENANCENOTIFICATION WHERE MaintenanceNotification = ?').get(MaintenanceNotification);

    if (!record) {
      return res.status(404).json({
        error: {
          code: "NOTIFICATION_NOT_FOUND",
          message: `Maintenance Notification '${MaintenanceNotification}' not found.`
        }
      });
    }

    return res.s4Single(record);
  } catch (error) {
    return res.s4Error(500, error.message);
  }
};

/**
 * POST /MaintenanceNotificationCollection
 */
exports.create = (req, res) => {
  try {
    const data = req.body;
    
    // Required fields check
    const required = ['NotificationText', 'NotificationType', 'TechnicalObject'];
    const missing = required.filter(f => !data[f]);
    if (missing.length > 0) {
      return res.s4Error(400, `Missing required fields: ${missing.join(', ')}`);
    }

    // Validate FK: TechnicalObject must exist in S4_EQUIPMENT
    const equipment = db.prepare('SELECT Equipment FROM S4_EQUIPMENT WHERE Equipment = ?').get(data.TechnicalObject);
    if (!equipment) {
        return res.status(400).json({
            error: {
              code: "EQUIPMENT_NOT_FOUND",
              message: `Equipment '${data.TechnicalObject}' not found.`
            }
          });
    }

    // Auto-generate MaintenanceNotification: "NF-" + YYYYMMDD + "-" + padStart(4,'0')
    const dateStr = new Date().toISOString().replace(/-/g, '').substring(0, 8); // YYYYMMDD
    const countRecord = db.prepare('SELECT COUNT(*) as count FROM S4_MAINTENANCENOTIFICATION WHERE MaintenanceNotification LIKE ?').get(`NF-${dateStr}-%`);
    const nextIdNum = countRecord.count + 1;
    const newId = `NF-${dateStr}-${String(nextIdNum).padStart(4, '0')}`;

    data.MaintenanceNotification = newId;
    data.NotifProcessingPhase = "1"; // outstanding
    data.CreationDate = new Date().toISOString();

    // Build insert query
    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(data);

    const sql = `INSERT INTO S4_MAINTENANCENOTIFICATION (${fields.map(f => `"${f}"`).join(', ')}) VALUES (${placeholders})`;
    
    db.prepare(sql).run(...values);

    const created = db.prepare('SELECT * FROM S4_MAINTENANCENOTIFICATION WHERE MaintenanceNotification = ?').get(newId);
    return res.s4Single(created, 201);
  } catch (error) {
    return res.s4Error(500, error.message);
  }
};

/**
 * PATCH /MaintenanceNotificationCollection(':MaintenanceNotification')
 */
exports.update = (req, res) => {
  try {
    const { MaintenanceNotification } = req.params;
    const data = req.body;

    // Check existence
    const existing = db.prepare('SELECT MaintenanceNotification FROM S4_MAINTENANCENOTIFICATION WHERE MaintenanceNotification = ?').get(MaintenanceNotification);
    if (!existing) {
      return res.status(404).json({
        error: {
          code: "NOTIFICATION_NOT_FOUND",
          message: `Maintenance Notification '${MaintenanceNotification}' not found.`
        }
      });
    }

    if (Object.keys(data).length === 0) {
      return res.s4Single(existing); // nothing to update
    }
    
    if (data.MaintenanceNotification) {
         delete data.MaintenanceNotification; // prevent updating PK
    }

    // Build update query
    const fields = Object.keys(data);
    const setClause = fields.map(f => `"${f}" = ?`).join(', ');
    const values = Object.values(data);
    
    values.push(MaintenanceNotification);

    const sql = `UPDATE S4_MAINTENANCENOTIFICATION SET ${setClause} WHERE MaintenanceNotification = ?`;
    db.prepare(sql).run(...values);

    const updated = db.prepare('SELECT * FROM S4_MAINTENANCENOTIFICATION WHERE MaintenanceNotification = ?').get(MaintenanceNotification);
    return res.s4Single(updated);
  } catch (error) {
    return res.s4Error(500, error.message);
  }
};

/**
 * FUNCTION IMPORT: POST /SetToInProcess
 */
exports.setToInProcess = (req, res) => {
  try {
    const { MaintenanceNotification } = req.body;

    if (!MaintenanceNotification) {
        return res.s4Error(400, "Missing required parameter 'MaintenanceNotification' in body.");
    }

    const record = db.prepare('SELECT * FROM S4_MAINTENANCENOTIFICATION WHERE MaintenanceNotification = ?').get(MaintenanceNotification);
    
    if (!record) {
      return res.status(404).json({
        error: {
          code: "NOTIFICATION_NOT_FOUND",
          message: `Maintenance Notification '${MaintenanceNotification}' not found.`
        }
      });
    }

    if (record.NotifProcessingPhase !== "1") {
        return res.status(400).json({
            error: {
              code: "INVALID_STATUS_TRANSITION",
              message: `Cannot set to In Process. Current phase is '${record.NotifProcessingPhase}', expected '1' (Outstanding).`
            }
          });
    }

    db.prepare('UPDATE S4_MAINTENANCENOTIFICATION SET NotifProcessingPhase = ? WHERE MaintenanceNotification = ?').run('2', MaintenanceNotification);
    
    const updated = db.prepare('SELECT * FROM S4_MAINTENANCENOTIFICATION WHERE MaintenanceNotification = ?').get(MaintenanceNotification);
    return res.s4Single(updated);
  } catch (error) {
    return res.s4Error(500, error.message);
  }
};

/**
 * FUNCTION IMPORT: POST /Complete
 */
exports.complete = (req, res) => {
  try {
    const { MaintenanceNotification } = req.body;

    if (!MaintenanceNotification) {
        return res.s4Error(400, "Missing required parameter 'MaintenanceNotification' in body.");
    }

    const record = db.prepare('SELECT * FROM S4_MAINTENANCENOTIFICATION WHERE MaintenanceNotification = ?').get(MaintenanceNotification);
    
    if (!record) {
      return res.status(404).json({
        error: {
          code: "NOTIFICATION_NOT_FOUND",
          message: `Maintenance Notification '${MaintenanceNotification}' not found.`
        }
      });
    }

    if (record.NotifProcessingPhase !== "2") {
        return res.status(400).json({
            error: {
              code: "INVALID_STATUS_TRANSITION",
              message: `Cannot Complete. Current phase is '${record.NotifProcessingPhase}', expected '2' (In Process).`
            }
          });
    }

    const endNowDate = new Date().toISOString();
    db.prepare('UPDATE S4_MAINTENANCENOTIFICATION SET NotifProcessingPhase = ?, MalfunctionEndDate = ? WHERE MaintenanceNotification = ?').run('3', endNowDate, MaintenanceNotification);
    
    const updated = db.prepare('SELECT * FROM S4_MAINTENANCENOTIFICATION WHERE MaintenanceNotification = ?').get(MaintenanceNotification);
    return res.s4Single(updated);
  } catch (error) {
    return res.s4Error(500, error.message);
  }
};

/**
 * FUNCTION IMPORT: POST /Postpone
 */
exports.postpone = (req, res) => {
  try {
    const { MaintenanceNotification } = req.body;

    if (!MaintenanceNotification) {
        return res.s4Error(400, "Missing required parameter 'MaintenanceNotification' in body.");
    }

    const record = db.prepare('SELECT * FROM S4_MAINTENANCENOTIFICATION WHERE MaintenanceNotification = ?').get(MaintenanceNotification);
    
    if (!record) {
      return res.status(404).json({
        error: {
          code: "NOTIFICATION_NOT_FOUND",
          message: `Maintenance Notification '${MaintenanceNotification}' not found.`
        }
      });
    }

    if (record.NotifProcessingPhase !== "1" && record.NotifProcessingPhase !== "2") {
        return res.status(400).json({
            error: {
              code: "INVALID_STATUS_TRANSITION",
              message: `Cannot Postpone. Current phase is '${record.NotifProcessingPhase}', expected '1' (Outstanding) or '2' (In Process).`
            }
          });
    }

    db.prepare('UPDATE S4_MAINTENANCENOTIFICATION SET NotifProcessingPhase = ? WHERE MaintenanceNotification = ?').run('4', MaintenanceNotification);
    
    const updated = db.prepare('SELECT * FROM S4_MAINTENANCENOTIFICATION WHERE MaintenanceNotification = ?').get(MaintenanceNotification);
    return res.s4Single(updated);
  } catch (error) {
    return res.s4Error(500, error.message);
  }
};

/**
 * NAVIGATION: GET /MaintenanceNotificationCollection(':MaintenanceNotification')/to_MaintenanceOrder
 */
exports.getOrders = (req, res) => {
  try {
    const { MaintenanceNotification } = req.params;

    // Verify existence
    const existing = db.prepare('SELECT MaintenanceNotification FROM S4_MAINTENANCENOTIFICATION WHERE MaintenanceNotification = ?').get(MaintenanceNotification);
    if (!existing) {
       return res.status(404).json({
        error: {
          code: "NOTIFICATION_NOT_FOUND",
          message: `Maintenance Notification '${MaintenanceNotification}' not found.`
        }
      });
    }

    const sql = `SELECT * FROM S4_MAINTENANCEORDER WHERE MaintenanceNotification = ?`;
    const records = db.prepare(sql).all(MaintenanceNotification);

    return res.s4Result(records);
  } catch (error) {
    return res.s4Error(500, error.message);
  }
};
