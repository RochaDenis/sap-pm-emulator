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
      
      const allowedFields = ['MaintenancePlanCategory', 'MaintenancePlant', 'MaintPlanIsActive'];
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

const addDays = (dateStr, days) => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date().toISOString(); // fallback
  d.setDate(d.getDate() + parseInt(days));
  return d.toISOString();
};

/**
 * GET /MaintenancePlanCollection
 */
exports.getCollection = (req, res) => {
  try {
    let sql = `SELECT * FROM S4_MAINTPLAN`;
    let params = [];

    // Apply $filter
    if (req.query.$filter) {
      const filtered = applyFilters(sql, params, req.query.$filter);
      sql = filtered.queryStr;
      params = filtered.queryParams;
    }

    // Default Order By
    let orderByClause = ' ORDER BY MaintenancePlan ASC';
    if (req.query.$orderby) {
      const orderParts = req.query.$orderby.split(' ');
      const orderField = orderParts[0];
      const orderDir = orderParts[1] && orderParts[1].toLowerCase() === 'desc' ? 'DESC' : 'ASC';
      
      const allowedOrderFields = ['MaintenancePlan'];
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
 * GET /MaintenancePlanCollection(':MaintenancePlan')
 */
exports.getSingle = (req, res) => {
  try {
    const { MaintenancePlan } = req.params;
    const record = db.prepare('SELECT * FROM S4_MAINTPLAN WHERE MaintenancePlan = ?').get(MaintenancePlan);

    if (!record) {
      return res.status(404).json({
        error: {
          code: "MAINTPLAN_NOT_FOUND",
          message: `Maintenance Plan '${MaintenancePlan}' not found.`
        }
      });
    }

    return res.s4Single(record);
  } catch (error) {
    return res.s4Error(500, error.message);
  }
};

/**
 * POST /MaintenancePlanCollection
 */
exports.create = (req, res) => {
  try {
    const data = req.body;
    
    // Required fields check
    const required = ['MaintPlanDesc', 'MaintenancePlant', 'CycleLength', 'CycleUnit'];
    const missing = required.filter(f => !data[f]);
    if (missing.length > 0) {
      return res.s4Error(400, `Missing required fields: ${missing.join(', ')}`);
    }

    // Auto-generate MaintenancePlan: "MP-S4-" + padStart(4,'0') from count
    const countRecord = db.prepare('SELECT COUNT(*) as count FROM S4_MAINTPLAN WHERE MaintenancePlan LIKE ?').get('MP-S4-%');
    const nextIdNum = countRecord.count + 1;
    const newId = `MP-S4-${String(nextIdNum).padStart(4, '0')}`;

    data.MaintenancePlan = newId;

    // Defaults
    data.MaintPlanIsActive = "true";
    data.SchedulingStartDate = new Date().toISOString();
    
    // Auto-calculate NextPlannedDate
    if (data.CycleUnit === 'DAY' || data.CycleUnit === 'D') {
      data.NextPlannedDate = addDays(data.SchedulingStartDate, data.CycleLength);
    } else {
      // Default to assuming days if unit is unknown for emulator
      data.NextPlannedDate = addDays(data.SchedulingStartDate, data.CycleLength);
    }

    // Build insert query
    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(data);

    const sql = `INSERT INTO S4_MAINTPLAN (${fields.map(f => `"${f}"`).join(', ')}) VALUES (${placeholders})`;
    
    db.prepare(sql).run(...values);

    const created = db.prepare('SELECT * FROM S4_MAINTPLAN WHERE MaintenancePlan = ?').get(newId);
    return res.s4Single(created, 201);
  } catch (error) {
    return res.s4Error(500, error.message);
  }
};

/**
 * PATCH /MaintenancePlanCollection(':MaintenancePlan')
 */
exports.update = (req, res) => {
  try {
    const { MaintenancePlan } = req.params;
    const data = req.body;

    // Check if exists
    const existing = db.prepare('SELECT * FROM S4_MAINTPLAN WHERE MaintenancePlan = ?').get(MaintenancePlan);
    if (!existing) {
       return res.status(404).json({
        error: {
          code: "MAINTPLAN_NOT_FOUND",
          message: `Maintenance Plan '${MaintenancePlan}' not found.`
        }
      });
    }

    const updateFields = Object.keys(data);
    if (updateFields.length === 0) {
      return res.s4Error(400, "No fields provided for update");
    }

    const setClause = updateFields.map(f => `"${f}" = ?`).join(', ');
    const values = Object.values(data);
    values.push(MaintenancePlan);

    const sql = `UPDATE S4_MAINTPLAN SET ${setClause} WHERE MaintenancePlan = ?`;
    db.prepare(sql).run(...values);

    const updated = db.prepare('SELECT * FROM S4_MAINTPLAN WHERE MaintenancePlan = ?').get(MaintenancePlan);
    return res.s4Single(updated);
  } catch (error) {
    return res.s4Error(500, error.message);
  }
};

/**
 * POST /StartMaintPlnSchedule
 */
exports.startSchedule = (req, res) => {
  try {
    const { MaintenancePlan } = req.body;
    
    if (!MaintenancePlan) {
        return res.s4Error(400, "MaintenancePlan is required in request body.");
    }

    // Validate plan exists
    const plan = db.prepare('SELECT * FROM S4_MAINTPLAN WHERE MaintenancePlan = ?').get(MaintenancePlan);
    if (!plan) {
       return res.status(404).json({
        error: {
          code: "MAINTPLAN_NOT_FOUND",
          message: `Maintenance Plan '${MaintenancePlan}' not found.`
        }
      });
    }

    // Validate active
    if (plan.MaintPlanIsActive !== 'true') {
        return res.status(400).json({
            error: {
              code: "PLAN_NOT_ACTIVE",
              message: `Maintenance Plan '${MaintenancePlan}' is inactive.`
            }
        });
    }

    const now = new Date().toISOString();
    const nextDate = addDays(now, plan.CycleLength || 0);

    const updateSql = `UPDATE S4_MAINTPLAN SET LastCallDate = ?, NextPlannedDate = ? WHERE MaintenancePlan = ?`;
    db.prepare(updateSql).run(now, nextDate, MaintenancePlan);

    const updated = db.prepare('SELECT * FROM S4_MAINTPLAN WHERE MaintenancePlan = ?').get(MaintenancePlan);
    return res.s4Single(updated);

  } catch (error) {
    return res.s4Error(500, error.message);
  }
};

/**
 * POST /RestartMaintPlnSchedule
 */
exports.restartSchedule = (req, res) => {
  try {
    const { MaintenancePlan } = req.body;
    
    if (!MaintenancePlan) {
        return res.s4Error(400, "MaintenancePlan is required in request body.");
    }

    // Validate plan exists
    const plan = db.prepare('SELECT * FROM S4_MAINTPLAN WHERE MaintenancePlan = ?').get(MaintenancePlan);
    if (!plan) {
       return res.status(404).json({
        error: {
          code: "MAINTPLAN_NOT_FOUND",
          message: `Maintenance Plan '${MaintenancePlan}' not found.`
        }
      });
    }

    const now = new Date().toISOString();
    const nextDate = addDays(now, plan.CycleLength || 0);

    const updateSql = `UPDATE S4_MAINTPLAN SET MaintPlanIsActive = 'true', SchedulingStartDate = ?, NextPlannedDate = ? WHERE MaintenancePlan = ?`;
    db.prepare(updateSql).run(now, nextDate, MaintenancePlan);

    const updated = db.prepare('SELECT * FROM S4_MAINTPLAN WHERE MaintenancePlan = ?').get(MaintenancePlan);
    return res.s4Single(updated);

  } catch (error) {
    return res.s4Error(500, error.message);
  }
};

/**
 * GET /MaintenancePlanCollection(':MaintenancePlan')/to_MaintenancePlanItem
 */
exports.getItems = (req, res) => {
  try {
    const { MaintenancePlan } = req.params;
    
    // Check if plan exists
    const plan = db.prepare('SELECT MaintenancePlan FROM S4_MAINTPLAN WHERE MaintenancePlan = ?').get(MaintenancePlan);
    if (!plan) {
         return res.status(404).json({
            error: {
              code: "MAINTPLAN_NOT_FOUND",
              message: `Maintenance Plan '${MaintenancePlan}' not found.`
            }
          });
    }

    const items = db.prepare('SELECT * FROM S4_MAINTPLAN_ITEM WHERE MaintenancePlan = ?').all(MaintenancePlan);
    return res.s4Result(items);
  } catch (error) {
    return res.s4Error(500, error.message);
  }
};

/**
 * POST /MaintenancePlanCollection(':MaintenancePlan')/to_MaintenancePlanItem
 */
exports.createItem = (req, res) => {
  try {
    const { MaintenancePlan } = req.params;
    const data = req.body;

    // Check if plan exists
    const plan = db.prepare('SELECT MaintenancePlan FROM S4_MAINTPLAN WHERE MaintenancePlan = ?').get(MaintenancePlan);
    if (!plan) {
         return res.status(404).json({
            error: {
              code: "MAINTPLAN_NOT_FOUND",
              message: `Maintenance Plan '${MaintenancePlan}' not found.`
            }
          });
    }

    const required = ['TechnicalObject', 'MaintenanceItemDesc'];
    const missing = required.filter(f => !data[f]);
    if (missing.length > 0) {
      return res.s4Error(400, `Missing required fields: ${missing.join(', ')}`);
    }

    // Validate TechnicalObject exists in S4_EQUIPMENT
    const equip = db.prepare('SELECT Equipment FROM S4_EQUIPMENT WHERE Equipment = ?').get(data.TechnicalObject);
    if (!equip) {
         return res.status(400).json({
            error: {
              code: "EQUIPMENT_NOT_FOUND",
              message: `Equipment '${data.TechnicalObject}' not found in S4_EQUIPMENT.`
            }
          });
    }

    // Auto-generate MaintenancePlanItem: "ITEM-" + padStart(4,'0')
    const countRecord = db.prepare('SELECT COUNT(*) as count FROM S4_MAINTPLAN_ITEM WHERE MaintenancePlanItem LIKE ?').get('ITEM-%');
    const nextIdNum = countRecord.count + 1;
    const newItemId = `ITEM-${String(nextIdNum).padStart(4, '0')}`;

    data.MaintenancePlan = MaintenancePlan;
    data.MaintenancePlanItem = newItemId;
    data.TechObjIsEquipOrFuncnLoc = "EQUI";

    // Build insert query
    const fields = Object.keys(data);
    const placeholders = fields.map(() => '?').join(', ');
    const values = Object.values(data);

    const sql = `INSERT INTO S4_MAINTPLAN_ITEM (${fields.map(f => `"${f}"`).join(', ')}) VALUES (${placeholders})`;
    
    db.prepare(sql).run(...values);

    const created = db.prepare('SELECT * FROM S4_MAINTPLAN_ITEM WHERE MaintenancePlan = ? AND MaintenancePlanItem = ?').get(MaintenancePlan, newItemId);
    return res.s4Single(created, 201);
  } catch (error) {
    return res.s4Error(500, error.message);
  }
};
