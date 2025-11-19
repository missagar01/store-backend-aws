import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;
let pool = null;

function buildPoolConfig() {
  const sslEnabled = String(process.env.PG_SSL || "").toLowerCase() === "true";
  return {
    host: process.env.PG_HOST,
    port: Number(process.env.PG_PORT) || 5432,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE,
    ssl: sslEnabled
      ? {
          rejectUnauthorized: false,
        }
      : false,
    max: Number(process.env.PG_POOL_MAX) || 10,
    idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS) || 30000,
    connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS) || 5000,
  };
}

export function getPgPool() {
  if (pool) return pool;
  pool = new Pool(buildPoolConfig());
  pool.on("error", (err) => {
    console.error("Unexpected Postgres pool error:", err);
  });
  console.log("Postgres pool initialized");
  return pool;
}

export async function withPgClient(handler) {
  const client = await getPgPool().connect();
  try {
    return await handler(client);
  } finally {
    client.release();
  }
}

export async function withPgTransaction(handler) {
  return withPgClient(async (client) => {
    try {
      await client.query("BEGIN");
      const result = await handler(client);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  });
}
