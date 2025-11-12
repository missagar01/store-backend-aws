import { Router } from "express";
import { loginSupabase, logout } from "../controllers/auth.controller.js";

const router = Router();

router.post("/login", loginSupabase);
router.post("/logout", logout); // ✅ works with or without token

export default router;
