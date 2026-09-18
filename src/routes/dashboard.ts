import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticateToken } from './auth';

export const dashboardRouter = Router();

// GET /api/dashboard - Main operational KPIs and pipeline stats
dashboardRouter.get('/', authenticateToken, (req: Request, res: Response) => {
  const leads = db.getLeads();
  const tasks = db.getTasks();

  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.stage === 'new_lead' || l.stage === 'captured').length;
  const templatePending = leads.filter(l => l.stage === 'template_pending' || l.stage === 'template_in_progress').length;
  const readyForOutreach = leads.filter(l => l.stage === 'ready_for_outreach' || l.stage === 'template_completed').length;
  const outreachSent = leads.filter(l => l.stage === 'outreach_sent' || l.stage === 'outreach_in_progress').length;
  const responses = leads.filter(l => l.stage === 'response_received' || l.stage === 'awaiting_response').length;
  const interested = leads.filter(l => l.stage === 'interested' || l.stage === 'negotiation').length;
  const won = leads.filter(l => l.stage === 'won' || l.stage === 'website_production' || l.stage === 'completed').length;

  const overdueFollowUps = db.getFollowUps().filter(f => f.status === 'pending' && new Date(f.dueDate).getTime() < Date.now()).length;

  // Funnel analytics
  const funnel = [
    { stage: 'Captured', count: leads.filter(l => l.stage !== 'new_lead').length },
    { stage: 'Templates Completed', count: leads.filter(l => ['ready_for_outreach', 'outreach_sent', 'response_received', 'interested', 'won', 'completed'].includes(l.stage)).length },
    { stage: 'Outreach Sent', count: leads.filter(l => ['outreach_sent', 'response_received', 'interested', 'won', 'completed'].includes(l.stage)).length },
    { stage: 'Responses Received', count: leads.filter(l => ['response_received', 'interested', 'won', 'completed'].includes(l.stage)).length },
    { stage: 'Interested Leads', count: leads.filter(l => ['interested', 'won', 'completed'].includes(l.stage)).length },
    { stage: 'Clients Won', count: won }
  ];

  // Lead Source conversion breakdown
  const sourcePerformance: Record<string, { total: number; interested: number; won: number }> = {};
  for (const l of leads) {
    const src = l.source || 'Other';
    if (!sourcePerformance[src]) {
      sourcePerformance[src] = { total: 0, interested: 0, won: 0 };
    }
    sourcePerformance[src].total++;
    if (['interested', 'negotiation', 'won', 'completed'].includes(l.stage)) {
      sourcePerformance[src].interested++;
    }
    if (['won', 'completed'].includes(l.stage)) {
      sourcePerformance[src].won++;
    }
  }

  // Workload bottlenecks
  const unassignedTasks = tasks.filter(t => t.status === 'available').length;
  const activeTasks = tasks.filter(t => t.status === 'in_progress').length;
  const blockedTasks = tasks.filter(t => t.status === 'blocked').length;

  return res.json({
    kpis: {
      totalLeads,
      newLeads,
      templatePending,
      readyForOutreach,
      outreachSent,
      responses,
      interested,
      won,
      overdueFollowUps
    },
    funnel,
    sourcePerformance,
    workload: {
      unassignedTasks,
      activeTasks,
      blockedTasks
    },
    recentActivity: db.getActivityLogs(20)
  });
});

// GET /api/dashboard/personal-stats
dashboardRouter.get('/personal-stats', authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const stats = db.getUserEarnings(reqUser.id);
  return res.json(stats);
});

// GET /api/dashboard/team-performance (Admin/Manager)
dashboardRouter.get('/team-performance', authenticateToken, (req: Request, res: Response) => {
  const teamStats = db.getTeamPerformance();
  return res.json({ teamPerformance: teamStats });
});
