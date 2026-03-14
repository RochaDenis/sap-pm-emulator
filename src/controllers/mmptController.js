/**
 * MMPT + PLPO (Plano de Manutenção Preventiva + Roteiro) — CRUD Controller
 * SAP OData conventions for PM_MAINTPLAN_SRV
 *
 * Business Rules:
 *   - WARPL auto-generated: MP-YYYYMMDD-XXXX (sequential)
 *   - ZYKL1 must be: 7, 15, 30, 90, 180 or 365
 *   - ZEINH must be: D (days)
 *   - STRAT must be: ZP1, ZP2 or ZP3
 *   - NPLDA = LPLDA + ZYKL1 days (auto-calculated)
 *   - EQUNR FK → EQUI, TPLNR FK → IFLOT
 *   - POST creates MMPT + PLPO tasks atomically
 *   - DELETE cascades to PLPO
 *   - Response includes EQUI.EQTXT, IFLOT.PLTXT, PLPO tasks array
 */
const { db } = require('../database');

const MMPT_COLUMNS = [
  'WARPL', 'WPTXT', 'IWERK', 'EQUNR', 'TPLNR',
  'ZYKL1', 'ZEINH', 'STRAT', 'NPLDA', 'LPLDA', 'WAPOS',
];

const PLPO_COLUMNS = [
  'PLNTY', 'PLNNR', 'PLNKN', 'WARPL', 'LTXA1',
  'ARBPL', 'VSTEL', 'WERKS', 'VORNR', 'STEUS',
];

const VALID_ZYKL1 = [7, 15, 30, 90, 180, 365];
const VALID_ZEINH = ['D'];
const VALID_STRAT = ['ZP1', 'ZP2', 'ZP3'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Return today as YYYYMMDD string */
function todayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

/** Generate next WARPL: MP-YYYYMMDD-XXXX */
function generateWARPL() {
  const today = todayYYYYMMDD();
  const prefix = `MP-${today}-`;

  const last = db
    .prepare(`SELECT WARPL FROM MMPT WHERE WARPL LIKE ? ORDER BY WARPL DESC LIMIT 1`)
    .get(`${prefix}%`);

  let seq = 1;
  if (last) {
    const parts = last.WARPL.split('-');
    seq = parseInt(parts[parts.length - 1], 10) + 1;
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

/** Calculate NPLDA = LPLDA + ZYKL1 days (both YYYYMMDD strings) */
function calculateNPLDA(lplda, zykl1) {
  if (!lplda || !zykl1) return null;
  const year = parseInt(lplda.substring(0, 4), 10);
  const month = parseInt(lplda.substring(4, 6), 10) - 1;
  const day = parseInt(lplda.substring(6, 8), 10);
  const d = new Date(year, month, day);
  d.setDate(d.getDate() + zykl1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
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

/** Fetch PLPO tasks for a given WARPL */
function getTasksForPlan(warpl) {
  return db.prepare(`SELECT * FROM PLPO WHERE WARPL = ?`).all(warpl);
}

/** Build MMPT row with joined EQUI, IFLOT, and PLPO tasks */
function enrichRow(row) {
  if (!row) return null;
  const tasks = getTasksForPlan(row.WARPL);
  return { ...row, PLPO_TASKS: tasks };
}

/** Single MMPT with joins */
function selectOneWithJoins(warpl) {
  const row = db.prepare(`
    SELECT M.*,
           E.EQTXT AS EQTXT,
           I.PLTXT AS PLTXT
    FROM MMPT M
    LEFT JOIN EQUI E  ON M.EQUNR = E.EQUNR
    LEFT JOIN IFLOT I ON M.TPLNR = I.TPLNR
    WHERE M.WARPL = ?
  `).get(warpl);
  return enrichRow(row);
}

// ─── GET /MMPTSet ─────────────────────────────────────────────────────────────
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
        whereParts = filters.map((f) => `M.${f.col} = ?`);
        params.push(...filters.map((f) => f.val));
      }
    }

    let sql = `
      SELECT M.*,
             E.EQTXT AS EQTXT,
             I.PLTXT AS PLTXT
      FROM MMPT M
      LEFT JOIN EQUI E  ON M.EQUNR = E.EQUNR
      LEFT JOIN IFLOT I ON M.TPLNR = I.TPLNR`;

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
    const enriched = rows.map(enrichRow);
    return res.status(200).json({ d: { results: enriched } });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── GET /MMPTSet(':WARPL') ──────────────────────────────────────────────────
function getById(req, res) {
  try {
    const id = req.params.WARPL;
    const row = selectOneWithJoins(id);
    if (!row) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Plano de manutenção não encontrado' } },
      });
    }
    return res.status(200).json({ d: row });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── POST /MMPTSet ────────────────────────────────────────────────────────────
function create(req, res) {
  try {
    const body = req.body;

    // Validate ZYKL1
    const zykl1 = Number(body.ZYKL1);
    if (!body.ZYKL1 || !VALID_ZYKL1.includes(zykl1)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `ZYKL1 inválido: '${body.ZYKL1}'. Valores permitidos: ${VALID_ZYKL1.join(', ')}` } },
      });
    }

    // Validate ZEINH
    if (!body.ZEINH || !VALID_ZEINH.includes(body.ZEINH)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `ZEINH inválido: '${body.ZEINH}'. Valores permitidos: ${VALID_ZEINH.join(', ')}` } },
      });
    }

    // Validate STRAT
    if (!body.STRAT || !VALID_STRAT.includes(body.STRAT)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `STRAT inválido: '${body.STRAT}'. Valores permitidos: ${VALID_STRAT.join(', ')}` } },
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

    // Auto-generate WARPL
    const warpl = generateWARPL();

    // Auto-calculate NPLDA
    if (body.LPLDA) {
      body.NPLDA = calculateNPLDA(body.LPLDA, zykl1);
    }

    // Atomic insert: MMPT + PLPO tasks
    const insertTransaction = db.transaction(() => {
      // Insert MMPT
      const mmptRecord = { ...body, WARPL: warpl, ZYKL1: zykl1 };
      const mmptCols = MMPT_COLUMNS.filter((c) => mmptRecord[c] !== undefined);
      const mmptVals = mmptCols.map((c) => mmptRecord[c]);
      const mmptPlaceholders = mmptCols.map(() => '?').join(', ');
      db.prepare(`INSERT INTO MMPT (${mmptCols.join(', ')}) VALUES (${mmptPlaceholders})`).run(...mmptVals);

      // Insert PLPO tasks if provided
      if (Array.isArray(body.PLPO_TASKS) && body.PLPO_TASKS.length > 0) {
        for (const task of body.PLPO_TASKS) {
          task.WARPL = warpl;
          const plpoCols = PLPO_COLUMNS.filter((c) => task[c] !== undefined);
          const plpoVals = plpoCols.map((c) => task[c]);
          const plpoPlaceholders = plpoCols.map(() => '?').join(', ');
          db.prepare(`INSERT INTO PLPO (${plpoCols.join(', ')}) VALUES (${plpoPlaceholders})`).run(...plpoVals);
        }
      }
    });

    insertTransaction();

    const created = selectOneWithJoins(warpl);
    return res.status(201).json({ d: created });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── PUT /MMPTSet(':WARPL') ──────────────────────────────────────────────────
function update(req, res) {
  try {
    const id = req.params.WARPL;
    const existing = db.prepare(`SELECT * FROM MMPT WHERE WARPL = ?`).get(id);
    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Plano de manutenção não encontrado' } },
      });
    }

    const body = req.body;

    // Validate ZYKL1 if provided
    if (body.ZYKL1 !== undefined) {
      const zykl1 = Number(body.ZYKL1);
      if (!VALID_ZYKL1.includes(zykl1)) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `ZYKL1 inválido: '${body.ZYKL1}'. Valores permitidos: ${VALID_ZYKL1.join(', ')}` } },
        });
      }
      body.ZYKL1 = zykl1;
    }

    // Validate ZEINH if provided
    if (body.ZEINH !== undefined && !VALID_ZEINH.includes(body.ZEINH)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `ZEINH inválido: '${body.ZEINH}'. Valores permitidos: ${VALID_ZEINH.join(', ')}` } },
      });
    }

    // Validate STRAT if provided
    if (body.STRAT !== undefined && !VALID_STRAT.includes(body.STRAT)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `STRAT inválido: '${body.STRAT}'. Valores permitidos: ${VALID_STRAT.join(', ')}` } },
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

    // Auto-calculate NPLDA
    const lplda = body.LPLDA !== undefined ? body.LPLDA : existing.LPLDA;
    const zykl1 = body.ZYKL1 !== undefined ? Number(body.ZYKL1) : existing.ZYKL1;
    if (lplda && zykl1) {
      body.NPLDA = calculateNPLDA(lplda, zykl1);
    }

    // Update MMPT
    const setCols = MMPT_COLUMNS.filter((c) => c !== 'WARPL');
    const setClause = setCols.map((c) => `${c} = ?`).join(', ');
    const vals = setCols.map((c) => body[c] !== undefined ? body[c] : null);
    db.prepare(`UPDATE MMPT SET ${setClause} WHERE WARPL = ?`).run(...vals, id);

    const updated = selectOneWithJoins(id);
    return res.status(200).json({ d: updated });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── PATCH /MMPTSet(':WARPL') ────────────────────────────────────────────────
function patch(req, res) {
  try {
    const id = req.params.WARPL;
    const existing = db.prepare(`SELECT * FROM MMPT WHERE WARPL = ?`).get(id);
    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Plano de manutenção não encontrado' } },
      });
    }

    const body = req.body;

    // Validate ZYKL1 if provided
    if (body.ZYKL1 !== undefined) {
      const zykl1 = Number(body.ZYKL1);
      if (!VALID_ZYKL1.includes(zykl1)) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `ZYKL1 inválido: '${body.ZYKL1}'. Valores permitidos: ${VALID_ZYKL1.join(', ')}` } },
        });
      }
      body.ZYKL1 = zykl1;
    }

    // Validate ZEINH if provided
    if (body.ZEINH !== undefined && !VALID_ZEINH.includes(body.ZEINH)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `ZEINH inválido: '${body.ZEINH}'. Valores permitidos: ${VALID_ZEINH.join(', ')}` } },
      });
    }

    // Validate STRAT if provided
    if (body.STRAT !== undefined && !VALID_STRAT.includes(body.STRAT)) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: `STRAT inválido: '${body.STRAT}'. Valores permitidos: ${VALID_STRAT.join(', ')}` } },
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

    // Validate TPLNR FK if provided
    if (body.TPLNR !== undefined) {
      const tplnrErr = validateFK('IFLOT', 'TPLNR', body.TPLNR, 'Local de instalação');
      if (tplnrErr) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: tplnrErr } },
        });
      }
    }

    // Auto-recalculate NPLDA if LPLDA or ZYKL1 changed
    const lplda = body.LPLDA !== undefined ? body.LPLDA : existing.LPLDA;
    const zykl1 = body.ZYKL1 !== undefined ? Number(body.ZYKL1) : existing.ZYKL1;
    if (lplda && zykl1 && (body.LPLDA !== undefined || body.ZYKL1 !== undefined)) {
      body.NPLDA = calculateNPLDA(lplda, zykl1);
    }

    // Patch only provided fields
    const fields = MMPT_COLUMNS.filter((c) => c !== 'WARPL' && body[c] !== undefined);
    if (fields.length > 0) {
      const setClause = fields.map((c) => `${c} = ?`).join(', ');
      const vals = fields.map((c) => body[c]);
      db.prepare(`UPDATE MMPT SET ${setClause} WHERE WARPL = ?`).run(...vals, id);
    }

    const updated = selectOneWithJoins(id);
    return res.status(200).json({ d: updated });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── DELETE /MMPTSet(':WARPL') ───────────────────────────────────────────────
function remove(req, res) {
  try {
    const id = req.params.WARPL;
    const existing = db.prepare(`SELECT * FROM MMPT WHERE WARPL = ?`).get(id);
    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Plano de manutenção não encontrado' } },
      });
    }

    // Atomic delete: PLPO first (FK child), then MMPT
    const deleteTransaction = db.transaction(() => {
      db.prepare(`DELETE FROM PLPO WHERE WARPL = ?`).run(id);
      db.prepare(`DELETE FROM MMPT WHERE WARPL = ?`).run(id);
    });

    deleteTransaction();
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ─── PLPO direct endpoints ──────────────────────────────────────────────────

/** GET /PLPOSet?$filter=WARPL eq 'X' */
function getPlpoByPlan(req, res) {
  try {
    let warpl = null;

    if (req.query.$filter) {
      const match = req.query.$filter.match(/WARPL\s+eq\s+'([^']*)'/i);
      if (match) warpl = match[1];
    }

    if (!warpl) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: 'Filtro WARPL é obrigatório. Uso: $filter=WARPL eq \'X\'' } },
      });
    }

    const rows = db.prepare(`SELECT * FROM PLPO WHERE WARPL = ?`).all(warpl);
    return res.status(200).json({ d: { results: rows } });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

/** POST /PLPOSet — add task to plan */
function createPlpo(req, res) {
  try {
    const body = req.body;

    if (!body.WARPL) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: 'WARPL é obrigatório' } },
      });
    }

    // Validate WARPL FK
    const warplErr = validateFK('MMPT', 'WARPL', body.WARPL, 'Plano de manutenção');
    if (warplErr) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: warplErr } },
      });
    }

    if (!body.PLNTY || !body.PLNNR || !body.PLNKN) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: { lang: 'pt-BR', value: 'PLNTY, PLNNR e PLNKN são obrigatórios' } },
      });
    }

    const plpoCols = PLPO_COLUMNS.filter((c) => body[c] !== undefined);
    const plpoVals = plpoCols.map((c) => body[c]);
    const placeholders = plpoCols.map(() => '?').join(', ');
    db.prepare(`INSERT INTO PLPO (${plpoCols.join(', ')}) VALUES (${placeholders})`).run(...plpoVals);

    const created = db.prepare(`SELECT * FROM PLPO WHERE PLNTY = ? AND PLNNR = ? AND PLNKN = ?`)
      .get(body.PLNTY, body.PLNNR, body.PLNKN);
    return res.status(201).json({ d: created });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

/** DELETE /PLPOSet(':PLNNR') — remove task */
function removePlpo(req, res) {
  try {
    const plnnr = req.params.PLNNR;
    const existing = db.prepare(`SELECT * FROM PLPO WHERE PLNNR = ?`).get(plnnr);
    if (!existing) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Tarefa não encontrada' } },
      });
    }

    db.prepare(`DELETE FROM PLPO WHERE PLNNR = ?`).run(plnnr);
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

module.exports = {
  getAll, getById, create, update, patch, remove,
  getPlpoByPlan, createPlpo, removePlpo,
};
