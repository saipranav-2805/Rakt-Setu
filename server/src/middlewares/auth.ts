import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User.js';
import { UserRole } from '../types/index.js';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication token required' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_ACCESS_SECRET || 'raktsetu_default_dev_secret_32_chars_long!';

  try {
    const decoded = jwt.verify(token, secret) as { userId: string; role: UserRole };
    User.findById(decoded.userId)
      .then((user) => {
        if (!user || user.status === 'banned') {
          res.status(403).json({ success: false, error: 'User account inactive or banned' });
          return;
        }
        req.user = user;
        next();
      })
      .catch((err) => {
        res.status(500).json({ success: false, error: 'Internal auth error' });
      });
  } catch (err: any) {
    res.status(401).json({ success: false, error: 'Invalid or expired access token' });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Insufficient permissions for this resource' });
      return;
    }
    next();
  };
}
