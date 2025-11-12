// src/config/db.js
import dotenv from "dotenv";
import oracledb from "./oracleClient.js";
import { initOracleClient } from "./oracleClient.js";

dotenv.config();

let pool = null;

export async function initPool() {
  if (pool) return pool;

  initOracleClient();

  pool = await oracledb.createPool({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECTION_STRING,
    poolMin: 1,
    poolMax: 10,
    poolIncrement: 1,
    connectTimeout: 10,
    queueTimeout: 10000,
    stmtCacheSize: 0,
  });

  console.log("✅ Oracle pool started");
  return pool;
}

export async function getConnection() {
  if (!pool) {
    await initPool();
  }
  return pool.getConnection();
}
