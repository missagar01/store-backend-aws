// services/user.service.js
import { getPgConnection } from "../config/auth.js"; // Corrected path to PG connection utility

/**
 * Fetch user basic info from PostgreSQL 'users' table by employee_id.
 * @param {string} employeeId - The employee ID to look up.
 * @returns {Promise<{ ok: boolean, user?: object, reason?: string }>}
 */
export async function getUserByEmployeeId(employeeId) {
  if (!employeeId) {
    return { ok: false, reason: "missing_employee_id" };
  }
  let client;
  try {
    client = await getPgConnection();
    const queryText = `
      SELECT user_name, employee_id, role
      FROM users
      WHERE employee_id = $1
      LIMIT 1;
    `;
    const result = await client.query(queryText, [employeeId]);
    if (result.rows.length === 0) {
      return { ok: false, reason: "not_found" };
    }
    const user = result.rows[0];
    return {
      ok: true,
      user: {
        employee_id: user.employee_id,
        user_name: user.user_name,
        user_access: user.role, // Assuming 'role' in PG maps to 'user_access'
      },
    };
  } catch (error) {
    console.error('[user.service.js] Error fetching user by employee ID:', error);
    throw new Error(error.message || "Failed to fetch user data.");
  } finally {
    if (client) {
      client.release();
    }
  }
}
