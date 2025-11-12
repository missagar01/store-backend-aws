import { Router } from "express";
import { getPoPending, getPoHistory } from "../controllers/po.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
const router = Router();

router.get("/pending",authenticate, getPoPending);
router.get("/history",authenticate, getPoHistory);

export default router;



