// controllers/user.controller.js
import { getUserByEmployeeId } from "../services/user.service.js";

/**
 * GET /user/:id
 * :id here is employee_id (e.g. S09203)
 */
export async function getUser(req, res) {
  const employeeId = req.params.id;

  try {
    const result = await getUserByEmployeeId(employeeId);
    if (!result.ok) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({
      success: true,
      data: result.user,
    });
  } catch (err) {
    console.error("getUser error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * optional: GET /user/me
 * if you want to read employee_id from JWT (req.user injected by auth middleware)
 */
export async function getMe(req, res) {
  // this assumes your auth middleware set req.user from JWT
  const employeeId = req.user?.employee_id;
  if (!employeeId) {
    return res.status(400).json({ error: "No employee_id in token" });
  }

  try {
    const result = await getUserByEmployeeId(employeeId);
    if (!result.ok) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({
      success: true,
      data: result.user,
    });
  } catch (err) {
    console.error("getMe error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
