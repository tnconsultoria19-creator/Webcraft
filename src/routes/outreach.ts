import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticateToken } from './auth';

export const outreachRouter = Router();

// GET /api/outreach/lead/:leadId - Get outreach history
outreachRouter.get('/lead/:leadId', authenticateToken, (req: Request, res: Response) => {
  const history = db.getOutreachHistory(req.params.leadId);
  return res.json({ outreach: history });
});

// POST /api/outreach - Record outreach attempt
outreachRouter.post('/', authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const { leadId, channel, messageUsed, status, responseType, responseNotes, nextAction, followUpDate } = req.body;

  if (!leadId || !channel || !status) {
    return res.status(400).json({ error: 'leadId, channel, and status are required' });
  }

  const attempt = db.recordOutreach({
    leadId,
    channel,
    sentBy: reqUser.id,
    messageUsed,
    status,
    responseType,
    responseNotes,
    nextAction,
    followUpDate
  });

  return res.status(201).json({ outreach: attempt });
});
