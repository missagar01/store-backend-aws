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

Scripts
-------
- `npm start` – runs `src/server.js`
- `npm run dev` – nodemon watcher for development

Indent APIs
-----------

### 1. Submit Indent – `POST /indent`
Creates a new indent entry. `form_type` decides the auto-generated `request_number`
prefix (`IND01`, `IND02`, … for INDENT; `REQ01`, `REQ02`, … for REQUISITION).

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

If the `request_number` doesn’t exist, the service returns a 404 with
`{ "success": false, "error": "Indent with request_number … not found" }`.

Testing / Verification
----------------------
- Use curl/Postman to hit the endpoints shown above.
- Check the `indent` table in AWS RDS to confirm inserts/updates.
- For other Oracle-backed routes, ensure Oracle creds are configured in `.env`.
