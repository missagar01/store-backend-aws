import oracledb from "oracledb";
import os from "os";

export function initOracleClient() {
  try {
    const isWindows = os.platform() === "win32";

    if (isWindows) {
      // Local Windows (for development)
      oracledb.initOracleClient({ libDir: "C:\\oracle\\instantclient_23_9" });
      console.log("🪟 Oracle client initialized (Thick mode on Windows)");
    } else {
      // Linux (EC2 / Ubuntu)
      oracledb.initOracleClient({ libDir: "/home/ubuntu/oracle_client/instantclient_23_26" });
      console.log("🐧 Oracle client initialized (Thick mode on Linux)");
    }
  } catch (err) {
    console.error("❌ Failed to initialize Oracle client:", err);
    process.exit(1);
  }
}

export default oracledb;
