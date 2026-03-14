/**
 * RESB (Reservas de Material) — CRUD Controller
 * SAP OData conventions for PM_MATERIAL_SRV
 *
 * Business Rules:
 *   - RSNUM auto-generated: RES-YYYYMMDD-XXXX (sequential)
 *   - AUFNR FK → AUFK (required)
 *   - MATNR FK → MARA (required)
 *   - BDMNG (required qty) must be > 0
 *   - Response includes MARA.MAKTX and AUFK.AUTXT
 */
const { db } = require('../database');

const TABLE = 'RESB';
const PK = 'RSNUM';
const COLUMNS = [
  'RSNUM', 'AUFNR', 'MATNR', 'BDMNG', 'ENMNG',
  'ERFMG', 'MEINS', 'BDTER', 'LGORT',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Return today as YYYYMMDD string */
function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/** Generate next RSNUM: RES-YYYYMMDD-XXXX */
function generateRSNUM() {
  const today = todayYYYYMMDD();
  const prefix = `RES-${today}-`;

  const last = db
    .prepare(`SELECT RSNUM FROM RESB WHERE RSNUM LIKE ? ORDER BY RSNUM DESC LIMIT 1`)
    .get(`${prefix}%`);

  let seq = 1;
  if (last) {
    const parts = last.RSNUM.split('-');
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

/** Build a SELECT that joins RESB ↔ MARA.MAKTX, AUFK.AUTXT */
function selectWithJoins(whereClause = '', params = []) {
  let sql = `
    SELECT R.*,
           M.MAKTX  AS MAKTX,
           A.AUTXT   AS AUTXT
    FROM RESB R
    LEFT JOIN MARA M ON R.MATNR = M.MATNR
    LEFT JOIN AUFK A ON R.AUFNR = A.AUFNR`;

  if (whereClause) {
    sql += ` WHERE ${whereClause}`;
  }

  return db.prepare(sql).all(...params);
}

/** Fetch single record with joins */
function selectOneWithJoins(rsnum) {
  const rows = selectWithJoins('R.RSNUM = ?', [rsnum]);
  return rows.length > 0 ? rows[0] : null;
}

// ─── GET /RESBSet ────────────────────────────────────────────────────────────
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
        whereParts = filters.map((f) => `R.${f.col} = ?`);
        params.push(...filters.map((f) => f.val));
      }
    }

    let sql = `
      SELECT R.*,
             M.MAKTX  AS MAKTX,
             A.AUTXT   AS AUTXT
      FROM RESB R
      LEFT JOIN MARA M ON R.MATNR = M.MATNR
      LEFT JOIN AUFK A ON R.AUFNR = A.AUFNR`;

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

// ─── GET /RESBSet(':RSNUM') ──────────────────────────────────────────────────
function getById(req, res) {
  try {
    const id = req.params[PK];
    const row = selectOneWithJoins(id);
    if (!row) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Reserva não encontrada' } },
      });
    }
    return res.status(200).json({ d: row });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── POST /RESBSet ───────────────────────────────────────────────────────────
function create(req, res) {
  try {
    const body = req.body;

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

    // Validate BDMNG > 0
    if (body.BDMNG === undefined || body.BDMNG === null || Number(body.BDMNG) <= 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: 'BDMNG (quantidade necessária) deve ser maior que 0' } },
      });
    }

    // Auto-generate RSNUM
    const rsnum = generateRSNUM();
    body.RSNUM = rsnum;

    // Default ENMNG to 0 if not provided
    if (body.ENMNG === undefined) {
      body.ENMNG = 0;
    }

    const cols = COLUMNS.filter((c) => body[c] !== undefined);
    const vals = cols.map((c) => body[c]);
    const placeholders = cols.map(() => '?').join(', ');

    db.prepare(`INSERT INTO ${TABLE} (${cols.join(', ')}) VALUES (${placeholders})`).run(...vals);

    const created = selectOneWithJoins(rsnum);
    return res.status(201).json({ d: created });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── PATCH /RESBSet(':RSNUM') ────────────────────────────────────────────────
function patch(req, res) {
  try {
    const id = req.params[PK];
    const existing = db.prepare(`SELECT * FROM ${TABLE} WHERE ${PK} = ?`).get(id);
    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Reserva não encontrada' } },
      });
    }

    const body = req.body;

    // Validate BDMNG > 0 if provided
    if (body.BDMNG !== undefined && Number(body.BDMNG) <= 0) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: 'BDMNG (quantidade necessária) deve ser maior que 0' } },
      });
    }

    const fields = COLUMNS.filter((c) => c !== PK && body[c] !== undefined);
    if (fields.length === 0) {
      const row = selectOneWithJoins(id);
      return res.status(200).json({ d: row });
    }

    const setClause = fields.map((c) => `${c} = ?`).join(', ');
    const vals = fields.map((c) => body[c]);

    db.prepare(`UPDATE ${TABLE} SET ${setClause} WHERE ${PK} = ?`).run(...vals, id);

    const updated = selectOneWithJoins(id);
    return res.status(200).json({ d: updated });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── DELETE /RESBSet(':RSNUM') ───────────────────────────────────────────────
function remove(req, res) {
  try {
    const id = req.params[PK];
    const existing = db.prepare(`SELECT * FROM ${TABLE} WHERE ${PK} = ?`).get(id);
    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Reserva não encontrada' } },
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

module.exports = { getAll, getById, create, patch, remove };
