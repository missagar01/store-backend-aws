Store Backend – Indent Workflow
================================

This backend exposes Oracle- and Postgres-backed APIs for store operations. The indent
module persists user submissions to the AWS RDS Postgres database and lets approvers
update statuses in real time.

Prerequisites
-------------
- Node.js 20+
- Oracle Instant Client (for the other Oracle routes)
- Postgres connection details (.env needs `PG_HOST`, `PG_PORT`, `PG_USER`,
  `PG_PASSWORD`, `PG_DATABASE`, `PG_SSL=true`)
- Run `npm install` so the `pg` driver is present

## Authentication APIs

### 1. User Login – `POST /auth/login`
Authenticates a user against the `users` table in the AWS RDS PostgreSQL database.

**Request body**
```json
{
  "user_name": "john.doe",  // OR "employee_id": "EMP123"
  "password": "securepassword123"
}
```

**Success response (200)**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "user_name": "john.doe", "employee_id": "EMP123", "role": "user" }
}
```

Scripts
-------
- `npm start` – runs `src/server.js`
- `npm run dev` – nodemon watcher for development
- `npm install` – required after `package.json` changes (new `exceljs` dependency for exports)

Indent APIs
-----------

### 1. Submit Indent – `POST /indent`
Creates a new indent entry. `form_type` decides the auto-generated `request_number`
prefix (`IND01`, `IND02`, … for INDENT; `REQ01`, `REQ02`, … for REQUISITION).
The request body may now include `group_name` (or `groupName`) so the backend can
persist the item’s group along with the indent row.

**Request body**
```json
{
  "form_type": "INDENT",
  "sample_timestamp": "2025-02-18T12:20:00Z",
  "indent_series": "INT01",
  "requester_name": "Rahul Sharma",
  "department": "PC",
  "division": "SM",
  "item_code": "S01290015",
  "product_name": "AC DRIVE 110 KW WITH CDP",
  "request_qty": 90.5,
  "uom": "NOS",
  "specification": "CDP model with digital board",
  "make": "ABB",
  "group_name": "Drive Assemblies",
  "purpose": "Production line 2",
  "cost_location": "PLANT-A",
  "planned_2": "2025-02-20",
  "actual_2": "2025-02-22"
}
```

**Success response (201)**
```json
{
  "success": true,
  "data": {
    "request_number": "IND03",
    "request_status": "PENDING",
    "sample_timestamp": "2025-02-18T12:20:00.000Z",
    "planned_1": "2025-02-18T12:20:00.000Z",
    "planned_2": "2025-02-20",
    "actual_2": "2025-02-22",
    "time_delay_2": "2 days",
    "...": "other columns from the indent row"
  }
}
```

### 2. Update/approve Indent – `PUT /indent/:requestNumber/status`
Approvers use this endpoint to change status, set approved quantity, and capture
timeline updates. Sending a non-pending status auto-fills `actual_1` (if it was blank)
and the backend recalculates `time_delay_1` / `time_delay_2` when their timestamps
change.

**Request body**
```json
{
  "request_status": "APPROVED",
  "approved_quantity": 90,
  "actual_1": "2025-02-19T09:15:00Z",
  "planned_2": "2025-02-20",
  "actual_2": "2025-02-22"
}
```

**Success response (200)**
```json
{
  "success": true,
  "data": {
    "request_number": "IND03",
    "request_status": "APPROVED",
    "approved_quantity": 90,
    "actual_1": "2025-02-19T09:15:00.000Z",
    "time_delay_1": "1 day 00:55:00",
    "planned_2": "2025-02-20",
    "actual_2": "2025-02-22",
    "time_delay_2": "2 days"
  }
}
```

**Validation errors (400)**
```json
{ "success": false, "error": "Invalid request_status" }
```
### 3. Filter Indents – GET /indent/filter
Filters indents by optional date range, product name, and status.

**Query params**
- `fromDate` / `from_date` (YYYY-MM-DD, optional) – inclusive lower bound on sample_timestamp
- `toDate` / `to_date` (YYYY-MM-DD, optional) – inclusive upper bound on sample_timestamp
- `productName` / `product_name` (string, optional) – case-insensitive substring match
- `requesterName` / `requester_name` (string, optional) – case-insensitive substring match
- `status` / `statuses` (comma-separated list or array, optional) – request_status filter

**Example**
`GET /indent/filter?fromDate=2025-11-01&toDate=2025-11-15&productName=cement&requesterName=Rahul&status=APPROVED`

**Success response (200)**
```json
{
  "success": true,
  "total": 2,
  "data": [
    {
      "request_number": "IND05",
      "sample_timestamp": "2025-11-04T10:05:00.000Z",
      "product_name": "Cement Grade 43",
      "request_status": "APPROVED",
      "...": "other columns"
    }
  ]
}

### 4. List Indents by Status – `GET /indent/status/:statusType`
Retrieves a list of indents filtered by their `request_status`.

**Path Parameters**
- `:statusType` (string, required) – The status to filter by. Valid values are `approved` or `rejected`.

**Examples**
- `GET http://localhost:3004/indent/status/approved`
- `GET http://localhost:3004/indent/status/rejected`

**Success response (200)**
```json
{
  "success": true,
  "total": 1,
  "data": [
    {
      "request_number": "IND03",
      "sample_timestamp": "2025-11-04T10:05:00.000Z",
      "product_name": "Cement Grade 43",
      "request_status": "APPROVED",
      "...": "other columns"
    }
  ]
}


### Pagination support for list endpoints
The various `GET /indent` endpoints now accept `limit` and `offset` query parameters so the frontend can implement infinite scrolling.
- `limit` (number, optional) – how many rows to return; defaults to `100` and is capped at `500`.
- `offset` (number, optional) – zero-based row offset; defaults to `0`.

Responses include a `pagination` object that exposes the actual `limit`, `offset`, `hasMore`, and `nextOffset` values for the caller to know whether to fetch another page.

If the `request_number` doesn’t exist, the service returns a 404 with
`{ "success": false, "error": "Indent with request_number … not found" }`.

Download APIs
-------------
Four authenticated download endpoints now stream the full pending/history data as Excel (`.xlsx`) attachments:

- `GET /po/pending/download`
  - Streams the pending PO list (`view_order_engine` filters) with planned timestamp, vendor, item, qty, and balance columns.
- `GET /po/history/download`
  - Streams the complete PO history (executed qty is zero or exceeds order qty) with the same columns minus balance.
- `GET /store-indent/pending/download`
  - Exports pending indents (no PO assigned yet) with division, consumer, item, quantity, cost project, and specification metadata.
- `GET /store-indent/history/download`
  - Exports indents that already generated POs; includes PO number, PO qty, and cancellation metadata.

Each download endpoint requires the usual authentication token (same as `/auth/login`). The response headers include `Content-Disposition` so browsers and CLI tools will prompt/save `po-pending-<timestamp>.xlsx`, `po-history-<timestamp>.xlsx`, etc.

Testing / Verification
----------------------
- Use curl/Postman to hit the endpoints shown above.
- Check the `indent` table in AWS RDS to confirm inserts/updates.
- For other Oracle-backed routes, ensure Oracle creds are configured in `.env`.
