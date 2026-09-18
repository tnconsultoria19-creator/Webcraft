import { Lead, Task, OutreachAttempt, ImageAsset, User } from '../types';

export const api = {
  // AUTH
  login: async (email: string, pass: string) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (pass || '').trim();

    if (!cleanEmail || !cleanPass) {
      throw new Error('Please enter both your email address and password.');
    }

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: cleanPass })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: 'Login failed.' })) as any;
      throw new Error(errData.error || 'Login failed.');
    }

    const { user } = await res.json() as any;
    localStorage.setItem('webcraft_user_id', user.id);
    return { user };
  },

  signUp: async (email: string, pass: string, displayName?: string) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (pass || '').trim();

    if (!cleanEmail) {
      throw new Error('Email address is required.');
    }
    if (!cleanPass || cleanPass.length < 4) {
      throw new Error('Password must be at least 4 characters long.');
    }

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password: cleanPass, displayName })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: 'Registration failed.' })) as any;
      throw new Error(errData.error || 'Registration failed.');
    }

    const { user } = await res.json() as any;
    localStorage.setItem('webcraft_user_id', user.id);
    return { user };
  },

  logout: async () => {
    localStorage.removeItem('webcraft_user_id');
  },

  resetPassword: async (email: string) => {
    // Standard mock reset password
    console.log('Reset password link requested for:', email);
  },

  getMe: async (): Promise<{ user: User }> => {
    const userId = localStorage.getItem('webcraft_user_id');
    if (!userId) throw new Error('Not authenticated');

    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Failed to fetch users');
    const users: User[] = await res.json() as any;
    const user = users.find(u => u.id === userId);
    if (!user) throw new Error('User profile not found');
    return { user };
  },

  getUsers: async (): Promise<{ users: User[] }> => {
    const res = await fetch('/api/users');
    if (!res.ok) throw new Error('Failed to fetch users');
    const users: User[] = await res.json() as any;
    return { users };
  },

  // LEADS
  getLeads: async (params?: { stage?: string; source?: string; search?: string }): Promise<{ leads: Lead[] }> => {
    const res = await fetch('/api/leads');
    if (!res.ok) throw new Error('Failed to fetch leads');
    const data = await res.json() as any;
    let leads: Lead[] = data.leads || [];

    if (params?.stage) leads = leads.filter((l) => l.stage === params.stage);
    if (params?.source) leads = leads.filter((l) => l.source === params.source);
    if (params?.search) {
      const q = params.search.toLowerCase();
      leads = leads.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          (l.city || '').toLowerCase().includes(q) ||
          (l.category || '').toLowerCase().includes(q)
      );
    }
    return { leads };
  },

  createLead: async (leadData: { name: string; [key: string]: any }, userId: string, userName: string) => {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: leadData, userId, userName })
    });
    if (!res.ok) throw new Error('Failed to create lead');
    const lead = await res.json();
    return { lead };
  },

  updateLead: async (leadId: string, updates: Partial<Lead>, userId: string, userName: string) => {
    const res = await fetch('/api/leads/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, updates, userId, userName })
    });
    if (!res.ok) throw new Error('Failed to update lead');
    return { success: true };
  },

  // TASKS
  getTasks: async (): Promise<{ tasks: Task[] }> => {
    const res = await fetch('/api/tasks');
    if (!res.ok) throw new Error('Failed to fetch tasks');
    const tasks: Task[] = await res.json() as any;
    return { tasks };
  },

  grabTask: async (taskId: string, userId: string, userName: string) => {
    const res = await fetch('/api/tasks/grab', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, userId, userName })
    });
    if (!res.ok) throw new Error('Failed to grab task');
    return await res.json();
  },

  completeTask: async (taskId: string, userId: string, userName: string, notes?: string, templateUrl?: string) => {
    const res = await fetch('/api/tasks/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, userId, userName, notes, templateUrl })
    });
    if (!res.ok) throw new Error('Failed to complete task');
    return await res.json();
  },

  // OUTREACH
  recordOutreach: async (data: any, userId: string, userName: string) => {
    const res = await fetch('/api/outreach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data, userId, userName })
    });
    if (!res.ok) throw new Error('Failed to record outreach');
    const outreach = await res.json();
    return { outreach };
  },

  getOutreach: async (): Promise<{ outreach: OutreachAttempt[] }> => {
    const res = await fetch('/api/outreach');
    if (!res.ok) throw new Error('Failed to fetch outreach attempts');
    const outreach: OutreachAttempt[] = await res.json() as any;
    return { outreach };
  },

  // IMAGES & ASSETS
  uploadClipboardImage: async (leadId: string, base64: string, filename: string, caption?: string, userId?: string, userName?: string) => {
    const res = await fetch('/api/uploads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId, fileOrBase64: base64, filename, caption, userId, userName })
    });
    if (!res.ok) throw new Error('Failed to upload image');
    const asset = await res.json();
    return { asset };
  },

  deleteImage: async (imageId: string) => {
    const res = await fetch(`/api/images/${imageId}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'system', userName: 'System Admin' })
    });
    if (!res.ok) throw new Error('Failed to delete image');
    return { success: true };
  },

  // ADMIN
  createUser: async (adminUser: User, userData: any) => {
    const res = await fetch('/api/users/create-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminUserId: adminUser.id, userData })
    });
    if (!res.ok) throw new Error('Failed to create team member');
    const user = await res.json();
    return { user };
  },

  updateUserRoleOrStatus: async (adminUser: User, targetUid: string, updates: any, reason?: string) => {
    const res = await fetch('/api/users/update-role-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminUserId: adminUser.id, targetUid, updates, reason })
    });
    if (!res.ok) throw new Error('Failed to update role or status');
    return { success: true };
  },

  adminOverrideTask: async (adminUser: User, taskId: string, updates: Partial<Task>, reason: string) => {
    const res = await fetch('/api/tasks/override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminUserId: adminUser.id, taskId, updates, reason })
    });
    if (!res.ok) throw new Error('Failed to override task');
    return { success: true };
  }
};
