export type DateRangePreset =
  | 'all'
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'custom';

export interface DateFilterState {
  preset: DateRangePreset;
  customFrom?: string; // YYYY-MM-DD
  customTo?: string;   // YYYY-MM-DD
}

export const DATE_RANGE_LABELS: Record<DateRangePreset, string> = {
  all: 'All Time',
  today: 'Today',
  yesterday: 'Yesterday',
  last_7_days: 'Last 7 Days',
  last_30_days: 'Last 30 Days',
  this_month: 'This Month',
  last_month: 'Last Month',
  custom: 'Custom Range'
};

/**
 * Checks if a timestamp falls within the selected date filter range.
 * All checks are done against local day boundaries.
 */
export function isWithinDateRange(
  timestamp?: string | null,
  preset: DateRangePreset = 'all',
  customFrom?: string,
  customTo?: string
): boolean {
  if (preset === 'all') return true;
  if (!timestamp) return false;

  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return false;

  const now = new Date();
  
  // Today start & end
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  switch (preset) {
    case 'today':
      return date >= startOfToday && date <= endOfToday;

    case 'yesterday': {
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      const endOfYesterday = new Date(startOfToday.getTime() - 1);
      return date >= startOfYesterday && date <= endOfYesterday;
    }

    case 'last_7_days': {
      const startOf7Days = new Date(startOfToday);
      startOf7Days.setDate(startOf7Days.getDate() - 6);
      return date >= startOf7Days && date <= endOfToday;
    }

    case 'last_30_days': {
      const startOf30Days = new Date(startOfToday);
      startOf30Days.setDate(startOf30Days.getDate() - 29);
      return date >= startOf30Days && date <= endOfToday;
    }

    case 'this_month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return date >= startOfMonth && date <= endOfToday;
    }

    case 'last_month': {
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return date >= startOfLastMonth && date <= endOfLastMonth;
    }

    case 'custom': {
      if (customFrom) {
        const fromDate = new Date(`${customFrom}T00:00:00`);
        if (!isNaN(fromDate.getTime()) && date < fromDate) {
          return false;
        }
      }
      if (customTo) {
        const toDate = new Date(`${customTo}T23:59:59.999`);
        if (!isNaN(toDate.getTime()) && date > toDate) {
          return false;
        }
      }
      return true;
    }

    default:
      return true;
  }
}
