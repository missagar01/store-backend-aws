// src/config/db.js
import dotenv from "dotenv";
import oracledb from "./oracleClient.js";
import { initOracleClient } from "./oracleClient.js";

dotenv.config();

let pool = null;
let poolPromise = null; // race-condition avoid karne ke liye

export async function initPool() {
  // Agar pool already bana hua hai to wahi return karo
  if (pool) return pool;
  if (poolPromise) return poolPromise; // parallel calls safely handle

  // Basic env check (helpful logs)
  if (!process.env.ORACLE_USER || !process.env.ORACLE_PASSWORD || !process.env.ORACLE_CONNECTION_STRING) {
    console.warn("⚠️ ORACLE env vars missing (ORACLE_USER / ORACLE_PASSWORD / ORACLE_CONNECTION_STRING)");
  }

  initOracleClient();

  // Ek hi createPool call chale iske liye promise store kar rahe hain
  poolPromise = (async () => {
    try {
      const createdPool = await oracledb.createPool({
        user: process.env.ORACLE_USER,
        password: process.env.ORACLE_PASSWORD,
        connectString: process.env.ORACLE_CONNECTION_STRING,

        // 🔹 Pool tuning
        poolMin: 2,           // 1 se 2 (thoda warm pool)
        poolMax: 20,          // future load ke liye space
        poolIncrement: 2,     // need padhne par 2–2 connection add honge

        // Idle connections clean-up (seconds)
        poolTimeout: 60,      // 1 min idle ke baad close

        // 🔹 Queue tuning (API hang na ho)
        connectTimeout: 10,   // tumhara existing setting
        queueTimeout: 60000,  // 60 sec se zyada wait ho to error
        queueMax: 100,        // 100 se zyada waiting requests na le

        // 🔹 Statement cache ON (yahi biggest gain hai)
        stmtCacheSize: 50,    // 0 → 50 (SQL parse reuse)
      });

      pool = createdPool;
      console.log("✅ Oracle pool started");
      return pool;
    } catch (err) {
      poolPromise = null; // fail ho gaya to dubara try allow
      console.error("❌ Failed to create Oracle pool:", err);
      throw err;
    }
  })();

  return poolPromise;
}

export async function getConnection() {
  if (!pool) {
    await initPool();
  }

  const start = Date.now();
  const conn = await pool.getConnection();
  const elapsed = Date.now() - start;

  // Slow connection detect karne ke liye lightweight log
  if (elapsed > 100) {
    console.warn(`⏱️ getConnection took ${elapsed} ms`);
  }

  return conn;
}
