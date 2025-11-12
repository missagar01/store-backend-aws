// routes/user.routes.js
import { Router } from "express";
import { getUser, getMe } from "../controllers/user.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

// GET /user/me  → get from JWT
router.get("/me", authenticate, getMe);

// GET /user/:id → get by employee_id (S09203)
router.get("/:id", authenticate, getUser);

export default router;
