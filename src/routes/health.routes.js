import { Router } from "express";
import { pgHealth } from "../controllers/health.controller.js";

const router = Router();

router.get("/pg", pgHealth); // New route for PostgreSQL health check

export default router;
