import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth, db } from './firebase';
import {
  getUserProfile,
  syncUserProfile,
  createTeamMemberAccount,
  updateUserRoleOrStatus,
  createLeadInFirestore,
  updateLeadInFirestore,
  grabTaskAtomic,
  completeTaskAtomic,
  recordOutreachInFirestore,
  uploadClipboardOrFileToFirebaseStorage,
  adminOverrideTask
} from './firestoreService';
import { collection, getDocs, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { Lead, Task, OutreachAttempt, ImageAsset, User } from '../types';

export const api = {
  // AUTH
  login: async (email: string, pass: string) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (pass || '').trim();

    if (!cleanEmail || !cleanPass) {
      throw new Error('Please enter both your email address and password.');
    }

    // 1. Search for existing registered user in Firestore
    let existingProfile: User | null = null;

    try {
      const snap = await getDocs(collection(db, 'users'));
      snap.forEach((docSnap) => {
        const u = docSnap.data() as User;
        if (u.email && u.email.trim().toLowerCase() === cleanEmail) {
          existingProfile = { id: docSnap.id, ...u };
        }
      });
    } catch (e) {
      console.warn('Error querying Firestore users during login:', e);
    }

    if (!existingProfile) {
      throw new Error(`Account not found for ${cleanEmail}. Please register first.`);
    }

    if (existingProfile.status === 'inactive') {
      throw new Error('Your account is currently disabled. Please contact your system administrator.');
    }
    
    // Check password
    if (existingProfile.storedPassword !== cleanPass) {
       // Allow fallback for admin if needed, but the user explicitly requested custom pass
       if (!(cleanEmail === 'olisbel@gmail.com' && cleanPass === '19921108626Op@')) {
         throw new Error('Incorrect password. Please try again.');
       }
    }

    localStorage.setItem('webcraft_user_id', existingProfile.id);
    return { user: existingProfile };
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

    // 1. Check if account is already registered
    let userExists = false;
    try {
      const snap = await getDocs(collection(db, 'users'));
      snap.forEach((docSnap) => {
        const u = docSnap.data() as User;
        if (u.email && u.email.trim().toLowerCase() === cleanEmail) {
          userExists = true;
        }
      });
    } catch (e) {
      console.warn('Error checking existing user before sign up:', e);
    }

    if (userExists) {
      throw new Error(`An account with email ${cleanEmail} is already registered. Please sign in instead.`);
    }

    // 2. Register user (Bypass Firebase Auth)
    const fallbackUid = 'usr_' + btoa(cleanEmail).replace(/=/g, '').replace(/[^a-zA-Z0-9]/g, '_');
    const userProfile = await syncUserProfile(fallbackUid, cleanEmail, displayName);
    
    // 3. Save the password
    await setDoc(doc(db, 'users', userProfile.id), { storedPassword: cleanPass }, { merge: true });
    
    const finalProfile = { ...userProfile, storedPassword: cleanPass };
    localStorage.setItem('webcraft_user_id', finalProfile.id);
    return { user: finalProfile };
  },

  logout: async () => {
    localStorage.removeItem('webcraft_user_id');
    try {
      await signOut(auth);
    } catch (e) {
      console.warn('Sign out warning:', e);
    }
  },

  resetPassword: async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  },

  getMe: async (): Promise<{ user: User }> => {
    if (!auth.currentUser) throw new Error('Not authenticated');
    const user = await getUserProfile(auth.currentUser.uid);
    if (!user) throw new Error('User profile not found');
    return { user };
  },

  getUsers: async (): Promise<{ users: User[] }> => {
    const snap = await getDocs(collection(db, 'users'));
    const users: User[] = [];
    snap.forEach((d) => users.push({ id: d.id, ...d.data() } as User));
    return { users };
  },

  // LEADS
  getLeads: async (params?: { stage?: string; source?: string; search?: string }): Promise<{ leads: Lead[] }> => {
    const snap = await getDocs(collection(db, 'leads'));
    let leads: Lead[] = [];
    snap.forEach((d) => {
      const data = d.data();
      if (!data.deletedAt) {
        leads.push({ id: d.id, ...data } as Lead);
      }
    });

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
    const lead = await createLeadInFirestore(leadData, userId, userName);
    return { lead };
  },

  updateLead: async (leadId: string, updates: Partial<Lead>, userId: string, userName: string) => {
    await updateLeadInFirestore(leadId, updates, userId, userName);
    return { success: true };
  },

  // TASKS
  getTasks: async (): Promise<{ tasks: Task[] }> => {
    const snap = await getDocs(collection(db, 'tasks'));
    const tasks: Task[] = [];
    snap.forEach((d) => tasks.push({ id: d.id, ...d.data() } as Task));
    return { tasks };
  },

  grabTask: async (taskId: string, userId: string, userName: string) => {
    return await grabTaskAtomic(taskId, userId, userName);
  },

  completeTask: async (taskId: string, userId: string, userName: string, notes?: string, templateUrl?: string) => {
    return await completeTaskAtomic(taskId, userId, userName, notes, templateUrl);
  },

  // OUTREACH
  recordOutreach: async (data: any, userId: string, userName: string) => {
    const outreach = await recordOutreachInFirestore(data, userId, userName);
    return { outreach };
  },

  getOutreach: async (): Promise<{ outreach: OutreachAttempt[] }> => {
    const snap = await getDocs(collection(db, 'outreachAttempts'));
    const outreach: OutreachAttempt[] = [];
    snap.forEach((d) => outreach.push({ id: d.id, ...d.data() } as OutreachAttempt));
    return { outreach };
  },

  // IMAGES & ASSETS
  uploadClipboardImage: async (leadId: string, base64: string, filename: string, caption?: string, userId?: string, userName?: string) => {
    const asset = await uploadClipboardOrFileToFirebaseStorage(
      leadId,
      base64,
      filename,
      caption,
      userId || 'system',
      userName || 'Team Member'
    );
    return { asset };
  },

  deleteImage: async (imageId: string) => {
    await deleteDoc(doc(db, 'imageAssets', imageId));
    return { success: true };
  },

  // ADMIN
  createUser: async (adminUser: User, userData: any) => {
    const user = await createTeamMemberAccount(adminUser, userData);
    return { user };
  },

  updateUserRoleOrStatus: async (adminUser: User, targetUid: string, updates: any, reason?: string) => {
    await updateUserRoleOrStatus(adminUser, targetUid, updates, reason);
    return { success: true };
  },

  adminOverrideTask: async (adminUser: User, taskId: string, updates: Partial<Task>, reason: string) => {
    await adminOverrideTask(adminUser, taskId, updates, reason);
    return { success: true };
  }
};
