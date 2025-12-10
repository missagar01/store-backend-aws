import { getPgConnection } from "../config/auth.js"; // Corrected path to PG connection utility

export async function pgHealth(req, res) {
  let client;
  try {
    client = await getPgConnection();
    // Perform a simple query to check database connectivity
    await client.query('SELECT 1');
    return res.json({ ok: true, message: "PostgreSQL database is healthy." });
  } catch (err) {
    console.error('[pgHealth] PostgreSQL health check failed:', err);
    return res.status(500).json({ ok: false, error: err.message || "PostgreSQL database is unhealthy." });
  } finally {
    if (client) {
      try {
        client.release();
      } catch (releaseErr) {
        console.error('[pgHealth] Error releasing PostgreSQL client:', releaseErr);
      }
    }
  }
}
