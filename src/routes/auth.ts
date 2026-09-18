import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db';

export const authRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'webcraft_studio_jwt_secret_key';

// Middleware to verify JWT token
export function authenticateToken(req: Request, res: Response, next: Function) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired session token' });
    (req as any).user = user;
    next();
  });
}

// POST /api/auth/login
authRouter.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = db.getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: 'User account is inactive. Please contact admin.' });
  }

  const isValid = db.verifyUserPassword(user.id, password);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, displayName: user.displayName },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl,
      phone: user.phone,
      bio: user.bio
    }
  });
});

// GET /api/auth/me
authRouter.get('/me', authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const user = db.getUserById(reqUser.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.json({ user });
});

// GET /api/auth/users
authRouter.get('/users', authenticateToken, (req: Request, res: Response) => {
  const users = db.getUsers();
  return res.json({ users });
});
