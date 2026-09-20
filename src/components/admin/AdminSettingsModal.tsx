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
  CheckCircle2
} from 'lucide-react';
import { User as UserType, FinancialRecord } from '../../types';
import {
  subscribeToUsers,
  createTeamMemberAccount,
  updateUserRoleOrStatus,
  updateUserProfileByAdmin,
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

export const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'finance'>('accounts');
  const [usersList, setUsersList] = useState<UserType[]>([]);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

    const unsubUsers = subscribeToUsers((uList) => {
      setUsersList(uList);
      setIsLoading(false);
    });

    const unsubFinance = subscribeToFinancialRecords((records) => {
      setFinancialRecords(records);
    });

    return () => {
      unsubUsers();
      unsubFinance();
    };
  }, [isOpen]);

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
      await updateUserProfileByAdmin(currentUser, editingUser.id, {
        displayName: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        role: editRole,
        status: editStatus,
        bio: editBio.trim(),
        avatarUrl: editAvatarUrl.trim(),
        storedPassword: editPassword.trim() || undefined
      });

      setStatusMsg({ type: 'success', text: `Updated profile for ${editName} successfully!` });
      setEditingUser(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update employee profile');
    } finally {
      setIsSavingEdit(false);
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
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-[#292A29]">Existing Team Accounts ({usersList.length})</h3>
                
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
                            {u.storedPassword && (
                              <span className="inline-flex items-center gap-1 bg-[#F0EDE5] text-[#292A29] border border-[#DDD8CE] px-2 py-0.5 rounded-md text-[10px]">
                                <KeyRound className="w-3 h-3 text-[#245F6B]" />
                                {showPasswordMap[u.id] ? u.storedPassword : '••••••••'}
                                <button
                                  type="button"
                                  onClick={() => setShowPasswordMap((prev) => ({ ...prev, [u.id]: !prev[u.id] }))}
                                  className="ml-1 text-[#245F6B] underline text-[10px] cursor-pointer hover:text-[#1E505A]"
                                >
                                  {showPasswordMap[u.id] ? 'Hide' : 'Show'}
                                </button>
                              </span>
                            )}
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
