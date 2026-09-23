import React, { useState } from 'react';
import {
  Search,
  X,
  Filter,
  User as UserIcon,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpDown,
  Tag,
  MapPin,
  ChevronDown,
  RotateCcw,
  Check
} from 'lucide-react';
import { User, LeadStage, LeadPriority } from '../../types';
import { DateRangePreset, DATE_RANGE_LABELS } from '../../lib/dateFilters';
import { COUNTRIES } from '../../lib/currencyUtils';

export interface PipelineFilterState {
  search: string;
  myWorkOnly: boolean;
  ownerId: string;
  createdById: string;
  actionedById: string;
  stage: string;
  source: string;
  category: string;
  priority: string;
  country: string;
  city: string;
  datePreset: DateRangePreset;
  customFrom: string;
  customTo: string;
  duplicatesOnly: boolean;
  sortBy: 'newest' | 'oldest' | 'recently_updated' | 'recently_actioned' | 'priority' | 'name';
}

interface PipelineFilterBarProps {
  filters: PipelineFilterState;
  onFilterChange: <K extends keyof PipelineFilterState>(key: K, value: PipelineFilterState[K]) => void;
  onResetFilters: () => void;
  teamUsers: User[];
  availableSources: string[];
  availableCategories: string[];
  availableCities: string[];
  totalCount: number;
  filteredCount: number;
  currentUser: User;
}

export const PipelineFilterBar: React.FC<PipelineFilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  teamUsers,
  availableSources,
  availableCategories,
  availableCities,
  totalCount,
  filteredCount,
  currentUser
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Active filters count (excluding search and sort)
  const activeFiltersCount = [
    filters.myWorkOnly,
    filters.ownerId !== 'all',
    filters.createdById !== 'all',
    filters.actionedById !== 'all',
    filters.stage !== 'all',
    filters.source !== 'all',
    filters.category !== 'all',
    filters.priority !== 'all',
    filters.country !== 'all',
    Boolean(filters.city),
    filters.datePreset !== 'all',
    filters.duplicatesOnly
  ].filter(Boolean).length;

  const hasActiveFilters = activeFiltersCount > 0 || Boolean(filters.search);

  return (
    <div className="bg-white border border-[#DDD8CE] rounded-2xl shadow-xs overflow-hidden font-['Poppins'] mb-4 transition-all">
      
      {/* Primary Filter Row */}
      <div className="p-3.5 flex flex-wrap items-center justify-between gap-3">
        
        {/* Left Section: My Work & Search */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          
          {/* Quick Filter: [ MY WORK ] */}
          <button
            type="button"
            onClick={() => onFilterChange('myWorkOnly', !filters.myWorkOnly)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
              filters.myWorkOnly
                ? 'bg-[#245F6B] text-white ring-2 ring-[#245F6B]/30'
                : 'bg-[#FAF7F2] text-[#68645D] hover:text-[#292A29] hover:bg-[#F0EDE5] border border-[#DDD8CE]'
            }`}
            title="Show only prospects where you are the owner or creator"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>MY WORK</span>
            {filters.myWorkOnly && <Check className="w-3 h-3 text-white ml-0.5" />}
          </button>

          {/* Search Input */}
          <div className="relative flex-1 min-w-[180px] max-w-md">
            <Search className="w-3.5 h-3.5 text-[#969188] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
              placeholder="Search business, phone, email, contact..."
              className="w-full pl-8 pr-7 py-1.5 bg-[#FAF7F2] border border-[#DDD8CE] text-[#292A29] rounded-xl text-xs focus:outline-none focus:border-[#245F6B] focus:bg-white transition-all placeholder:text-[#969188]"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => onFilterChange('search', '')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#969188] hover:text-[#292A29] cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Stage Dropdown */}
          <div className="hidden sm:block">
            <select
              value={filters.stage}
              onChange={(e) => onFilterChange('stage', e.target.value)}
              aria-label="Filter by stage"
              className="px-3 py-1.5 bg-[#FAF7F2] border border-[#DDD8CE] text-[#292A29] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#245F6B] cursor-pointer"
            >
              <option value="all">All Stages</option>
              <option value="captured">Captured</option>
              <option value="ready_for_outreach">Ready for Outreach</option>
              <option value="approved">Approved</option>
              <option value="contacted">Contacted</option>
              <option value="in_discussion">In Discussion</option>
              <option value="won_deal">Won Deal</option>
              <option value="lost_unresponsive">Lost / Unresponsive</option>
            </select>
          </div>

          {/* Quick Date Range Dropdown */}
          <div>
            <select
              value={filters.datePreset}
              onChange={(e) => onFilterChange('datePreset', e.target.value as DateRangePreset)}
              aria-label="Filter by date range"
              className="px-3 py-1.5 bg-[#FAF7F2] border border-[#DDD8CE] text-[#292A29] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#245F6B] cursor-pointer"
            >
              {Object.entries(DATE_RANGE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Section: Toggle Expanded, Sort, & Clear */}
        <div className="flex items-center gap-2">
          {/* Toggle More Filters */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isExpanded || activeFiltersCount > 0
                ? 'bg-[#E5EEEE] border-[#245F6B]/30 text-[#245F6B]'
                : 'bg-white border-[#DDD8CE] text-[#68645D] hover:text-[#292A29]'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#245F6B] text-white text-[10px] font-bold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 bg-[#FAF7F2] border border-[#DDD8CE] px-2.5 py-1 rounded-xl text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#969188]" />
            <select
              value={filters.sortBy}
              onChange={(e) => onFilterChange('sortBy', e.target.value as any)}
              aria-label="Sort prospects"
              className="bg-transparent text-[#292A29] text-xs font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="recently_updated">Recently Updated</option>
              <option value="recently_actioned">Recently Actioned</option>
              <option value="priority">Priority</option>
              <option value="name">Business Name (A-Z)</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="px-2.5 py-1.5 text-xs text-[#A65B55] hover:bg-[#A65B55]/10 rounded-xl font-bold transition-colors flex items-center gap-1 cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden md:inline">Reset</span>
            </button>
          )}
        </div>

      </div>

      {/* Expanded Filter Panel */}
      {isExpanded && (
        <div className="p-4 bg-[#FAF7F2] border-t border-[#DDD8CE] space-y-4 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
            
            {/* 1. OWNER FILTER */}
            <div className="space-y-1">
              <label className="font-bold text-[11px] text-[#292A29] block">Owner</label>
              <select
                value={filters.ownerId}
                onChange={(e) => onFilterChange('ownerId', e.target.value)}
                className="w-full p-2 bg-white border border-[#DDD8CE] text-[#292A29] rounded-xl font-medium focus:outline-none focus:border-[#245F6B]"
              >
                <option value="all">All Owners</option>
                <option value="unassigned">Unassigned</option>
                {teamUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName || u.email}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. CREATED BY FILTER */}
            <div className="space-y-1">
              <label className="font-bold text-[11px] text-[#292A29] block">Created By</label>
              <select
                value={filters.createdById}
                onChange={(e) => onFilterChange('createdById', e.target.value)}
                className="w-full p-2 bg-white border border-[#DDD8CE] text-[#292A29] rounded-xl font-medium focus:outline-none focus:border-[#245F6B]"
              >
                <option value="all">All Users</option>
                {teamUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName || u.email}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. ACTIONED BY FILTER */}
            <div className="space-y-1">
              <label className="font-bold text-[11px] text-[#292A29] block">Actioned By</label>
              <select
                value={filters.actionedById}
                onChange={(e) => onFilterChange('actionedById', e.target.value)}
                className="w-full p-2 bg-white border border-[#DDD8CE] text-[#292A29] rounded-xl font-medium focus:outline-none focus:border-[#245F6B]"
              >
                <option value="all">All Users</option>
                {teamUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.displayName || u.email}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. PRIORITY FILTER */}
            <div className="space-y-1">
              <label className="font-bold text-[11px] text-[#292A29] block">Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => onFilterChange('priority', e.target.value)}
                className="w-full p-2 bg-white border border-[#DDD8CE] text-[#292A29] rounded-xl font-medium focus:outline-none focus:border-[#245F6B]"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* 5. SOURCE FILTER */}
            <div className="space-y-1">
              <label className="font-bold text-[11px] text-[#292A29] block">Source</label>
              <select
                value={filters.source}
                onChange={(e) => onFilterChange('source', e.target.value)}
                className="w-full p-2 bg-white border border-[#DDD8CE] text-[#292A29] rounded-xl font-medium focus:outline-none focus:border-[#245F6B]"
              >
                <option value="all">All Sources</option>
                {availableSources.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* 6. CATEGORY FILTER */}
            <div className="space-y-1">
              <label className="font-bold text-[11px] text-[#292A29] block">Category</label>
              <select
                value={filters.category}
                onChange={(e) => onFilterChange('category', e.target.value)}
                className="w-full p-2 bg-white border border-[#DDD8CE] text-[#292A29] rounded-xl font-medium focus:outline-none focus:border-[#245F6B]"
              >
                <option value="all">All Categories</option>
                {availableCategories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* 7. COUNTRY FILTER */}
            <div className="space-y-1">
              <label className="font-bold text-[11px] text-[#292A29] block">Country</label>
              <select
                value={filters.country}
                onChange={(e) => onFilterChange('country', e.target.value)}
                className="w-full p-2 bg-white border border-[#DDD8CE] text-[#292A29] rounded-xl font-medium focus:outline-none focus:border-[#245F6B]"
              >
                <option value="all">All Countries</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* 8. CITY FILTER */}
            <div className="space-y-1">
              <label className="font-bold text-[11px] text-[#292A29] block">City</label>
              <input
                type="text"
                value={filters.city}
                onChange={(e) => onFilterChange('city', e.target.value)}
                placeholder="Filter by city..."
                className="w-full p-2 bg-white border border-[#DDD8CE] text-[#292A29] rounded-xl font-medium focus:outline-none focus:border-[#245F6B] text-xs placeholder:text-[#969188]"
              />
            </div>

          </div>

          {/* Custom Date Range Picker (if preset === 'custom') */}
          {filters.datePreset === 'custom' && (
            <div className="p-3 bg-white border border-[#DDD8CE] rounded-xl flex flex-wrap items-center gap-3 text-xs">
              <span className="font-bold text-[#292A29]">Custom Date Range:</span>
              <div className="flex items-center gap-2">
                <span className="text-[#68645D]">From:</span>
                <input
                  type="date"
                  value={filters.customFrom}
                  onChange={(e) => onFilterChange('customFrom', e.target.value)}
                  className="p-1.5 bg-[#FAF7F2] border border-[#DDD8CE] rounded-lg text-xs font-mono"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#68645D]">To:</span>
                <input
                  type="date"
                  value={filters.customTo}
                  onChange={(e) => onFilterChange('customTo', e.target.value)}
                  className="p-1.5 bg-[#FAF7F2] border border-[#DDD8CE] rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* Bottom Options inside panel: Duplicates Only */}
          <div className="flex items-center justify-between pt-1">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#292A29]">
              <input
                type="checkbox"
                checked={filters.duplicatesOnly}
                onChange={(e) => onFilterChange('duplicatesOnly', e.target.checked)}
                className="rounded border-[#DDD8CE] text-[#245F6B] focus:ring-[#245F6B]"
              />
              <span>Show Duplicates Only</span>
            </label>

            <button
              type="button"
              onClick={onResetFilters}
              className="text-xs text-[#A65B55] hover:underline font-bold cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>

        </div>
      )}

      {/* Active Filter Badges Bar */}
      {hasActiveFilters && (
        <div className="px-3.5 py-2 bg-[#F6F4EF] border-t border-[#DDD8CE] flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="font-bold text-[#68645D] mr-1">Active filters:</span>

          {filters.myWorkOnly && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#245F6B] text-white font-semibold">
              <span>My Work</span>
              <button onClick={() => onFilterChange('myWorkOnly', false)} className="hover:opacity-80">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.search && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[#DDD8CE] text-[#292A29] font-medium">
              <span>Search: "{filters.search}"</span>
              <button onClick={() => onFilterChange('search', '')} className="hover:text-[#A65B55]">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.ownerId !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[#DDD8CE] text-[#292A29] font-medium">
              <span>Owner: {teamUsers.find(u => u.id === filters.ownerId)?.displayName || filters.ownerId}</span>
              <button onClick={() => onFilterChange('ownerId', 'all')} className="hover:text-[#A65B55]">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.createdById !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[#DDD8CE] text-[#292A29] font-medium">
              <span>Created By: {teamUsers.find(u => u.id === filters.createdById)?.displayName || filters.createdById}</span>
              <button onClick={() => onFilterChange('createdById', 'all')} className="hover:text-[#A65B55]">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.actionedById !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[#DDD8CE] text-[#292A29] font-medium">
              <span>Actioned By: {teamUsers.find(u => u.id === filters.actionedById)?.displayName || filters.actionedById}</span>
              <button onClick={() => onFilterChange('actionedById', 'all')} className="hover:text-[#A65B55]">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.stage !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[#DDD8CE] text-[#292A29] font-medium">
              <span>Stage: {filters.stage}</span>
              <button onClick={() => onFilterChange('stage', 'all')} className="hover:text-[#A65B55]">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.datePreset !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[#DDD8CE] text-[#292A29] font-medium">
              <span>Date: {DATE_RANGE_LABELS[filters.datePreset]}</span>
              <button onClick={() => onFilterChange('datePreset', 'all')} className="hover:text-[#A65B55]">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.source !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[#DDD8CE] text-[#292A29] font-medium">
              <span>Source: {filters.source}</span>
              <button onClick={() => onFilterChange('source', 'all')} className="hover:text-[#A65B55]">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.priority !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[#DDD8CE] text-[#292A29] font-medium">
              <span>Priority: {filters.priority}</span>
              <button onClick={() => onFilterChange('priority', 'all')} className="hover:text-[#A65B55]">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {filters.duplicatesOnly && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#D9A441] text-white font-semibold">
              <span>Duplicates Only</span>
              <button onClick={() => onFilterChange('duplicatesOnly', false)} className="hover:opacity-80">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <div className="ml-auto text-[#68645D] font-medium text-[11px]">
            Showing <strong className="text-[#292A29]">{filteredCount}</strong> of <strong className="text-[#292A29]">{totalCount}</strong>
          </div>
        </div>
      )}

    </div>
  );
};
