// src/config/oracleClient.js
import oracledb from "oracledb";
import os from "os";

/**
 * 🔹 Global Oracle driver settings
 * Ye ek hi baar module load hote hi set ho jayenge
 */
try {
  // Row ko object form me laayega (COL_NAME based)
  oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

  // Network round-trips kam karne ke liye
  oracledb.fetchArraySize = 1000; // default 100
  oracledb.prefetchRows = 1000;   // default driver decide karta hai

  console.log("⚙️ Oracle global config applied (OUT_FORMAT_OBJECT, fetchArraySize=1000, prefetchRows=1000)");
} catch (e) {
  console.warn("⚠️ Failed to set global Oracle config:", e.message);
}

/**
 * 🔹 Oracle Client Initializer (Thick mode)
 */
export function initOracleClient() {
  try {
    const isWindows = os.platform() === "win32";

    // Allow override from ENV (optional but handy)
    const winLibDir =
      process.env.ORACLE_WIN_CLIENT_LIB_DIR || "C:\\oracle\\instantclient_23_9";
    const linuxLibDir =
      process.env.ORACLE_LINUX_CLIENT_LIB_DIR || "/home/ubuntu/oracle_client/instantclient_23_26";

    if (isWindows) {
      // Local Windows (for development)
      oracledb.initOracleClient({ libDir: winLibDir });
      console.log(`🪟 Oracle client initialized (Thick mode on Windows, libDir = ${winLibDir})`);
    } else {
      // Linux (EC2 / Ubuntu)
      oracledb.initOracleClient({ libDir: linuxLibDir });
      console.log(`🐧 Oracle client initialized (Thick mode on Linux, libDir = ${linuxLibDir})`);
    }
  } catch (err) {
    // Agar already initialized hai to ORA-... / DPI-1047 jaise error aa sakte hain
    if (err.message && err.message.includes("DPI-1047")) {
      console.error("❌ Oracle client init failed (DPI-1047: libDir path ya library missing hai):", err.message);
    } else if (err.message && err.message.includes("ORA-")) {
      console.error("❌ Oracle client init failed (Oracle error):", err.message);
    } else {
      console.error("❌ Failed to initialize Oracle client:", err);
    }
    process.exit(1);
  }
}

export default oracledb;
