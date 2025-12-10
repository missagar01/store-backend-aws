import * as authService from '../services/auth.service.js';

/**
 * Handles user login requests.
 * Expects user_name, employee_id, and password in the request body.
 */
export async function login(req, res) {
  const { user_name, employee_id, password } = req.body;

  if (!password || (!user_name && !employee_id)) {
    return res.status(400).json({ success: false, message: 'Password and either user name or employee ID are required.' });
  }

  const result = await authService.loginUser(user_name, employee_id, password);

  if (result.success) {
    res.status(200).json({ success: true, token: result.token, user: result.user });
  } else {
    // Use 401 for unauthorized (invalid credentials)
    res.status(401).json({ success: false, message: result.message });
  }
}