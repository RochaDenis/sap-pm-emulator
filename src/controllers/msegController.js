/**
 * MSEG (Movimentações de Material) — CRUD Controller
 * SAP OData conventions for PM_MATERIAL_SRV
 *
 * Business Rules:
 *   - MBLNR auto-generated: MOV-YYYYMMDD-XXXX (sequential)
 *   - BWART must be: 261 (goods issue) or 262 (reversal)
 *   - AUFNR FK → AUFK (required)
 *   - MATNR FK → MARA (required)
 *   - MENGE must be > 0
 *   - BUDAT auto-set to today if not provided
 *   - POST with BWART=261 updates RESB.ENMNG (issued qty)
 *   - Response includes MARA.MAKTX and AUFK.AUTXT
 */
const { db } = require('../database');

const TABLE = 'MSEG';
const PK = 'MBLNR';
const COLUMNS = [
  'MBLNR', 'ZEILE', 'AUFNR', 'MATNR', 'MENGE',
  'MEINS', 'LGORT', 'WERKS', 'BWART', 'BUDAT',
];

const VALID_BWART = ['261', '262'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Return today as YYYYMMDD string */
function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/** Generate next MBLNR: MOV-YYYYMMDD-XXXX */
function generateMBLNR() {
  const today = todayYYYYMMDD();
  const prefix = `MOV-${today}-`;

  const last = db
    .prepare(`SELECT MBLNR FROM MSEG WHERE MBLNR LIKE ? ORDER BY MBLNR DESC LIMIT 1`)
    .get(`${prefix}%`);

  let seq = 1;
  if (last) {
    const parts = last.MBLNR.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

/** Validate foreign key existence */
function validateFK(table, pk, value, label) {
  if (!value) return null;
  const row = db.prepare(`SELECT ${pk} FROM ${table} WHERE ${pk} = ?`).get(value);
  if (!row) {
    return `${label} '${value}' não encontrado na tabela ${table}`;
  }
  return null;
}

/** Build a SELECT that joins MSEG ↔ MARA.MAKTX, AUFK.AUTXT */
function selectWithJoins(whereClause = '', params = []) {
  let sql = `
    SELECT G.*,
           M.MAKTX  AS MAKTX,
           A.AUTXT   AS AUTXT
    FROM MSEG G
    LEFT JOIN MARA M ON G.MATNR = M.MATNR
    LEFT JOIN AUFK A ON G.AUFNR = A.AUFNR`;

  if (whereClause) {
    sql += ` WHERE ${whereClause}`;
  }

  return db.prepare(sql).all(...params);
}

/** Fetch single record with joins */
function selectOneWithJoins(mblnr) {
  const rows = selectWithJoins('G.MBLNR = ?', [mblnr]);
  return rows.length > 0 ? rows[0] : null;
}

// ─── GET /MSEGSet ────────────────────────────────────────────────────────────
function getAll(req, res) {
  try {
    let whereParts = [];
    const params = [];

    // $filter — simple "Field eq 'Value'" support
    if (req.query.$filter) {
      const filters = req.query.$filter.split(' and ').map((f) => {
        const match = f.trim().match(/^(\w+)\s+eq\s+'([^']*)'/i);
        if (!match) return null;
        return { col: match[1], val: match[2] };
      }).filter(Boolean);

      if (filters.length) {
        whereParts = filters.map((f) => `G.${f.col} = ?`);
        params.push(...filters.map((f) => f.val));
      }
    }

    let sql = `
      SELECT G.*,
             M.MAKTX  AS MAKTX,
             A.AUTXT   AS AUTXT
      FROM MSEG G
      LEFT JOIN MARA M ON G.MATNR = M.MATNR
      LEFT JOIN AUFK A ON G.AUFNR = A.AUFNR`;

    if (whereParts.length) {
      sql += ' WHERE ' + whereParts.join(' AND ');
    }

    // $skip / $top
    if (req.query.$top) {
      sql += ` LIMIT ?`;
      params.push(Number(req.query.$top));
    }
    if (req.query.$skip) {
      if (!req.query.$top) { sql += ' LIMIT -1'; }
      sql += ` OFFSET ?`;
      params.push(Number(req.query.$skip));
    }

    const rows = db.prepare(sql).all(...params);
    return res.status(200).json({ d: { results: rows } });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── GET /MSEGSet(':MBLNR') ──────────────────────────────────────────────────
function getById(req, res) {
  try {
    const id = req.params[PK];
    const row = selectOneWithJoins(id);
    if (!row) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Documento de material não encontrado' } },
      });
    }
    return res.status(200).json({ d: row });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── POST /MSEGSet ───────────────────────────────────────────────────────────
function create(req, res) {
  try {
    const body = req.body;

    // Validate BWART
    if (!body.BWART || !VALID_BWART.includes(body.BWART)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `BWART inválido: '${body.BWART}'. Valores permitidos: ${VALID_BWART.join(', ')}` } },
      });
    }

    // Validate AUFNR FK (required)
    if (!body.AUFNR) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: 'Campo obrigatório ausente: AUFNR' } },
      });
    }
    const aufnrErr = validateFK('AUFK', 'AUFNR', body.AUFNR, 'Ordem');
    if (aufnrErr) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: aufnrErr } },
      });
    }

    // Validate MATNR FK (required)
    if (!body.MATNR) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: 'Campo obrigatório ausente: MATNR' } },
      });
    }
    const matnrErr = validateFK('MARA', 'MATNR', body.MATNR, 'Material');
    if (matnrErr) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: matnrErr } },
      });
    }

    // Validate MENGE > 0
    if (body.MENGE === undefined || body.MENGE === null || Number(body.MENGE) <= 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: 'MENGE (quantidade) deve ser maior que 0' } },
      });
    }

    // Auto-generate MBLNR
    const mblnr = generateMBLNR();
    body.MBLNR = mblnr;

    // Auto-set BUDAT to today if not provided
    if (!body.BUDAT) {
      body.BUDAT = todayYYYYMMDD();
    }

    // Transaction: insert MSEG + update RESB.ENMNG on BWART 261
    const insertTransaction = db.transaction(() => {
      const cols = COLUMNS.filter((c) => body[c] !== undefined);
      const vals = cols.map((c) => body[c]);
      const placeholders = cols.map(() => '?').join(', ');

      db.prepare(`INSERT INTO ${TABLE} (${cols.join(', ')}) VALUES (${placeholders})`).run(...vals);

      // If BWART 261 (goods issue), update RESB.ENMNG
      if (body.BWART === '261') {
        const resb = db.prepare(
          `SELECT RSNUM, ENMNG FROM RESB WHERE AUFNR = ? AND MATNR = ?`
        ).get(body.AUFNR, body.MATNR);

        if (resb) {
          const newENMNG = (resb.ENMNG || 0) + Number(body.MENGE);
          db.prepare(`UPDATE RESB SET ENMNG = ? WHERE RSNUM = ?`).run(newENMNG, resb.RSNUM);
        }
      }
    });

    insertTransaction();

    const created = selectOneWithJoins(mblnr);
    return res.status(201).json({ d: created });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── DELETE /MSEGSet(':MBLNR') ───────────────────────────────────────────────
function remove(req, res) {
  try {
    const id = req.params[PK];
    const existing = db.prepare(`SELECT * FROM ${TABLE} WHERE ${PK} = ?`).get(id);
    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Documento de material não encontrado' } },
      });
    }

    db.prepare(`DELETE FROM ${TABLE} WHERE ${PK} = ?`).run(id);
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

module.exports = { getAll, getById, create, remove };
