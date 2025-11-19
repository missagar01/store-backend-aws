import {
  createIndent,
  updateIndentStatus,
  updateIndentStatusBulk,
  fetchIndents,
  fetchIndentByRequestNumber,
} from "../services/indent.service.js";

function pickStatusCode(err, notFoundStatus = 404) {
  if (!err?.message) return 500;
  if (err.message.toLowerCase().includes("not found")) return notFoundStatus;
  if (
    err.message.toLowerCase().includes("invalid") ||
    err.message.toLowerCase().includes("required") ||
    err.message.toLowerCase().includes("no valid fields")
  ) {
    return 400;
  }
  return 500;
}

export async function submitIndent(req, res) {
  try {
    const record = await createIndent(req.body);
    return res.status(201).json({
      success: true,
      data: record,
    });
  } catch (err) {
    console.error("submitIndent error:", err);
    const status = pickStatusCode(err, 400);
    return res.status(status).json({
      success: false,
      error: err.message || "Failed to create indent",
    });
  }
}

export async function updateIndentDecision(req, res) {
  const requestNumber = req.params.requestNumber;
  try {
    const body = req.body;
    let updatesPayload = body;
    if (body && typeof body === "object" && !Array.isArray(body) && Array.isArray(body.items)) {
      updatesPayload = body.items;
    }

    const isArrayPayload = Array.isArray(updatesPayload);
    const record = isArrayPayload
      ? await updateIndentStatusBulk(requestNumber, updatesPayload)
      : await updateIndentStatus(requestNumber, updatesPayload);
    return res.json({
      success: true,
      total: Array.isArray(record) ? record.length : undefined,
      data: record,
    });
  } catch (err) {
    console.error("updateIndentDecision error:", err);
    const status = pickStatusCode(err, 404);
    return res.status(status).json({
      success: false,
      error: err.message || "Failed to update indent",
    });
  }
}

export async function listIndents(req, res) {
  try {
    const statusParam = req.query.status;
    const hasStatusParam = typeof statusParam === "string" && statusParam.trim().length > 0;
    const rows = await fetchIndents(
      hasStatusParam ? { status: statusParam } : { statuses: ["PENDING"] }
    );
    return res.json({
      success: true,
      total: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("listIndents error:", err);
    const status = pickStatusCode(err, 400);
    return res.status(status).json({
      success: false,
      error: err.message || "Failed to fetch indents",
    });
  }
}

export async function listAllIndents(_req, res) {
  try {
    const rows = await fetchIndents();
    return res.json({
      success: true,
      total: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("listAllIndents error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to fetch indents",
    });
  }
}

export async function getIndent(req, res) {
  const requestNumber = req.params.requestNumber;
  try {
    const record = await fetchIndentByRequestNumber(requestNumber);
    if (!record || record.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Indent with request_number ${requestNumber} not found`,
      });
    }
    return res.json({
      success: true,
      total: record.length,
      data: record,
    });
  } catch (err) {
    console.error("getIndent error:", err);
    const status = pickStatusCode(err, 404);
    return res.status(status).json({
      success: false,
      error: err.message || "Failed to fetch indent",
    });
  }
}

export async function listApprovedIndents(_req, res) {
  try {
    const rows = await fetchIndents({ statuses: ["APPROVED"] });
    return res.json({
      success: true,
      total: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("listApprovedIndents error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to fetch approved indents",
    });
  }
}

export async function listRejectedIndents(_req, res) {
  try {
    const rows = await fetchIndents({ statuses: ["REJECTED"] });
    return res.json({
      success: true,
      total: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("listRejectedIndents error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to fetch rejected indents",
    });
  }
}
