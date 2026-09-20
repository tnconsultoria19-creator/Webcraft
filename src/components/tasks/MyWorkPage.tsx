import React, { useState, useEffect } from 'react';
import {
  Layers,
  DollarSign,
  Check,
  Clock,
  ShieldAlert,
  Zap,
  Play,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Task, User } from '../../types';
import { formatCurrency } from '../../lib/utils';
import {
  grabTaskAtomic,
  completeTaskAtomic,
  adminOverrideTask
} from '../../lib/firestoreService';

interface MyWorkPageProps {
  currentUser: User;
  tasks: Task[];
  onSelectLead: (leadId: string) => void;
  onWorkUpdated: () => void;
  viewingAsUser?: User | null;
}

export const MyWorkPage: React.FC<MyWorkPageProps> = ({
  currentUser,
  tasks,
  onSelectLead,
  onWorkUpdated,
  viewingAsUser
}) => {
  const [isLoading] = useState(false);
  const [grabLoadingId, setGrabLoadingId] = useState<string | null>(null);
  const [completeLoadingId, setCompleteLoadingId] = useState<string | null>(null);
  const [completeNotes, setCompleteNotes] = useState<Record<string, string>>({});
  const [templateUrls, setTemplateUrls] = useState<Record<string, string>>({});

  // Admin Override Modal State
  const [overrideTask, setOverrideTask] = useState<Task | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideStatus, setOverrideStatus] = useState<Task['status']>('available');
  const [isOverriding, setIsOverriding] = useState(false);

  const activeUser = viewingAsUser || currentUser;



  const handleGrabTask = async (taskId: string) => {
    setGrabLoadingId(taskId);
    try {
      const res = await grabTaskAtomic(taskId, currentUser.id, currentUser.displayName);
      if (!res.success) {
        alert(res.message);
      } else {
        onWorkUpdated();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to grab task');
    } finally {
      setGrabLoadingId(null);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    setCompleteLoadingId(taskId);
    try {
      const notes = completeNotes[taskId] || '';
      const templateUrl = templateUrls[taskId] || '';
      const res = await completeTaskAtomic(
        taskId,
        currentUser.id,
        currentUser.displayName,
        notes,
        templateUrl
      );

      if (!res.success) {
        alert(res.message);
      } else {
        onWorkUpdated();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to complete task');
    } finally {
      setCompleteLoadingId(null);
    }
  };

  const handleExecuteAdminOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideTask || !overrideReason.trim()) {
      alert('A valid reason is required for audit logs when executing an admin override.');
      return;
    }

    setIsOverriding(true);
    try {
      await adminOverrideTask(
        currentUser,
        overrideTask.id,
        { status: overrideStatus },
        overrideReason.trim()
      );
      alert('Admin override recorded in audit log!');
      setOverrideTask(null);
      setOverrideReason('');
      onWorkUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to override task');
    } finally {
      setIsOverriding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-[#68645D] font-semibold text-sm">
        Loading Tasks & Workload...
      </div>
    );
  }

  // Filter tasks based on active user
  const availableTasks = tasks.filter((t) => t.status === 'available');
  const myActiveTasks = tasks.filter(
    (t) => (t.assignedTo === activeUser.id || t.createdBy === activeUser.id) && t.status === 'in_progress'
  );
  const myCompletedTasks = tasks.filter(
    (t) => (t.assignedTo === activeUser.id || t.createdBy === activeUser.id) && t.status === 'completed'
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const todayTasks = myCompletedTasks.filter((t) => t.completedAt && t.completedAt.startsWith(todayStr));
  const todayEarnings = todayTasks.reduce((acc, t) => acc + (t.rateValue ?? 0), 0);
  const totalEarnings = myCompletedTasks.reduce((acc, t) => acc + (t.rateValue ?? 0), 0);

  return (
    <div className="space-y-6 font-['Poppins'] text-[#68645D] pb-12">
      
      {/* Admin View Banner */}
      {viewingAsUser && (
        <div className="bg-[#245F6B] text-white font-semibold px-5 py-3 rounded-2xl flex items-center justify-between text-xs shadow-xs">
          <span className="flex items-center gap-2">
            <Zap className="w-4 h-4 fill-white" />
            ADMIN OVERRIDE VIEW — Workspace for: <strong>{viewingAsUser.displayName} ({viewingAsUser.email})</strong>
          </span>
        </div>
      )}

      {/* Summary Cards matching Gymove style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="bg-[#245F6B] text-white p-6 rounded-2xl shadow-lg shadow-[#245F6B]/25 flex items-center justify-between">
          <div>
            <span className="text-xs text-[#D9A441] font-bold uppercase tracking-wider block">Today's Earnings</span>
            <div className="text-3xl font-extrabold text-white mt-1 ">{formatCurrency(todayEarnings)}</div>
            <span className="text-[11px] text-white/80 font-medium">{todayTasks.length} task(s) completed today</span>
          </div>
          <div className="p-3 bg-white/15 text-white rounded-2xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#DDD8CE] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#68645D] font-bold uppercase tracking-wider block">In-Progress Tasks</span>
            <div className="text-3xl font-extrabold text-[#292A29] mt-1">{myActiveTasks.length}</div>
            <span className="text-[11px] text-[#68645D] font-medium">Claimed & working</span>
          </div>
          <div className="p-3 bg-[#E5EEEE] text-[#245F6B] rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#DDD8CE] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-[#68645D] font-bold uppercase tracking-wider block">Total Accumulated</span>
            <div className="text-3xl font-extrabold text-[#4F765C] mt-1 ">{formatCurrency(totalEarnings)}</div>
            <span className="text-[11px] text-[#68645D] font-medium">{myCompletedTasks.length} total tasks finished</span>
          </div>
          <div className="p-3 bg-[#4F765C]/10 text-[#4F765C] rounded-2xl">
            <Check className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* Section 1: Active Claimed Tasks */}
      <div className="bg-white p-6 rounded-2xl border border-[#DDD8CE] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#DDD8CE]">
          <div>
            <h2 className="font-bold text-base text-[#292A29]">My Active In-Progress Tasks ({myActiveTasks.length})</h2>
            <p className="text-xs text-[#68645D]">Tasks assigned to you. Complete to earn compensation.</p>
          </div>
        </div>

        {myActiveTasks.length === 0 ? (
          <div className="py-8 text-center text-[#68645D] text-xs">
            No active tasks in progress. Grab an available task from the queue below.
          </div>
        ) : (
          <div className="space-y-4">
            {myActiveTasks.map((task) => (
              <div key={task.id} className="p-5 bg-[#F0EDE5] rounded-2xl border border-[#DDD8CE] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#292A29] text-sm block">{task.taskTypeName}</span>
                    <button
                      onClick={() => task.leadId && onSelectLead(task.leadId)}
                      className="text-xs text-[#245F6B] font-semibold hover:underline mt-0.5 block"
                    >
                      Lead: {task.leadName}
                    </button>
                  </div>
                  <span className="text-xs font-bold text-[#4F765C] bg-[#4F765C]/10 px-3 py-1 rounded-full">
                    +{formatCurrency(task.rateValue ?? 0)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {task.taskTypeKey === 'template' && (
                    <input
                      type="url"
                      placeholder="Template Prototype URL..."
                      value={templateUrls[task.id] || ''}
                      onChange={(e) => setTemplateUrls({ ...templateUrls, [task.id]: e.target.value })}
                      className="bg-white border border-[#DDD8CE] rounded-xl px-3.5 py-2 text-xs text-[#292A29] focus:outline-none focus:border-[#245F6B]"
                    />
                  )}
                  <input
                    type="text"
                    placeholder="Work completion notes..."
                    value={completeNotes[task.id] || ''}
                    onChange={(e) => setCompleteNotes({ ...completeNotes, [task.id]: e.target.value })}
                    className="bg-white border border-[#DDD8CE] rounded-xl px-3.5 py-2 text-xs text-[#292A29] focus:outline-none focus:border-[#245F6B]"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  {currentUser.role === 'admin' && (
                    <button
                      onClick={() => setOverrideTask(task)}
                      className="text-[#D9A441] hover:text-[#e5a90f] font-semibold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>Admin Override</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleCompleteTask(task.id)}
                    disabled={completeLoadingId === task.id}
                    className="ml-auto px-5 py-2 bg-[#4F765C] hover:bg-[#239e46] text-white font-bold rounded-full text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {completeLoadingId === task.id ? 'Completing...' : 'Mark Complete & Claim Earnings'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Available Task Queue */}
      <div className="bg-white p-6 rounded-2xl border border-[#DDD8CE] shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#DDD8CE]">
          <div>
            <h2 className="font-bold text-base text-[#292A29]">Available Task Queue ({availableTasks.length})</h2>
            <p className="text-xs text-[#68645D]">Atomic concurrency enabled. Grab available tasks to work.</p>
          </div>
        </div>

        {availableTasks.length === 0 ? (
          <div className="py-8 text-center text-[#68645D] text-xs">
            No tasks currently available in queue.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableTasks.map((task) => (
              <div key={task.id} className="p-5 bg-[#F0EDE5] rounded-2xl border border-[#DDD8CE] space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#292A29]">{task.taskTypeName}</span>
                    <span className="font-bold text-xs text-[#4F765C] bg-[#4F765C]/10 px-2.5 py-0.5 rounded-full">
                      +{formatCurrency(task.rateValue ?? 0)}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-[#245F6B] mt-1">{task.leadName}</div>
                  <div className="text-[11px] text-[#68645D] mt-0.5">Created by: {task.createdByName || 'System'}</div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#DDD8CE]">
                  <button
                    onClick={() => task.leadId && onSelectLead(task.leadId)}
                    className="text-xs text-[#68645D] hover:text-[#245F6B] font-medium underline cursor-pointer"
                  >
                    View Lead
                  </button>

                  <button
                    onClick={() => handleGrabTask(task.id)}
                    disabled={grabLoadingId === task.id}
                    className="px-4 py-1.5 bg-[#245F6B] hover:bg-[#1E505A] text-white font-bold rounded-full text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
                  >
                    {grabLoadingId === task.id ? 'Grabbing...' : 'GRAB TASK'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admin Override Modal */}
      {overrideTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/45 backdrop-blur-xs font-['Poppins']">
          <div className="bg-white border border-[#DDD8CE] rounded-3xl shadow-2xl max-w-2xl w-full p-8 text-[#292A29] space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-[#DDD8CE]">
              <h3 className="font-bold text-base text-[#292A29] flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#D9A441]" />
                Admin Task Override
              </h3>
              <button onClick={() => setOverrideTask(null)} className="text-[#969188] hover:text-[#292A29]">
                ✕
              </button>
            </div>

            <p className="text-xs text-[#68645D]">
              You are overriding status for task: <strong>{overrideTask.taskTypeName}</strong> ({overrideTask.leadName}).
            </p>

            <form onSubmit={handleExecuteAdminOverride} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#292A29] mb-1">Set New Task Status</label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value as any)}
                  className="w-full bg-[#F0EDE5] border border-[#DDD8CE] rounded-xl px-3 py-2 text-xs text-[#292A29]"
                >
                  <option value="available">Available (Reopen Task)</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#292A29] mb-1">Audit Reason (Mandatory)</label>
                <textarea
                  required
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="State why this override is being performed..."
                  className="w-full bg-[#F0EDE5] border border-[#DDD8CE] rounded-xl p-3 text-xs text-[#292A29] h-20 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOverrideTask(null)}
                  className="px-4 py-2 bg-[#F0EDE5] hover:bg-[#e9ecef] text-[#68645D] font-semibold rounded-full text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isOverriding}
                  className="px-5 py-2 bg-[#245F6B] hover:bg-[#1E505A] text-white font-bold rounded-full text-xs cursor-pointer disabled:opacity-50"
                >
                  {isOverriding ? 'Saving...' : 'Execute Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
