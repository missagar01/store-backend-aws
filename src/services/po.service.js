// src/services/po.service.js
import { getConnection } from "../config/db.js";
import oracledb from "oracledb";

// 🔹 PENDING – paginated
export async function getPoPending(page = 1, pageSize = 50) {
  const conn = await getConnection();
  try {
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeSize = Number(pageSize) > 0 ? Number(pageSize) : 50;
    const offset = (safePage - 1) * safeSize;

    const sql = `
      SELECT *
      FROM (
        SELECT
          inner_q.*,
          ROW_NUMBER() OVER (ORDER BY inner_q.vrdate DESC, inner_q.vrno DESC) AS rn,
          COUNT(*) OVER () AS TOTAL_COUNT
        FROM (
          SELECT
            t.duedate + INTERVAL '20' HOUR AS planned_timestamp,
            t.vrno, 
            t.vrdate, 
            lhs_utility.get_name('acc_code',t.acc_code) as vendor_name, 
            t.item_name,
            t.qtyorder,
            t.um,
            t.qtyexecute,
            (t.qtyorder - t.qtyexecute) as balance_qty
          FROM view_order_engine t
          WHERE t.entity_code = 'SR'
            AND t.series = 'U3'
            AND t.qtycancelled IS NULL
            AND (t.qtyorder - t.qtyexecute) > 0
            AND t.vrdate >= TRUNC(SYSDATE - 209)
        ) inner_q
      )
      WHERE rn BETWEEN :startRow AND :endRow
    `;

    const result = await conn.execute(
      sql,
      {
        startRow: offset + 1,
        endRow: offset + safeSize,
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const rows = result.rows || [];
    const total =
      rows.length > 0 && rows[0].TOTAL_COUNT != null
        ? Number(rows[0].TOTAL_COUNT)
        : 0;

    return {
      rows,
      total,
      page: safePage,
      pageSize: safeSize,
    };
  } finally {
    await conn.close();
  }
}

// 🔹 HISTORY – paginated
export async function getPoHistory(page = 1, pageSize = 50) {
  const conn = await getConnection();
  try {
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeSize = Number(pageSize) > 0 ? Number(pageSize) : 50;
    const offset = (safePage - 1) * safeSize;

    const sql = `
      SELECT *
      FROM (
        SELECT
          inner_q.*,
          ROW_NUMBER() OVER (ORDER BY inner_q.vrdate DESC, inner_q.vrno DESC) AS rn,
          COUNT(*) OVER () AS TOTAL_COUNT
        FROM (
          SELECT
            t.duedate + INTERVAL '20' HOUR AS planned_timestamp,
            t.vrno, 
            t.vrdate, 
            lhs_utility.get_name('acc_code',t.acc_code) as vendor_name, 
            t.item_name,
            t.qtyorder,
            t.um,
            t.qtyexecute
          FROM view_order_engine t
          WHERE t.entity_code = 'SR'
            AND t.series = 'U3'
            AND t.qtycancelled IS NULL
            AND t.vrdate >= TRUNC(SYSDATE - 209)
            AND ((t.qtyorder - t.qtyexecute) = 0 OR (t.qtyorder - t.qtyexecute) > t.qtyorder)
        ) inner_q
      )
      WHERE rn BETWEEN :startRow AND :endRow
    `;

    const result = await conn.execute(
      sql,
      {
        startRow: offset + 1,
        endRow: offset + safeSize,
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const rows = result.rows || [];
    const total =
      rows.length > 0 && rows[0].TOTAL_COUNT != null
        ? Number(rows[0].TOTAL_COUNT)
        : 0;

    return {
      rows,
      total,
      page: safePage,
      pageSize: safeSize,
    };
  } finally {
    await conn.close();
  }
}
