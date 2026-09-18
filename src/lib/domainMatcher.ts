/**
 * Deterministic Link-to-Client Matching Service for WebCraft Studio
 * 
 * CRITICAL ARCHITECTURAL RULES:
 * - 100% Deterministic Local TypeScript Logic ONLY
 * - ZERO AI, Gemini, OpenAI, LLM, or external matching APIs
 * - ZERO fuzzy business-name guessing or probabilistic heuristics
 * - projectDomainName (originating from ChatGPT Output 3) is the UNIQUE PRIMARY IDENTIFIER
 * - Priority hierarchy:
 *     LEVEL 1: Exact projectDomainName match (subdomain or hostname prefix)
 *     LEVEL 2: Exact match against stored live website hostname for that project
 *     LEVEL 3: Exact match against stored custom domain hostname
 *     LEVEL 4: No deterministic match -> STOP, require user manual selection
 */

import { Lead } from '../types';
import { normalizeProjectDomainName } from './chatgptPackageParser';

export interface NormalizedUrlResult {
  rawUrl: string;
  cleanUrl: string;
  hostname: string;
  subdomain: string;
  cleanSlug: string;
}

/**
 * Normalizes an input URL into standard format and extracts the project subdomain / hostname.
 * Handles:
 * - Missing protocol (adds https://)
 * - Case insensitivity (e.g. HTTPS://WWW.PSROYALTYMASSAGE.PAGES.DEV/)
 * - Leading www. removal
 * - Trailing slashes, query parameters, hash fragments
 * - Subdomain extraction for .pages.dev, .cloudflarepages.com, or custom TLDs
 */
export function normalizeInputUrl(rawInput: string): NormalizedUrlResult | null {
  if (!rawInput || typeof rawInput !== 'string') return null;
  let trimmed = rawInput.trim();
  if (!trimmed) return null;

  // Add protocol if missing
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    let hostname = parsed.hostname.toLowerCase();
    
    // Remove www.
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }

    if (!hostname) return null;

    // Path cleanup: keep path if non-root, but remove trailing slash
    let pathname = parsed.pathname;
    if (pathname === '/') {
      pathname = '';
    } else {
      pathname = pathname.replace(/\/+$/, '');
    }

    // Standardized clean URL (always https, no query/hash for root live websites)
    const cleanUrl = `https://${hostname}${pathname}`;

    // Extract project subdomain / slug
    let subdomain = '';
    if (hostname.endsWith('.pages.dev')) {
      subdomain = hostname.replace(/\.pages\.dev$/, '');
    } else if (hostname.endsWith('.cloudflarepages.com')) {
      subdomain = hostname.replace(/\.cloudflarepages\.com$/, '');
    } else if (hostname.endsWith('.vercel.app')) {
      subdomain = hostname.replace(/\.vercel\.app$/, '');
    } else if (hostname.endsWith('.netlify.app')) {
      subdomain = hostname.replace(/\.netlify\.app$/, '');
    } else {
      // Custom domain: extract first domain label if multiple labels exist
      // e.g. "psroyaltymassage.co.za" -> "psroyaltymassage"
      // "psroyaltymassage.com" -> "psroyaltymassage"
      const tldRegex = /\.(?:co\.za|com\.br|co\.uk|org\.za|net\.za|com|org|net|io|app|dev|site|online|store|tech|info|biz|co|me|af|za|ao)$/i;
      const strippedTld = hostname.replace(tldRegex, '');
      const parts = strippedTld.split('.');
      if (parts.length > 1) {
        if (/^(?:preview|test|demo|staging|live|dev|stage|client)$/i.test(parts[0])) {
          subdomain = parts[1];
        } else {
          subdomain = parts[0];
        }
      } else {
        subdomain = strippedTld;
      }
    }

    const cleanSlug = subdomain.toLowerCase().replace(/[^a-z0-9]/g, '');

    return {
      rawUrl: rawInput,
      cleanUrl,
      hostname,
      subdomain,
      cleanSlug
    };
  } catch {
    return null;
  }
}

export type MatchMethod = 'Project Domain Name' | 'Stored Live Website URL' | 'Custom Domain' | 'Manual Selection';

export interface MatchCandidate {
  lead: Lead;
  matchLevel: 1 | 2 | 3 | 4;
  matchMethod: MatchMethod;
  projectDomainName: string;
  isAlreadyAttached: boolean;
  matchDetails: string;
}

export interface MatchEvaluationResult {
  urlInfo: NormalizedUrlResult;
  status: 'single_match' | 'multiple_matches' | 'no_match';
  bestMatch: MatchCandidate | null;
  candidates: MatchCandidate[];
  isDuplicate: boolean;
}

/**
 * Deterministically matches an input URL to existing saved client/project records.
 * 
 * Rules:
 * LEVEL 1: Exact projectDomainName match (Subdomain or hostname prefix matches saved projectDomainName).
 * LEVEL 2: Exact match against an already stored live website hostname for that project.
 * LEVEL 3: Exact match against a custom domain previously saved to that project.
 * LEVEL 4: If no deterministic match exists -> DO NOT GUESS. Returns status 'no_match'.
 */
export function matchUrlToLeads(rawUrl: string, leads: Lead[]): MatchEvaluationResult | null {
  const urlInfo = normalizeInputUrl(rawUrl);
  if (!urlInfo) return null;

  const { cleanUrl, hostname, cleanSlug } = urlInfo;
  const activeLeads = leads.filter((l) => !l.deletedAt);

  // LEVEL 1: Exact projectDomainName Match
  const level1Candidates: MatchCandidate[] = [];

  for (const lead of activeLeads) {
    const rawDomain = lead.projectDomainName || lead.chatgptPackage?.projectDomainName || '';
    const storedDomain = normalizeProjectDomainName(rawDomain);
    if (!storedDomain) continue;

    // Check if the input hostname's subdomain or prefix exactly matches storedDomain
    const exactSubdomainMatch = cleanSlug === storedDomain;
    const hostnamePrefixMatch = hostname === `${storedDomain}.pages.dev` ||
                                hostname === `${storedDomain}.cloudflarepages.com` ||
                                hostname.startsWith(`${storedDomain}.`);

    if (exactSubdomainMatch || hostnamePrefixMatch) {
      const existingUrls = [lead.templateUrl, lead.previewUrl, lead.workingUrl, lead.website].filter(Boolean) as string[];
      const isAlreadyAttached = existingUrls.some((u) => {
        const norm = normalizeInputUrl(u);
        return norm && norm.cleanUrl === cleanUrl;
      });

      level1Candidates.push({
        lead,
        matchLevel: 1,
        matchMethod: 'Project Domain Name',
        projectDomainName: storedDomain,
        isAlreadyAttached,
        matchDetails: `Exact match on unique project identifier: "${storedDomain}"`
      });
    }
  }

  if (level1Candidates.length === 1) {
    const candidate = level1Candidates[0];
    return {
      urlInfo,
      status: 'single_match',
      bestMatch: candidate,
      candidates: level1Candidates,
      isDuplicate: candidate.isAlreadyAttached
    };
  }

  if (level1Candidates.length > 1) {
    return {
      urlInfo,
      status: 'multiple_matches',
      bestMatch: null,
      candidates: level1Candidates,
      isDuplicate: false
    };
  }

  // LEVEL 2: Exact match against an already stored live website hostname for that project
  const level2Candidates: MatchCandidate[] = [];

  for (const lead of activeLeads) {
    const storedLiveUrls = [lead.templateUrl, lead.previewUrl, lead.workingUrl].filter(Boolean) as string[];
    let matchedUrl = '';

    const hasStoredUrlMatch = storedLiveUrls.some((u) => {
      const norm = normalizeInputUrl(u);
      if (norm && (norm.hostname === hostname || norm.cleanUrl === cleanUrl)) {
        matchedUrl = norm.cleanUrl;
        return true;
      }
      return false;
    });

    if (hasStoredUrlMatch) {
      const pDomain = normalizeProjectDomainName(lead.projectDomainName || lead.chatgptPackage?.projectDomainName || lead.name);
      level2Candidates.push({
        lead,
        matchLevel: 2,
        matchMethod: 'Stored Live Website URL',
        projectDomainName: pDomain,
        isAlreadyAttached: true,
        matchDetails: `Matched recorded project website URL: "${matchedUrl}"`
      });
    }
  }

  if (level2Candidates.length === 1) {
    const candidate = level2Candidates[0];
    return {
      urlInfo,
      status: 'single_match',
      bestMatch: candidate,
      candidates: level2Candidates,
      isDuplicate: true
    };
  }

  if (level2Candidates.length > 1) {
    return {
      urlInfo,
      status: 'multiple_matches',
      bestMatch: null,
      candidates: level2Candidates,
      isDuplicate: false
    };
  }

  // LEVEL 3: Exact match against a custom domain previously saved to that project
  const level3Candidates: MatchCandidate[] = [];

  for (const lead of activeLeads) {
    if (!lead.website) continue;
    const normCustom = normalizeInputUrl(lead.website);
    if (normCustom && normCustom.hostname === hostname) {
      const pDomain = normalizeProjectDomainName(lead.projectDomainName || lead.chatgptPackage?.projectDomainName || lead.name);
      level3Candidates.push({
        lead,
        matchLevel: 3,
        matchMethod: 'Custom Domain',
        projectDomainName: pDomain,
        isAlreadyAttached: false,
        matchDetails: `Matched registered custom domain: "${normCustom.hostname}"`
      });
    }
  }

  if (level3Candidates.length === 1) {
    const candidate = level3Candidates[0];
    return {
      urlInfo,
      status: 'single_match',
      bestMatch: candidate,
      candidates: level3Candidates,
      isDuplicate: false
    };
  }

  if (level3Candidates.length > 1) {
    return {
      urlInfo,
      status: 'multiple_matches',
      bestMatch: null,
      candidates: level3Candidates,
      isDuplicate: false
    };
  }

  // LEVEL 4: No deterministic match exists -> DO NOT GUESS.
  return {
    urlInfo,
    status: 'no_match',
    bestMatch: null,
    candidates: [],
    isDuplicate: false
  };
}
