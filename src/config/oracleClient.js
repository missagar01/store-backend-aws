import oracledb from "oracledb";
import os from "os";

export function initOracleClient() {
  try {
    const isWindows = os.platform() === "win32";

    if (isWindows) {
      // Local Windows (Thick Mode)
      oracledb.initOracleClient({ libDir: "C:\\oracle\\instantclient_23_9" });
      console.log("🪟 Oracle client initialized (Thick mode on Windows)");
    } else {
      // Render/Linux (Thin Mode)
      console.log("🐧 Using Thin mode (no Oracle client needed on Render)");
    }
  } catch (err) {
    console.error("❌ Failed to initialize Oracle client:", err);
    process.exit(1);
  }
}

export default oracledb;
