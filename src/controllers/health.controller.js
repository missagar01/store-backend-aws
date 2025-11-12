import { supabase } from "../config/supabaseClient.js";

export async function supabaseHealth(req, res) {
  try {
    const usersTable = process.env.SUPABASE_USERS_TABLE;
    if (!usersTable) {
      return res.status(400).json({
        ok: false,
        error: "SUPABASE_USERS_TABLE not configured",
      });
    }

    const { error, count } = await supabase
      .from(usersTable)
      .select("*", { count: "exact", head: true });

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.json({ ok: true, table: usersTable, count: count ?? 0 });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}



