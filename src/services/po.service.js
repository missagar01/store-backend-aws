import { getConnection } from "../config/db.js";

export async function getPoPending() {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `select t.duedate + interval '20' hour as planned_timestamp,
       t.vrno, 
       t.vrdate, 
       lhs_utility.get_name('acc_code',t.acc_code) as vendor_name, 
       t.item_name,
       t.qtyorder,
       t.um,
       t.qtyexecute,
       (t.qtyorder - t.qtyexecute) as balance_qty
 from view_order_engine t
where t.entity_code = 'SR'
      and t.series = 'U3'
      and t.qtycancelled is null
      and (t.qtyorder - t.qtyexecute) > 0
      and t.vrdate>=trunc(sysdate-209)`,
      [],
      { outFormat: 4002 } // oracledb.OUT_FORMAT_OBJECT
    );

    return result.rows;
  } finally {
    await conn.close();
  }
}

export async function getPoHistory() {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `select t.duedate + interval '20' hour as planned_timestamp,
       t.vrno, 
       t.vrdate, 
       lhs_utility.get_name('acc_code',t.acc_code) as vendor_name, 
       t.item_name,
       t.qtyorder,
       t.um,
       t.qtyexecute
 from view_order_engine t
where t.entity_code = 'SR'
      and t.series = 'U3'
      and t.qtycancelled is null
      and t.vrdate>=trunc(sysdate-209)
      and ((t.qtyorder - t.qtyexecute) = 0 or (t.qtyorder - t.qtyexecute) > t.qtyorder)`,
      [],
      { outFormat: 4002 } // oracledb.OUT_FORMAT_OBJECT
    );

    return result.rows;
  } finally {
    await conn.close();
  }
}
