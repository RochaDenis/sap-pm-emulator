/**
 * Analytics Controller — Read-Only Analytical Queries
 * SAP OData conventions for PM_ANALYTICS_SRV
 * Used by AxionGO AI agent
 */
const { db } = require('../database');

// ─── Helper: parse YYYYMMDD string to Date ───────────────────────────────────
function parseSapDate(str) {
  if (!str || str.length !== 8) return null;
  const y = parseInt(str.substring(0, 4));
  const m = parseInt(str.substring(4, 6)) - 1;
  const d = parseInt(str.substring(6, 8));
  return new Date(y, m, d);
}

// ─── Helper: today as YYYYMMDD ───────────────────────────────────────────────
function todaySap() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

// ─── Helper: diff in days between two YYYYMMDD strings ───────────────────────
function diffDays(a, b) {
  const da = parseSapDate(a);
  const db2 = parseSapDate(b);
  if (!da || !db2) return 0;
  return Math.round((db2 - da) / (1000 * 60 * 60 * 24));
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /EquipmentHistory(':EQUNR')
//  Full maintenance history for one equipment
// ═══════════════════════════════════════════════════════════════════════════════
function getEquipmentHistory(req, res) {
  try {
    const EQUNR = req.params.EQUNR;

    // Verify equipment exists
    const equip = db.prepare('SELECT * FROM EQUI WHERE EQUNR = ?').get(EQUNR);
    if (!equip) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Equipamento não encontrado' } },
      });
    }

    // All QMEL (Notas) linked to EQUNR
    const notifications = db.prepare(
      'SELECT * FROM QMEL WHERE EQUNR = ?'
    ).all(EQUNR);

    // All AUFK (Ordens) linked to EQUNR
    const orders = db.prepare(
      'SELECT * FROM AUFK WHERE EQUNR = ?'
    ).all(EQUNR);

    // All MSEG (Movimentações) via AUFK
    const orderNrs = orders.map(o => o.AUFNR);
    let movements = [];
    if (orderNrs.length > 0) {
      const placeholders = orderNrs.map(() => '?').join(',');
      movements = db.prepare(
        `SELECT * FROM MSEG WHERE AUFNR IN (${placeholders})`
      ).all(...orderNrs);
    }

    // All IMPTT readings
    const readings = db.prepare(
      'SELECT * FROM IMPTT WHERE EQUNR = ?'
    ).all(EQUNR);

    // Total cost (sum MSEG.MENGE by order)
    let totalCost = 0;
    if (orderNrs.length > 0) {
      const placeholders = orderNrs.map(() => '?').join(',');
      const costRow = db.prepare(
        `SELECT COALESCE(SUM(MENGE), 0) AS total FROM MSEG WHERE AUFNR IN (${placeholders})`
      ).get(...orderNrs);
      totalCost = costRow ? costRow.total : 0;
    }

    return res.status(200).json({
      d: {
        EQUNR: equip.EQUNR,
        EQTXT: equip.EQTXT,
        EQTXT_DESC: 'Descrição do Equipamento',
        notifications: { results: notifications, _desc: 'Notas de Manutenção (QMEL)' },
        orders: { results: orders, _desc: 'Ordens de Manutenção (AUFK)' },
        movements: { results: movements, _desc: 'Movimentações de Material (MSEG)' },
        readings: { results: readings, _desc: 'Leituras de Medição (IMPTT)' },
        total_cost: totalCost,
        total_cost_desc: 'Custo total (soma MSEG.MENGE por ordem)',
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /OpenNotifications
//  All QMEL where QMST = 'ABER', grouped by PRIOK
// ═══════════════════════════════════════════════════════════════════════════════
function getOpenNotifications(req, res) {
  try {
    const rows = db.prepare(`
      SELECT Q.*, E.EQTXT, I.PLTXT
      FROM QMEL Q
      LEFT JOIN EQUI E ON Q.EQUNR = E.EQUNR
      LEFT JOIN IFLOT I ON Q.TPLNR = I.TPLNR
      WHERE Q.QMST = 'ABER'
      ORDER BY Q.PRIOK ASC
    `).all();

    // Group by PRIOK
    const grouped = {};
    for (const row of rows) {
      const key = row.PRIOK || 'SEM_PRIORIDADE';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(row);
    }

    const results = Object.keys(grouped).sort().map(priok => ({
      PRIOK: priok,
      PRIOK_DESC: `Prioridade ${priok}`,
      count: grouped[priok].length,
      notifications: grouped[priok],
    }));

    return res.status(200).json({
      d: {
        results,
        _desc: 'Notificações Abertas agrupadas por Prioridade',
        total_open: rows.length,
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /OrderBacklog
//  All AUFK where AUFST in ('CRTD','REL') sorted by PRIOK ASC, ERDAT ASC
// ═══════════════════════════════════════════════════════════════════════════════
function getOrderBacklog(req, res) {
  try {
    const rows = db.prepare(`
      SELECT A.*, E.EQTXT,
             (SELECT Q.QMTXT FROM AFKO AF
              INNER JOIN QMEL Q ON AF.QMNUM = Q.QMNUM
              WHERE AF.AUFNR = A.AUFNR LIMIT 1) AS QMTXT
      FROM AUFK A
      LEFT JOIN EQUI E ON A.EQUNR = E.EQUNR
      WHERE A.AUFST IN ('CRTD','REL')
      ORDER BY A.PRIOK ASC, A.ERDAT ASC
    `).all();

    return res.status(200).json({
      d: {
        results: rows,
        _desc: 'Backlog de Ordens de Manutenção (CRTD/REL)',
        total_backlog: rows.length,
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /EquipmentMTBF(':EQUNR')
//  Mean Time Between Failures
// ═══════════════════════════════════════════════════════════════════════════════
function getEquipmentMTBF(req, res) {
  try {
    const EQUNR = req.params.EQUNR;

    const equip = db.prepare('SELECT * FROM EQUI WHERE EQUNR = ?').get(EQUNR);
    if (!equip) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Equipamento não encontrado' } },
      });
    }

    // M1 type notifications = failures
    const failures = db.prepare(
      `SELECT ERDAT FROM QMEL WHERE EQUNR = ? AND QMART = 'M1' ORDER BY ERDAT ASC`
    ).all(EQUNR);

    const total_failures = failures.length;
    let first_failure = null;
    let last_failure = null;
    let MTBF_days = 0;

    if (total_failures > 0) {
      first_failure = failures[0].ERDAT;
      last_failure = failures[total_failures - 1].ERDAT;

      if (total_failures > 1) {
        const totalPeriod = diffDays(first_failure, last_failure);
        MTBF_days = Math.round(totalPeriod / (total_failures - 1));
      }
    }

    return res.status(200).json({
      d: {
        EQUNR: equip.EQUNR,
        EQTXT: equip.EQTXT,
        EQTXT_DESC: 'Descrição do Equipamento',
        total_failures,
        total_failures_desc: 'Total de falhas (Notificações M1)',
        first_failure,
        first_failure_desc: 'Data da primeira falha',
        last_failure,
        last_failure_desc: 'Data da última falha',
        MTBF_days,
        MTBF_days_desc: 'Tempo Médio Entre Falhas (dias)',
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /EquipmentMTTR(':EQUNR')
//  Mean Time To Repair
// ═══════════════════════════════════════════════════════════════════════════════
function getEquipmentMTTR(req, res) {
  try {
    const EQUNR = req.params.EQUNR;

    const equip = db.prepare('SELECT * FROM EQUI WHERE EQUNR = ?').get(EQUNR);
    if (!equip) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: { lang: 'pt-BR', value: 'Equipamento não encontrado' } },
      });
    }

    // Completed notifications — ERDAT as open, LTRMN as close (proxy for repair time)
    const repairs = db.prepare(
      `SELECT ERDAT, LTRMN FROM QMEL WHERE EQUNR = ? AND QMST = 'CONC' AND ERDAT IS NOT NULL AND LTRMN IS NOT NULL`
    ).all(EQUNR);

    const total_repairs = repairs.length;
    let avg_repair_days = 0;
    let MTTR_days = 0;

    if (total_repairs > 0) {
      let totalDays = 0;
      for (const r of repairs) {
        const days = diffDays(r.ERDAT, r.LTRMN);
        totalDays += Math.abs(days);
      }
      avg_repair_days = Math.round((totalDays / total_repairs) * 100) / 100;
      MTTR_days = avg_repair_days;
    }

    return res.status(200).json({
      d: {
        EQUNR: equip.EQUNR,
        EQTXT: equip.EQTXT,
        EQTXT_DESC: 'Descrição do Equipamento',
        total_repairs,
        total_repairs_desc: 'Total de reparos concluídos',
        avg_repair_days,
        avg_repair_days_desc: 'Média de dias por reparo',
        MTTR_days,
        MTTR_days_desc: 'Tempo Médio de Reparo (dias)',
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /CriticalEquipment
//  Top 10 equipment ranked by failures, open orders, total cost
// ═══════════════════════════════════════════════════════════════════════════════
function getCriticalEquipment(req, res) {
  try {
    // Get all equipment
    const equipment = db.prepare('SELECT EQUNR, EQTXT FROM EQUI').all();

    const metrics = equipment.map(eq => {
      // Count M1 failures
      const failRow = db.prepare(
        `SELECT COUNT(*) AS cnt FROM QMEL WHERE EQUNR = ? AND QMART = 'M1'`
      ).get(eq.EQUNR);

      // Count open orders
      const openRow = db.prepare(
        `SELECT COUNT(*) AS cnt FROM AUFK WHERE EQUNR = ? AND AUFST IN ('CRTD','REL')`
      ).get(eq.EQUNR);

      // Total cost
      const costRow = db.prepare(
        `SELECT COALESCE(SUM(M.MENGE), 0) AS total
         FROM MSEG M
         INNER JOIN AUFK A ON M.AUFNR = A.AUFNR
         WHERE A.EQUNR = ?`
      ).get(eq.EQUNR);

      return {
        EQUNR: eq.EQUNR,
        EQTXT: eq.EQTXT,
        EQTXT_DESC: 'Descrição do Equipamento',
        total_failures: failRow.cnt,
        total_failures_desc: 'Total de falhas (M1)',
        open_orders: openRow.cnt,
        open_orders_desc: 'Ordens abertas (CRTD/REL)',
        total_cost: costRow.total,
        total_cost_desc: 'Custo total (soma MSEG.MENGE)',
        criticality_score: failRow.cnt * 3 + openRow.cnt * 2 + costRow.total * 0.01,
      };
    });

    // Sort by criticality_score DESC, take top 10
    metrics.sort((a, b) => b.criticality_score - a.criticality_score);
    const top10 = metrics.slice(0, 10).map((m, idx) => ({
      rank: idx + 1,
      rank_desc: 'Posição no ranking',
      ...m,
    }));

    return res.status(200).json({
      d: {
        results: top10,
        _desc: 'Top 10 Equipamentos Críticos',
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /MaintenanceCostByEquipment
//  Cost summary per equipment
// ═══════════════════════════════════════════════════════════════════════════════
function getMaintenanceCostByEquipment(req, res) {
  try {
    const equipment = db.prepare('SELECT EQUNR, EQTXT FROM EQUI').all();

    const results = [];
    for (const eq of equipment) {
      // Total MSEG movements value
      const costRow = db.prepare(
        `SELECT COALESCE(SUM(M.MENGE), 0) AS total_cost, COUNT(M.MBLNR) AS movement_count
         FROM MSEG M
         INNER JOIN AUFK A ON M.AUFNR = A.AUFNR
         WHERE A.EQUNR = ?`
      ).get(eq.EQUNR);

      // Count orders by type
      const orderTypes = db.prepare(
        `SELECT AUART, COUNT(*) AS cnt FROM AUFK WHERE EQUNR = ? GROUP BY AUART`
      ).all(eq.EQUNR);

      const ordersByType = {};
      for (const ot of orderTypes) {
        ordersByType[ot.AUART] = ot.cnt;
      }

      // Last maintenance date
      const lastDate = db.prepare(
        `SELECT MAX(ERDAT) AS last_date FROM AUFK WHERE EQUNR = ?`
      ).get(eq.EQUNR);

      if (costRow.total_cost > 0 || Object.keys(ordersByType).length > 0) {
        results.push({
          EQUNR: eq.EQUNR,
          EQTXT: eq.EQTXT,
          EQTXT_DESC: 'Descrição do Equipamento',
          total_cost: costRow.total_cost,
          total_cost_desc: 'Custo total de movimentações (MSEG)',
          movement_count: costRow.movement_count,
          movement_count_desc: 'Quantidade de movimentações',
          orders_PM01: ordersByType['PM01'] || 0,
          orders_PM01_desc: 'Ordens Corretivas (PM01)',
          orders_PM02: ordersByType['PM02'] || 0,
          orders_PM02_desc: 'Ordens Preventivas (PM02)',
          orders_PM03: ordersByType['PM03'] || 0,
          orders_PM03_desc: 'Ordens Preditivas (PM03)',
          last_maintenance_date: lastDate ? lastDate.last_date : null,
          last_maintenance_date_desc: 'Data da última manutenção',
        });
      }
    }

    return res.status(200).json({
      d: {
        results,
        _desc: 'Custo de Manutenção por Equipamento',
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GET /PreventiveCompliance
//  Maintenance plan compliance with overdue tracking
// ═══════════════════════════════════════════════════════════════════════════════
function getPreventiveCompliance(req, res) {
  try {
    const today = todaySap();

    const plans = db.prepare(`
      SELECT M.WARPL, M.WPTXT, M.EQUNR, M.NPLDA,
             E.EQTXT
      FROM MMPT M
      LEFT JOIN EQUI E ON M.EQUNR = E.EQUNR
      ORDER BY M.NPLDA ASC
    `).all();

    const results = plans.map(plan => {
      const daysOverdue = diffDays(plan.NPLDA, today);
      let status;
      if (daysOverdue <= 0) {
        status = 'ON_TIME';
      } else if (daysOverdue > 30) {
        status = 'CRITICAL';
      } else {
        status = 'OVERDUE';
      }

      return {
        WARPL: plan.WARPL,
        WARPL_DESC: 'Plano de Manutenção',
        WPTXT: plan.WPTXT,
        WPTXT_DESC: 'Descrição do Plano',
        EQUNR: plan.EQUNR,
        EQTXT: plan.EQTXT,
        EQTXT_DESC: 'Descrição do Equipamento',
        NPLDA: plan.NPLDA,
        NPLDA_DESC: 'Próxima Data Planejada',
        days_overdue: daysOverdue > 0 ? daysOverdue : 0,
        days_overdue_desc: 'Dias em atraso',
        status,
        status_desc: 'Situação: ON_TIME / OVERDUE / CRITICAL (>30 dias)',
      };
    });

    return res.status(200).json({
      d: {
        results,
        _desc: 'Conformidade de Manutenção Preventiva (MMPT)',
      },
    });
  } catch (err) {
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: { lang: 'pt-BR', value: err.message } },
    });
  }
}

module.exports = {
  getEquipmentHistory,
  getOpenNotifications,
  getOrderBacklog,
  getEquipmentMTBF,
  getEquipmentMTTR,
  getCriticalEquipment,
  getMaintenanceCostByEquipment,
  getPreventiveCompliance,
};
