import { Router } from 'express';
import { login } from '../controllers/auth.controller.js';

const router = Router();

/**
 * @route   POST /auth/login
 * @desc    Authenticate user and return JWT
 * @access  Public
 */
router.post('/login', login);

export default router;