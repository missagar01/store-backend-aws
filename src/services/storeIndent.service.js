// src/services/storeIndent.service.js
import { getConnection } from "../config/db.js";
import oracledb from "oracledb";

/* ============================
   SIMPLE IN-MEMORY CACHES
   ============================ */

// 🔹 Full-list cache (pending / history)
const pendingCache = { rows: null, expiresAt: 0 };
const historyCache = { rows: null, expiresAt: 0 };

// TTL: 60 second (adjust as needed)
const LIST_TTL_MS = 60 * 1000;

/**
 * 🔹 Invalidate caches (call from controller after approve/create)
 */
export function invalidateIndentCaches() {
  pendingCache.rows = null;
  pendingCache.expiresAt = 0;
  historyCache.rows = null;
  historyCache.expiresAt = 0;
}

/* ============================
   PENDING INDENTS (NO PAGINATION)
   ============================ */

export async function getPending() {
  const now = Date.now();
  if (pendingCache.rows && pendingCache.expiresAt > now) {
    return pendingCache.rows;
  }

  const conn = await getConnection();
  try {
    const baseWhere = `
      t.entity_code = 'SR'
      AND t.po_no IS NULL
      AND t.cancelleddate IS NULL
      AND t.vrdate >= DATE '2025-04-01'
    `;

    const sql = `
      SELECT
        t.lastupdate + INTERVAL '3' DAY AS plannedtimestamp,
        t.vrno AS indent_number,
        t.vrdate AS indent_date,
        t.indent_remark AS indenter_name,
        lhs_utility.get_name('div_code', t.div_code) AS division,
        UPPER(lhs_utility.get_name('dept_code', t.dept_code)) AS department,
        UPPER(t.item_name) AS item_name,
        t.um,
        t.qtyindent AS required_qty,
        t.purpose_remark AS remark,
        UPPER(t.remark) AS specification,
        lhs_utility.get_name('cost_code', t.cost_code) AS cost_project
      FROM view_indent_engine t
      WHERE ${baseWhere}
      ORDER BY t.vrdate ASC, t.vrno ASC
    `;

    const result = await conn.execute(sql, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    const rows = result.rows || [];

    // cache store
    pendingCache.rows = rows;
    pendingCache.expiresAt = now + LIST_TTL_MS;

    return rows;
  } finally {
    await conn.close();
  }
}

/* ============================
   HISTORY INDENTS (NO PAGINATION)
   ============================ */

export async function getHistory() {
  const now = Date.now();
  if (historyCache.rows && historyCache.expiresAt > now) {
    return historyCache.rows;
  }

  const conn = await getConnection();
  try {
    const baseWhere = `
      t.entity_code = 'SR'
      AND t.po_no IS NOT NULL
      AND t.vrdate >= DATE '2025-04-01'
    `;

    const sql = `
      SELECT
        t.lastupdate + INTERVAL '3' DAY AS plannedtimestamp,
        t.vrno AS indent_number,
        t.vrdate AS indent_date,
        t.indent_remark AS indenter_name,
        lhs_utility.get_name('div_code', t.div_code) AS division,
        lhs_utility.get_name('dept_code', t.dept_code) AS department,
        UPPER(t.item_name) AS item_name,
        t.um,
        t.qtyindent AS required_qty,
        t.purpose_remark AS remark,
        UPPER(t.remark) AS specification,
        lhs_utility.get_name('cost_code', t.cost_code) AS cost_project,
        t.po_no,
        t.po_qty,
        t.cancelleddate,
        t.cancelled_remark
      FROM view_indent_engine t
      WHERE ${baseWhere}
      ORDER BY t.vrdate ASC, t.vrno ASC
    `;

    const result = await conn.execute(sql, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    const rows = result.rows || [];

    // cache store
    historyCache.rows = rows;
    historyCache.expiresAt = now + LIST_TTL_MS;

    return rows;
  } finally {
    await conn.close();
  }
}
