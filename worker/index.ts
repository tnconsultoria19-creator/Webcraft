/// <reference types="@cloudflare/workers-types" />
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify } from 'hono/jwt';
import { GoogleGenAI } from '@google/genai';

export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  KV?: KVNamespace;
  ASSETS?: Fetcher;
  GEMINI_API_KEY?: string;
  JWT_SECRET?: string;
}

export interface JwtUserPayload {
  id: string;
  email: string;
  role: string;
  displayName?: string;
  [key: string]: any;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors());

// Health check
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString(), platform: 'cloudflare-worker' });
});

// Helper for JWT Secret
const getJwtSecret = (env: Env) => env.JWT_SECRET || 'webcraft_studio_jwt_secret_key';

// Helper for JWT Auth Middleware
const authMiddleware = async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return c.json({ error: 'Authentication required' }, 401);
  }
  try {
    const payload = await verify(token, getJwtSecret(c.env), 'HS256');
    c.set('jwtPayload', payload);
    await next();
  } catch (err) {
    return c.json({ error: 'Invalid or expired session token' }, 403);
  }
};

// ==================== AUTH ROUTES ====================

app.post('/api/auth/login', async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  // Fetch user from D1 or fallback to default admin
  let user: any = null;
  if (c.env.DB) {
    const res = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
    user = res;
  }

  if (!user) {
    // Default demo fallback for bootstrapping
    if (email === 'admin@webcraft.com' && password === 'admin123') {
      user = {
        id: 'usr_admin_1',
        email: 'admin@webcraft.com',
        display_name: 'Admin Olisbel',
        role: 'admin',
        status: 'active',
        avatar_url: 'https://ui-avatars.com/api/?name=Admin+Olisbel&background=245F6B&color=fff',
        phone: '+27821234567',
        bio: 'WebCraft Studio Operations Lead'
      };
    } else {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
  }

  if (user.status !== 'active') {
    return c.json({ error: 'User account is inactive. Please contact admin.' }, 403);
  }

  const token = await sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.display_name || user.displayName,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 days
    },
    getJwtSecret(c.env),
    'HS256'
  );

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name || user.displayName,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatar_url || user.avatarUrl,
      phone: user.phone,
      bio: user.bio
    }
  });
});

app.get('/api/auth/me', authMiddleware, async (c) => {
  const payload = c.get('jwtPayload') as JwtUserPayload;
  if (c.env.DB) {
    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(payload.id).first();
    if (user) {
      return c.json({ user });
    }
  }
  return c.json({ user: payload });
});

app.get('/api/auth/users', authMiddleware, async (c) => {
  if (c.env.DB) {
    const { results } = await c.env.DB.prepare('SELECT id, email, display_name as displayName, role, status, avatar_url as avatarUrl, phone, bio FROM users').all();
    return c.json({ users: results });
  }
  return c.json({ users: [] });
});

// ==================== AI SALES ASSISTANT ROUTE ====================

app.post('/api/ai/sales-assistant', async (c) => {
  try {
    const { rawContent, senderName = 'Olisbel', portfolioUrl = 'https://webcraftstudio.com', previewUrl = '' } = await c.req.json();

    if (!rawContent || typeof rawContent !== 'string') {
      return c.json({ error: 'rawContent string is required' }, 400);
    }

    const effectivePreviewUrl = previewUrl || '[Insert Link to Preview]';
    const effectivePortUrl = portfolioUrl || 'https://webcraftstudio.com';
    const effectiveSender = senderName || 'Olisbel';

    const systemInstruction = `You are an expert sales assistant for a freelance web designer. Your task is to take unstructured information about a business (provided via JSON or text) and generate two concise, polite outreach messages: one in English and one in Angolan Portuguese.

For every business processed, extract or identify:
- Person/Business Name ([Name])
- Whether they need a website or a redesign.

Follow these exact constraints for the outputs:
1. Tone: Formal yet polite, direct, but opening with a natural context-setting sentence.
2. Structure:
   - Mention finding their business and noticing they don't have a website yet (or need an upgrade).
   - Point to a placeholder link for the design concept.
   - Present the special pricing offer.
3. Pricing & Currency by Region/Language:
   - English version (South Africa / general): R650 per year, payable in 3 installments.
   - Portuguese version (Angola): 30,000 Kz per year, payable in 3 installments (use natural Angolan Portuguese phrasing, e.g., "30.000 Kz/ano pagos em 3 prestações").

Output your response clearly separated into English and Portuguese formats using the templates below.

---
### English Version Template:
Hi [Name],

I came across [Business Name] and noticed you don't have a website yet, so I put together a modern design concept for you:

👉 ${effectivePreviewUrl}

If you like the direction, I'm currently running a special to get you online for R650/year (payable in 3 installments), and I can set everything up for you. 

Best,  
${effectiveSender}  
🌐 ${effectivePortUrl}

---
### Portuguese Version Template:
Olá [Name],

Vi a [Business Name] e notei que ainda não têm um site, por isso criei um conceito de design moderno para vocês:

👉 ${effectivePreviewUrl}

Se gostarem da direção, estou com uma promoção especial para vos colocar online por apenas 30.000 Kz/ano (pagos em 3 prestações), e posso tratar de tudo para vocês.

Melhores cumprimentos,  
${effectiveSender}  
🌐 ${effectivePortUrl}

Return ONLY valid JSON adhering strictly to this schema:
{
  "businessName": "Extracted business name or candidate name",
  "contactPerson": "Extracted contact person name, or same as business name if individual",
  "websiteNeed": "needs_website" or "needs_redesign",
  "category": "Extracted industry/service category",
  "country": "Extracted or inferred country (e.g. South Africa, Angola, etc.)",
  "city": "Extracted city if available",
  "phone": "Extracted phone or whatsapp number if available",
  "email": "Extracted email if available",
  "sourceUrl": "Extracted listing URL if available",
  "englishMessage": "Full English outreach pitch string",
  "portugueseMessage": "Full Angolan Portuguese outreach pitch string"
}`;

    const apiKey = c.env.GEMINI_API_KEY || '';
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: `Here is the unstructured business info:\n\n${rawContent}`,
          config: {
            systemInstruction,
            responseMimeType: 'application/json'
          }
        });

        const textResponse = response.text?.trim() || '{}';
        const parsed = JSON.parse(textResponse);
        return c.json({ success: true, data: parsed });
      } catch (geminiError: any) {
        console.warn('Gemini API call failed, using deterministic fallback:', geminiError.message);
      }
    }

    // Deterministic fallback extraction
    let candidateName = 'Business Owner';
    let candidateContact = 'Business Owner';
    let candidateCategory = 'General Services';
    let candidateCity = '';
    let candidatePhone = '';
    let candidateEmail = '';
    let needsRedesign = false;

    const emailMatch = rawContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) candidateEmail = emailMatch[0];

    const phoneMatch = rawContent.match(/(?:\+?[\d\s()-]{7,15})/);
    if (phoneMatch) candidatePhone = phoneMatch[0].trim();

    if (/redesign|upgrade|old site|slow site|outdated/i.test(rawContent)) {
      needsRedesign = true;
    }

    try {
      const jsonObj = JSON.parse(rawContent);
      if (jsonObj.name || jsonObj.businessName) candidateName = jsonObj.name || jsonObj.businessName;
      if (jsonObj.contactPerson) candidateContact = jsonObj.contactPerson;
      if (jsonObj.category) candidateCategory = jsonObj.category;
      if (jsonObj.city) candidateCity = jsonObj.city;
      if (jsonObj.phone) candidatePhone = jsonObj.phone;
      if (jsonObj.email) candidateEmail = jsonObj.email;
    } catch {
      const lines = rawContent.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        candidateName = lines[0].replace(/^(Business Name:|Name:|Empresa:|Nome:)/i, '').trim();
        candidateContact = candidateName;
      }
    }

    const engSentence = needsRedesign
      ? "noticed your website could use a modern upgrade, so I put together a fresh design concept for you:"
      : "noticed you don't have a website yet, so I put together a modern design concept for you:";

    const ptSentence = needsRedesign
      ? "notei que o vosso site beneficiaria de uma modernização, por isso criei um novo conceito de design para vocês:"
      : "notei que ainda não têm um site, por isso criei um conceito de design moderno para vocês:";

    const englishMessage = `Hi ${candidateContact},\n\nI came across ${candidateName} and ${engSentence}\n\n👉 ${effectivePreviewUrl}\n\nIf you like the direction, I'm currently running a special to get you online for R650/year (payable in 3 installments), and I can set everything up for you.\n\nBest,\n${effectiveSender}\n🌐 ${effectivePortUrl}`;

    const portugueseMessage = `Olá ${candidateContact},\n\nVi a ${candidateName} e ${ptSentence}\n\n👉 ${effectivePreviewUrl}\n\nSe gostarem da direção, estou com uma promoção especial para vos colocar online por apenas 30.000 Kz/ano (pagos em 3 prestações), e posso tratar de tudo para vocês.\n\nMelhores cumprimentos,\n${effectiveSender}\n🌐 ${effectivePortUrl}`;

    return c.json({
      success: true,
      data: {
        businessName: candidateName,
        contactPerson: candidateContact,
        websiteNeed: needsRedesign ? 'needs_redesign' : 'needs_website',
        category: candidateCategory,
        country: 'South Africa',
        city: candidateCity,
        phone: candidatePhone,
        email: candidateEmail,
        englishMessage,
        portugueseMessage
      }
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Error processing sales request' }, 500);
  }
});

// ==================== LEADS API (D1 INTEGRATION) ====================

app.get('/api/leads', authMiddleware, async (c) => {
  if (c.env.DB) {
    const { results } = await c.env.DB.prepare('SELECT * FROM leads WHERE deleted_at IS NULL ORDER BY created_at DESC').all();
    return c.json({ leads: results });
  }
  return c.json({ leads: [] });
});

app.post('/api/leads/check-duplicate', authMiddleware, async (c) => {
  const { name, phone, email, projectDomainName } = await c.req.json();
  const matches: any[] = [];

  if (c.env.DB) {
    if (projectDomainName) {
      const { results } = await c.env.DB.prepare(
        'SELECT * FROM leads WHERE (project_domain_name = ? OR chatgpt_package LIKE ?) AND deleted_at IS NULL'
      ).bind(projectDomainName, `%${projectDomainName}%`).all();
      results.forEach((l: any) => {
        matches.push({
          leadId: l.id,
          leadName: l.name,
          stage: l.stage,
          field: 'project_domain',
          matchedValue: projectDomainName,
          reason: `Exact Project Domain Name match: ${projectDomainName}`
        });
      });
    }

    if (name) {
      const { results } = await c.env.DB.prepare(
        'SELECT * FROM leads WHERE LOWER(name) = LOWER(?) AND deleted_at IS NULL'
      ).bind(name).all();
      results.forEach((l: any) => {
        if (!matches.some(m => m.leadId === l.id)) {
          matches.push({
            leadId: l.id,
            leadName: l.name,
            stage: l.stage,
            field: 'name',
            matchedValue: name,
            reason: `Business name match: "${name}"`
          });
        }
      });
    }
  }

  return c.json({
    isDuplicate: matches.length > 0,
    matches
  });
});

app.get('/api/leads/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  if (c.env.DB) {
    const lead = await c.env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first();
    if (!lead) return c.json({ error: 'Lead not found' }, 404);
    return c.json({ lead });
  }
  return c.json({ error: 'Database not initialized' }, 500);
});

app.post('/api/leads', authMiddleware, async (c) => {
  const body = await c.req.json();
  const payload = c.get('jwtPayload') as JwtUserPayload;
  const id = `lead_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  if (c.env.DB) {
    await c.env.DB.prepare(`
      INSERT INTO leads (
        id, name, description, category, industry, city, province, country, address,
        website, existing_website_status, google_business_url, source_url, source_id,
        contact_person, email, phone, status, stage, priority, estimated_value,
        assigned_to, template_url, preview_url, working_url, project_domain_name,
        chatgpt_package, outreach_count, owner_id, owner_name, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      body.name || 'New Client',
      body.description || null,
      body.category || null,
      body.industry || null,
      body.city || null,
      body.province || null,
      body.country || 'South Africa',
      body.address || null,
      body.website || null,
      body.existingWebsiteStatus || 'no_website',
      body.googleBusinessUrl || null,
      body.sourceUrl || null,
      body.sourceId || null,
      body.contactPerson || null,
      body.email || null,
      body.phone || null,
      'new',
      'new_lead',
      body.priority || 'medium',
      body.estimatedValue || 650,
      body.assignedTo || null,
      body.templateUrl || null,
      body.previewUrl || null,
      body.workingUrl || null,
      body.projectDomainName || null,
      body.chatgptPackage ? JSON.stringify(body.chatgptPackage) : null,
      0,
      payload.id,
      payload.displayName || 'User',
      now,
      now
    ).run();

    const lead = await c.env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first();
    return c.json({ lead }, 201);
  }

  return c.json({ lead: { id, ...body, createdAt: now, updatedAt: now } }, 201);
});

app.patch('/api/leads/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  const now = new Date().toISOString();

  if (c.env.DB) {
    const existing = await c.env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first();
    if (!existing) return c.json({ error: 'Lead not found' }, 404);

    await c.env.DB.prepare(`
      UPDATE leads SET 
        name = COALESCE(?, name),
        stage = COALESCE(?, stage),
        template_url = COALESCE(?, template_url),
        preview_url = COALESCE(?, preview_url),
        working_url = COALESCE(?, working_url),
        project_domain_name = COALESCE(?, project_domain_name),
        updated_at = ?
      WHERE id = ?
    `).bind(
      body.name || null,
      body.stage || null,
      body.templateUrl || null,
      body.previewUrl || null,
      body.workingUrl || null,
      body.projectDomainName || null,
      now,
      id
    ).run();

    const updated = await c.env.DB.prepare('SELECT * FROM leads WHERE id = ?').bind(id).first();
    return c.json({ lead: updated });
  }

  return c.json({ success: true });
});

app.delete('/api/leads/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const now = new Date().toISOString();

  if (c.env.DB) {
    await c.env.DB.prepare('UPDATE leads SET deleted_at = ? WHERE id = ?').bind(now, id).run();
    return c.json({ success: true, message: 'Lead soft-deleted' });
  }

  return c.json({ success: true });
});

// ==================== TASKS API ====================

app.get('/api/tasks', authMiddleware, async (c) => {
  if (c.env.DB) {
    const { results } = await c.env.DB.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
    return c.json({ tasks: results });
  }
  return c.json({ tasks: [] });
});

app.get('/api/tasks/my-work', authMiddleware, async (c) => {
  const payload = c.get('jwtPayload') as JwtUserPayload;
  if (c.env.DB) {
    const available = (await c.env.DB.prepare('SELECT * FROM tasks WHERE status = "available"').all()).results;
    const myActive = (await c.env.DB.prepare('SELECT * FROM tasks WHERE assigned_to = ? AND status = "in_progress"').bind(payload.id).all()).results;
    const myCompleted = (await c.env.DB.prepare('SELECT * FROM tasks WHERE assigned_to = ? AND status = "completed"').bind(payload.id).all()).results;

    return c.json({
      availableTasks: available,
      myActiveTasks: myActive,
      myCompletedTasks: myCompleted,
      followUps: []
    });
  }

  return c.json({ availableTasks: [], myActiveTasks: [], myCompletedTasks: [], followUps: [] });
});

app.post('/api/tasks/:id/grab', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const payload = c.get('jwtPayload') as JwtUserPayload;
  const now = new Date().toISOString();

  if (c.env.DB) {
    const task: any = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
    if (!task) return c.json({ error: 'Task not found' }, 404);
    if (task.status !== 'available') {
      return c.json({ error: 'Task is no longer available' }, 409);
    }

    await c.env.DB.prepare('UPDATE tasks SET status = "in_progress", assigned_to = ?, assigned_at = ? WHERE id = ?').bind(payload.id, now, id).run();
    const updated = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
    return c.json({ success: true, task: updated });
  }

  return c.json({ success: true });
});

app.post('/api/tasks/:id/complete', authMiddleware, async (c) => {
  const id = c.req.param('id');
  const payload = c.get('jwtPayload') as JwtUserPayload;
  const { notes, templateUrl } = await c.req.json();
  const now = new Date().toISOString();

  if (c.env.DB) {
    const task: any = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
    if (!task) return c.json({ error: 'Task not found' }, 404);

    await c.env.DB.prepare(
      'UPDATE tasks SET status = "completed", completed_at = ?, notes = ?, template_url = ? WHERE id = ?'
    ).bind(now, notes || null, templateUrl || null, id).run();

    // Create financial reward record if task rate exists
    if (task.rate && task.rate > 0) {
      const finId = `fin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await c.env.DB.prepare(`
        INSERT INTO financial_records (id, user_id, user_name, task_id, lead_id, type, amount, status, description, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(finId, payload.id, payload.displayName || 'User', id, task.lead_id, 'task_payout', task.rate, 'approved', `Payout for completing ${task.title}`, now).run();
    }

    const updated = await c.env.DB.prepare('SELECT * FROM tasks WHERE id = ?').bind(id).first();
    return c.json({ success: true, task: updated });
  }

  return c.json({ success: true });
});

// ==================== UPLOADS ROUTE (CLOUDFLARE R2) ====================

app.post('/api/uploads', authMiddleware, async (c) => {
  const payload = c.get('jwtPayload') as JwtUserPayload;
  const formData = await c.req.parseBody();
  const leadId = formData['leadId'] as string;
  const caption = (formData['caption'] as string) || '';
  const isPrimary = formData['isPrimary'] === 'true';
  const file = formData['image'] as File;

  if (!leadId) {
    return c.json({ error: 'leadId is required' }, 400);
  }

  if (!file) {
    return c.json({ error: 'No image file uploaded' }, 400);
  }

  const fileExt = file.name.split('.').pop() || 'png';
  const objectKey = `uploads/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

  if (c.env.R2) {
    const arrayBuffer = await file.arrayBuffer();
    await c.env.R2.put(objectKey, arrayBuffer, {
      httpMetadata: { contentType: file.type || 'image/png' }
    });
  }

  const fileUrl = `/api/uploads/files/${objectKey}`;
  const imgId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  if (c.env.DB) {
    await c.env.DB.prepare(`
      INSERT INTO uploads (id, lead_id, object_key, url, filename, mime_type, file_size, uploaded_by, caption, is_primary, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(imgId, leadId, objectKey, fileUrl, file.name, file.type || 'image/png', file.size, payload.id, caption, isPrimary ? 1 : 0, now).run();
  }

  return c.json({
    image: {
      id: imgId,
      leadId,
      objectKey,
      url: fileUrl,
      filename: file.name,
      mimeType: file.type || 'image/png',
      fileSize: file.size,
      uploadedBy: payload.id,
      caption,
      isPrimary,
      createdAt: now
    }
  }, 201);
});

app.post('/api/uploads/clipboard', authMiddleware, async (c) => {
  const payload = c.get('jwtPayload') as JwtUserPayload;
  const { leadId, base64Data, filename, caption } = await c.req.json();

  if (!leadId || !base64Data) {
    return c.json({ error: 'leadId and base64Data are required' }, 400);
  }

  const matches = base64Data.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return c.json({ error: 'Invalid base64 image format' }, 400);
  }

  const mimeType = matches[1];
  const base64Str = matches[2];
  const ext = mimeType.split('/')[1] || 'png';

  const safeFilename = filename || `pasted_image_${Date.now()}.${ext}`;
  const objectKey = `uploads/pasted_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

  const binaryString = atob(base64Str);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  if (c.env.R2) {
    await c.env.R2.put(objectKey, bytes.buffer, {
      httpMetadata: { contentType: mimeType }
    });
  }

  const fileUrl = `/api/uploads/files/${objectKey}`;
  const imgId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  if (c.env.DB) {
    await c.env.DB.prepare(`
      INSERT INTO uploads (id, lead_id, object_key, url, filename, mime_type, file_size, uploaded_by, caption, is_primary, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(imgId, leadId, objectKey, fileUrl, safeFilename, mimeType, bytes.length, payload.id, caption || 'Pasted from clipboard', 0, now).run();
  }

  return c.json({
    image: {
      id: imgId,
      leadId,
      objectKey,
      url: fileUrl,
      filename: safeFilename,
      mimeType,
      fileSize: bytes.length,
      uploadedBy: payload.id,
      caption: caption || 'Pasted from clipboard',
      createdAt: now
    }
  }, 201);
});

// Serve file from R2 bucket
app.get('/api/uploads/files/*', async (c) => {
  const key = c.req.path.replace('/api/uploads/files/', '');
  if (!c.env.R2) {
    return c.json({ error: 'R2 storage not configured' }, 404);
  }

  const object = await c.env.R2.get(key);
  if (!object) {
    return c.json({ error: 'File not found' }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);

  return new Response(object.body, { headers });
});

// Delete upload
app.delete('/api/uploads/:id', authMiddleware, async (c) => {
  const id = c.req.param('id');
  if (c.env.DB) {
    const img: any = await c.env.DB.prepare('SELECT * FROM uploads WHERE id = ?').bind(id).first();
    if (img && c.env.R2) {
      await c.env.R2.delete(img.object_key);
    }
    await c.env.DB.prepare('DELETE FROM uploads WHERE id = ?').bind(id).run();
  }
  return c.json({ success: true, message: 'Image deleted' });
});

// ==================== DASHBOARD & ADMIN ROUTES ====================

app.get('/api/dashboard', authMiddleware, async (c) => {
  let leadsCount = 0;
  let newLeads = 0;
  let won = 0;

  if (c.env.DB) {
    const { results } = await c.env.DB.prepare('SELECT stage FROM leads WHERE deleted_at IS NULL').all();
    leadsCount = results.length;
    newLeads = results.filter((r: any) => r.stage === 'new_lead' || r.stage === 'captured').length;
    won = results.filter((r: any) => r.stage === 'won' || r.stage === 'completed').length;
  }

  return c.json({
    kpis: {
      totalLeads: leadsCount,
      newLeads,
      templatePending: 0,
      readyForOutreach: 0,
      outreachSent: 0,
      responses: 0,
      interested: 0,
      won,
      overdueFollowUps: 0
    },
    funnel: [],
    sourcePerformance: {},
    workload: { unassignedTasks: 0, activeTasks: 0, blockedTasks: 0 },
    recentActivity: []
  });
});

app.get('/api/admin/settings', authMiddleware, async (c) => {
  return c.json({
    settings: {
      currency: 'ZAR',
      leadSources: ['Google Maps', 'Direct Prospecting', 'Social Media', 'Referral', 'ChatGPT Sales Bot']
    },
    taskTypes: [
      { id: 'tt_link', name: 'Live Website Link Attachment', rate: 150 },
      { id: 'tt_design', name: 'Website Design & Development', rate: 450 },
      { id: 'tt_outreach', name: 'Client Outreach & Followup', rate: 100 }
    ]
  });
});

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Route API requests to Hono app
    if (url.pathname.startsWith('/api/') || url.pathname === '/api') {
      return app.fetch(request, env, ctx);
    }

    // Serve static frontend assets via Cloudflare Worker ASSETS binding
    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      if (assetResponse.status !== 404) {
        return assetResponse;
      }

      // Fallback for SPA routing to index.html
      const indexRequest = new Request(new URL('/index.html', request.url).toString(), request);
      return env.ASSETS.fetch(indexRequest);
    }

    return app.fetch(request, env, ctx);
  }
};
