import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'quizforge-super-secret-jwt-key-2026';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    displayName: string;
  };
}

export function generateToken(user: { id: string; email: string; displayName: string }): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = {
        id: decoded.id,
        email: decoded.email,
        displayName: decoded.displayName
      };
      return next();
    } catch (err) {
      // Token invalid or expired
    }
  }

  // Fallback to default demo user if unauthenticated
  req.user = {
    id: 'user_demo_1',
    email: 'demo@quizforge.io',
    displayName: 'Demo Scholar'
  };
  next();
}
