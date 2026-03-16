/**
 * SAP PM Emulator — Seed Data
 *
 * Populates all 11 SAP PM tables with realistic Brazilian industrial data.
 * Context: Petrochemical plant (Planta Petroquímica BR-SP-01) in São Paulo.
 *
 * Run:  npm run seed
 *
 * Insertion order respects FK dependencies:
 *   1. IFLOT, MARA      (no FKs)
 *   2. EQUI              (→ IFLOT)
 *   3. QMEL              (→ EQUI, IFLOT)
 *   4. AUFK              (→ EQUI, IFLOT)
 *   5. AFKO              (→ AUFK, QMEL)
 *   6. RESB              (→ AUFK, MARA)
 *   7. MMPT              (→ EQUI, IFLOT)
 *   8. PLPO              (→ MMPT)
 *   9. IMPTT             (→ EQUI)
 *  10. MSEG              (→ AUFK, MARA)
 */

'use strict';

const path = require('path');
const Database = require('better-sqlite3');
const { SCHEMA, TABLE_ORDER } = require('../database/schema');
require('dotenv').config();

// ─── Database connection ────────────────────────────────────────────────────
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../database.db');
const fs = require('fs');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Ensure tables exist
for (const table of TABLE_ORDER) {
    db.exec(SCHEMA[table]);
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function pad(n, len = 3) { return String(n).padStart(len, '0'); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function sapDate(year, month, day) {
    return `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`;
}
function randomSapDate(yearMin, yearMax) {
    const y = randInt(yearMin, yearMax);
    const m = randInt(1, 12);
    const d = randInt(1, 28);
    return sapDate(y, m, d);
}

// ═══════════════════════════════════════════════════════════════════════════
//  1. IFLOT — 50 Functional Locations
// ═══════════════════════════════════════════════════════════════════════════
const IFLOT_DATA = [];

// Level 1 — Plants (2)
const plants = [
    { TPLNR: 'BR-SP-01', PLTXT: 'Planta Petroquímica São Paulo', FLTYP: 'P' },
    { TPLNR: 'BR-RJ-01', PLTXT: 'Planta Siderúrgica Rio de Janeiro', FLTYP: 'P' },
];

// Level 2 — Areas (8)
const areas = [
    { TPLNR: 'BR-SP-01-UTL', PLTXT: 'Utilidades - SP', FLTYP: 'A' },
    { TPLNR: 'BR-SP-01-PRC', PLTXT: 'Processo - SP', FLTYP: 'A' },
    { TPLNR: 'BR-SP-01-ARM', PLTXT: 'Armazenagem - SP', FLTYP: 'A' },
    { TPLNR: 'BR-SP-01-EXP', PLTXT: 'Expedição - SP', FLTYP: 'A' },
    { TPLNR: 'BR-RJ-01-ACR', PLTXT: 'Aciaria - RJ', FLTYP: 'A' },
    { TPLNR: 'BR-RJ-01-LAM', PLTXT: 'Laminação - RJ', FLTYP: 'A' },
    { TPLNR: 'BR-RJ-01-UTL', PLTXT: 'Utilidades - RJ', FLTYP: 'A' },
    { TPLNR: 'BR-RJ-01-LOG', PLTXT: 'Logística - RJ', FLTYP: 'A' },
];

// Level 3 — Sectors (16)
const sectors = [
    { TPLNR: 'BR-SP-01-UTL-CMP', PLTXT: 'Compressores - Utilidades SP', FLTYP: 'S' },
    { TPLNR: 'BR-SP-01-UTL-BOM', PLTXT: 'Bombas - Utilidades SP', FLTYP: 'S' },
    { TPLNR: 'BR-SP-01-UTL-TRF', PLTXT: 'Transformadores - Utilidades SP', FLTYP: 'S' },
    { TPLNR: 'BR-SP-01-PRC-REA', PLTXT: 'Reatores - Processo SP', FLTYP: 'S' },
    { TPLNR: 'BR-SP-01-PRC-DST', PLTXT: 'Destilação - Processo SP', FLTYP: 'S' },
    { TPLNR: 'BR-SP-01-PRC-TRC', PLTXT: 'Troca Térmica - Processo SP', FLTYP: 'S' },
    { TPLNR: 'BR-SP-01-ARM-TNQ', PLTXT: 'Tanques - Armazenagem SP', FLTYP: 'S' },
    { TPLNR: 'BR-SP-01-EXP-CRG', PLTXT: 'Carregamento - Expedição SP', FLTYP: 'S' },
    { TPLNR: 'BR-RJ-01-ACR-FRN', PLTXT: 'Fornos - Aciaria RJ', FLTYP: 'S' },
    { TPLNR: 'BR-RJ-01-ACR-CVC', PLTXT: 'Convertedores - Aciaria RJ', FLTYP: 'S' },
    { TPLNR: 'BR-RJ-01-LAM-DES', PLTXT: 'Desbaste - Laminação RJ', FLTYP: 'S' },
    { TPLNR: 'BR-RJ-01-LAM-ACB', PLTXT: 'Acabamento - Laminação RJ', FLTYP: 'S' },
    { TPLNR: 'BR-RJ-01-UTL-CMP', PLTXT: 'Compressores - Utilidades RJ', FLTYP: 'S' },
    { TPLNR: 'BR-RJ-01-UTL-BOM', PLTXT: 'Bombas - Utilidades RJ', FLTYP: 'S' },
    { TPLNR: 'BR-RJ-01-LOG-CRG', PLTXT: 'Carregamento - Logística RJ', FLTYP: 'S' },
    { TPLNR: 'BR-RJ-01-LOG-BAL', PLTXT: 'Balanças - Logística RJ', FLTYP: 'S' },
];

// Level 4 — Positions (24)
const positions = [
    { TPLNR: 'BR-SP-01-UTL-CMP-001', PLTXT: 'Posição Compressor 001', FLTYP: 'T' },
    { TPLNR: 'BR-SP-01-UTL-CMP-002', PLTXT: 'Posição Compressor 002', FLTYP: 'T' },
    { TPLNR: 'BR-SP-01-UTL-BOM-001', PLTXT: 'Posição Bomba 001', FLTYP: 'T' },
    { TPLNR: 'BR-SP-01-UTL-BOM-002', PLTXT: 'Posição Bomba 002', FLTYP: 'T' },
    { TPLNR: 'BR-SP-01-UTL-TRF-001', PLTXT: 'Posição Transformador 001', FLTYP: 'T' },
    { TPLNR: 'BR-SP-01-PRC-REA-001', PLTXT: 'Posição Reator 001', FLTYP: 'T' },
    { TPLNR: 'BR-SP-01-PRC-REA-002', PLTXT: 'Posição Reator 002', FLTYP: 'T' },
    { TPLNR: 'BR-SP-01-PRC-DST-001', PLTXT: 'Posição Coluna Destilação 001', FLTYP: 'T' },
    { TPLNR: 'BR-SP-01-PRC-TRC-001', PLTXT: 'Posição Trocador de Calor 001', FLTYP: 'T' },
    { TPLNR: 'BR-SP-01-PRC-TRC-002', PLTXT: 'Posição Trocador de Calor 002', FLTYP: 'T' },
    { TPLNR: 'BR-SP-01-ARM-TNQ-001', PLTXT: 'Posição Tanque 001', FLTYP: 'T' },
    { TPLNR: 'BR-SP-01-ARM-TNQ-002', PLTXT: 'Posição Tanque 002', FLTYP: 'T' },
    { TPLNR: 'BR-SP-01-EXP-CRG-001', PLTXT: 'Posição Carregamento 001', FLTYP: 'T' },
    { TPLNR: 'BR-RJ-01-ACR-FRN-001', PLTXT: 'Posição Forno 001', FLTYP: 'T' },
    { TPLNR: 'BR-RJ-01-ACR-FRN-002', PLTXT: 'Posição Forno 002', FLTYP: 'T' },
    { TPLNR: 'BR-RJ-01-ACR-CVC-001', PLTXT: 'Posição Convertedor 001', FLTYP: 'T' },
    { TPLNR: 'BR-RJ-01-LAM-DES-001', PLTXT: 'Posição Desbaste 001', FLTYP: 'T' },
    { TPLNR: 'BR-RJ-01-LAM-DES-002', PLTXT: 'Posição Desbaste 002', FLTYP: 'T' },
    { TPLNR: 'BR-RJ-01-LAM-ACB-001', PLTXT: 'Posição Acabamento 001', FLTYP: 'T' },
    { TPLNR: 'BR-RJ-01-UTL-CMP-001', PLTXT: 'Posição Compressor RJ 001', FLTYP: 'T' },
    { TPLNR: 'BR-RJ-01-UTL-BOM-001', PLTXT: 'Posição Bomba RJ 001', FLTYP: 'T' },
    { TPLNR: 'BR-RJ-01-UTL-BOM-002', PLTXT: 'Posição Bomba RJ 002', FLTYP: 'T' },
    { TPLNR: 'BR-RJ-01-LOG-CRG-001', PLTXT: 'Posição Carregamento RJ 001', FLTYP: 'T' },
    { TPLNR: 'BR-RJ-01-LOG-BAL-001', PLTXT: 'Posição Balança RJ 001', FLTYP: 'T' },
];

let kostlCounter = 1000;
[...plants, ...areas, ...sectors, ...positions].forEach(loc => {
    IFLOT_DATA.push({
        TPLNR: loc.TPLNR,
        PLTXT: loc.PLTXT,
        IWERK: '1000',
        SWERK: '1000',
        KOSTL: String(kostlCounter <= 1050 ? kostlCounter++ : randInt(1000, 1050)),
        BUKRS: '1000',
        ERDAT: randomSapDate(2015, 2020),
        AEDAT: randomSapDate(2021, 2025),
        STOCKTYPE: '',
        FLTYP: loc.FLTYP,
    });
});

// Collect all TPLNRs for FK references
const allTPLNR = IFLOT_DATA.map(r => r.TPLNR);
// Position-level TPLNRs (for equipment assignment)
const positionTPLNR = positions.map(r => r.TPLNR);

// ═══════════════════════════════════════════════════════════════════════════
//  6. MARA — 80 Materials (no FKs, insert early)
// ═══════════════════════════════════════════════════════════════════════════
const materialDefs = [
    // Rolamentos
    { base: 'ROL', desc: 'Rolamento', group: 'MECA', unit: 'EA', variants: [
        'Rolamento rígido de esferas 6205', 'Rolamento rígido de esferas 6206',
        'Rolamento rígido de esferas 6208', 'Rolamento rígido de esferas 6310',
        'Rolamento de rolos cilíndricos NU205', 'Rolamento de rolos cônicos 30205',
        'Rolamento autocompensador 22210', 'Rolamento axial de esferas 51105',
    ]},
    // Correias
    { base: 'COR', desc: 'Correia', group: 'MECA', unit: 'EA', variants: [
        'Correia em V A-68', 'Correia em V B-75', 'Correia em V C-90',
        'Correia dentada HTD 8M-1200', 'Correia sincronizadora T10-1500',
        'Correia poly-V PJ 1194', 'Correia plana 50x3mm',
        'Correia dentada GT3 8MGT-1280',
    ]},
    // Filtros
    { base: 'FIL', desc: 'Filtro', group: 'HIDR', unit: 'EA', variants: [
        'Filtro de óleo hidráulico 10 micra', 'Filtro de ar comprimido 5 micra',
        'Filtro coalescente 1 micra', 'Filtro de sucção 25 micra',
        'Elemento filtrante retorno 10 micra', 'Filtro de linha 3 micra',
        'Filtro de combustível 2 micra', 'Filtro separador de água',
    ]},
    // Lubrificantes
    { base: 'LUB', desc: 'Lubrificante', group: 'LUBR', unit: 'L', variants: [
        'Óleo hidráulico ISO VG 46', 'Óleo hidráulico ISO VG 68',
        'Óleo de engrenagem ISO VG 220', 'Óleo térmico Essotherm 650',
        'Graxa de lítio EP2', 'Graxa sintética de alta temperatura',
        'Óleo para compressor PAO 46', 'Fluido de corte semi-sintético',
    ]},
    // Vedações
    { base: 'VED', desc: 'Vedação', group: 'MECA', unit: 'EA', variants: [
        'Selo mecânico 35mm simples', 'Selo mecânico 50mm duplo',
        'Anel O-Ring Viton 25x3', 'Anel O-Ring NBR 30x4',
        'Gaxeta de grafite 12mm', 'Junta espirotalada 4" RF 150#',
        'Retentor 50x72x10 NBR', 'Junta de expansão DN100 PN16',
    ]},
    // Parafusos
    { base: 'PAR', desc: 'Parafuso/Fixação', group: 'FIXA', unit: 'PC', variants: [
        'Parafuso sextavado M12x50 8.8', 'Parafuso sextavado M16x80 10.9',
        'Parafuso Allen M10x40 12.9', 'Prisioneiro M20x120 B7',
        'Porca sextavada M16 classe 10', 'Arruela de pressão M12',
        'Chumbador mecânico M16x200', 'Rebite pop 4.8x12 inox',
    ]},
    // Sensores
    { base: 'SEN', desc: 'Sensor', group: 'INST', unit: 'EA', variants: [
        'Sensor de vibração piezoelétrico 100mV/g', 'Acelerômetro triaxial 500mV/g',
        'Termopar tipo K 0-1200°C', 'Termorresistência PT100 classe A',
        'Transmissor de pressão 0-10bar 4-20mA', 'Sensor de proximidade indutivo M18',
        'Sensor de nível ultrassônico', 'Sensor de vazão eletromagnético DN50',
    ]},
    // Inversores de frequência
    { base: 'INV', desc: 'Inversor', group: 'ELET', unit: 'EA', variants: [
        'Inversor de frequência 5CV 380V', 'Inversor de frequência 10CV 380V',
        'Inversor de frequência 25CV 380V', 'Inversor de frequência 50CV 380V',
        'Inversor de frequência 75CV 380V', 'Inversor de frequência 100CV 380V',
        'Soft-starter 30CV 380V', 'Soft-starter 75CV 380V',
    ]},
    // Componentes elétricos
    { base: 'ELE', desc: 'Componente elétrico', group: 'ELET', unit: 'EA', variants: [
        'Contator tripolar 40A 220V', 'Relé térmico 20-25A',
        'Disjuntor motor 16-20A', 'Fusível NH tamanho 1 100A',
        'Cabo de força 3x10mm² XLPE', 'Transformador de corrente 200/5A',
        'Fonte de alimentação 24VDC 10A', 'Botoeira de emergência cogumelo',
    ]},
    // Tubulação e conexões
    { base: 'TUB', desc: 'Tubulação', group: 'HIDR', unit: 'M', variants: [
        'Tubo aço carbono 4" SCH40', 'Tubo aço inox 2" SCH10S',
        'Mangueira hidráulica 1/2" R2', 'Conexão flange 4" 150# RF',
        'Curva aço carbono 4" 90° LR', 'Redução concêntrica 4"x3" SCH40',
        'Válvula esfera 2" 150# CF8M', 'Flange cego 4" 150# RF',
    ]},
];

const MARA_DATA = [];
let maraIdx = 1;
for (const group of materialDefs) {
    for (const variant of group.variants) {
        MARA_DATA.push({
            MATNR: `MAT-${pad(maraIdx, 4)}`,
            MAKTX: variant,
            MATL_TYPE: 'ERSA',
            MEINS: group.unit,
            MATKL: group.group,
            MTPOS_MARA: 'NORM',
            BRGEW: +(Math.random() * 20 + 0.1).toFixed(2),
            NTGEW: +(Math.random() * 18 + 0.1).toFixed(2),
            GEWEI: 'KG',
        });
        maraIdx++;
    }
}
// Trim to exactly 80
const MARA_FINAL = MARA_DATA.slice(0, 80);
const allMATNR = MARA_FINAL.map(r => r.MATNR);

// ═══════════════════════════════════════════════════════════════════════════
//  2. EQUI — 80 Equipment
// ═══════════════════════════════════════════════════════════════════════════
const equipDefs = [
    { EQART: 'COMP', names: [
        'Compressor de ar parafuso Atlas Copco GA75', 'Compressor centrífugo Joy C3',
        'Compressor alternativo Dresser-Rand HHE', 'Compressor de gás Siemens STC-SH',
        'Compressor booster Bauer K28', 'Compressor de refrigeração Mayekawa',
    ]},
    { EQART: 'BOMB', names: [
        'Bomba centrífuga KSB Meganorm 65-250', 'Bomba centrífuga Sulzer Ahlstar A22-80',
        'Bomba de engrenagens Viking HL4195', 'Bomba dosadora Milton Roy mRoy A',
        'Bomba submersível Flygt NP3127', 'Bomba de vácuo Nash CL3002',
        'Bomba centrífuga Imbil INI 65-40', 'Bomba de processo Flowserve Mark3',
    ]},
    { EQART: 'MOTO', names: [
        'Motor elétrico WEG W22 75CV 4P', 'Motor elétrico WEG W22 50CV 2P',
        'Motor elétrico WEG W22 100CV 4P', 'Motor elétrico ABB M3BP 30CV 4P',
        'Motor elétrico Siemens 1LE1 25CV 2P', 'Motor elétrico WEG W22 150CV 6P',
        'Motor elétrico WEG W22 200CV 4P', 'Motor elétrico ABB M3BP 15CV 4P',
    ]},
    { EQART: 'TRAN', names: [
        'Transportador de correia Rexnord 800mm', 'Transportador helicoidal WAM 300mm',
        'Elevador de canecas Bühler 200TPH', 'Transportador de arraste Redler 400mm',
        'Esteira transportadora Interroll 600mm', 'Rosca transportadora 250mm aço inox',
    ]},
    { EQART: 'TROC', names: [
        'Trocador de calor casco-tubo Alfa Laval T20', 'Trocador de placas APV N35',
        'Trocador de calor aletado Kelvion NX25', 'Condensador casco-tubo Conbravo 500TR',
        'Resfriador a ar Bohn ADT200', 'Aquecedor de fluido térmico Aalborg OL',
    ]},
    { EQART: 'VALV', names: [
        'Válvula de controle Fisher ED 4" AN CV120', 'Válvula borboleta Keystone AR2 6"',
        'Válvula de segurança Leser 4414 3"x4"', 'Válvula esfera Trunnion 4" CL300',
        'Válvula globo Velan 4" 600#', 'Válvula gaveta API600 6" CL150',
        'Válvula de retenção duo-check 4"', 'Válvula solenoide ASCO 2" 220V',
    ]},
];

const EQUI_DATA = [];
let equiIdx = 1;
const serialChars = 'ABCDEFGHJKLMNPRSTUVWXYZ';
for (const def of equipDefs) {
    for (const name of def.names) {
        const year = String(randInt(2010, 2023));
        const serial = `${pick([...serialChars])}${pick([...serialChars])}${randInt(100000, 999999)}`;
        const tplnr = pick(positionTPLNR);
        const kostl = String(randInt(1000, 1050));
        const values = {
            COMP: [350000, 1800000], BOMB: [45000, 650000], MOTO: [15000, 280000],
            TRAN: [120000, 900000], TROC: [80000, 750000], VALV: [8000, 180000],
        };
        const [vMin, vMax] = values[def.EQART];
        EQUI_DATA.push({
            EQUNR: `EQ-${pad(equiIdx, 5)}`,
            EQTXT: name,
            TPLNR: tplnr,
            IWERK: '1000',
            KOSTL: kostl,
            BUKRS: '1000',
            ERDAT: randomSapDate(parseInt(year), parseInt(year) + 1),
            AEDAT: randomSapDate(2023, 2025),
            EQART: def.EQART,
            SERGE: serial,
            BAUJJ: year,
            ANSWT: +(Math.random() * (vMax - vMin) + vMin).toFixed(2),
            WAERS: 'BRL',
        });
        equiIdx++;
    }
}
// Pad to 80 by cycling
while (EQUI_DATA.length < 80) {
    const src = EQUI_DATA[EQUI_DATA.length % equipDefs.reduce((s, d) => s + d.names.length, 0)];
    const year = String(randInt(2010, 2023));
    EQUI_DATA.push({
        ...src,
        EQUNR: `EQ-${pad(equiIdx, 5)}`,
        TPLNR: pick(positionTPLNR),
        ERDAT: randomSapDate(parseInt(year), parseInt(year) + 1),
        AEDAT: randomSapDate(2023, 2025),
        BAUJJ: year,
        SERGE: `${pick([...serialChars])}${pick([...serialChars])}${randInt(100000, 999999)}`,
        ANSWT: +(Math.random() * 500000 + 20000).toFixed(2),
    });
    equiIdx++;
}
const allEQUNR = EQUI_DATA.map(r => r.EQUNR);

// ═══════════════════════════════════════════════════════════════════════════
//  3. QMEL — 100 Maintenance Notifications
// ═══════════════════════════════════════════════════════════════════════════
const notifTypes = ['M1', 'M2', 'M3'];
const notifStatus = [
    ...Array(40).fill('ABER'),   // 40%
    ...Array(35).fill('INEX'),   // 35%
    ...Array(25).fill('CONC'),   // 25%
];
const notifDescriptions = [
    'Vibração excessiva no mancal lado acoplado',
    'Vazamento de óleo no selo mecânico',
    'Temperatura elevada no rolamento',
    'Ruído anormal no redutor',
    'Cavitação na bomba centrífuga',
    'Desalinhamento detectado por análise de vibração',
    'Correia em V com desgaste excessivo',
    'Falha no inversor de frequência - alarme de sobrecorrente',
    'Válvula de segurança abrindo abaixo da pressão de set',
    'Corrosão externa na tubulação de processo',
    'Queda de rendimento no trocador de calor',
    'Motor elétrico com isolamento degradado',
    'Transmissor de pressão descalibrado',
    'Vazamento na junta de flange',
    'Transportador de correia desalinhado',
    'Filtro de óleo hidráulico saturado',
    'Bomba de vácuo com perda de capacidade',
    'Contator com contatos desgastados',
    'Sensor de vibração com sinal intermitente',
    'Válvula de controle com histerese excessiva',
    'Compressor com alta temperatura de descarga',
    'Forno com refratário danificado',
    'Rolamento com folga axial excessiva',
    'Sistema de lubrificação automática sem pressão',
    'Alarme de nível alto no tanque de drenagem',
];
const workCenters = ['MEC-01', 'MEC-02', 'ELE-01', 'INS-01', 'CAL-01', 'TUB-01'];
const creators = ['SILVA_J', 'SANTOS_M', 'OLIVEIRA_R', 'SOUZA_C', 'COSTA_F', 'PEREIRA_A', 'LIMA_T', 'CARVALHO_L'];

const QMEL_DATA = [];
for (let i = 1; i <= 100; i++) {
    const eq = pick(allEQUNR);
    const eqRec = EQUI_DATA.find(e => e.EQUNR === eq);
    QMEL_DATA.push({
        QMNUM: `QM-${pad(i, 6)}`,
        QMART: pick(notifTypes),
        QMTXT: pick(notifDescriptions),
        EQUNR: eq,
        TPLNR: eqRec.TPLNR,
        IWERK: '1000',
        PRIOK: String(randInt(1, 4)),
        QMCOD: `PM-${pad(randInt(1, 30), 2)}`,
        ERDAT: randomSapDate(2023, 2025),
        ERNAM: pick(creators),
        LTRMN: randomSapDate(2025, 2026),
        ARBPL: pick(workCenters),
        KOSTL: String(randInt(1000, 1050)),
        QMST: notifStatus[i - 1] || pick(['ABER', 'INEX', 'CONC']),
    });
}
const allQMNUM = QMEL_DATA.map(r => r.QMNUM);

// ═══════════════════════════════════════════════════════════════════════════
//  4. AUFK — 100 Order Master
// ═══════════════════════════════════════════════════════════════════════════
const orderTypes = ['PM01', 'PM02', 'PM03'];
const orderStatus = [
    ...Array(20).fill('CRTD'),   // 20%
    ...Array(40).fill('REL'),    // 40%
    ...Array(25).fill('TECO'),   // 25%
    ...Array(15).fill('CLSD'),   // 15%
];
const orderDescriptions = [
    'Troca de rolamentos do mancal LA',
    'Substituição do selo mecânico',
    'Revisão geral do compressor',
    'Troca de correias do ventilador',
    'Alinhamento de acoplamento',
    'Substituição de filtros hidráulicos',
    'Reparo no inversor de frequência',
    'Manutenção preventiva trimestral',
    'Inspeção preditiva por termografia',
    'Análise de vibração periódica',
    'Troca de óleo do redutor',
    'Calibração de instrumentos de campo',
    'Reparo de válvula de controle',
    'Substituição de gaxetas',
    'Revisão do motor elétrico',
    'Limpeza do trocador de calor',
    'Troca de junta de expansão',
    'Inspeção de espessura por ultrassom',
    'Manutenção do sistema de lubrificação',
    'Reparo em tubulação - soldagem',
    'Troca de sensores de vibração',
    'Substituição de contatores e relés',
    'Manutenção da bomba de vácuo',
    'Verificação de aterramento elétrico',
    'Inspeção de segurança de válvulas PSV',
];

const AUFK_DATA = [];
for (let i = 1; i <= 100; i++) {
    const eq = pick(allEQUNR);
    const eqRec = EQUI_DATA.find(e => e.EQUNR === eq);
    const gstrp = randomSapDate(2024, 2025);
    const startYear = parseInt(gstrp.substring(0, 4));
    const startMonth = parseInt(gstrp.substring(4, 6));
    const endMonth = Math.min(startMonth + randInt(0, 2), 12);
    const gltrp = sapDate(startYear, endMonth, randInt(1, 28));

    AUFK_DATA.push({
        AUFNR: `ORD-${pad(i, 6)}`,
        AUART: pick(orderTypes),
        AUTXT: pick(orderDescriptions),
        EQUNR: eq,
        TPLNR: eqRec.TPLNR,
        IWERK: '1000',
        PRIOK: String(randInt(1, 4)),
        KOSTL: String(randInt(1000, 1050)),
        ERDAT: gstrp,
        ERNAM: pick(creators),
        GSTRP: gstrp,
        GLTRP: gltrp,
        ARBPL: pick(workCenters),
        AUFST: orderStatus[i - 1] || pick(['CRTD', 'REL', 'TECO', 'CLSD']),
    });
}
const allAUFNR = AUFK_DATA.map(r => r.AUFNR);

// ═══════════════════════════════════════════════════════════════════════════
//  5. AFKO — 100 Order Headers (1:1 with AUFK)
// ═══════════════════════════════════════════════════════════════════════════
const AFKO_DATA = AUFK_DATA.map((ord, idx) => ({
    AUFNR: ord.AUFNR,
    QMNUM: allQMNUM[idx % allQMNUM.length],
    ARBPL: ord.ARBPL,
    IWERK: '1000',
    GSTRP: ord.GSTRP,
    GLTRP: ord.GLTRP,
    GMNGA: +(randInt(1, 10)).toFixed(1),
    WEMNG: +(Math.random() * 5).toFixed(1),
    RMNGA: +(Math.random() * 3).toFixed(1),
}));

// ═══════════════════════════════════════════════════════════════════════════
//  7. RESB — 60 Material Reservations
// ═══════════════════════════════════════════════════════════════════════════
const storageLocations = ['0001', '0002', '0003', '0010', '0020'];
const RESB_DATA = [];
for (let i = 1; i <= 60; i++) {
    const mat = MARA_FINAL[i % MARA_FINAL.length];
    const qty = +(randInt(1, 20)).toFixed(0);
    const withdrawn = +(Math.random() * qty).toFixed(1);
    RESB_DATA.push({
        RSNUM: `RES-${pad(i, 6)}`,
        AUFNR: allAUFNR[(i - 1) % allAUFNR.length],
        MATNR: mat.MATNR,
        BDMNG: qty,
        ENMNG: withdrawn,
        ERFMG: qty,
        MEINS: mat.MEINS,
        BDTER: randomSapDate(2024, 2025),
        LGORT: pick(storageLocations),
    });
}

// ═══════════════════════════════════════════════════════════════════════════
//  8. MMPT — 40 Maintenance Plans
// ═══════════════════════════════════════════════════════════════════════════
const frequencies = [7, 15, 30, 90, 180, 365];
const strategies = ['ZP1', 'ZP2', 'ZP3'];
const planDescriptions = [
    'Plano lubrificação compressores', 'Plano inspeção bombas centrífugas',
    'Plano preventiva motores elétricos', 'Plano inspeção transportadores',
    'Plano limpeza trocadores de calor', 'Plano preventiva válvulas controle',
    'Plano calibração instrumentos', 'Plano inspeção elétrica painéis',
    'Plano análise de vibração', 'Plano termografia infravermelha',
    'Plano troca de filtros hidráulicos', 'Plano troca de óleo redutores',
    'Plano inspeção correias', 'Plano teste válvulas segurança',
    'Plano inspeção refratários', 'Plano manutenção sistema pneumático',
    'Plano inspeção tubulações', 'Plano troca de fluidos de corte',
    'Plano preventiva pontes rolantes', 'Plano inspeção sistema combate incêndio',
    'Plano lubrificação mancais', 'Plano inspeção selos mecânicos',
    'Plano troca de rolamentos programada', 'Plano calibração transmissores pressão',
    'Plano inspeção tanques de armazenagem', 'Plano preventiva compressores ar',
    'Plano inspeção sistema refrigeração', 'Plano troca de correias transportadores',
    'Plano análise de óleo lubrificante', 'Plano inspeção aterramento elétrico',
    'Plano manutenção inversores frequência', 'Plano inspeção válvulas gaveta',
    'Plano preventiva sistemas dosagem', 'Plano calibração medidores vazão',
    'Plano inspeção juntas de expansão', 'Plano preventiva fornos industriais',
    'Plano troca de gaxetas bombas', 'Plano inspeção disjuntores MT',
    'Plano preventiva transformadores', 'Plano inspeção extintores',
];

const MMPT_DATA = [];
for (let i = 1; i <= 40; i++) {
    const eq = allEQUNR[(i - 1) % allEQUNR.length];
    const eqRec = EQUI_DATA.find(e => e.EQUNR === eq);
    MMPT_DATA.push({
        WARPL: `MP-${pad(i, 5)}`,
        WPTXT: planDescriptions[i - 1],
        IWERK: '1000',
        EQUNR: eq,
        TPLNR: eqRec.TPLNR,
        ZYKL1: pick(frequencies),
        ZEINH: 'D',
        STRAT: pick(strategies),
        NPLDA: randomSapDate(2025, 2026),
        LPLDA: randomSapDate(2024, 2025),
        WAPOS: `IP-${pad(i, 4)}`,
    });
}
const allWARPL = MMPT_DATA.map(r => r.WARPL);

// ═══════════════════════════════════════════════════════════════════════════
//  9. PLPO — 40 Task List Operations
// ═══════════════════════════════════════════════════════════════════════════
const taskDescriptions = [
    'Bloquear e etiquetar equipamento (LOTO)',
    'Drenar fluido do sistema',
    'Desconectar acoplamento',
    'Remover proteções e carenagens',
    'Inspecionar visualmente componentes internos',
    'Medir folga axial e radial dos rolamentos',
    'Substituir rolamentos conforme plano',
    'Aplicar torque nos parafusos conforme tabela',
    'Realizar alinhamento a laser',
    'Verificar balanceamento dinâmico',
    'Trocar óleo lubrificante do redutor',
    'Limpar filtro de sucção e retorno',
    'Substituir elemento filtrante',
    'Calibrar transmissor de pressão',
    'Verificar set point da válvula de segurança',
    'Medir isolamento do motor elétrico',
    'Verificar aperto de conexões elétricas',
    'Coletar amostra de óleo para análise',
    'Verificar tensionamento de correias',
    'Lubrificar mancais com graxa especificada',
    'Realizar teste de vazão',
    'Inspecionar selos mecânicos',
    'Verificar alinhamento de eixos',
    'Registrar leituras de vibração',
    'Registrar temperatura de operação',
    'Testar atuação da válvula de controle',
    'Verificar aterramento do equipamento',
    'Testar intertravamentos de segurança',
    'Limpar trocador de calor (lado casco)',
    'Limpar trocador de calor (lado tubo)',
    'Inspecionar internos do trocador',
    'Substituir juntas de vedação',
    'Realizar teste hidrostático',
    'Instalar proteções e carenagens',
    'Reconectar acoplamento',
    'Realizar partida assistida do equipamento',
    'Monitorar parâmetros operacionais pós-partida',
    'Registrar dados no formulário de manutenção',
    'Desbloquear equipamento (LOTO)',
    'Atualizar registro de manutenção no sistema',
];

const PLPO_DATA = [];
for (let i = 0; i < 40; i++) {
    PLPO_DATA.push({
        PLNTY: 'A',
        PLNNR: `TL-${pad(i + 1, 5)}`,
        PLNKN: pad(i + 1, 4),
        WARPL: allWARPL[i % allWARPL.length],
        LTXA1: taskDescriptions[i],
        ARBPL: pick(workCenters),
        VSTEL: '',
        WERKS: '1000',
        VORNR: `00${(i % 10 + 1) * 10}`,
        STEUS: pick(['PM01', 'PM02', 'PM03']),
    });
}

// ═══════════════════════════════════════════════════════════════════════════
//  10. IMPTT — 50 Measurement Points
// ═══════════════════════════════════════════════════════════════════════════
const msGroups = [
    { MSGRP: 'VIBR', desc: 'Vibração', unit: 'mm/s', target: 4.5, decimals: 2 },
    { MSGRP: 'TEMP', desc: 'Temperatura', unit: '°C', target: 75.0, decimals: 1 },
    { MSGRP: 'PRES', desc: 'Pressão', unit: 'bar', target: 6.0, decimals: 2 },
    { MSGRP: 'CORR', desc: 'Corrente elétrica', unit: 'A', target: 45.0, decimals: 1 },
];
const mpDescriptions = {
    VIBR: [
        'Vibração mancal lado acoplado', 'Vibração mancal lado livre',
        'Vibração axial', 'Vibração radial horizontal', 'Vibração radial vertical',
    ],
    TEMP: [
        'Temperatura mancal LA', 'Temperatura mancal LL',
        'Temperatura descarga', 'Temperatura carcaça motor',
        'Temperatura óleo lubrificante',
    ],
    PRES: [
        'Pressão descarga', 'Pressão sucção', 'Pressão diferencial',
        'Pressão óleo lubrificante', 'Pressão selo',
    ],
    CORR: [
        'Corrente fase R', 'Corrente fase S', 'Corrente fase T',
        'Corrente de partida', 'Corrente nominal operação',
    ],
};

const IMPTT_DATA = [];
for (let i = 1; i <= 50; i++) {
    const grp = msGroups[(i - 1) % msGroups.length];
    const descs = mpDescriptions[grp.MSGRP];
    const eq = allEQUNR[(i - 1) % allEQUNR.length];
    IMPTT_DATA.push({
        POINT: `MP-${pad(i, 6)}`,
        EQUNR: eq,
        PTTXT: descs[(i - 1) % descs.length],
        MSGRP: grp.MSGRP,
        PTYP: 'M',
        IWERK: '1000',
        QPUNT: grp.unit,
        NKOUN: grp.decimals,
        ENMNG: grp.target,
        MEINS: grp.unit,
        LDATE: randomSapDate(2024, 2025),
    });
}

// ═══════════════════════════════════════════════════════════════════════════
//  11. MSEG — 80 Material Documents
// ═══════════════════════════════════════════════════════════════════════════
const MSEG_DATA = [];
for (let i = 1; i <= 80; i++) {
    const mat = MARA_FINAL[(i - 1) % MARA_FINAL.length];
    const isReversal = i % 10 === 0; // ~10% reversals (262)
    MSEG_DATA.push({
        MBLNR: `MD-${pad(i, 7)}`,
        ZEILE: '0001',
        AUFNR: allAUFNR[(i - 1) % allAUFNR.length],
        MATNR: mat.MATNR,
        MENGE: +(randInt(1, 15)).toFixed(0),
        MEINS: mat.MEINS,
        LGORT: pick(storageLocations),
        WERKS: '1000',
        BWART: isReversal ? '262' : '261',
        BUDAT: randomSapDate(2024, 2025),
    });
}

// ═══════════════════════════════════════════════════════════════════════════
//  INSERT LOGIC
// ═══════════════════════════════════════════════════════════════════════════

function buildInsert(table, columns) {
    const placeholders = columns.map(() => '?').join(', ');
    return db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`);
}

function insertRows(table, rows) {
    if (rows.length === 0) return 0;
    const columns = Object.keys(rows[0]);
    const stmt = buildInsert(table, columns);
    for (const row of rows) {
        stmt.run(...columns.map(c => row[c]));
    }
    return rows.length;
}

// ─── MAIN ───────────────────────────────────────────────────────────────────
function seed() {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║       SAP PM Emulator — Seed Data (Brazilian MFG)      ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    // Clear tables in reverse dependency order
    const reverseOrder = [...TABLE_ORDER].reverse();
    console.log('[SEED] Clearing existing data...');
    const clearTx = db.transaction(() => {
        for (const table of reverseOrder) {
            db.exec(`DELETE FROM ${table}`);
        }
    });
    clearTx();
    console.log('[SEED] All tables cleared.\n');

    // Insert in FK-dependency order within a transaction
    const counts = {};
    const insertTx = db.transaction(() => {
        // 1. IFLOT (no FK)
        counts.IFLOT = insertRows('IFLOT', IFLOT_DATA);

        // 2. MARA (no FK)
        counts.MARA = insertRows('MARA', MARA_FINAL);

        // 3. EQUI (→ IFLOT)
        counts.EQUI = insertRows('EQUI', EQUI_DATA);

        // 4. QMEL (→ EQUI, IFLOT)
        counts.QMEL = insertRows('QMEL', QMEL_DATA);

        // 5. AUFK (→ EQUI, IFLOT)
        counts.AUFK = insertRows('AUFK', AUFK_DATA);

        // 6. AFKO (→ AUFK, QMEL)
        counts.AFKO = insertRows('AFKO', AFKO_DATA);

        // 7. RESB (→ AUFK, MARA)
        counts.RESB = insertRows('RESB', RESB_DATA);

        // 8. MMPT (→ EQUI, IFLOT)
        counts.MMPT = insertRows('MMPT', MMPT_DATA);

        // 9. PLPO (→ MMPT)
        counts.PLPO = insertRows('PLPO', PLPO_DATA);

        // 10. IMPTT (→ EQUI)
        counts.IMPTT = insertRows('IMPTT', IMPTT_DATA);

        // 11. MSEG (→ AUFK, MARA)
        counts.MSEG = insertRows('MSEG', MSEG_DATA);
    });

    insertTx();

    // ─── Summary ────────────────────────────────────────────────────────────
    console.log('┌────────────────────────────────────────────────────────┐');
    console.log('│  Table       │  Records  │  Description               │');
    console.log('├────────────────────────────────────────────────────────┤');
    const meta = {
        IFLOT: 'Functional Locations',
        MARA:  'Materials',
        EQUI:  'Equipment',
        QMEL:  'Maintenance Notifications',
        AUFK:  'Order Master',
        AFKO:  'Order Header',
        RESB:  'Material Reservations',
        MMPT:  'Maintenance Plans',
        PLPO:  'Task Lists',
        IMPTT: 'Measurement Points',
        MSEG:  'Material Documents',
    };

    let total = 0;
    for (const table of TABLE_ORDER) {
        const c = counts[table] || 0;
        total += c;
        const tName = table.padEnd(10);
        const tCount = String(c).padStart(6);
        const tDesc = (meta[table] || '').padEnd(28);
        console.log(`│  ${tName}  │  ${tCount}  │  ${tDesc}│`);
    }
    console.log('├────────────────────────────────────────────────────────┤');
    console.log(`│  TOTAL       │  ${String(total).padStart(6)}  │                              │`);
    console.log('└────────────────────────────────────────────────────────┘');
    console.log('\n[SEED] ✔ Seed completed successfully.');
    console.log(`[SEED] Database: ${DB_PATH}`);
}

// Run
try {
    seed();
} catch (err) {
    console.error('[SEED] ✘ Error during seeding:', err.message);
    console.error(err.stack);
    process.exit(1);
} finally {
    db.close();
}
