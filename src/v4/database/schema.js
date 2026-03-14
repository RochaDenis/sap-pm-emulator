const schema = {
  S4_EQUIPMENT: `
    CREATE TABLE IF NOT EXISTS S4_EQUIPMENT (
      Equipment VARCHAR PRIMARY KEY,
      ValidityEndDate VARCHAR,
      ValidityStartDate VARCHAR,
      EquipmentName VARCHAR,
      EquipmentCategory VARCHAR,
      TechnicalObjectType VARCHAR,
      GrossWeight DECIMAL,
      GrossWeightUnit VARCHAR,
      InventoryNumber VARCHAR,
      AcquisitionValue DECIMAL,
      Currency VARCHAR,
      AcquisitionDate VARCHAR,
      AssetManufacturerName VARCHAR,
      ManufacturerPartTypeName VARCHAR,
      ManufacturerCountry VARCHAR,
      ConstructionYear VARCHAR,
      ConstructionMonth VARCHAR,
      ManufacturerSerialNumber VARCHAR,
      MaintenancePlant VARCHAR,
      AssetLocation VARCHAR,
      AssetRoom VARCHAR,
      PlantSection VARCHAR,
      WorkCenter VARCHAR,
      FunctionalLocation VARCHAR,
      SuperiorEquipment VARCHAR,
      EquipmentIsAvailable VARCHAR,
      MaintenanceObjectIsDown VARCHAR
    )
  `,
  S4_FUNCTIONALLOCATION: `
    CREATE TABLE IF NOT EXISTS S4_FUNCTIONALLOCATION (
      FunctionalLocation VARCHAR PRIMARY KEY,
      FunctionalLocationName VARCHAR,
      TechnicalObjectType VARCHAR,
      MaintenancePlant VARCHAR,
      AssetLocation VARCHAR,
      PlantSection VARCHAR,
      WorkCenter VARCHAR,
      SuperiorFunctionalLocation VARCHAR,
      EquipmentInstallationDate VARCHAR,
      CostCenter VARCHAR,
      CompanyCode VARCHAR,
      FunctLocIsAvailable VARCHAR
    )
  `,
  S4_MAINTENANCENOTIFICATION: `
    CREATE TABLE IF NOT EXISTS S4_MAINTENANCENOTIFICATION (
      MaintenanceNotification VARCHAR PRIMARY KEY,
      MaintNotifInternalID VARCHAR,
      NotificationText VARCHAR,
      NotificationType VARCHAR,
      MaintPriority VARCHAR,
      NotifProcessingPhase VARCHAR,
      NotifProcessingPhaseDesc VARCHAR,
      TechnicalObject VARCHAR,
      TechObjIsEquipOrFuncnLoc VARCHAR,
      FunctionalLocation VARCHAR,
      MaintenancePlant VARCHAR,
      MalfunctionStartDate VARCHAR,
      MalfunctionEndDate VARCHAR,
      MaintenanceObjectIsDown VARCHAR DEFAULT 'false',
      ReportedByUser VARCHAR,
      ReporterFullName VARCHAR,
      PersonResponsible VARCHAR,
      MalfunctionEffect VARCHAR,
      MaintNotificationLongText VARCHAR,
      CreationDate VARCHAR,
      LastChangeDate VARCHAR,
      FOREIGN KEY(TechnicalObject) REFERENCES S4_EQUIPMENT(Equipment),
      FOREIGN KEY(FunctionalLocation) REFERENCES S4_FUNCTIONALLOCATION(FunctionalLocation)
    )
  `,
  S4_MAINTENANCEORDER: `
    CREATE TABLE IF NOT EXISTS S4_MAINTENANCEORDER (
      MaintenanceOrder VARCHAR PRIMARY KEY,
      MaintOrderRoutingNumber VARCHAR,
      MaintenanceOrderType VARCHAR,
      MaintenanceOrderDesc VARCHAR,
      MaintOrdBasicStartDate VARCHAR,
      MaintOrdBasicEndDate VARCHAR,
      ScheduledBasicStartDate VARCHAR,
      ScheduledBasicEndDate VARCHAR,
      MaintenanceNotification VARCHAR,
      MaintenancePlant VARCHAR,
      MaintOrdPersonResponsible VARCHAR,
      WorkCenter VARCHAR,
      MaintOrdProcessingPhase VARCHAR,
      MaintOrdProcessingPhaseDesc VARCHAR,
      OrderIsCreated VARCHAR DEFAULT 'false',
      OrderIsReleased VARCHAR DEFAULT 'false',
      OrderIsTechnicallyCompleted VARCHAR DEFAULT 'false',
      OrderIsClosed VARCHAR DEFAULT 'false',
      TotalActualCosts DECIMAL DEFAULT 0,
      Currency VARCHAR,
      FOREIGN KEY(MaintenanceNotification) REFERENCES S4_MAINTENANCENOTIFICATION(MaintenanceNotification)
    )
  `,
  S4_MAINTENANCEORDER_OPERATION: `
    CREATE TABLE IF NOT EXISTS S4_MAINTENANCEORDER_OPERATION (
      MaintenanceOrder VARCHAR,
      MaintenanceOrderOperation VARCHAR,
      OperationDescription VARCHAR,
      WorkCenter VARCHAR,
      PlannedWorkQuantity DECIMAL,
      PlannedWorkQuantityUnit VARCHAR,
      ActualWorkQuantity DECIMAL,
      OperationIsConfirmed VARCHAR DEFAULT 'false',
      PRIMARY KEY (MaintenanceOrder, MaintenanceOrderOperation),
      FOREIGN KEY(MaintenanceOrder) REFERENCES S4_MAINTENANCEORDER(MaintenanceOrder)
    )
  `,
  S4_MAINTPLAN: `
    CREATE TABLE IF NOT EXISTS S4_MAINTPLAN (
      MaintenancePlan VARCHAR PRIMARY KEY,
      MaintPlanDesc VARCHAR,
      MaintenancePlanCategory VARCHAR,
      MaintenancePlanCallObject VARCHAR,
      MaintPlanStartCounter VARCHAR,
      MaintPlanStartDate VARCHAR,
      MaintenancePlant VARCHAR,
      CycleLength INTEGER,
      CycleUnit VARCHAR,
      SchedulingStartDate VARCHAR,
      NextPlannedDate VARCHAR,
      LastCallDate VARCHAR,
      MaintPlanIsActive VARCHAR DEFAULT 'true'
    )
  `,
  S4_MAINTPLAN_ITEM: `
    CREATE TABLE IF NOT EXISTS S4_MAINTPLAN_ITEM (
      MaintenancePlan VARCHAR,
      MaintenancePlanItem VARCHAR,
      TechnicalObject VARCHAR,
      TechObjIsEquipOrFuncnLoc VARCHAR,
      FunctionalLocation VARCHAR,
      MaintenanceItemDesc VARCHAR,
      AssemblyObject VARCHAR,
      PRIMARY KEY (MaintenancePlan, MaintenancePlanItem),
      FOREIGN KEY(MaintenancePlan) REFERENCES S4_MAINTPLAN(MaintenancePlan),
      FOREIGN KEY(TechnicalObject) REFERENCES S4_EQUIPMENT(Equipment)
    )
  `
};

module.exports = schema;
