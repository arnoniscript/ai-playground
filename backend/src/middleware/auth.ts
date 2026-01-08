import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth.js';
import { User } from '../types.js';
import { db } from '../db/client.js';

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

  // Fetch full user from database to check status
  db.from('users')
    .select('*')
    .eq('id', decoded.sub)
    .single()
    .then(({ data: user, error }) => {
      if (error || !user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }

      // Check if user is blocked
      if (user.status === 'blocked') {
        const reasonMessage = user.blocked_reason 
          ? `Motivo: ${user.blocked_reason}` 
          : 'Entre em contato com um administrador.';
        
        res.status(403).json({ 
          error: 'Conta bloqueada',
          message: `Sua conta foi bloqueada. ${reasonMessage}`,
          blocked_at: user.blocked_at,
          blocked_reason: user.blocked_reason
        });
        return;
      }

      req.token = token;
      req.user = user;
      next();
    })
    .catch((err) => {
      console.error('Error fetching user in authMiddleware:', err);
      res.status(500).json({ error: 'Internal server error' });
    });
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

export function clientOnly(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== 'client') {
    res.status(403).json({ error: 'Client access required' });
    return;
  }

  next();
}

// Allow either role
export function adminOrManager(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'manager')) {
    res.status(403).json({ error: 'Admin or manager access required' });
    return;
  }

  next();
}

// Export aliases for compatibility
export const authenticateToken = authMiddleware;
export const requireAdmin = adminOnly;
export const requireClient = clientOnly;
