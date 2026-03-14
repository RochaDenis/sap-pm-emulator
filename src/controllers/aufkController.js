/**
 * AUFK + AFKO (Ordem de Manutenção) — CRUD Controller
 * SAP OData conventions for PM_ORDER_SRV
 *
 * Business Rules:
 *   - AUFNR auto-generated: ORD-YYYYMMDD-XXXX (sequential)
 *   - AUART must be PM01, PM02, or PM03
 *   - AUFST transitions: CRTD → REL → TECO → CLSD (forward only)
 *   - PRIOK must be 1, 2, 3, or 4
 *   - EQUNR FK → EQUI, QMNUM FK → QMEL (optional)
 *   - GSTRP cannot be after GLTRP
 *   - ERDAT auto-set to today
 *   - AUFK + AFKO always created / deleted atomically
 *   - When order created from QMEL: update QMEL.QMST to INEX
 *   - Response includes EQUI.EQTXT, IFLOT.PLTXT, QMEL.QMTXT, AFKO fields inline
 */
const { db } = require('../database');

const AUFK_COLUMNS = [
  'AUFNR', 'AUART', 'AUTXT', 'EQUNR', 'TPLNR', 'IWERK',
  'PRIOK', 'KOSTL', 'ERDAT', 'ERNAM', 'GSTRP', 'GLTRP',
  'ARBPL', 'AUFST',
];

const AFKO_COLUMNS = [
  'AUFNR', 'QMNUM', 'ARBPL', 'IWERK', 'GSTRP', 'GLTRP',
  'GMNGA', 'WEMNG', 'RMNGA',
];

const VALID_AUART = ['PM01', 'PM02', 'PM03'];
const VALID_PRIOK = ['1', '2', '3', '4'];
const STATUS_ORDER = ['CRTD', 'REL', 'TECO', 'CLSD'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Return today as YYYYMMDD string */
function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/** Generate next AUFNR: ORD-YYYYMMDD-XXXX */
function generateAUFNR() {
  const today = todayYYYYMMDD();
  const prefix = `ORD-${today}-`;

  const last = db
    .prepare(`SELECT AUFNR FROM AUFK WHERE AUFNR LIKE ? ORDER BY AUFNR DESC LIMIT 1`)
    .get(`${prefix}%`);

  let seq = 1;
  if (last) {
    const parts = last.AUFNR.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

/** Build a SELECT that joins AUFK ↔ AFKO, EQUI.EQTXT, IFLOT.PLTXT, QMEL.QMTXT */
function selectWithJoins(whereClause = '', params = []) {
  let sql = `
    SELECT A.*,
           AFK.QMNUM   AS QMNUM,
           AFK.ARBPL    AS AFKO_ARBPL,
           AFK.IWERK    AS AFKO_IWERK,
           AFK.GSTRP    AS AFKO_GSTRP,
           AFK.GLTRP    AS AFKO_GLTRP,
           AFK.GMNGA    AS GMNGA,
           AFK.WEMNG    AS WEMNG,
           AFK.RMNGA    AS RMNGA,
           E.EQTXT      AS EQTXT,
           I.PLTXT      AS PLTXT,
           Q.QMTXT      AS QMTXT
    FROM AUFK A
    LEFT JOIN AFKO AFK ON A.AUFNR = AFK.AUFNR
    LEFT JOIN EQUI E   ON A.EQUNR = E.EQUNR
    LEFT JOIN IFLOT I  ON A.TPLNR = I.TPLNR
    LEFT JOIN QMEL Q   ON AFK.QMNUM = Q.QMNUM`;

  if (whereClause) {
    sql += ` WHERE ${whereClause}`;
  }

  return db.prepare(sql).all(...params);
}

/** Fetch single record with joins */
function selectOneWithJoins(aufnr) {
  const rows = selectWithJoins('A.AUFNR = ?', [aufnr]);
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

/** Validate AUFST transition: only forward allowed */
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

// ─── GET /AUFKSet ─────────────────────────────────────────────────────────────
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
        whereParts = filters.map((f) => `A.${f.col} = ?`);
        params.push(...filters.map((f) => f.val));
      }
    }

    let sql = `
      SELECT A.*,
             AFK.QMNUM   AS QMNUM,
             AFK.ARBPL    AS AFKO_ARBPL,
             AFK.IWERK    AS AFKO_IWERK,
             AFK.GSTRP    AS AFKO_GSTRP,
             AFK.GLTRP    AS AFKO_GLTRP,
             AFK.GMNGA    AS GMNGA,
             AFK.WEMNG    AS WEMNG,
             AFK.RMNGA    AS RMNGA,
             E.EQTXT      AS EQTXT,
             I.PLTXT      AS PLTXT,
             Q.QMTXT      AS QMTXT
      FROM AUFK A
      LEFT JOIN AFKO AFK ON A.AUFNR = AFK.AUFNR
      LEFT JOIN EQUI E   ON A.EQUNR = E.EQUNR
      LEFT JOIN IFLOT I  ON A.TPLNR = I.TPLNR
      LEFT JOIN QMEL Q   ON AFK.QMNUM = Q.QMNUM`;

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

// ─── GET /AUFKSet(':AUFNR') ──────────────────────────────────────────────────
function getById(req, res) {
  try {
    const id = req.params.AUFNR;
    const row = selectOneWithJoins(id);
    if (!row) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Ordem de manutenção não encontrada' } },
      });
    }
    return res.status(200).json({ d: row });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── POST /AUFKSet ────────────────────────────────────────────────────────────
function create(req, res) {
  try {
    const body = req.body;

    // Validate AUART
    if (!body.AUART || !VALID_AUART.includes(body.AUART)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `AUART inválido: '${body.AUART}'. Valores permitidos: ${VALID_AUART.join(', ')}` } },
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

    // Validate QMNUM FK (optional)
    const qmnumErr = validateFK('QMEL', 'QMNUM', body.QMNUM, 'Nota de manutenção');
    if (qmnumErr) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: qmnumErr } },
      });
    }

    // Validate date range: GSTRP cannot be after GLTRP
    if (body.GSTRP && body.GLTRP && body.GSTRP > body.GLTRP) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `Data de início (GSTRP: ${body.GSTRP}) não pode ser posterior à data de término (GLTRP: ${body.GLTRP})` } },
      });
    }

    // Auto-generate AUFNR
    const aufnr = generateAUFNR();

    // Default ERDAT to today
    if (!body.ERDAT) {
      body.ERDAT = todayYYYYMMDD();
    }

    // Default AUFST to CRTD
    if (!body.AUFST) {
      body.AUFST = 'CRTD';
    }

    // Atomic insert: AUFK + AFKO
    const insertTransaction = db.transaction(() => {
      // Insert AUFK
      const aufkRecord = { ...body, AUFNR: aufnr };
      const aufkCols = AUFK_COLUMNS.filter((c) => aufkRecord[c] !== undefined);
      const aufkVals = aufkCols.map((c) => aufkRecord[c]);
      const aufkPlaceholders = aufkCols.map(() => '?').join(', ');
      db.prepare(`INSERT INTO AUFK (${aufkCols.join(', ')}) VALUES (${aufkPlaceholders})`).run(...aufkVals);

      // Insert AFKO
      const afkoRecord = {
        AUFNR: aufnr,
        QMNUM: body.QMNUM || null,
        ARBPL: body.ARBPL || null,
        IWERK: body.IWERK || null,
        GSTRP: body.GSTRP || null,
        GLTRP: body.GLTRP || null,
        GMNGA: body.GMNGA || null,
        WEMNG: body.WEMNG || null,
        RMNGA: body.RMNGA || null,
      };
      const afkoCols = AFKO_COLUMNS.filter((c) => afkoRecord[c] !== undefined && afkoRecord[c] !== null);
      const afkoVals = afkoCols.map((c) => afkoRecord[c]);
      const afkoPlaceholders = afkoCols.map(() => '?').join(', ');
      db.prepare(`INSERT INTO AFKO (${afkoCols.join(', ')}) VALUES (${afkoPlaceholders})`).run(...afkoVals);

      // If QMNUM provided → update QMEL.QMST to INEX
      if (body.QMNUM) {
        db.prepare(`UPDATE QMEL SET QMST = 'INEX' WHERE QMNUM = ?`).run(body.QMNUM);
      }
    });

    insertTransaction();

    const created = selectOneWithJoins(aufnr);
    return res.status(201).json({ d: created });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── PUT /AUFKSet(':AUFNR') ──────────────────────────────────────────────────
function update(req, res) {
  try {
    const id = req.params.AUFNR;
    const existing = db.prepare(`SELECT * FROM AUFK WHERE AUFNR = ?`).get(id);
    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Ordem de manutenção não encontrada' } },
      });
    }

    const body = req.body;

    // Validate AUART if provided
    if (body.AUART && !VALID_AUART.includes(body.AUART)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `AUART inválido: '${body.AUART}'. Valores permitidos: ${VALID_AUART.join(', ')}` } },
      });
    }

    // Validate PRIOK if provided
    if (body.PRIOK && !VALID_PRIOK.includes(body.PRIOK)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `PRIOK inválido: '${body.PRIOK}'. Valores permitidos: ${VALID_PRIOK.join(', ')}` } },
      });
    }

    // Validate AUFST transition if changing
    if (body.AUFST && body.AUFST !== existing.AUFST) {
      const statusErr = validateStatusTransition(existing.AUFST, body.AUFST);
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

    // Validate date range
    if (body.GSTRP && body.GLTRP && body.GSTRP > body.GLTRP) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `Data de início (GSTRP: ${body.GSTRP}) não pode ser posterior à data de término (GLTRP: ${body.GLTRP})` } },
      });
    }

    const updateTransaction = db.transaction(() => {
      // Update AUFK
      const aufkSetCols = AUFK_COLUMNS.filter((c) => c !== 'AUFNR');
      const aufkSetClause = aufkSetCols.map((c) => `${c} = ?`).join(', ');
      const aufkVals = aufkSetCols.map((c) => body[c] !== undefined ? body[c] : null);
      db.prepare(`UPDATE AUFK SET ${aufkSetClause} WHERE AUFNR = ?`).run(...aufkVals, id);

      // Update AFKO
      const afkoSetCols = AFKO_COLUMNS.filter((c) => c !== 'AUFNR');
      const afkoSetClause = afkoSetCols.map((c) => `${c} = ?`).join(', ');
      const afkoVals = afkoSetCols.map((c) => body[c] !== undefined ? body[c] : null);
      db.prepare(`UPDATE AFKO SET ${afkoSetClause} WHERE AUFNR = ?`).run(...afkoVals, id);
    });

    updateTransaction();

    const updated = selectOneWithJoins(id);
    return res.status(200).json({ d: updated });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── PATCH /AUFKSet(':AUFNR') ────────────────────────────────────────────────
function patch(req, res) {
  try {
    const id = req.params.AUFNR;
    const existing = db.prepare(`SELECT * FROM AUFK WHERE AUFNR = ?`).get(id);
    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Ordem de manutenção não encontrada' } },
      });
    }

    const body = req.body;

    // Validate AUART if provided
    if (body.AUART && !VALID_AUART.includes(body.AUART)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `AUART inválido: '${body.AUART}'. Valores permitidos: ${VALID_AUART.join(', ')}` } },
      });
    }

    // Validate PRIOK if provided
    if (body.PRIOK && !VALID_PRIOK.includes(body.PRIOK)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `PRIOK inválido: '${body.PRIOK}'. Valores permitidos: ${VALID_PRIOK.join(', ')}` } },
      });
    }

    // Validate AUFST transition if changing
    if (body.AUFST && body.AUFST !== existing.AUFST) {
      const statusErr = validateStatusTransition(existing.AUFST, body.AUFST);
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

    // Validate date range if both provided
    const gstrp = body.GSTRP !== undefined ? body.GSTRP : existing.GSTRP;
    const gltrp = body.GLTRP !== undefined ? body.GLTRP : existing.GLTRP;
    if (gstrp && gltrp && gstrp > gltrp) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `Data de início (GSTRP: ${gstrp}) não pode ser posterior à data de término (GLTRP: ${gltrp})` } },
      });
    }

    const patchTransaction = db.transaction(() => {
      // Patch AUFK — only provided fields
      const aufkFields = AUFK_COLUMNS.filter((c) => c !== 'AUFNR' && body[c] !== undefined);
      if (aufkFields.length > 0) {
        const aufkSetClause = aufkFields.map((c) => `${c} = ?`).join(', ');
        const aufkVals = aufkFields.map((c) => body[c]);
        db.prepare(`UPDATE AUFK SET ${aufkSetClause} WHERE AUFNR = ?`).run(...aufkVals, id);
      }

      // Patch AFKO — only provided fields
      const afkoFields = AFKO_COLUMNS.filter((c) => c !== 'AUFNR' && body[c] !== undefined);
      if (afkoFields.length > 0) {
        const afkoSetClause = afkoFields.map((c) => `${c} = ?`).join(', ');
        const afkoVals = afkoFields.map((c) => body[c]);
        db.prepare(`UPDATE AFKO SET ${afkoSetClause} WHERE AUFNR = ?`).run(...afkoVals, id);
      }
    });

    patchTransaction();

    const updated = selectOneWithJoins(id);
    return res.status(200).json({ d: updated });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── DELETE /AUFKSet(':AUFNR') ───────────────────────────────────────────────
function remove(req, res) {
  try {
    const id = req.params.AUFNR;
    const existing = db.prepare(`SELECT * FROM AUFK WHERE AUFNR = ?`).get(id);
    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Ordem de manutenção não encontrada' } },
      });
    }

    // Atomic delete: AFKO first (FK child), then AUFK
    const deleteTransaction = db.transaction(() => {
      db.prepare(`DELETE FROM AFKO WHERE AUFNR = ?`).run(id);
      db.prepare(`DELETE FROM AUFK WHERE AUFNR = ?`).run(id);
    });

    deleteTransaction();
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

module.exports = { getAll, getById, create, update, patch, remove };
