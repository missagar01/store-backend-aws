// src/services/stockService.js
import { getConnection } from "../config/db.js";

export async function fetchItemStock(fromDate, toDate) {
  const conn = await getConnection();
  try {
    // 1) set the date window in the package
    // 👇 force Oracle to read the dates in DD-MON-RR
    const plsql = `
      BEGIN
        LHS_UTILITY.SET_FROM_DATE( TO_DATE(:p_from, 'DD-MON-RR') );
        LHS_UTILITY.SET_TO_DATE( TO_DATE(:p_to,  'DD-MON-RR') );
      END;
    `;
    await conn.execute(plsql, {
      p_from: fromDate,
      p_to: toDate,
    });

    // 2) run your main query
    const sql = `
      SELECT NVL(ITEM_CODE, 'N.A.') COL1,
             NVL(LHS_UTILITY.GET_NAME('ITEM_CODE', ITEM_CODE), 'N.A.') COL2,
             NVL(UM, ' ') COL3,
             SUM(NVL(YRCLQTY_ENGINE, 0)) COL4,
             SUM(NVL(YROPAQTY, 0)) COL5
        FROM VIEW_ITEM_STOCK_ENGINE
       WHERE ENTITY_CODE = 'SR'
         AND (
              (EXISTS (
                SELECT 1
                  FROM DUAL
                 WHERE INSTR('C1 C2 CO F1 F2 F3 PM R1 R2 RM RP SM', div_code) <> 0
              ))
              OR div_code IS NULL
             )
         AND EXISTS (SELECT 1 FROM DUAL WHERE entity_CODE = 'SR')
         AND ITEM_NATURE IN ('SI')
       GROUP BY ITEM_CODE,
                LHS_UTILITY.GET_NAME('ITEM_CODE', ITEM_CODE),
                NVL(UM, ' ')
      HAVING SUM(NVL(YROPAQTY, 0)) > 0
         AND SUM(NVL(YRCLQTY_ENGINE, 0)) > 0
       ORDER BY ITEM_CODE,
                LHS_UTILITY.GET_NAME('ITEM_CODE', ITEM_CODE),
                NVL(UM, ' ')
    `;

    const result = await conn.execute(sql, [], {
      outFormat: 4002, // oracledb.OUT_FORMAT_OBJECT
    });

    return result.rows ?? [];
  } finally {
    await conn.close();
  }
}
