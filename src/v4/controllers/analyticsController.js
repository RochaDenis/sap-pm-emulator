const db = require('../database');

// GET /EquipmentAvailability
exports.getEquipmentAvailability = (req, res) => {
  try {
    const totalRow = db.prepare(`SELECT COUNT(*) as count FROM S4_EQUIPMENT`).get();
    const total = totalRow ? totalRow.count : 0;
    
    const availableRow = db.prepare(`SELECT COUNT(*) as count FROM S4_EQUIPMENT WHERE EquipmentIsAvailable = 'true'`).get();
    const available = availableRow ? availableRow.count : 0;
    
    const downRow = db.prepare(`SELECT COUNT(*) as count FROM S4_EQUIPMENT WHERE MaintenanceObjectIsDown = 'true'`).get();
    const down = downRow ? downRow.count : 0;
    
    const availabilityRate = total > 0 ? (available / total * 100).toFixed(1) + '%' : '0.0%';
    
    return res.s4Single({
      total,
      available,
      down,
      availabilityRate
    });
  } catch (err) {
    return res.s4Error(500, err.message);
  }
};

// GET /NotificationsByPhase
exports.getNotificationsByPhase = (req, res) => {
  try {
    const rows = db.prepare(`SELECT NotifProcessingPhase as phase, COUNT(*) as count FROM S4_MAINTENANCENOTIFICATION GROUP BY NotifProcessingPhase`).all();
    const descMap = {
      "1": "Outstanding",
      "2": "In Process",
      "3": "Completed",
      "4": "Postponed"
    };
    const records = rows.map(r => ({
      phase: r.phase,
      phaseDesc: descMap[r.phase] || r.phase,
      count: r.count
    }));
    return res.s4Result(records);
  } catch (err) {
    return res.s4Error(500, err.message);
  }
};

// GET /OrdersByPhase
exports.getOrdersByPhase = (req, res) => {
  try {
    const rows = db.prepare(`SELECT MaintOrdProcessingPhase as phase, COUNT(*) as count FROM S4_MAINTENANCEORDER GROUP BY MaintOrdProcessingPhase`).all();
    const descMap = {
      "1": "Created",
      "2": "Released",
      "4": "Technically Completed",
      "5": "Closed"
    };
    const records = rows.map(r => ({
      phase: r.phase,
      phaseDesc: descMap[r.phase] || r.phase,
      count: r.count
    }));
    return res.s4Result(records);
  } catch (err) {
    return res.s4Error(500, err.message);
  }
};

function todayYYYYMMDD() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// GET /MaintenancePlanCompliance
exports.getMaintenancePlanCompliance = (req, res) => {
  try {
    const totalRow = db.prepare(`SELECT COUNT(*) as count FROM S4_MAINTPLAN`).get();
    const total = totalRow ? totalRow.count : 0;
    
    const activeRow = db.prepare(`SELECT COUNT(*) as count FROM S4_MAINTPLAN WHERE MaintPlanIsActive = 'true'`).get();
    const active = activeRow ? activeRow.count : 0;
    
    const today = todayYYYYMMDD();
    const overdueRow = db.prepare(`SELECT COUNT(*) as count FROM S4_MAINTPLAN WHERE NextPlannedDate < ? AND NextPlannedDate != '' AND NextPlannedDate IS NOT NULL`).get(today);
    const overdue = overdueRow ? overdueRow.count : 0;
    
    const complianceRate = active > 0 ? ((active - overdue) / active * 100).toFixed(1) + '%' : '0.0%';
    
    return res.s4Single({
      total,
      active,
      overdue,
      complianceRate
    });
  } catch (err) {
    return res.s4Error(500, err.message);
  }
};

// GET /CriticalEquipment
exports.getCriticalEquipment = (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT e.Equipment, e.EquipmentName, COUNT(n.MaintenanceNotification) as openNotifications
      FROM S4_EQUIPMENT e
      JOIN S4_MAINTENANCENOTIFICATION n ON e.Equipment = n.TechnicalObject
      WHERE e.MaintenanceObjectIsDown = 'true' 
        AND n.NotifProcessingPhase IN ('1','2')
      GROUP BY e.Equipment, e.EquipmentName
      ORDER BY openNotifications DESC
      LIMIT 10
    `).all();
    return res.s4Result(rows);
  } catch (err) {
    return res.s4Error(500, err.message);
  }
};

// GET /NotificationTrend
exports.getNotificationTrend = (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT SUBSTR(REPLACE(CreationDate, '-', ''), 1, 6) as monthRaw, COUNT(*) as count
      FROM S4_MAINTENANCENOTIFICATION
      WHERE CreationDate IS NOT NULL AND CreationDate != ''
      GROUP BY monthRaw
      ORDER BY monthRaw DESC
      LIMIT 6
    `).all();
    
    rows.sort((a, b) => a.monthRaw.localeCompare(b.monthRaw));
    
    const records = rows.map(r => {
      const yStr = r.monthRaw.substring(0,4);
      const mStr = r.monthRaw.substring(4,6);
      return {
        month: `${yStr}-${mStr}`,
        count: r.count
      };
    });
    return res.s4Result(records);
  } catch (err) {
    return res.s4Error(500, err.message);
  }
};

// GET /OrderCostSummary
exports.getOrderCostSummary = (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT MaintenanceOrderType as type, 
             COUNT(*) as count, 
             SUM(TotalActualCosts) as totalCost, 
             AVG(TotalActualCosts) as avgCost
      FROM S4_MAINTENANCEORDER 
      GROUP BY MaintenanceOrderType
    `).all();
    
    const records = rows.map(r => ({
      type: r.type,
      count: r.count,
      totalCost: r.totalCost ? parseFloat(r.totalCost.toFixed(2)) : 0,
      avgCost: r.avgCost ? parseFloat(r.avgCost.toFixed(2)) : 0
    }));
    return res.s4Result(records);
  } catch (err) {
    return res.s4Error(500, err.message);
  }
};

// GET /PlantMaintenanceSummary
exports.getPlantMaintenanceSummary = (req, res) => {
  try {
    // Collect unique plants from all tables
    const sqlPlants = `
      SELECT MaintenancePlant FROM S4_EQUIPMENT WHERE MaintenancePlant IS NOT NULL AND MaintenancePlant != ''
      UNION
      SELECT MaintenancePlant FROM S4_MAINTENANCENOTIFICATION WHERE MaintenancePlant IS NOT NULL AND MaintenancePlant != ''
      UNION
      SELECT MaintenancePlant FROM S4_MAINTENANCEORDER WHERE MaintenancePlant IS NOT NULL AND MaintenancePlant != ''
      UNION
      SELECT MaintenancePlant FROM S4_MAINTPLAN WHERE MaintenancePlant IS NOT NULL AND MaintenancePlant != ''
    `;
    const plantRows = db.prepare(sqlPlants).all();
    const plants = plantRows.map(p => p.MaintenancePlant);
    
    const records = plants.map(plant => {
      const eqCount = db.prepare(`SELECT COUNT(*) as count FROM S4_EQUIPMENT WHERE MaintenancePlant = ?`).get(plant).count;
      const notifCount = db.prepare(`SELECT COUNT(*) as count FROM S4_MAINTENANCENOTIFICATION WHERE MaintenancePlant = ? AND NotifProcessingPhase IN ('1','2')`).get(plant).count;
      const orderCount = db.prepare(`SELECT COUNT(*) as count FROM S4_MAINTENANCEORDER WHERE MaintenancePlant = ? AND MaintOrdProcessingPhase IN ('01', '02', '1', '2')`).get(plant).count;
      const planCount = db.prepare(`SELECT COUNT(*) as count FROM S4_MAINTPLAN WHERE MaintenancePlant = ? AND MaintPlanIsActive = 'true'`).get(plant).count;
      
      return {
        plant,
        equipmentCount: eqCount,
        openNotifications: notifCount,
        activeOrders: orderCount,
        activePlans: planCount
      };
    });
    
    return res.s4Result(records);
  } catch (err) {
    return res.s4Error(500, err.message);
  }
};
