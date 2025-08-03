import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthenticatedRequest extends Request {
  user?: { id: number; username: string; role: string; };
}

const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  console.log('[MIDDLEWARE - authenticateToken] Running...');
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
if (token == null) {
  console.log('[MIDDLEWARE - authenticateToken] FAILED: No token found.');
  return res.sendStatus(401);
}

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('[MIDDLEWARE - authenticateToken] FAILED: JWT_SECRET not configured.');
    return res.status(500).json({ message: 'JWT Secret not configured.' });
  }

  jwt.verify(token, secret, (err: unknown, user: unknown) => {
    if (err) {
      console.log('[MIDDLEWARE - authenticateToken] FAILED: Token is invalid or expired.');
      return res.sendStatus(403);
    }
    req.user = user as { id: number; username: string; role: string; };
    console.log('[MIDDLEWARE - authenticateToken] SUCCESS: User authenticated:', req.user);
    next();
  });
};

const isAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  console.log(`[MIDDLEWARE - isAdmin] Checking role for user:`, req.user);
  if (req.user && req.user.role === 'admin') {
    console.log('[MIDDLEWARE - isAdmin] SUCCESS: User is an admin.');
    next();
  } else {
    console.log(`[MIDDLEWARE - isAdmin] FAILED: User role is '${req.user?.role}', not 'admin'.`);
    res.status(403).json({ message: 'Forbidden: Requires admin role.' });
  }
};

module.exports = { authenticateToken, isAdmin };