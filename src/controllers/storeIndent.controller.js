import * as storeIndentService from "../services/storeIndent.service.js";

export async function createStoreIndent(req, res) {
  try {
    const data = await storeIndentService.create(req.body);
    return res.json({ success: true, ...data });
  } catch (err) {
    console.error("createStoreIndent error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Internal server error" });
  }
}

export async function approveStoreIndent(req, res) {
  try {
    await storeIndentService.approve(req.body);
    return res.json({
      success: true,
      message: "Indent approved successfully",
    });
  } catch (err) {
    console.error("approveStoreIndent error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Internal server error" });
  }
}

export async function getPendingIndents(req, res) {
  try {
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 50);

    const { rows, total, page: safePage, pageSize: safeSize } =
      await storeIndentService.getPending(page, pageSize);

    return res.json({
      success: true,
      page: safePage,
      pageSize: safeSize,
      total,
      data: rows,
    });
  } catch (err) {
    console.error("getPendingIndents error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Internal server error" });
  }
}

export async function getHistory(req, res) {
  try {
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 50);

    const { rows, total, page: safePage, pageSize: safeSize } =
      await storeIndentService.getHistory(page, pageSize);

    return res.json({
      success: true,
      page: safePage,
      pageSize: safeSize,
      total,
      data: rows,
    });
  } catch (err) {
    console.error("getHistory error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Internal server error" });
  }
}
