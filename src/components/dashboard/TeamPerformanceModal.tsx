import React, { useState, useEffect } from 'react';
import { X, Users, DollarSign, Shield, Download } from 'lucide-react';
import { User, Task, FinancialRecord } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { subscribeToUsers, subscribeToTasks, subscribeToFinancialRecords } from '../../lib/firestoreService';
import { downloadTasksCSV } from '../../lib/exportUtils';

interface TeamPerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeamPerformanceModal: React.FC<TeamPerformanceModalProps> = ({
  isOpen,
  onClose
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const unsubUsers = subscribeToUsers((uList) => {
      setUsers(uList);
    });

    const unsubTasks = subscribeToTasks((tList) => {
      setTasks(tList);
    });

    const unsubFinance = subscribeToFinancialRecords((records) => {
      setFinancialRecords(records);
      setIsLoading(false);
    });

    return () => {
      unsubUsers();
      unsubTasks();
      unsubFinance();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Build team performance map from users, tasks, and real financial records
  const teamStats = users.map((u) => {
    const userRecords = financialRecords.filter((r) => r.userId === u.id);
    const earnedRecords = userRecords.filter((r) => r.status === 'earned');
    const potentialRecords = userRecords.filter((r) => r.status === 'potential');

    const totalEarned = earnedRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalPotential = potentialRecords.reduce((sum, r) => sum + (r.amount || 0), 0);

    const linksCreatedCount = earnedRecords.filter((r) => r.action === 'LINK_CREATED').length;
    const messagesSentCount = earnedRecords.filter((r) => r.action === 'MESSAGE_SENT').length;
    const dealBonusCount = earnedRecords.filter((r) => r.action === 'LINK_SUCCESS_BONUS' || r.action === 'MESSAGE_SUCCESS_BONUS').length;

    const userCompletedTasks = tasks.filter(
      (t) => (t.assignedTo === u.id || t.createdBy === u.id) && t.status === 'completed'
    );

    return {
      user: u,
      linksCreatedCount,
      messagesSentCount,
      dealBonusCount,
      totalEarned,
      totalPotential,
      totalTasks: userCompletedTasks.length
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/45 backdrop-blur-xs font-['Poppins']">
      <div className="bg-white border border-[#DDD8CE] rounded-3xl shadow-2xl max-w-5xl xl:max-w-6xl w-full text-[#292A29] overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 bg-[#FAF7F2] border-b border-[#E5DFD5]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#245F6B]/15 border border-[#245F6B]/30 rounded-2xl text-[#245F6B]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-[#121624]">Team Task Performance & Earnings Audit</h2>
              <p className="text-xs text-[#68645D]">Real-time team completed actions and compensation breakdown</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => downloadTasksCSV(tasks)}
              className="px-3.5 py-1.5 bg-[#245F6B] hover:bg-[#1E505A] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Export task records to CSV"
            >
              <Download className="w-3.5 h-3.5" />
              Export Tasks CSV
            </button>

            <button onClick={onClose} className="text-[#969188] hover:text-[#11223F] p-1.5 rounded-full hover:bg-[#F0EDE5] cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="p-6 overflow-x-auto text-xs">
          {isLoading ? (
            <div className="py-8 text-center text-[#68645D] font-bold animate-pulse">Loading team performance data...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF7F2] border-b border-[#E5DFD5] text-[#68645D] uppercase text-[10px] tracking-wider font-extrabold">
                  <th className="py-3 px-4">Team Member</th>
                  <th className="py-3 px-4 text-center">Links Created (+R1)</th>
                  <th className="py-3 px-4 text-center">Messages Sent (+R0.50)</th>
                  <th className="py-3 px-4 text-center">Deal Bonuses</th>
                  <th className="py-3 px-4 text-center font-extrabold text-[#D9A441]">Potential Bonuses</th>
                  <th className="py-3 px-4 text-right font-extrabold text-[#4F765C]">Earned Wallet</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EAE0]">
                {teamStats.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#969188]">
                      No team members found.
                    </td>
                  </tr>
                ) : (
                  teamStats.map((item) => (
                    <tr key={item.user.id} className="hover:bg-[#FAF7F2] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={item.user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                            alt={item.user.displayName}
                            className="w-7 h-7 rounded-full object-cover border border-[#DDD8CE]"
                          />
                          <div>
                            <div className="font-bold text-[#121624]">{item.user.displayName}</div>
                            <div className="text-[10px] text-[#245F6B] uppercase font-bold">{item.user.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center font-medium text-slate-700">{item.linksCreatedCount}</td>
                      <td className="py-3 px-4 text-center font-medium text-slate-700">{item.messagesSentCount}</td>
                      <td className="py-3 px-4 text-center font-medium text-slate-700">{item.dealBonusCount}</td>
                      <td className="py-3 px-4 text-center font-bold text-[#91651B]">
                        {formatCurrency(item.totalPotential)}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-[#4F765C] text-sm">
                        {formatCurrency(item.totalEarned)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
};
