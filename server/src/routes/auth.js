import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { User } from '../models/User.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { conflict, unauthorized } from '../lib/errors.js';
import { config } from '../config.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.env === 'test' ? 1000 : 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again in a few minutes' },
});

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

router.post('/register', authLimiter, validate(registerSchema), async (req, res) => {
  const { name, email, password } = req.valid.body;
  if (await User.exists({ email })) throw conflict('An account with that email already exists');

  // Role is never taken from the request body: everyone signs up as a customer.
  const user = await User.create({ name, email, passwordHash: await User.hashPassword(password) });
  res.status(201).json({ token: signToken(user), user });
});

router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  const { email, password } = req.valid.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  // Same message for unknown email and wrong password, so accounts can't be enumerated.
  if (!user || !(await user.checkPassword(password))) throw unauthorized('Incorrect email or password');
  res.json({ token: signToken(user), user });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
