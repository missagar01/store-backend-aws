// src/services/po.service.js
import { getConnection } from "../config/db.js";
import oracledb from "oracledb";

/**
 * 🔹 PENDING PO – full list (no backend pagination)
 */
export async function getPoPending() {
  const conn = await getConnection();
  try {
    const sql = `
      SELECT
        t.duedate + INTERVAL '20' HOUR AS planned_timestamp,
        t.vrno,
        t.vrdate,
        lhs_utility.get_name('acc_code', t.acc_code) AS vendor_name,
        t.item_name,
        t.qtyorder,
        t.um,
        t.qtyexecute,
        (t.qtyorder - t.qtyexecute) AS balance_qty
      FROM view_order_engine t
      WHERE t.entity_code = 'SR'
        AND t.series = 'U3'
        AND t.qtycancelled IS NULL
        AND (t.qtyorder - t.qtyexecute) > 0
        AND t.vrdate >= '01-apr-2025'
      ORDER BY t.vrdate DESC, t.vrno DESC
    `;

    const result = await conn.execute(sql, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    const rows = result.rows || [];
    return {
      rows,
      total: rows.length,
    };
  } finally {
    await conn.close();
  }
}

/**
 * 🔹 HISTORY PO – full list (no backend pagination)
 */
export async function getPoHistory() {
  const conn = await getConnection();
  try {
    const sql = `
      SELECT
        t.duedate + INTERVAL '20' HOUR AS planned_timestamp,
        t.vrno,
        t.vrdate,
        lhs_utility.get_name('acc_code', t.acc_code) AS vendor_name,
        t.item_name,
        t.qtyorder,
        t.um,
        t.qtyexecute
      FROM view_order_engine t
      WHERE t.entity_code = 'SR'
        AND t.series = 'U3'
        AND t.qtycancelled IS NULL
        AND t.vrdate >= '01-apr-2025'
        AND (
          (t.qtyorder - t.qtyexecute) = 0
          OR (t.qtyorder - t.qtyexecute) > t.qtyorder
        )
      ORDER BY t.vrdate DESC, t.vrno DESC
    `;

    const result = await conn.execute(sql, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    const rows = result.rows || [];
    return {
      rows,
      total: rows.length,
    };
  } finally {
    await conn.close();
  }
}
