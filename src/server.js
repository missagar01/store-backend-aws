import app from "./app.js";
import { initPool } from "./config/db.js";

const port = process.env.PORT || 3004;

/**
 * Start server safely with proper Oracle pool initialization.
 */
async function startServer() {
  try {
    console.log("⏳ Initializing Oracle pool...");
    await initPool(); // ✅ initialize pool BEFORE accepting requests
    console.log("✅ Oracle pool initialized");

    app.listen(port, () => {
      console.log(`🚀 Server running at http://localhost:${port}`);
    });

  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
}

startServer();
