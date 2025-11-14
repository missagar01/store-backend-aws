import express from "express";
import oracledb from "oracledb";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

/* 🔧 Global Oracle settings – performance friendly */
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.fetchArraySize = 1000;   // bigger fetch batch
oracledb.prefetchRows = 1000;     // prefetch rows for faster streaming

/* 🔧 Thick client (Windows) – keep as-is, or use ENV */
if (!oracledb.thin) {
  try {
    oracledb.initOracleClient({
      libDir: process.env.ORACLE_CLIENT_LIB_DIR || "C:\\oracle\\instantclient_23_9",
    });
    console.log("🪟 Oracle client initialized");
  } catch (e) {
    console.error("❌ Failed to init Oracle client:", e?.message || e);
  }
}

const app = express();
app.use(express.json());
app.use(cors());

let pool;

/* ✅ Create pool once */
async function initPool() {
  if (pool) return pool;

  try {
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
    console.log("✅ Oracle connection pool started");
    return pool;
  } catch (err) {
    console.error("❌ Pool init failed:", err);
    process.exit(1);
  }
}

/* 🔁 Reusable helper: always get/release connection safely */
async function withConnection(handler, resOnError = null) {
  let conn;
  try {
    await initPool();
    conn = await pool.getConnection();
    return await handler(conn);
  } catch (err) {
    console.error("DB Error:", err);
    if (resOnError) {
      resOnError.status(500).json({ error: err.message });
    }
    throw err; // also rethrow if caller needs
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (e) {
        console.error("Error closing connection:", e);
      }
    }
  }
}

/* =======================
   GET /users – ACCBAL_AUDIT
   ======================= */
app.get("/users", async (req, res) => {
  console.log("Fetching all students...");

  await withConnection(
    async (conn) => {
      // 1️⃣ Schema check
      const schemaName = "SRMPLERP";

      const schemaCheck = await conn.execute(
        `SELECT username 
           FROM all_users 
          WHERE username = :schemaName`,
        { schemaName },
      );

      if (!schemaCheck.rows || schemaCheck.rows.length === 0) {
        return res
          .status(404)
          .json({ error: `Schema ${schemaName} does not exist` });
      }

      console.log(`Schema ${schemaName} exists ✅`);

      // 2️⃣ Table check
      const tableName = "ACCBAL_AUDIT";

      const tableCheck = await conn.execute(
        `SELECT table_name 
           FROM all_tables 
          WHERE owner = :schemaName 
            AND table_name = :tableName`,
        { schemaName, tableName },
      );

      if (!tableCheck.rows || tableCheck.rows.length === 0) {
        return res.status(404).json({
          error: `Table ${tableName} does not exist in schema ${schemaName}`,
        });
      }

      console.log(`Table ${tableName} exists ✅`);

      // 3️⃣ Fetch data – same as before
      const result = await conn.execute(
        `SELECT * FROM SRMPLERP.ACCBAL_AUDIT`
      );

      console.log("Rows fetched:", result.rows?.length || 0);
      res.json(result.rows || []);
    },
    res
  );
});

/* =======================
   GET /schema – all schemas + tables
   ======================= */
app.get("/schema", async (req, res) => {
  console.log("Fetching all schemas and tables...");

  await withConnection(
    async (conn) => {
      const schemasResult = await conn.execute(
        `SELECT username AS schema_name
           FROM all_users
          ORDER BY username`
      );

      const schemas =
        (schemasResult.rows || []).map((r) => r.SCHEMA_NAME) || [];
      console.log("Schemas found:", schemas.length);

      const schemaTables = {};

      for (const schema of schemas) {
        const tablesResult = await conn.execute(
          `SELECT table_name
             FROM all_tables
            WHERE owner = :schema
            ORDER BY table_name`,
          { schema }
        );
        schemaTables[schema] = (tablesResult.rows || []).map(
          (r) => r.TABLE_NAME
        );
      }

      res.json({
        totalSchemas: schemas.length,
        schemas: schemaTables,
      });
    },
    res
  );
});

/* =======================
   GET /current-schema
   ======================= */
app.get("/current-schema", async (req, res) => {
  await withConnection(
    async (conn) => {
      const result = await conn.execute(
        `SELECT sys_context('USERENV','CURRENT_SCHEMA') AS schema_name FROM dual`
      );
      res.json(result.rows || []);
    },
    res
  );
});

/* =======================
   POST /store-indent – insert
   ======================= */
app.post("/store-indent", async (req, res) => {
  await withConnection(
    async (conn) => {
      const {
        timestamp,
        indenterName,
        department,
        groupHead,
        itemCode,
        productName,
        quantity,
        uom,
        specifications,
        indentApprovedBy,
        indentType,
        attachment,
      } = req.body;

      // 1️⃣ Get last indent number
      const result = await conn.execute(
        `SELECT MAX(TO_NUMBER(REGEXP_SUBSTR(INDENT_NUMBER, '[0-9]+'))) AS LAST_NUM 
           FROM STORE_INDENT`
      );

      const lastNum =
        (result.rows && result.rows[0] && result.rows[0].LAST_NUM) || 0;
      const newNum = lastNum + 1;
      const indentNumber = `SI-${String(newNum).padStart(4, "0")}`;

      // 2️⃣ Insert
      await conn.execute(
        `INSERT INTO STORE_INDENT 
         (TIMESTAMP, INDENT_NUMBER, INDENTER_NAME, DEPARTMENT, GROUP_HEAD, 
          ITEM_CODE, PRODUCT_NAME, QUANTITY, UOM, SPECIFICATIONS, 
          INDENT_APPROVED_BY, INDENT_TYPE, ATTACHMENT)
         VALUES (
           TO_TIMESTAMP(:timestamp, 'YYYY-MM-DD"T"HH24:MI:SS.FF3"Z"'),
           :indentNumber,
           :indenterName,
           :department,
           :groupHead,
           :itemCode,
           :productName,
           :quantity,
           :uom,
           :specifications,
           :indentApprovedBy,
           :indentType,
           :attachment
         )`,
        {
          timestamp,
          indentNumber,
          indenterName,
          department,
          groupHead,
          itemCode,
          productName,
          quantity,
          uom,
          specifications,
          indentApprovedBy,
          indentType,
          attachment,
        },
        { autoCommit: true }
      );

      res.json({
        success: true,
        message: "Indent saved successfully",
        indentNumber,
      });
    },
    res
  );
});

/* =======================
   PUT /store-indent/approve – update
   ======================= */
app.put("/store-indent/approve", async (req, res) => {
  await withConnection(
    async (conn) => {
      const { indentNumber, itemCode, vendorType, approvedQuantity } = req.body;

      await conn.execute(
        `UPDATE STORE_INDENT
            SET VENDOR_TYPE       = :vendorType,
                APPROVED_QUANTITY = :approvedQuantity,
                ACTUAL_1          = SYSDATE
          WHERE INDENT_NUMBER = :indentNumber
            AND ITEM_CODE     = :itemCode`,
        { indentNumber, itemCode, vendorType, approvedQuantity },
        { autoCommit: true }
      );

      res.json({
        success: true,
        message: "Indent approved successfully",
      });
    },
    res
  );
});

/* =======================
   GET /store-indent/pending
   ======================= */
app.get("/store-indent/pending", async (req, res) => {
  await withConnection(
    async (conn) => {
      const result = await conn.execute(
        `SELECT * 
           FROM STORE_INDENT 
          WHERE PLANNED_1 IS NOT NULL 
            AND ACTUAL_1  IS NULL`
      );
      res.json(result.rows || []);
    },
    res
  );
});

/* =======================
   GET /store-indent/history
   ======================= */
app.get("/store-indent/history", async (req, res) => {
  await withConnection(
    async (conn) => {
      const result = await conn.execute(
        `SELECT * 
           FROM STORE_INDENT 
          WHERE PLANNED_1 IS NOT NULL 
            AND ACTUAL_1  IS NOT NULL`
      );
      res.json(result.rows || []);
    },
    res
  );
});

/* =======================
   GET /tables – SRMPLERP tables
   ======================= */
app.get("/tables", async (req, res) => {
  await withConnection(
    async (conn) => {
      const owner = "SRMPLERP";
      const result = await conn.execute(
        `SELECT table_name 
           FROM all_tables 
          WHERE owner = :owner
          ORDER BY table_name`,
        { owner }
      );
      res.json(result.rows || []);
    },
    res
  );
});

/* =======================
   Start server
   ======================= */
const port = 3000;

(async () => {
  await initPool();
  app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
  });
})();
