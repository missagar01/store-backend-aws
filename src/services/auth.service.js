import { supabase } from "../config/supabaseClient.js";
import jwt from "jsonwebtoken";

/**
 * Authenticate a user stored in a Supabase table.
 * Accepts either a username (userName) or an employee id (employeeId) together with a password.
 * Returns an object { ok: boolean, user?, session?, reason? }.
 */
export async function authenticateWithSupabaseTable(userName, password, employeeId) {
  // sanitize inputs
  if (typeof userName === "string") userName = userName.trim();
  if (typeof employeeId === "string") employeeId = employeeId.trim();
  if (typeof password === "string") password = password.trim();

  const usersTable = process.env.SUPABASE_USERS_TABLE || "users";
  const usernameCol = process.env.SUPABASE_USERS_USERNAME_COLUMN || "user_name";
  const passwordCol = process.env.SUPABASE_USERS_PASSWORD_COLUMN || "password";
  const employeeIdCol = process.env.SUPABASE_USERS_EMPLOYEE_ID_COLUMN || "employee_id";

  // require at least one identity (username or employee id) and a password
  if (!userName && !employeeId) return { ok: false, reason: "missing_identity" };
  if (!password) return { ok: false, reason: "missing_password" };

  // Build query: always check password, and then add identity-specific filters.
  let query = supabase
    .from(usersTable)
    .select(`id, ${usernameCol}, ${passwordCol}, status, role, ${employeeIdCol}`)
    .eq(passwordCol, password);

  if (userName) query = query.eq(usernameCol, userName);
  if (employeeId) query = query.eq(employeeIdCol, employeeId);

  const { data: rows, error } = await query.limit(1);

  if (error) throw new Error(error.message);
  if (!rows || rows.length === 0) return { ok: false, reason: "supabase_not_found_or_password_mismatch" };

  const row = rows[0];

  return {
    ok: true,
    user: {
      id: row.id,
      email: row.email || null,
      username: row[usernameCol],
      employee_id: row[employeeIdCol],
      // include role/user access if available in the row
      role: row.role || null,
    },
    session: null,
  };
}

/**
 * Issue a backend JWT for the given user object.
 * Payload will contain sub (user id), email and username.
 */
export function issueJwt(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not configured");

  const payload = {
    sub: user?.id ?? null,
    email: user?.email ?? null,
    username: user?.username ?? null,
    employee_id: user?.employee_id ?? null,
    role: user?.role ?? null,
  };

  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
    issuer: process.env.JWT_ISSUER || "store-backend",
  });
}

export async function logoutUser(token) {
  // you can add blacklist logic here later
  if (!token) {
    return {
      ok: true,
      message: "No token provided. User already logged out or not logged in.",
    };
  }

  return {
    ok: true,
    message: "Logout successful. Remove token on client.",
  };
}
