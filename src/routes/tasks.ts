import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticateToken } from './auth';

export const tasksRouter = Router();

// GET /api/tasks - Filter tasks
tasksRouter.get('/', authenticateToken, (req: Request, res: Response) => {
  const { status, assignedTo, taskTypeKey, leadId } = req.query;
  const tasks = db.getTasks({
    status: status as string,
    assignedTo: assignedTo as string,
    taskTypeKey: taskTypeKey as string,
    leadId: leadId as string
  });
  return res.json({ tasks });
});

// GET /api/tasks/my-work - Overview for logged in user
tasksRouter.get('/my-work', authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;

  const available = db.getTasks({ status: 'available' });
  const myActive = db.getTasks({ assignedTo: reqUser.id, status: 'in_progress' });
  const myCompleted = db.getTasks({ assignedTo: reqUser.id, status: 'completed' });
  const followUps = db.getFollowUps(reqUser.id).filter(f => f.status === 'pending');

  return res.json({
    availableTasks: available,
    myActiveTasks: myActive,
    myCompletedTasks: myCompleted,
    followUps
  });
});

// POST /api/tasks/:id/grab - ATOMIC GRAB TASK LOCK
tasksRouter.post('/:id/grab', authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const result = db.grabTask(req.params.id, reqUser.id);

  if (!result.success) {
    return res.status(409).json({ error: result.message });
  }

  return res.json(result);
});

// POST /api/tasks/:id/complete - ATOMIC TASK COMPLETE
tasksRouter.post('/:id/complete', authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const { notes, templateUrl } = req.body;

  const result = db.completeTask(req.params.id, reqUser.id, notes, { templateUrl });

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  return res.json(result);
});

// POST /api/tasks/:id/block - Block task
tasksRouter.post('/:id/block', authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const { reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'Block reason is required' });
  }

  const result = db.blockTask(req.params.id, reqUser.id, reason.trim());
  if (!result.success) {
    return res.status(404).json({ error: 'Task not found' });
  }

  return res.json(result);
});
