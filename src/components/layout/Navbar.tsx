import React, { useState, useEffect } from 'react';
import { Search, Plus, LogOut, DollarSign, Users, Settings } from 'lucide-react';
import { User } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { subscribeToTasks } from '../../lib/firestoreService';

interface NavbarProps {
  currentUser: User;
  onLogout: () => void;
  onOpenQuickAdd: () => void;
  onSearch: (q: string) => void;
  onOpenPersonalEarnings: () => void;
  onOpenTeamPerformance: () => void;
  onOpenAdminSettings: () => void;
  onSelectLead: (leadId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  onOpenQuickAdd,
  onSearch,
  onOpenPersonalEarnings,
  onOpenTeamPerformance,
  onOpenAdminSettings,
  onSelectLead
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [todayEarnings, setTodayEarnings] = useState<number>(0);

  useEffect(() => {
    const unsub = subscribeToTasks((tasks) => {
      const todayStr = new Date().toISOString().split('T')[0];
      const myCompletedToday = tasks.filter(
        (t) => (t.assignedTo === currentUser.id || t.createdBy === currentUser.id) &&
               t.status === 'completed' &&
               t.completedAt &&
               t.completedAt.startsWith(todayStr)
      );
      const total = myCompletedToday.reduce((sum, t) => sum + (t.rateValue ?? 0), 0);
      setTodayEarnings(total);
    });

    return () => unsub();
  }, [currentUser.id]);

  return (
    <header className="sticky top-0 z-30 bg-[#FAF7F2] border-b border-[#E5DFD5] text-[#121624] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#FF5E62] flex items-center justify-center text-white font-extrabold text-lg shadow-xs">
              W
            </div>
            <div>
              <span className="font-extrabold text-[#121624] text-base block leading-tight">WebCraft Studio</span>
            </div>
          </div>

          <div className="flex-1 max-w-xl relative">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#969188]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  onSearch(e.target.value);
                }}
                placeholder="Search leads, phone, email..."
                className="w-full bg-white text-[#121624] placeholder-slate-400 text-xs rounded-full pl-10 pr-4 py-2 border border-[#E0D9CD] focus:outline-none focus:ring-2 focus:ring-[#FF5E62]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenPersonalEarnings}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-full"
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              <span>Today: {formatCurrency(todayEarnings)}</span>
            </button>

            <button
              onClick={onOpenQuickAdd}
              className="flex items-center gap-1 bg-[#121624] hover:bg-[#1E253A] text-white px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Lead</span>
            </button>

            {currentUser.role === 'admin' && (
              <button
                onClick={onOpenAdminSettings}
                className="p-2 text-[#68645D] hover:text-[#121624] rounded-full hover:bg-[#F0EDE5] cursor-pointer"
                title="Admin Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onLogout}
              className="p-2 text-[#969188] hover:text-red-600 rounded-full hover:bg-[#F0EDE5] cursor-pointer"
              title="Log Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
