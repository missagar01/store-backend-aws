import { Router } from "express";
import { getItems } from "../controllers/item.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

// Protected route: requires valid JWT
// GET /items - fetch active store indent items
router.get("/", authenticate, getItems);

export default router;
