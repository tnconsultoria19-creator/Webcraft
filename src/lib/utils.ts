import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDate(dateString?: string): string {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString?: string): string {
  if (!dateString) return 'Date unavailable';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Date unavailable';
    const day = d.getDate();
    const month = d.toLocaleDateString('en-ZA', { month: 'short' });
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} • ${hours}:${minutes}`;
  } catch {
    return 'Date unavailable';
  }
}

export function formatTimeAgo(dateString?: string): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString).getTime();
    const now = Date.now();
    const diffSec = Math.floor((now - d) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    return `${Math.floor(diffSec / 86400)}d ago`;
  } catch {
    return dateString;
  }
}

/**
 * Cleans and sanitizes any raw URL string:
 * - Unwraps markdown [title](url) links and bracketed text
 * - Extracts direct target URLs from Google search/redirect queries (e.g. google.com/search?q=https%3A%2F%2F...)
 * - Strips corrupted Facebook tracking parameters (__cft__, __tn__, fbclid)
 * - Normalizes protocol to https://
 */
export function cleanUrl(url?: string | null): string {
  if (!url) return '';
  let str = String(url).trim();
  if (!str || str === '#') return '';

  // 1. If wrapped in markdown [label](target)
  const mdMatch = str.match(/\[(.*?)\]\((https?:\/\/[^\s\)]+)\)/i);
  if (mdMatch) {
    const label = mdMatch[1].trim();
    const target = mdMatch[2].trim();
    // If the label contains an actual destination URL (like facebook.com or gumtree.co.za) while target is a search query
    if (/https?:\/\//i.test(label) && (target.includes('google.com/search') || target.includes('google.com/url'))) {
      str = label;
    } else {
      str = target;
    }
  } else {
    // Check if bracketed like [https://facebook.com/...]
    const bracketHttp = str.match(/(https?:\/\/[^\s\]\)\>\"\']+)/i);
    if (bracketHttp && (str.startsWith('[') || str.startsWith('(') || str.startsWith('<') || str.startsWith('"') || str.startsWith("'"))) {
      str = bracketHttp[1];
    }
  }

  // 2. Strip leading/trailing brackets, quotes, angle brackets, whitespace, and dangling markdown syntax
  str = str.replace(/^[\[\(\<"'\s]+|[\]\)\>"'\s]+$/g, '').trim();
  if (!str || str === '#') return '';

  // 3. Unwrap Google search/redirect URLs (e.g., google.com/search?q=https%3A%2F%2F... or /url?q=https%3A%2F%2F...)
  if (str.includes('google.') && (str.includes('search?') || str.includes('url?'))) {
    try {
      const parsedUrl = new URL(str.startsWith('http') ? str : `https://${str}`);
      const qParam = parsedUrl.searchParams.get('q') || parsedUrl.searchParams.get('url');
      if (qParam && /^https?:\/\//i.test(qParam)) {
        str = decodeURIComponent(qParam);
      } else if (qParam && (qParam.includes('facebook.com') || qParam.includes('gumtree') || qParam.includes('instagram.com') || qParam.includes('.'))) {
        str = decodeURIComponent(qParam);
      }
    } catch {
      // Fallback regex extraction for search query
      const matchQ = str.match(/[?&](?:q|url)=(https?%3A%2F%2F[^\s&]+)/i);
      if (matchQ) {
        try {
          str = decodeURIComponent(matchQ[1]);
        } catch {
          // ignore
        }
      }
    }
  }

  // Strip again if unwrapping exposed brackets
  str = str.replace(/^[\[\(\<"'\s]+|[\]\)\>"'\s]+$/g, '').trim();

  // 4. Clean Facebook tracking parameters that break when copied from groups (__cft__, __tn__, fbclid)
  if (str.includes('facebook.com')) {
    // If it's a group member or profile URL with ?__cft__[0]=... or ?__cft...
    str = str.replace(/([?&])__cft.*$/i, '');
    str = str.replace(/([?&])__tn__.*$/i, '');
    str = str.replace(/([?&])fbclid=.*$/i, '');
    // Clean trailing ? or &
    str = str.replace(/[?&]$/, '');
  }

  // 5. Normalize scheme
  if (/^https?:\/\//i.test(str)) {
    return str;
  }

  if (str.startsWith('//')) {
    return `https:${str}`;
  }

  // Handle tel: and mailto: protocols
  if (/^(tel:|mailto:|sms:|wa\.me\/)/i.test(str)) {
    return str;
  }

  return `https://${str}`;
}

export function formatExternalUrl(url?: string | null): string {
  const cleaned = cleanUrl(url);
  return cleaned || '#';
}

export const STAGE_SEQUENCE = [
  'captured',
  'template_in_progress',
  'ready_for_outreach',
  'outreach_sent',
  'response_received',
  'interested',
  'won'
] as const;

export function getNextStage(currentStage: string): string | null {
  // Normalize variations
  let normalized = currentStage;
  if (currentStage === 'new_lead') normalized = 'captured';
  if (currentStage === 'template_completed') normalized = 'ready_for_outreach';
  if (currentStage === 'outreach_in_progress') normalized = 'outreach_sent';
  if (currentStage === 'awaiting_response') normalized = 'response_received';
  if (currentStage === 'negotiation') normalized = 'interested';
  if (currentStage === 'website_production' || currentStage === 'completed') normalized = 'won';

  const index = STAGE_SEQUENCE.indexOf(normalized as any);
  if (index >= 0 && index < STAGE_SEQUENCE.length - 1) {
    return STAGE_SEQUENCE[index + 1];
  }
  return null;
}

export function getPreviousStage(currentStage: string): string | null {
  let normalized = currentStage;
  if (currentStage === 'new_lead') normalized = 'captured';
  if (currentStage === 'template_completed') normalized = 'ready_for_outreach';
  if (currentStage === 'outreach_in_progress') normalized = 'outreach_sent';
  if (currentStage === 'awaiting_response') normalized = 'response_received';
  if (currentStage === 'negotiation') normalized = 'interested';
  if (currentStage === 'website_production' || currentStage === 'completed') normalized = 'won';

  const index = STAGE_SEQUENCE.indexOf(normalized as any);
  if (index > 0) {
    return STAGE_SEQUENCE[index - 1];
  }
  return null;
}

export function getStageLabel(stage: string): string {
  const map: Record<string, string> = {
    new_lead: 'New Lead',
    captured: 'Captured',
    template_pending: 'Template Pending',
    template_in_progress: 'Template In Progress',
    template_completed: 'Template Completed',
    ready_for_outreach: 'Ready for Outreach',
    outreach_in_progress: 'Outreach In Progress',
    outreach_sent: 'Outreach Sent',
    awaiting_response: 'Awaiting Response',
    response_received: 'Response Received',
    interested: 'Interested',
    negotiation: 'Negotiation',
    won: 'Won / Client',
    website_production: 'Website Production',
    completed: 'Completed',
    lost: 'Lost',
    not_interested: 'Not Interested',
    do_not_contact: 'Do Not Contact'
  };
  return map[stage] || stage;
}

export function getStageBadgeColor(stage: string): string {
  switch (stage) {
    case 'captured':
    case 'new_lead':
      return 'bg-slate-100 text-[#11223F] border-slate-300 font-bold';
    case 'template_in_progress':
    case 'template_pending':
      return 'bg-amber-50 text-[#FF8A00] border-amber-200 font-bold';
    case 'template_completed':
    case 'ready_for_outreach':
      return 'bg-[#11223F] text-[#FF8A00] border-[#11223F] font-bold';
    case 'outreach_sent':
    case 'outreach_in_progress':
      return 'bg-slate-800 text-white border-slate-700 font-bold';
    case 'response_received':
    case 'awaiting_response':
      return 'bg-amber-100 text-[#11223F] border-amber-300 font-bold';
    case 'interested':
    case 'negotiation':
      return 'bg-[#FF8A00] text-white border-[#FF8A00] font-bold';
    case 'won':
    case 'website_production':
    case 'completed':
      return 'bg-[#11223F] text-white border-[#11223F] font-bold';
    case 'lost':
    case 'not_interested':
    case 'do_not_contact':
      return 'bg-slate-200 text-slate-700 border-slate-300 font-bold';
    default:
      return 'bg-slate-100 text-[#11223F] border-slate-300 font-bold';
  }
}
