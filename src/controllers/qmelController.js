/**
 * QMEL (Maintenance Notification / Nota de Manutenção) — CRUD Controller
 * SAP OData conventions for PM_NOTIFICATION_SRV
 *
 * Business Rules:
 *   - QMNUM auto-generated: QM-YYYYMMDD-XXXX (sequential)
 *   - QMART must be M1, M2, or M3
 *   - QMST transitions: ABER → INEX → CONC (forward only)
 *   - PRIOK must be 1, 2, 3, or 4
 *   - ERDAT auto-set to today if not provided
 *   - EQUNR FK → EQUI, TPLNR FK → IFLOT
 *   - Response includes EQUI.EQTXT and IFLOT.PLTXT
 */
const { db } = require('../database');

const TABLE = 'QMEL';
const PK = 'QMNUM';
const COLUMNS = [
  'QMNUM', 'QMART', 'QMTXT', 'EQUNR', 'TPLNR', 'IWERK',
  'PRIOK', 'QMCOD', 'ERDAT', 'ERNAM', 'LTRMN', 'ARBPL',
  'KOSTL', 'QMST',
];

const VALID_QMART = ['M1', 'M2', 'M3'];
const VALID_PRIOK = ['1', '2', '3', '4'];
const STATUS_ORDER = ['ABER', 'INEX', 'CONC'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Return today as YYYYMMDD string */
function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/** Generate next QMNUM: QM-YYYYMMDD-XXXX */
function generateQMNUM() {
  const today = todayYYYYMMDD();
  const prefix = `QM-${today}-`;

  const last = db
    .prepare(`SELECT ${PK} FROM ${TABLE} WHERE ${PK} LIKE ? ORDER BY ${PK} DESC LIMIT 1`)
    .get(`${prefix}%`);

  let seq = 1;
  if (last) {
    const parts = last[PK].split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

/** Build a SELECT that joins EQUI.EQTXT and IFLOT.PLTXT */
function selectWithJoins(whereClause = '', params = []) {
  let sql = `
    SELECT Q.*,
           E.EQTXT AS EQTXT,
           I.PLTXT AS PLTXT
    FROM ${TABLE} Q
    LEFT JOIN EQUI E ON Q.EQUNR = E.EQUNR
    LEFT JOIN IFLOT I ON Q.TPLNR = I.TPLNR`;

  if (whereClause) {
    sql += ` WHERE ${whereClause}`;
  }

  return db.prepare(sql).all(...params);
}

/** Fetch single record with joins */
function selectOneWithJoins(qmnum) {
  const rows = selectWithJoins('Q.QMNUM = ?', [qmnum]);
  return rows.length > 0 ? rows[0] : null;
}

/** Validate foreign key existence */
function validateFK(table, pk, value, label) {
  if (!value) return null; // optional field
  const row = db.prepare(`SELECT ${pk} FROM ${table} WHERE ${pk} = ?`).get(value);
  if (!row) {
    return `${label} '${value}' não encontrado na tabela ${table}`;
  }
  return null;
}

/** Validate QMST transition: only forward allowed */
function validateStatusTransition(currentStatus, newStatus) {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const newIdx = STATUS_ORDER.indexOf(newStatus);
  if (newIdx < 0) {
    return `Status inválido: '${newStatus}'. Valores permitidos: ${STATUS_ORDER.join(', ')}`;
  }
  if (newIdx <= currentIdx) {
    return `Transição de status inválida: '${currentStatus}' → '${newStatus}'. Somente avanço permitido: ${STATUS_ORDER.join(' → ')}`;
  }
  return null;
}

// ─── GET /QMELSet ─────────────────────────────────────────────────────────────
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
        whereParts = filters.map((f) => `Q.${f.col} = ?`);
        params.push(...filters.map((f) => f.val));
      }
    }

    let sql = `
      SELECT Q.*,
             E.EQTXT AS EQTXT,
             I.PLTXT AS PLTXT
      FROM ${TABLE} Q
      LEFT JOIN EQUI E ON Q.EQUNR = E.EQUNR
      LEFT JOIN IFLOT I ON Q.TPLNR = I.TPLNR`;

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

// ─── GET /QMELSet(':QMNUM') ──────────────────────────────────────────────────
function getById(req, res) {
  try {
    const id = req.params[PK];
    const row = selectOneWithJoins(id);
    if (!row) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Nota de manutenção não encontrada' } },
      });
    }
    return res.status(200).json({ d: row });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── POST /QMELSet ────────────────────────────────────────────────────────────
function create(req, res) {
  try {
    const body = req.body;

    // Validate QMART
    if (!body.QMART || !VALID_QMART.includes(body.QMART)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `QMART inválido: '${body.QMART}'. Valores permitidos: ${VALID_QMART.join(', ')}` } },
      });
    }

    // Validate PRIOK (if provided)
    if (body.PRIOK && !VALID_PRIOK.includes(body.PRIOK)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `PRIOK inválido: '${body.PRIOK}'. Valores permitidos: ${VALID_PRIOK.join(', ')}` } },
      });
    }

    // Validate EQUNR FK
    const equnrErr = validateFK('EQUI', 'EQUNR', body.EQUNR, 'Equipamento');
    if (equnrErr) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: equnrErr } },
      });
    }

    // Validate TPLNR FK
    const tplnrErr = validateFK('IFLOT', 'TPLNR', body.TPLNR, 'Local de instalação');
    if (tplnrErr) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: tplnrErr } },
      });
    }

    // Auto-generate QMNUM
    const qmnum = generateQMNUM();

    // Default ERDAT to today
    if (!body.ERDAT) {
      body.ERDAT = todayYYYYMMDD();
    }

    // Default QMST to ABER
    if (!body.QMST) {
      body.QMST = 'ABER';
    }

    // Build INSERT
    const record = { ...body, QMNUM: qmnum };
    const cols = COLUMNS.filter((c) => record[c] !== undefined);
    const vals = cols.map((c) => record[c]);
    const placeholders = cols.map(() => '?').join(', ');

    db.prepare(`INSERT INTO ${TABLE} (${cols.join(', ')}) VALUES (${placeholders})`).run(...vals);

    const created = selectOneWithJoins(qmnum);
    return res.status(201).json({ d: created });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── PUT /QMELSet(':QMNUM') ──────────────────────────────────────────────────
function update(req, res) {
  try {
    const id = req.params[PK];
    const existing = db.prepare(`SELECT * FROM ${TABLE} WHERE ${PK} = ?`).get(id);
    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Nota de manutenção não encontrada' } },
      });
    }

    const body = req.body;

    // Validate QMART if provided
    if (body.QMART && !VALID_QMART.includes(body.QMART)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `QMART inválido: '${body.QMART}'. Valores permitidos: ${VALID_QMART.join(', ')}` } },
      });
    }

    // Validate PRIOK if provided
    if (body.PRIOK && !VALID_PRIOK.includes(body.PRIOK)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `PRIOK inválido: '${body.PRIOK}'. Valores permitidos: ${VALID_PRIOK.join(', ')}` } },
      });
    }

    // Validate QMST transition if changing
    if (body.QMST && body.QMST !== existing.QMST) {
      const statusErr = validateStatusTransition(existing.QMST, body.QMST);
      if (statusErr) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: statusErr } },
        });
      }
    }

    // Validate EQUNR FK
    const equnrErr = validateFK('EQUI', 'EQUNR', body.EQUNR, 'Equipamento');
    if (equnrErr) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: equnrErr } },
      });
    }

    // Validate TPLNR FK
    const tplnrErr = validateFK('IFLOT', 'TPLNR', body.TPLNR, 'Local de instalação');
    if (tplnrErr) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: tplnrErr } },
      });
    }

    const setCols = COLUMNS.filter((c) => c !== PK);
    const setClause = setCols.map((c) => `${c} = ?`).join(', ');
    const vals = setCols.map((c) => body[c] !== undefined ? body[c] : null);

    db.prepare(`UPDATE ${TABLE} SET ${setClause} WHERE ${PK} = ?`).run(...vals, id);

    const updated = selectOneWithJoins(id);
    return res.status(200).json({ d: updated });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── PATCH /QMELSet(':QMNUM') ────────────────────────────────────────────────
function patch(req, res) {
  try {
    const id = req.params[PK];
    const existing = db.prepare(`SELECT * FROM ${TABLE} WHERE ${PK} = ?`).get(id);
    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Nota de manutenção não encontrada' } },
      });
    }

    const body = req.body;

    // Validate QMART if provided
    if (body.QMART && !VALID_QMART.includes(body.QMART)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `QMART inválido: '${body.QMART}'. Valores permitidos: ${VALID_QMART.join(', ')}` } },
      });
    }

    // Validate PRIOK if provided
    if (body.PRIOK && !VALID_PRIOK.includes(body.PRIOK)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `PRIOK inválido: '${body.PRIOK}'. Valores permitidos: ${VALID_PRIOK.join(', ')}` } },
      });
    }

    // Validate QMST transition if changing
    if (body.QMST && body.QMST !== existing.QMST) {
      const statusErr = validateStatusTransition(existing.QMST, body.QMST);
      if (statusErr) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: statusErr } },
        });
      }
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

    // Validate TPLNR FK if provided
    if (body.TPLNR !== undefined) {
      const tplnrErr = validateFK('IFLOT', 'TPLNR', body.TPLNR, 'Local de instalação');
      if (tplnrErr) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: tplnrErr } },
        });
      }
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

// ─── DELETE /QMELSet(':QMNUM') ───────────────────────────────────────────────
function remove(req, res) {
  try {
    const id = req.params[PK];
    const existing = db.prepare(`SELECT * FROM ${TABLE} WHERE ${PK} = ?`).get(id);
    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Nota de manutenção não encontrada' } },
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
