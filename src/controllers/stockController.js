// src/controllers/stockController.js
import { fetchItemStock } from "../services/stockService.js";

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

// JS Date -> "DD-MON-RR"
function toOracleDateFromJs(date) {
  const d = String(date.getDate()).padStart(2, "0");
  const m = MONTHS[date.getMonth()];
  const y = date.getFullYear().toString().slice(-2);
  return `${d}-${m}-${y}`;
}

// "DD-MM-YYYY" -> "DD-MON-RR"
function toOracleFromDdMmYyyy(str) {
  const parts = str.split("-");
  if (parts.length !== 3) return str;
  const [dd, mm, yyyy] = parts;
  const day = dd.padStart(2, "0");
  const monthIndex = Number(mm) - 1;
  const mon = MONTHS[monthIndex] || "JAN";
  const yy = yyyy.slice(-2);
  return `${day}-${mon}-${yy}`;
}

export async function getStock(req, res) {
  try {
    let { fromDate, toDate, page, pageSize } = req.query;

    // 🔢 pagination defaults
    const safePage = Number(page) > 0 ? Number(page) : 1;
    const safeSize = Number(pageSize) > 0 ? Number(pageSize) : 50;

    // 👉 Optional: Date-range guard (too big range slow hoga)
    //  e.g. maximum 31 days allowed – agar chahiye to uncomment:
    //
    // if (fromDate && toDate) {
    //   const [fd, fm, fy] = fromDate.split("-"); // DD-MON-RR ya DD-MM-YYYY
    //   const [td, tm, ty] = toDate.split("-");
    //   // Yahan aap properly JS Date convert karke range validate kar sakte ho
    // }

    // 🗓 Date handling (same logic as before)
    if (!fromDate || !toDate) {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      fromDate = toOracleDateFromJs(first);
      toDate = toOracleDateFromJs(now);
    } else {
      if (/^\d{2}-\d{2}-\d{4}$/.test(fromDate)) {
        fromDate = toOracleFromDdMmYyyy(fromDate);
      }
      if (/^\d{2}-\d{2}-\d{4}$/.test(toDate)) {
        toDate = toOracleFromDdMmYyyy(toDate);
      }
    }

    // 🔹 1) Get full rows for this date window (with cache)
    const rows = await fetchItemStock(fromDate, toDate);
    const total = rows.length;

    // 🔹 2) Node-side pagination (50-50)
    const startIndex = (safePage - 1) * safeSize;
    const endIndex = Math.min(startIndex + safeSize, total);
    const pagedRows = rows.slice(startIndex, endIndex);

    res.json({
      success: true,
      fromDate,
      toDate,
      page: safePage,
      pageSize: safeSize,
      total,
      data: pagedRows,
    });
  } catch (err) {
    console.error("getStock error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch item stock from Oracle",
    });
  }
}
