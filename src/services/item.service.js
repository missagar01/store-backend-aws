import { getConnection } from "../config/db.js";
import oracledb from "../config/oracleClient.js";

/**
 * Get active store indent items (SI) from Oracle item_mast table.
 * Fetches only active (not 'C') items with nature 'SI'.
 */
export async function getStoreIndentItems() {
  let connection;
  try {
    connection = await getConnection();
    
    const result = await connection.execute(
      `SELECT t.item_code, t.item_name 
       FROM item_mast t
       WHERE t.item_nature = 'SI'
         AND t.item_status <> 'C'
       ORDER BY t.item_name`,
      [], // no bind params
      { 
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchInfo: {
          "ITEM_CODE": { type: oracledb.STRING },
          "ITEM_NAME": { type: oracledb.STRING }
        }
      }
    );

    return {
      success: true,
      data: result.rows.map(row => ({
        item_code: row.ITEM_CODE,
        item_name: row.ITEM_NAME
      }))
    };

  } catch (err) {
    console.error('[getStoreIndentItems] Oracle error:', err);
    throw err;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('[getStoreIndentItems] Error closing connection:', err);
      }
    }
  }
}
