import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes/index.js";
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

// ✅ Register routes
app.use("/", routes);

// ✅ Swagger docs
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const specPath = path.join(__dirname, "docs", "openapi.json");
  const openapi = JSON.parse(fs.readFileSync(specPath, "utf-8"));
  app.get("/docs.json", (_req, res) => res.json(openapi));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));
  console.log("📘 Swagger UI available at /docs");
} catch (e) {
  console.warn("Swagger not initialized:", e?.message || e);
}

export default app;






