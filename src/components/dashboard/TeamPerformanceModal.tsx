import React, { useState, useEffect } from 'react';
import { X, Users, Download, AlertCircle } from 'lucide-react';
import { User, Task, FinancialRecord } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { subscribeToUsers, subscribeToTasks, subscribeToFinancialRecords } from '../../lib/firestoreService';
import { downloadTasksCSV } from '../../lib/exportUtils';
import { CORE_TEAM_USERS } from '../admin/AdminSettingsModal';

interface TeamPerformanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeamPerformanceModal: React.FC<TeamPerformanceModalProps> = ({
  isOpen,
  onClose
}) => {
  const [users, setUsers] = useState<User[]>(CORE_TEAM_USERS);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    const loadInitialData = async () => {
      setIsLoading(true);
      setLoadError('');

      const fetchJson = async <T,>(url: string): Promise<T> => {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 10000);

        try {
          const response = await fetch(url, { signal: controller.signal });
          if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(
              (errorBody as any)?.error || `Request failed: ${response.status}`
            );
          }
          return await response.json() as T;
        } finally {
          window.clearTimeout(timeoutId);
        }
      };

      const [usersResult, tasksResult, financeResult] = await Promise.allSettled([
        fetchJson<User[]>('/api/users'),
        fetchJson<Task[]>('/api/tasks'),
        fetchJson<FinancialRecord[]>('/api/financial-records')
      ]);

      if (!mounted) return;

      const errors: string[] = [];

      if (usersResult.status === 'fulfilled' && Array.isArray(usersResult.value)) {
        setUsers((prev) => {
          const list = [...usersResult.value];
          for (const core of CORE_TEAM_USERS) {
            const coreEmailLower = String(core.email || '').toLowerCase();
            if (!list.some(
              (u) => {
                const uEmailLower = String(u.email || '').toLowerCase();
                return (uEmailLower !== '' && uEmailLower === coreEmailLower) || u.id === core.id;
              }
            )) {
              list.push(core);
            }
          }
          return list;
        });
      } else if (usersResult.status === 'rejected') {
        errors.push('team members');
      }

      if (tasksResult.status === 'fulfilled' && Array.isArray(tasksResult.value)) {
        setTasks(tasksResult.value);
      } else if (tasksResult.status === 'rejected') {
        errors.push('tasks');
      }

      if (financeResult.status === 'fulfilled' && Array.isArray(financeResult.value)) {
        setFinancialRecords(financeResult.value);
      } else if (financeResult.status === 'rejected') {
        errors.push('financial records');
      }

      setIsLoading(false);

      if (errors.length > 0) {
        setLoadError(
          `Some team performance data could not be loaded: ${errors.join(', ')}.`
        );
      }
    };

    void loadInitialData();

    const unsubUsers = subscribeToUsers((uList) => {
      if (!mounted || !Array.isArray(uList) || uList.length === 0) return;

      setUsers((prev) => {
        const list = [...uList];
        for (const core of CORE_TEAM_USERS) {
          const coreEmailLower = String(core.email || '').toLowerCase();
          if (!list.some(
            (u) => {
              const uEmailLower = String(u.email || '').toLowerCase();
              return (uEmailLower !== '' && uEmailLower === coreEmailLower) || u.id === core.id;
            }
          )) {
            list.push(core);
          }
        }
        return list;
      });
    });

    const unsubTasks = subscribeToTasks((tList) => {
      if (!mounted || !Array.isArray(tList)) return;
      setTasks(tList);
      setIsLoading(false);
    });

    const unsubFinance = subscribeToFinancialRecords((records) => {
      if (!mounted || !Array.isArray(records)) return;
      setFinancialRecords(records);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      unsubUsers();
      unsubTasks();
      unsubFinance();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Build team performance map from users, tasks, and real financial records
  const teamStats = users.map((u) => {
    const uEmailLower = String(u.email || '').toLowerCase();
    const uId = String(u.id || '');
    const userRecords = financialRecords.filter((r) => {
      const rUserId = String(r.userId || '');
      const rUserEmail = String((r as any).userEmail || '');
      return (
        (uId !== '' && rUserId === uId) ||
        (uEmailLower !== '' && rUserId.toLowerCase() === uEmailLower) ||
        (uEmailLower !== '' && rUserEmail.toLowerCase() === uEmailLower)
      );
    });
    const earnedRecords = userRecords.filter((r) => r.status === 'earned');
    const potentialRecords = userRecords.filter((r) => r.status === 'potential');

    const totalEarned = earnedRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
    const totalPotential = potentialRecords.reduce((sum, r) => sum + (r.amount || 0), 0);

    const linksCreatedCount = earnedRecords.filter((r) => r.action === 'LINK_CREATED').length;
    const messagesSentCount = earnedRecords.filter((r) => r.action === 'MESSAGE_SENT').length;
    const dealBonusCount = earnedRecords.filter(
      (r) => r.action === 'LINK_SUCCESS_BONUS' || r.action === 'MESSAGE_SUCCESS_BONUS'
    ).length;

    const userCompletedTasks = tasks.filter((t) => {
      const assignedTo = String(t.assignedTo || '');
      const createdBy = String(t.createdBy || '');
      return (
        ((uId !== '' && assignedTo === uId) ||
          (uId !== '' && createdBy === uId) ||
          (uEmailLower !== '' && assignedTo.toLowerCase() === uEmailLower)) &&
        t.status === 'completed'
      );
    });

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
            <div className="py-8 text-center text-[#68645D] font-bold animate-pulse">
              Loading team performance data...
            </div>
          ) : (
            <>
              {loadError && (
                <div className="mb-4 flex items-start gap-2 rounded-2xl border border-[#E8DCB8] bg-[#FFF9E6] px-4 py-3 text-[11px] text-[#91651B]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{loadError} The available data is still shown below and will continue refreshing.</span>
                </div>
              )}

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
            </>
          )}
        </div>

      </div>
    </div>
  );
};
