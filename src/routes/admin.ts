import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticateToken } from './auth';

export const adminRouter = Router();

// Admin permission check middleware
function requireAdmin(req: Request, res: Response, next: Function) {
  const reqUser = (req as any).user;
  if (!reqUser || reqUser.role !== 'admin') {
    return res.status(403).json({ error: 'Administrative privileges required' });
  }
  next();
}

// GET /api/admin/settings
adminRouter.get('/settings', authenticateToken, (req: Request, res: Response) => {
  const settings = db.getSystemSettings();
  const taskTypes = db.getTaskTypes();
  return res.json({ settings, taskTypes });
});

// PATCH /api/admin/task-rates/:id
adminRouter.patch('/task-rates/:id', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const { rate } = req.body;

  if (typeof rate !== 'number' || rate < 0) {
    return res.status(400).json({ error: 'Valid numeric rate required' });
  }

  const ok = db.updateTaskTypeRate(req.params.id, rate, reqUser.id);
  if (!ok) {
    return res.status(404).json({ error: 'Task type not found' });
  }

  return res.json({ success: true, message: 'Task rate updated successfully' });
});

// POST /api/admin/lead-sources
adminRouter.post('/lead-sources', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const { source } = req.body;

  if (!source || !source.trim()) {
    return res.status(400).json({ error: 'Lead source name is required' });
  }

  const ok = db.addLeadSource(source.trim(), reqUser.id);
  if (!ok) {
    return res.status(400).json({ error: 'Lead source already exists' });
  }

  return res.status(201).json({ success: true, leadSources: db.getSystemSettings().leadSources });
});

// POST /api/admin/users - Admin create user
adminRouter.post('/users', authenticateToken, requireAdmin, (req: Request, res: Response) => {
  const { email, displayName, role, phone, bio, password } = req.body;

  if (!email || !displayName || !password) {
    return res.status(400).json({ error: 'Email, display name, and password are required' });
  }

  const existing = db.getUserByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'User with this email already exists' });
  }

  const user = db.createUser(
    {
      email,
      displayName,
      role: role || 'member',
      status: 'active',
      phone,
      bio,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayName)}`
    },
    password
  );

  return res.status(201).json({ user });
});
