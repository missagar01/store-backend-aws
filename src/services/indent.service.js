import { withPgTransaction, withPgClient } from "../config/postgres.js";

const VALID_FORM_TYPES = new Set(["INDENT", "REQUISITION"]);
const VALID_STATUSES = new Set(["PENDING", "APPROVED", "REJECTED", "CANCELLED"]);

const ADVISORY_LOCK_KEYS = {
  INDENT: 19101,
  REQUISITION: 19102,
};

function normalizeTimestamp(input, fallback = null) {
  if (input === undefined || input === null || input === "") return fallback;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString();
}

function normalizeDateOnly(input) {
  if (input === undefined || input === null || input === "") return null;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function deriveDateInterval(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return null;
  const start = new Date(`${startDateStr}T00:00:00Z`);
  const end = new Date(`${endDateStr}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const diffDays = Math.floor((end.getTime() - start.getTime()) / 86400000);
  return `${diffDays} days`;
}

function coalesceValue(primary, secondary, fallback = null) {
  if (primary !== undefined && primary !== null) return primary;
  if (secondary !== undefined && secondary !== null) return secondary;
  return fallback;
}

function toNumberOrNull(input) {
  if (input === undefined || input === null || input === "") return null;
  const num = Number(input);
  return Number.isFinite(num) ? num : null;
}

function hasField(obj, ...keys) {
  return keys.some((key) => Object.prototype.hasOwnProperty.call(obj, key));
}

async function acquireSequenceLock(client, formType) {
  const key = ADVISORY_LOCK_KEYS[formType] || ADVISORY_LOCK_KEYS.INDENT;
  await client.query("SELECT pg_advisory_xact_lock($1)", [key]);
}

async function generateRequestNumber(client, formType) {
  const normalizedType = formType === "REQUISITION" ? "REQUISITION" : "INDENT";
  const prefix = normalizedType === "REQUISITION" ? "REQ" : "IND";

  await acquireSequenceLock(client, normalizedType);
  const { rows } = await client.query(
    `
      SELECT COALESCE(MAX(CAST(substring(request_number FROM '\\d+$') AS INTEGER)), 0) AS max_seq
      FROM indent
      WHERE form_type = $1
    `,
    [normalizedType]
  );

  const currentMax = Number(rows[0]?.max_seq || 0);
  const nextSeq = currentMax + 1;
  return `${prefix}${String(nextSeq).padStart(2, "0")}`;
}

export async function createIndent(formPayload) {
  const sampleTimestamp =
    normalizeTimestamp(
      formPayload.sample_timestamp ?? formPayload.sampleTimestamp
    ) || new Date().toISOString();

  const formTypeRaw = coalesceValue(formPayload.form_type, formPayload.formType, "INDENT");
  const formType = String(formTypeRaw).toUpperCase();
  if (!VALID_FORM_TYPES.has(formType)) {
    throw new Error("Invalid form_type. Allowed values: INDENT or REQUISITION");
  }

  const providedRequestNumber =
    formPayload.request_number ??
    formPayload.requestNumber ??
    null;

  const requestQty = toNumberOrNull(formPayload.request_qty ?? formPayload.requestQty);

  const planned1 =
    normalizeTimestamp(formPayload.planned_1 ?? formPayload.planned1) ||
    sampleTimestamp;

  return withPgTransaction(async (client) => {
    const requestNumber =
      providedRequestNumber && typeof providedRequestNumber === "string"
        ? providedRequestNumber.trim().toUpperCase()
        : await generateRequestNumber(client, formType);
    if (!requestNumber) {
      throw new Error("Failed to derive request_number");
    }

    const insertSql = `
      INSERT INTO indent (
        sample_timestamp,
        form_type,
        request_number,
        indent_series,
        requester_name,
        department,
        division,
        item_code,
        product_name,
        request_qty,
        uom,
        specification,
        make,
        purpose,
        cost_location,
        planned_1,
        request_status
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15,
        $16, $17
      )
      RETURNING *
    `;

    const values = [
      sampleTimestamp,
      formType,
      requestNumber,
      formPayload.indent_series ?? formPayload.indentSeries ?? null,
      formPayload.requester_name ?? formPayload.requesterName ?? null,
      formPayload.department ?? null,
      formPayload.division ?? null,
      formPayload.item_code ?? formPayload.itemCode ?? null,
      formPayload.product_name ?? formPayload.productName ?? null,
      requestQty,
      formPayload.uom ?? null,
      formPayload.specification ?? formPayload.specifications ?? null,
      formPayload.make ?? null,
      formPayload.purpose ?? null,
      formPayload.cost_location ?? formPayload.costLocation ?? null,
      planned1,
      "PENDING",
    ];

    const { rows } = await client.query(insertSql, values);
    return rows[0];
  });
}

export async function updateIndentStatus(requestNumber, updates) {
  if (!requestNumber) {
    throw new Error("requestNumber is required");
  }
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    throw new Error("Invalid update payload");
  }

  return withPgTransaction(async (client) => {
    const rows = await fetchRowsForRequestNumber(client, requestNumber);
    if (!rows.length) {
      throw new Error(`Indent with request_number ${requestNumber} not found`);
    }
    const targetRow = resolveTargetRow(rows, updates);
    return applyUpdateToRow(client, targetRow, updates);
  });
}

export async function updateIndentStatusBulk(requestNumber, updatesList = []) {
  if (!requestNumber) {
    throw new Error("requestNumber is required");
  }
  if (!Array.isArray(updatesList) || !updatesList.length) {
    throw new Error("Update array is required");
  }

  return withPgTransaction(async (client) => {
    const rows = await fetchRowsForRequestNumber(client, requestNumber);
    if (!rows.length) {
      throw new Error(`Indent with request_number ${requestNumber} not found`);
    }

    const remainingRows = [...rows];
    const updatedRows = [];

    for (const update of updatesList) {
      if (!update || typeof update !== "object") {
        throw new Error("Invalid update payload in array");
      }

      const row = resolveTargetRow(
        update?.id || update?.row_id || update?.rowId ? rows : remainingRows,
        update
      );

      if (!update?.id && !update?.row_id && !update?.rowId) {
        const idx = remainingRows.indexOf(row);
        if (idx >= 0) {
          remainingRows.splice(idx, 1);
        }
      }

      const updated = await applyUpdateToRow(client, row, update);
      updatedRows.push(updated);
    }

    return updatedRows;
  });
}

async function fetchRowsForRequestNumber(client, requestNumber) {
  const { rows } = await client.query(
    `
      SELECT *
      FROM indent
      WHERE request_number = $1
      ORDER BY created_at ASC
    `,
    [requestNumber]
  );
  return rows;
}

function resolveTargetRow(rows, updatePayload) {
  if (!rows || !rows.length) throw new Error("No rows available for update");

  const idKey = updatePayload?.id ?? updatePayload?.row_id ?? updatePayload?.rowId;
  if (idKey !== undefined && idKey !== null && idKey !== "") {
    const match = rows.find((row) => String(row.id) === String(idKey));
    if (!match) {
      throw new Error(`Indent row with id ${idKey} not found`);
    }
    return match;
  }

  const itemCode = updatePayload?.item_code ?? updatePayload?.itemCode ?? null;
  if (itemCode) {
    const match = rows.find((row) => String(row.item_code) === String(itemCode));
    if (match) {
      return match;
    }
  }

  return rows[0];
}

async function applyUpdateToRow(client, existing, updates) {
  const setClauses = [];
  const values = [];
  let paramIndex = 1;

  const nextStatusRaw = updates.request_status ?? updates.requestStatus;
  let nextStatus = null;
  if (nextStatusRaw) {
    const candidate = String(nextStatusRaw).toUpperCase();
    if (!VALID_STATUSES.has(candidate)) {
      throw new Error("Invalid request_status");
    }
    nextStatus = candidate;
    values.push(candidate);
    setClauses.push(`request_status = $${paramIndex++}`);
  }

  const approvedQtyRaw = updates.approved_quantity ?? updates.approvedQuantity;
  if (approvedQtyRaw !== undefined) {
    const qty = toNumberOrNull(approvedQtyRaw);
    if (qty === null) {
      throw new Error("approved_quantity must be a valid number");
    }
    values.push(qty);
    setClauses.push(`approved_quantity = $${paramIndex++}`);
  }

  const explicitActual1 = normalizeTimestamp(updates.actual_1 ?? updates.actual1);
  const shouldAutofillActual1 =
    !explicitActual1 &&
    !existing.actual_1 &&
    nextStatus &&
    nextStatus !== "PENDING";
  const actual1Value = explicitActual1 || (shouldAutofillActual1 ? new Date().toISOString() : null);

  let actual1ParamIndex = null;
  if (actual1Value) {
    actual1ParamIndex = paramIndex;
    values.push(actual1Value);
    setClauses.push(`actual_1 = $${paramIndex}::timestamptz`);
    paramIndex += 1;
    setClauses.push(
      `time_delay_1 = ($${actual1ParamIndex}::timestamptz - COALESCE(planned_1, sample_timestamp))`
    );
  }

  if (!setClauses.length) {
    throw new Error("No valid fields provided for update");
  }

  setClauses.push("updated_at = NOW()");
  values.push(existing.id);
  const updateSql = `
    UPDATE indent
    SET ${setClauses.join(", ")}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const { rows } = await client.query(updateSql, values);
  return rows[0];
}

export async function fetchIndents(options = {}) {
  const { status, statuses } = options;

  return withPgClient(async (client) => {
    const whereParts = [];
    const values = [];
    let paramIndex = 1;

    const normalizedStatuses = [];
    if (Array.isArray(statuses)) {
      normalizedStatuses.push(...statuses);
    }

    if (status) {
      const splits = String(status)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      normalizedStatuses.push(...splits);
    }

    const cleanedStatuses = [...new Set(normalizedStatuses.map((s) => s.toUpperCase()))];

    if (cleanedStatuses.length) {
      cleanedStatuses.forEach((s) => {
        if (!VALID_STATUSES.has(s)) {
          throw new Error(`Invalid request_status filter: ${s}`);
        }
      });
      const placeholders = cleanedStatuses.map(() => `$${paramIndex++}`);
      whereParts.push(`request_status IN (${placeholders.join(", ")})`);
      values.push(...cleanedStatuses);
    }

    const sql = `
      SELECT *
      FROM indent
      ${whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : ""}
      ORDER BY created_at DESC
    `;

    const { rows } = await client.query(sql, values);
    return rows;
  });
}

export async function fetchIndentByRequestNumber(requestNumber) {
  if (!requestNumber) {
    throw new Error("requestNumber is required");
  }

  return withPgClient(async (client) => {
    const { rows } = await client.query(
      `
        SELECT *
        FROM indent
        WHERE request_number = $1
        ORDER BY created_at ASC
      `,
      [requestNumber]
    );

    return rows;
  });
}
