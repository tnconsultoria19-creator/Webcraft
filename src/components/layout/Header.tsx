import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Gift,
  Menu,
  Home,
  DollarSign,
  ChevronDown,
  Sparkles,
  Zap,
  Globe,
  Phone,
  User as UserIcon,
  AlertTriangle,
  X,
  Link as LinkIcon
} from 'lucide-react';
import { User, Lead, Task } from '../../types';
import { formatCurrency, getStageLabel } from '../../lib/utils';
import { subscribeToFinancialRecords } from '../../lib/firestoreService';
import { matchLeadComprehensive, LeadDuplicateReport } from '../../lib/searchUtils';

interface HeaderProps {
  currentUser: User;
  onOpenQuickAdd: () => void;
  onOpenAddLink?: () => void;
  onSearch: (q: string) => void;
  onSelectLead: (leadId: string) => void;
  onOpenPersonalEarnings: () => void;
  onGoHome?: () => void;
  title?: string;
  onToggleSidebar?: () => void;
  onLogout?: () => void;
  leads: Lead[];
  tasks: Task[];
  duplicateReports: Map<string, LeadDuplicateReport>;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onOpenQuickAdd,
  onOpenAddLink,
  onSearch,
  onSelectLead,
  onOpenPersonalEarnings,
  onGoHome,
  title = 'Dashboard',
  onToggleSidebar,
  onLogout,
  leads,
  tasks,
  duplicateReports
}) => {
  const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<{ lead: Lead; dupReport: LeadDuplicateReport }[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [todayEarnings, setTodayEarnings] = useState<number>(0);
  const [completedTodayCount, setCompletedTodayCount] = useState<number>(0);

  const totalDuplicatesCount = useMemo(() => {
    let count = 0;
    duplicateReports.forEach((report) => {
      if (report.hasDuplicates) count += 1;
    });
    return count;
  }, [duplicateReports]);

  useEffect(() => {
      const unsubFinance = subscribeToFinancialRecords((records) => {
      const todayStr = new Date().toISOString().split('T')[0];
      const myTodayEarned = records.filter(
        (r) => r.userId === currentUser.id && r.status === 'earned' && r.timestamp?.startsWith(todayStr)
      );
      if (myTodayEarned.length > 0) {
        const total = myTodayEarned.reduce((sum, r) => sum + (r.amount || 0), 0);
        setTodayEarnings(total);
        setCompletedTodayCount(myTodayEarned.length);
      }
    });

      return () => {
      unsubFinance();
    };
  }, [currentUser.id]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const term = searchTerm.trim();
    const matched = allLeads
      .filter((l) => matchLeadComprehensive(l, term, leads))
      .map((l) => ({
        lead: l,
        dupReport: duplicateReports.get(l.id)!
      }));

    setSearchResults(matched);
    setShowSearchResults(true);
  }, [searchTerm, leads, duplicateReports]);

  const handleClearSearch = () => {
    setSearchTerm('');
    onSearch('');
    setShowSearchResults(false);
  };

  const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      setShowSearchResults(false);
      onSearch(searchTerm);
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur-sm border-b border-[#DDD8CE] h-[4.75rem] px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 sm:gap-4 sticky top-0 z-40 font-['Poppins'] shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
      
      {/* Left: Hamburger, Home quick link, & Page Title */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-2 sm:p-2.5 rounded-xl text-[#68645D] hover:text-[#292A29] hover:bg-[#F4F1EA] transition-colors cursor-pointer"
            title="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        {onGoHome && (
          <button
            onClick={onGoHome}
            className="hidden md:flex items-center gap-2 py-2 px-3.5 bg-[#F4F1EA] hover:bg-[#E5EEEE] text-[#245F6B] rounded-xl text-xs font-semibold border border-[#DDD8CE] hover:border-[#245F6B]/30 transition-all cursor-pointer shadow-2xs"
            title="Go to Home Dashboard"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>
        )}

        <button
          onClick={onGoHome}
          className="text-left cursor-pointer group hidden sm:block"
          title="Go to Home Dashboard"
        >
          <h1 className="text-base lg:text-xl font-bold text-[#292A29] group-hover:text-[#245F6B] transition-colors tracking-tight leading-snug truncate max-w-[150px] lg:max-w-none">
            {title === 'Analytics & Overview' ? 'Dashboard' : title}
          </h1>
        </button>
      </div>

      {/* Center: Search input matching comprehensive search & duplicate discovery */}
      <div className="flex-1 max-w-xl relative mx-1 sm:mx-2">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#969188]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              onSearch(e.target.value);
            }}
            onKeyDown={handleSearchSubmit}
            onFocus={() => searchTerm.trim() && setShowSearchResults(true)}
            placeholder="Search phones (e.g. 923 456 789), names, duplicates..."
            className="w-full bg-[#F0EDE5] hover:bg-[#E8E9E2] text-[#292A29] placeholder-[#969188] text-xs font-normal rounded-full pl-9 sm:pl-11 pr-16 sm:pr-20 py-2.5 sm:py-3 border border-transparent focus:border-[#245F6B] focus:bg-white focus:outline-none transition-all shadow-2xs"
          />

          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchTerm && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="p-1 text-[#969188] hover:text-[#292A29] hover:bg-black/5 rounded-full transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {totalDuplicatesCount > 0 && !searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('duplicates');
                  onSearch('duplicates');
                }}
                className="hidden lg:flex items-center gap-1 text-[10px] font-bold text-[#91651B] bg-[#D9A441]/20 hover:bg-[#D9A441]/30 px-2 py-1 rounded-full transition-colors cursor-pointer"
                title="Click to search all duplicate leads"
              >
                <AlertTriangle className="w-3 h-3 text-[#D9A441]" />
                <span>{totalDuplicatesCount} DUP</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Search Results Dropdown with Duplicate Indicators */}
        {showSearchResults && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#DDD8CE] rounded-2xl shadow-xl overflow-hidden z-50 max-h-96 overflow-y-auto">
            <div className="px-4 sm:px-5 py-3 bg-[#F4F1EA] text-[11px] font-bold uppercase text-[#68645D] tracking-wider border-b border-[#DDD8CE] flex items-center justify-between">
              <span>Matching Prospects ({searchResults.length})</span>
              <span className="text-[10px] text-[#969188] font-normal normal-case">
                Matches spaced numbers, names & duplicates
              </span>
            </div>
            
            {searchResults.map(({ lead, dupReport }) => {
              const primaryContact = lead.contacts?.[0];
              return (
                <button
                  key={lead.id}
                  onClick={() => {
                    onSelectLead(lead.id);
                    setShowSearchResults(false);
                    setSearchTerm('');
                  }}
                  className="w-full text-left px-4 sm:px-5 py-3.5 hover:bg-[#E5EEEE]/50 border-b border-[#F0EDE5] flex flex-col gap-1.5 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-[#292A29] text-xs group-hover:text-[#245F6B] transition-colors truncate">
                        {lead.name}
                      </span>
                      <span className="text-[10px] text-[#245F6B] bg-[#E5EEEE] px-2 py-0.5 rounded-full font-bold shrink-0">
                        {lead.id}
                      </span>
                    </div>

                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#E5EEEE] text-[#245F6B] shrink-0 uppercase">
                      {getStageLabel(lead.stage)}
                    </span>
                  </div>

                  {/* Contact Info (Phone / Email / Person) */}
                  <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#68645D]">
                    {primaryContact && (
                      <div className="flex items-center gap-1.5 text-[#292A29] font-medium">
                        <Phone className="w-3.5 h-3.5 text-[#4F765C]" />
                        <span>{primaryContact.value}</span>
                        {primaryContact.contactPerson && (
                          <span className="text-[#969188]">({primaryContact.contactPerson})</span>
                        )}
                      </div>
                    )}
                    <div>
                      {lead.city || 'Regional'}{lead.country ? `, ${lead.country}` : ''}
                    </div>
                    {lead.category && (
                      <span className="text-[#969188]">Niche: {lead.category}</span>
                    )}
                  </div>

                  {/* Duplicate Alert Banner */}
                  {dupReport.hasDuplicates && (
                    <div className="mt-1 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#D9A441]/15 text-[#91651B] text-[11px] font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-[#D9A441] shrink-0" />
                      <span>
                        ⚠️ Duplicate Detected: {dupReport.matches.map(m => `${m.reason}`).join('; ')}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Round Icon Buttons & User Profile + Log Out */}
      <div className="flex items-center gap-3 lg:gap-4">
        
        {/* Notification & Quick Actions Group */}
        <div className="flex items-center gap-2">
          
          {/* Prominent Global + ADD LINK Action */}
          {onOpenAddLink && (
            <button
              onClick={onOpenAddLink}
              className="px-3.5 sm:px-4 py-2 rounded-full bg-[#4F765C] hover:bg-[#3F604A] text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
              title="Add Live Website / Cloudflare Link"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>+ ADD LINK</span>
            </button>
          )}

          {/* Primary + New Client Action */}
          <button
            onClick={onOpenQuickAdd}
            className="px-4 py-2 rounded-full bg-[#245F6B] hover:bg-[#1E505A] text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
            title="Create New Client from ChatGPT Package"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">+ New Client</span>
          </button>

          {/* Gift / Earnings button */}
          <button
            onClick={onOpenPersonalEarnings}
            className="w-10 h-10 rounded-full bg-[#F0EDE5] hover:bg-[#E5EEEE] text-[#292A29] hover:text-[#245F6B] flex items-center justify-center relative transition-colors cursor-pointer"
            title="Earnings Tracker"
          >
            <Gift className="w-4 h-4" />
            {completedTodayCount > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-[#A65B55] text-white absolute -top-1 -right-1">
                {completedTodayCount}
              </span>
            )}
          </button>
        </div>
      </div>

    </header>
  );
};

