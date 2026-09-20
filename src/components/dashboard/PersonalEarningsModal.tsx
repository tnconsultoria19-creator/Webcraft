import React, { useState, useEffect } from 'react';
import { X, DollarSign, Layers, Check, Calendar, ArrowUpRight, Clock, Award, ShieldAlert } from 'lucide-react';
import { User, Task, FinancialRecord } from '../../types';
import { formatCurrency, formatDateTime } from '../../lib/utils';
import { subscribeToFinancialRecords, subscribeToTasks } from '../../lib/firestoreService';

interface PersonalEarningsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
}

export const PersonalEarningsModal: React.FC<PersonalEarningsModalProps> = ({
  isOpen,
  onClose,
  currentUser
}) => {
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const unsubFinance = subscribeToFinancialRecords((records) => {
      const myRecords = records.filter((r) => r.userId === currentUser.id);
      setFinancialRecords(myRecords);
      setIsLoading(false);
    });

    const unsubTasks = subscribeToTasks((tList) => {
      const myCompleted = tList.filter(
        (t) => (t.assignedTo === currentUser.id || t.createdBy === currentUser.id) && t.status === 'completed'
      );
      setTasks(myCompleted);
    });

    return () => {
      unsubFinance();
      unsubTasks();
    };
  }, [isOpen, currentUser.id]);

  if (!isOpen) return null;

  // Breakdown of Financial Records
  const earnedRecords = financialRecords.filter((r) => r.status === 'earned');
  const potentialRecords = financialRecords.filter((r) => r.status === 'potential');

  const totalEarnedAmount = earnedRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalPotentialAmount = potentialRecords.reduce((sum, r) => sum + (r.amount || 0), 0);

  const linksCreated = earnedRecords.filter((r) => r.action === 'LINK_CREATED');
  const messagesSent = earnedRecords.filter((r) => r.action === 'MESSAGE_SENT');
  const bonusesEarned = earnedRecords.filter((r) => r.action === 'LINK_SUCCESS_BONUS' || r.action === 'MESSAGE_SUCCESS_BONUS');

  // Today's earnings
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEarnedRecords = earnedRecords.filter((r) => r.timestamp?.startsWith(todayStr));
  const todayEarnedAmount = todayEarnedRecords.reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/45 backdrop-blur-xs font-['Poppins']">
      <div className="bg-white border border-[#DDD8CE] rounded-3xl shadow-2xl max-w-3xl w-full text-[#292A29] overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-[#FAF7F2] border-b border-[#E5DFD5]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#4F765C]/15 border border-[#4F765C]/30 rounded-2xl text-[#4F765C]">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-[#121624]">Agent Earnings & Payout Ledger</h2>
              <p className="text-xs text-[#68645D]">Financial ledger & action bonuses for {currentUser.displayName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#969188] hover:text-[#121624] p-1.5 rounded-full hover:bg-[#F0EDE5] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-xs max-h-[80vh] overflow-y-auto">
          {isLoading ? (
            <div className="py-8 text-center text-[#68645D] animate-pulse font-bold">Loading agent financial ledger...</div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#E5DFD5]">
                  <span className="text-[10px] text-[#68645D] uppercase font-extrabold block">Today's Earned</span>
                  <span className="font-black text-[#4F765C] text-2xl block mt-1">{formatCurrency(todayEarnedAmount)}</span>
                  <span className="text-[10px] text-[#68645D] mt-1 block">{todayEarnedRecords.length} action(s) logged</span>
                </div>

                <div className="p-4 bg-[#FAF7F2] rounded-2xl border border-[#E5DFD5]">
                  <span className="text-[10px] text-[#68645D] uppercase font-extrabold block">Total Earned Wallet</span>
                  <span className="font-black text-[#245F6B] text-2xl block mt-1">{formatCurrency(totalEarnedAmount)}</span>
                  <span className="text-[10px] text-[#68645D] mt-1 block">{earnedRecords.length} payable credit(s)</span>
                </div>

                <div className="p-4 bg-[#FFF9E6] rounded-2xl border border-[#E8DCB8]">
                  <span className="text-[10px] text-[#B88728] uppercase font-extrabold block">Potential Deal Bonuses</span>
                  <span className="font-black text-[#B88728] text-2xl block mt-1">{formatCurrency(totalPotentialAmount)}</span>
                  <span className="text-[10px] text-[#91651B] mt-1 block">{potentialRecords.length} pending client close</span>
                </div>
              </div>

              {/* Action Rates Guide (Spec Alignment) */}
              <div className="p-4 bg-[#F4F1EA] rounded-2xl border border-[#DDD8CE] space-y-2">
                <div className="font-bold text-[#292A29] text-xs flex items-center justify-between">
                  <span>Task Rates & Compensation Structure</span>
                  <span className="text-[10px] text-[#68645D] font-normal">Active Studio Policy</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2.5 bg-white rounded-xl border border-[#DDD8CE]">
                    <div className="text-[#969188]">Add Lead</div>
                    <div className="font-black text-[#68645D] text-sm mt-0.5">R0.00</div>
                    <div className="text-[10px] text-[#969188]">Contact creation</div>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-[#DDD8CE]">
                    <div className="text-[#245F6B]">Add Live Link</div>
                    <div className="font-black text-[#4F765C] text-sm mt-0.5">+R1.00</div>
                    <div className="text-[10px] text-[#4F765C] font-semibold">+R50 on Deal Won</div>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-[#DDD8CE]">
                    <div className="text-[#245F6B]">Send Message</div>
                    <div className="font-black text-[#4F765C] text-sm mt-0.5">+R0.50</div>
                    <div className="text-[10px] text-[#4F765C] font-semibold">+R25 on Deal Won</div>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-[#DDD8CE]">
                    <div className="text-[#B88728]">Client Closed</div>
                    <div className="font-black text-[#B88728] text-sm mt-0.5">R75.00 Pool</div>
                    <div className="text-[10px] text-[#68645D]">Client Price R650</div>
                  </div>
                </div>
              </div>

              {/* Financial Records Ledger */}
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-[#121624] flex items-center justify-between">
                  <span>Earnings Activity Ledger ({financialRecords.length})</span>
                  <span className="text-[11px] text-[#68645D] font-normal">Cloudflare financial ledger</span>
                </h3>

                {financialRecords.length === 0 ? (
                  <div className="py-8 text-center text-[#969188] bg-[#FAF7F2] rounded-2xl border border-dashed border-[#DDD8CE]">
                    No financial actions recorded yet. Add live website links (+R1.00) or record outreach messages (+R0.50) to start earning.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1 divide-y divide-[#F0EAE0]">
                    {financialRecords.map((r) => {
                      const isEarned = r.status === 'earned';
                      const isPotential = r.status === 'potential';
                      const isReversed = r.status === 'reversed';

                      return (
                        <div key={r.id} className="pt-2.5 flex justify-between items-center text-xs">
                          <div className="min-w-0 flex-1 pr-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#121624]">{r.notes || r.action}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                isEarned
                                  ? 'bg-[#4F765C]/15 text-[#4F765C]'
                                  : isPotential
                                  ? 'bg-[#D9A441]/15 text-[#91651B]'
                                  : 'bg-[#A65B55]/15 text-[#A65B55]'
                              }`}>
                                {r.status}
                              </span>
                            </div>
                            <div className="text-[10px] text-[#68645D] mt-0.5">
                              {r.leadName || 'Lead'} • {r.timestamp ? formatDateTime(r.timestamp) : 'Recent'}
                            </div>
                          </div>
                          <span className={`font-black text-sm px-3 py-1 rounded-xl border ${
                            isEarned
                              ? 'text-[#4F765C] bg-[#4F765C]/10 border-[#4F765C]/30'
                              : isPotential
                              ? 'text-[#91651B] bg-[#D9A441]/10 border-[#D9A441]/30'
                              : 'text-[#A65B55] bg-[#A65B55]/10 border-[#A65B55]/30 line-through'
                          }`}>
                            +{formatCurrency(r.amount || 0)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
