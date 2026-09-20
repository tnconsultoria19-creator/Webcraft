import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Award,
  Users,
  CheckCircle2,
  PhoneCall,
  Phone,
  DollarSign,
  Calculator,
  Plus,
  ArrowRight,
  Activity,
  Layers,
  Sparkles,
  Zap,
  Globe,
  SlidersHorizontal,
  Flame,
  CheckCircle,
  ExternalLink,
  Target,
  Clock,
  ChevronDown,
  Calendar,
  BarChart3,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { Lead, Task, OutreachAttempt, ActivityLog, User } from '../../types';
import { formatCurrency, formatDateTime, formatTimeAgo, formatExternalUrl } from '../../lib/utils';
import { getCountryByName } from '../../lib/currencyUtils';
import { WorldClockBar } from '../layout/WorldClockBar';
import { findLeadDuplicates } from '../../lib/searchUtils';
import { updateLeadInFirestore } from '../../lib/firestoreService';

interface MainDashboardProps {
  currentUser?: User;
  onSelectLead: (leadId: string) => void;
  onOpenQuickAdd: () => void;
  onDeleteLead?: (leadId: string, leadName: string) => void;
  leads: Lead[];
  tasks: Task[];
  outreach: OutreachAttempt[];
  activities: ActivityLog[];
}

export const MainDashboard: React.FC<MainDashboardProps> = ({
  currentUser,
  onSelectLead,
  onOpenQuickAdd,
  onDeleteLead,
  leads,
  tasks,
  outreach,
  activities
}) => {
  const isLoading = false;
  const [chartPeriod, setChartPeriod] = useState<'Weekly' | 'Monthly'>('Weekly');
  const [barChartPeriod, setBarChartPeriod] = useState<'Monthly' | 'Quarterly'>('Monthly');

  // Compute Metrics
  const totalLeads = leads.length;
  const prototypesReady = leads.filter(
    (l) => Boolean(l.templateUrl) || l.stage === 'template_completed' || l.stage === 'ready_for_outreach'
  ).length;
  const outreachInFlight = leads.filter((l) =>
    ['outreach_sent', 'outreach_in_progress', 'awaiting_response', 'response_received', 'interested', 'negotiation'].includes(l.stage)
  ).length;
  const wonLeads = leads.filter(
    (l) => l.stage === 'won' || l.stage === 'website_production' || l.stage === 'completed'
  ).length;

  // Monthly Revenue Target (R30,000 / mo = 60 deals at R500 profit)
  const monthlyTargetZAR = 30000;
  const currentEarnedZAR = wonLeads * 500;
  const progressPercent = Math.min(100, Math.round((currentEarnedZAR / monthlyTargetZAR) * 100));

  // Weekly spline data points for the Gymove-style Plan List Chart
  const weeklyData = [
    { day: 'Sun', value: 85, target: 70 },
    { day: 'Mon', value: 130, target: 90 },
    { day: 'Tue', value: 75, target: 80 },
    { day: 'Wed', value: 135, target: 110 },
    { day: 'Thu', value: 95, target: 85 },
    { day: 'Fri', value: 155, target: 130 },
    { day: 'Sat', value: 60, target: 50 },
  ];

  // Gymove-style Bar Chart Data (20 intervals matching the reference Calories Chart)
  const barChartData = [
    { id: '01', positive: 65, negative: -25 },
    { id: '02', positive: 25, negative: -10 },
    { id: '03', positive: 70, negative: -30 },
    { id: '04', positive: 20, negative: -15 },
    { id: '05', positive: 50, negative: -20 },
    { id: '06', positive: 40, negative: -65 },
    { id: '07', positive: 60, negative: -15 },
    { id: '08', positive: 18, negative: -10 },
    { id: '09', positive: 40, negative: -28 },
    { id: '10', positive: 55, negative: -35 },
    { id: '11', positive: 60, negative: -40 },
    { id: '12', positive: 22, negative: -18 },
    { id: '13', positive: 72, negative: -30 },
    { id: '14', positive: 40, negative: -20 },
    { id: '15', positive: 45, negative: -30 },
    { id: '16', positive: 68, negative: -70 },
    { id: '17', positive: 22, negative: -15 },
    { id: '18', positive: 40, negative: -25 },
    { id: '19', positive: 62, negative: -22 },
    { id: '20', positive: 50, negative: -18 },
  ];

  return (
    <div className="space-y-4 font-['Poppins'] text-[#68645D] pb-10">
      
      {/* ========================================================= */}
      {/* SECTION 1: TOP STATS + PLAN VELOCITY CHART (GYMOVE HERO GRID) */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* Left Side: 2x2 Compact KPI Stat Cards (Cols 6) */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Stat 1: Total Prospects (Weekly Progress Style) */}
          <div className="bg-white rounded-xl p-4 border border-[#DDD8CE] shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center gap-3.5 relative overflow-hidden">
            <div className="w-12 h-12 rounded-full bg-[#245F6B]/10 text-[#245F6B] flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-normal text-[#68645D]">Weekly Progress</div>
              <div className="text-2xl font-bold text-[#292A29] tracking-tight leading-tight mt-0.5">
                {totalLeads > 0 ? `${totalLeads} Leads` : '42%'}
              </div>
            </div>
            
          </div>

          {/* Stat 2: Prototypes Ready (Weekly Running Style) */}
          <div className="bg-white rounded-xl p-4 border border-[#DDD8CE] shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center gap-3.5 relative overflow-hidden">
            <div className="w-12 h-12 rounded-full bg-[#686E5E]/10 text-[#686E5E] flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-normal text-[#68645D]">Prototypes Ready</div>
              <div className="text-2xl font-bold text-[#292A29] tracking-tight leading-tight mt-0.5">
                {prototypesReady > 0 ? `${prototypesReady} Sites` : '42km'}
              </div>
            </div>
            
          </div>

          {/* Stat 3: Outreach In Flight (Daily Cycling Style) */}
          <div className="bg-white rounded-xl p-4 border border-[#DDD8CE] shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center gap-3.5 relative overflow-hidden">
            <div className="w-12 h-12 rounded-full bg-[#A65B55]/10 text-[#A65B55] flex items-center justify-center shrink-0">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-normal text-[#68645D]">Daily Outreach</div>
              <div className="text-2xl font-bold text-[#292A29] tracking-tight leading-tight mt-0.5">
                {outreachInFlight > 0 ? `${outreachInFlight} Active` : '230 Km'}
              </div>
            </div>
            
          </div>

          {/* Stat 4: Won Deals (Morning Yoga Style) */}
          <div className="bg-white rounded-xl p-4 border border-[#DDD8CE] shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex items-center gap-3.5 relative overflow-hidden">
            <div className="w-12 h-12 rounded-full bg-[#D9A441]/15 text-[#D9A441] flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-normal text-[#68645D]">Closed Deals</div>
              <div className="text-2xl font-bold text-[#292A29] tracking-tight leading-tight mt-0.5">
                {wonLeads > 0 ? `${wonLeads} (${formatCurrency(currentEarnedZAR)})` : '18:34:21'}
              </div>
            </div>
            
          </div>

        </div>

        {/* Right Side: Plan List Spline Line Chart (Cols 6) */}
        <div className="lg:col-span-6 bg-white rounded-xl p-4 border border-[#DDD8CE] shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex flex-col justify-between">
          
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold text-[15px] text-[#292A29] leading-none">Plan List</h3>
              <p className="text-xs text-[#68645D] mt-1">Real-time outreach & prototype execution trend</p>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setChartPeriod(chartPeriod === 'Weekly' ? 'Monthly' : 'Weekly')}
                className="px-3 py-1.5 bg-[#E5EEEE] text-[#245F6B] font-medium text-xs rounded-full flex items-center gap-1.5 hover:bg-[#E5EEEE] transition-colors cursor-pointer"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>{chartPeriod}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* SVG Smooth Curve Area Chart matching Gymove */}
          <div className="w-full pt-3">
            <div className="relative h-28 w-full">
              
              {/* Y Axis Grid Guidelines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-[#969188] font-normal">
                <div className="flex items-center gap-2">
                  <span className="w-6 text-right">160</span>
                  <div className="flex-1 border-b border-[#F0EDE5]" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 text-right">120</span>
                  <div className="flex-1 border-b border-[#F0EDE5]" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 text-right">80</span>
                  <div className="flex-1 border-b border-[#F0EDE5]" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 text-right">40</span>
                  <div className="flex-1 border-b border-[#F0EDE5]" />
                </div>
              </div>

              {/* The Smooth Spline Wave Path */}
              <svg viewBox="0 0 500 100" preserveAspectRatio="none" className="w-full h-full pl-8 pr-2 overflow-visible">
                <defs>
                  <linearGradient id="gymoveBlueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#245F6B" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#245F6B" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                
                {/* Area Gradient fill */}
                <path
                  d="M 10 70 Q 75 10, 145 65 T 285 20 T 425 10 T 490 85 L 490 100 L 10 100 Z"
                  fill="url(#gymoveBlueGrad)"
                />

                {/* Primary Blue Spline Line */}
                <path
                  d="M 10 70 Q 75 10, 145 65 T 285 20 T 425 10 T 490 85"
                  fill="none"
                  stroke="#245F6B"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* X-Axis Days */}
            <div className="flex justify-between pl-8 pr-2 text-[11px] text-[#68645D] font-medium pt-1">
              {weeklyData.map((d, i) => (
                <span key={i}>{d.day}</span>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================= */}
      {/* SECTION 2: FEATURED PANELS & ACTIVITY */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
        
        {/* Standard Client Deal Rates */}
        <div className="bg-white rounded-xl p-4 border border-[#DDD8CE] shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-1">
              <div>
                <h3 className="font-semibold text-[15px] text-[#292A29]">Standard Client Deal Rates</h3>
                <p className="text-xs text-[#68645D] mt-0.5">Fixed client prices (Base Company Amount R500)</p>
              </div>
              <span className="text-[10px] font-bold text-[#4F765C] px-2.5 py-1 bg-[#4F765C]/10 rounded-full">
                Active Policy
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2">
              <div className="bg-[#F4F1EA] p-3 rounded-xl border border-[#DDD8CE] space-y-1 hover:border-[#245F6B] transition-colors">
                <div className="text-[11px] font-medium text-[#68645D] flex items-center justify-between">
                  <span>🇿🇦 ZA</span>
                  <span className="text-[10px] text-[#245F6B] font-semibold">ZAR</span>
                </div>
                <div className="text-base font-bold text-[#292A29]">R 650</div>
                <div className="text-[10px] font-semibold text-[#4F765C] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F765C]" /> R500 base + R150 pool
                </div>
              </div>

              <div className="bg-[#F4F1EA] p-3 rounded-xl border border-[#DDD8CE] space-y-1 hover:border-[#245F6B] transition-colors">
                <div className="text-[11px] font-medium text-[#68645D] flex items-center justify-between">
                  <span>🇺🇸 USA</span>
                  <span className="text-[10px] text-[#245F6B] font-semibold">USD</span>
                </div>
                <div className="text-base font-bold text-[#292A29]">$ 50</div>
                <div className="text-[10px] font-semibold text-[#4F765C] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F765C]" /> Standard Global
                </div>
              </div>

              <div className="bg-[#F4F1EA] p-3 rounded-xl border border-[#DDD8CE] space-y-1 hover:border-[#245F6B] transition-colors">
                <div className="text-[11px] font-medium text-[#68645D] flex items-center justify-between">
                  <span>🇦🇴 Angola</span>
                  <span className="text-[10px] text-[#245F6B] font-semibold">AOA</span>
                </div>
                <div className="text-base font-bold text-[#292A29]">55,000 Kz</div>
                <div className="text-[10px] font-semibold text-[#4F765C] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F765C]" /> Standard Kwanza
                </div>
              </div>

              <div className="bg-[#F4F1EA] p-3 rounded-xl border border-[#DDD8CE] space-y-1 hover:border-[#245F6B] transition-colors">
                <div className="text-[11px] font-medium text-[#68645D] flex items-center justify-between">
                  <span>🇪🇺 EU / PT</span>
                  <span className="text-[10px] text-[#245F6B] font-semibold">EUR</span>
                </div>
                <div className="text-base font-bold text-[#292A29]">€ 45</div>
                <div className="text-[10px] font-semibold text-[#4F765C] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F765C]" /> Standard Euro
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Regional World Clocks */}
        <div className="bg-white rounded-xl p-4 border border-[#DDD8CE] shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-3 flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-[15px] text-[#292A29]">Outreach Timezones</h3>
            <p className="text-xs text-[#68645D] mt-0.5">Active business operating windows</p>
          </div>
          <WorldClockBar variant="compact" />
        </div>

        {/* Recent Pipeline Activity */}
        <div className="bg-white rounded-xl p-4 border border-[#DDD8CE] shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-[15px] text-[#292A29]">Recent Pipeline Events</h3>
            <span className="text-[11px] text-[#68645D] font-medium bg-[#F4F1EA] px-2.5 py-0.5 rounded-full border border-[#DDD8CE]">
              {activities.length} logs
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {activities.length === 0 ? (
              <div className="text-xs text-[#68645D] italic py-4 text-center">No recent activities logged yet.</div>
            ) : (
              activities.slice(0, 4).map((act) => (
                <div key={act.id} className="text-xs border-b border-[#F0EDE5] pb-2 space-y-0.5">
                  <div className="font-medium text-[#292A29] line-clamp-1">{act.description}</div>
                  <div className="text-[11px] text-[#969188] flex items-center justify-between">
                    <span className="text-[#68645D]">{act.userName || 'System'}</span>
                    <span>{formatTimeAgo(act.timestamp)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* SECTION 3: PRODUCTION & REVENUE ANALYTICS BAR CHART (GYMOVE CALORIES CHART STYLE) */}
      {/* ========================================================= */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-[#DDD8CE] shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-[15px] text-[#292A29]">Revenue & Outreach Trajectory</h3>
            <p className="text-xs text-[#68645D] mt-0.5">
              Production velocity vs. client acquisition conversions across operational intervals
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#245F6B]" />
                <span className="text-[#292A29]">Outreach Calls</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#B56F55]" />
                <span className="text-[#292A29]">Revenue Deals</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setBarChartPeriod(barChartPeriod === 'Monthly' ? 'Quarterly' : 'Monthly')}
              className="px-3 py-1 bg-[#F0EDE5] text-[#292A29] font-medium text-xs rounded-full border border-[#DDD8CE] flex items-center gap-1 hover:bg-[#E8E9E2] transition-colors cursor-pointer"
            >
              <span>{barChartPeriod}</span>
              <ChevronDown className="w-3 h-3 text-[#68645D]" />
            </button>
          </div>
        </div>

        {/* The Bar Chart Canvas matching Gymove Reference */}
        <div className="w-full pt-2">
          <div className="relative h-44 w-full">
            
            {/* Horizontal Gridlines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none text-[10px] text-[#969188] font-normal">
              <div className="flex items-center gap-2">
                <span className="w-6 text-right">80</span>
                <div className="flex-1 border-b border-[#F0EDE5]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 text-right">40</span>
                <div className="flex-1 border-b border-[#F0EDE5]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 text-right">0</span>
                <div className="flex-1 border-b border-[#DDD8CE]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 text-right">-40</span>
                <div className="flex-1 border-b border-[#F0EDE5]" />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 text-right">-80</span>
                <div className="flex-1 border-b border-[#F0EDE5]" />
              </div>
            </div>

            {/* Bars */}
            <div className="absolute inset-0 pl-8 pr-2 flex items-center justify-between">
              {barChartData.map((item, idx) => (
                <div key={idx} className="flex flex-col items-center h-full justify-center relative w-full group">
                  
                  {/* Positive Blue Bar */}
                  <div className="w-2 sm:w-2.5 flex flex-col justify-end h-1/2">
                    <div
                      className="bg-[#245F6B] rounded-t-xs w-full transition-all group-hover:bg-[#1E505A]"
                      style={{ height: `${(item.positive / 80) * 100}%` }}
                    />
                  </div>

                  {/* Negative Yellow/Amber Bar */}
                  <div className="w-2 sm:w-2.5 flex flex-col justify-start h-1/2">
                    <div
                      className="bg-[#B56F55] rounded-b-xs w-full transition-all group-hover:bg-[#B56F55]"
                      style={{ height: `${(Math.abs(item.negative) / 80) * 100}%` }}
                    />
                  </div>

                </div>
              ))}
            </div>

          </div>

          {/* X Axis Labels */}
          <div className="flex justify-between pl-8 pr-2 text-[10px] text-[#969188] font-medium pt-2">
            {barChartData.map((item, idx) => (
              <span key={idx} className="text-center w-full">{item.id}</span>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
};
