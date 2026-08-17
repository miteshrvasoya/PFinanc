import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { QueryHelper } from '../database/queryHelper.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  status: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid authorization token',
        },
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as { id: string; email: string };

    const user = await QueryHelper.queryOne<AuthenticatedUser>(
      `SELECT id, email, name, avatar_url, status FROM users WHERE id = $1 AND status = 'ACTIVE'`,
      [decoded.id]
    );

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account is invalid or inactive',
        },
      });
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: error.message || 'Token verification failed',
      },
    });
  }
}
