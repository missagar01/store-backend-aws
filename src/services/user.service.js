// services/user.service.js
import { supabase } from "../config/supabaseClient.js";

const USERS_TABLE = process.env.SUPABASE_USERS_TABLE || "users";
const EMPLOYEE_ID_COL = process.env.SUPABASE_USERS_EMPLOYEE_ID_COLUMN || "employee_id";
const USERNAME_COL = process.env.SUPABASE_USERS_USERNAME_COLUMN || "user_name";
const USER_ACCESS_COL = process.env.SUPABASE_USERS_ACCESS_COLUMN || "user_access";

/**
 * Fetch user basic info from Supabase table by employee_id.
 * Returns { ok: true, user } OR { ok: false, reason }
 */
export async function getUserByEmployeeId(employeeId) {
  if (!employeeId) {
    return { ok: false, reason: "missing_employee_id" };
  }

  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select(`${USERNAME_COL}, ${USER_ACCESS_COL}, ${EMPLOYEE_ID_COL}`)
    .eq(EMPLOYEE_ID_COL, employeeId)
    .limit(1)
    .maybeSingle();

  if (error) {
    // forward error up
    throw new Error(error.message);
  }

  if (!data) {
    return { ok: false, reason: "not_found" };
  }

  return {
    ok: true,
    user: {
      employee_id: data[EMPLOYEE_ID_COL],
      user_name: data[USERNAME_COL],
      user_access: data[USER_ACCESS_COL],
    },
  };
}
