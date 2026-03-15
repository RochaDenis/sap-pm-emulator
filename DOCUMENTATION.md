# SAP PM Emulator — ECC Edition
## AxiomGO Integration Layer

### 1. Overview
This emulator provides a lightweight REST API designed to replicate the core behavior of the SAP ECC Plant Maintenance (PM) module. Built with Node.js and SQLite, it comes pre-loaded with rich, realistic industrial data representing a Brazilian petrochemical plant.

**SAP ECC vs S/4HANA:**
- **SAP ECC (ERP Central Component):** The classic, legacy ERP architecture. It relies heavily on traditional relational databases, monolithic tables (like `AUFK`, `MARA`, `QMEL`), German acronyms for technical fields, and complex BAPIs/RFCs.
- **SAP S/4HANA:** The modern iteration built on the HANA in-memory database. It features simplified data models (e.g., the `ACDOCA` universal journal), Core Data Services (CDS) views, and a drastically different API landscape utilizing Fiori/OData V4.

**AxiomGO Integration:**
AxiomGO uses this emulator as an integration sandbox. By interacting with endpoints that mimic real SAP OData V2 payloads (formatted logically inside a `{ "d": { ... } }` or `{ "d": { "results": [...] } }` wrapper), the AI agent can learn, test, and predict maintenance workflows without risking a live SAP instance.

**Architecture Diagram:**
```text
  [ AxiomGO AI Agent ]
           |
   ( OData V2 / REST )
           v
  [ Express.js / Node.js API ]  <-- Swagger UI (/api-docs)
           |
       ( SQLite3 )
           v
  [ SAP ECC PM Schema ]
  (IFLOT, EQUI, QMEL, AUFK...)
```

### 2. Quick Start

**Prerequisites:**
- Node.js (v16+)
- npm

**Installation:**
```bash
npm install
```

**Initialize Database (Seed):**
Recreates the database and inserts over 700+ rows of interconnected data respecting SAP foreign keys.
```bash
npm run seed
```

**Run Server:**
```bash
npm run dev  # for development
# or
npm start    # for production
```

**Swagger UI:**
Open `http://localhost:3000/api-docs` in your browser.

---

### 3. SAP ECC Services & Endpoints

All services assume a Base URL of: `/sap/opu/odata/sap`

#### PM_NOTIFICATION_SRV — Nota de Manutenção
Manages maintenance notifications (table `QMEL`).
- **Base URL:** `/PM_NOTIFICATION_SRV/QMELSet`
- **Types:** M1 (Maintenance Request), M2 (Breakdown), M3 (Activity Report)
- **Status flow:** ABER (Open) → INEX (In Execution) → CONC (Completed)
- **Endpoints:**
  - `GET /QMELSet` (List)
  - `GET /QMELSet('{QMNUM}')` (Read)
  - `POST /QMELSet` (Create)
  - `PUT /QMELSet('{QMNUM}')` (Update Full)
  - `PATCH /QMELSet('{QMNUM}')` (Update Partial)
  - `DELETE /QMELSet('{QMNUM}')` (Delete)

**Request Payload Example (POST /QMELSet - Create M1 Notification):**
```json
{
  "QMART": "M1",
  "QMTXT": "Vazamento de óleo no selo mecânico",
  "EQUNR": "EQ-00002",
  "TPLNR": "BR-SP-01-UTL-BOM-001",
  "PRIOK": "1",
  "ERNAM": "SILVA_J",
  "ARBPL": "MEC-01"
}
```

**Response Example (Real SAP ECC Format):**
```json
{
  "d": {
    "QMNUM": "QM-000101",
    "QMART": "M1",
    "QMTXT": "Vazamento de óleo no selo mecânico",
    "EQUNR": "EQ-00002",
    "TPLNR": "BR-SP-01-UTL-BOM-001",
    "IWERK": "1000",
    "PRIOK": "1",
    "QMCOD": "PM-05",
    "ERDAT": "20260312",
    "ERNAM": "SILVA_J",
    "LTRMN": "20260315",
    "ARBPL": "MEC-01",
    "KOSTL": "1015",
    "QMST": "ABER"
  }
}
```
**Expected Status:** `201 Created`

#### PM_ORDER_SRV — Ordem de Manutenção
Manages maintenance orders (table `AUFK` & header `AFKO`).
- **Base URL:** `/PM_ORDER_SRV/AUFKSet`
- **Types:** PM01 (Corrective), PM02 (Preventive), PM03 (General)
- **Status flow:** CRTD (Created) → REL (Released) → TECO (Technically Completed) → CLSD (Closed)
- **Endpoints:** `GET`, `POST`, `PUT`, `PATCH`, `DELETE` with `('{AUFNR}')`.

**Request Payload Example (POST /AUFKSet):**
```json
{
  "AUART": "PM01",
  "AUTXT": "Substituição do selo mecânico",
  "EQUNR": "EQ-00002",
  "PRIOK": "1",
  "ERNAM": "SILVA_J",
  "ARBPL": "MEC-01",
  "QMNUM": "QM-000101"
}
```

**Response Example:**
```json
{
  "d": {
    "AUFNR": "ORD-000101",
    "AUART": "PM01",
    "AUTXT": "Substituição do selo mecânico",
    "EQUNR": "EQ-00002",
    "TPLNR": "BR-SP-01-UTL-BOM-001",
    "IWERK": "1000",
    "PRIOK": "1",
    "KOSTL": "1015",
    "ERDAT": "20260312",
    "ERNAM": "SILVA_J",
    "GSTRP": "20260312",
    "GLTRP": "20260314",
    "ARBPL": "MEC-01",
    "AUFST": "CRTD",
    "QMNUM": "QM-000101",
    "GMNGA": 0,
    "WEMNG": 0,
    "RMNGA": 0
  }
}
```
**Expected Status:** `201 Created`

#### PM_EQUIPMENT_SRV — Equipamento
Manages equipment (`EQUI`) and functional locations (`IFLOT`).
- **Base URL:** `/PM_EQUIPMENT_SRV/EQUISet` and `/PM_FUNCLOC_SRV/IFLOTSet`
- **Endpoints:** `GET`, `POST`, `PUT`, `PATCH`, `DELETE` with `('{EQUNR}')`/`('{TPLNR}')`.

#### PM_MAINTPLAN_SRV — Plano de Manutenção
Manages preventative maintenance plans (`MMPT`) and task lists (`PLPO`).
- **Base URL:** `/PM_MAINTPLAN_SRV/MMPTSet` and `/PM_MAINTPLAN_SRV/PLPOSet`
- **Endpoints:** GET/POST/PATCH/DELETE routines.

#### PM_MATERIAL_SRV — Materiais
Manages material master (`MARA`), reservations (`RESB`), and material documents/movements (`MSEG`).
- **Base URL:** `/PM_MATERIAL_SRV/MARASet`, `/PM_MATERIAL_SRV/RESBSet`, `/PM_MATERIAL_SRV/MSEGSet`

**Request Payload Example (POST /MSEGSet - Goods Issue):**
```json
{
  "AUFNR": "ORD-000010",
  "MATNR": "MAT-0001",
  "MENGE": 2,
  "MEINS": "EA",
  "LGORT": "0001",
  "WERKS": "1000",
  "BWART": "261"
}
```

#### PM_ANALYTICS_SRV — Consultas Analíticas
Read-only queries specifically designed for AxiomGO dashboarding and AI reasoning.
- **Base URL:** `/PM_ANALYTICS_SRV`
- **Endpoints:** 
  - `GET /EquipmentHistory('{EQUNR}')`
  - `GET /OpenNotifications`
  - `GET /OrderBacklog`
  - `GET /EquipmentMTBF('{EQUNR}')`
  - `GET /EquipmentMTTR('{EQUNR}')`
  - `GET /CriticalEquipment`
  - `GET /MaintenanceCostByEquipment`
  - `GET /PreventiveCompliance`

---

### 4. SAP ECC Field Reference

| Technical Name | Name (English) | PT-BR (Description) | Type | Max Len | Valid Values / Note |
|---|---|---|---|---|---|
| **EQUNR** | Equipment No. | Nº do Equipamento | String | 18 | `EQ-XXXXX` |
| **TPLNR** | Functional Loc. | Local de Instalação | String | 30 | `BR-SP-01-UTL-...` |
| **QMNUM** | Notification No. | Nº da Nota | String | 12 | `QM-XXXXXX` |
| **AUFNR** | Order No. | Nº da Ordem | String | 12 | `ORD-XXXXXX` |
| **MATNR** | Material No. | Nº do Material | String | 18 | `MAT-XXXX` |
| **MBLNR** | Material Doc. No | Documento Material | String | 10 | `MD-XXXXXXX` |
| **QMART** | Notification Type | Tipo de Nota | String | 2 | `M1`, `M2`, `M3` |
| **AUART** | Order Type | Tipo de Ordem | String | 4 | `PM01`, `PM02`, `PM03` |
| **QMST** | Notif. Status | Status da Nota | String | 4 | `ABER`, `INEX`, `CONC` |
| **AUFST** | Order Status | Status da Ordem | String | 4 | `CRTD`, `REL`, `TECO`, `CLSD`|
| **BWART** | Movement Type | Tipo de Movimento | String | 3 | `261` (Issue), `262` (Rev) |
| **PRIOK** | Priority | Prioridade | String | 1 | `1`, `2`, `3`, `4` |
| **IWERK** | Planning Plant | Centro Planejamento | String | 4 | `1000` |
| **ERDAT** | Creation Date | Data de Criação | String | 8 | `YYYYMMDD` |
| **GSTRP** | Basic Start Date | Data Início Plan. | String | 8 | `YYYYMMDD` |

---

### 5. Business Flows

#### Flow 1 — Corretiva (Corrective Maintenance)
**Step 1:** Create Nota (POST `/PM_NOTIFICATION_SRV/QMELSet`)
- Payload: `{"QMART": "M1", "EQUNR": "EQ-00010", "QMTXT": "Falha na bomba"}`
- Result: Returns new `QMNUM` (`QM-000102`).

**Step 2:** Create Ordem from Nota (POST `/PM_ORDER_SRV/AUFKSet`)
- Payload: `{"AUART": "PM01", "EQUNR": "EQ-00010", "QMNUM": "QM-000102"}`
- Result: Returns new `AUFNR` in `CRTD` status. Notification `QMST` auto-updates to `INEX`.

**Step 3:** Reserve Material (POST `/PM_MATERIAL_SRV/RESBSet`)
- Payload: `{"AUFNR": "ORD-000102", "MATNR": "MAT-0002", "BDMNG": 1}`
- Result: Creates reservation `RSNUM`.

**Step 4:** Issue Material (POST `/PM_MATERIAL_SRV/MSEGSet`)
- Payload: `{"AUFNR": "ORD-000102", "MATNR": "MAT-0002", "MENGE": 1, "BWART": "261"}`
- Result: Material is withdrawn from storage, reservation `ENMNG` is updated. Status 201.

**Step 5:** Close Order (PATCH `/PM_ORDER_SRV/AUFKSet('{AUFNR}')`)
- Payload: `{"AUFST": "CLSD"}`
- Result: Order is technically completed and closed.

**Step 6:** Close Nota (PATCH `/PM_NOTIFICATION_SRV/QMELSet('{QMNUM}')`)
- Payload: `{"QMST": "CONC"}`
- Result: Notification is resolved.

#### Flow 2 — Preventiva (Preventive Maintenance)
**Step 1:** Create Maintenance Plan (POST `/PM_MAINTPLAN_SRV/MMPTSet`)
**Step 2:** Add Task List (POST `/PM_MAINTPLAN_SRV/PLPOSet`)
**Step 3:** Create Order from Plan (POST `/PM_ORDER_SRV/AUFKSet`)
**Step 4:** Record Measurement (PATCH `/PM_MEASPOINT_SRV/IMPTTSet('{POINT}')` with `ENMNG` value)
**Step 5:** Complete Order (PATCH `/PM_ORDER_SRV/AUFKSet('{AUFNR}')` to `TECO`)

#### Flow 3 — Consultas (Analytics Queries)
**Step 1:** Call `/PM_ANALYTICS_SRV/EquipmentHistory('{EQUNR}')` to view all chronological interventions.
**Step 2:** Call `/PM_ANALYTICS_SRV/EquipmentMTBF('{EQUNR}')` and `EquipmentMTTR` to verify reliability.
**Step 3:** Call `/PM_ANALYTICS_SRV/CriticalEquipment` to isolate assets that need replacement.
**Step 4:** Call `/PM_ANALYTICS_SRV/PreventiveCompliance` to detect delayed task executions.

---

### 6. AxiomGO Integration Guide

**Connection:**
AxiomGO agents must construct REST HTTP clients pointing to `/sap/opu/odata/sap`.
Always anticipate the `{ "d": { ... } }` or `{ "d": { "results": [...] } }` JSON structure when parsing responses.

**Environment Variables:**
Standard variables expected:
`PORT=3000`
`DB_PATH=./database.db`

**Example Agent Prompt:**
*"Verifique as notas de manutenção abertas para o compressor EQ-00001 e me diga qual o status da ordem associada."*
**Expected SAP Actions (Agent Side):**
1. `GET /PM_NOTIFICATION_SRV/QMELSet?$filter=EQUNR eq 'EQ-00001' and QMST eq 'ABER'`
2. Read matched `QMNUM` and extract the related `AUFNR` from `AFKO`.
3. `GET /PM_ORDER_SRV/AUFKSet('{AUFNR}')` to fetch `AUFST`.

**Error Handling Patterns:**
The API throws a standard `ErrorResponse`:
```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": { "lang": "pt-BR", "value": "Falta preencher EQUNR" }
  }
}
```
Agents should trap 400 (validation), 404 (not found), and 500 (internal config issues), reading the `message.value` payload.

---

### 7. Test Suite

The emulator ships with a robust Jest integration test suite enforcing standard SAP behavior and foreign key cascades.

**Run Tests:**
```bash
npm test
```

**Test Coverage Summary:**
Validates all endpoints (GET/POST/PUT/PATCH/DELETE), database cascades (deleting an `EQUI` deletes associated `QMEL`s), data validation rules (like rejecting reservations for invalid `MATNR`), and analytics query consistency.

---

### 8. Roadmap

- **ECC (Current) ✅:** Fully functional relational emulator with REST/OData endpoints representing ECC module standard BAPIs.
- **S/4HANA Cloud (Next Phase):** Migration of the emulator to replicate CDS views, OData V4 format, and standard Fiori application behavior, deprecating complex abbreviations in favor of long-form Fiori field tags.

**API Naming Differences (ECC vs S/4HANA):**
| Concept | ECC (Current Emulator) | S/4HANA (Future) |
|---|---|---|
| Equipment | `EQUI` (EQUNR) | `Equipment` (EquipmentID) |
| Relational List | `QMELSet` | `MaintenanceNotification` |
| Structure | Deeply Nested | Flattened via CDS |

---

## SAP S/4HANA Layer

### Overview
Separate implementation following official SAP API Hub specifications.
Base path: /sap/opu/odata/sap/API_[SERVICE]/
Database: database-s4.db (SQLite)
Folder: src/v4/

### Key Differences: ECC vs S/4HANA

| Aspect | ECC | S/4HANA |
|---|---|---|
| Field names | Technical (QMNUM, EQUNR) | Descriptive (MaintenanceNotification, Equipment) |
| CSRF Token | Not required | Required for POST/PATCH/DELETE |
| Function Imports | Not available | SetToInProcess, Complete, Release, Close |
| Navigation Props | Not available | to_Operation, to_MaintenanceOrder |
| Base URL | /PM_NOTIFICATION_SRV | /API_MAINTNOTIFICATION |
| Database | database.db | database-s4.db |

### CSRF Token Flow
```
Step 1: GET /sap/opu/odata/sap/API_EQUIPMENT/EquipmentCollection
        Headers: x-csrf-token: fetch

Step 2: Read response header: x-csrf-token: <token>

Step 3: POST /sap/opu/odata/sap/API_EQUIPMENT/EquipmentCollection
        Headers: x-csrf-token: <token>
                 Content-Type: application/json
```

### S/4HANA Services

| Service | Base URL | Entity |
|---|---|---|
| API_EQUIPMENT | /sap/opu/odata/sap/API_EQUIPMENT | EquipmentCollection |
| API_FUNCTIONALLOCATION | /sap/opu/odata/sap/API_FUNCTIONALLOCATION | FunctionalLocationCollection |
| API_MAINTNOTIFICATION | /sap/opu/odata/sap/API_MAINTNOTIFICATION | MaintenanceNotificationCollection |
| API_MAINTENANCEORDER | /sap/opu/odata/sap/API_MAINTENANCEORDER | MaintenanceOrderCollection |
| API_MAINTPLAN | /sap/opu/odata/sap/API_MAINTPLAN | MaintenancePlanCollection |
| PM_S4_ANALYTICS_SRV | /sap/opu/odata/sap/PM_S4_ANALYTICS_SRV | 8 endpoints |

### Function Imports

| Service | Function | Description |
|---|---|---|
| API_MAINTNOTIFICATION | SetToInProcess | Phase 1 → 2 |
| API_MAINTNOTIFICATION | Complete | Phase 2 → 3 |
| API_MAINTNOTIFICATION | Postpone | Phase 1/2 → 4 |
| API_MAINTENANCEORDER | Release | Phase 1 → 2 |
| API_MAINTENANCEORDER | TechnicallyComplete | Phase 2 → 4 |
| API_MAINTENANCEORDER | Close | Phase 4 → 5 |
| API_MAINTPLAN | StartMaintPlnSchedule | Trigger scheduling |
| API_MAINTPLAN | RestartMaintPlnSchedule | Reset and reschedule |

### S/4HANA Tables (database-s4.db)

| Table | Description | Records (seed) |
|---|---|---|
| S4_FUNCTIONALLOCATION | Functional Locations | 20 |
| S4_EQUIPMENT | Equipment Master | 40 |
| S4_MAINTENANCENOTIFICATION | Maintenance Notifications | 50 |
| S4_MAINTENANCEORDER | Maintenance Orders | 40 |
| S4_MAINTENANCEORDER_OPERATION | Order Operations | 80 |
| S4_MAINTPLAN | Maintenance Plans | 20 |
| S4_MAINTPLAN_ITEM | Plan Items | 30 |
| **TOTAL** | | **280** |

### Analytics Endpoints

| Endpoint | Description |
|---|---|
| /EquipmentAvailability | Equipment availability rate |
| /NotificationsByPhase | Notifications grouped by phase |
| /OrdersByPhase | Orders grouped by phase |
| /MaintenancePlanCompliance | Preventive compliance rate |
| /CriticalEquipment | Top 10 critical equipment |
| /NotificationTrend | Monthly notification trend (6 months) |
| /OrderCostSummary | Cost summary by order type |
| /PlantMaintenanceSummary | Summary per maintenance plant |

### npm Scripts

```
npm run seed        → Seed ECC database (database.db)
npm run seed:s4     → Seed S/4HANA database (database-s4.db)
npm test            → Run all 126 tests (ECC + S/4HANA)
```

### AxiomGO Agent Mapping

| Agent | SAP Layer | Primary Service |
|---|---|---|
| KARL (PCM Executor) | ECC or S/4HANA | Notifications + Orders |
| DIANA (Compliance) | S/4HANA | Analytics + Notifications |
| NEWTON (Statistics) | S/4HANA | PM_S4_ANALYTICS_SRV |
| AXIOM (Orchestrator) | Both | Routes to all agents |
