import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  runTransaction,
  addDoc
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL
} from 'firebase/storage';
import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db, storage } from './firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  Lead,
  Task,
  OutreachAttempt,
  ImageAsset,
  User,
  StageHistory,
  LeadNote,
  ActivityLog,
  TaskType,
  FinancialRecord,
  FinancialActionType
} from '../types';
import { getPricingTierForCountry, formatMoney } from './financialModel';

// Helper to normalize strings for comparison
export function normalizePhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 9) {
    return cleaned.slice(-9);
  }
  return cleaned;
}

export function normalizeEmail(email: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Strips all undefined properties recursively from objects prior to writing to Firestore
 */
export function cleanFirestoreData<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: any = {};
  Object.keys(obj).forEach((key) => {
    const val = obj[key];
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        result[key] = cleanFirestoreData(val);
      } else {
        result[key] = val;
      }
    }
  });
  return result;
}

// ==========================================
// USER PROFILES & AUTH MANAGEMENT IN FIRESTORE
// ==========================================

export function subscribeToUsers(callback: (users: User[]) => void) {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const users: User[] = [];
    snapshot.forEach((docSnap) => {
      users.push({ id: docSnap.id, ...docSnap.data() } as User);
    });
    callback(users);
  }, (err) => {
    console.warn('Firestore users snapshot listener fallback:', err);
  });
}

export async function getUserProfile(uid: string): Promise<User | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() } as User;
    }
    return null;
  } catch (err) {
    console.error('Error getting user profile:', err);
    return null;
  }
}

export async function syncUserProfile(uid: string, email: string, displayName?: string): Promise<User> {
  const existing = await getUserProfile(uid);
  const now = new Date().toISOString();

  // If this is the admin email or first account, ensure role is admin
  const isAdminEmail = email.toLowerCase() === 'admin@webcraft.com' ||
                       email.toLowerCase() === 'tnconsultoria19@gmail.com' ||
                       email.toLowerCase() === 'olisbel@gmail.com';

  if (existing) {
    const updates: Partial<User> = {
      email,
      displayName: displayName || existing.displayName || email.split('@')[0],
      ...(isAdminEmail && existing.role !== 'admin' ? { role: 'admin' } : {})
    };
    await updateDoc(doc(db, 'users', uid), updates);
    return { ...existing, ...updates };
  } else {
    // Check if any users exist yet. If zero users, force first user to admin.
    const allUsersSnap = await getDocs(collection(db, 'users'));
    const isFirstUser = allUsersSnap.empty;

    const newUser: User = {
      id: uid,
      email,
      displayName: displayName || email.split('@')[0],
      role: (isAdminEmail || isFirstUser) ? 'admin' : 'member',
      status: 'active',
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80`,
      createdAt: now
    };

    await setDoc(doc(db, 'users', uid), newUser);
    return newUser;
  }
}

// Admin Provisioning of Team Member using Secondary Firebase Instance
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
  if (adminUser.role !== 'admin') {
    throw new Error('Only administrators can create new team member accounts.');
  }

  try {
    const newUid = 'usr_' + btoa(userData.email.toLowerCase()).replace(/=/g, '').replace(/[^a-zA-Z0-9]/g, '_');
    const now = new Date().toISOString();

    const newUser: User = {
      id: newUid,
      email: userData.email,
      displayName: userData.displayName,
      role: userData.role,
      status: 'active',
      phone: userData.phone || '',
      bio: userData.bio || '',
      storedPassword: userData.password,
      avatarUrl: `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80`,
      createdAt: now
    };

    await setDoc(doc(db, 'users', newUid), newUser);

    // Audit Log Entry
    await addDoc(collection(db, 'activities'), {
      userId: adminUser.id,
      userName: adminUser.displayName,
      action: 'user_created',
      entityType: 'user',
      entityId: newUid,
      entityName: userData.displayName,
      metadata: { email: userData.email, role: userData.role },
      timestamp: now
    });

    return newUser;
  } catch (err: any) {
    throw err;
  }
}

export async function updateUserRoleOrStatus(
  adminUser: User,
  targetUid: string,
  updates: { role?: 'admin' | 'member'; status?: 'active' | 'inactive' },
  reason?: string
): Promise<void> {
  if (adminUser.role !== 'admin') {
    throw new Error('Unauthorized. Only admins can update user permissions or status.');
  }

  const targetDoc = await getDoc(doc(db, 'users', targetUid));
  if (!targetDoc.exists()) throw new Error('Target user not found.');

  const previousData = targetDoc.data();
  const now = new Date().toISOString();

  await updateDoc(doc(db, 'users', targetUid), updates);

  // Log Audit Event
  await addDoc(collection(db, 'activities'), {
    userId: adminUser.id,
    userName: adminUser.displayName,
    action: updates.status ? 'user_status_changed' : 'user_role_changed',
    entityType: 'user',
    entityId: targetUid,
    entityName: previousData.displayName || targetUid,
    metadata: {
      previous: previousData,
      updated: updates,
      reason: reason || 'Admin override'
    },
    timestamp: now
  });
}

// Full Profile Update by Admin
export async function updateUserProfileByAdmin(
  adminUser: User,
  targetUid: string,
  updates: Partial<User>,
  reason?: string
): Promise<void> {
  if (adminUser.role !== 'admin') {
    throw new Error('Unauthorized. Only admins can edit user profiles.');
  }

  const targetRef = doc(db, 'users', targetUid);
  const targetDoc = await getDoc(targetRef);
  if (!targetDoc.exists()) throw new Error('Target user profile not found.');

  const previousData = targetDoc.data();
  const now = new Date().toISOString();

  await updateDoc(targetRef, updates);

  // Audit Log Entry
  await addDoc(collection(db, 'activities'), {
    userId: adminUser.id,
    userName: adminUser.displayName,
    action: 'user_profile_edited_by_admin',
    entityType: 'user',
    entityId: targetUid,
    entityName: updates.displayName || previousData.displayName || targetUid,
    metadata: {
      previous: previousData,
      updated: updates,
      reason: reason || 'Admin profile edit'
    },
    timestamp: now
  });
}

// Self Profile Update by Team Member
export async function updateOwnUserProfile(
  userUid: string,
  updates: Partial<User>
): Promise<void> {
  const userRef = doc(db, 'users', userUid);
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) throw new Error('User profile not found.');

  const previousData = userDoc.data();
  const now = new Date().toISOString();

  await updateDoc(userRef, updates);

  await addDoc(collection(db, 'activities'), {
    userId: userUid,
    userName: updates.displayName || previousData.displayName || userUid,
    action: 'user_self_profile_updated',
    entityType: 'user',
    entityId: userUid,
    entityName: updates.displayName || previousData.displayName || userUid,
    metadata: {
      updatedFields: Object.keys(updates)
    },
    timestamp: now
  });
}

// ==========================================
// REALTIME LISTENERS & CRUD FOR LEADS & TASKS
// ==========================================

export function subscribeToLeads(callback: (leads: Lead[]) => void) {
  const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const leads: Lead[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data.deletedAt) {
        leads.push({ id: docSnap.id, ...data } as Lead);
      }
    });
    callback(leads);
  }, (err) => {
    console.warn('Firestore leads snapshot listener fallback:', err);
  });
}

export function subscribeToTasks(callback: (tasks: Task[]) => void) {
  const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const tasks: Task[] = [];
    snapshot.forEach((docSnap) => {
      tasks.push({ id: docSnap.id, ...docSnap.data() } as Task);
    });
    callback(tasks);
  }, (err) => {
    console.warn('Firestore tasks snapshot listener fallback:', err);
  });
}

export function subscribeToOutreach(callback: (outreach: OutreachAttempt[]) => void) {
  const q = query(collection(db, 'outreachAttempts'), orderBy('sentAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const list: OutreachAttempt[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ id: docSnap.id, ...docSnap.data() } as OutreachAttempt);
    });
    callback(list);
  }, (err) => {
    console.warn('Firestore outreach snapshot listener fallback:', err);
  });
}

export function subscribeToActivities(callback: (activities: ActivityLog[]) => void) {
  const q = query(collection(db, 'activities'), orderBy('timestamp', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const logs: ActivityLog[] = [];
    snapshot.forEach((docSnap) => {
      logs.push({ id: docSnap.id, ...docSnap.data() } as ActivityLog);
    });
    callback(logs);
  }, (err) => {
    console.warn('Firestore activities snapshot listener fallback:', err);
  });
}

// CREATE LEAD
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
    contacts?: Array<{ type: any; value: string; contactPerson?: string; position?: string }>;
    channels?: string[];
  },
  userId: string,
  userName: string
): Promise<Lead> {
  const now = new Date().toISOString();
  const leadsSnap = await getDocs(collection(db, 'leads'));
  const count = leadsSnap.size + 101;
  const leadId = `LEAD-${String(count).padStart(6, '0')}`;

  const contactsList = (data.contacts || []).map((c, i) => ({
    id: `c-${i}-${Date.now()}`,
    leadId,
    type: c.type,
    value: c.value,
    normalizedValue: normalizePhone(c.value) || normalizeEmail(c.value),
    contactPerson: c.contactPerson || data.contactPerson || '',
    position: c.position || '',
    createdAt: now
  }));

  // If top-level phone or email was provided and not in contactsList, ensure it is added
  if (data.phone && !contactsList.some((c) => c.value === data.phone)) {
    contactsList.unshift({
      id: `c-phone-${Date.now()}`,
      leadId,
      type: 'primary_phone' as const,
      value: data.phone,
      normalizedValue: normalizePhone(data.phone),
      contactPerson: data.contactPerson || '',
      position: '',
      createdAt: now
    });
  }
  if (data.email && !contactsList.some((c) => c.value === data.email)) {
    contactsList.push({
      id: `c-email-${Date.now()}`,
      leadId,
      type: 'email' as const,
      value: data.email,
      normalizedValue: normalizeEmail(data.email),
      contactPerson: data.contactPerson || '',
      position: '',
      createdAt: now
    });
  }

  const newLead: Lead = {
    id: leadId,
    name: data.name,
    description: data.description || '',
    category: data.category || '',
    industry: data.industry || '',
    city: data.city || '',
    province: data.province || '',
    country: data.country || 'South Africa',
    address: data.address || '',
    website: data.website || '',
    existingWebsiteStatus: data.existingWebsiteStatus || 'None',
    googleBusinessUrl: data.googleBusinessUrl || '',
    sourceUrl: data.sourceUrl || '',
    sourceId: data.sourceId || '',
    contactPerson: data.contactPerson || '',
    phone: data.phone || '',
    email: data.email || '',
    notes: data.notes || '',
    source: data.source || 'Other',
    createdMethod: data.createdMethod || 'manual',
    stage: 'captured',
    priority: data.priority || 'normal',
    quality: 'verified',
    createdBy: userId,
    createdByName: userName,
    ownerId: userId,
    ownerName: userName,
    createdAt: now,
    updatedAt: now,
    projectDomainName: data.chatgptPackage?.projectDomainName || '',
    ...(data.chatgptPackage ? { chatgptPackage: data.chatgptPackage } : {}),
    outreachCount: 0,
    contacts: contactsList,
    channels: (data.channels || []).map((ch, i) => ({
      id: `ch-${i}-${Date.now()}`,
      leadId,
      channel: ch as any,
      createdAt: now
    }))
  };

  await setDoc(doc(db, 'leads', leadId), newLead);

  // Auto-create initial capture task (Completed)
  const captureTaskId = `task-${Date.now()}-1`;
  const captureTask: Task = {
    id: captureTaskId,
    leadId,
    leadName: newLead.name,
    leadStage: 'captured',
    taskTypeId: 'tt-1',
    taskTypeKey: 'capture',
    taskTypeName: 'Lead Research & Capture',
    status: 'completed',
    createdBy: userId,
    createdByName: userName,
    assignedTo: userId,
    assignedToName: userName,
    rateValue: 0,
    startedAt: now,
    completedAt: now,
    version: 1,
    createdAt: now
  };
  await setDoc(doc(db, 'tasks', captureTaskId), captureTask);

  // Auto-create next task: Template Prototype Creation (Available)
  const templateTaskId = `task-${Date.now()}-2`;
  const templateTask: Task = {
    id: templateTaskId,
    leadId,
    leadName: newLead.name,
    leadStage: 'captured',
    taskTypeId: 'tt-2',
    taskTypeKey: 'template',
    taskTypeName: 'Template Prototype Creation',
    status: 'available',
    createdBy: userId,
    createdByName: userName,
    rateValue: 1.0,
    version: 1,
    createdAt: now
  };
  await setDoc(doc(db, 'tasks', templateTaskId), templateTask);

  // Log Activity
  await addDoc(collection(db, 'activities'), {
    userId,
    userName,
    action: 'lead_created',
    entityType: 'lead',
    entityId: leadId,
    entityName: newLead.name,
    timestamp: now
  });

  return newLead;
}

export async function updateLeadInFirestore(
  leadId: string,
  updates: Partial<Lead>,
  userId: string,
  userName: string
): Promise<void> {
  const now = new Date().toISOString();
  const leadRef = doc(db, 'leads', leadId);

  await updateDoc(leadRef, {
    ...updates,
    updatedAt: now
  });

  await addDoc(collection(db, 'activities'), {
    userId,
    userName,
    action: 'lead_updated',
    entityType: 'lead',
    entityId: leadId,
    entityName: updates.name || leadId,
    metadata: { updates },
    timestamp: now
  });

  // If deal moved to won, completed, or marked closed, evaluate and award success bonuses
  if (updates.stage === 'won' || updates.stage === 'completed' || updates.isDealClosed) {
    try {
      await evaluateAndAwardDealBonuses(leadId, updates, userId, userName);
    } catch (bonusErr) {
      console.error('Error awarding deal bonuses:', bonusErr);
    }
  }
}

// ATOMIC TRANSACTION: GRAB TASK
export async function grabTaskAtomic(taskId: string, userId: string, userName: string): Promise<{ success: boolean; message: string; task?: Task }> {
  try {
    const taskRef = doc(db, 'tasks', taskId);

    const result = await runTransaction(db, async (transaction) => {
      const taskDoc = await transaction.get(taskRef);
      if (!taskDoc.exists()) {
        throw new Error('Task does not exist.');
      }

      const taskData = taskDoc.data() as Task;

      if (taskData.status !== 'available') {
        const takenBy = taskData.assignedToName || 'another team member';
        throw new Error(`This task is no longer available. It was grabbed by ${takenBy}.`);
      }

      const updatedTask: Partial<Task> = {
        status: 'in_progress',
        assignedTo: userId,
        assignedToName: userName,
        startedAt: new Date().toISOString(),
        version: (taskData.version || 1) + 1
      };

      transaction.update(taskRef, updatedTask);

      // Also update lead owner
      if (taskData.leadId) {
        const leadRef = doc(db, 'leads', taskData.leadId);
        transaction.update(leadRef, {
          ownerId: userId,
          ownerName: userName,
          updatedAt: new Date().toISOString()
        });
      }

      return { ...taskData, ...updatedTask } as Task;
    });

    // Log Activity
    await addDoc(collection(db, 'activities'), {
      userId,
      userName,
      action: 'task_grabbed',
      entityType: 'task',
      entityId: taskId,
      entityName: result.taskTypeName,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      message: `Task successfully grabbed by ${userName}!`,
      task: result
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to grab task'
    };
  }
}

// ATOMIC TRANSACTION: COMPLETE TASK
export async function completeTaskAtomic(
  taskId: string,
  userId: string,
  userName: string,
  notes?: string,
  templateUrl?: string
): Promise<{ success: boolean; message: string; task?: Task }> {
  try {
    const taskRef = doc(db, 'tasks', taskId);

    const result = await runTransaction(db, async (transaction) => {
      const taskDoc = await transaction.get(taskRef);
      if (!taskDoc.exists()) {
        throw new Error('Task not found.');
      }

      const taskData = taskDoc.data() as Task;
      if (taskData.status === 'completed') {
        throw new Error('Task is already completed.');
      }

      const completedAt = new Date().toISOString();
      const updatedTask: Partial<Task> = {
        status: 'completed',
        assignedTo: taskData.assignedTo || userId,
        assignedToName: taskData.assignedToName || userName,
        completedAt,
        notes: notes || taskData.notes || '',
        version: (taskData.version || 1) + 1
      };

      transaction.update(taskRef, updatedTask);

      // Workflow stage progression
      if (taskData.leadId) {
        const leadRef = doc(db, 'leads', taskData.leadId);
        const leadDoc = await transaction.get(leadRef);

        if (leadDoc.exists()) {
          const leadData = leadDoc.data() as Lead;
          const leadUpdates: Partial<Lead> = {
            updatedAt: completedAt
          };

          if (templateUrl) {
            leadUpdates.templateUrl = templateUrl;
            leadUpdates.previewUrl = templateUrl;
          }

          if (taskData.taskTypeKey === 'template') {
            leadUpdates.stage = 'ready_for_outreach';

            // Create next outreach task
            const nextTaskRef = doc(collection(db, 'tasks'));
            transaction.set(nextTaskRef, {
              id: nextTaskRef.id,
              leadId: leadData.id,
              leadName: leadData.name,
              leadStage: 'ready_for_outreach',
              taskTypeId: 'tt-3',
              taskTypeKey: 'outreach',
              taskTypeName: 'Initial Business Outreach',
              status: 'available',
              createdBy: userId,
              createdByName: userName,
              rateValue: 0.5,
              version: 1,
              createdAt: completedAt
            });
          } else if (taskData.taskTypeKey === 'outreach') {
            leadUpdates.stage = 'awaiting_response';
          }

          transaction.update(leadRef, leadUpdates);
        }
      }

      return { ...taskData, ...updatedTask } as Task;
    });

    await addDoc(collection(db, 'activities'), {
      userId,
      userName,
      action: 'task_completed',
      entityType: 'task',
      entityId: taskId,
      entityName: result.taskTypeName,
      timestamp: new Date().toISOString()
    });

    return {
      success: true,
      message: 'Task completed successfully!',
      task: result
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Failed to complete task'
    };
  }
}

// RECORD OUTREACH
export async function recordOutreachInFirestore(
  data: {
    leadId: string;
    channel: string;
    actionType?: OutreachAttempt['actionType'];
    targetRecipient?: string;
    messageUsed?: string;
    status: OutreachAttempt['status'];
    responseType?: OutreachAttempt['responseType'];
    responseNotes?: string;
    nextAction?: string;
    followUpDate?: string;
  },
  userId: string,
  userName: string
): Promise<OutreachAttempt> {
  const now = new Date().toISOString();
  const attemptId = `oa-${Date.now()}`;

  const attempt: OutreachAttempt = {
    id: attemptId,
    leadId: data.leadId,
    channel: data.channel,
    actionType: data.actionType || 'other',
    targetRecipient: data.targetRecipient || '',
    sentBy: userId,
    sentByName: userName,
    sentAt: now,
    messageUsed: data.messageUsed || '',
    status: data.status || 'sent',
    responseType: data.responseType,
    responseNotes: data.responseNotes || '',
    nextAction: data.nextAction || '',
    followUpDate: data.followUpDate
  };

  const cleanedAttempt = cleanFirestoreData(attempt);
  await setDoc(doc(db, 'outreachAttempts', attemptId), cleanedAttempt);

  // Update lead with latest outreach metadata and pipeline stage progression
  const leadRef = doc(db, 'leads', data.leadId);
  const leadSnap = await getDoc(leadRef);

  if (leadSnap.exists()) {
    const currentLead = leadSnap.data() as Lead;
    const currentOutreachCount = (currentLead.outreachCount || 0) + 1;
    const leadUpdates: Partial<Lead> = {
      lastOutreachAt: now,
      lastOutreachChannel: data.channel,
      outreachCount: currentOutreachCount,
      updatedAt: now
    };

    if (data.responseType === 'interested') {
      leadUpdates.stage = 'interested';
    } else if (data.status === 'responded' || data.responseType) {
      if (currentLead.stage !== 'interested' && currentLead.stage !== 'won') {
        leadUpdates.stage = 'response_received';
      }
    } else if (
      currentLead.stage === 'captured' ||
      currentLead.stage === 'ready_for_outreach' ||
      currentLead.stage === 'template_completed'
    ) {
      leadUpdates.stage = 'outreach_sent';
    }

    // Set message sender for potential/future deal success bonus if not already set
    if (!currentLead.messageSenderId) {
      leadUpdates.messageSenderId = userId;
      leadUpdates.messageSenderName = userName;
      leadUpdates.messageSentAt = now;
    }

    await updateDoc(leadRef, cleanFirestoreData(leadUpdates));

    // Record Action Earning (R0.50 or proportional in foreign currency)
    const isSent = data.status === 'sent' || data.status === 'delivered' || data.status === 'responded';
    if (isSent) {
      const tier = getPricingTierForCountry(currentLead.country);
      const finId = `fin-msg-${attemptId}`;
      const finRecord: FinancialRecord = {
        id: finId,
        userId,
        userName,
        leadId: data.leadId,
        leadName: currentLead.name || data.leadId,
        action: 'MESSAGE_SENT',
        amount: tier.messageActionRate,
        currency: tier.currency,
        currencySymbol: tier.currencySymbol,
        timestamp: now,
        earningType: 'action',
        status: 'earned',
        notes: `Outreach sent via ${data.channel} to ${data.targetRecipient || currentLead.name}`
      };
      await setDoc(doc(db, 'financialRecords', finId), cleanFirestoreData(finRecord));
    }
  }

  const activityPayload = cleanFirestoreData({
    userId,
    userName,
    action: 'outreach_recorded',
    entityType: 'outreach',
    entityId: attemptId,
    entityName: `Outreach via ${data.channel} to ${data.leadId}`,
    metadata: {
      channel: data.channel,
      status: data.status,
      responseType: data.responseType,
      targetRecipient: data.targetRecipient
    },
    timestamp: now
  });

  await addDoc(collection(db, 'activities'), activityPayload);

  return attempt;
}

export async function deleteOutreachAttemptInFirestore(
  attemptId: string,
  leadId: string,
  userId: string,
  userName: string
): Promise<void> {
  const now = new Date().toISOString();
  await deleteDoc(doc(db, 'outreachAttempts', attemptId));

  await addDoc(collection(db, 'activities'), {
    userId,
    userName,
    action: 'outreach_deleted',
    entityType: 'outreach',
    entityId: attemptId,
    entityName: `Deleted outreach attempt from lead ${leadId}`,
    timestamp: now
  });
}

// ADMIN OVERRIDES & AUDITING
// ==========================================

export async function adminOverrideLeadOwner(
  adminUser: User,
  leadId: string,
  newOwnerId: string,
  newOwnerName: string,
  reason?: string
): Promise<void> {
  if (adminUser.role !== 'admin' && adminUser.role !== 'manager') {
    throw new Error('Unauthorized. Admin or Manager role required.');
  }

  const now = new Date().toISOString();
  const leadRef = doc(db, 'leads', leadId);

  await updateDoc(leadRef, {
    ownerId: newOwnerId,
    ownerName: newOwnerName,
    updatedAt: now
  });

  await addDoc(collection(db, 'activities'), {
    userId: adminUser.id,
    userName: adminUser.displayName,
    action: 'admin_override_lead_owner',
    entityType: 'lead',
    entityId: leadId,
    entityName: leadId,
    metadata: {
      newOwnerId,
      newOwnerName,
      reason: reason || 'Admin ownership override'
    },
    timestamp: now
  });
}

export async function claimLeadOwner(
  leadId: string,
  userId: string,
  userName: string
): Promise<void> {
  const now = new Date().toISOString();
  const leadRef = doc(db, 'leads', leadId);

  await updateDoc(leadRef, {
    ownerId: userId,
    ownerName: userName,
    updatedAt: now
  });

  await addDoc(collection(db, 'activities'), {
    userId,
    userName,
    action: 'lead_claimed',
    entityType: 'lead',
    entityId: leadId,
    timestamp: now
  });
}

export async function releaseLeadOwner(
  leadId: string,
  userId: string,
  userName: string
): Promise<void> {
  const now = new Date().toISOString();
  const leadRef = doc(db, 'leads', leadId);

  await updateDoc(leadRef, {
    ownerId: '',
    ownerName: 'Unassigned',
    updatedAt: now
  });

  await addDoc(collection(db, 'activities'), {
    userId,
    userName,
    action: 'lead_released',
    entityType: 'lead',
    entityId: leadId,
    timestamp: now
  });
}

export async function releaseTaskAtomic(
  taskId: string,
  userId: string,
  userName: string
): Promise<{ success: boolean; message: string }> {
  try {
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, {
      status: 'available',
      assignedTo: '',
      assignedToName: '',
      startedAt: null
    });

    await addDoc(collection(db, 'activities'), {
      userId,
      userName,
      action: 'task_released',
      entityType: 'task',
      entityId: taskId,
      timestamp: new Date().toISOString()
    });

    return { success: true, message: 'Task released back to the available pool.' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to release task' };
  }
}

// ==========================================
// LEAD COMMENTS & ENGAGEMENT NOTES
// ==========================================

export function subscribeToLeadNotes(leadId: string, callback: (notes: LeadNote[]) => void) {
  const q = query(
    collection(db, 'leadNotes'),
    where('leadId', '==', leadId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notes: LeadNote[] = [];
      snapshot.forEach((docSnap) => {
        notes.push({ id: docSnap.id, ...docSnap.data() } as LeadNote);
      });
      callback(notes);
    },
    (err) => {
      console.warn('Firestore leadNotes snapshot fallback:', err);
    }
  );
}

export async function addLeadNoteInFirestore(
  leadId: string,
  content: string,
  userId: string,
  userName: string
): Promise<LeadNote> {
  const now = new Date().toISOString();
  const noteId = `note-${Date.now()}`;

  const note: LeadNote = {
    id: noteId,
    leadId,
    authorId: userId,
    authorName: userName,
    content: content.trim(),
    createdAt: now
  };

  await setDoc(doc(db, 'leadNotes', noteId), note);

  // Update lead activity timestamp
  await updateDoc(doc(db, 'leads', leadId), {
    lastActivityAt: now,
    updatedAt: now
  });

  await addDoc(collection(db, 'activities'), {
    userId,
    userName,
    action: 'note_added',
    entityType: 'lead',
    entityId: leadId,
    entityName: content.slice(0, 30),
    timestamp: now
  });

  return note;
}

export async function adminOverrideTask(
  adminUser: User,
  taskId: string,
  updates: Partial<Task>,
  reason: string
): Promise<void> {
  if (adminUser.role !== 'admin') {
    throw new Error('Unauthorized. Admin override required.');
  }

  const taskRef = doc(db, 'tasks', taskId);
  const taskSnap = await getDoc(taskRef);
  if (!taskSnap.exists()) throw new Error('Task not found.');

  const prevTask = taskSnap.data();
  const now = new Date().toISOString();

  await updateDoc(taskRef, {
    ...updates,
    version: (prevTask.version || 1) + 1
  });

  // Log Mandatory Audit Entry
  await addDoc(collection(db, 'activities'), {
    userId: adminUser.id,
    userName: adminUser.displayName,
    action: 'admin_override_task',
    entityType: 'task',
    entityId: taskId,
    entityName: prevTask.taskTypeName || taskId,
    metadata: {
      adminId: adminUser.id,
      adminName: adminUser.displayName,
      previous: prevTask,
      updated: updates,
      reason: reason || 'Admin override'
    },
    timestamp: now
  });
}

// UPLOAD IMAGE TO FIREBASE STORAGE & FIRESTORE
export function subscribeToImages(leadId: string, callback: (images: ImageAsset[]) => void) {
  const q = query(
    collection(db, 'images'),
    where('leadId', '==', leadId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const images: ImageAsset[] = [];
      snapshot.forEach((docSnap) => {
        images.push({ id: docSnap.id, ...docSnap.data() } as ImageAsset);
      });
      callback(images);
    },
    (err) => {
      console.warn('Firestore images snapshot fallback:', err);
    }
  );
}

export async function addExternalImageUrlToLead(
  leadId: string,
  url: string,
  filename: string,
  caption: string,
  userId: string,
  userName: string
): Promise<ImageAsset> {
  const imageId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const imageMeta: ImageAsset = {
    id: imageId,
    leadId,
    objectKey: '',
    url,
    filename: filename || 'Attached_Image.jpg',
    mimeType: 'image/jpeg',
    fileSize: 0,
    uploadedBy: userId,
    uploadedByName: userName,
    isPrimary: false,
    caption: caption || 'Attached image',
    createdAt: new Date().toISOString()
  };

  await setDoc(doc(db, 'images', imageId), imageMeta);

  const leadRef = doc(db, 'leads', leadId);
  const leadSnap = await getDoc(leadRef);
  if (leadSnap.exists()) {
    const curCount = leadSnap.data().imagesCount || 0;
    await updateDoc(leadRef, { imagesCount: curCount + 1, updatedAt: new Date().toISOString() });
  }

  await addDoc(collection(db, 'activities'), {
    userId,
    userName,
    action: 'image_attached',
    entityType: 'lead',
    entityId: leadId,
    entityName: filename || 'Image attached',
    timestamp: new Date().toISOString()
  });

  return imageMeta;
}

export async function deleteImageFromLead(
  imageId: string,
  leadId: string,
  userId: string,
  userName: string
): Promise<void> {
  await deleteDoc(doc(db, 'images', imageId));
  
  const leadRef = doc(db, 'leads', leadId);
  const leadSnap = await getDoc(leadRef);
  if (leadSnap.exists()) {
    const curCount = leadSnap.data().imagesCount || 1;
    await updateDoc(leadRef, { imagesCount: Math.max(0, curCount - 1), updatedAt: new Date().toISOString() });
  }

  await addDoc(collection(db, 'activities'), {
    userId,
    userName,
    action: 'image_deleted',
    entityType: 'lead',
    entityId: leadId,
    entityName: `Image deleted from lead ${leadId}`,
    timestamp: new Date().toISOString()
  });
}

export async function uploadClipboardOrFileToFirebaseStorage(
  leadId: string,
  fileOrBase64: File | string,
  userId: string,
  userName: string,
  filename?: string,
  caption?: string
): Promise<ImageAsset> {
  const imageId = `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  let downloadUrl = '';

  try {
    const storagePath = `lead-assets/${leadId}/${imageId}.jpg`;
    const storageRef = ref(storage, storagePath);

    if (typeof fileOrBase64 === 'string') {
      if (fileOrBase64.startsWith('http://') || fileOrBase64.startsWith('https://')) {
        downloadUrl = fileOrBase64;
      } else {
        const cleanBase64 = fileOrBase64.replace(/^data:image\/\w+;base64,/, '');
        await uploadString(storageRef, cleanBase64, 'base64', { contentType: 'image/jpeg' });
        downloadUrl = await getDownloadURL(storageRef);
      }
    } else {
      await uploadBytes(storageRef, fileOrBase64);
      downloadUrl = await getDownloadURL(storageRef);
    }
  } catch (err) {
    console.warn('Firebase Storage upload fallback triggered:', err);
    if (typeof fileOrBase64 === 'string') {
      downloadUrl = fileOrBase64;
    } else {
      downloadUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(fileOrBase64);
      });
    }
  }

  const imageMeta: ImageAsset = {
    id: imageId,
    leadId,
    objectKey: `lead-assets/${leadId}/${imageId}`,
    url: downloadUrl,
    filename: filename || (typeof fileOrBase64 === 'string' ? 'Pasted_Screenshot.png' : fileOrBase64.name),
    mimeType: typeof fileOrBase64 === 'string' ? 'image/png' : fileOrBase64.type,
    fileSize: typeof fileOrBase64 === 'string' ? Math.round((fileOrBase64.length || 1000) * 0.75) : fileOrBase64.size,
    uploadedBy: userId,
    uploadedByName: userName,
    isPrimary: false,
    caption: caption || 'Attached picture',
    createdAt: new Date().toISOString()
  };

  await setDoc(doc(db, 'images', imageId), imageMeta);

  const leadRef = doc(db, 'leads', leadId);
  const leadSnap = await getDoc(leadRef);
  if (leadSnap.exists()) {
    const curCount = leadSnap.data().imagesCount || 0;
    await updateDoc(leadRef, { imagesCount: curCount + 1, updatedAt: new Date().toISOString() });
  }

  await addDoc(collection(db, 'activities'), {
    userId,
    userName,
    action: 'image_uploaded',
    entityType: 'lead',
    entityId: leadId,
    entityName: imageMeta.filename,
    timestamp: new Date().toISOString()
  });

  return imageMeta;
}

// ==========================================
// DELETION OPERATIONS (Cascade & Aspect Deletion)
// ==========================================

export async function deleteLeadCascade(
  leadId: string,
  userId: string,
  userName: string
): Promise<void> {
  const now = new Date().toISOString();
  const safeUserId = userId || 'system';
  const safeUserName = userName || 'Admin';

  // 1. Fetch lead name for logging
  let leadName = leadId;
  try {
    const leadSnap = await getDoc(doc(db, 'leads', leadId));
    if (leadSnap.exists()) {
      leadName = leadSnap.data().name || leadId;
    }
  } catch (err) {
    console.warn('Could not fetch lead name before deletion:', err);
  }

  // 2. Delete associated tasks
  try {
    const tasksQ = query(collection(db, 'tasks'), where('leadId', '==', leadId));
    const tasksSnap = await getDocs(tasksQ);
    for (const taskDoc of tasksSnap.docs) {
      await deleteDoc(doc(db, 'tasks', taskDoc.id));
    }
  } catch (err) {
    console.warn('Error deleting associated tasks:', err);
  }

  // 3. Delete associated outreach attempts
  try {
    const outreachQ = query(collection(db, 'outreachAttempts'), where('leadId', '==', leadId));
    const outreachSnap = await getDocs(outreachQ);
    for (const outDoc of outreachSnap.docs) {
      await deleteDoc(doc(db, 'outreachAttempts', outDoc.id));
    }
  } catch (err) {
    console.warn('Error deleting associated outreach logs:', err);
  }

  // 4. Delete associated lead notes
  try {
    const notesQ = query(collection(db, 'leadNotes'), where('leadId', '==', leadId));
    const notesSnap = await getDocs(notesQ);
    for (const noteDoc of notesSnap.docs) {
      await deleteDoc(doc(db, 'leadNotes', noteDoc.id));
    }
  } catch (err) {
    console.warn('Error deleting associated lead notes:', err);
  }

  // 5. Delete associated image assets metadata
  try {
    const imagesQ = query(collection(db, 'images'), where('leadId', '==', leadId));
    const imagesSnap = await getDocs(imagesQ);
    for (const imgDoc of imagesSnap.docs) {
      await deleteDoc(doc(db, 'images', imgDoc.id));
    }
  } catch (err) {
    console.warn('Error deleting associated images:', err);
  }

  // 6. Delete main lead document (soft delete flag + hard delete for maximum reliability across realtime listeners)
  try {
    await updateDoc(doc(db, 'leads', leadId), { deletedAt: now });
  } catch (err) {
    console.warn('Soft-delete tag before hard delete:', err);
  }

  await deleteDoc(doc(db, 'leads', leadId));

  // 7. Log audit activity
  try {
    await addDoc(collection(db, 'activities'), {
      userId: safeUserId,
      userName: safeUserName,
      action: 'lead_deleted',
      entityType: 'lead',
      entityId: leadId,
      entityName: leadName,
      timestamp: now
    });
  } catch (err) {
    console.warn('Could not record activity log for lead deletion:', err);
  }
}

export const deleteLead = deleteLeadCascade;

// Delete User Profile by Admin
export async function deleteUserProfile(
  adminUser: User,
  targetUid: string
): Promise<void> {
  if (adminUser.role !== 'admin') {
    throw new Error('Unauthorized. Only administrators can delete team member profiles.');
  }
  if (adminUser.id === targetUid) {
    throw new Error('You cannot delete your own active administrator profile.');
  }

  // 1. Fetch user name for logging
  let targetName = targetUid;
  try {
    const userSnap = await getDoc(doc(db, 'users', targetUid));
    if (userSnap.exists()) {
      targetName = userSnap.data().displayName || targetUid;
    }
  } catch (err) {
    console.warn('Could not fetch target user name:', err);
  }

  // 2. Unassign user from leads
  try {
    const leadsQ = query(collection(db, 'leads'), where('ownerId', '==', targetUid));
    const leadsSnap = await getDocs(leadsQ);
    for (const leadDoc of leadsSnap.docs) {
      await updateDoc(doc(db, 'leads', leadDoc.id), {
        ownerId: '',
        ownerName: 'Unassigned'
      });
    }
  } catch (err) {
    console.warn('Error unassigning leads from user being deleted:', err);
  }

  // 3. Unassign user from tasks
  try {
    const tasksQ = query(collection(db, 'tasks'), where('assignedToId', '==', targetUid));
    const tasksSnap = await getDocs(tasksQ);
    for (const taskDoc of tasksSnap.docs) {
      await updateDoc(doc(db, 'tasks', taskDoc.id), {
        assignedToId: '',
        assignedToName: 'Unassigned',
        status: 'pending'
      });
    }
  } catch (err) {
    console.warn('Error unassigning tasks from user being deleted:', err);
  }

  // 4. Delete user doc from firestore
  await deleteDoc(doc(db, 'users', targetUid));

  // 5. Log audit activity
  try {
    await addDoc(collection(db, 'activities'), {
      userId: adminUser.id,
      userName: adminUser.displayName,
      action: 'user_profile_deleted',
      entityType: 'user',
      entityId: targetUid,
      entityName: targetName,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Could not record activity log for user deletion:', err);
  }
}

export async function deleteContactFromLead(
  leadId: string,
  contactId: string,
  userId: string,
  userName: string
): Promise<void> {
  const leadRef = doc(db, 'leads', leadId);
  const leadSnap = await getDoc(leadRef);
  if (!leadSnap.exists()) throw new Error('Lead not found.');

  const currentLead = leadSnap.data() as Lead;
  const updatedContacts = (currentLead.contacts || []).filter((c) => c.id !== contactId);

  const now = new Date().toISOString();
  await updateDoc(leadRef, {
    contacts: updatedContacts,
    updatedAt: now
  });

  await addDoc(collection(db, 'activities'), {
    userId,
    userName,
    action: 'contact_deleted',
    entityType: 'lead',
    entityId: leadId,
    entityName: `Contact deleted from ${currentLead.name}`,
    timestamp: now
  });
}

export async function deleteOutreachAttempt(
  outreachId: string,
  leadId: string,
  userId: string,
  userName: string
): Promise<void> {
  await deleteDoc(doc(db, 'outreachAttempts', outreachId));
  const now = new Date().toISOString();

  await addDoc(collection(db, 'activities'), {
    userId,
    userName,
    action: 'outreach_deleted',
    entityType: 'outreach',
    entityId: outreachId,
    entityName: `Outreach log deleted for lead ${leadId}`,
    timestamp: now
  });
}

export async function deleteLeadNote(
  noteId: string,
  leadId: string,
  userId: string,
  userName: string
): Promise<void> {
  await deleteDoc(doc(db, 'leadNotes', noteId));
  const now = new Date().toISOString();

  await addDoc(collection(db, 'activities'), {
    userId,
    userName,
    action: 'note_deleted',
    entityType: 'note',
    entityId: noteId,
    entityName: `Comment deleted for lead ${leadId}`,
    timestamp: now
  });
}

export async function deleteTask(
  taskId: string,
  leadId: string,
  userId: string,
  userName: string
): Promise<void> {
  await deleteDoc(doc(db, 'tasks', taskId));
  const now = new Date().toISOString();

  await addDoc(collection(db, 'activities'), {
    userId,
    userName,
    action: 'task_deleted',
    entityType: 'task',
    entityId: taskId,
    entityName: `Task deleted for lead ${leadId}`,
    timestamp: now
  });
}

export async function clearLeadPrototypeUrl(
  leadId: string,
  userId: string,
  userName: string
): Promise<void> {
  const now = new Date().toISOString();
  await updateDoc(doc(db, 'leads', leadId), {
    templateUrl: '',
    previewUrl: '',
    updatedAt: now
  });

  await addDoc(collection(db, 'activities'), {
    userId,
    userName,
    action: 'prototype_cleared',
    entityType: 'lead',
    entityId: leadId,
    entityName: `Prototype URL cleared for lead ${leadId}`,
    timestamp: now
  });
}

/**
 * Attaches a live Cloudflare or custom website URL to an existing lead/project.
 * Updates templateUrl, previewUrl, workingUrl and creates an audit activity entry.
 */
export async function attachLiveWebsiteLinkToLead(
  leadId: string,
  liveUrl: string,
  userId: string,
  userName: string
): Promise<{ success: boolean; lead: Lead }> {
  const leadRef = doc(db, 'leads', leadId);
  const leadSnap = await getDoc(leadRef);
  if (!leadSnap.exists()) {
    throw new Error('Client record not found in database.');
  }

  const existingLead = leadSnap.data() as Lead;
  const now = new Date().toISOString();

  const updates: Partial<Lead> = {
    templateUrl: liveUrl,
    previewUrl: liveUrl,
    workingUrl: liveUrl,
    updatedAt: now
  };

  // Record link creator for future deal success bonus if not already set
  if (!existingLead.linkCreatorId) {
    updates.linkCreatorId = userId;
    updates.linkCreatorName = userName;
    updates.linkCreatedAt = now;
  }

  // If lead is in captured or template_in_progress, advance to template_completed
  if (existingLead.stage === 'captured' || existingLead.stage === 'template_in_progress') {
    updates.stage = 'template_completed';
  }

  await updateDoc(leadRef, updates);

  // Record Action Earning (R1.00 or proportional in foreign currency)
  const tier = getPricingTierForCountry(existingLead.country);
  const finId = `fin-link-${leadId}-${userId}-${Date.now()}`;
  const finRecord: FinancialRecord = {
    id: finId,
    userId,
    userName,
    leadId,
    leadName: existingLead.name,
    action: 'LINK_CREATED',
    amount: tier.linkActionRate,
    currency: tier.currency,
    currencySymbol: tier.currencySymbol,
    timestamp: now,
    earningType: 'action',
    status: 'earned',
    notes: `Added prototype website link: ${liveUrl}`
  };
  await setDoc(doc(db, 'financialRecords', finId), cleanFirestoreData(finRecord));

  // If deal is already won/completed, trigger deal bonus check
  if (existingLead.stage === 'won' || existingLead.stage === 'completed' || existingLead.isDealClosed) {
    await evaluateAndAwardDealBonuses(leadId, updates, userId, userName);
  }

  // Complete any open template task if one exists
  try {
    const qTasks = query(
      collection(db, 'tasks'),
      where('leadId', '==', leadId),
      where('taskTypeKey', '==', 'template'),
      where('status', 'in', ['available', 'assigned', 'in_progress'])
    );
    const taskSnaps = await getDocs(qTasks);
    for (const tDoc of taskSnaps.docs) {
      await updateDoc(tDoc.ref, {
        status: 'completed',
        completedAt: now,
        completedBy: userId,
        completedByName: userName,
        notes: `Completed automatically via global Add Link: ${liveUrl}`
      });
    }
  } catch (err) {
    console.warn('Could not auto-complete open template task:', err);
  }

  // Activity / Audit Log Entry
  await addDoc(collection(db, 'activities'), {
    userId,
    userName,
    action: 'website_link_added',
    entityType: 'lead',
    entityId: leadId,
    entityName: existingLead.name,
    metadata: {
      url: liveUrl,
      projectDomainName: existingLead.chatgptPackage?.projectDomainName || '',
      businessName: existingLead.name,
      previousUrl: existingLead.templateUrl || '',
      payoutEarned: `${tier.currencySymbol}${tier.linkActionRate}`
    },
    timestamp: now
  });

  const updatedLead: Lead = {
    ...existingLead,
    ...updates
  };

  return { success: true, lead: updatedLead };
}

/**
 * Removes attached website link from a lead (Admin override / correction).
 */
export async function removeLiveWebsiteLinkFromLead(
  leadId: string,
  userId: string,
  userName: string,
  reason: string = 'Admin manual link removal'
): Promise<Lead> {
  const leadRef = doc(db, 'leads', leadId);
  const leadSnap = await getDoc(leadRef);
  if (!leadSnap.exists()) {
    throw new Error('Client record not found.');
  }
  const existing = leadSnap.data() as Lead;
  const now = new Date().toISOString();
  const previousUrl = existing.templateUrl || existing.workingUrl || existing.previewUrl || '';

  const updates: Partial<Lead> = {
    templateUrl: '',
    previewUrl: '',
    workingUrl: '',
    updatedAt: now
  };

  await updateDoc(leadRef, updates);

  await addDoc(collection(db, 'activities'), {
    userId,
    userName,
    action: 'website_link_removed',
    entityType: 'lead',
    entityId: leadId,
    entityName: existing.name,
    metadata: {
      previousUrl,
      reason,
      businessName: existing.name
    },
    timestamp: now
  });

  return { ...existing, ...updates };
}

/**
 * Reassigns live website link from one lead to another (Admin correction).
 */
export async function reassignLiveWebsiteLinkToLead(
  fromLeadId: string,
  toLeadId: string,
  liveUrl: string,
  userId: string,
  userName: string,
  reason: string = 'Admin corrected link association'
): Promise<{ success: boolean; fromLead: Lead; toLead: Lead }> {
  const fromLead = await removeLiveWebsiteLinkFromLead(
    fromLeadId,
    userId,
    userName,
    `Reassigned to another client (${toLeadId}): ${reason}`
  );
  const { lead: toLead } = await attachLiveWebsiteLinkToLead(toLeadId, liveUrl, userId, userName);
  return { success: true, fromLead, toLead };
}

/**
 * Evaluates a lead when it reaches closed / won / completed / paid state.
 * Awards:
 * - Link Creator Success Bonus: R50.00 (or currency proportional)
 * - Message Sender Success Bonus: R25.00 (or currency proportional)
 * Guarantees idempotency (prevents double payment).
 */
export async function evaluateAndAwardDealBonuses(
  leadId: string,
  updatedLeadData?: Partial<Lead>,
  actorUserId?: string,
  actorUserName?: string
): Promise<{ linkBonusAwardedTo?: string; messageBonusAwardedTo?: string }> {
  const leadRef = doc(db, 'leads', leadId);
  const snap = await getDoc(leadRef);
  if (!snap.exists()) return {};

  const lead = { ...snap.data(), ...(updatedLeadData || {}) } as Lead;
  const isWonOrPaid =
    lead.stage === 'won' ||
    lead.stage === 'completed' ||
    lead.isDealClosed === true;

  if (!isWonOrPaid) return {};

  const tier = getPricingTierForCountry(lead.country);
  const now = new Date().toISOString();
  const leadUpdates: Partial<Lead> = {};
  let linkBonusAwardedTo: string | undefined;
  let messageBonusAwardedTo: string | undefined;

  // 1. LINK CREATOR SUCCESS BONUS
  if (!lead.linkBonusAwarded && lead.linkCreatorId) {
    const finId = `fin-bonus-link-${leadId}-${lead.linkCreatorId}`;
    const finRecord: FinancialRecord = {
      id: finId,
      userId: lead.linkCreatorId,
      userName: lead.linkCreatorName || 'Agent',
      leadId: lead.id,
      leadName: lead.name,
      action: 'LINK_SUCCESS_BONUS',
      amount: tier.linkBonus,
      currency: tier.currency,
      currencySymbol: tier.currencySymbol,
      timestamp: now,
      earningType: 'success_bonus',
      status: 'earned',
      notes: `Deal Closed Success Bonus: Link Creator (${tier.currencySymbol}${tier.linkBonus})`
    };
    await setDoc(doc(db, 'financialRecords', finId), cleanFirestoreData(finRecord));
    leadUpdates.linkBonusAwarded = true;
    linkBonusAwardedTo = lead.linkCreatorName || lead.linkCreatorId;

    await addDoc(collection(db, 'activities'), {
      userId: lead.linkCreatorId,
      userName: lead.linkCreatorName || 'Agent',
      action: 'deal_bonus_awarded',
      entityType: 'lead',
      entityId: lead.id,
      entityName: lead.name,
      metadata: {
        type: 'LINK_SUCCESS_BONUS',
        amount: tier.linkBonus,
        currency: tier.currency,
        clientPrice: tier.clientPrice
      },
      timestamp: now
    });
  }

  // 2. MESSAGE SENDER SUCCESS BONUS
  if (!lead.messageBonusAwarded && lead.messageSenderId) {
    const finId = `fin-bonus-msg-${leadId}-${lead.messageSenderId}`;
    const finRecord: FinancialRecord = {
      id: finId,
      userId: lead.messageSenderId,
      userName: lead.messageSenderName || 'Agent',
      leadId: lead.id,
      leadName: lead.name,
      action: 'MESSAGE_SUCCESS_BONUS',
      amount: tier.messageBonus,
      currency: tier.currency,
      currencySymbol: tier.currencySymbol,
      timestamp: now,
      earningType: 'success_bonus',
      status: 'earned',
      notes: `Deal Closed Success Bonus: Message Sender (${tier.currencySymbol}${tier.messageBonus})`
    };
    await setDoc(doc(db, 'financialRecords', finId), cleanFirestoreData(finRecord));
    leadUpdates.messageBonusAwarded = true;
    messageBonusAwardedTo = lead.messageSenderName || lead.messageSenderId;

    await addDoc(collection(db, 'activities'), {
      userId: lead.messageSenderId,
      userName: lead.messageSenderName || 'Agent',
      action: 'deal_bonus_awarded',
      entityType: 'lead',
      entityId: lead.id,
      entityName: lead.name,
      metadata: {
        type: 'MESSAGE_SUCCESS_BONUS',
        amount: tier.messageBonus,
        currency: tier.currency,
        clientPrice: tier.clientPrice
      },
      timestamp: now
    });
  }

  if (Object.keys(leadUpdates).length > 0) {
    leadUpdates.isDealClosed = true;
    if (!lead.closedAt) {
      leadUpdates.closedAt = now;
    }
    await updateDoc(leadRef, cleanFirestoreData(leadUpdates));
  }

  return { linkBonusAwardedTo, messageBonusAwardedTo };
}

// REALTIME FINANCIAL RECORDS SUBSCRIPTION
export function subscribeToFinancialRecords(callback: (records: FinancialRecord[]) => void): () => void {
  const q = query(collection(db, 'financialRecords'), orderBy('timestamp', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const records: FinancialRecord[] = [];
      snapshot.forEach((docSnap) => {
        records.push(docSnap.data() as FinancialRecord);
      });
      callback(records);
    },
    (err) => {
      console.warn('Financial records subscription fallback:', err);
      // Fallback without ordering in case index is pending
      const fallbackQuery = collection(db, 'financialRecords');
      return onSnapshot(fallbackQuery, (snap) => {
        const records: FinancialRecord[] = [];
        snap.forEach((d) => records.push(d.data() as FinancialRecord));
        records.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
        callback(records);
      });
    }
  );
}

// ADMIN REVERSAL / OVERRIDE / CORRECTION FUNCTIONS
export async function adminReverseFinancialRecord(
  recordId: string,
  reason: string,
  adminUser: User
): Promise<void> {
  const now = new Date().toISOString();
  const recRef = doc(db, 'financialRecords', recordId);
  const snap = await getDoc(recRef);
  if (!snap.exists()) throw new Error('Financial record not found.');

  const rec = snap.data() as FinancialRecord;
  await updateDoc(recRef, {
    status: 'reversed',
    isReversed: true,
    overriddenBy: adminUser.displayName || adminUser.id,
    overriddenAt: now,
    notes: `${rec.notes ? rec.notes + ' | ' : ''}REVERSED BY ADMIN: ${reason}`
  });

  // If this was a success bonus on a lead, reset the bonus awarded flag on the lead
  if (rec.action === 'LINK_SUCCESS_BONUS' && rec.leadId) {
    const leadRef = doc(db, 'leads', rec.leadId);
    await updateDoc(leadRef, { linkBonusAwarded: false, updatedAt: now });
  } else if (rec.action === 'MESSAGE_SUCCESS_BONUS' && rec.leadId) {
    const leadRef = doc(db, 'leads', rec.leadId);
    await updateDoc(leadRef, { messageBonusAwarded: false, updatedAt: now });
  }

  // Audit activity
  await addDoc(collection(db, 'activities'), {
    userId: adminUser.id,
    userName: adminUser.displayName,
    action: 'financial_record_reversed',
    entityType: 'financialRecord',
    entityId: recordId,
    entityName: `${rec.action} (${rec.currencySymbol}${rec.amount})`,
    metadata: { reason, previousRecipient: rec.userName },
    timestamp: now
  });
}

export async function adminUpdateFinancialRecord(
  recordId: string,
  updates: {
    amount?: number;
    userId?: string;
    userName?: string;
    notes?: string;
  },
  adminUser: User
): Promise<void> {
  const now = new Date().toISOString();
  const recRef = doc(db, 'financialRecords', recordId);
  const snap = await getDoc(recRef);
  if (!snap.exists()) throw new Error('Financial record not found.');

  const existing = snap.data() as FinancialRecord;
  const originalAmount = existing.originalAmount ?? existing.amount;

  await updateDoc(recRef, {
    ...updates,
    originalAmount,
    overriddenBy: adminUser.displayName || adminUser.id,
    overriddenAt: now
  });

  await addDoc(collection(db, 'activities'), {
    userId: adminUser.id,
    userName: adminUser.displayName,
    action: 'financial_record_updated',
    entityType: 'financialRecord',
    entityId: recordId,
    entityName: `${existing.action} updated by admin`,
    metadata: { updates, previousAmount: existing.amount, previousUser: existing.userName },
    timestamp: now
  });
}

export async function adminCreateManualFinancialRecord(
  data: {
    userId: string;
    userName: string;
    leadId: string;
    leadName: string;
    action: FinancialActionType;
    amount: number;
    currency: string;
    currencySymbol: string;
    earningType: 'action' | 'success_bonus';
    notes: string;
  },
  adminUser: User
): Promise<FinancialRecord> {
  const now = new Date().toISOString();
  const id = `fin-manual-${Date.now()}`;
  const record: FinancialRecord = {
    id,
    ...data,
    timestamp: now,
    status: 'earned',
    overriddenBy: adminUser.displayName || adminUser.id,
    overriddenAt: now
  };
  await setDoc(doc(db, 'financialRecords', id), cleanFirestoreData(record));

  await addDoc(collection(db, 'activities'), {
    userId: adminUser.id,
    userName: adminUser.displayName,
    action: 'financial_record_manual_created',
    entityType: 'financialRecord',
    entityId: id,
    entityName: `Manual credit: ${data.currencySymbol}${data.amount} to ${data.userName}`,
    metadata: { data },
    timestamp: now
  });

  return record;
}


