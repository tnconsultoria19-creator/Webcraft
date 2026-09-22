import { Lead, Task, OutreachAttempt, ImageAsset, User, LeadNote, ActivityLog, FinancialRecord } from '../types';

export function normalizePhone(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

export function normalizeEmail(email: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

export function cleanFirestoreData<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

// Shared polling helper.
// Multiple parts of the UI can subscribe to the same endpoint without creating duplicate network requests.
type SharedSubscriber<T> = (data: T) => void;

interface SharedPollerEntry<T> {
  subscribers: Set<SharedSubscriber<T>>;
  timer: ReturnType<typeof setTimeout> | null;
  active: boolean;
  intervalMs: number;
  key?: string;
  lastData?: T;
  lastSerialized?: string;
  inFlightPromise: Promise<void> | null;
  refresh: () => Promise<void>;
}

function createPoller<T>(url: string, callback: (data: T) => void, intervalMs = 5000, key?: string) {
  let entry = sharedPollers.get(url) as SharedPollerEntry<T> | undefined;

  if (!entry) {
    entry = {
      subscribers: new Set(),
      timer: null,
      active: true,
      intervalMs,
      key,
      lastData: undefined,
      lastSerialized: undefined,
      inFlightPromise: null,
      refresh: async () => undefined
    };
    sharedPollers.set(url, entry);

    const scheduleNext = () => {
      if (!entry || !entry.active || entry.subscribers.size === 0) return;
      if (entry.timer) clearTimeout(entry.timer);
      entry.timer = setTimeout(() => {
        void poll();
      }, entry.intervalMs);
    };

    const poll = async (): Promise<void> => {
      if (!entry || !entry.active || entry.subscribers.size === 0) return;
      if (entry.inFlightPromise) return entry.inFlightPromise;

      const request = (async () => {
        try {
          const res = await fetch(url, { cache: 'no-store' });
          if (!res.ok) throw new Error('Fetch failed for ' + url);
          const data = await res.json() as any;
          if (!entry || !entry.active) return;

          const payload = (entry.key && data[entry.key] !== undefined) ? data[entry.key] : data;
          const serialized = JSON.stringify(payload);
          const changed = entry.lastData === undefined || serialized !== entry.lastSerialized;

          entry.lastData = payload as T;
          entry.lastSerialized = serialized;

          // Only notify React when the server payload actually changed.
          if (changed) {
            entry.subscribers.forEach((subscriber) => {
              try {
                subscriber(payload as T);
              } catch (subscriberError) {
                console.warn('Polling subscriber error on ' + url + ':', subscriberError);
              }
            });
          }
        } catch (err) {
          if (entry?.active) console.warn('Polling error on ' + url + ':', err);
        } finally {
          if (entry && entry.active && entry.subscribers.size > 0) {
            scheduleNext();
          }
        }
      })();

      entry.inFlightPromise = request;
      try {
        await request;
      } finally {
        if (entry?.inFlightPromise === request) {
          entry.inFlightPromise = null;
        }
      }
    };

    entry.refresh = poll;
    void poll();
  }

  entry.subscribers.add(callback);

  if (entry.lastData !== undefined) {
    callback(entry.lastData);
  }

  return () => {
    const current = sharedPollers.get(url) as SharedPollerEntry<T> | undefined;
    if (!current) return;
    current.subscribers.delete(callback);
    if (current.subscribers.size === 0) {
      current.active = false;
      if (current.timer) clearTimeout(current.timer);
      sharedPollers.delete(url);
    }
  };
}

// Force an immediate refresh of any active shared pollers after a successful mutation.
export async function refreshData(urls: string[]): Promise<void> {
  const uniqueUrls = Array.from(new Set(urls));
  await Promise.allSettled(
    uniqueUrls.map(async (url) => {
      const entry = sharedPollers.get(url) as SharedPollerEntry<any> | undefined;
      if (entry?.refresh) {
        await entry.refresh();
      }
    })
  );
}

export function subscribeToUsers(callback: (users: User[]) => void) {
  return createPoller('/api/users', callback, 5000);
}

export function subscribeToAdminUsers(adminUserId: string, callback: (users: User[]) => void) {
  return createPoller(
    `/api/users/admin-list/${encodeURIComponent(adminUserId)}`,
    callback,
    5000
  );
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const res = await fetch(`/api/users/${encodeURIComponent(uid)}`);
  if (!res.ok) return null;
  return await res.json() as any;
}

export async function syncUserProfile(uid: string, email: string, displayName?: string): Promise<User> {
  const res = await fetch('/api/users/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, email, displayName })
  });
  if (!res.ok) throw new Error('Failed to sync profile');
  return await res.json() as any;
}

export async function createTeamMemberAccount(
  adminUser: User,
  userData: {
    email: string;
    password: string;
    displayName: string;
    role: 'admin' | 'member';
    phone?: string;
    bio?: string;
  }
): Promise<User> {
  const res = await fetch('/api/users/create-member', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminUserId: adminUser.id, userData })
  });
  if (!res.ok) throw new Error('Failed to create team member');
  return await res.json() as any;
}

export async function updateUserRoleOrStatus(
  adminUser: User,
  targetUid: string,
  updates: { role?: 'admin' | 'member'; status?: 'active' | 'inactive' },
  reason?: string
): Promise<void> {
  const res = await fetch('/api/users/update-role-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminUserId: adminUser.id, targetUid, updates, reason })
  });
  if (!res.ok) throw new Error('Failed to update role or status');
}

export async function updateUserProfileByAdmin(
  adminUser: User,
  targetUid: string,
  updates: Partial<User>,
  reason?: string
): Promise<void> {
  const res = await fetch('/api/users/update-profile-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminUserId: adminUser.id, targetUid, updates, reason })
  });
  if (!res.ok) throw new Error('Failed to update profile by admin');
}

export async function adminResetUserPassword(
  adminUser: User,
  targetUid: string,
  newPassword: string
): Promise<void> {
  const res = await fetch('/api/users/reset-password-admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminUserId: adminUser.id, targetUid, newPassword })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any)?.error || 'Failed to reset password');
  }
}

export async function updateOwnUserProfile(
  userUid: string,
  updates: Partial<User>
): Promise<void> {
  const res = await fetch('/api/users/update-profile-self', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userUid, updates })
  });
  if (!res.ok) throw new Error('Failed to update own profile');
}

export function subscribeToLeads(callback: (leads: Lead[]) => void) {
  return createPoller('/api/leads', callback, 5000, 'leads');
}

export interface LeadDetailPayload {
  lead: Lead;
  tasks: Task[];
  outreach: OutreachAttempt[];
  notes: LeadNote[];
  images: ImageAsset[];
  users: User[];
}

export function subscribeToLeadDetail(leadId: string, callback: (data: LeadDetailPayload) => void) {
  return createPoller(`/api/leads/${encodeURIComponent(leadId)}/detail`, callback, 7000);
}

export function subscribeToTasks(callback: (tasks: Task[]) => void) {
  return createPoller('/api/tasks', callback, 5000);
}

export function subscribeToOutreach(callback: (outreach: OutreachAttempt[]) => void) {
  return createPoller('/api/outreach', callback, 5000);
}

export function subscribeToActivities(callback: (activities: ActivityLog[]) => void) {
  return createPoller('/api/activities', callback, 5000);
}

export async function createLeadInFirestore(
  data: {
    name: string;
    description?: string;
    category?: string;
    industry?: string;
    city?: string;
    province?: string;
    country?: string;
    address?: string;
    website?: string;
    existingWebsiteStatus?: string;
    googleBusinessUrl?: string;
    sourceUrl?: string;
    sourceId?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    notes?: string;
    source?: string;
    createdMethod?: 'manual' | 'import';
    priority?: Lead['priority'];
    chatgptPackage?: Lead['chatgptPackage'];
    projectDomainName?: string;
    contacts?: Array<{ type: any; value: string; contactPerson?: string; position?: string }>;
    channels?: string[];
  },
  userId: string,
  userName: string
): Promise<Lead> {
  const res = await fetch('/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, userId, userName })
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error((errorBody as any)?.error || 'Failed to create lead');
  }

  const createdLead = await res.clone().json().catch(() => null);
  await refreshData(['/api/leads', '/api/tasks', '/api/activities']);
  return await res.json() as any;
}

export async function updateLeadInFirestore(
  leadId: string,
  updates: Partial<Lead>,
  userId: string,
  userName: string
): Promise<void> {
  const res = await fetch('/api/leads/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadId, updates, userId, userName })
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error((errorBody as any)?.error || 'Failed to update lead');
  }

  await refreshData(['/api/leads', '/api/activities']);
}

export async function grabTaskAtomic(taskId: string, userId: string, userName: string): Promise<{ success: boolean; message: string; task?: Task }> {
  const res = await fetch('/api/tasks/grab', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId, userId, userName })
  });
  if (!res.ok) return { success: false, message: 'Failed to grab task' };
  return await res.json() as any;
}
  if (!res.ok) return { success: false, message: 'Failed to grab task' };
  const result = await res.json() as any;
  await refreshData(['/api/tasks', '/api/leads', '/api/activities']);
  return result;
}

export async function completeTaskAtomic(
  taskId: string,
  userId: string,
  userName: string,
  notes?: string,
  templateUrl?: string
): Promise<{ success: boolean; message: string; task?: Task }> {
  const res = await fetch('/api/tasks/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId, userId, userName, notes, templateUrl })
  });
  if (!res.ok) return { success: false, message: 'Failed to complete task' };
  return await res.json() as any;
}
  if (!res.ok) return { success: false, message: 'Failed to complete task' };
  const result = await res.json() as any;
  await refreshData(['/api/tasks', '/api/leads', '/api/activities']);
  return result;
}

export async function recordOutreachInFirestore(
  data: {
    leadId: string;
    channel: string;
    actionType?: string;
    targetRecipient?: string;
    status: OutreachAttempt['status'];
    messageUsed?: string;
    responseType?: OutreachAttempt['responseType'];
    responseNotes?: string;
    nextAction?: string;
    followUpDate?: string;
  },
  userId: string,
  userName: string
): Promise<OutreachAttempt> {
  const res = await fetch('/api/outreach', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data, userId, userName })
  });
  if (!res.ok) throw new Error('Failed to record outreach');
  return await res.json() as any;
}
  if (!res.ok) throw new Error('Failed to record outreach');
  const result = await res.json() as any;
  await refreshData(['/api/outreach', '/api/leads', '/api/activities']);
  return result;
}

export async function deleteOutreachAttemptInFirestore(id: string, userId: string): Promise<void> {
  const res = await fetch(`/api/outreach/${id}/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, userName: 'System User' })
  });
  if (!res.ok) throw new Error('Failed to delete outreach');
}
  if (!res.ok) throw new Error('Failed to delete outreach');
  await refreshData(['/api/outreach', '/api/leads', '/api/activities']);
}

export async function adminOverrideLeadOwner(
  adminUser: User,
  leadId: string,
  targetOwnerId: string,
  targetOwnerName: string,
  reason?: string
): Promise<void> {
  const res = await fetch('/api/leads/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadId, updates: { ownerId: targetOwnerId, ownerName: targetOwnerName }, userId: adminUser.id, userName: adminUser.displayName })
  });
  if (!res.ok) throw new Error('Failed to override owner');
}

export async function claimLeadOwner(leadId: string, userId: string, userName: string): Promise<void> {
  const res = await fetch('/api/leads/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadId, updates: { ownerId: userId, ownerName: userName }, userId, userName })
  });
  if (!res.ok) throw new Error('Failed to claim owner');
}
  if (!res.ok) throw new Error('Failed to claim owner');
  await refreshData(['/api/leads', '/api/activities']);
}

export async function releaseLeadOwner(leadId: string, userId: string, userName: string): Promise<void> {
  const res = await fetch('/api/leads/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadId, updates: { ownerId: '', ownerName: '' }, userId, userName })
  });
  if (!res.ok) throw new Error('Failed to release owner');
}
  if (!res.ok) throw new Error('Failed to release owner');
  await refreshData(['/api/leads', '/api/activities']);
}

export async function releaseTaskAtomic(taskId: string, userId: string, userName: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/tasks/release', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId, userId, userName })
  });
  if (!res.ok) return { success: false, message: 'Failed to release task' };
  return await res.json() as any;
}
  if (!res.ok) return { success: false, message: 'Failed to release task' };
  const result = await res.json() as any;
  await refreshData(['/api/tasks', '/api/leads', '/api/activities']);
  return result;
}

export function subscribeToLeadNotes(leadId: string, callback: (notes: LeadNote[]) => void) {
  return createPoller(`/api/leads/${leadId}/notes`, callback, 5000, 'notes');
}

export async function addLeadNoteInFirestore(
  leadId: string,
  authorId: string,
  authorName: string,
  content: string
): Promise<LeadNote> {
  const res = await fetch(`/api/leads/${leadId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ authorId, authorName, content })
  });
  if (!res.ok) throw new Error('Failed to add note');
  return await res.json() as any;
}
  if (!res.ok) throw new Error('Failed to add note');
  const result = await res.json() as LeadNote;
  await refreshData([`/api/leads/${encodeURIComponent(leadId)}/notes`, `/api/leads/${encodeURIComponent(leadId)}/detail`, '/api/activities']);
  return result;
}

export async function adminOverrideTask(
  adminUser: User,
  taskId: string,
  updates: Partial<Task>,
  reason?: string
): Promise<void> {
  const res = await fetch('/api/tasks/override', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminUserId: adminUser.id, taskId, updates })
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error((errorBody as any)?.error || 'Failed to override task');
  }
}
    throw new Error((errorBody as any)?.error || 'Failed to override task');
  }
  await refreshData(['/api/tasks', '/api/leads', '/api/activities']);
}

export function subscribeToImages(leadId: string, callback: (images: ImageAsset[]) => void) {
  return createPoller(`/api/leads/${leadId}/images`, callback, 5000, 'images');
}

export async function addExternalImageUrlToLead(
  leadId: string,
  url: string,
  filename: string,
  caption: string,
  uploadedBy: string,
  uploadedByName: string
): Promise<ImageAsset> {
  const res = await fetch('/api/uploads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadId, fileOrBase64: url, filename, caption, userId: uploadedBy, userName: uploadedByName })
  });
  if (!res.ok) throw new Error('Failed to add external image');
  return await res.json() as any;
}
  if (!res.ok) throw new Error('Failed to add external image');
  const result = await res.json() as ImageAsset;
  await refreshData([`/api/leads/${encodeURIComponent(leadId)}/images`, `/api/leads/${encodeURIComponent(leadId)}/detail`, '/api/leads', '/api/activities']);
  return result;
}

export async function deleteImageFromLead(
  imageId: string,
  leadId: string,
  userId: string,
  userName: string
): Promise<void> {
  const res = await fetch(`/api/images/${imageId}/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, userName })
  });
  if (!res.ok) throw new Error('Failed to delete image');
}
  if (!res.ok) throw new Error('Failed to delete image');
  await refreshData([`/api/leads/${encodeURIComponent(leadId)}/images`, `/api/leads/${encodeURIComponent(leadId)}/detail`, '/api/leads', '/api/activities']);
}

export async function uploadClipboardOrFileToFirebaseStorage(
  leadId: string,
  fileOrBase64: File | string,
  userId: string,
  userName: string,
  filename: string,
  caption?: string
): Promise<ImageAsset> {
  let base64 = '';
  if (fileOrBase64 instanceof File) {
    base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(fileOrBase64);
    });
  } else {
    base64 = fileOrBase64;
  }

  const res = await fetch('/api/uploads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadId, fileOrBase64: base64, filename, caption, userId, userName })
  });
  if (!res.ok) throw new Error('Failed to upload image');
  return await res.json() as any;
}
  if (!res.ok) throw new Error('Failed to upload image');
  const result = await res.json() as ImageAsset;
  await refreshData([`/api/leads/${encodeURIComponent(leadId)}/images`, `/api/leads/${encodeURIComponent(leadId)}/detail`, '/api/leads', '/api/activities']);
  return result;
}

export async function deleteLeadCascade(leadId: string, userId: string, userName: string): Promise<void> {
  const res = await fetch('/api/leads/delete-cascade', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leadId, userId, userName })
  });
  if (!res.ok) throw new Error('Failed to delete lead');
}
  if (!res.ok) throw new Error('Failed to delete lead');
  await refreshData(['/api/leads', '/api/tasks', '/api/outreach', '/api/activities']);
}

export const deleteLead = deleteLeadCascade;

export async function deleteUserProfile(adminUser: User, targetUid: string, reason?: string): Promise<void> {
  const res = await fetch(`/api/users/update-role-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminUserId: adminUser.id, targetUid, updates: { status: 'inactive' }, reason })
  });
  if (!res.ok) throw new Error('Failed to disable user profile');
}
  if (!res.ok) throw new Error('Failed to disable user profile');
  await refreshData(['/api/users', '/api/activities']);
}

export async function deleteContactFromLead(leadId: string, contactId: string, userId: string, userName: string): Promise<void> {
  const res = await fetch(`/api/contacts/${contactId}/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, userName })
  });
  if (!res.ok) throw new Error('Failed to delete contact');
}
  if (!res.ok) throw new Error('Failed to delete contact');
  await refreshData([`/api/leads/${encodeURIComponent(leadId)}/detail`, '/api/leads', '/api/activities']);
}

export async function deleteOutreachAttempt(attemptId: string, leadId: string, userId: string, userName: string): Promise<void> {
  const res = await fetch(`/api/outreach/${attemptId}/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, userName })
  });
  if (!res.ok) throw new Error('Failed to delete outreach attempt');
}
  if (!res.ok) throw new Error('Failed to delete outreach attempt');
  await refreshData(['/api/outreach', '/api/leads', '/api/activities']);
}

export async function deleteLeadNote(noteId: string, leadId: string, userId: string, userName: string): Promise<void> {
  const res = await fetch(`/api/notes/${noteId}/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, userName })
  });
  if (!res.ok) throw new Error('Failed to delete note');
}
  if (!res.ok) throw new Error('Failed to delete note');
  await refreshData([`/api/leads/${encodeURIComponent(leadId)}/notes`, `/api/leads/${encodeURIComponent(leadId)}/detail`, '/api/activities']);
}

export async function deleteTask(taskId: string, leadId: string, userId: string, userName: string): Promise<void> {
  const res = await fetch(`/api/tasks/${taskId}/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, userName })
  });
  if (!res.ok) throw new Error('Failed to delete task');
}
  if (!res.ok) throw new Error('Failed to delete task');
  await refreshData(['/api/tasks', '/api/leads', '/api/activities']);
}

export async function clearLeadPrototypeUrl(leadId: string, userId: string, userName: string): Promise<void> {
  const res = await fetch(`/api/leads/${leadId}/clear-prototype`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, userName })
  });
  if (!res.ok) throw new Error('Failed to clear prototype URL');
}
  if (!res.ok) throw new Error('Failed to clear prototype URL');
  await refreshData(['/api/leads', `/api/leads/${encodeURIComponent(leadId)}/detail`, '/api/activities']);
}

export async function attachLiveWebsiteLinkToLead(
  leadId: string,
  url: string,
  userId: string,
  userName: string
): Promise<{ lead: Lead }> {
  const res = await fetch(`/api/leads/${leadId}/attach-live-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, userId, userName })
  });
  if (!res.ok) throw new Error('Failed to attach live link');
  return await res.json() as any;
}
  if (!res.ok) throw new Error('Failed to attach live link');
  const result = await res.json() as any;
  await refreshData(['/api/leads', '/api/financial-records', '/api/activities']);
  return result;
}

export async function removeLiveWebsiteLinkFromLead(leadId: string, userId: string, userName: string, reason?: string): Promise<void> {
  const res = await fetch(`/api/leads/${leadId}/remove-live-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, userName, reason })
  });
  if (!res.ok) throw new Error('Failed to remove live link');
}
  if (!res.ok) throw new Error('Failed to remove live link');
  await refreshData(['/api/leads', '/api/financial-records', '/api/activities']);
}

export async function reassignLiveWebsiteLinkToLead(
  oldLeadId: string,
  newLeadId: string,
  url: string,
  userId: string,
  userName: string,
  reason?: string
): Promise<{ toLead: Lead }> {
  const res = await fetch(`/api/leads/${oldLeadId}/reassign-live-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newLeadId, url, userId, userName, reason })
  });
  if (!res.ok) throw new Error('Failed to reassign live link');
  return await res.json() as any;
}
  if (!res.ok) throw new Error('Failed to reassign live link');
  const result = await res.json() as any;
  await refreshData(['/api/leads', '/api/activities']);
  return result;
}

export async function evaluateAndAwardDealBonuses(leadId: string, userId: string, userName: string): Promise<void> {
  const res = await fetch(`/api/leads/${leadId}/award-bonuses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, userName })
  });
  if (!res.ok) throw new Error('Failed to award bonuses');
}
  if (!res.ok) throw new Error('Failed to award bonuses');
  await refreshData(['/api/leads', '/api/financial-records', '/api/activities']);
}

export function subscribeToFinancialRecords(callback: (records: FinancialRecord[]) => void): () => void {
  return createPoller('/api/financial-records', callback, 5000);
}

export async function adminReverseFinancialRecord(recordId: string, reason: string, adminUser: User): Promise<void> {
  const res = await fetch(`/api/financial-records/${recordId}/reverse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminUserId: adminUser.id, reason })
  });
  if (!res.ok) throw new Error('Failed to reverse financial record');
}
  if (!res.ok) throw new Error('Failed to reverse financial record');
  await refreshData(['/api/financial-records']);
}

export async function adminUpdateFinancialRecord(
  recordId: string,
  updates: Partial<FinancialRecord>,
  reason: string,
  adminUser: User
): Promise<void> {
  const res = await fetch(`/api/financial-records/${recordId}/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminUserId: adminUser.id, updates, reason })
  });
  if (!res.ok) throw new Error('Failed to update financial record');
}
  if (!res.ok) throw new Error('Failed to update financial record');
  await refreshData(['/api/financial-records']);
}

export async function adminCreateManualFinancialRecord(payload: any, adminUser: User): Promise<void> {
  const res = await fetch(`/api/financial-records/manual`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminUserId: adminUser.id, payload })
  });
  if (!res.ok) throw new Error('Failed to create manual financial record');
}
  if (!res.ok) throw new Error('Failed to create manual financial record');
  await refreshData(['/api/financial-records']);
}
