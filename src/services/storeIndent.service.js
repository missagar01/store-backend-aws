// import { getConnection } from "../config/db.js";
// import oracledb from "oracledb";

// export async function getPending(page = 1, pageSize = 50) {
//   const conn = await getConnection();
//   try {
//     const safePage = Number(page) > 0 ? Number(page) : 1;
//     const safeSize = Number(pageSize) > 0 ? Number(pageSize) : 50;
//     const offset = (safePage - 1) * safeSize;

//     const sql = `
//       SELECT *
//       FROM (
//         SELECT
//           inner_q.*,
//           ROW_NUMBER() OVER (ORDER BY inner_q.indent_date ASC) AS rn,
//           COUNT(*) OVER () AS TOTAL_COUNT
//         FROM (
//           SELECT
//             t.lastupdate + INTERVAL '3' DAY AS plannedtimestamp,
//             t.vrno AS indent_number,
//             t.vrdate AS indent_date,
//             t.indent_remark AS indenter_name,
//             lhs_utility.get_name('div_code', t.div_code) AS division,
//             UPPER(lhs_utility.get_name('dept_code', t.dept_code)) AS department,
//             UPPER(t.item_name) AS item_name,
//             t.um,
//             t.qtyindent AS required_qty,
//             t.purpose_remark AS remark,
//             UPPER(t.remark) AS specification,
//             lhs_utility.get_name('cost_code', t.cost_code) AS cost_project
//           FROM view_indent_engine t
//           WHERE t.entity_code = 'SR'
//             AND t.po_no IS NULL
//             AND t.cancelleddate IS NULL
//             AND t.vrdate >= DATE '2025-04-01'
//         ) inner_q
//       )
//       WHERE rn BETWEEN :startRow AND :endRow
//       ORDER BY rn
//     `;

//     const result = await conn.execute(
//       sql,
//       {
//         startRow: offset + 1,
//         endRow: offset + safeSize,
//       },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );

//     const rows = result.rows || [];
//     const total =
//       rows.length > 0 && rows[0].TOTAL_COUNT != null
//         ? Number(rows[0].TOTAL_COUNT)
//         : 0;

//     return {
//       rows,
//       total,
//       page: safePage,
//       pageSize: safeSize,
//     };
//   } finally {
//     await conn.close();
//   }
// }

// export async function getHistory(page = 1, pageSize = 50) {
//   const conn = await getConnection();
//   try {
//     const safePage = Number(page) > 0 ? Number(page) : 1;
//     const safeSize = Number(pageSize) > 0 ? Number(pageSize) : 50;
//     const offset = (safePage - 1) * safeSize;

//     const sql = `
//       SELECT *
//       FROM (
//         SELECT
//           inner_q.*,
//           ROW_NUMBER() OVER (ORDER BY inner_q.indent_date ASC) AS rn,
//           COUNT(*) OVER () AS TOTAL_COUNT
//         FROM (
//           SELECT
//             t.lastupdate + INTERVAL '3' DAY AS plannedtimestamp,
//             t.vrno AS indent_number,
//             t.vrdate AS indent_date,
//             t.indent_remark AS indenter_name,
//             lhs_utility.get_name('div_code', t.div_code) AS division,
//             lhs_utility.get_name('dept_code', t.dept_code) AS department,
//             UPPER(t.item_name) AS item_name,
//             t.um,
//             t.qtyindent AS required_qty,
//             t.purpose_remark AS remark,
//             UPPER(t.remark) AS specification,
//             lhs_utility.get_name('cost_code', t.cost_code) AS cost_project,
//             t.po_no,
//             t.po_qty,
//             t.cancelleddate,
//             t.cancelled_remark
//           FROM view_indent_engine t
//           WHERE t.entity_code = 'SR'
//             AND t.po_no IS NOT NULL
//             AND t.vrdate >= DATE '2025-04-01'
//         ) inner_q
//       )
//       WHERE rn BETWEEN :startRow AND :endRow
//       ORDER BY rn
//     `;

//     const result = await conn.execute(
//       sql,
//       {
//         startRow: offset + 1,
//         endRow: offset + safeSize,
//       },
//       { outFormat: oracledb.OUT_FORMAT_OBJECT }
//     );

//     const rows = result.rows || [];
//     const total =
//       rows.length > 0 && rows[0].TOTAL_COUNT != null
//         ? Number(rows[0].TOTAL_COUNT)
//         : 0;

//     return {
//       rows,
//       total,
//       page: safePage,
//       pageSize: safeSize,
//     };
//   } finally {
//     await conn.close();
//   }
// }

// src/services/storeIndent.service.js
import { getConnection } from "../config/db.js";
import oracledb from "oracledb";

const DEFAULT_PAGE_SIZE = 50;

// 🔹 helper: sanitize page/pageSize
function normalizePagination(page, pageSize) {
  const safePage = Number(page) > 0 ? Number(page) : 1;
  const safeSize = Number(pageSize) > 0 ? Number(pageSize) : DEFAULT_PAGE_SIZE;
  const offset = (safePage - 1) * safeSize;
  return { safePage, safeSize, offset };
}

/* ============================
   SIMPLE IN-MEMORY CACHES
   ============================ */

// total-count cache (pending / history)
const pendingCountCache = { value: 0, expiresAt: 0 };
const historyCountCache = { value: 0, expiresAt: 0 };

// page-data cache: key = `${page}-${pageSize}`
const pendingPageCache = new Map(); // Map<string, { rows, total, expiresAt }>
const historyPageCache = new Map();

const COUNT_TTL_MS = 60 * 1000; // 60 sec
const PAGE_TTL_MS = 60 * 1000;  // 60 sec

function getPageKey(page, pageSize) {
  return `${page}-${pageSize}`;
}

// 🔹 invalidate caches (call from controller after approve/create)
export function invalidateIndentCaches() {
  pendingCountCache.value = 0;
  pendingCountCache.expiresAt = 0;
  historyCountCache.value = 0;
  historyCountCache.expiresAt = 0;
  pendingPageCache.clear();
  historyPageCache.clear();
}

/**
 * 🔹 getCount with caching
 */
async function getCount(conn, sql, cacheObj) {
  const now = Date.now();

  if (cacheObj.value && cacheObj.expiresAt > now) {
    return cacheObj.value;
  }

  const result = await conn.execute(sql, [], {
    outFormat: oracledb.OUT_FORMAT_ARRAY,
  });

  const total = Number(result.rows?.[0]?.[0] || 0);
  cacheObj.value = total;
  cacheObj.expiresAt = now + COUNT_TTL_MS;

  return total;
}

/* ============================
   PENDING INDENTS
   ============================ */
export async function getPending(page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  const conn = await getConnection();
  try {
    const { safePage, safeSize, offset } = normalizePagination(page, pageSize);
    const cacheKey = getPageKey(safePage, safeSize);
    const now = Date.now();

    // 🔹 1) Try page cache
    const cached = pendingPageCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return {
        rows: cached.rows,
        total: cached.total,
        page: safePage,
        pageSize: safeSize,
      };
    }

    const baseWhere = `
      t.entity_code = 'SR'
      AND t.po_no IS NULL
      AND t.cancelleddate IS NULL
      AND t.vrdate >= DATE '2025-04-01'
    `;

    const countSql = `
      SELECT COUNT(*) AS TOTAL
      FROM view_indent_engine t
      WHERE ${baseWhere}
    `;

    const pageSql = `
      SELECT *
      FROM (
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
          lhs_utility.get_name('cost_code', t.cost_code) AS cost_project,
          ROW_NUMBER() OVER (ORDER BY t.vrdate ASC, t.vrno ASC) AS rn
        FROM view_indent_engine t
        WHERE ${baseWhere}
      )
      WHERE rn BETWEEN :startRow AND :endRow
      ORDER BY rn
    `;

    // ⏱ 2) Fetch total (cached) + page data in parallel
    const [total, pageResult] = await Promise.all([
      getCount(conn, countSql, pendingCountCache),
      conn.execute(
        pageSql,
        {
          startRow: offset + 1,
          endRow: offset + safeSize,
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      ),
    ]);

    const rows = pageResult.rows || [];

    // 🔹 3) Save in page cache
    pendingPageCache.set(cacheKey, {
      rows,
      total,
      expiresAt: now + PAGE_TTL_MS,
    });

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

/* ============================
   HISTORY INDENTS
   ============================ */
export async function getHistory(page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  const conn = await getConnection();
  try {
    const { safePage, safeSize, offset } = normalizePagination(page, pageSize);
    const cacheKey = getPageKey(safePage, safeSize);
    const now = Date.now();

    // 🔹 1) Page cache
    const cached = historyPageCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return {
        rows: cached.rows,
        total: cached.total,
        page: safePage,
        pageSize: safeSize,
      };
    }

    const baseWhere = `
      t.entity_code = 'SR'
      AND t.po_no IS NOT NULL
      AND t.vrdate >= DATE '2025-04-01'
    `;

    const countSql = `
      SELECT COUNT(*) AS TOTAL
      FROM view_indent_engine t
      WHERE ${baseWhere}
    `;

    const pageSql = `
      SELECT *
      FROM (
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
          t.cancelled_remark,
          ROW_NUMBER() OVER (ORDER BY t.vrdate ASC, t.vrno ASC) AS rn
        FROM view_indent_engine t
        WHERE ${baseWhere}
      )
      WHERE rn BETWEEN :startRow AND :endRow
      ORDER BY rn
    `;

    const [total, pageResult] = await Promise.all([
      getCount(conn, countSql, historyCountCache),
      conn.execute(
        pageSql,
        {
          startRow: offset + 1,
          endRow: offset + safeSize,
        },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      ),
    ]);

    const rows = pageResult.rows || [];

    // 🔹 cache
    historyPageCache.set(cacheKey, {
      rows,
      total,
      expiresAt: now + PAGE_TTL_MS,
    });

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
