/**
 * IMPTT (Pontos de Medição) — CRUD Controller
 * SAP OData conventions for PM_MEASPOINT_SRV
 *
 * Business Rules:
 *   - POINT auto-generated: MP-POINT-XXXX (sequential)
 *   - MSGRP must be: VIBR, TEMP, PRES, CORR
 *   - EQUNR FK → EQUI
 *   - PATCH reading update must log LDATE (last reading date)
 *   - Response includes EQUI.EQTXT
 */
const { db } = require('../database');

const IMPTT_COLUMNS = [
  'POINT', 'EQUNR', 'PTTXT', 'MSGRP', 'PTYP',
  'IWERK', 'QPUNT', 'NKOUN', 'ENMNG', 'MEINS', 'LDATE',
];

const VALID_MSGRP = ['VIBR', 'TEMP', 'PRES', 'CORR'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Return today as YYYYMMDD string */
function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/** Generate next POINT: MP-POINT-XXXX */
function generatePOINT() {
  const prefix = 'MP-POINT-';

  const last = db
    .prepare(`SELECT POINT FROM IMPTT WHERE POINT LIKE ? ORDER BY POINT DESC LIMIT 1`)
    .get(`${prefix}%`);

  let seq = 1;
  if (last) {
    const parts = last.POINT.split('-');
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

/** Single IMPTT with joins */
function selectOneWithJoins(point) {
  return db.prepare(`
    SELECT I.*,
           E.EQTXT AS EQTXT
    FROM IMPTT I
    LEFT JOIN EQUI E ON I.EQUNR = E.EQUNR
    WHERE I.POINT = ?
  `).get(point);
}

// ─── GET /IMPTTSet ────────────────────────────────────────────────────────────
function getAll(req, res) {
  try {
    let whereParts = [];
    const params = [];

    if (req.query.$filter) {
      const filters = req.query.$filter.split(' and ').map((f) => {
        const match = f.trim().match(/^(\w+)\s+eq\s+'([^']*)'/i);
        if (!match) return null;
        return { col: match[1], val: match[2] };
      }).filter(Boolean);

      if (filters.length) {
        whereParts = filters.map((f) => `I.${f.col} = ?`);
        params.push(...filters.map((f) => f.val));
      }
    }

    let sql = `
      SELECT I.*,
             E.EQTXT AS EQTXT
      FROM IMPTT I
      LEFT JOIN EQUI E ON I.EQUNR = E.EQUNR`;

    if (whereParts.length) {
      sql += ' WHERE ' + whereParts.join(' AND ');
    }

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

// ─── GET /IMPTTSet(':POINT') ─────────────────────────────────────────────────
function getById(req, res) {
  try {
    const id = req.params.POINT;
    const row = selectOneWithJoins(id);
    if (!row) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Ponto de medição não encontrado' } },
      });
    }
    return res.status(200).json({ d: row });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── POST /IMPTTSet ───────────────────────────────────────────────────────────
function create(req, res) {
  try {
    const body = req.body;

    // Validate MSGRP
    if (!body.MSGRP || !VALID_MSGRP.includes(body.MSGRP)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `MSGRP inválido: '${body.MSGRP}'. Valores permitidos: ${VALID_MSGRP.join(', ')}` } },
      });
    }

    // Validate EQUNR FK
    const equnrErr = validateFK('EQUI', 'EQUNR', body.EQUNR, 'Equipamento');
    if (equnrErr) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: equnrErr } },
      });
    }

    // Auto-generate POINT
    const point = generatePOINT();

    const record = { ...body, POINT: point };
    const cols = IMPTT_COLUMNS.filter((c) => record[c] !== undefined);
    const vals = cols.map((c) => record[c]);
    const placeholders = cols.map(() => '?').join(', ');
    db.prepare(`INSERT INTO IMPTT (${cols.join(', ')}) VALUES (${placeholders})`).run(...vals);

    const created = selectOneWithJoins(point);
    return res.status(201).json({ d: created });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── PATCH /IMPTTSet(':POINT') ———————————————————————————————————————————————
function patch(req, res) {
  try {
    const id = req.params.POINT;
    const existing = db.prepare(`SELECT * FROM IMPTT WHERE POINT = ?`).get(id);
    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Ponto de medição não encontrado' } },
      });
    }

    const body = req.body;

    // Validate MSGRP if provided
    if (body.MSGRP !== undefined && !VALID_MSGRP.includes(body.MSGRP)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `MSGRP inválido: '${body.MSGRP}'. Valores permitidos: ${VALID_MSGRP.join(', ')}` } },
      });
    }

    // Validate EQUNR FK if provided
    if (body.EQUNR !== undefined) {
      const equnrErr = validateFK('EQUI', 'EQUNR', body.EQUNR, 'Equipamento');
      if (equnrErr) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: equnrErr } },
        });
      }
    }

    // If reading fields are updated (NKOUN, ENMNG), auto-log LDATE
    if (body.NKOUN !== undefined || body.ENMNG !== undefined) {
      body.LDATE = todayYYYYMMDD();
    }

    const fields = IMPTT_COLUMNS.filter((c) => c !== 'POINT' && body[c] !== undefined);
    if (fields.length > 0) {
      const setClause = fields.map((c) => `${c} = ?`).join(', ');
      const vals = fields.map((c) => body[c]);
      db.prepare(`UPDATE IMPTT SET ${setClause} WHERE POINT = ?`).run(...vals, id);
    }

    const updated = selectOneWithJoins(id);
    return res.status(200).json({ d: updated });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── DELETE /IMPTTSet(':POINT') ——————————————————————————————————————————————
function remove(req, res) {
  try {
    const id = req.params.POINT;
    const existing = db.prepare(`SELECT * FROM IMPTT WHERE POINT = ?`).get(id);
    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Ponto de medição não encontrado' } },
      });
    }

    db.prepare(`DELETE FROM IMPTT WHERE POINT = ?`).run(id);
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

module.exports = { getAll, getById, create, patch, remove };
