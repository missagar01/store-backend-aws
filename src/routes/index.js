// src/routes/index.js
import { Router } from "express";
import storeIndentRoutes from "./storeIndent.routes.js";
import vendorRateUpdateRoutes from "./vendorRateUpdate.routes.js";
import threePartyApprovalRoutes from "./threePartyApproval.routes.js";
import poRoutes from "./po.routes.js";
import authRoutes from "./auth.routes.js";
import healthRoutes from "./health.routes.js";
import itemRoutes from "./item.routes.js";
import userRoutes from "./user.routes.js";
import uomRoutes from "./uom.routes.js";
import costLocationRoutes from "./costLocation.routes.js";
import indentRoutes from "./indent.routes.js";

import stockRoutes from "./stockRoutes.js";

const router = Router();

router.use("/user", userRoutes);
router.use("/store-indent", storeIndentRoutes);
router.use("/indent", indentRoutes);
router.use("/vendor-rate-update", vendorRateUpdateRoutes);
router.use("/three-party-approval", threePartyApprovalRoutes);
router.use("/po", poRoutes);
router.use("/auth", authRoutes);
router.use("/health", healthRoutes);
router.use("/items", itemRoutes);
router.use("/uom", uomRoutes);
router.use("/cost-location", costLocationRoutes);

// 👇 this is your Oracle endpoint
router.use("/stock", stockRoutes);

export default router;
