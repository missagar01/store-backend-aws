import * as poService from "../services/po.service.js";

export async function getPoPending(req, res) {
  try {
    const data = await poService.getPoPending();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getPoHistory(req, res) {
  try {
    const data = await poService.getPoHistory();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
}


