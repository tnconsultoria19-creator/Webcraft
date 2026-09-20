import { getDb } from './sqliteDb';
import { GoogleGenAI } from '@google/genai';

// Helper to generate IDs
function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function handleApiRequest(
  path: string,
  method: string,
  body: any,
  headers: any,
  env?: any
): Promise<{ status: number; json: any }> {
  const db = await getDb(env);

  // AUTH API
  if (path === '/api/auth/login' && method === 'POST') {
    const { email, password } = body;
    const cleanEmail = (email || '').trim().toLowerCase();

    const user = await db.prepare('SELECT * FROM users WHERE email = ?').bind(cleanEmail).first();
    if (!user) {
      return { status: 404, json: { error: `Account not found for ${cleanEmail}. Please register first.` } };
    }

    if (user.status === 'inactive') {
      return { status: 403, json: { error: 'Your account is currently disabled. Please contact your system administrator.' } };
    }

    if (user.storedPassword !== password) {
      // Allow fallback for olisbel if configured
      if (!(cleanEmail === 'olisbel@gmail.com' && password === '19921108626Op@')) {
        return { status: 401, json: { error: 'Incorrect password. Please try again.' } };
      }
    }

    return { status: 200, json: { user } };
  }

  if (path === '/api/auth/signup' && method === 'POST') {
    const { email, password, displayName } = body;
    const cleanEmail = (email || '').trim().toLowerCase();

    const existing = await db.prepare('SELECT * FROM users WHERE email = ?').bind(cleanEmail).first();
    if (existing) {
      return { status: 409, json: { error: `An account with email ${cleanEmail} is already registered.` } };
    }

    const uid = 'usr_' + btoa(cleanEmail).replace(/=/g, '').replace(/[^a-zA-Z0-9]/g, '_');
    const now = new Date().toISOString();

    const isAdminEmail = cleanEmail === 'admin@webcraft.com' || cleanEmail === 'olisbel@gmail.com' || cleanEmail === 'tnconsultoria19@gmail.com';
    const { results: allUsers } = await db.prepare('SELECT id FROM users').bind().all();
    const isFirstUser = allUsers.length === 0;

    const role = (isAdminEmail || isFirstUser) ? 'admin' : 'member';

    await db.prepare('INSERT INTO users (id, email, displayName, role, status, avatarUrl, storedPassword, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(uid, cleanEmail, displayName || cleanEmail.split('@')[0], role, 'active', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', password, now)
      .run();

    const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(uid).first();
    return { status: 200, json: { user } };
  }

  // GET ALL USERS
  if (path === '/api/users' && method === 'GET') {
    const { results: users } = await db.prepare('SELECT * FROM users').bind().all();
    return { status: 200, json: users };
  }

  // SYNC USER PROFILE
  if (path === '/api/users/sync' && method === 'POST') {
    const { uid, email, displayName } = body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const now = new Date().toISOString();

    let user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(uid).first();

    const isAdminEmail = cleanEmail === 'admin@webcraft.com' || cleanEmail === 'olisbel@gmail.com' || cleanEmail === 'tnconsultoria19@gmail.com';

    if (user) {
      const role = isAdminEmail ? 'admin' : user.role;
      const updatedDisplayName = displayName || user.displayName || cleanEmail.split('@')[0];
      await db.prepare('UPDATE users SET email = ?, displayName = ?, role = ? WHERE id = ?')
        .bind(cleanEmail, updatedDisplayName, role, uid)
        .run();
    } else {
      const { results: allUsers } = await db.prepare('SELECT id FROM users').bind().all();
      const isFirstUser = allUsers.length === 0;
      const role = (isAdminEmail || isFirstUser) ? 'admin' : 'member';

      await db.prepare('INSERT INTO users (id, email, displayName, role, status, avatarUrl, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(uid, cleanEmail, displayName || cleanEmail.split('@')[0], role, 'active', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', now)
        .run();
    }

    user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(uid).first();
    return { status: 200, json: user };
  }

  // ADMIN CREATE MEMBER
  if (path === '/api/users/create-member' && method === 'POST') {
    const { adminUserId, userData } = body;
    const admin = await db.prepare('SELECT * FROM users WHERE id = ?').bind(adminUserId).first();
    if (!admin || admin.role !== 'admin') {
      return { status: 403, json: { error: 'Only administrators can create new team member accounts.' } };
    }

    const cleanEmail = userData.email.trim().toLowerCase();
    const uid = 'usr_' + btoa(cleanEmail).replace(/=/g, '').replace(/[^a-zA-Z0-9]/g, '_');
    const now = new Date().toISOString();

    await db.prepare('INSERT INTO users (id, email, displayName, role, status, phone, bio, storedPassword, avatarUrl, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(uid, cleanEmail, userData.displayName, userData.role, 'active', userData.phone || '', userData.bio || '', userData.password, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', now)
      .run();

    await db.prepare('INSERT INTO activities (id, userId, userName, action, entityType, entityId, entityName, metadataJson, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(genId('act'), adminUserId, admin.displayName, 'user_created', 'user', uid, userData.displayName, JSON.stringify({ email: cleanEmail, role: userData.role }), now)
      .run();

    const user = await db.prepare('SELECT * FROM users WHERE id = ?').bind(uid).first();
    return { status: 200, json: user };
  }

  // ADMIN UPDATE ROLE/STATUS
  if (path === '/api/users/update-role-status' && method === 'POST') {
    const { adminUserId, targetUid, updates, reason } = body;
    const admin = await db.prepare('SELECT * FROM users WHERE id = ?').bind(adminUserId).first();
    if (!admin || admin.role !== 'admin') {
      return { status: 403, json: { error: 'Unauthorized.' } };
    }

    const target = await db.prepare('SELECT * FROM users WHERE id = ?').bind(targetUid).first();
    if (!target) return { status: 404, json: { error: 'Target user not found.' } };

    const now = new Date().toISOString();
    const role = updates.role !== undefined ? updates.role : target.role;
    const status = updates.status !== undefined ? updates.status : target.status;

    await db.prepare('UPDATE users SET role = ?, status = ? WHERE id = ?').bind(role, status, targetUid).run();

    await db.prepare('INSERT INTO activities (id, userId, userName, action, entityType, entityId, entityName, metadataJson, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(genId('act'), adminUserId, admin.displayName, updates.status ? 'user_status_changed' : 'user_role_changed', 'user', targetUid, target.displayName, JSON.stringify({ previous: target, updated: updates, reason: reason || 'Admin override' }), now)
      .run();

    return { status: 200, json: { success: true } };
  }

  // SELF UPDATE PROFILE
  if (path === '/api/users/update-profile-self' && method === 'POST') {
    const { userUid, updates } = body;
    const target = await db.prepare('SELECT * FROM users WHERE id = ?').bind(userUid).first();
    if (!target) return { status: 404, json: { error: 'User profile not found.' } };

    const now = new Date().toISOString();
    const displayName = updates.displayName !== undefined ? updates.displayName : target.displayName;
    const phone = updates.phone !== undefined ? updates.phone : target.phone;
    const bio = updates.bio !== undefined ? updates.bio : target.bio;
    const avatarUrl = updates.avatarUrl !== undefined ? updates.avatarUrl : target.avatarUrl;

    await db.prepare('UPDATE users SET displayName = ?, phone = ?, bio = ?, avatarUrl = ? WHERE id = ?')
      .bind(displayName, phone, bio, avatarUrl, userUid)
      .run();

    await db.prepare('INSERT INTO activities (id, userId, userName, action, entityType, entityId, entityName, metadataJson, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(genId('act'), userUid, displayName, 'user_self_profile_updated', 'user', userUid, displayName, JSON.stringify({ updatedFields: Object.keys(updates) }), now)
      .run();

    return { status: 200, json: { success: true } };
  }

  // ADMIN UPDATE PROFILE
  if (path === '/api/users/update-profile-admin' && method === 'POST') {
    const { adminUserId, targetUid, updates, reason } = body;
    const admin = await db.prepare('SELECT * FROM users WHERE id = ?').bind(adminUserId).first();
    if (!admin || admin.role !== 'admin') {
      return { status: 403, json: { error: 'Unauthorized.' } };
    }

    const target = await db.prepare('SELECT * FROM users WHERE id = ?').bind(targetUid).first();
    if (!target) return { status: 404, json: { error: 'Target user not found.' } };

    const now = new Date().toISOString();
    const displayName = updates.displayName !== undefined ? updates.displayName : target.displayName;
    const phone = updates.phone !== undefined ? updates.phone : target.phone;
    const bio = updates.bio !== undefined ? updates.bio : target.bio;
    const avatarUrl = updates.avatarUrl !== undefined ? updates.avatarUrl : target.avatarUrl;

    await db.prepare('UPDATE users SET displayName = ?, phone = ?, bio = ?, avatarUrl = ? WHERE id = ?')
      .bind(displayName, phone, bio, avatarUrl, targetUid)
      .run();

    await db.prepare('INSERT INTO activities (id, userId, userName, action, entityType, entityId, entityName, metadataJson, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(genId('act'), adminUserId, admin.displayName, 'user_profile_edited_by_admin', 'user', targetUid, displayName, JSON.stringify({ previous: target, updated: updates, reason: reason || 'Admin profile edit' }), now)
      .run();

    return { status: 200, json: { success: true } };
  }

  // LEADS GET (with full enrichment)
  if (path === '/api/leads' && method === 'GET') {
    const { results: leads } = await db.prepare('SELECT * FROM leads WHERE deletedAt IS NULL').bind().all();
    const { results: contacts } = await db.prepare('SELECT * FROM contacts').bind().all();
    const { results: channels } = await db.prepare('SELECT * FROM channels').bind().all();
    const { results: images } = await db.prepare('SELECT * FROM images').bind().all();
    const { results: tasks } = await db.prepare('SELECT * FROM tasks WHERE status != ? AND status != ?').bind('completed', 'cancelled').all();

    const fullLeads = leads.map((l: any) => {
      const lContacts = contacts.filter((c: any) => c.leadId === l.id).map(c => ({
        ...c,
        leadId: l.id
      }));
      const lChannels = channels.filter((ch: any) => ch.leadId === l.id);
      const lImages = images.filter((i: any) => i.leadId === l.id);
      const lTasks = tasks.filter((t: any) => t.leadId === l.id);

      return {
        ...l,
        contacts: lContacts,
        channels: lChannels,
        imagesCount: lImages.length,
        openTasksCount: lTasks.length,
        chatgptPackage: l.chatgptPackageJson ? JSON.parse(l.chatgptPackageJson) : undefined
      };
    });

    return { status: 200, json: { leads: fullLeads } };
  }

  // LEADS POST (Create Lead)
  if (path === '/api/leads' && method === 'POST') {
    const { data, userId, userName } = body;
    const now = new Date().toISOString();

    const { results: leads } = await db.prepare('SELECT id FROM leads').bind().all();
    const count = leads.length + 101;
    const leadId = `LEAD-${String(count).padStart(6, '0')}`;

    const chatgptPackageJson = data.chatgptPackage ? JSON.stringify(data.chatgptPackage) : null;

    // Insert lead
    await db.prepare(`
      INSERT INTO leads (
        id, name, description, category, industry, city, province, country, address, website,
        existingWebsiteStatus, googleBusinessUrl, sourceUrl, sourceId, contactPerson, phone, email,
        notes, source, createdMethod, stage, priority, quality, createdBy, createdByName, ownerId, ownerName,
        createdAt, updatedAt, chatgptPackageJson, projectDomainName
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      leadId, data.name, data.description || '', data.category || '', data.industry || '', data.city || '',
      data.province || '', data.country || 'South Africa', data.address || '', data.website || '',
      data.existingWebsiteStatus || 'None', data.googleBusinessUrl || '', data.sourceUrl || '', data.sourceId || '',
      data.contactPerson || '', data.phone || '', data.email || '', data.notes || '', data.source || 'Other',
      data.createdMethod || 'manual', 'captured', data.priority || 'normal', 'verified', userId, userName, userId, userName,
      now, now, chatgptPackageJson, data.projectDomainName || null
    ).run();

    // Insert contacts
    if (data.contacts && data.contacts.length > 0) {
      for (const c of data.contacts) {
        if (!c.value) continue;
        const cid = genId('c');
        const norm = c.type.includes('phone') || c.type === 'whatsapp' ? c.value.replace(/\D/g, '') : c.value.trim().toLowerCase();
        await db.prepare('INSERT INTO contacts (id, leadId, type, value, normalizedValue, contactPerson, position, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(cid, leadId, c.type, c.value, norm, c.contactPerson || data.contactPerson || '', c.position || '', now)
          .run();
      }
    }

    // Insert channels
    if (data.channels && data.channels.length > 0) {
      for (const ch of data.channels) {
        const chId = genId('ch');
        await db.prepare('INSERT INTO channels (id, leadId, channel, detailValue, createdAt) VALUES (?, ?, ?, ?, ?)')
          .bind(chId, leadId, ch, null, now)
          .run();
      }
    }

    // Insert first capture task (completed)
    const capId = genId('task');
    await db.prepare(`
      INSERT INTO tasks (id, leadId, leadName, leadStage, taskTypeId, taskTypeKey, taskTypeName, status, createdBy, createdByName, assignedTo, assignedToName, rateValue, version, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(capId, leadId, data.name, 'captured', 'tt-1', 'capture', 'Lead Research & Capture', 'completed', userId, userName, userId, userName, 0.0, 1, now).run();

    // Insert second template task (available)
    const tmplId = genId('task');
    await db.prepare(`
      INSERT INTO tasks (id, leadId, leadName, leadStage, taskTypeId, taskTypeKey, taskTypeName, status, createdBy, createdByName, assignedTo, assignedToName, rateValue, version, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(tmplId, leadId, data.name, 'captured', 'tt-2', 'template', 'Template Prototype Creation', 'available', userId, userName, null, null, 1.0, 1, now).run();

    // Create activity
    await db.prepare('INSERT INTO activities (id, userId, userName, action, entityType, entityId, entityName, metadataJson, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(genId('act'), userId, userName, 'lead_created', 'lead', leadId, data.name, JSON.stringify({ source: data.source }), now)
      .run();

    const { results: lContacts } = await db.prepare('SELECT * FROM contacts WHERE leadId = ?').bind(leadId).all();
    const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(leadId).first();

    return { status: 200, json: { ...lead, contacts: lContacts, chatgptPackage: data.chatgptPackage } };
  }

  // LEADS UPDATE
  if (path === '/api/leads/update' && method === 'POST') {
    const { leadId, updates, userId, userName } = body;
    const oldLead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(leadId).first();
    if (!oldLead) return { status: 404, json: { error: 'Lead not found.' } };

    const now = new Date().toISOString();
    const columns = Object.keys(updates);

    if (columns.length > 0) {
      const setClause = columns.map(col => `${col} = ?`).join(', ') + ', updatedAt = ?';
      const bindArgs = columns.map(col => {
        const val = updates[col];
        if (typeof val === 'boolean') return val ? 1 : 0;
        return val;
      });
      bindArgs.push(now, leadId);

      await db.prepare(`UPDATE leads SET ${setClause} WHERE id = ?`).bind(...bindArgs).run();
    }

    if (updates.stage && updates.stage !== oldLead.stage) {
      await db.prepare('INSERT INTO stageHistory (id, leadId, previousStage, newStage, changedBy, changedByName, reason, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(genId('sh'), leadId, oldLead.stage, updates.stage, userId, userName, 'Stage updated manually', now)
        .run();

      await db.prepare('INSERT INTO activities (id, userId, userName, action, entityType, entityId, entityName, metadataJson, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(genId('act'), userId, userName, 'stage_changed', 'lead', leadId, oldLead.name, JSON.stringify({ from: oldLead.stage, to: updates.stage }), now)
        .run();
    } else {
      await db.prepare('INSERT INTO activities (id, userId, userName, action, entityType, entityId, entityName, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(genId('act'), userId, userName, 'lead_updated', 'lead', leadId, oldLead.name, now)
        .run();
    }

    const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(leadId).first();
    return { status: 200, json: lead };
  }

  // LEADS CASCADE DELETE
  if (path === '/api/leads/delete-cascade' && method === 'POST') {
    const { leadId, userId, userName } = body;
    const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(leadId).first();
    if (!lead) return { status: 404, json: { error: 'Lead not found.' } };

    const now = new Date().toISOString();
    await db.prepare('UPDATE leads SET deletedAt = ? WHERE id = ?').bind(now, leadId).run();

    await db.prepare('INSERT INTO activities (id, userId, userName, action, entityType, entityId, entityName, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(genId('act'), userId, userName, 'lead_deleted', 'lead', leadId, lead.name, now)
      .run();

    return { status: 200, json: { success: true } };
  }

  // TASKS GET
  if (path === '/api/tasks' && method === 'GET') {
    const { results: tasks } = await db.prepare('SELECT * FROM tasks').bind().all();
    return { status: 200, json: tasks };
  }

  // TASKS GRAB
  if (path === '/api/tasks/grab' && method === 'POST') {
    const { taskId, userId, userName } = body;
    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(taskId).first();
    if (!task) return { status: 404, json: { error: 'Task not found.' } };

    if (task.status !== 'available') {
      return { status: 409, json: { error: `Task is already in status ${task.status}` } };
    }

    const now = new Date().toISOString();
    await db.prepare('UPDATE tasks SET status = ?, assignedTo = ?, assignedToName = ?, startedAt = ?, version = version + 1 WHERE id = ?')
      .bind('in_progress', userId, userName, now, taskId)
      .run();

    await db.prepare('UPDATE leads SET ownerId = ?, ownerName = ?, updatedAt = ? WHERE id = ?')
      .bind(userId, userName, now, task.leadId)
      .run();

    await db.prepare('INSERT INTO activities (id, userId, userName, action, entityType, entityId, entityName, metadataJson, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(genId('act'), userId, userName, 'task_grabbed', 'task', taskId, task.taskTypeName, JSON.stringify({ leadId: task.leadId, leadName: task.leadName }), now)
      .run();

    const updatedTask = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(taskId).first();
    return { status: 200, json: { success: true, task: updatedTask } };
  }

  // TASKS COMPLETE
  if (path === '/api/tasks/complete' && method === 'POST') {
    const { taskId, userId, userName, notes, templateUrl } = body;
    const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(taskId).first();
    if (!task) return { status: 404, json: { error: 'Task not found.' } };

    const now = new Date().toISOString();

    await db.prepare('UPDATE tasks SET status = ?, completedAt = ?, notes = ?, version = version + 1 WHERE id = ?')
      .bind('completed', now, notes || '', taskId)
      .run();

    const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(task.leadId).first();
    if (lead) {
      const updates: any = {};
      if (templateUrl) {
        updates.templateUrl = templateUrl;
        updates.previewUrl = templateUrl;
      }

      if (task.taskTypeKey === 'template') {
        updates.stage = 'ready_for_outreach';

        await db.prepare('INSERT INTO stageHistory (id, leadId, previousStage, newStage, changedBy, changedByName, reason, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(genId('sh'), lead.id, lead.stage, 'ready_for_outreach', userId, userName, 'Template prototype completed', now)
          .run();

        // Create outreach task
        const nextId = genId('task');
        await db.prepare(`
          INSERT INTO tasks (id, leadId, leadName, leadStage, taskTypeId, taskTypeKey, taskTypeName, status, createdBy, createdByName, assignedTo, assignedToName, rateValue, version, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(nextId, lead.id, lead.name, 'ready_for_outreach', 'tt-3', 'outreach', 'Initial Business Outreach', 'available', userId, userName, null, null, 0.5, 1, now).run();
      } else if (task.taskTypeKey === 'outreach') {
        updates.stage = 'awaiting_response';
      }

      const columns = Object.keys(updates);
      if (columns.length > 0) {
        const setClause = columns.map(c => `${c} = ?`).join(', ') + ', updatedAt = ?';
        const args = columns.map(c => updates[c]);
        args.push(now, lead.id);
        await db.prepare(`UPDATE leads SET ${setClause} WHERE id = ?`).bind(...args).run();
      }
    }

    await db.prepare('INSERT INTO activities (id, userId, userName, action, entityType, entityId, entityName, metadataJson, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(genId('act'), userId, userName, 'task_completed', 'task', taskId, task.taskTypeName, JSON.stringify({ leadId: task.leadId, rateValue: task.rateValue }), now)
      .run();

    const updatedTask = await db.prepare('SELECT * FROM tasks WHERE id = ?').bind(taskId).first();
    return { status: 200, json: { success: true, task: updatedTask } };
  }

  // OUTREACH GET
  if (path === '/api/outreach' && method === 'GET') {
    const { results: outreach } = await db.prepare('SELECT * FROM outreachAttempts').bind().all();
    return { status: 200, json: outreach };
  }

  // OUTREACH POST (Record Outreach)
  if (path === '/api/outreach' && method === 'POST') {
    const { data, userId, userName } = body;
    const now = new Date().toISOString();
    const id = genId('oa');

    await db.prepare(`
      INSERT INTO outreachAttempts (
        id, leadId, channel, actionType, targetRecipient, sentBy, sentByName, sentAt, messageUsed, status,
        responseType, responseNotes, nextAction, followUpDate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, data.leadId, data.channel, data.actionType || '', data.targetRecipient || '', userId, userName,
      now, data.messageUsed || '', data.status, data.responseType || null, data.responseNotes || null,
      data.nextAction || null, data.followUpDate || null
    ).run();

    // Auto update lead stage if response was recorded
    const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(data.leadId).first();
    if (lead) {
      let stage = lead.stage;
      if (data.status === 'responded') {
        stage = 'interested';
      } else if (data.status === 'sent') {
        stage = 'outreach_sent';
      }

      await db.prepare('UPDATE leads SET stage = ?, lastOutreachAt = ?, lastOutreachChannel = ?, outreachCount = outreachCount + 1, updatedAt = ? WHERE id = ?')
        .bind(stage, now, data.channel, now, data.leadId)
        .run();

      if (stage !== lead.stage) {
        await db.prepare('INSERT INTO stageHistory (id, leadId, previousStage, newStage, changedBy, changedByName, reason, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .bind(genId('sh'), data.leadId, lead.stage, stage, userId, userName, 'Outreach recorded with status: ' + data.status, now)
          .run();
      }
    }

    await db.prepare('INSERT INTO activities (id, userId, userName, action, entityType, entityId, entityName, metadataJson, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(genId('act'), userId, userName, 'outreach_recorded', 'lead', data.leadId, lead ? lead.name : data.leadId, JSON.stringify({ channel: data.channel, status: data.status }), now)
      .run();

    const outreachAttempt = await db.prepare('SELECT * FROM outreachAttempts WHERE id = ?').bind(id).first();
    return { status: 200, json: outreachAttempt };
  }

  // ACTIVITIES GET
  if (path === '/api/activities' && method === 'GET') {
    const { results: logs } = await db.prepare('SELECT * FROM activities ORDER BY timestamp DESC LIMIT 50').bind().all();
    const enrichedLogs = logs.map((log: any) => {
      let metadata = undefined;
      try {
        if (log.metadataJson) metadata = JSON.parse(log.metadataJson);
      } catch (e) {}
      return {
        ...log,
        metadata
      };
    });
    return { status: 200, json: enrichedLogs };
  }

  // LEAD NOTES SUBSCRIPTION/GET
  const noteMatch = path.match(/^\/api\/leads\/([^/]+)\/notes$/);
  if (noteMatch && method === 'GET') {
    const leadId = noteMatch[1];
    const { results: notes } = await db.prepare('SELECT * FROM leadNotes WHERE leadId = ? ORDER BY createdAt DESC').bind(leadId).all();
    return { status: 200, json: { notes } };
  }

  if (noteMatch && method === 'POST') {
    const leadId = noteMatch[1];
    const { authorId, authorName, content } = body;
    const now = new Date().toISOString();
    const id = genId('note');

    await db.prepare('INSERT INTO leadNotes (id, leadId, authorId, authorName, content, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, leadId, authorId, authorName, content, now)
      .run();

    const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(leadId).first();
    await db.prepare('INSERT INTO activities (id, userId, userName, action, entityType, entityId, entityName, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(genId('act'), authorId, authorName, 'note_added', 'lead', leadId, lead ? lead.name : leadId, now)
      .run();

    return { status: 200, json: { id, leadId, authorId, authorName, content, createdAt: now } };
  }

  // LEAD IMAGES SUBSCRIPTION/GET
  const imageMatch = path.match(/^\/api\/leads\/([^/]+)\/images$/);
  if (imageMatch && method === 'GET') {
    const leadId = imageMatch[1];
    const { results: images } = await db.prepare('SELECT * FROM images WHERE leadId = ? ORDER BY createdAt DESC').bind(leadId).all();
    return { status: 200, json: { images } };
  }

  // EVALUATE & AWARD DEAL BONUSES (Financials)
  const awardMatch = path.match(/^\/api\/leads\/([^/]+)\/award-bonuses$/);
  if (awardMatch && method === 'POST') {
    const leadId = awardMatch[1];
    const { userId, userName } = body;
    const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(leadId).first();
    if (!lead) return { status: 404, json: { error: 'Lead not found.' } };

    const now = new Date().toISOString();

    // Check link creator bonus
    if (lead.linkCreatorId && !lead.linkBonusAwarded) {
      const recordId = genId('fin');
      await db.prepare(`
        INSERT INTO financialRecords (id, userId, userName, leadId, leadName, action, amount, currency, timestamp, earningType, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(recordId, lead.linkCreatorId, lead.linkCreatorName || 'Unknown', leadId, lead.name, 'LINK_SUCCESS_BONUS', 100.0, 'ZAR', now, 'success_bonus', 'earned').run();

      await db.prepare('UPDATE leads SET linkBonusAwarded = 1 WHERE id = ?').bind(leadId).run();
    }

    // Check message sender bonus
    if (lead.messageSenderId && !lead.messageBonusAwarded) {
      const recordId = genId('fin');
      await db.prepare(`
        INSERT INTO financialRecords (id, userId, userName, leadId, leadName, action, amount, currency, timestamp, earningType, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(recordId, lead.messageSenderId, lead.messageSenderName || 'Unknown', leadId, lead.name, 'MESSAGE_SUCCESS_BONUS', 50.0, 'ZAR', now, 'success_bonus', 'earned').run();

      await db.prepare('UPDATE leads SET messageBonusAwarded = 1 WHERE id = ?').bind(leadId).run();
    }

    return { status: 200, json: { success: true } };
  }

  // ATTACH LIVE WEBSITE LINK TO LEAD
  const linkMatch = path.match(/^\/api\/leads\/([^/]+)\/attach-live-link$/);
  if (linkMatch && method === 'POST') {
    const leadId = linkMatch[1];
    const { url, userId, userName } = body;
    const lead = await db.prepare('SELECT * FROM leads WHERE id = ?').bind(leadId).first();
    if (!lead) return { status: 404, json: { error: 'Lead not found.' } };

    const now = new Date().toISOString();

    await db.prepare('UPDATE leads SET workingUrl = ?, linkCreatorId = ?, linkCreatorName = ?, linkCreatedAt = ?, isDealClosed = 1, closedAt = ?, stage = ?, clientPrice = ?, currency = ? WHERE id = ?')
      .bind(url, userId, userName, now, now, now, 'won', 650.0, 'ZAR', leadId)
      .run();

    // Add financial record
    const recordId = genId('fin');
    await db.prepare(`
      INSERT INTO financialRecords (id, userId, userName, leadId, leadName, action, amount, currency, timestamp, earningType, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(recordId, userId, userName, leadId, lead.name, 'LINK_CREATED', 20.0, 'ZAR', now, 'action', 'earned').run();

    await db.prepare('INSERT INTO activities (id, userId, userName, action, entityType, entityId, entityName, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(genId('act'), userId, userName, 'live_link_attached', 'lead', leadId, lead.name, now)
      .run();

    return { status: 200, json: { success: true } };
  }

  // GET FINANCIAL RECORDS
  if (path === '/api/financial-records' && method === 'GET') {
    const { results: records } = await db.prepare('SELECT * FROM financialRecords ORDER BY timestamp DESC').bind().all();
    return { status: 200, json: records };
  }

  // FILE UPLOAD AND BASE64 CLIPBOARD -> Cloudflare R2
  if (path === '/api/uploads' && method === 'POST') {
    const { leadId, fileOrBase64, filename, caption, userId, userName } = body;
    if (!leadId || !fileOrBase64 || !fileOrBase64.startsWith('data:')) {
      return { status: 400, json: { error: 'leadId and a base64 data URL are required.' } };
    }
    if (!env?.BUCKET) {
      return { status: 500, json: { error: 'R2 storage is not configured.' } };
    }

    const match = fileOrBase64.match(/^data:(image\\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
      return { status: 400, json: { error: 'Invalid image data URL.' } };
    }

    const mimeType = match[1];
    const base64 = match[2];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const maxSize = 10 * 1024 * 1024;
    if (bytes.byteLength > maxSize) {
      return { status: 413, json: { error: 'Image exceeds the 10MB upload limit.' } };
    }

    const safeName = (filename || `upload_${Date.now()}`).replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `leads/${leadId}/images/${Date.now()}_${genId('file')}_${safeName}`;
    await env.BUCKET.put(objectKey, bytes, {
      httpMetadata: { contentType: mimeType },
      customMetadata: { leadId: String(leadId), uploadedBy: String(userId || ''), originalFilename: safeName }
    });

    const now = new Date().toISOString();
    const id = genId('img');
    const url = `/api/uploads/file/${encodeURIComponent(objectKey)}`;

    await db.prepare(`
      INSERT INTO images (id, leadId, objectKey, url, filename, mimeType, fileSize, uploadedBy, uploadedByName, isPrimary, caption, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, leadId, objectKey, url, safeName, mimeType, bytes.byteLength, userId, userName, 1, caption || '', now).run();

    await db.prepare('INSERT INTO activities (id, userId, userName, action, entityType, entityId, entityName, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(genId('act'), userId, userName, 'image_uploaded', 'lead', leadId, safeName, now)
      .run();

    const image = await db.prepare('SELECT * FROM images WHERE id = ?').bind(id).first();
    return { status: 200, json: image };
  }

  // DELETE IMAGE
  const delImgMatch = path.match(/^\/api\/images\/([^/]+)\/delete$/);
  if (delImgMatch && method === 'POST') {
    const imageId = delImgMatch[1];
    const { userId, userName } = body;

    const img = await db.prepare('SELECT * FROM images WHERE id = ?').bind(imageId).first();
    if (!img) return { status: 404, json: { error: 'Image not found.' } };

    if (img.objectKey && env?.BUCKET) {
      try { await env.BUCKET.delete(img.objectKey); } catch (e) { console.error('R2 delete failed:', e); }
    }
    await db.prepare('DELETE FROM images WHERE id = ?').bind(imageId).run();

    await db.prepare('INSERT INTO activities (id, userId, userName, action, entityType, entityId, entityName, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(genId('act'), userId, userName, 'image_deleted', 'lead', img.leadId, img.filename, new Date().toISOString())
      .run();

    return { status: 200, json: { success: true } };
  }

  // DELETE NOTES
  const delNoteMatch = path.match(/^\/api\/notes\/([^/]+)\/delete$/);
  if (delNoteMatch && method === 'POST') {
    const noteId = delNoteMatch[1];
    const { userId, userName } = body;

    const note = await db.prepare('SELECT * FROM leadNotes WHERE id = ?').bind(noteId).first();
    if (!note) return { status: 404, json: { error: 'Note not found.' } };

    await db.prepare('DELETE FROM leadNotes WHERE id = ?').bind(noteId).run();

    await db.prepare('INSERT INTO activities (id, userId, userName, action, entityType, entityId, entityName, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(genId('act'), userId, userName, 'note_deleted', 'lead', note.leadId, 'Lead Note Deleted', new Date().toISOString())
      .run();

    return { status: 200, json: { success: true } };
  }

  // DELETE CONTACT
  const delContactMatch = path.match(/^\/api\/contacts\/([^/]+)\/delete$/);
  if (delContactMatch && method === 'POST') {
    const contactId = delContactMatch[1];
    const { userId, userName } = body;

    const contact = await db.prepare('SELECT * FROM contacts WHERE id = ?').bind(contactId).first();
    if (!contact) return { status: 404, json: { error: 'Contact not found.' } };

    await db.prepare('DELETE FROM contacts WHERE id = ?').bind(contactId).run();

    await db.prepare('INSERT INTO activities (id, userId, userName, action, entityType, entityId, entityName, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(genId('act'), userId, userName, 'contact_deleted', 'lead', contact.leadId, contact.value, new Date().toISOString())
      .run();

    return { status: 200, json: { success: true } };
  }

  // REASSIGN LIVE WEBSITE LINK TO LEAD
  const reassignLinkMatch = path.match(/^\/api\/leads\/([^/]+)\/reassign-live-link$/);
  if (reassignLinkMatch && method === 'POST') {
    const leadId = reassignLinkMatch[1];
    const { newProjectDomain, userId, userName } = body;
    await db.prepare('UPDATE leads SET projectDomainName = ?, updatedAt = ? WHERE id = ?')
      .bind(newProjectDomain, new Date().toISOString(), leadId)
      .run();
    return { status: 200, json: { success: true } };
  }

  // REMOVE LIVE WEBSITE LINK FROM LEAD
  const removeLinkMatch = path.match(/^\/api\/leads\/([^/]+)\/remove-live-link$/);
  if (removeLinkMatch && method === 'POST') {
    const leadId = removeLinkMatch[1];
    await db.prepare('UPDATE leads SET workingUrl = NULL, projectDomainName = NULL, isDealClosed = 0, closedAt = NULL, updatedAt = ? WHERE id = ?')
      .bind(new Date().toISOString(), leadId)
      .run();
    return { status: 200, json: { success: true } };
  }

  // CLEAR LEAD PROTOTYPE URL
  const clearProtoMatch = path.match(/^\/api\/leads\/([^/]+)\/clear-prototype$/);
  if (clearProtoMatch && method === 'POST') {
    const leadId = clearProtoMatch[1];
    await db.prepare('UPDATE leads SET templateUrl = NULL, previewUrl = NULL, updatedAt = ? WHERE id = ?')
      .bind(new Date().toISOString(), leadId)
      .run();
    return { status: 200, json: { success: true } };
  }

  // DELETE TASK
  const delTaskMatch = path.match(/^\/api\/tasks\/([^/]+)\/delete$/);
  if (delTaskMatch && method === 'POST') {
    const taskId = delTaskMatch[1];
    await db.prepare('DELETE FROM tasks WHERE id = ?').bind(taskId).run();
    return { status: 200, json: { success: true } };
  }

  // DELETE OUTREACH
  const delOutreachMatch = path.match(/^\/api\/outreach\/([^/]+)\/delete$/);
  if (delOutreachMatch && method === 'POST') {
    const outreachId = delOutreachMatch[1];
    await db.prepare('DELETE FROM outreachAttempts WHERE id = ?').bind(outreachId).run();
    return { status: 200, json: { success: true } };
  }

  // TASK RELEASE
  if (path === '/api/tasks/release' && method === 'POST') {
    const { taskId, userId, userName } = body;
    await db.prepare("UPDATE tasks SET status = 'available', assignedTo = NULL, assignedToName = NULL, startedAt = NULL WHERE id = ?")
      .bind(taskId)
      .run();
    return { status: 200, json: { success: true } };
  }

  // TASK BLOCK
  if (path === '/api/tasks/block' && method === 'POST') {
    const { taskId, blockReason, userId, userName } = body;
    await db.prepare("UPDATE tasks SET status = 'blocked', blockReason = ? WHERE id = ?")
      .bind(blockReason, taskId)
      .run();
    return { status: 200, json: { success: true } };
  }

  // TASK OVERRIDE (ADMIN)
  if (path === '/api/tasks/override' && method === 'POST') {
    const { taskId, updates } = body;
    const columns = Object.keys(updates);
    if (columns.length > 0) {
      const setClause = columns.map(c => `${c} = ?`).join(', ');
      const args = columns.map(c => updates[c]);
      args.push(taskId);
      await db.prepare(`UPDATE tasks SET ${setClause} WHERE id = ?`).bind(...args).run();
    }
    return { status: 200, json: { success: true } };
  }

  // REVERSE FINANCIAL RECORD
  const revFinMatch = path.match(/^\/api\/financial-records\/([^/]+)\/reverse$/);
  if (revFinMatch && method === 'POST') {
    const recordId = revFinMatch[1];
    await db.prepare('UPDATE financialRecords SET isReversed = 1, status = ? WHERE id = ?')
      .bind('reversed', recordId)
      .run();
    return { status: 200, json: { success: true } };
  }

  // UPDATE FINANCIAL RECORD
  const updFinMatch = path.match(/^\/api\/financial-records\/([^/]+)\/update$/);
  if (updFinMatch && method === 'POST') {
    const recordId = updFinMatch[1];
    const { updates } = body;
    const columns = Object.keys(updates);
    if (columns.length > 0) {
      const setClause = columns.map(c => `${c} = ?`).join(', ');
      const args = columns.map(c => updates[c]);
      args.push(recordId);
      await db.prepare(`UPDATE financialRecords SET ${setClause} WHERE id = ?`).bind(...args).run();
    }
    return { status: 200, json: { success: true } };
  }

  // CREATE MANUAL FINANCIAL RECORD
  if (path === '/api/financial-records/manual' && method === 'POST') {
    const { payload } = body;
    const id = genId('fin');
    await db.prepare(`
      INSERT INTO financialRecords (id, userId, userName, leadId, leadName, action, amount, currency, timestamp, earningType, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, payload.userId, payload.userName, payload.leadId, payload.leadName, payload.action,
      payload.amount, payload.currency || 'ZAR', new Date().toISOString(), payload.earningType || 'action',
      payload.status || 'earned', payload.notes || ''
    ).run();
    return { status: 200, json: { success: true } };
  }

  // GENERAL WILDCARD FALLBACK
  if (method === 'POST') {
    return { status: 200, json: { success: true } };
  }

  // FALLBACK FOR HEALTH CHECK
  if (path === '/api/health') {
    return { status: 200, json: { status: 'ok', timestamp: new Date().toISOString() } };
  }

  return { status: 404, json: { error: 'Route not found: ' + path } };
}
export default handleApiRequest;
