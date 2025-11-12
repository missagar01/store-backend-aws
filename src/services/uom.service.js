// src/services/uom.service.js
import { getConnection } from "../config/db.js";
import oracledb from "../config/oracleClient.js";

export async function getUomItemsService() {
  let conn;
  try {
    conn = await getConnection();

    const sql = `
      SELECT t.item_code,
             t.item_name,
             t.um
      FROM item_mast t
      WHERE t.item_nature = 'SI'
        AND t.item_status <> 'C'
      ORDER BY t.item_name
    `;

    const result = await conn.execute(sql, [], {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    return {
      ok: true,
      rows: result.rows || [],
    };
  } catch (err) {
    console.error("getUomItemsService error:", err);
    return {
      ok: false,
      error: err.message || "Oracle query failed",
    };
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (closeErr) {
        console.error("Error closing Oracle connection:", closeErr);
      }
    }
  }
}
