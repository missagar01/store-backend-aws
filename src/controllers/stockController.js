// src/controllers/stockController.js
import { fetchItemStock } from "../services/stockService.js";

const MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

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
    let { fromDate, toDate } = req.query;

    if (!fromDate || !toDate) {
      // default: 1st of this month -> today
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      fromDate = toOracleDateFromJs(first);
      toDate = toOracleDateFromJs(now);
    } else {
      // if user sent DD-MM-YYYY, normalize it
      if (/^\d{2}-\d{2}-\d{4}$/.test(fromDate)) {
        fromDate = toOracleFromDdMmYyyy(fromDate);
      }
      if (/^\d{2}-\d{2}-\d{4}$/.test(toDate)) {
        toDate = toOracleFromDdMmYyyy(toDate);
      }
    }

    const rows = await fetchItemStock(fromDate, toDate);

    res.json({
      success: true,
      fromDate,
      toDate,
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("getStock error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to fetch item stock from Oracle",
    });
  }
}
