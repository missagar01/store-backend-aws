import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes/index.js";
import authRoutes from "./routes/auth.routes.js"; // Import new auth routes
import swaggerUi from "swagger-ui-express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

// ✅ Middlewares
app.use(express.json());
app.use(cors());

// ✅ Main routes
app.use("/auth", authRoutes); // Mount authentication routes
app.use("/", routes);
app.use("/api", routes);

// ✅ Swagger setup (startup-only, no work per request)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const specPath = path.join(__dirname, "docs", "openapi.json");

// ❌ NO TypeScript types here
let openapi = null;

if (fs.existsSync(specPath)) {
  try {
    const raw = fs.readFileSync(specPath, "utf-8");
    openapi = JSON.parse(raw);
  } catch (e) {
    console.warn("⚠️ Failed to load Swagger spec:", e && e.message ? e.message : e);
  }
} else {
  console.warn("⚠️ Swagger spec not found at:", specPath);
}

if (openapi) {
  app.get("/docs.json", (_req, res) => res.json(openapi));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));
  console.log("📘 Swagger UI available at /docs");
} else {
  // Optional: agar spec missing hai to yeh simple message
  app.get("/docs", (_req, res) =>
    res.status(503).json({
      success: false,
      message: "Swagger spec not available",
    })
  );
}

export default app;
