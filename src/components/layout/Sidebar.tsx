import React, { useState, useEffect } from 'react';
import {
  Home,
  LayoutDashboard,
  Layers,
  LayoutGrid,
  DollarSign,
  Shield,
  LogOut,
  Zap,
  Calendar,
  ChevronDown,
  ChevronRight,
  PieChart,
  CheckSquare,
  Plus,
  Link as LinkIcon,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { User } from '../../types';

interface SidebarProps {
  currentUser: User;
  currentView: 'create_client' | 'dashboard' | 'pipeline' | 'my_work' | 'admin';
  onViewChange: (view: 'create_client' | 'dashboard' | 'pipeline' | 'my_work' | 'admin') => void;
  onLogout: () => void;
  onOpenPersonalEarnings: () => void;
  onOpenTeamPerformance: () => void;
  onOpenAdminSettings: () => void;
  onOpenQuickAdd?: () => void;
  onOpenAddLink?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  currentView,
  onViewChange,
  onLogout,
  onOpenPersonalEarnings,
  onOpenTeamPerformance,
  onOpenAdminSettings,
  onOpenQuickAdd,
  onOpenAddLink
}) => {
  const [dashboardOpen, setDashboardOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('webcraft_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('webcraft_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  if (isCollapsed) {
    return (
      <aside
        className="w-20 bg-white/95 backdrop-blur-sm text-[#68645D] min-h-screen flex flex-col justify-between p-3.5 shrink-0 border-r border-[#DDD8CE] font-['Poppins'] select-none z-30 shadow-xs transition-all duration-300 items-center"
        aria-label="Collapsed Sidebar Navigation"
      >
        {/* Top items */}
        <div className="flex flex-col items-center gap-4 w-full">
          {/* Collapse Toggle */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="w-10 h-10 rounded-xl hover:bg-[#F4F1EA] text-[#68645D] hover:text-[#245F6B] flex items-center justify-center transition-colors cursor-pointer"
            title="Expand Sidebar"
          >
            <PanelLeftOpen className="w-5 h-5" />
          </button>

          {/* Brand Logo Mini */}
          <button
            type="button"
            onClick={() => onViewChange('create_client')}
            className="w-11 h-11 rounded-xl bg-[#245F6B] hover:bg-[#1E505A] flex items-center justify-center text-white font-bold shadow-sm transition-colors cursor-pointer"
            title="WebCraft Studio - New Client"
          >
            <Zap className="w-5 h-5 fill-white" />
          </button>

          <div className="w-8 border-b border-[#DDD8CE] my-1" />

          {/* Primary Action: + New Client */}
          <button
            type="button"
            onClick={() => onViewChange('create_client')}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs ${
              currentView === 'create_client'
                ? 'bg-[#245F6B] text-white shadow-sm'
                : 'bg-[#E5EEEE] text-[#245F6B] hover:bg-[#245F6B]/20'
            }`}
            title="Create New Client (+R0)"
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Add Link */}
          {onOpenAddLink && (
            <button
              type="button"
              onClick={onOpenAddLink}
              className="w-11 h-11 rounded-xl flex items-center justify-center bg-[#4F765C]/10 text-[#4F765C] hover:bg-[#4F765C] hover:text-white transition-all cursor-pointer shadow-xs"
              title="Add Live Website Link (+R1.00 Action / +R50 on Deal Close)"
            >
              <LinkIcon className="w-5 h-5" />
            </button>
          )}

          {/* Home */}
          <button
            type="button"
            onClick={() => onViewChange('dashboard')}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              currentView === 'dashboard'
                ? 'bg-[#E5EEEE] text-[#245F6B] font-bold shadow-2xs'
                : 'text-[#68645D] hover:bg-[#F4F1EA] hover:text-[#292A29]'
            }`}
            title="Home / Overview"
          >
            <Home className="w-5 h-5" />
          </button>

          {/* Pipeline */}
          <button
            type="button"
            onClick={() => onViewChange('pipeline')}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              currentView === 'pipeline'
                ? 'bg-[#E5EEEE] text-[#245F6B] font-bold shadow-2xs'
                : 'text-[#68645D] hover:bg-[#F4F1EA] hover:text-[#292A29]'
            }`}
            title="Prospect Pipeline"
          >
            <Layers className="w-5 h-5" />
          </button>

          {/* My Tasks */}
          <button
            type="button"
            onClick={() => onViewChange('my_work')}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              currentView === 'my_work'
                ? 'bg-[#E5EEEE] text-[#245F6B] font-bold shadow-2xs'
                : 'text-[#68645D] hover:bg-[#F4F1EA] hover:text-[#292A29]'
            }`}
            title="My Tasks & Actions"
          >
            <CheckSquare className="w-5 h-5" />
          </button>

          <div className="w-8 border-b border-[#DDD8CE] my-1" />

          {/* Personal Earnings */}
          <button
            type="button"
            onClick={onOpenPersonalEarnings}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-[#4F765C] hover:bg-[#4F765C]/15 transition-all cursor-pointer"
            title="Personal Earnings & Wallet"
          >
            <DollarSign className="w-5 h-5" />
          </button>

          {/* Team Performance */}
          {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
            <button
              type="button"
              onClick={onOpenTeamPerformance}
              className="w-11 h-11 rounded-xl flex items-center justify-center text-[#D9A441] hover:bg-[#F4E9D8] transition-all cursor-pointer"
              title="Team Performance"
            >
              <PieChart className="w-5 h-5" />
            </button>
          )}

          {/* Admin Settings */}
          {currentUser.role === 'admin' && (
            <button
              type="button"
              onClick={onOpenAdminSettings}
              className="w-11 h-11 rounded-xl flex items-center justify-center text-[#A65B55] hover:bg-[#A65B55]/15 transition-all cursor-pointer"
              title="Admin Financial Controls & Settings"
            >
              <Shield className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Bottom items */}
        <div className="flex flex-col items-center gap-3 w-full pt-4 border-t border-[#DDD8CE]">
          {/* Avatar mini */}
          <img
            src={currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'Agent')}&background=245F6B&color=fff`}
            alt={currentUser.displayName}
            className="w-9 h-9 rounded-full object-cover border border-[#DDD8CE] shadow-2xs"
            title={`${currentUser.displayName} (${currentUser.role})`}
          />

          {/* Logout */}
          <button
            type="button"
            onClick={onLogout}
            className="w-10 h-10 rounded-xl text-[#969188] hover:text-[#A65B55] hover:bg-[#A65B55]/15 flex items-center justify-center transition-all cursor-pointer"
            title="Sign Out / Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="w-[17.5rem] bg-white/95 backdrop-blur-sm text-[#68645D] min-h-screen flex flex-col justify-between p-6 shrink-0 border-r border-[#DDD8CE] font-['Poppins'] select-none z-30 shadow-xs transition-all duration-300"
      aria-label="Expanded Sidebar Navigation"
    >
      
      {/* Brand Header */}
      <div className="space-y-6">
        
        {/* Top Header Row with Logo and Collapse Toggle */}
        <div className="flex items-center justify-between gap-2">
          {/* Logo - clickable to return Home */}
          <button
            type="button"
            onClick={() => onViewChange('create_client')}
            className="flex-1 flex items-center gap-3 px-2 py-1.5 rounded-2xl hover:bg-[#F4F1EA] transition-all text-left group cursor-pointer"
            title="WebCraft Studio - Click to create new client"
          >
            <div className="w-10 h-10 rounded-xl bg-[#245F6B] group-hover:bg-[#1E505A] flex items-center justify-center text-white font-bold text-lg shadow-sm transition-colors shrink-0">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="font-bold text-[#292A29] text-base tracking-tight leading-tight block">
                WebCraft<span className="text-[#245F6B]">.</span>
              </span>
              <span className="text-[11px] text-[#969188] font-normal tracking-wide block">
                Production Studio
              </span>
            </div>
          </button>

          {/* Sidebar Collapse Toggle Button */}
          <button
            type="button"
            onClick={toggleCollapse}
            className="p-2 rounded-xl text-[#969188] hover:text-[#245F6B] hover:bg-[#F4F1EA] transition-colors cursor-pointer shrink-0"
            title="Collapse Sidebar"
            aria-label="Collapse Sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-2 pt-1 text-sm">
          
          {/* PRIMARY WORKFLOW: + NEW CLIENT */}
          <button
            type="button"
            onClick={() => onViewChange('create_client')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-semibold text-xs lg:text-[13px] transition-all cursor-pointer shadow-xs ${
              currentView === 'create_client'
                ? 'bg-[#245F6B] text-white shadow-sm'
                : 'bg-[#E5EEEE] text-[#245F6B] hover:bg-[#245F6B]/20'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Plus className={`w-4 h-4 ${currentView === 'create_client' ? 'text-white' : 'text-[#245F6B]'}`} />
              <span>+ New Client</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
              currentView === 'create_client' ? 'bg-white/20 text-white' : 'bg-[#245F6B] text-white'
            }`}>
              Primary
            </span>
          </button>

          {/* GLOBAL ACTION: + ADD LINK */}
          {onOpenAddLink && (
            <button
              type="button"
              onClick={onOpenAddLink}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-semibold text-xs lg:text-[13px] bg-[#4F765C]/10 text-[#4F765C] hover:bg-[#4F765C] hover:text-white transition-all cursor-pointer shadow-xs group"
              title="Add live website / Cloudflare link (+R1.00 Action / +R50 Deal Close)"
            >
              <div className="flex items-center gap-2.5">
                <LinkIcon className="w-4 h-4 text-[#4F765C] group-hover:text-white transition-colors" />
                <span>+ Add Link</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-[#4F765C]/20 text-[#4F765C] group-hover:bg-white/20 group-hover:text-white transition-colors">
                Live Link
              </span>
            </button>
          )}

          {/* Direct Home Navigation Link */}
          <button
            type="button"
            onClick={() => onViewChange('dashboard')}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-medium text-xs lg:text-[13px] transition-all cursor-pointer ${
              currentView === 'dashboard'
                ? 'bg-[#E5EEEE] text-[#245F6B] font-bold shadow-2xs'
                : 'text-[#68645D] hover:bg-[#F4F1EA] hover:text-[#292A29]'
            }`}
          >
            <div className="flex items-center gap-3">
              <Home className={`w-4 h-4 ${currentView === 'dashboard' ? 'text-[#245F6B]' : 'text-[#68645D]'}`} />
              <span>Home / Overview</span>
            </div>
            {currentView === 'dashboard' && <span className="w-2 h-2 rounded-full bg-[#245F6B]" />}
          </button>

          {/* Main Dashboard Collapsible Group */}
          <div className="space-y-1">
            <button
              onClick={() => setDashboardOpen(!dashboardOpen)}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl font-medium text-xs lg:text-[13px] transition-all cursor-pointer ${
                currentView === 'pipeline' || currentView === 'my_work'
                  ? 'bg-[#F4F1EA] text-[#245F6B] font-semibold'
                  : 'text-[#68645D] hover:bg-[#F4F1EA] hover:text-[#292A29]'
              }`}
            >
              <div className="flex items-center gap-3">
                <LayoutDashboard className={`w-4 h-4 ${currentView === 'pipeline' || currentView === 'my_work' ? 'text-[#245F6B]' : 'text-[#68645D]'}`} />
                <span>Workspaces</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${dashboardOpen ? 'rotate-180 text-[#245F6B]' : 'text-[#68645D]'}`} />
            </button>

            {/* Sub-menu items */}
            {dashboardOpen && (
              <div className="pl-6 pr-2 py-1 space-y-1 text-xs">
                <button
                  onClick={() => onViewChange('pipeline')}
                  className={`w-full text-left py-2 px-3.5 rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                    currentView === 'pipeline'
                      ? 'text-[#245F6B] font-bold bg-[#E5EEEE]/80'
                      : 'text-[#68645D] hover:text-[#292A29] hover:bg-[#F4F1EA]'
                  }`}
                >
                  <span className="leading-relaxed">Prospect Pipeline</span>
                  {currentView === 'pipeline' && <span className="w-1.5 h-1.5 rounded-full bg-[#245F6B]" />}
                </button>

                <button
                  onClick={() => onViewChange('my_work')}
                  className={`w-full text-left py-2 px-3.5 rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                    currentView === 'my_work'
                      ? 'text-[#245F6B] font-bold bg-[#E5EEEE]/80'
                      : 'text-[#68645D] hover:text-[#292A29] hover:bg-[#F4F1EA]'
                  }`}
                >
                  <span className="leading-relaxed">My Tasks & Actions</span>
                  {currentView === 'my_work' && <span className="w-1.5 h-1.5 rounded-full bg-[#245F6B]" />}
                </button>
              </div>
            )}
          </div>

          {/* Quick Tools & Finance */}
          <div className="pt-2 space-y-1">
            <button
              onClick={onOpenPersonalEarnings}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs lg:text-[13px] font-medium text-[#68645D] hover:bg-[#F4F1EA] hover:text-[#292A29] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <DollarSign className="w-4 h-4 text-[#4F765C]" />
                <span>Personal Earnings</span>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#4F765C]/10 text-[#4F765C] font-bold">
                Wallet
              </span>
            </button>
          </div>

          {/* Team / Admin Controls */}
          {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
            <div className="pt-3 border-t border-[#DDD8CE] space-y-1">
              <button
                onClick={onOpenTeamPerformance}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs lg:text-[13px] font-medium text-[#68645D] hover:bg-[#F4F1EA] hover:text-[#292A29] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <PieChart className="w-4 h-4 text-[#D9A441]" />
                  <span>Team Performance</span>
                </div>
                <ChevronRight className="w-4 h-4 text-[#969188]" />
              </button>

              {currentUser.role === 'admin' && (
                <button
                  onClick={onOpenAdminSettings}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs lg:text-[13px] font-medium text-[#68645D] hover:bg-[#F4F1EA] hover:text-[#292A29] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="w-4 h-4 text-[#A65B55]" />
                    <span>Admin Settings</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#969188]" />
                </button>
              )}
            </div>
          )}

        </nav>

      </div>

      {/* Bottom Section */}
      <div className="space-y-4 pt-4 border-t border-[#DDD8CE]">
        
        {/* Create Plan CTA Card */}
        <div className="bg-[#245F6B] text-white p-4 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <div className="font-semibold text-xs text-white">Daily Production</div>
              <div className="text-[11px] text-white/80">Track task targets</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onViewChange('my_work')}
            className="w-full py-2 bg-white text-[#245F6B] hover:bg-[#F4F1EA] rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer block text-center"
          >
            View Active Tasks
          </button>
        </div>

        {/* User Profile Card */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-[#F4F1EA] border border-[#DDD8CE] shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'Agent')}&background=245F6B&color=fff`}
              alt={currentUser.displayName}
              className="w-9 h-9 rounded-full object-cover border border-[#DDD8CE] shrink-0 shadow-2xs"
            />
            <div className="min-w-0">
              <div className="font-semibold text-[#292A29] text-xs truncate leading-tight">
                {currentUser.displayName || 'Agent'}
              </div>
              <div className="text-[10px] text-[#969188] capitalize truncate leading-normal">
                {currentUser.role === 'admin' ? 'Super Admin' : 'Team Member'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="p-2 rounded-xl text-[#969188] hover:text-[#A65B55] hover:bg-[#A65B55]/15 transition-all cursor-pointer shrink-0"
            title="Log Out / Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Direct Log Out Button (Prominent Text) */}
        <button
          type="button"
          onClick={onLogout}
          className="w-full py-2 px-3 text-xs font-semibold text-[#A65B55] hover:text-white hover:bg-[#A65B55] rounded-xl border border-[#A65B55]/30 hover:border-[#A65B55] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out / Log Out</span>
        </button>

        {/* Footer info */}
        <div className="text-[11px] text-[#969188] text-center space-y-0.5 pt-1">
          <p className="font-medium text-[#68645D] leading-relaxed">WebCraft Studio Dashboard</p>
          <p className="leading-relaxed">© 2026 All Rights Reserved</p>
        </div>

      </div>

    </aside>
  );
};
