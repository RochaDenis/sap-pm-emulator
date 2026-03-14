/**
 * IFLOT (Functional Locations) — CRUD Controller
 * SAP OData conventions for PM_FUNCLOC_SRV
 */
const { db } = require('../database');

const TABLE = 'IFLOT';
const PK = 'TPLNR';
const COLUMNS = [
  'TPLNR', 'PLTXT', 'IWERK', 'SWERK', 'KOSTL',
  'BUKRS', 'ERDAT', 'AEDAT', 'STOCKTYPE', 'FLTYP',
];

// ─── GET /IFLOTSet ───────────────────────────────────────────────────────────
function getAll(req, res) {
  try {
    let sql = `SELECT * FROM ${TABLE}`;
    const params = [];

    // $filter  — simple "Field eq 'Value'" support
    if (req.query.$filter) {
      const filters = req.query.$filter.split(' and ').map((f) => {
        const match = f.trim().match(/^(\w+)\s+eq\s+'([^']*)'$/i);
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

// ─── GET /IFLOTSet(':TPLNR') ─────────────────────────────────────────────────
function getById(req, res) {
  try {
    const id = req.params[PK];
    const row = db.prepare(`SELECT * FROM ${TABLE} WHERE ${PK} = ?`).get(id);
    if (!row) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Local funcional não encontrado' } },
      });
    }
    return res.status(200).json({ d: row });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── POST /IFLOTSet ──────────────────────────────────────────────────────────
function create(req, res) {
  try {
    if (!req.body[PK]) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `Campo obrigatório ausente: ${PK}` } },
      });
    }

    const cols = COLUMNS.filter((c) => req.body[c] !== undefined);
    const vals = cols.map((c) => req.body[c]);
    const placeholders = cols.map(() => '?').join(', ');

    db.prepare(`INSERT INTO ${TABLE} (${cols.join(', ')}) VALUES (${placeholders})`).run(...vals);

    const created = db.prepare(`SELECT * FROM ${TABLE} WHERE ${PK} = ?`).get(req.body[PK]);
    return res.status(201).json({ d: created });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── PUT /IFLOTSet(':TPLNR') ─────────────────────────────────────────────────
function update(req, res) {
  try {
    const id = req.params[PK];
    const existing = db.prepare(`SELECT * FROM ${TABLE} WHERE ${PK} = ?`).get(id);
    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Local funcional não encontrado' } },
      });
    }

    const setCols = COLUMNS.filter((c) => c !== PK);
    const setClause = setCols.map((c) => `${c} = ?`).join(', ');
    const vals = setCols.map((c) => req.body[c] !== undefined ? req.body[c] : null);

    db.prepare(`UPDATE ${TABLE} SET ${setClause} WHERE ${PK} = ?`).run(...vals, id);

    const updated = db.prepare(`SELECT * FROM ${TABLE} WHERE ${PK} = ?`).get(id);
    return res.status(200).json({ d: updated });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── PATCH /IFLOTSet(':TPLNR') ───────────────────────────────────────────────
function patch(req, res) {
  try {
    const id = req.params[PK];
    const existing = db.prepare(`SELECT * FROM ${TABLE} WHERE ${PK} = ?`).get(id);
    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Local funcional não encontrado' } },
      });
    }

    const fields = COLUMNS.filter((c) => c !== PK && req.body[c] !== undefined);
    if (fields.length === 0) {
      return res.status(200).json({ d: existing });
    }

    const setClause = fields.map((c) => `${c} = ?`).join(', ');
    const vals = fields.map((c) => req.body[c]);

    db.prepare(`UPDATE ${TABLE} SET ${setClause} WHERE ${PK} = ?`).run(...vals, id);

    const updated = db.prepare(`SELECT * FROM ${TABLE} WHERE ${PK} = ?`).get(id);
    return res.status(200).json({ d: updated });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── DELETE /IFLOTSet(':TPLNR') ──────────────────────────────────────────────
function remove(req, res) {
  try {
    const id = req.params[PK];
    const existing = db.prepare(`SELECT * FROM ${TABLE} WHERE ${PK} = ?`).get(id);
    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Local funcional não encontrado' } },
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
