import { Router } from 'express';
import { authController } from '../controllers/authController.js';

const router = Router();

/**
 * POST /api/auth/login
 * body: { email, password }
 */
router.post('/login', authController.login);
router.get('/check-email', authController.checkEmail);
router.post('/send-otp', authController.sendOtp);
router.post('/verify-otp', authController.verifyOtp);
router.post('/set-password', authController.setPassword);

export default router;
