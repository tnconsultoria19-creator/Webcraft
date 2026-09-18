import { Lead, Task } from '../types';

export function downloadLeadsCSV(leads: Lead[]) {
  const headers = [
    'Lead ID',
    'Business Name',
    'Category',
    'Stage',
    'Priority',
    'Source',
    'Owner',
    'City',
    'Province',
    'Website',
    'Created At'
  ];

  const rows = leads.map((l) => [
    l.id,
    `"${(l.name || '').replace(/"/g, '""')}"`,
    `"${(l.category || '').replace(/"/g, '""')}"`,
    l.stage,
    l.priority,
    `"${(l.source || '').replace(/"/g, '""')}"`,
    `"${(l.ownerName || 'Unassigned').replace(/"/g, '""')}"`,
    `"${(l.city || '').replace(/"/g, '""')}"`,
    `"${(l.province || '').replace(/"/g, '""')}"`,
    `"${(l.website || '').replace(/"/g, '""')}"`,
    l.createdAt
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `WebCraft_Leads_Export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function downloadTasksCSV(tasks: Task[]) {
  const headers = [
    'Task ID',
    'Lead Name',
    'Task Type',
    'Status',
    'Assigned To',
    'Rate Value (R)',
    'Started At',
    'Completed At',
    'Created At'
  ];

  const rows = tasks.map((t) => [
    t.id,
    `"${(t.leadName || '').replace(/"/g, '""')}"`,
    `"${(t.taskTypeName || '').replace(/"/g, '""')}"`,
    t.status,
    `"${(t.assignedToName || 'Unassigned').replace(/"/g, '""')}"`,
    t.rateValue || 100,
    t.startedAt || '',
    t.completedAt || '',
    t.createdAt
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `WebCraft_Tasks_Export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
