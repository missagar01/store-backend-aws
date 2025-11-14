// src/controllers/po.controller.js
import * as poService from "../services/po.service.js";

export async function getPoPending(req, res) {
  try {
    // backend pagination removed – full list
    const { rows, total } = await poService.getPoPending();

    return res.json({
      success: true,
      total,
      data: rows,
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
    const { rows, total } = await poService.getPoHistory();

    return res.json({
      success: true,
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
