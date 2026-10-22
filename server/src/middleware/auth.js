import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { User } from '../models/User.js';
import { forbidden, unauthorized } from '../lib/errors.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

export async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) throw unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw unauthorized('Session expired or invalid, please log in again');
  }

  // Look the user up on every request so deleted users and role changes take effect immediately.
  const user = await User.findById(payload.sub);
  if (!user) throw unauthorized();
  req.user = user;
  next();
}

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) throw forbidden();
  next();
};

// Blocks the public demo accounts from changing shared data.
export function blockDemo(req, _res, next) {
  if (req.user?.isDemo) throw forbidden('The demo admin account is read-only');
  next();
}
