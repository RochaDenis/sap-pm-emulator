/**
 * SAP PM Emulator — SQLite Database Schema
 * 
 * All tables mirror SAP PM standard structures:
 *  IFLOT, EQUI, QMEL, AUFK, AFKO, MARA, RESB, MMPT, PLPO, IMPTT, MSEG
 */

const SCHEMA = {};

// ─── 1. IFLOT — Functional Locations ────────────────────────────────────────
SCHEMA.IFLOT = `
CREATE TABLE IF NOT EXISTS IFLOT (
    TPLNR       TEXT PRIMARY KEY,           -- Functional Location
    PLTXT       TEXT,                        -- Description
    IWERK       TEXT,                        -- Maintenance Planning Plant
    SWERK       TEXT,                        -- Maintenance Plant
    KOSTL       TEXT,                        -- Cost Center
    BUKRS       TEXT,                        -- Company Code
    ERDAT       TEXT,                        -- Created On (YYYY-MM-DD)
    AEDAT       TEXT,                        -- Changed On (YYYY-MM-DD)
    STOCKTYPE   TEXT,                        -- Stock Type
    FLTYP       TEXT                         -- Functional Location Category
);`;

// ─── 2. EQUI — Equipment ────────────────────────────────────────────────────
SCHEMA.EQUI = `
CREATE TABLE IF NOT EXISTS EQUI (
    EQUNR       TEXT PRIMARY KEY,           -- Equipment Number
    EQTXT       TEXT,                        -- Equipment Description
    TPLNR       TEXT,                        -- Functional Location (FK → IFLOT)
    IWERK       TEXT,                        -- Maintenance Planning Plant
    KOSTL       TEXT,                        -- Cost Center
    BUKRS       TEXT,                        -- Company Code
    ERDAT       TEXT,                        -- Created On
    AEDAT       TEXT,                        -- Changed On
    EQART       TEXT,                        -- Equipment Category
    SERGE       TEXT,                        -- Serial Number
    BAUJJ       TEXT,                        -- Construction Year
    ANSWT       REAL,                        -- Acquisition Value
    WAERS       TEXT,                        -- Currency Key
    FOREIGN KEY (TPLNR) REFERENCES IFLOT(TPLNR)
);`;

// ─── 3. QMEL — Maintenance Notifications ────────────────────────────────────
SCHEMA.QMEL = `
CREATE TABLE IF NOT EXISTS QMEL (
    QMNUM       TEXT PRIMARY KEY,           -- Notification Number
    QMART       TEXT,                        -- Notification Type
    QMTXT       TEXT,                        -- Notification Description
    EQUNR       TEXT,                        -- Equipment Number (FK → EQUI)
    TPLNR       TEXT,                        -- Functional Location (FK → IFLOT)
    IWERK       TEXT,                        -- Maintenance Planning Plant
    PRIOK       TEXT,                        -- Priority
    QMCOD       TEXT,                        -- Coding / Catalog Code
    ERDAT       TEXT,                        -- Created On
    ERNAM       TEXT,                        -- Created By
    LTRMN       TEXT,                        -- Required End Date
    ARBPL       TEXT,                        -- Work Center
    KOSTL       TEXT,                        -- Cost Center
    QMST        TEXT CHECK(QMST IN ('ABER','INEX','CONC')),  -- Status
    FOREIGN KEY (EQUNR) REFERENCES EQUI(EQUNR),
    FOREIGN KEY (TPLNR) REFERENCES IFLOT(TPLNR)
);`;

// ─── 4. AUFK — Order Master ─────────────────────────────────────────────────
SCHEMA.AUFK = `
CREATE TABLE IF NOT EXISTS AUFK (
    AUFNR       TEXT PRIMARY KEY,           -- Order Number
    AUART       TEXT,                        -- Order Type
    AUTXT       TEXT,                        -- Order Short Text
    EQUNR       TEXT,                        -- Equipment Number (FK → EQUI)
    TPLNR       TEXT,                        -- Functional Location (FK → IFLOT)
    IWERK       TEXT,                        -- Maintenance Planning Plant
    PRIOK       TEXT,                        -- Priority
    KOSTL       TEXT,                        -- Cost Center
    ERDAT       TEXT,                        -- Created On
    ERNAM       TEXT,                        -- Created By
    GSTRP       TEXT,                        -- Basic Start Date
    GLTRP       TEXT,                        -- Basic Finish Date
    ARBPL       TEXT,                        -- Work Center
    AUFST       TEXT CHECK(AUFST IN ('CRTD','REL','TECO','CLSD')),  -- Status
    FOREIGN KEY (EQUNR) REFERENCES EQUI(EQUNR),
    FOREIGN KEY (TPLNR) REFERENCES IFLOT(TPLNR)
);`;

// ─── 5. AFKO — Order Header ─────────────────────────────────────────────────
SCHEMA.AFKO = `
CREATE TABLE IF NOT EXISTS AFKO (
    AUFNR       TEXT PRIMARY KEY,           -- Order Number (PK + FK → AUFK)
    QMNUM       TEXT,                        -- Notification Number (FK → QMEL)
    ARBPL       TEXT,                        -- Work Center
    IWERK       TEXT,                        -- Maintenance Planning Plant
    GSTRP       TEXT,                        -- Basic Start Date
    GLTRP       TEXT,                        -- Basic Finish Date
    GMNGA       REAL,                        -- Order Quantity
    WEMNG       REAL,                        -- Delivered Quantity
    RMNGA       REAL,                        -- Remaining Quantity
    FOREIGN KEY (AUFNR) REFERENCES AUFK(AUFNR),
    FOREIGN KEY (QMNUM) REFERENCES QMEL(QMNUM)
);`;

// ─── 6. MARA — Materials ────────────────────────────────────────────────────
SCHEMA.MARA = `
CREATE TABLE IF NOT EXISTS MARA (
    MATNR       TEXT PRIMARY KEY,           -- Material Number
    MAKTX       TEXT,                        -- Material Description
    MATL_TYPE   TEXT,                        -- Material Type
    MEINS       TEXT,                        -- Base Unit of Measure
    MATKL       TEXT,                        -- Material Group
    MTPOS_MARA  TEXT,                        -- Item Category Group
    BRGEW       REAL,                        -- Gross Weight
    NTGEW       REAL,                        -- Net Weight
    GEWEI       TEXT                         -- Weight Unit
);`;

// ─── 7. RESB — Material Reservations ────────────────────────────────────────
SCHEMA.RESB = `
CREATE TABLE IF NOT EXISTS RESB (
    RSNUM       TEXT PRIMARY KEY,           -- Reservation Number
    AUFNR       TEXT,                        -- Order Number (FK → AUFK)
    MATNR       TEXT,                        -- Material Number (FK → MARA)
    BDMNG       REAL,                        -- Required Quantity
    ENMNG       REAL,                        -- Withdrawn Quantity
    ERFMG       REAL,                        -- Entry Quantity
    MEINS       TEXT,                        -- Unit of Measure
    BDTER       TEXT,                        -- Requirement Date
    LGORT       TEXT,                        -- Storage Location
    FOREIGN KEY (AUFNR) REFERENCES AUFK(AUFNR),
    FOREIGN KEY (MATNR) REFERENCES MARA(MATNR)
);`;

// ─── 8. MMPT — Maintenance Plans ────────────────────────────────────────────
SCHEMA.MMPT = `
CREATE TABLE IF NOT EXISTS MMPT (
    WARPL       TEXT PRIMARY KEY,           -- Maintenance Plan Number
    WPTXT       TEXT,                        -- Maintenance Plan Description
    IWERK       TEXT,                        -- Maintenance Planning Plant
    EQUNR       TEXT,                        -- Equipment Number (FK → EQUI)
    TPLNR       TEXT,                        -- Functional Location (FK → IFLOT)
    ZYKL1       INTEGER,                     -- Cycle Length
    ZEINH       TEXT,                        -- Cycle Unit
    STRAT       TEXT,                        -- Maintenance Strategy
    NPLDA       TEXT,                        -- Next Planned Date
    LPLDA       TEXT,                        -- Last Planned Date
    WAPOS       TEXT,                        -- Maintenance Item
    FOREIGN KEY (EQUNR) REFERENCES EQUI(EQUNR),
    FOREIGN KEY (TPLNR) REFERENCES IFLOT(TPLNR)
);`;

// ─── 9. PLPO — Task List (Roteiro de Tarefas) ──────────────────────────────
SCHEMA.PLPO = `
CREATE TABLE IF NOT EXISTS PLPO (
    PLNTY       TEXT NOT NULL,              -- Task List Type
    PLNNR       TEXT NOT NULL,              -- Group Key
    PLNKN       TEXT NOT NULL,              -- Group Counter / Node
    WARPL       TEXT,                        -- Maintenance Plan (FK → MMPT)
    LTXA1       TEXT,                        -- Operation Description
    ARBPL       TEXT,                        -- Work Center
    VSTEL       TEXT,                        -- Shipping Point
    WERKS       TEXT,                        -- Plant
    VORNR       TEXT,                        -- Operation Number
    STEUS       TEXT,                        -- Control Key
    PRIMARY KEY (PLNTY, PLNNR, PLNKN),
    FOREIGN KEY (WARPL) REFERENCES MMPT(WARPL)
);`;

// ─── 10. IMPTT — Measurement Points ─────────────────────────────────────────
SCHEMA.IMPTT = `
CREATE TABLE IF NOT EXISTS IMPTT (
    POINT       TEXT PRIMARY KEY,           -- Measurement Point
    EQUNR       TEXT,                        -- Equipment Number (FK → EQUI)
    PTTXT       TEXT,                        -- Measurement Point Description
    MSGRP       TEXT,                        -- Measurement Range Group
    PTYP        TEXT,                        -- Measurement Point Type
    IWERK       TEXT,                        -- Maintenance Planning Plant
    QPUNT       TEXT,                        -- Unit of Measurement
    NKOUN       INTEGER,                     -- Counter/Decimal Places
    ENMNG       REAL,                        -- Target Value
    MEINS       TEXT,                        -- Base Unit of Measure
    LDATE       TEXT,                        -- Last Measurement Date
    FOREIGN KEY (EQUNR) REFERENCES EQUI(EQUNR)
);`;

// ─── 11. MSEG — Material Documents ──────────────────────────────────────────
SCHEMA.MSEG = `
CREATE TABLE IF NOT EXISTS MSEG (
    MBLNR       TEXT PRIMARY KEY,           -- Material Document Number
    ZEILE       TEXT,                        -- Line Item
    AUFNR       TEXT,                        -- Order Number (FK → AUFK)
    MATNR       TEXT,                        -- Material Number (FK → MARA)
    MENGE       REAL,                        -- Quantity
    MEINS       TEXT,                        -- Unit of Measure
    LGORT       TEXT,                        -- Storage Location
    WERKS       TEXT,                        -- Plant
    BWART       TEXT,                        -- Movement Type
    BUDAT       TEXT,                        -- Posting Date
    FOREIGN KEY (AUFNR) REFERENCES AUFK(AUFNR),
    FOREIGN KEY (MATNR) REFERENCES MARA(MATNR)
);`;

/**
 * Table creation order respects FK dependencies:
 *   1. IFLOT, MARA           (no FKs)
 *   2. EQUI                  (→ IFLOT)
 *   3. QMEL                  (→ EQUI, IFLOT)
 *   4. AUFK                  (→ EQUI, IFLOT)
 *   5. AFKO                  (→ AUFK, QMEL)
 *   6. RESB, MSEG            (→ AUFK, MARA)
 *   7. MMPT                  (→ EQUI, IFLOT)
 *   8. PLPO                  (→ MMPT)
 *   9. IMPTT                 (→ EQUI)
 */
const TABLE_ORDER = [
    'IFLOT', 'MARA',
    'EQUI',
    'QMEL', 'AUFK',
    'AFKO',
    'RESB', 'MSEG',
    'MMPT',
    'PLPO',
    'IMPTT'
];

module.exports = { SCHEMA, TABLE_ORDER };
