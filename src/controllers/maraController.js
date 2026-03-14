/**
 * MARA (Materiais) — CRUD Controller
 * SAP OData conventions for PM_MATERIAL_SRV
 *
 * Business Rules:
 *   - MATNR auto-generated: MAT-XXXX (sequential)
 *   - MEINS must be: EA, KG, L, M, PC
 *   - MATL_TYPE must be: ERSA (spare parts), HIBE (operating supplies)
 */
const { db } = require('../database');

const TABLE = 'MARA';
const PK = 'MATNR';
const COLUMNS = [
  'MATNR', 'MAKTX', 'MATL_TYPE', 'MEINS', 'MATKL',
  'MTPOS_MARA', 'BRGEW', 'NTGEW', 'GEWEI',
];

const VALID_MEINS = ['EA', 'KG', 'L', 'M', 'PC'];
const VALID_MATL_TYPE = ['ERSA', 'HIBE'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Generate next MATNR: MAT-XXXX */
function generateMATNR() {
  const prefix = 'MAT-';
  const last = db
    .prepare(`SELECT MATNR FROM MARA WHERE MATNR LIKE ? ORDER BY MATNR DESC LIMIT 1`)
    .get(`${prefix}%`);

  let seq = 1;
  if (last) {
    const parts = last.MATNR.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ─── GET /MARASet ────────────────────────────────────────────────────────────
function getAll(req, res) {
  try {
    let sql = `SELECT * FROM ${TABLE}`;
    const params = [];

    // $filter — simple "Field eq 'Value'" support
    if (req.query.$filter) {
      const filters = req.query.$filter.split(' and ').map((f) => {
        const match = f.trim().match(/^(\w+)\s+eq\s+'([^']*)'/i);
        if (!match) return null;
        return { col: match[1], val: match[2] };
      }).filter(Boolean);

      if (filters.length) {
        sql += ' WHERE ' + filters.map((f) => `${f.col} = ?`).join(' AND ');
        params.push(...filters.map((f) => f.val));
      }
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

// ─── GET /MARASet(':MATNR') ──────────────────────────────────────────────────
function getById(req, res) {
  try {
    const id = req.params[PK];
    const row = db.prepare(`SELECT * FROM ${TABLE} WHERE ${PK} = ?`).get(id);
    if (!row) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Material não encontrado' } },
      });
    }
    return res.status(200).json({ d: row });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── POST /MARASet ───────────────────────────────────────────────────────────
function create(req, res) {
  try {
    const body = req.body;

    // Validate MEINS
    if (body.MEINS && !VALID_MEINS.includes(body.MEINS)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `MEINS inválido: '${body.MEINS}'. Valores permitidos: ${VALID_MEINS.join(', ')}` } },
      });
    }

    // Validate MATL_TYPE
    if (body.MATL_TYPE && !VALID_MATL_TYPE.includes(body.MATL_TYPE)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `MATL_TYPE inválido: '${body.MATL_TYPE}'. Valores permitidos: ${VALID_MATL_TYPE.join(', ')}` } },
      });
    }

    // Auto-generate MATNR
    const matnr = generateMATNR();
    body.MATNR = matnr;

    const cols = COLUMNS.filter((c) => body[c] !== undefined);
    const vals = cols.map((c) => body[c]);
    const placeholders = cols.map(() => '?').join(', ');

    db.prepare(`INSERT INTO ${TABLE} (${cols.join(', ')}) VALUES (${placeholders})`).run(...vals);

    const created = db.prepare(`SELECT * FROM ${TABLE} WHERE ${PK} = ?`).get(matnr);
    return res.status(201).json({ d: created });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── PUT /MARASet(':MATNR') ──────────────────────────────────────────────────
function update(req, res) {
  try {
    const id = req.params[PK];
    const existing = db.prepare(`SELECT * FROM ${TABLE} WHERE ${PK} = ?`).get(id);
    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Material não encontrado' } },
      });
    }

    const body = req.body;

    // Validate MEINS if provided
    if (body.MEINS && !VALID_MEINS.includes(body.MEINS)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `MEINS inválido: '${body.MEINS}'. Valores permitidos: ${VALID_MEINS.join(', ')}` } },
      });
    }

    // Validate MATL_TYPE if provided
    if (body.MATL_TYPE && !VALID_MATL_TYPE.includes(body.MATL_TYPE)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `MATL_TYPE inválido: '${body.MATL_TYPE}'. Valores permitidos: ${VALID_MATL_TYPE.join(', ')}` } },
      });
    }

    const setCols = COLUMNS.filter((c) => c !== PK);
    const setClause = setCols.map((c) => `${c} = ?`).join(', ');
    const vals = setCols.map((c) => body[c] !== undefined ? body[c] : null);

    db.prepare(`UPDATE ${TABLE} SET ${setClause} WHERE ${PK} = ?`).run(...vals, id);

    const updated = db.prepare(`SELECT * FROM ${TABLE} WHERE ${PK} = ?`).get(id);
    return res.status(200).json({ d: updated });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── PATCH /MARASet(':MATNR') ────────────────────────────────────────────────
function patch(req, res) {
  try {
    const id = req.params[PK];
    const existing = db.prepare(`SELECT * FROM ${TABLE} WHERE ${PK} = ?`).get(id);
    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Material não encontrado' } },
      });
    }

    const body = req.body;

    // Validate MEINS if provided
    if (body.MEINS && !VALID_MEINS.includes(body.MEINS)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `MEINS inválido: '${body.MEINS}'. Valores permitidos: ${VALID_MEINS.join(', ')}` } },
      });
    }

    // Validate MATL_TYPE if provided
    if (body.MATL_TYPE && !VALID_MATL_TYPE.includes(body.MATL_TYPE)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `MATL_TYPE inválido: '${body.MATL_TYPE}'. Valores permitidos: ${VALID_MATL_TYPE.join(', ')}` } },
      });
    }

    const fields = COLUMNS.filter((c) => c !== PK && body[c] !== undefined);
    if (fields.length === 0) {
      return res.status(200).json({ d: existing });
    }

    const setClause = fields.map((c) => `${c} = ?`).join(', ');
    const vals = fields.map((c) => body[c]);

    db.prepare(`UPDATE ${TABLE} SET ${setClause} WHERE ${PK} = ?`).run(...vals, id);

    const updated = db.prepare(`SELECT * FROM ${TABLE} WHERE ${PK} = ?`).get(id);
    return res.status(200).json({ d: updated });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── DELETE /MARASet(':MATNR') ───────────────────────────────────────────────
function remove(req, res) {
  try {
    const id = req.params[PK];
    const existing = db.prepare(`SELECT * FROM ${TABLE} WHERE ${PK} = ?`).get(id);
    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Material não encontrado' } },
      });
    }

    const resbCheck = db.prepare(`SELECT 1 FROM RESB WHERE MATNR = ? LIMIT 1`).get(id);
    if (resbCheck) {
      return res.status(400).json({
        error: { code: 'DEPENDENCY_EXISTS', message: { lang: 'pt-BR', value: 'Material possui reservas ou movimentações vinculadas' } },
      });
    }

    const msegCheck = db.prepare(`SELECT 1 FROM MSEG WHERE MATNR = ? LIMIT 1`).get(id);
    if (msegCheck) {
      return res.status(400).json({
        error: { code: 'DEPENDENCY_EXISTS', message: { lang: 'pt-BR', value: 'Material possui reservas ou movimentações vinculadas' } },
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

module.exports = { getAll, getById, create, update, patch, remove };
