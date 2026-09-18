import { Router, Request, Response } from 'express';
import { db } from '../db';
import { authenticateToken } from './auth';

export const leadsRouter = Router();

// GET /api/leads - List all leads (supports search, stage filtering)
leadsRouter.get('/', authenticateToken, (req: Request, res: Response) => {
  const { stage, ownerId, source, priority, search } = req.query;

  let leads = db.getLeads();

  if (search && typeof search === 'string' && search.trim()) {
    leads = db.searchLeads(search.trim());
  }

  if (stage && typeof stage === 'string') {
    leads = leads.filter(l => l.stage === stage);
  }

  if (ownerId && typeof ownerId === 'string') {
    leads = leads.filter(l => l.ownerId === ownerId);
  }

  if (source && typeof source === 'string') {
    leads = leads.filter(l => l.source === source);
  }

  if (priority && typeof priority === 'string') {
    leads = leads.filter(l => l.priority === priority);
  }

  return res.json({ leads });
});

// GET /api/leads/search - Global search endpoint
leadsRouter.get('/search', authenticateToken, (req: Request, res: Response) => {
  const q = req.query.q as string;
  if (!q) return res.json({ leads: [] });
  const results = db.searchLeads(q);
  return res.json({ leads: results });
});

// POST /api/leads/check-duplicate - Duplicate prevention
leadsRouter.post('/check-duplicate', authenticateToken, (req: Request, res: Response) => {
  const { name, phone, email, website } = req.body;
  const duplicates = db.checkDuplicates({ name, phone, email, website });
  return res.json({
    hasDuplicates: duplicates.length > 0,
    duplicates
  });
});

// GET /api/leads/:id - Get single lead detail
leadsRouter.get('/:id', authenticateToken, (req: Request, res: Response) => {
  const lead = db.getLeadById(req.params.id);
  if (!lead) {
    return res.status(404).json({ error: 'Lead not found' });
  }

  const tasks = db.getTasks({ leadId: lead.id });
  const outreach = db.getOutreachHistory(lead.id);
  const images = db.getLeadImages(lead.id);
  const notes = db.getLeadNotes(lead.id);
  const stageHistory = db.getStageHistory(lead.id);

  return res.json({
    lead,
    tasks,
    outreach,
    images,
    notes,
    stageHistory
  });
});

// POST /api/leads - Create new lead
leadsRouter.post('/', authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const { name, description, category, industry, city, province, country, address, website, existingWebsiteStatus, googleBusinessUrl, notes, source, priority, contacts, channels, forceCreateReason } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Business name is required' });
  }

  if (!source) {
    return res.status(400).json({ error: 'Lead source is required' });
  }

  // Check duplicate unless user explicitly forced
  if (!forceCreateReason) {
    const dupes = db.checkDuplicates({
      name,
      phone: contacts?.find((c: any) => c.type.includes('phone') || c.type === 'whatsapp')?.value,
      email: contacts?.find((c: any) => c.type.includes('email'))?.value,
      website
    });

    if (dupes.length > 0) {
      return res.status(409).json({
        error: 'Possible duplicate lead found',
        hasDuplicates: true,
        duplicates: dupes
      });
    }
  }

  const lead = db.createLead({
    name: name.trim(),
    description,
    category,
    industry,
    city,
    province,
    country,
    address,
    website,
    existingWebsiteStatus,
    googleBusinessUrl,
    notes,
    source,
    priority,
    createdBy: reqUser.id,
    contacts,
    channels
  });

  return res.status(201).json({ lead });
});

// PATCH /api/leads/:id - Update lead
leadsRouter.patch('/:id', authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const updated = db.updateLead(req.params.id, req.body, reqUser.id);
  if (!updated) {
    return res.status(404).json({ error: 'Lead not found' });
  }
  return res.json({ lead: updated });
});

// POST /api/leads/:id/notes - Add note
leadsRouter.post('/:id/notes', authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Note content cannot be empty' });
  }
  const note = db.addNote(req.params.id, reqUser.id, content.trim());
  return res.status(201).json({ note });
});

// DELETE /api/leads/:id - Delete lead (soft delete)
leadsRouter.delete('/:id', authenticateToken, (req: Request, res: Response) => {
  const reqUser = (req as any).user;
  const { reason } = req.body || {};
  const ok = db.deleteLead(req.params.id, reqUser.id, reason);
  if (!ok) {
    return res.status(404).json({ error: 'Lead not found' });
  }
  return res.json({ success: true, message: 'Lead soft deleted successfully' });
});
