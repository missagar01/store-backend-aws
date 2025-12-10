import { Router } from "express";
import {
  submitIndent,
  updateIndentDecision,
  listIndents,
  listAllIndents,
  getIndent,
  filterIndents,
  listIndentsByStatus, // Import the new combined function
} from "../controllers/indent.controller.js";

const router = Router();

router.get("/", listIndents);
router.get("/all", listAllIndents);
router.get("/filter", filterIndents);
router.get("/status/:statusType", listIndentsByStatus); // New dynamic route
router.get("/:requestNumber", getIndent);
router.post("/", submitIndent);
router.put("/:requestNumber/status", updateIndentDecision);

export default router;
