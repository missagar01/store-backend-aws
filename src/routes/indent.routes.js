import { Router } from "express";
import {
  submitIndent,
  updateIndentDecision,
  listIndents,
  listAllIndents,
  getIndent,
  listApprovedIndents,
  listRejectedIndents,
} from "../controllers/indent.controller.js";

const router = Router();

router.get("/", listIndents);
router.get("/all", listAllIndents);
router.get("/status/approved", listApprovedIndents);
router.get("/status/rejected", listRejectedIndents);
router.get("/:requestNumber", getIndent);
router.post("/", submitIndent);
router.put("/:requestNumber/status", updateIndentDecision);

export default router;
