// src/controllers/storeIndent.controller.js
import * as storeIndentService from "../services/storeIndent.service.js";

export async function createStoreIndent(req, res) {
  try {
    const data = await storeIndentService.create(req.body);

    // data change hone ke baad cache clear
    storeIndentService.invalidateIndentCaches();

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

    // approve ke baad cache clear
    storeIndentService.invalidateIndentCaches();

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
    const rows = await storeIndentService.getPending();

    return res.json({
      success: true,
      total: rows.length,
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
    const rows = await storeIndentService.getHistory();

    return res.json({
      success: true,
      total: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error("getHistory error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Internal server error" });
  }
}
