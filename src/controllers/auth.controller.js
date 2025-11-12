import {    logoutUser, issueJwt, authenticateWithSupabaseTable } from "../services/auth.service.js";


export async function loginSupabase(req, res) {
  let { user_name, employee_id, password } = req.body || {};
  if (typeof user_name === "string") user_name = user_name.trim();
  if (typeof employee_id === "string") employee_id = employee_id.trim();
  if (typeof password === "string") password = password.trim();
  // Accept either user_name OR employee_id together with password
  if ((!user_name && !employee_id) || !password) {
    return res.status(400).json({ error: "user_name or employee_id and password are required" });
  }

  try {
    const supaRes = await authenticateWithSupabaseTable(user_name || null, password, employee_id || null);
    if (!supaRes || !supaRes.ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const usernameForToken = supaRes.user?.username || user_name || employee_id;
    // pass employee_id and role into token payload
    const token = issueJwt({
      id: supaRes.user?.id || null,
      email: null,
      username: usernameForToken,
      employee_id: supaRes.user?.employee_id || null,
      role: supaRes.user?.role || null,
    });

    return res.json({
      success: true,
      // user: {
      //   id: supaRes.user?.id || null,
      //   email: null,
      //   username: usernameForToken,
      //   employee_id: supaRes.user?.employee_id || null,
      //   role: supaRes.user?.role || null,
      // },
      // session: null,
      token,
    });
  } catch (err) {
    console.error("Login Supabase error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function logout(req, res) {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    const result = await logoutUser(token);

    return res.status(result.ok ? 200 : 400).json({
      success: result.ok,
      message: result.message,
    });
  } catch (err) {
    console.error("Logout error:", err);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
}

