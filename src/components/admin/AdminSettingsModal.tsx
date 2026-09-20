import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  UserPlus,
  Shield,
  User,
  Power,
  RefreshCw,
  KeyRound,
  Edit3,
  Save,
  Phone,
  Mail,
  Trash2,
  DollarSign,
  Undo2,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check
} from 'lucide-react';
import { User as UserType, FinancialRecord } from '../../types';
import {
  subscribeToAdminUsers,
  subscribeToUsers,
  createTeamMemberAccount,
  updateUserRoleOrStatus,
  updateUserProfileByAdmin,
  adminResetUserPassword,
  deleteUserProfile,
  subscribeToFinancialRecords,
  adminReverseFinancialRecord,
  adminUpdateFinancialRecord,
  adminCreateManualFinancialRecord
} from '../../lib/firestoreService';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { ConfirmModal } from '../common/ConfirmModal';

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserType;
}

export const CORE_TEAM_USERS: UserType[] = [
  {
    id: 'usr_bGh1ZHlxdWlhbGFAZ21haWwuY29t',
    email: 'lhudyquiala@gmail.com',
    displayName: 'Ludmila Domingos Quiala',
    role: 'member',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    phone: '+27 71 131 2594',
    bio: 'Operations & Lead Specialist',
    storedPassword: 'ludmila2026',
    createdAt: '2026-09-17T12:36:50.033Z'
  },
  {
    id: 'usr_Y2VzYXJmYXRpbWF0YTY2QGdtYWlsLmNvbQ',
    email: 'cesarfatimata66@gmail.com',
    displayName: 'Silvana Camara ',
    role: 'member',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    phone: undefined,
    bio: 'Template & Outreach Specialist',
    storedPassword: 'silvana2026',
    createdAt: '2026-08-17T19:15:05.888Z'
  },
  {
    id: 'usr_dG5jb25zdWx0b3JpYTE5QGdtYWlsLmNvbQ',
    email: 'tnconsultoria19@gmail.com',
    displayName: 'TN Consultoria',
    role: 'admin',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    phone: undefined,
    bio: 'System Administrator',
    storedPassword: 'admin2026',
    createdAt: '2026-08-12T08:00:00.000Z'
  },
  {
    id: 'usr_YWRtaW5Ad2ViY3JhZnQuY29t',
    email: 'admin@webcraft.com',
    displayName: 'admin',
    role: 'admin',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    phone: undefined,
    bio: 'System Admin Account',
    storedPassword: 'password123',
    createdAt: '2026-08-14T20:46:23.839Z'
  },
  {
    id: 'usr_b2xpc2JlbEBnbWFpbC5jb20',
    email: 'olisbel@gmail.com',
    displayName: 'olisbel',
    role: 'admin',
    status: 'active',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    phone: undefined,
    bio: 'Lead Platform Developer & Administrator',
    storedPassword: '19921108626Op@',
    createdAt: '2026-08-12T08:02:42.929Z'
  }
];

export const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'finance'>('accounts');
  const [usersList, setUsersList] = useState<UserType[]>(CORE_TEAM_USERS);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [copiedPasswordId, setCopiedPasswordId] = useState<string | null>(null);
  const [isReseeding, setIsReseeding] = useState(false);

  // New User Form State
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'member'>('member');
  const [newPassword, setNewPassword] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit User Profile State
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'member'>('member');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [editBio, setEditBio] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showPasswordMap, setShowPasswordMap] = useState<{ [uid: string]: boolean }>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete Profile State
  const [userToDelete, setUserToDelete] = useState<UserType | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Finance Filter & Manual Adjustment State
  const [financeUserFilter, setFinanceUserFilter] = useState<string>('all');
  const [manualAgentId, setManualAgentId] = useState<string>('');
  const [manualAmount, setManualAmount] = useState<string>('50');
  const [manualDesc, setManualDesc] = useState<string>('');
  const [manualStatus, setManualStatus] = useState<'earned' | 'potential'>('earned');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  const handleExecuteDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    setStatusMsg(null);
    try {
      await deleteUserProfile(currentUser, userToDelete.id);
      setStatusMsg({ type: 'success', text: `Profile for ${userToDelete.displayName} was successfully deleted.` });
      setUserToDelete(null);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to delete user profile.' });
    } finally {
      setIsDeletingUser(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const mergeUsers = (uList: UserType[]) => {
      if (!Array.isArray(uList) || uList.length === 0) return;
      setUsersList((previous) => {
        const base = previous && previous.length > 0 ? previous : CORE_TEAM_USERS;
        const previousById = new Map<string, UserType>(base.map((u) => [u.id, u]));
        const previousByEmail = new Map<string, UserType>(
          base
            .filter((u) => u.email)
            .map((u) => [String(u.email).toLowerCase(), u])
        );

        const updated = uList.map((user) => {
          const userEmailLower = String(user.email || '').toLowerCase();
          const prev = previousById.get(user.id) || (userEmailLower !== '' ? previousByEmail.get(userEmailLower) : undefined);
          const preservedPassword =
            user.storedPassword !== undefined && user.storedPassword !== null && user.storedPassword !== ''
              ? user.storedPassword
              : prev?.storedPassword;

          const merged: UserType = {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            status: user.status,
            createdAt: user.createdAt,
            avatarUrl: user.avatarUrl ?? prev?.avatarUrl,
            phone: user.phone ?? prev?.phone,
            bio: user.bio ?? prev?.bio,
            storedPassword: preservedPassword
          };
          return merged;
        });

        // Ensure all 5 core team users are in the list
        for (const core of CORE_TEAM_USERS) {
          const coreEmailLower = String(core.email || '').toLowerCase();
          if (!updated.some((u) => {
            const uEmailLower = String(u.email || '').toLowerCase();
            return (uEmailLower !== '' && uEmailLower === coreEmailLower) || u.id === core.id;
          })) {
            updated.push(core);
          }
        }

        return updated;
      });
      setUsersError(null);
      setIsLoading(false);
    };

    // Auto-prime database credentials in the background
    fetch('/api/admin/reseed-team', { method: 'POST' })
      .then((r) => r.json())
      .then((data: any) => {
        if (data && Array.isArray(data.users)) {
          mergeUsers(data.users);
        }
      })
      .catch(() => {});

    // First subscribe to admin endpoint which has the stored credentials
    const unsubUsers = subscribeToAdminUsers(currentUser.id, (adminUsers) => {
      if (Array.isArray(adminUsers) && adminUsers.length > 0) {
        mergeUsers(adminUsers);
      }
    });

    // Also subscribe to public endpoint as baseline
    const unsubSafeUsers = subscribeToUsers((safeUsers) => {
      if (Array.isArray(safeUsers) && safeUsers.length > 0) {
        mergeUsers(safeUsers);
      }
    });

    const unsubFinance = subscribeToFinancialRecords((records) => {
      setFinancialRecords(records);
    });

    return () => {
      unsubSafeUsers();
      unsubUsers();
      unsubFinance();
    };
  }, [isOpen, currentUser.id]);

  const handleReseedTeam = async () => {
    setIsReseeding(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/admin/reseed-team', { method: 'POST' });
      const data = await res.json() as any;
      if (data && Array.isArray(data.users)) {
        setUsersList(data.users);
      }
      setStatusMsg({ type: 'success', text: 'All 5 team accounts and passwords have been synchronized with the database!' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to sync team accounts' });
    } finally {
      setIsReseeding(false);
    }
  };

  if (!isOpen) return null;

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName || !newPassword) return;

    setIsCreating(true);
    setStatusMsg(null);

    try {
      await createTeamMemberAccount(currentUser, {
        email: newEmail.trim(),
        displayName: newName.trim(),
        role: newRole,
        password: newPassword
      });

      setStatusMsg({ type: 'success', text: `User account created for ${newName}!` });
      setNewEmail('');
      setNewName('');
      setNewPassword('');
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to create user account' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenEditUser = (user: UserType) => {
    setEditingUser(user);
    setEditName(user.displayName || '');
    setEditEmail(user.email || '');
    setEditPhone(user.phone || '');
    setEditRole(user.role || 'member');
    setEditStatus(user.status || 'active');
    setEditBio(user.bio || '');
    setEditAvatarUrl(user.avatarUrl || '');
    setEditPassword(user.storedPassword || '');
  };

  const handleSaveUserProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setIsSavingEdit(true);
    try {
      const newPasswordValue = editPassword.trim() || undefined;
      await updateUserProfileByAdmin(currentUser, editingUser.id, {
        displayName: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        role: editRole,
        status: editStatus,
        bio: editBio.trim(),
        avatarUrl: editAvatarUrl.trim(),
        storedPassword: newPasswordValue
      });

      setUsersList((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                displayName: editName.trim(),
                email: editEmail.trim(),
                phone: editPhone.trim(),
                role: editRole,
                status: editStatus,
                bio: editBio.trim(),
                avatarUrl: editAvatarUrl.trim(),
                storedPassword: newPasswordValue ?? u.storedPassword
              }
            : u
        )
      );

      setStatusMsg({ type: 'success', text: `Updated profile for ${editName} successfully!` });
      setEditingUser(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update employee profile');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleQuickResetPassword = async (targetUser: UserType) => {
    const newPass = prompt(`Enter new password for ${targetUser.displayName} (${targetUser.email}):`, targetUser.storedPassword || '');
    if (!newPass || !newPass.trim()) return;

    try {
      await adminResetUserPassword(currentUser, targetUser.id, newPass.trim());
      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, storedPassword: newPass.trim() } : u))
      );
      setStatusMsg({ type: 'success', text: `Password updated for ${targetUser.displayName}!` });
    } catch (err: any) {
      alert(err.message || 'Failed to update password');
    }
  };

  const handleToggleRole = async (targetUser: UserType) => {
    const nextRole = targetUser.role === 'admin' ? 'member' : 'admin';
    try {
      await updateUserRoleOrStatus(currentUser, targetUser.id, { role: nextRole }, 'Admin changed role');
    } catch (err: any) {
      alert(err.message || 'Failed to update role');
    }
  };

  const handleToggleStatus = async (targetUser: UserType) => {
    const nextStatus = targetUser.status === 'inactive' ? 'active' : 'inactive';
    try {
      await updateUserRoleOrStatus(currentUser, targetUser.id, { status: nextStatus }, 'Admin toggled user status');
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    }
  };

  // Handle Reverse Financial Record
  const handleReverseRecord = async (record: FinancialRecord) => {
    const reason = prompt(`Reason for reversing this payout of R${record.amount} for ${record.userName || 'Agent'}?`, 'Administrative adjustment');
    if (!reason) return;

    try {
      await adminReverseFinancialRecord(record.id, reason, currentUser);
      setStatusMsg({ type: 'success', text: `Financial record ${record.id} reversed successfully.` });
    } catch (err: any) {
      alert(err.message || 'Failed to reverse record');
    }
  };

  // Handle Create Manual Financial Adjustment
  const handleCreateManualPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAgentId || !manualAmount || !manualDesc.trim()) return;

    const targetUser = usersList.find((u) => u.id === manualAgentId);
    if (!targetUser) return;

    setIsSubmittingManual(true);
    try {
      await adminCreateManualFinancialRecord(
        {
          userId: targetUser.id,
          userName: targetUser.displayName || 'Agent',
          leadId: 'manual-admin',
          leadName: 'Admin Adjustment',
          action: 'MANUAL_OVERRIDE',
          amount: parseFloat(manualAmount),
          currency: 'ZAR',
          currencySymbol: 'R',
          earningType: 'action',
          notes: manualDesc.trim()
        },
        currentUser
      );
      setStatusMsg({
        type: 'success',
        text: `Manual payout of R${manualAmount} created for ${targetUser.displayName}`
      });
      setManualDesc('');
    } catch (err: any) {
      alert(err.message || 'Failed to create financial adjustment');
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const filteredFinancialRecords = financialRecords.filter((r) => {
    if (financeUserFilter !== 'all' && r.userId !== financeUserFilter) return false;
    return true;
  });

  const totalEarnedInLedger = filteredFinancialRecords
    .filter((r) => r.status === 'earned')
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  const totalPotentialInLedger = filteredFinancialRecords
    .filter((r) => r.status === 'potential')
    .reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/45 backdrop-blur-xs font-['Poppins']">
      <div className="bg-white border border-[#DDD8CE] rounded-3xl shadow-2xl max-w-5xl xl:max-w-6xl w-full text-[#68645D] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 bg-white text-[#292A29] border-b border-[#DDD8CE]">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-[#245F6B] rounded-2xl text-white shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-[#292A29]">Admin Control Center</h2>
              <p className="text-xs text-[#969188]">Full administrative authority over team accounts & financial ledger</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#969188] hover:text-[#292A29] p-2 rounded-full hover:bg-[#F0EDE5] transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-3 px-8 pt-3 pb-0 bg-white border-b border-[#DDD8CE]">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'accounts'
                ? 'border-[#245F6B] text-[#245F6B]'
                : 'border-transparent text-[#68645D] hover:text-[#292A29]'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Team Accounts ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('finance')}
            className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'finance'
                ? 'border-[#245F6B] text-[#245F6B]'
                : 'border-transparent text-[#68645D] hover:text-[#292A29]'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Financial Ledger & Overrides ({financialRecords.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 text-xs overflow-y-auto flex-1 bg-[#F0EDE5]/60">
          {statusMsg && (
            <div className={`p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between ${
              statusMsg.type === 'success' ? 'bg-[#4F765C]/10 text-[#4F765C] border border-[#4F765C]/30' : 'bg-[#A65B55]/10 text-[#A65B55] border border-[#A65B55]/30'
            }`}>
              <span>{statusMsg.text}</span>
              <button onClick={() => setStatusMsg(null)} className="underline text-[11px] cursor-pointer">Dismiss</button>
            </div>
          )}

          {activeTab === 'accounts' ? (
            <>
              {/* EDIT USER MODAL OVERLAY IF ACTIVE */}
              {editingUser && (
                <div className="bg-white text-[#292A29] p-6 rounded-2xl space-y-4 shadow-md border border-[#245F6B]/30">
                  <div className="flex items-center justify-between pb-3 border-b border-[#DDD8CE]">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-[#245F6B]" />
                      <span className="font-bold text-sm text-[#292A29]">
                        Editing Employee Profile: {editingUser.displayName}
                      </span>
                    </div>
                    <button
                      onClick={() => setEditingUser(null)}
                      className="text-[#68645D] hover:text-[#292A29] text-xs font-bold cursor-pointer"
                    >
                      ✕ Close Edit
                    </button>
                  </div>

                  <form onSubmit={handleSaveUserProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div>
                      <label className="block text-[#68645D] font-semibold mb-1">Display Name</label>
                      <input
                        type="text"
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3.5 py-2 focus:outline-none focus:border-[#245F6B]"
                      />
                    </div>

                    <div>
                      <label className="block text-[#68645D] font-semibold mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3.5 py-2 focus:outline-none focus:border-[#245F6B]"
                      />
                    </div>

                    <div>
                      <label className="block text-[#68645D] font-semibold mb-1">Phone Number</label>
                      <input
                        type="text"
                        placeholder="e.g. +27 82 123 4567"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3.5 py-2 focus:outline-none focus:border-[#245F6B]"
                      />
                    </div>

                    <div>
                      <label className="block text-[#68645D] font-semibold mb-1">Account Password</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          placeholder="Set or replace password"
                          className="flex-1 bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3.5 py-2 focus:outline-none focus:border-[#245F6B]"
                        />
                        <button
                          type="button"
                          onClick={() => setEditPassword(Math.random().toString(36).slice(-10))}
                          className="px-3 py-2 bg-[#E5EEEE] text-[#245F6B] rounded-xl font-bold"
                        >
                          Generate
                        </button>
                      </div>
                      <p className="mt-1 text-[10px] text-[#969188]">Leave blank only when you do not want to change the password.</p>
                    </div>

                    <div>
                      <label className="block text-[#68645D] font-semibold mb-1">Account Role</label>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as any)}
                        className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3.5 py-2 focus:outline-none focus:border-[#245F6B]"
                      >
                        <option value="member">Team Member</option>
                        <option value="admin">Super Admin</option>
                      </select>
                    </div>

                    <div className="sm:col-span-2 pt-2 flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={isSavingEdit}
                        className="px-5 py-2 bg-[#245F6B] hover:bg-[#1E505A] text-white rounded-full font-bold cursor-pointer transition-colors shadow-xs"
                      >
                        {isSavingEdit ? 'Saving Profile...' : 'Save Profile Changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingUser(null)}
                        className="px-4 py-2 bg-transparent text-[#68645D] hover:text-[#292A29] font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* CREATE NEW EMPLOYEE FORM */}
              <div className="bg-white text-[#292A29] p-6 rounded-2xl space-y-4 shadow-xs border border-[#DDD8CE]">
                <div className="flex items-center gap-2 pb-2 border-b border-[#DDD8CE]">
                  <UserPlus className="w-4 h-4 text-[#245F6B]" />
                  <span className="font-bold text-sm text-[#292A29]">Provision New Team Account</span>
                </div>

                <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <label className="block text-[#68645D] font-semibold mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#245F6B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#68645D] font-semibold mb-1">Email Address</label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="sarah@webcraft.com"
                      className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#245F6B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#68645D] font-semibold mb-1">Role</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as any)}
                      className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#245F6B]"
                    >
                      <option value="member">Team Member</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#68645D] font-semibold mb-1">Initial Password</label>
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Set account password"
                      className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#245F6B]"
                    />
                  </div>

                  <div className="sm:col-span-2 pt-2">
                    <button
                      type="submit"
                      disabled={isCreating}
                      className="px-6 py-2.5 bg-[#245F6B] hover:bg-[#1E505A] text-white rounded-full text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      {isCreating ? 'Provisioning Account...' : '+ Create Account'}
                    </button>
                  </div>
                </form>
              </div>

              {/* EXISTING USERS LIST */}
              {usersError && (
                <div className="p-3 rounded-xl bg-[#A65B55]/10 border border-[#A65B55]/30 text-[#A65B55] text-xs font-semibold">
                  {usersError}
                </div>
              )}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#292A29]">Existing Team Accounts ({usersList.length})</h3>
                  <button
                    type="button"
                    onClick={handleReseedTeam}
                    disabled={isReseeding}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F0EDE5] hover:bg-[#E5EEEE] text-[#245F6B] border border-[#DDD8CE] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isReseeding ? 'animate-spin' : ''}`} />
                    <span>{isReseeding ? 'Syncing...' : 'Sync / Restore All 5 Team Accounts'}</span>
                  </button>
                </div>
                
                <div className="space-y-2.5">
                  {usersList.map((u) => (
                    <div key={u.id} className="p-4 bg-white rounded-2xl border border-[#DDD8CE] flex flex-wrap items-center justify-between gap-4 shadow-xs">
                      <div className="flex items-center gap-3.5">
                        <img
                          src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                          alt={u.displayName}
                          className="w-10 h-10 rounded-full object-cover border border-[#DDD8CE] shrink-0"
                        />
                        <div>
                          <div className="font-bold text-[#292A29] flex items-center gap-2 text-xs">
                            {u.displayName}
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                              u.role === 'admin' ? 'bg-[#245F6B] text-white' : 'bg-[#E5EEEE] text-[#245F6B]'
                            }`}>
                              {u.role}
                            </span>
                            {u.status === 'inactive' && (
                              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase bg-[#A65B55]/10 text-[#A65B55]">
                                Disabled
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#68645D] flex flex-wrap items-center gap-2 mt-0.5">
                            <span>{u.email} {u.phone && `• ${u.phone}`}</span>
                            <span className="inline-flex items-center gap-1.5 bg-[#F0EDE5] text-[#292A29] border border-[#DDD8CE] px-2.5 py-1 rounded-lg text-[10px]">
                              <KeyRound className="w-3 h-3 text-[#245F6B] shrink-0" />
                              <span className="font-mono font-medium">
                                {u.storedPassword
                                  ? (showPasswordMap[u.id] ? u.storedPassword : '••••••••')
                                  : 'Password not stored'}
                              </span>
                              {u.storedPassword ? (
                                <span className="inline-flex items-center gap-1.5 ml-1 border-l border-[#DDD8CE] pl-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setShowPasswordMap((prev) => ({ ...prev, [u.id]: !prev[u.id] }))}
                                    className="text-[#245F6B] font-semibold hover:text-[#1E505A] cursor-pointer"
                                  >
                                    {showPasswordMap[u.id] ? 'Hide' : 'Show'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (u.storedPassword) {
                                        navigator.clipboard.writeText(u.storedPassword);
                                        setCopiedPasswordId(u.id);
                                        setTimeout(() => setCopiedPasswordId(null), 2000);
                                      }
                                    }}
                                    className="text-[#245F6B] hover:text-[#1E505A] cursor-pointer flex items-center gap-0.5"
                                    title="Copy Password"
                                  >
                                    {copiedPasswordId === u.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleQuickResetPassword(u)}
                                    className="text-[#969188] hover:text-[#245F6B] underline cursor-pointer"
                                  >
                                    Change
                                  </button>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleQuickResetPassword(u)}
                                  className="text-[#245F6B] font-semibold hover:text-[#1E505A] underline ml-1 cursor-pointer"
                                >
                                  Set Password
                                </button>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditUser(u)}
                          className="px-3.5 py-1.5 bg-[#E5EEEE] hover:bg-[#245F6B] text-[#245F6B] hover:text-white rounded-full text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                          title="Edit employee profile details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit Profile
                        </button>

                        <button
                          onClick={() => handleToggleRole(u)}
                          className="px-3.5 py-1.5 bg-[#F0EDE5] border border-[#DDD8CE] hover:bg-[#E5EEEE] text-[#292A29] rounded-full text-xs font-semibold cursor-pointer transition-colors"
                        >
                          Make {u.role === 'admin' ? 'Member' : 'Admin'}
                        </button>

                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                            u.status === 'inactive'
                              ? 'bg-[#4F765C]/10 text-[#4F765C] hover:bg-[#4F765C]/20'
                              : 'bg-[#A65B55]/10 text-[#A65B55] hover:bg-[#A65B55]/20'
                          }`}
                        >
                          {u.status === 'inactive' ? 'Activate' : 'Disable'}
                        </button>

                        <button
                          onClick={() => setUserToDelete(u)}
                          disabled={u.id === currentUser.id}
                          className="px-3.5 py-1.5 bg-[#F1E2E0] hover:bg-[#E4C8C4] text-[#A65B55] rounded-full text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors border border-[#E4C8C4] disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* TAB 2: FINANCIAL AUDIT & ADMIN OVERRIDES */
            <div className="space-y-6">
              
              {/* LEDGER METRICS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-white rounded-2xl border border-[#DDD8CE] shadow-xs">
                  <span className="text-[10px] text-[#68645D] uppercase font-extrabold block">Total Earned Payouts</span>
                  <span className="font-black text-[#4F765C] text-2xl block mt-1">{formatCurrency(totalEarnedInLedger)}</span>
                  <span className="text-[10px] text-[#68645D] mt-1 block">Live action & closed deal bonuses</span>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-[#DDD8CE] shadow-xs">
                  <span className="text-[10px] text-[#68645D] uppercase font-extrabold block">Potential Deal Bonuses</span>
                  <span className="font-black text-[#D9A441] text-2xl block mt-1">{formatCurrency(totalPotentialInLedger)}</span>
                  <span className="text-[10px] text-[#68645D] mt-1 block">Pending client deal closed/won</span>
                </div>

                <div className="p-4 bg-white rounded-2xl border border-[#DDD8CE] shadow-xs">
                  <span className="text-[10px] text-[#68645D] uppercase font-extrabold block">Total Ledger Entries</span>
                  <span className="font-black text-[#245F6B] text-2xl block mt-1">{filteredFinancialRecords.length}</span>
                  <span className="text-[10px] text-[#68645D] mt-1 block">Actions tracked in Firestore</span>
                </div>
              </div>

              {/* MANUAL ADJUSTMENT / BONUS FORM */}
              <div className="bg-white p-5 rounded-2xl border border-[#DDD8CE] shadow-xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-[#DDD8CE]">
                  <PlusCircle className="w-4 h-4 text-[#245F6B]" />
                  <span className="font-bold text-sm text-[#292A29]">Issue Admin Financial Adjustment or Override</span>
                </div>

                <form onSubmit={handleCreateManualPayout} className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-[#68645D] font-semibold mb-1">Target Agent</label>
                    <select
                      required
                      value={manualAgentId}
                      onChange={(e) => setManualAgentId(e.target.value)}
                      className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#245F6B]"
                    >
                      <option value="">Select an Agent...</option>
                      {usersList.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.displayName} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#68645D] font-semibold mb-1">Amount (ZAR)</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                      className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#245F6B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#68645D] font-semibold mb-1">Payout Status</label>
                    <select
                      value={manualStatus}
                      onChange={(e) => setManualStatus(e.target.value as any)}
                      className="w-full bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#245F6B]"
                    >
                      <option value="earned">Earned (Payable Now)</option>
                      <option value="potential">Potential (On Deal Won)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[#68645D] font-semibold mb-1">Adjustment Reason / Notes</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={manualDesc}
                        onChange={(e) => setManualDesc(e.target.value)}
                        placeholder="e.g. Discretionary production bonus, special deal contribution, correction"
                        className="flex-1 bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#245F6B]"
                      />
                      <button
                        type="submit"
                        disabled={isSubmittingManual}
                        className="px-5 py-2 bg-[#245F6B] hover:bg-[#1E505A] text-white font-bold rounded-xl text-xs transition-colors shrink-0 cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {isSubmittingManual ? 'Issuing...' : '+ Issue Record'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* FINANCIAL AUDIT LEDGER TABLE */}
              <div className="bg-white p-5 rounded-2xl border border-[#DDD8CE] shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#DDD8CE]">
                  <div>
                    <h3 className="font-bold text-sm text-[#292A29]">All Financial Records & Audit Log</h3>
                    <p className="text-[11px] text-[#969188]">Admins can review, modify, or reverse any agent financial entry</p>
                  </div>

                  {/* Filter by user */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#68645D] font-semibold">Filter Agent:</span>
                    <select
                      value={financeUserFilter}
                      onChange={(e) => setFinanceUserFilter(e.target.value)}
                      className="bg-[#F0EDE5] border border-[#DDD8CE] text-[#292A29] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#245F6B]"
                    >
                      <option value="all">All Agents ({usersList.length})</option>
                      {usersList.map((u) => (
                        <option key={u.id} value={u.id}>{u.displayName}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {filteredFinancialRecords.length === 0 ? (
                  <div className="py-10 text-center text-[#969188]">
                    No financial records match the current filter.
                  </div>
                ) : (
                  <div className="divide-y divide-[#F0EDE5] max-h-80 overflow-y-auto pr-1">
                    {filteredFinancialRecords.map((rec) => {
                      const isEarned = rec.status === 'earned';
                      const isPotential = rec.status === 'potential';
                      const isReversed = rec.status === 'reversed';

                      return (
                        <div key={rec.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#292A29] text-xs">
                                {rec.userName || 'Agent'}
                              </span>
                              <span className="text-[#68645D]">·</span>
                              <span className="text-[#68645D] text-xs">{rec.notes || rec.action}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                isEarned
                                  ? 'bg-[#4F765C]/15 text-[#4F765C]'
                                  : isPotential
                                  ? 'bg-[#D9A441]/15 text-[#91651B]'
                                  : 'bg-[#A65B55]/15 text-[#A65B55]'
                              }`}>
                                {rec.status}
                              </span>
                            </div>
                            <div className="text-[10px] text-[#969188] mt-0.5 flex items-center gap-2">
                              <span>Lead: {rec.leadName || rec.leadId || 'General'}</span>
                              <span>•</span>
                              <span>Type: {rec.action}</span>
                              <span>•</span>
                              <span>{rec.timestamp ? formatDateTime(rec.timestamp) : 'Recent'}</span>
                              {rec.notes && (
                                <span className="text-[#A65B55] font-semibold">(Reversed: {rec.notes})</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className={`font-black text-sm px-2.5 py-1 rounded-xl border ${
                              isEarned
                                ? 'text-[#4F765C] bg-[#4F765C]/10 border-[#4F765C]/30'
                                : isPotential
                                ? 'text-[#91651B] bg-[#D9A441]/10 border-[#D9A441]/30'
                                : 'text-[#A65B55] bg-[#A65B55]/10 border-[#A65B55]/30 line-through'
                            }`}>
                              +{formatCurrency(rec.amount || 0)}
                            </span>

                            {/* Admin Reverse Button */}
                            {!isReversed && (
                              <button
                                onClick={() => handleReverseRecord(rec)}
                                className="p-1.5 rounded-lg text-[#969188] hover:text-[#A65B55] hover:bg-[#A65B55]/10 transition-colors cursor-pointer"
                                title="Reverse / Void this payout record"
                              >
                                <Undo2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Delete User Confirm Modal */}
      <ConfirmModal
        isOpen={!!userToDelete}
        title={`Delete Employee Profile for "${userToDelete?.displayName}"?`}
        description={`Are you sure you want to permanently delete ${userToDelete?.displayName}'s profile (${userToDelete?.email})? Any leads or tasks assigned to them will be unassigned.`}
        confirmLabel="Delete User Profile"
        isLoading={isDeletingUser}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleExecuteDeleteUser}
      />
    </div>
  );
};
