import { Router } from "express";
import { supabaseHealth } from "../controllers/health.controller.js";

const router = Router();

router.get("/supabase", supabaseHealth);

export default router;



