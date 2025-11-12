import * as storeIndentService from "../services/storeIndent.service.js";

export async function createStoreIndent(req, res) {
  try {
    const data = await storeIndentService.create(req.body);
    res.json({ success: true, ...data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function approveStoreIndent(req, res) {
  try {
    await storeIndentService.approve(req.body);
    res.json({ success: true, message: "Indent approved successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function getPendingIndents(req, res) {
  try {
    const data = await storeIndentService.getPending();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getHistory(req, res) {
  try {
    const data = await storeIndentService.getHistory();
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}


