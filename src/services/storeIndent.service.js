import { getConnection } from "../config/db.js";

export async function create(data) {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT MAX(TO_NUMBER(REGEXP_SUBSTR(INDENT_NUMBER, '[0-9]+'))) AS LAST_NUM FROM STORE_INDENT`
    );
    const lastNum = result.rows[0][0] || 0;
    const indentNumber = `SI-${String(lastNum + 1).padStart(4, "0")}`;

    await conn.execute(
      `INSERT INTO STORE_INDENT (
         TIMESTAMP, INDENT_NUMBER, INDENTER_NAME, DEPARTMENT, GROUP_HEAD,
         ITEM_CODE, PRODUCT_NAME, QUANTITY, UOM, SPECIFICATIONS,
         INDENT_APPROVED_BY, INDENT_TYPE, ATTACHMENT
       ) VALUES (
         TO_TIMESTAMP(:timestamp, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'),
         :indentNumber, :indenterName, :department, :groupHead,
         :itemCode, :productName, :quantity, :uom, :specifications,
         :indentApprovedBy, :indentType, :attachment
       )`,
      { ...data, indentNumber },
      { autoCommit: true }
    );

    return { message: "Indent saved successfully", indentNumber };
  } finally {
    await conn.close();
  }
}

export async function approve({
  indentNumber,
  itemCode,
  vendorType,
  approvedQuantity,
}) {
  const conn = await getConnection();
  try {
    await conn.execute(
      `UPDATE STORE_INDENT
       SET VENDOR_TYPE = :vendorType,
           APPROVED_QUANTITY = :approvedQuantity,
           ACTUAL_1 = SYSDATE
       WHERE INDENT_NUMBER = :indentNumber
         AND ITEM_CODE = :itemCode`,
      { indentNumber, itemCode, vendorType, approvedQuantity },
      { autoCommit: true }
    );
  } finally {
    await conn.close();
  }
}

export async function getPending() {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `select t.lastupdate + INTERVAL '3' DAY as plannedtimestamp,
t.vrno as indent_number,
t.vrdate as indent_date,
t.indent_remark as indenter_name,
lhs_utility.get_name('div_code',t.div_code) as division,
upper(lhs_utility.get_name('dept_code',t.dept_code)) as department,
upper(t.item_name) as item_name,
t.um,
t.qtyindent as required_qty,
t.purpose_remark as remark,
upper(t.remark) as specification,
lhs_utility.get_name('cost_code',t.cost_code) as cost_project
from view_indent_engine t
where t.entity_code='SR'
      and t.po_no is null
      and t.cancelleddate is null
      and t.vrdate>='01-apr-2025'
order by t.vrdate asc`,
      [],
      { outFormat: 4002 } // oracledb.OUT_FORMAT_OBJECT
    );

    return result.rows;
  } finally {
    await conn.close();
  }
}

export async function getHistory() {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `select t.lastupdate + INTERVAL '3' DAY as plannedtimestamp,
t.vrno as indent_number,
t.vrdate as indent_date,
t.indent_remark as indenter_name,
lhs_utility.get_name('div_code',t.div_code) as division,
lhs_utility.get_name('dept_code',t.dept_code) as department,
upper(t.item_name) as item_name,
t.um,
t.qtyindent as required_qty,
t.purpose_remark as remark,
upper(t.remark) as specification,
lhs_utility.get_name('cost_code',t.cost_code) as cost_project,
t.po_no,
t.po_qty,
t.cancelleddate,
t.cancelled_remark
from view_indent_engine t
where t.entity_code='SR'
      and t.po_no is not null
      and t.vrdate>='01-apr-2025'
order by t.vrdate asc`,
      [],
      { outFormat: 4002 }
    );
    return result.rows;
  } finally {
    await conn.close();
  }
}
