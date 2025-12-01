import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth.js';
import { User } from '../types.js';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      token?: string;
    }
  }
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);

  if (!decoded) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  req.token = token;
  // Parse user from token - this is simplified; in production,
  // you'd typically fetch full user from DB to get all fields
  req.user = {
    id: decoded.sub,
    email: decoded.email,
    role: decoded.role,
    full_name: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    last_login: null,
  };

  next();
}

export function adminOnly(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}

export function testerOnly(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== 'tester') {
    res.status(403).json({ error: 'Tester access required' });
    return;
  }

  next();
}
