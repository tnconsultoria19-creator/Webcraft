import React, { useState, useEffect, useMemo } from 'react';
import { LayoutGrid, List, Download, AlertTriangle, X } from 'lucide-react';
import { User, Lead, Task, OutreachAttempt, ActivityLog } from './types';
import { api } from './lib/api';
import {
  subscribeToLeads,
  subscribeToTasks,
  subscribeToOutreach,
  subscribeToActivities,
  subscribeToUsers,
  updateLeadInFirestore,
  getUserProfile,
  syncUserProfile,
  deleteLeadCascade,
  deleteLeadsCascade
} from './lib/firestoreService';
import { downloadLeadsCSV } from './lib/exportUtils';

import { LandingPage } from './components/layout/LandingPage';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { CreateClientWorkspace } from './components/processor/CreateClientWorkspace';
import { QuickAddLeadModal } from './components/leads/QuickAddLeadModal';
import { AddLiveLinkModal } from './components/leads/AddLiveLinkModal';
import { LeadDetailWorkspace } from './components/leads/LeadDetailWorkspace';
import { LeadKanbanView } from './components/leads/LeadKanbanView';
import { LeadTableView } from './components/leads/LeadTableView';
import { PipelineFilterBar, PipelineFilterState } from './components/leads/PipelineFilterBar';
import { MyWorkPage } from './components/tasks/MyWorkPage';
import { MainDashboard } from './components/dashboard/MainDashboard';
import { PersonalEarningsModal } from './components/dashboard/PersonalEarningsModal';
import { TeamPerformanceModal } from './components/dashboard/TeamPerformanceModal';
import { AdminSettingsModal } from './components/admin/AdminSettingsModal';
import { matchLeadComprehensive, findLeadDuplicates } from './lib/searchUtils';
import { isWithinDateRange } from './lib/dateFilters';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Main App View State
  const [currentView, setCurrentView] = useState<'create_client' | 'dashboard' | 'pipeline' | 'my_work' | 'admin'>('create_client');
  const [pipelineLayout, setPipelineLayout] = useState<'kanban' | 'table'>('table');

  // Leads state & filters
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLeadsLoading, setIsLeadsLoading] = useState(true);
  const [teamUsers, setTeamUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [outreach, setOutreach] = useState<OutreachAttempt[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Unified Pipeline Filter State
  const [pipelineFilters, setPipelineFilters] = useState<PipelineFilterState>({
    search: '',
    myWorkOnly: false,
    ownerId: 'all',
    createdById: 'all',
    actionedById: 'all',
    stage: 'all',
    source: 'all',
    category: 'all',
    priority: 'all',
    country: 'all',
    city: '',
    datePreset: 'all',
    customFrom: '',
    customTo: '',
    duplicatesOnly: false,
    sortBy: 'newest'
  });

  const handlePipelineFilterChange = <K extends keyof PipelineFilterState>(
    key: K,
    value: PipelineFilterState[K]
  ) => {
    setPipelineFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetPipelineFilters = () => {
    setPipelineFilters({
      search: '',
      myWorkOnly: false,
      ownerId: 'all',
      createdById: 'all',
      actionedById: 'all',
      stage: 'all',
      source: 'all',
      category: 'all',
      priority: 'all',
      country: 'all',
      city: '',
      datePreset: 'all',
      customFrom: '',
      customTo: '',
      duplicatesOnly: false,
      sortBy: 'newest'
    });
  };

  // Duplicates count across all leads
  const duplicatesCount = useMemo(() => {
    return leads.filter((l) => findLeadDuplicates(l, leads).hasDuplicates).length;
  }, [leads]);

  // Derived unique lists for dynamic dropdowns
  const availableSources = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.source) set.add(l.source);
    });
    ['Gumtree', 'Facebook', 'Instagram', 'Google Business', 'Direct Call'].forEach((s) => set.add(s));
    return Array.from(set).filter(Boolean).sort();
  }, [leads]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.category) set.add(l.category);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [leads]);

  const availableCities = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => {
      if (l.city) set.add(l.city);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [leads]);

  // Filter and sort leads based on PipelineFilterState (declared before any early returns to respect Rules of Hooks)
  const filteredLeads = useMemo(() => {
    const result = leads.filter((l) => {
      // 1. [ MY WORK ] quick filter
      if (pipelineFilters.myWorkOnly && currentUser) {
        const isOwner = l.ownerId === currentUser.id;
        const isCreator = l.createdBy === currentUser.id;
        const hasMyTask = tasks.some(
          (t) => t.leadId === l.id && (t.assignedTo === currentUser.id || t.createdBy === currentUser.id)
        );
        if (!isOwner && !isCreator && !hasMyTask) return false;
      }

      // 2. OWNER filter
      if (pipelineFilters.ownerId === 'unassigned') {
        if (l.ownerId && l.ownerId !== '' && l.ownerName !== 'Unassigned') return false;
      } else if (pipelineFilters.ownerId !== 'all') {
        if (l.ownerId !== pipelineFilters.ownerId) return false;
      }

      // 3. CREATED BY filter
      if (pipelineFilters.createdById !== 'all') {
        if (l.createdBy !== pipelineFilters.createdById) return false;
      }

      // 4. ACTIONED BY filter
      if (pipelineFilters.actionedById !== 'all') {
        const targetUser = pipelineFilters.actionedById;
        const actionedInTasks = tasks.some(
          (t) => t.leadId === l.id && (t.assignedTo === targetUser || t.createdBy === targetUser)
        );
        const actionedInOutreach = outreach.some((o) => o.leadId === l.id && o.sentBy === targetUser);
        const actionedInActivities = activities.some(
          (a) =>
            a.userId === targetUser &&
            (a.entityId === l.id || (a.metadata && (a.metadata as any).leadId === l.id))
        );
        const isOwnerOrCreator = l.ownerId === targetUser || l.createdBy === targetUser;
        if (!actionedInTasks && !actionedInOutreach && !actionedInActivities && !isOwnerOrCreator) {
          return false;
        }
      }

      // 5. STAGE filter
      if (pipelineFilters.stage !== 'all') {
        const targetStage = pipelineFilters.stage;
        if (targetStage === 'captured') {
          if (l.stage !== 'captured' && l.stage !== 'new_lead') return false;
        } else if (targetStage === 'ready_for_outreach') {
          if (l.stage !== 'ready_for_outreach' && l.stage !== 'template_completed') return false;
        } else if (targetStage === 'contacted') {
          if (l.stage !== 'outreach_sent' && l.stage !== 'outreach_in_progress' && l.stage !== 'contacted') return false;
        } else if (targetStage === 'in_discussion') {
          if (
            l.stage !== 'awaiting_response' &&
            l.stage !== 'response_received' &&
            l.stage !== 'interested' &&
            l.stage !== 'in_discussion'
          )
            return false;
        } else if (targetStage === 'won_deal') {
          if (l.stage !== 'won' && l.stage !== 'website_production' && l.stage !== 'completed') return false;
        } else if (targetStage === 'lost_unresponsive') {
          if (l.stage !== 'lost' && l.stage !== 'unresponsive' && l.stage !== 'lost_unresponsive') return false;
        } else {
          if (l.stage !== targetStage) return false;
        }
      }

      // 6. SOURCE filter
      if (pipelineFilters.source !== 'all' && l.source !== pipelineFilters.source) {
        return false;
      }

      // 7. CATEGORY filter
      if (
        pipelineFilters.category !== 'all' &&
        (l.category || '').toLowerCase() !== pipelineFilters.category.toLowerCase()
      ) {
        return false;
      }

      // 8. PRIORITY filter
      if (
        pipelineFilters.priority !== 'all' &&
        (l.priority || 'normal').toLowerCase() !== pipelineFilters.priority.toLowerCase()
      ) {
        return false;
      }

      // 9. COUNTRY filter
      if (pipelineFilters.country !== 'all') {
        const c1 = (l.country || '').toLowerCase();
        const c2 = (l.city || '').toLowerCase();
        const targetC = pipelineFilters.country.toLowerCase();
        if (!c1.includes(targetC) && !c2.includes(targetC)) return false;
      }

      // 10. CITY filter
      if (pipelineFilters.city.trim()) {
        const cityQuery = pipelineFilters.city.trim().toLowerCase();
        if (!(l.city || '').toLowerCase().includes(cityQuery)) return false;
      }

      // 11. DATE RANGE filter
      if (pipelineFilters.datePreset !== 'all') {
        if (!isWithinDateRange(l.createdAt, pipelineFilters.datePreset, pipelineFilters.customFrom, pipelineFilters.customTo)) {
          return false;
        }
      }

      // 12. DUPLICATES ONLY filter
      if (pipelineFilters.duplicatesOnly) {
        const dup = findLeadDuplicates(l, leads);
        if (!dup.hasDuplicates) return false;
      }

      // 13. SEARCH filter
      if (pipelineFilters.search && !matchLeadComprehensive(l, pipelineFilters.search, leads)) {
        return false;
      }

      return true;
    });

    // 14. SORTING
    const priorityWeight: Record<string, number> = {
      urgent: 4,
      high: 3,
      normal: 2,
      low: 1
    };

    result.sort((a, b) => {
      switch (pipelineFilters.sortBy) {
        case 'newest':
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case 'oldest':
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case 'recently_updated':
          return new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime();
        case 'recently_actioned': {
          const timeA = new Date(a.lastActivityAt || a.lastOutreachAt || a.updatedAt || a.createdAt || 0).getTime();
          const timeB = new Date(b.lastActivityAt || b.lastOutreachAt || b.updatedAt || b.createdAt || 0).getTime();
          return timeB - timeA;
        }
        case 'priority':
          return (priorityWeight[b.priority || 'normal'] || 2) - (priorityWeight[a.priority || 'normal'] || 2);
        case 'name':
          return (a.name || '').localeCompare(b.name || '');
        default:
          return 0;
      }
    });

    return result;
  }, [leads, pipelineFilters, tasks, outreach, activities, currentUser]);

  const handleDeleteLead = async (leadId: string, _leadName?: string) => {
    if (!currentUser) return;

    // Optimistic removal: the CRM should feel immediate while the server mutation
    // completes in the background. Keep snapshots so a failed delete can roll back.
    const previousLead = leads.find((lead) => lead.id === leadId);
    const previousTasks = tasks.filter((task) => task.leadId === leadId);
    const previousOutreach = outreach.filter((attempt) => attempt.leadId === leadId);

    setLeads((previous) => previous.filter((lead) => lead.id !== leadId));
    setTasks((previous) => previous.filter((task) => task.leadId !== leadId));
    setOutreach((previous) => previous.filter((attempt) => attempt.leadId !== leadId));

    if (selectedLeadId === leadId) {
      setSelectedLeadId(null);
    }

    try {
      await deleteLeadCascade(leadId, currentUser.id, currentUser.displayName);
    } catch (err: any) {
      // Roll back only if the server rejected the mutation.
      if (previousLead) {
        setLeads((previous) => {
          if (previous.some((lead) => lead.id === leadId)) return previous;
          return [previousLead, ...previous];
        });
      }
      if (previousTasks.length) {
        setTasks((previous) => [
          ...previous.filter((task) => task.leadId !== leadId),
          ...previousTasks
        ]);
      }
      if (previousOutreach.length) {
        setOutreach((previous) => [
          ...previous.filter((attempt) => attempt.leadId !== leadId),
          ...previousOutreach
        ]);
      }
      alert(err.message || 'Failed to delete lead.');
    }
  };

  const handleBulkDeleteLeads = async (leadIds: string[]) => {
    if (!currentUser || !leadIds.length) return;

    const uniqueIds = Array.from(new Set(leadIds));
    const selectedSet = new Set(uniqueIds);
    const previousLeads = leads.filter((lead) => selectedSet.has(lead.id));
    const previousTasks = tasks.filter((task) => selectedSet.has(task.leadId));
    const previousOutreach = outreach.filter((attempt) => selectedSet.has(attempt.leadId));

    // Remove the selected prospects immediately. The server mutation runs as one batch.
    setLeads((previous) => previous.filter((lead) => !selectedSet.has(lead.id)));
    setTasks((previous) => previous.filter((task) => !selectedSet.has(task.leadId)));
    setOutreach((previous) => previous.filter((attempt) => !selectedSet.has(attempt.leadId)));
    if (selectedLeadId && selectedSet.has(selectedLeadId)) setSelectedLeadId(null);

    try {
      await deleteLeadsCascade(uniqueIds, currentUser.id, currentUser.displayName);
    } catch (err: any) {
      // Roll back the whole selection if the bulk operation fails.
      setLeads((previous) => {
        const existing = new Set(previous.map((lead) => lead.id));
        return [...previous, ...previousLeads.filter((lead) => !existing.has(lead.id))];
      });
      setTasks((previous) => {
        const existing = new Set(previous.map((task) => task.id));
        return [...previous, ...previousTasks.filter((task) => !existing.has(task.id))];
      });
      setOutreach((previous) => {
        const existing = new Set(previous.map((attempt) => attempt.id));
        return [...previous, ...previousOutreach.filter((attempt) => !existing.has(attempt.id))];
      });
      throw err;
    }
  };

  const handleUpdateLeadStage = async (leadId: string, newStage: Lead['stage']) => {
    if (!currentUser) return;

    const previousLead = leads.find((lead) => lead.id === leadId);
    if (!previousLead || previousLead.stage === newStage) return;

    const optimisticLead = {
      ...previousLead,
      stage: newStage,
      updatedAt: new Date().toISOString()
    };

    // Move the card immediately. The API response is reconciled afterwards.
    setLeads((previous) => previous.map((lead) => (
      lead.id === leadId ? optimisticLead : lead
    )));

    try {
      const updatedLead = await updateLeadInFirestore(
        leadId,
        { stage: newStage },
        currentUser.id,
        currentUser.displayName
      );

      setLeads((previous) => previous.map((lead) => (
        lead.id === leadId ? { ...lead, ...updatedLead } : lead
      )));
    } catch (err: any) {
      setLeads((previous) => previous.map((lead) => (
        lead.id === leadId ? previousLead : lead
      )));
      alert(err.message || 'Failed to update lead stage.');
    }
  };

  // Modals state
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isAddLinkOpen, setIsAddLinkOpen] = useState(false);
  const [isPersonalEarningsOpen, setIsPersonalEarningsOpen] = useState(false);
  const [isTeamPerformanceOpen, setIsTeamPerformanceOpen] = useState(false);
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState(false);

  // Session state is fully managed by Cloudflare D1/localStorage.
  useEffect(() => {
    const restoreSession = async () => {
      try {
        if (localStorage.getItem('webcraft_user_id')) {
          const res = await api.getMe();
          setCurrentUser(res.user);
        }
      } catch (error) {
        console.warn('Could not restore WebCraft session:', error);
        localStorage.removeItem('webcraft_user_id');
        setCurrentUser(null);
      } finally {
        setIsInitializing(false);
      }
    };
    restoreSession();
  }, []);

  // View-aware polling: only keep the datasets needed by the active workspace live.
  // This avoids five permanent API polls while the user is sitting on Create Client.
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribers: Array<() => void> = [];

    // Hydrate the pipeline from the last successful browser snapshot immediately.
    // This prevents a blank pipeline after refresh while the live API request is in flight.
    const leadsCacheKey = `webcraft_leads_cache_${currentUser.id}`;
    const usersCacheKey = `webcraft_users_cache_${currentUser.id}`;

    try {
      const cachedLeads = localStorage.getItem(leadsCacheKey);
      if (cachedLeads) {
        const parsedLeads = JSON.parse(cachedLeads);
        if (Array.isArray(parsedLeads)) {
          setLeads(parsedLeads);
          setIsLeadsLoading(false);
        }
      }
    } catch (cacheError) {
      console.warn('Could not restore cached leads:', cacheError);
    }

    unsubscribers.push(
      subscribeToLeads((updatedLeads) => {
        if (Array.isArray(updatedLeads)) {
          setLeads(updatedLeads);
          setIsLeadsLoading(false);
          try {
            localStorage.setItem(leadsCacheKey, JSON.stringify(updatedLeads));
          } catch (cacheError) {
            console.warn('Could not cache leads:', cacheError);
          }
        }
      })
    );

    try {
      const cachedUsers = localStorage.getItem(usersCacheKey);
      if (cachedUsers) {
        const parsedUsers = JSON.parse(cachedUsers);
        if (Array.isArray(parsedUsers)) setTeamUsers(parsedUsers);
      }
    } catch (cacheError) {
      console.warn('Could not restore cached users:', cacheError);
    }

    unsubscribers.push(
      subscribeToUsers((uList) => {
        if (Array.isArray(uList)) {
          setTeamUsers(uList);
          try {
            localStorage.setItem(usersCacheKey, JSON.stringify(uList));
          } catch (cacheError) {
            console.warn('Could not cache users:', cacheError);
          }
        }
      })
    );

    const needsWorkData = currentView === 'dashboard' || currentView === 'pipeline' || currentView === 'my_work';
    const needsOutreachData = currentView === 'dashboard' || currentView === 'pipeline';
    const needsActivityData = currentView === 'dashboard' || currentView === 'pipeline';

    if (needsWorkData) {
      unsubscribers.push(
        subscribeToTasks((tList) => {
          if (tList) setTasks(tList);
        })
      );
    } else {
      setTasks([]);
    }

    if (needsOutreachData) {
      unsubscribers.push(
        subscribeToOutreach((oList) => {
          if (oList) setOutreach(oList);
        })
      );
    } else {
      setOutreach([]);
    }

    if (needsActivityData) {
      unsubscribers.push(
        subscribeToActivities((aList) => {
          if (aList) setActivities(aList);
        })
      );
    } else {
      setActivities([]);
    }

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [currentUser, currentView]);

  const handleAuthSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      if (authMode === 'signup') {
        const res = await api.signUp(loginEmail, loginPassword, signupName || undefined);
        setCurrentUser(res.user);
        setShowAuthModal(false);
      } else {
        const res = await api.login(loginEmail, loginPassword);
        setCurrentUser(res.user);
        setShowAuthModal(false);
      }
    } catch (err: any) {
      setLoginError(err.message || (authMode === 'signup' ? 'Sign up failed' : 'Sign in failed'));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.error(e);
    }
    setCurrentUser(null);
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-[#292A29] flex items-center justify-center text-white font-bold text-sm font-['Poppins']">
        Initializing WebCraft Studio...
      </div>
    );
  }

  // PUBLIC LANDING PAGE & AUTH MODAL
  if (!currentUser) {
    return (
      <div className="relative min-h-screen bg-[#F0EDE5] font-['Poppins'] text-[#292A29]">
        <LandingPage
          onSignInClick={() => {
            setAuthMode('signin');
            setShowAuthModal(true);
          }}
          onSignUpClick={() => {
            setAuthMode('signup');
            setShowAuthModal(true);
          }}
        />

        {/* AUTH POPUP MODAL */}
        {showAuthModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs font-['Poppins']">
            <div className="max-w-md w-full bg-white border border-[#DDD8CE] rounded-3xl p-8 shadow-2xl space-y-6 relative text-[#292A29]">
              
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 text-[#969188] hover:text-[#292A29] text-lg font-bold"
              >
                ✕
              </button>

              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-[#245F6B] mx-auto flex items-center justify-center font-bold text-2xl text-white shadow-md">
                  W
                </div>
                <h2 className="font-bold text-xl text-[#292A29]">WebCraft Studio</h2>
                <p className="text-xs text-[#68645D]">Employee Portal Sign In & Registration</p>
              </div>

              {/* Mode Tabs */}
              <div className="flex bg-[#F0EDE5] p-1 rounded-full border border-[#DDD8CE]">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setLoginError('');
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                    authMode === 'signin' ? 'bg-[#245F6B] text-white shadow-xs' : 'text-[#68645D] hover:text-[#292A29]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setLoginError('');
                  }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                    authMode === 'signup' ? 'bg-[#245F6B] text-white shadow-xs' : 'text-[#68645D] hover:text-[#292A29]'
                  }`}
                >
                  Register Account
                </button>
              </div>

              {loginError && (
                <div className="p-3 bg-[#A65B55]/10 border border-[#A65B55]/30 text-[#A65B55] text-xs rounded-xl text-center font-bold">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-[#292A29] font-semibold mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      placeholder="e.g. Maria Gonzalez"
                      className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#245F6B]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[#292A29] font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="email@company.com"
                    className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#245F6B]"
                  />
                </div>

                <div>
                  <label className="block text-[#292A29] font-semibold mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#245F6B]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full py-3 bg-[#245F6B] hover:bg-[#1E505A] text-white rounded-full text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isLoggingIn
                    ? (authMode === 'signup' ? 'Creating Account...' : 'Signing in...')
                    : (authMode === 'signup' ? 'Register Account' : 'Sign In')}
                </button>
              </form>

              <div className="relative pt-1">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#DDD8CE]" />
                </div>
                <div className="relative flex justify-center text-[10px]">
                  <span className="bg-white px-2 text-[#969188] font-medium uppercase tracking-wider">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => {
                  setIsLoggingIn(true);
                  setLoginError('');
                  try {
                    const res = await api.login('admin@webcraft.com', 'admin123');
                    setCurrentUser(res.user);
                    setShowAuthModal(false);
                  } catch (err: any) {
                    setLoginError('Demo access error: ' + err.message);
                  } finally {
                    setIsLoggingIn(false);
                  }
                }}
                disabled={isLoggingIn}
                className="w-full py-2.5 bg-[#F0EDE5] hover:bg-[#E5EEEE] text-[#245F6B] border border-[#245F6B]/30 rounded-full text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Instant Demo Access (1-Click)
              </button>

            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-[#68645D] flex font-['Poppins']">
      
      {/* Left Sidebar Navigation Rail */}
      <Sidebar
        currentUser={currentUser}
        currentView={currentView}
        onViewChange={(view) => setCurrentView(view)}
        onLogout={handleLogout}
        onOpenPersonalEarnings={() => setIsPersonalEarningsOpen(true)}
        onOpenTeamPerformance={() => setIsTeamPerformanceOpen(true)}
        onOpenAdminSettings={() => setIsAdminSettingsOpen(true)}
        onOpenQuickAdd={() => setCurrentView('create_client')}
        onOpenAddLink={() => setIsAddLinkOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-transparent">
        
        {/* Top Header */}
        <Header
          currentUser={currentUser}
          onOpenQuickAdd={() => setCurrentView('create_client')}
          onOpenAddLink={() => setIsAddLinkOpen(true)}
          onSearch={(q) => {
            handlePipelineFilterChange('search', q);
            if (q.trim() && currentView !== 'pipeline') {
              setCurrentView('pipeline');
            }
          }}
          onSelectLead={(id) => setSelectedLeadId(id)}
          onOpenPersonalEarnings={() => setIsPersonalEarningsOpen(true)}
          onGoHome={() => setCurrentView('create_client')}
          onLogout={handleLogout}
          title={
            currentView === 'create_client'
              ? 'Create Client'
              : currentView === 'dashboard'
              ? 'Dashboard'
              : currentView === 'pipeline'
              ? 'Prospect Pipeline'
              : 'My Tasks & Actions'
          }
        />

        {/* View Canvas Body */}
        <main className="flex-1 p-4 lg:p-5 space-y-4 max-w-[1480px] w-full mx-auto">
          
          {/* Sub-controls & Unified Filter Bar when viewing Pipeline */}
          {currentView === 'pipeline' && (
            <div className="space-y-3">
              {/* Header Actions Bar: Layout Switcher & Export */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#DDD8CE] px-4 py-2.5 rounded-2xl shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#292A29]">Prospect Pipeline</span>
                  <span className="text-xs text-[#969188]">
                    {isLeadsLoading ? '(Loading prospects...)' : `(${filteredLeads.length} of ${leads.length} prospects)`}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  {/* Export CSV Button */}
                  <button
                    onClick={() => downloadLeadsCSV(filteredLeads)}
                    className="px-3.5 py-1.5 bg-[#245F6B] hover:bg-[#1E505A] text-white rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    title="Export filtered leads to CSV spreadsheet"
                  >
                    <Download className="w-3.5 h-3.5 text-white" />
                    <span>Export CSV ({filteredLeads.length})</span>
                  </button>

                  {/* Layout Switcher */}
                  <div className="flex items-center bg-[#FAF7F2] p-0.5 rounded-full border border-[#DDD8CE]">
                    <button
                      onClick={() => setPipelineLayout('kanban')}
                      className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                        pipelineLayout === 'kanban' ? 'bg-[#245F6B] text-white shadow-xs' : 'text-[#68645D] hover:text-[#292A29]'
                      }`}
                      title="Kanban Board View"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setPipelineLayout('table')}
                      className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                        pipelineLayout === 'table' ? 'bg-[#245F6B] text-white shadow-xs' : 'text-[#68645D] hover:text-[#292A29]'
                      }`}
                      title="Table List View"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Comprehensive Pipeline Filter Bar */}
              <PipelineFilterBar
                filters={pipelineFilters}
                onFilterChange={handlePipelineFilterChange}
                onResetFilters={handleResetPipelineFilters}
                teamUsers={teamUsers}
                availableSources={availableSources}
                availableCategories={availableCategories}
                availableCities={availableCities}
                totalCount={leads.length}
                filteredCount={filteredLeads.length}
                currentUser={currentUser}
              />
            </div>
          )}

          {/* PRIMARY WORKFLOW: CREATE CLIENT (CHATGPT BUSINESS PACKAGE PROCESSOR) */}
          {currentView === 'create_client' && (
            <CreateClientWorkspace
              currentUser={currentUser}
              existingLeads={leads}
              onClientSaved={(newLead) => {
                // Update the local pipeline immediately; background synchronization will reconcile it.
                setLeads((previous) => [
                  newLead,
                  ...previous.filter((lead) => lead.id !== newLead.id)
                ]);
              }}
              onOpenPipeline={() => setCurrentView('pipeline')}
              onSelectLead={(id) => setSelectedLeadId(id)}
            />
          )}

          {/* VIEW 1: DASHBOARD (Analytics) */}
          {currentView === 'dashboard' && (
            <MainDashboard
              currentUser={currentUser}
              leads={leads}
              tasks={tasks}
              outreach={outreach}
              activities={activities}
              onSelectLead={(id) => setSelectedLeadId(id)}
              onOpenQuickAdd={() => setIsQuickAddOpen(true)}
              onDeleteLead={handleDeleteLead}
              onOpenTeamPerformance={() => setIsTeamPerformanceOpen(true)}
              onOpenPersonalEarnings={() => setIsPersonalEarningsOpen(true)}
              onOpenAdminSettings={() => setIsAdminSettingsOpen(true)}
            />
          )}

          {/* VIEW 2: PRODUCTION PIPELINE */}
          {currentView === 'pipeline' && (
            pipelineLayout === 'kanban' ? (
              <LeadKanbanView
                leads={filteredLeads}
                isLoading={isLeadsLoading}
                onSelectLead={(id) => setSelectedLeadId(id)}
                onUpdateStage={handleUpdateLeadStage}
                onDeleteLead={handleDeleteLead}
              />
            ) : (
              <LeadTableView
                leads={filteredLeads}
                currentUser={currentUser}
                isLoading={isLeadsLoading}
                onSelectLead={(id) => setSelectedLeadId(id)}
                onDeleteLead={handleDeleteLead}
                onBulkDelete={handleBulkDeleteLeads}
              />
            )
          )}

          {/* VIEW 3: MY WORK OPERATIONAL HOME */}
          {currentView === 'my_work' && (
            <MyWorkPage
              currentUser={currentUser}
              tasks={tasks}
              onSelectLead={(id) => setSelectedLeadId(id)}
              onWorkUpdated={() => {}}
            />
          )}

        </main>

      </div>

      {/* QUICK ADD LEAD MODAL */}
      <QuickAddLeadModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        currentUser={currentUser}
        existingLeads={leads}
        onLeadCreated={(newLead) => {
          setSelectedLeadId(newLead.id);
        }}
      />

      {/* GLOBAL ADD LIVE LINK MODAL */}
      <AddLiveLinkModal
        isOpen={isAddLinkOpen}
        onClose={() => setIsAddLinkOpen(false)}
        currentUser={currentUser}
        leads={leads}
        onSelectLead={(id) => {
          setSelectedLeadId(id);
          setIsAddLinkOpen(false);
        }}
      />

      {/* LEAD DETAIL WORKSPACE */}
      {selectedLeadId && (
        <LeadDetailWorkspace
          leadId={selectedLeadId}
          currentUser={currentUser}
          initialLead={leads.find((l) => l.id === selectedLeadId)}
          onClose={() => setSelectedLeadId(null)}
          onLeadUpdated={() => {}}
        />
      )}

      {/* PERSONAL EARNINGS MODAL */}
      <PersonalEarningsModal
        isOpen={isPersonalEarningsOpen}
        onClose={() => setIsPersonalEarningsOpen(false)}
        currentUser={currentUser}
      />

      {/* TEAM PERFORMANCE REPORT MODAL */}
      <TeamPerformanceModal
        isOpen={isTeamPerformanceOpen}
        onClose={() => setIsTeamPerformanceOpen(false)}
      />

      {/* ADMIN SYSTEM SETTINGS MODAL */}
      {currentUser.role === 'admin' && (
        <AdminSettingsModal
          isOpen={isAdminSettingsOpen}
          onClose={() => setIsAdminSettingsOpen(false)}
          currentUser={currentUser}
        />
      )}

    </div>
  );
}

export default App;