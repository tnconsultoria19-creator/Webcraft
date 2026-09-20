import React, { useState } from 'react';
import { X, User, KeyRound, Save, Check, Eye, EyeOff } from 'lucide-react';
import { User as UserType } from '../../types';
import { updateOwnUserProfile } from '../../lib/firestoreService';

interface PersonalProfileModalProps {
  isOpen: boolean;
  currentUser: UserType;
  onClose: () => void;
  onProfileUpdated: () => void;
}

export const PersonalProfileModal: React.FC<PersonalProfileModalProps> = ({
  isOpen,
  currentUser,
  onClose,
  onProfileUpdated
}) => {
  const [displayName, setDisplayName] = useState(currentUser.displayName || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || '');

  // Password fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      // 1. Password check if provided
      if (newPassword.trim()) {
        if (newPassword.length < 6) {
          throw new Error('New password must be at least 6 characters long.');
        }
        if (newPassword !== confirmPassword) {
          throw new Error('New passwords do not match.');
        }
      }

      const updates: Partial<UserType> = {
        displayName: displayName.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim() || currentUser.avatarUrl
      };

      if (newPassword.trim()) {
        updates.storedPassword = newPassword.trim();
      }

      await updateOwnUserProfile(currentUser.id, updates);

      setMessage({ type: 'success', text: 'Your profile and settings have been saved!' });
      setNewPassword('');
      setConfirmPassword('');
      onProfileUpdated();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs ">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-lg w-full text-[#292A29] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-[#DDD8CE]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#245F6B] text-white rounded-lg">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-[#292A29]">My Account Profile & Password</h2>
              <p className="text-xs text-[#68645D]">Update your details, contact phone, and security credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#969188] hover:text-[#292A29] hover:bg-[#E8E9E2] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveProfile} className="p-6 space-y-4 text-xs">
          {message && (
            <div
              className={`p-3 rounded-lg font-medium flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {message.type === 'success' && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
              {message.text}
            </div>
          )}

          {/* Profile Section */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#68645D] mb-1">Display Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[#F4F1EA] border border-[#DDD8CE] rounded-lg px-3 py-2 text-[#292A29] text-sm focus:outline-none focus:ring-2 focus:ring-[#245F6B]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#68645D] mb-1">Email Address (Read only)</label>
                <input
                  type="email"
                  disabled
                  value={currentUser.email}
                  className="w-full bg-[#F0EDE5] border border-slate-200 text-[#68645D] rounded-lg px-3 py-2 text-xs cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#68645D] mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+27 82 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#F4F1EA] border border-[#DDD8CE] rounded-lg px-3 py-2 text-[#292A29] text-xs focus:outline-none focus:ring-2 focus:ring-[#245F6B]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#68645D] mb-1">Avatar Image URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full bg-[#F4F1EA] border border-[#DDD8CE] rounded-lg px-3 py-2 text-[#292A29] text-xs focus:outline-none focus:ring-2 focus:ring-[#245F6B]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#68645D] mb-1">Bio / Notes</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                placeholder="Brief summary or position description..."
                className="w-full bg-[#F4F1EA] border border-[#DDD8CE] rounded-lg p-2.5 text-[#292A29] text-xs focus:outline-none focus:ring-2 focus:ring-[#245F6B]"
              />
            </div>
          </div>

          <hr className="border-slate-100 my-2" />

          {/* Change Password Section */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center gap-2 text-[#292A29] font-semibold text-xs">
              <KeyRound className="w-4 h-4 text-[#292A29]" />
              <span>Change Account Password</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#68645D] mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#F4F1EA] border border-[#DDD8CE] rounded-lg px-3 py-2 text-[#292A29] text-xs focus:outline-none focus:ring-2 focus:ring-[#245F6B] pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-[#969188] hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#68645D] mb-1">Confirm New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#F4F1EA] border border-[#DDD8CE] rounded-lg px-3 py-2 text-[#292A29] text-xs focus:outline-none focus:ring-2 focus:ring-[#245F6B]"
                />
              </div>
            </div>
            <p className="text-[11px] text-[#969188]">Leave password fields blank if you do not wish to change your password.</p>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#F0EDE5] hover:bg-[#E8E9E2] text-[#292A29] rounded-lg font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-slate-900 hover:bg-[#1E505A] text-white rounded-lg font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving Changes...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
