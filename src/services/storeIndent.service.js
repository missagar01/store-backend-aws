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
const DASHBOARD_TTL_MS = 60 * 1000;
const dashboardCache = { value: null, expiresAt: 0 };

const DASHBOARD_FROM_DATE = "DATE '2025-04-01'";
const DASHBOARD_INDENT_WHERE = `
      t.entity_code = 'SR'
      AND t.vrdate >= ${DASHBOARD_FROM_DATE}
    `;
const DASHBOARD_PURCHASE_WHERE = `
      t.entity_code = 'SR'
      AND t.series = 'U3'
      AND t.qtycancelled IS NULL
      AND t.vrdate >= ${DASHBOARD_FROM_DATE}
      AND (
        (t.qtyorder - t.qtyexecute) = 0
        OR (t.qtyorder - t.qtyexecute) > t.qtyorder
      )
    `;
const DASHBOARD_ISSUE_WHERE = `
      t.entity_code = 'SR'
      AND t.vrdate >= ${DASHBOARD_FROM_DATE}
    `;
const DASHBOARD_STOCK_WHERE = `
      t.entity_code = 'SR'
      AND NVL(t.yrclqty_engine, 0) <= 0
      AND NVL(t.yropaqty, 0) > 0
      AND t.item_nature IN ('SI')
    `;

function toNumber(field) {
  const num = Number(field ?? 0);
  return Number.isFinite(num) ? num : 0;
}

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

export async function getDashboardMetrics() {
  const now = Date.now();
  if (dashboardCache.value && dashboardCache.expiresAt > now) {
    return dashboardCache.value;
  }

  const conn = await getConnection();
  try {
    const indentSummary = await conn.execute(
      `
      SELECT
        COUNT(*) AS total_indents,
        NVL(SUM(NVL(t.qtyindent, 0)), 0) AS total_indented_qty
      FROM view_indent_engine t
      WHERE ${DASHBOARD_INDENT_WHERE}
    `,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const purchaseSummary = await conn.execute(
      `
      SELECT
        COUNT(*) AS total_purchase_orders,
        NVL(SUM(NVL(t.qtyorder, 0)), 0) AS total_purchased_qty
      FROM view_order_engine t
      WHERE ${DASHBOARD_PURCHASE_WHERE}
    `,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    let issuedTotal = 0;
    try {
      const issuedResult = await conn.execute(
        `
        SELECT
          NVL(SUM(NVL(t.qtyissue, 0)), 0) AS total_issued_qty
        FROM view_issue_engine t
        WHERE ${DASHBOARD_ISSUE_WHERE}
      `,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      issuedTotal = toNumber(issuedResult.rows?.[0]?.TOTAL_ISSUED_QTY);
    } catch (err) {
      console.warn("[getDashboardMetrics] issue summary failed:", err.message || err);
    }

    let outOfStockCount = 0;
    try {
      const stockResult = await conn.execute(
        `
        SELECT
          COUNT(*) AS out_of_stock_count
        FROM view_item_stock_engine t
        WHERE ${DASHBOARD_STOCK_WHERE}
      `,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      outOfStockCount = toNumber(stockResult.rows?.[0]?.OUT_OF_STOCK_COUNT);
    } catch (err) {
      console.warn("[getDashboardMetrics] stock summary failed:", err.message || err);
    }

    const topItemsResult = await conn.execute(
      `
      SELECT *
      FROM (
        SELECT
          UPPER(t.item_name) AS item_name,
          COUNT(*) AS order_count,
          NVL(SUM(NVL(t.qtyorder, 0)), 0) AS total_order_qty
        FROM view_order_engine t
        WHERE ${DASHBOARD_PURCHASE_WHERE}
        GROUP BY UPPER(t.item_name)
        ORDER BY total_order_qty DESC
      )
      WHERE ROWNUM <= 10
    `,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const topVendorsResult = await conn.execute(
      `
      SELECT *
      FROM (
        SELECT
          lhs_utility.get_name('acc_code', t.acc_code) AS vendor_name,
      COUNT(DISTINCT t.vrno) AS unique_po_count,
          NVL(SUM(NVL(t.qtyorder, 0)), 0) AS total_items
        FROM view_order_engine t
        WHERE ${DASHBOARD_PURCHASE_WHERE}
        GROUP BY lhs_utility.get_name('acc_code', t.acc_code)
        ORDER BY unique_po_count DESC, total_items DESC
      )
      WHERE ROWNUM <= 10
    `,
      [],
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const indentRow = indentSummary.rows?.[0] ?? {};
    const purchaseRow = purchaseSummary.rows?.[0] ?? {};

    const metrics = {
      totalIndents: toNumber(indentRow.TOTAL_INDENTS),
      totalIndentedQuantity: toNumber(indentRow.TOTAL_INDENTED_QTY),
      totalPurchaseOrders: toNumber(purchaseRow.TOTAL_PURCHASE_ORDERS),
      totalPurchasedQuantity: toNumber(purchaseRow.TOTAL_PURCHASED_QTY),
      totalIssuedQuantity: issuedTotal,
      outOfStockCount,
      topPurchasedItems: (topItemsResult.rows ?? []).map((row) => ({
        itemName: row.ITEM_NAME,
        orderCount: toNumber(row.ORDER_COUNT),
        totalOrderQty: toNumber(row.TOTAL_ORDER_QTY),
      })),
      topVendors: (topVendorsResult.rows ?? []).map((row) => ({
        vendorName: row.VENDOR_NAME,
        uniquePoCount: toNumber(row.UNIQUE_PO_COUNT),
        totalItems: toNumber(row.TOTAL_ITEMS),
      })),
    };

    dashboardCache.value = metrics;
    dashboardCache.expiresAt = now + DASHBOARD_TTL_MS;

    return metrics;
  } finally {
    await conn.close();
  }
}
