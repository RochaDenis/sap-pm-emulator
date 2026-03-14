const db = require('../database');

function generateS4SeedData() {
  const functionalLocations = [];
  const equipments = [];
  const notifications = [];
  const orders = [];
  const operations = [];
  const plans = [];
  const planItems = [];

  const plants = ["1000", "2000", "3000"];
  const areas = ["UTIL", "PROD", "HVAC", "ELEC"];
  const eqCategories = ["M", "E", "V"];
  const currencies = ["BRL", "USD", "EUR", "CNY", "AUD"];
  const countries = ["BR", "US", "DE", "CN", "JP"];
  
  // 1. S4_FUNCTIONALLOCATION - 20 records
  for (let i = 1; i <= 20; i++) {
    const pId = String(i).padStart(3, '0');
    const area = areas[i % areas.length];
    const plant = plants[i % plants.length];
    functionalLocations.push({
      FunctionalLocation: `FL-${area}-${pId}`,
      FunctionalLocationName: `${area} Area Location ${i}`,
      TechnicalObjectType: "FLOC",
      MaintenancePlant: plant,
      AssetLocation: `LOC${i}`,
      PlantSection: `SEC${i}`,
      WorkCenter: `WC-${plant}`,
      SuperiorFunctionalLocation: "",
      EquipmentInstallationDate: "2020-01-01",
      CostCenter: `CC-${String(i).padStart(4, '0')}`,
      CompanyCode: "1000",
      FunctLocIsAvailable: "true"
    });
  }

  // 2. S4_EQUIPMENT - 40 records
  for (let i = 1; i <= 40; i++) {
    const eId = String(i).padStart(5, '0');
    const floc = functionalLocations[i % functionalLocations.length]; // associate to floc
    const isAvail = Math.random() < 0.8 ? "true" : "false"; // 80% true
    const year = 2017 + (i % 7);
    const month = String((i % 12) + 1).padStart(2, '0');
    
    equipments.push({
      Equipment: `EQ-${eId}`,
      ValidityEndDate: "9999-12-31",
      ValidityStartDate: `${year}-${month}-01`,
      EquipmentName: `Equipment ${i}`,
      EquipmentCategory: eqCategories[i % eqCategories.length],
      TechnicalObjectType: "EQUI",
      GrossWeight: 1000 + i * 10,
      GrossWeightUnit: "KG",
      InventoryNumber: `INV-${eId}`,
      AcquisitionValue: 5000 + i * 100,
      Currency: currencies[i % currencies.length],
      AcquisitionDate: `${year}-${month}-15`,
      AssetManufacturerName: `Manufacturer ${i}`,
      ManufacturerPartTypeName: `Model-${i}`,
      ManufacturerCountry: countries[i % countries.length],
      ConstructionYear: String(year),
      ConstructionMonth: String(month),
      ManufacturerSerialNumber: `SN-${eId}`,
      MaintenancePlant: floc.MaintenancePlant,
      AssetLocation: floc.AssetLocation,
      AssetRoom: `ROOM-${i}`,
      PlantSection: floc.PlantSection,
      WorkCenter: floc.WorkCenter,
      FunctionalLocation: floc.FunctionalLocation,
      SuperiorEquipment: "",
      EquipmentIsAvailable: isAvail,
      MaintenanceObjectIsDown: "false"
    });
  }

  // 3. S4_MAINTENANCENOTIFICATION - 50 records
  const notifTypes = ["M1", "M2", "M3"];
  for (let i = 1; i <= 50; i++) {
    const nId = String(i).padStart(4, '0');
    const eq = equipments[i % equipments.length];
    
    // random date in last 90 days
    const daysAgo = i % 90;
    const date = new Date('2026-03-13T09:00:00Z');
    date.setDate(date.getDate() - daysAgo);
    const yyyymmdd = date.toISOString().split('T')[0].replace(/-/g, '');
    const dateStr = date.toISOString().split('T')[0];

    notifications.push({
      MaintenanceNotification: `NF-${yyyymmdd}-${nId}`,
      MaintNotifInternalID: `INT-${nId}`,
      NotificationText: `Issue with ${eq.Equipment}`,
      NotificationType: notifTypes[i % notifTypes.length],
      MaintPriority: String((i % 4) + 1), // 1-4
      NotifProcessingPhase: String((i % 4) + 1), // 1,2,3,4
      NotifProcessingPhaseDesc: `Phase ${(i % 4) + 1}`,
      TechnicalObject: eq.Equipment,
      TechObjIsEquipOrFuncnLoc: "EQUI",
      FunctionalLocation: eq.FunctionalLocation,
      MaintenancePlant: eq.MaintenancePlant,
      MalfunctionStartDate: dateStr,
      MalfunctionEndDate: "",
      MaintenanceObjectIsDown: i % 10 === 0 ? "true" : "false", // mostly false
      ReportedByUser: `USR00${(i % 10) + 1}`,
      ReporterFullName: `User ${(i % 10) + 1}`,
      PersonResponsible: `TECH00${(i % 5) + 1}`,
      MalfunctionEffect: "Minor",
      MaintNotificationLongText: `Detailed description for notification ${i}`,
      CreationDate: dateStr,
      LastChangeDate: dateStr
    });
  }

  // 4. S4_MAINTENANCEORDER - 40 records
  // 5. S4_MAINTENANCEORDER_OPERATION - 2 per order
  const orderTypes = ["PM01", "PM02", "PM03"];
  const orderPhases = ["1", "2", "4", "5"];
  const orderCurrencies = ["BRL", "USD", "EUR"];
  for (let i = 1; i <= 40; i++) {
    const oId = String(i).padStart(4, '0');
    const notif = i <= 30 ? notifications[i] : null; // some no notification
    const date = new Date('2026-03-13T09:00:00Z');
    date.setDate(date.getDate() - (i % 60));
    const yyyymmdd = date.toISOString().split('T')[0].replace(/-/g, '');
    const dateStr = date.toISOString().split('T')[0];

    const maintenanceOrder = `OR-${yyyymmdd}-${oId}`;

    orders.push({
      MaintenanceOrder: maintenanceOrder,
      MaintOrderRoutingNumber: `RT-${oId}`,
      MaintenanceOrderType: orderTypes[i % orderTypes.length],
      MaintenanceOrderDesc: `Order for ${notif ? notif.TechnicalObject : 'Routine'}`,
      MaintOrdBasicStartDate: dateStr,
      MaintOrdBasicEndDate: dateStr,
      ScheduledBasicStartDate: dateStr,
      ScheduledBasicEndDate: dateStr,
      MaintenanceNotification: notif ? notif.MaintenanceNotification : null,
      MaintenancePlant: notif ? notif.MaintenancePlant : "1000",
      MaintOrdPersonResponsible: `TECH00${(i % 5) + 1}`,
      WorkCenter: `WC-${notif ? notif.MaintenancePlant : '1000'}`,
      MaintOrdProcessingPhase: orderPhases[i % orderPhases.length],
      MaintOrdProcessingPhaseDesc: `Phase ${orderPhases[i % orderPhases.length]}`,
      OrderIsCreated: "true",
      OrderIsReleased: i % 2 === 0 ? "true" : "false",
      OrderIsTechnicallyCompleted: i % 3 === 0 ? "true" : "false",
      OrderIsClosed: i % 4 === 0 ? "true" : "false",
      TotalActualCosts: Math.floor(Math.random() * 50000),
      Currency: orderCurrencies[i % orderCurrencies.length]
    });

    // Operations (2 per order)
    for (let op of ["0010", "0020"]) {
      operations.push({
        MaintenanceOrder: maintenanceOrder,
        MaintenanceOrderOperation: op,
        OperationDescription: `Operation ${op} for ${maintenanceOrder}`,
        WorkCenter: `WC-1000`,
        PlannedWorkQuantity: (2 + (Math.random() * 14)).toFixed(2), // 2-16
        PlannedWorkQuantityUnit: "H",
        ActualWorkQuantity: i % 3 === 0 ? 5 : 0,
        OperationIsConfirmed: i % 4 === 0 ? "true" : "false" // mostly false
      });
    }
  }

  // 6. S4_MAINTPLAN - 20 records
  const planCategories = ["PM01", "PM02"];
  const cycleUnits = ["D", "MON", "YR"];
  const cycleLengths = [7, 14, 30, 90, 180, 365];
  for (let i = 1; i <= 20; i++) {
    const pId = String(i).padStart(4, '0');
    plans.push({
      MaintenancePlan: `MP-S4-${pId}`,
      MaintPlanDesc: `Maintenance Plan ${i}`,
      MaintenancePlanCategory: planCategories[i % planCategories.length],
      MaintenancePlanCallObject: "Order",
      MaintPlanStartCounter: "0",
      MaintPlanStartDate: "2023-01-01",
      MaintenancePlant: "1000",
      CycleLength: cycleLengths[i % cycleLengths.length],
      CycleUnit: cycleUnits[i % cycleUnits.length],
      SchedulingStartDate: "2023-01-01",
      NextPlannedDate: "2024-01-01",
      LastCallDate: "2023-12-01",
      MaintPlanIsActive: "true"
    });
  }

  // 7. S4_MAINTPLAN_ITEM - 30 records
  // 1-2 items per plan
  let planItemCount = 0;
  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    const numItems = (i % 2 === 0) ? 2 : 1; // total 30
    for (let j = 1; j <= numItems; j++) {
      planItemCount++;
      const eq = equipments[planItemCount % equipments.length];
      planItems.push({
        MaintenancePlan: plan.MaintenancePlan,
        MaintenancePlanItem: String(j).padStart(4, '0'),
        TechnicalObject: eq.Equipment,
        TechObjIsEquipOrFuncnLoc: "EQUI",
        FunctionalLocation: eq.FunctionalLocation,
        MaintenanceItemDesc: `Item ${j} for ${plan.MaintenancePlan}`,
        AssemblyObject: ""
      });
    }
  }

  return {
    functionalLocations,
    equipments,
    notifications,
    orders,
    operations,
    plans,
    planItems
  };
}

async function seedV4Database() {
  console.log('[S4-SEED] Starting seed process...');
  const data = generateS4SeedData();

  // Disable constraints
  db.pragma('foreign_keys = OFF');

  const insertData = (tableName, items) => {
    if (items.length === 0) return;
    
    // Clear table
    db.prepare(`DELETE FROM ${tableName}`).run();

    const keys = Object.keys(items[0]);
    const placeholders = keys.map(() => '?').join(', ');
    const stmt = db.prepare(`INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${placeholders})`);
    
    let inserted = 0;
    const insertMany = db.transaction((rows) => {
      for (const row of rows) {
        stmt.run(keys.map(k => row[k]));
        inserted++;
      }
    });

    insertMany(items);
    console.log(`[S4-SEED] Inserting ${tableName}... done (${inserted})`);
  };

  try {
    // Insert in FK order
    insertData('S4_FUNCTIONALLOCATION', data.functionalLocations);
    insertData('S4_EQUIPMENT', data.equipments);
    insertData('S4_MAINTENANCENOTIFICATION', data.notifications);
    insertData('S4_MAINTENANCEORDER', data.orders);
    insertData('S4_MAINTENANCEORDER_OPERATION', data.operations);
    insertData('S4_MAINTPLAN', data.plans);
    insertData('S4_MAINTPLAN_ITEM', data.planItems);

    console.log('[S4-SEED] Seed process completed successfully.');
  } catch (error) {
    console.error('[S4-SEED] Error seeding data:', error);
  } finally {
    // Re-enable constraints
    db.pragma('foreign_keys = ON');
  }
}

// Execute seed if run directly
if (require.main === module) {
  seedV4Database();
}

module.exports = { seedV4Database };
