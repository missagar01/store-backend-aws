// src/routes/storeIndent.routes.js
import { Router } from "express";
import {
  createStoreIndent,
  approveStoreIndent,
  getPendingIndents,
  getHistory,
  getDashboard,
} from "../controllers/storeIndent.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/", createStoreIndent);
router.put("/approve", approveStoreIndent);
router.get("/pending", authenticate, getPendingIndents);
router.get("/history", authenticate, getHistory);
router.get("/dashboard", authenticate, getDashboard);

export default router;
