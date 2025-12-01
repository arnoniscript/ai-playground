import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { AuthToken, User } from '../types.js';

export function generateToken(user: User, expiresIn = '7d'): string {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, config.auth.jwtSecret as string, {
    expiresIn,
    algorithm: 'HS256',
  } as any);
}

export function verifyToken(token: string): AuthToken | null {
  try {
    return jwt.verify(token, config.auth.jwtSecret) as AuthToken;
  } catch {
    return null;
  }
}

export function validateEmailDomain(email: string): boolean {
  const domain = email.split('@')[1];
  return domain === config.auth.allowedEmailDomain;
}

export function generateOTP(): string {
  return Math.random().toString().slice(2, 8);
}
