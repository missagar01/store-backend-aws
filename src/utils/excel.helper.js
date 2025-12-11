import ExcelJS from "exceljs";

const EXCEL_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const DEFAULT_SHEET_NAME = "Report";

function normalizeColumns(columns = []) {
  return columns.map((column) => ({
    width: column.width ?? 20,
    header: column.header,
    key: column.key,
    style: column.style,
  }));
}

export function createWorkbook(rows = [], columns = [], sheetName) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Store Backend";
  const sheet = workbook.addWorksheet(sheetName ?? DEFAULT_SHEET_NAME);
  sheet.columns = normalizeColumns(columns);
  sheet.addRows(rows);
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  return workbook;
}

function safeFileName(value) {
  const replaced = String(value ?? "").replace(/"/g, "'");
  return replaced;
}

function buildDispositionHeader(fileName) {
  const safeName = safeFileName(fileName);
  const encodedName = encodeURIComponent(safeName);
  return `attachment; filename="${safeName}"; filename*=UTF-8''${encodedName}`;
}

export async function streamWorkbook(res, workbook, fileName) {
  res.setHeader("Content-Type", EXCEL_MIME);
  res.setHeader("Content-Disposition", buildDispositionHeader(fileName));
  res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
  await workbook.xlsx.write(res);
  res.end();
}

export async function sendRowsAsExcel(res, options) {
  const workbook = createWorkbook(
    options.rows,
    options.columns,
    options.sheetName
  );
  await streamWorkbook(res, workbook, options.fileName);
}

export function buildDownloadFilename(baseName) {
  const now = new Date().toISOString().replace(/[:.]/g, "-");
  const normalized = String(baseName ?? "export").replace(/\s+/g, "-");
  return `${normalized}-${now}.xlsx`;
}
