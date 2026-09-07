import { Router } from 'express';
import { z } from 'zod';
import { AuthController } from './auth.controller.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email('Please provide a valid email address').trim().toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required').trim(),
  household_name: z.string().trim().optional().nullable().or(z.literal('')),
});

const loginSchema = z.object({
  email: z.string().email('Please provide a valid email address').trim().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

router.get('/system-status', AuthController.getSystemStatus);
router.post('/register', validate({ body: registerSchema }), AuthController.register);
router.post('/login', validate({ body: loginSchema }), AuthController.login);
router.get('/me', authenticate, AuthController.me);

export const authRoutes = router;
