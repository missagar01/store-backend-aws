// src/controllers/po.controller.js
import * as poService from "../services/po.service.js";

export async function getPoPending(req, res) {
  try {
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 50);

    const { rows, total } = await poService.getPoPending(page, pageSize);

    return res.json({
      success: true,
      page,
      pageSize,
      total,      // total rows in DB (all pages)
      data: rows, // current page rows
    });
  } catch (err) {
    console.error("getPoPending error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Internal server error" });
  }
}

export async function getPoHistory(req, res) {
  try {
    const page = Number(req.query.page || 1);
    const pageSize = Number(req.query.pageSize || 50);

    const { rows, total } = await poService.getPoHistory(page, pageSize);

    return res.json({
      success: true,
      page,
      pageSize,
      total,
      data: rows,
    });
  } catch (err) {
    console.error("getPoHistory error:", err);
    return res
      .status(500)
      .json({ success: false, error: err.message || "Internal server error" });
  }
}
