import React, { useState } from 'react';
import {
  Target,
  TrendingUp,
  Award,
  Users,
  CheckCircle2,
  PhoneCall,
  Calendar,
  Settings2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  DollarSign,
  BarChart3,
  Flame,
  CheckCircle
} from 'lucide-react';
import { Lead, Task } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface GoalMeterCalculatorProps {
  leads: Lead[];
  tasks: Task[];
  onOpenQuickAdd?: () => void;
}

type TimeframeMode = 'annual' | 'monthly';

export const GoalMeterCalculator: React.FC<GoalMeterCalculatorProps> = ({
  leads,
  tasks,
  onOpenQuickAdd
}) => {
  // Goal parameters
  const [monthlyTarget, setMonthlyTarget] = useState<number>(30000); // R30,000 / month
  const [conversionRatePercent, setConversionRatePercent] = useState<number>(15); // 15% close rate
  const [profitPerDeal, setProfitPerDeal] = useState<number>(500); // R500 net profit
  const [timeframe, setTimeframe] = useState<TimeframeMode>('annual');
  const [showConfig, setShowConfig] = useState<boolean>(false);

  // 12-Month Annual Calculations
  const annualTarget = monthlyTarget * 12; // R360,000 / year
  const currentTarget = timeframe === 'annual' ? annualTarget : monthlyTarget;

  // Actual Pipeline Data
  const wonLeads = leads.filter(
    (l) => l.stage === 'won' || l.stage === 'completed' || l.stage === 'website_production'
  ).length;

  const contactedLeads = leads.filter((l) =>
    [
      'ready_for_outreach',
      'outreach_sent',
      'outreach_in_progress',
      'awaiting_response',
      'response_received',
      'interested',
      'negotiation',
      'won',
      'website_production',
      'completed'
    ].includes(l.stage)
  ).length;

  const completedTasks = tasks.filter((t) => t.status === 'completed').length;
  const taskEarnings = tasks
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + (t.rateValue ?? 0), 0);

  const dealsEarnings = wonLeads * profitPerDeal;
  const currentTotalProgressZAR = dealsEarnings + taskEarnings;

  // Conversion & Required Volume Math
  const convRateDecimal = (conversionRatePercent || 15) / 100;
  
  // Monthly Requirements
  const monthlyDealsNeeded = Math.ceil(monthlyTarget / (profitPerDeal || 500)); // 60 deals / mo
  const monthlyContactsNeeded = Math.ceil(monthlyDealsNeeded / convRateDecimal); // 400 contacts / mo
  const monthlyTasksNeeded = monthlyContactsNeeded * 2; // 800 actions / mo

  // 12-Month Annual Requirements
  const annualDealsNeeded = monthlyDealsNeeded * 12; // 720 deals / yr
  const annualContactsNeeded = monthlyContactsNeeded * 12; // 4,800 contacts / yr
  const annualTasksNeeded = monthlyTasksNeeded * 12; // 9,600 actions / yr

  // Active View Numbers
  const activeDealsNeeded = timeframe === 'annual' ? annualDealsNeeded : monthlyDealsNeeded;
  const activeContactsNeeded = timeframe === 'annual' ? annualContactsNeeded : monthlyContactsNeeded;
  const activeTasksNeeded = timeframe === 'annual' ? annualTasksNeeded : monthlyTasksNeeded;

  // Progress Percent
  const rawProgressPercent = currentTarget > 0 ? (currentTotalProgressZAR / currentTarget) * 100 : 0;
  const progressPercent = Math.min(100, Math.round(rawProgressPercent));

  // Remaining
  const remainingZAR = Math.max(0, currentTarget - currentTotalProgressZAR);
  const remainingDeals = Math.max(0, activeDealsNeeded - wonLeads);
  const remainingContacts = Math.max(0, activeContactsNeeded - contactedLeads);
  const remainingTasks = Math.max(0, activeTasksNeeded - completedTasks);

  // Daily & Weekly Pacing
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const daysRemainingInMonth = Math.max(1, daysInMonth - currentDay);
  const dailyContactsMonthly = Math.ceil(remainingContacts / (timeframe === 'annual' ? (12 * 21) : daysRemainingInMonth));

  // Quarterly Milestones
  const quarters = [
    { name: 'Q1 (Months 1-3)', target: annualTarget * 0.25, deals: annualDealsNeeded * 0.25, contacts: annualContactsNeeded * 0.25 },
    { name: 'Q2 (Months 4-6)', target: annualTarget * 0.50, deals: annualDealsNeeded * 0.50, contacts: annualContactsNeeded * 0.50 },
    { name: 'Q3 (Months 7-9)', target: annualTarget * 0.75, deals: annualDealsNeeded * 0.75, contacts: annualContactsNeeded * 0.75 },
    { name: 'Q4 (Months 10-12)', target: annualTarget * 1.00, deals: annualDealsNeeded * 1.00, contacts: annualContactsNeeded * 1.00 },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[#DDD8CE] shadow-xs p-7 space-y-7 font-['Poppins']">
      
      {/* Top Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#DDD8CE]">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-[#292A29] tracking-tight">
              Revenue & Production Goal Meter
            </h2>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#245F6B] text-white shadow-xs">
              {timeframe === 'annual' ? '12-Month Target: R360,000' : 'Monthly Target: R30,000'}
            </span>
          </div>
          <p className="text-xs text-[#68645D] mt-1.5 leading-relaxed">
            Revenue baseline: <strong className="text-[#292A29]">R30,000/month</strong> (<strong className="text-[#292A29]">R360,000/year</strong>) based on a <strong className="text-[#292A29]">{conversionRatePercent}% close rate</strong> and <strong className="text-[#292A29]">{formatCurrency(profitPerDeal)} net profit</strong> per deal.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Timeframe Toggle */}
          <div className="flex p-1 bg-[#F0EDE5] border border-[#DDD8CE] rounded-full">
            <button
              type="button"
              onClick={() => setTimeframe('annual')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                timeframe === 'annual'
                  ? 'bg-[#245F6B] text-white shadow-xs'
                  : 'text-[#68645D] hover:text-[#292A29]'
              }`}
            >
              12 Months (R360k)
            </button>
            <button
              type="button"
              onClick={() => setTimeframe('monthly')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                timeframe === 'monthly'
                  ? 'bg-[#245F6B] text-white shadow-xs'
                  : 'text-[#68645D] hover:text-[#292A29]'
              }`}
            >
              Monthly (R30k)
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-[#DDD8CE] hover:bg-[#F0EDE5] text-[#292A29] text-xs font-semibold rounded-full transition-colors cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5 text-[#68645D]" />
            <span>{showConfig ? 'Close' : 'Adjust Target'}</span>
          </button>
        </div>
      </div>

      {/* Config Drawer */}
      {showConfig && (
        <div className="p-5 bg-[#F0EDE5] border border-[#DDD8CE] rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#292A29] uppercase tracking-wider">
              Goal & Conversion Configuration
            </span>
            <button
              onClick={() => {
                setMonthlyTarget(30000);
                setConversionRatePercent(15);
                setProfitPerDeal(500);
              }}
              className="text-xs text-[#245F6B] hover:underline font-semibold cursor-pointer"
            >
              Reset Defaults (R30,000/mo · R360,000/yr)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#292A29] block">
                Monthly Target: <strong>{formatCurrency(monthlyTarget)}</strong> ({formatCurrency(monthlyTarget * 12)}/yr)
              </label>
              <input
                type="range"
                min={5000}
                max={100000}
                step={2500}
                value={monthlyTarget}
                onChange={(e) => setMonthlyTarget(Number(e.target.value))}
                className="w-full accent-[#245F6B] cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#292A29] block">
                Conversion Rate: <strong>{conversionRatePercent}%</strong>
              </label>
              <input
                type="range"
                min={5}
                max={50}
                step={1}
                value={conversionRatePercent}
                onChange={(e) => setConversionRatePercent(Number(e.target.value))}
                className="w-full accent-[#245F6B] cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#292A29] block">
                Net Profit Per Deal: <strong>{formatCurrency(profitPerDeal)}</strong>
              </label>
              <input
                type="range"
                min={300}
                max={3000}
                step={100}
                value={profitPerDeal}
                onChange={(e) => setProfitPerDeal(Number(e.target.value))}
                className="w-full accent-[#245F6B] cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Stats Row: Primary Hero Card + Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Card: Progress Summary in Gymove Signature Blue */}
        <div className="lg:col-span-5 bg-[#245F6B] text-white p-7 rounded-2xl shadow-lg shadow-[#245F6B]/25 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between text-xs text-white/80">
              <span className="uppercase tracking-wider font-bold text-[#D9A441]">
                {timeframe === 'annual' ? '12-Month Year Progress' : 'Current Month Progress'}
              </span>
              <span className="text-white font-bold">
                {rawProgressPercent.toFixed(1)}% of Target
              </span>
            </div>

            <div className="mt-3 text-3xl font-extrabold text-white tracking-tight">
              {formatCurrency(currentTotalProgressZAR)}
              <span className="text-sm font-normal text-white/70 ml-2">
                / {formatCurrency(currentTarget)}
              </span>
            </div>
          </div>

          {/* Progress Bar with Yellow Accent */}
          <div className="space-y-2.5">
            <div className="w-full bg-white/20 rounded-full h-3.5 overflow-hidden">
              <div
                className="h-full bg-[#D9A441] rounded-full transition-all duration-500 shadow-xs"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-white/75">
              <span>0%</span>
              <span>25% ({formatCurrency(currentTarget * 0.25)})</span>
              <span>50% ({formatCurrency(currentTarget * 0.5)})</span>
              <span>75% ({formatCurrency(currentTarget * 0.75)})</span>
              <span>100%</span>
            </div>
          </div>

          {/* Breakdown Rows */}
          <div className="space-y-2.5 pt-4 border-t border-white/20 text-xs">
            <div className="flex justify-between text-white/90">
              <span>Client Deals ({wonLeads} closed):</span>
              <span className="font-bold text-white">{formatCurrency(dealsEarnings)}</span>
            </div>
            <div className="flex justify-between text-white/90">
              <span>Task Actions ({completedTasks}):</span>
              <span className="font-bold text-white">{formatCurrency(taskEarnings)}</span>
            </div>
            <div className="flex justify-between text-white pt-2.5 border-t border-white/20 font-bold">
              <span className="text-[#D9A441]">Remaining to Target:</span>
              <span className="text-white">{formatCurrency(remainingZAR)}</span>
            </div>
          </div>
        </div>

        {/* Right Grid: Requirements Breakdown */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
          
          {/* Card 1: Deals */}
          <div className="p-6 rounded-3xl bg-white border border-[#DDD8CE] shadow-xs flex flex-col justify-between space-y-4 hover:border-[#245F6B] transition-colors">
            <div className="flex items-center justify-between text-xs text-[#68645D] font-bold uppercase tracking-wider">
              <span>Closed Deals</span>
              <div className="p-2 bg-[#245F6B]/10 rounded-xl">
                <Award className="w-4 h-4 text-[#245F6B]" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#292A29]">
                {wonLeads} <span className="text-xs text-[#68645D] font-normal">/ {activeDealsNeeded} needed</span>
              </div>
              <div className="w-full bg-[#F0EDE5] rounded-full h-2.5 mt-3 overflow-hidden border border-[#DDD8CE]">
                <div
                  className="bg-[#245F6B] h-full rounded-full"
                  style={{ width: `${Math.min(100, activeDealsNeeded > 0 ? (wonLeads / activeDealsNeeded) * 100 : 0)}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-[#68645D] pt-1">
              <strong className="text-[#292A29]">{remainingDeals}</strong> remaining @ min. {formatCurrency(profitPerDeal)} profit/deal.
            </p>
          </div>

          {/* Card 2: Contacts */}
          <div className="p-6 rounded-3xl bg-white border border-[#DDD8CE] shadow-xs flex flex-col justify-between space-y-4 hover:border-[#245F6B] transition-colors">
            <div className="flex items-center justify-between text-xs text-[#68645D] font-bold uppercase tracking-wider">
              <span>Prospect Outreach</span>
              <div className="p-2 bg-[#D9A441]/20 rounded-xl">
                <PhoneCall className="w-4 h-4 text-[#D9A441]" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#292A29]">
                {contactedLeads} <span className="text-xs text-[#68645D] font-normal">/ {activeContactsNeeded} needed</span>
              </div>
              <div className="w-full bg-[#F0EDE5] rounded-full h-2.5 mt-3 overflow-hidden border border-[#DDD8CE]">
                <div
                  className="bg-[#D9A441] h-full rounded-full"
                  style={{ width: `${Math.min(100, activeContactsNeeded > 0 ? (contactedLeads / activeContactsNeeded) * 100 : 0)}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-[#68645D] pt-1">
              <strong className="text-[#292A29]">{remainingContacts}</strong> to contact based on {conversionRatePercent}% close rate.
            </p>
          </div>

          {/* Card 3: Tasks */}
          <div className="p-6 rounded-3xl bg-white border border-[#DDD8CE] shadow-xs flex flex-col justify-between space-y-4 hover:border-[#245F6B] transition-colors">
            <div className="flex items-center justify-between text-xs text-[#68645D] font-bold uppercase tracking-wider">
              <span>Task Workload</span>
              <div className="p-2 bg-[#4F765C]/10 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-[#4F765C]" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#292A29]">
                {completedTasks} <span className="text-xs text-[#68645D] font-normal">/ {activeTasksNeeded} actions</span>
              </div>
              <div className="w-full bg-[#F0EDE5] rounded-full h-2.5 mt-3 overflow-hidden border border-[#DDD8CE]">
                <div
                  className="bg-[#4F765C] h-full rounded-full"
                  style={{ width: `${Math.min(100, activeTasksNeeded > 0 ? (completedTasks / activeTasksNeeded) * 100 : 0)}%` }}
                />
              </div>
            </div>
            <p className="text-xs text-[#68645D] pt-1">
              <strong className="text-[#292A29]">{remainingTasks}</strong> completed workflow actions contributing to your target.
            </p>
          </div>

          {/* Card 4: Daily Pacing Pace */}
          <div className="p-6 rounded-3xl bg-white border border-[#DDD8CE] shadow-xs flex flex-col justify-between space-y-4 hover:border-[#245F6B] transition-colors">
            <div className="flex items-center justify-between text-xs text-[#68645D] font-bold uppercase tracking-wider">
              <span>Target Daily Pace</span>
              <div className="p-2 bg-[#B56F55]/15 rounded-xl">
                <Calendar className="w-4 h-4 text-[#B56F55]" />
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#292A29]">
                {dailyContactsMonthly} <span className="text-xs text-[#68645D] font-normal">contacts/day</span>
              </div>
              <div className="text-xs text-[#245F6B] mt-1.5 font-bold">
                ~2 closed deals/day ({formatCurrency(profitPerDeal * 2)}/day)
              </div>
            </div>
            <p className="text-xs text-[#68645D] pt-1">
              Pacing to deliver {formatCurrency(monthlyTarget)}/mo ({formatCurrency(annualTarget)}/yr).
            </p>
          </div>

        </div>

      </div>

      {/* 12-Month Year Overview Breakdown Table */}
      <div className="pt-6 border-t border-[#DDD8CE] space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm font-bold text-[#292A29]">
            <BarChart3 className="w-5 h-5 text-[#245F6B]" />
            <span>12-Month Annual Projection & Quarterly Milestones</span>
          </div>
          <span className="text-xs text-[#68645D]">
            12 × R30,000 = <strong className="text-[#245F6B]">R360,000 Total Gross Revenue</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quarters.map((q, idx) => (
            <div
              key={q.name}
              className="p-5 rounded-2xl bg-white border border-[#DDD8CE] shadow-xs space-y-3 hover:border-[#245F6B] transition-colors"
            >
              <div className="flex items-center justify-between text-xs font-bold text-[#292A29]">
                <span>{q.name}</span>
                <span className="text-[#68645D] text-[11px] bg-[#F0EDE5] px-2 py-0.5 rounded-md">Month {(idx * 3) + 1}-{(idx + 1) * 3}</span>
              </div>
              <div className="text-xl font-extrabold text-[#245F6B]">
                {formatCurrency(q.target)}
              </div>
              <div className="text-xs text-[#68645D] flex justify-between pt-2.5 border-t border-[#DDD8CE]">
                <span>{q.deals} Deals</span>
                <span>{q.contacts} Contacts</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Assurance */}
      <div className="pt-4 border-t border-[#DDD8CE] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#68645D]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#4F765C] shrink-0" />
          <span>
            Profit rule: <strong className="text-[#292A29]">R500 minimum net profit</strong> strictly enforced on every closing quote.
          </span>
        </div>

        {onOpenQuickAdd && (
          <button
            type="button"
            onClick={onOpenQuickAdd}
            className="px-5 py-2.5 bg-[#245F6B] hover:bg-[#1E505A] text-white font-bold text-xs rounded-full transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <span>Add Prospect to Pipeline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

    </div>
  );
};
