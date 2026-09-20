import { Lead, ContactMethod } from '../types';
import { normalizeProjectDomainName } from './chatgptPackageParser';

/**
 * Normalizes any text string for flexible, accent-insensitive, case-insensitive search
 */
export function normalizeTextForSearch(text?: string | null): string {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics / accents (e.g. é -> e, ã -> a)
    .toLowerCase()
    .replace(/[^\w\s@.]/g, ' ') // replace special punctuation with spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalizes business names for duplicate detection (removes corporate suffixes, accents, punctuation)
 */
export function normalizeBusinessName(name?: string | null): string {
  if (!name) return '';
  let clean = normalizeTextForSearch(name);
  // Remove common legal/corporate suffixes
  clean = clean.replace(
    /\b(lda|limitada|pty|ltd|proprietary limited|inc|incorporated|llc|cc|sa|s\.a\.|corp|corporation|gmbh|eirl|co|company)\b/gi,
    ''
  );
  return clean.replace(/\s+/g, ' ').trim();
}

/**
 * Normalizes phone number by stripping all non-digit characters
 */
export function normalizePhoneDigits(phone?: string | null): string {
  if (!phone) return '';
  return phone.toString().replace(/\D/g, '');
}

/**
 * Normalizes email address
 */
export function normalizeEmailStr(email?: string | null): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Normalizes website domain (stripping protocol, www, parameters, and trailing slash)
 */
export function normalizeWebsiteUrl(url?: string | null): string {
  if (!url) return '';
  return url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    .split('?')[0]
    .trim();
}

/**
 * Extracts multiple normalized phone number variants to account for country codes,
 * leading zeros, spaces every 3 numbers, and local dialing conventions.
 * 
 * Supports:
 * - Angola (+244 923 456 789, 923 456 789, 923456789, 0923...)
 * - South Africa (+27 82 123 4567, 082 123 4567, 82 123 4567, 0821234567)
 * - USA/Canada (+1 555 123 4567, 555-123-4567)
 * - Portugal (+351 912 345 678), Mozambique (+258 84 123 4567), Brazil, UK, etc.
 */
export function getPhoneSignificantVariants(rawPhone?: string | null): string[] {
  if (!rawPhone) return [];
  const digits = normalizePhoneDigits(rawPhone);
  if (!digits || digits.length < 3) return digits ? [digits] : [];

  const variants = new Set<string>();
  variants.add(digits);

  // 1. Strip leading international 00
  let stripped = digits;
  if (stripped.startsWith('00')) {
    stripped = stripped.slice(2);
    variants.add(stripped);
  }

  // 2. Strip standard country codes if present at the start
  const countryPrefixes = [
    { code: '244', minRemaining: 9 }, // Angola (9 digits)
    { code: '27', minRemaining: 9 },  // South Africa (9 digits)
    { code: '351', minRemaining: 9 }, // Portugal
    { code: '258', minRemaining: 9 }, // Mozambique
    { code: '55', minRemaining: 10 }, // Brazil
    { code: '44', minRemaining: 10 }, // UK
    { code: '1', minRemaining: 10 },  // USA/Canada
    { code: '264', minRemaining: 8 }, // Namibia
    { code: '267', minRemaining: 7 }, // Botswana
    { code: '263', minRemaining: 9 }  // Zimbabwe
  ];

  for (const cp of countryPrefixes) {
    if (stripped.startsWith(cp.code) && stripped.length >= cp.code.length + cp.minRemaining) {
      const core = stripped.slice(cp.code.length);
      variants.add(core);
      if (core.startsWith('0')) {
        variants.add(core.slice(1));
      }
    }
  }

  // 3. Strip leading 0 (e.g. South African 082... -> 82...)
  if (digits.startsWith('0') && digits.length >= 7) {
    variants.add(digits.slice(1));
  }

  // 4. Significant suffixes (last 9, 8, 7 digits)
  if (digits.length >= 9) variants.add(digits.slice(-9));
  if (digits.length >= 8) variants.add(digits.slice(-8));
  if (digits.length >= 7) variants.add(digits.slice(-7));

  return Array.from(variants).filter((v) => v.length >= 3);
}

/**
 * Checks if two phone numbers match, accounting for any spacing, formatting,
 * country prefixes (+244, +27, +1, etc.), or leading zeros.
 */
export function arePhoneNumbersMatching(phoneA: string, phoneB: string): boolean {
  if (!phoneA || !phoneB) return false;

  const digitsA = normalizePhoneDigits(phoneA);
  const digitsB = normalizePhoneDigits(phoneB);
  if (!digitsA || !digitsB) return false;

  // Exact digits match
  if (digitsA === digitsB) return true;

  const variantsA = getPhoneSignificantVariants(phoneA);
  const variantsB = getPhoneSignificantVariants(phoneB);

  // Check if any significant national variant (length >= 7) matches
  for (const va of variantsA) {
    if (va.length >= 7 && variantsB.includes(va)) {
      return true;
    }
  }

  // Substring containment for digits if one is fully contained in another (min 7 digits)
  if (digitsA.length >= 7 && digitsB.length >= 7) {
    if (digitsA.endsWith(digitsB) || digitsB.endsWith(digitsA)) return true;
  }

  return false;
}

/**
 * Extracts all phone numbers from a lead's contacts, channels, notes, and descriptions
 */
export function extractAllPhonesFromLead(lead: Lead): string[] {
  const phones: string[] = [];

  // Contacts
  if (lead.contacts && lead.contacts.length > 0) {
    for (const c of lead.contacts) {
      if (c.value && /\d{3,}/.test(c.value)) {
        phones.push(c.value);
      }
    }
  }

  // Channels
  if (lead.channels && lead.channels.length > 0) {
    for (const ch of lead.channels) {
      if (ch.detailValue && /\d{3,}/.test(ch.detailValue)) {
        phones.push(ch.detailValue);
      }
    }
  }

  // Scan notes & description for phone numbers (e.g. 923 456 789 or 082 123 4567)
  const textBlob = `${lead.description || ''} ${lead.notes || ''}`;
  const matches = textBlob.match(/(?:\+?\d{1,4}[\s.-]*)?(?:\(?\d{2,4}\)?[\s.-]*)?\d{3,4}[\s.-]*\d{3,4}/g);
  if (matches) {
    for (const m of matches) {
      const clean = normalizePhoneDigits(m);
      if (clean.length >= 7) {
        phones.push(m);
      }
    }
  }

  return Array.from(new Set(phones));
}

export interface DuplicateMatchDetail {
  leadId: string;
  leadName: string;
  stage: string;
  reason: string;
  matchedValue: string;
  field: 'phone' | 'email' | 'name' | 'website' | 'source_url' | 'project_domain';
}

export interface LeadDuplicateReport {
  hasDuplicates: boolean;
  duplicateCount: number;
  matches: DuplicateMatchDetail[];
  summaryLabel: string;
}

/**
 * Detects whether a lead shares phone numbers (in any format/spacing), business names,
 * emails, websites, source URLs, or unique projectDomainName with any other leads in the database.
 */
export function findLeadDuplicates(targetLead: Lead, allLeads: Lead[]): LeadDuplicateReport {
  const matches: DuplicateMatchDetail[] = [];
  const targetId = targetLead.id;

  const targetNormName = normalizeBusinessName(targetLead.name);
  const targetRawName = normalizeTextForSearch(targetLead.name);
  const targetWebsite = normalizeWebsiteUrl(targetLead.website);
  const targetSourceUrl = targetLead.sourceUrl ? targetLead.sourceUrl.trim().toLowerCase() : '';
  const targetProjectDomain = normalizeProjectDomainName(
    targetLead.projectDomainName || targetLead.chatgptPackage?.projectDomainName || ''
  );

  // Extract all target phones & significant variants
  const targetPhones = extractAllPhonesFromLead(targetLead);

  // Extract all target emails
  const targetEmails = (targetLead.contacts || [])
    .map((c) => ({
      raw: c.value,
      email: normalizeEmailStr(c.value),
      person: c.contactPerson
    }))
    .filter((e) => e.email.includes('@'));

  for (const other of allLeads) {
    if (other.id === targetId) continue;
    if (other.deletedAt) continue;

    // 0. Project / Domain Name Match (CRITICAL UNIQUE IDENTIFIER)
    if (targetProjectDomain) {
      const otherProjectDomain = normalizeProjectDomainName(
        other.projectDomainName || other.chatgptPackage?.projectDomainName || ''
      );
      if (otherProjectDomain && otherProjectDomain === targetProjectDomain) {
        matches.push({
          leadId: other.id,
          leadName: other.name,
          stage: other.stage,
          field: 'project_domain',
          matchedValue: targetProjectDomain,
          reason: `Project / Domain Name "${targetProjectDomain}" already exists on ${other.name} (${other.id})`
        });
        continue;
      }
    }

    // 1. Phone Numbers Match (Handles spaces every 3 numbers, country codes, local formats)
    let phoneMatched = false;
    const otherPhones = extractAllPhonesFromLead(other);

    for (const tp of targetPhones) {
      for (const op of otherPhones) {
        if (arePhoneNumbersMatching(tp, op)) {
          matches.push({
            leadId: other.id,
            leadName: other.name,
            stage: other.stage,
            field: 'phone',
            matchedValue: tp,
            reason: `Shared Phone: "${tp}" ↔ "${op}" in ${other.name} (${other.id})`
          });
          phoneMatched = true;
          break;
        }
      }
      if (phoneMatched) break;
    }
    if (phoneMatched) continue;

    // 2. Business Name Match (Accounts for accents, punctuation, corporate suffixes)
    const otherNormName = normalizeBusinessName(other.name);
    const otherRawName = normalizeTextForSearch(other.name);

    if (
      targetNormName &&
      targetNormName.length >= 3 &&
      (otherNormName === targetNormName || (targetRawName.length >= 4 && otherRawName === targetRawName))
    ) {
      matches.push({
        leadId: other.id,
        leadName: other.name,
        stage: other.stage,
        field: 'name',
        matchedValue: other.name,
        reason: `Matching Business Name: "${other.name}" (${other.id})`
      });
      continue;
    }

    // 3. Email Address Match
    let emailMatched = false;
    if (targetEmails.length > 0) {
      const otherEmails = (other.contacts || [])
        .map((c) => normalizeEmailStr(c.value))
        .filter((e) => e.includes('@'));

      for (const te of targetEmails) {
        if (otherEmails.includes(te.email)) {
          matches.push({
            leadId: other.id,
            leadName: other.name,
            stage: other.stage,
            field: 'email',
            matchedValue: te.raw,
            reason: `Shared Email: "${te.raw}" in ${other.name} (${other.id})`
          });
          emailMatched = true;
          break;
        }
      }
    }
    if (emailMatched) continue;

    // 4. Website Domain Match
    const otherWebsite = normalizeWebsiteUrl(other.website);
    if (targetWebsite && targetWebsite.length > 3 && otherWebsite === targetWebsite) {
      matches.push({
        leadId: other.id,
        leadName: other.name,
        stage: other.stage,
        field: 'website',
        matchedValue: other.website || '',
        reason: `Shared Website Domain: ${otherWebsite} (${other.id})`
      });
      continue;
    }

    // 5. Source Listing URL Match
    if (targetSourceUrl && targetSourceUrl.length > 10 && other.sourceUrl) {
      const otherSourceUrl = other.sourceUrl.trim().toLowerCase();
      if (otherSourceUrl === targetSourceUrl) {
        matches.push({
          leadId: other.id,
          leadName: other.name,
          stage: other.stage,
          field: 'source_url',
          matchedValue: other.sourceUrl,
          reason: `Duplicate Listing/Source URL (${other.id})`
        });
      }
    }
  }

  const hasDuplicates = matches.length > 0;
  const duplicateCount = matches.length;

  let summaryLabel = '';
  if (hasDuplicates) {
    const reasons = Array.from(new Set(matches.map((m) => m.field)));
    summaryLabel = `Duplicate (${duplicateCount} match${duplicateCount > 1 ? 'es' : ''} by ${reasons.join(', ')})`;
  }

  return {
    hasDuplicates,
    duplicateCount,
    matches,
    summaryLabel
  };
}

/**
 * Builds duplicate reports once for the current lead dataset so UI components can
 * reuse the results instead of recalculating duplicates during every render.
 */
export function computeAllLeadDuplicates(allLeads: Lead[]): Map<string, LeadDuplicateReport> {
  const reports = new Map<string, LeadDuplicateReport>();
  for (const lead of allLeads) {
    reports.set(lead.id, findLeadDuplicates(lead, allLeads));
  }
  return reports;
}

/**
 * Checks if a lead matches a search term across all variations of phone numbers
 * (with/without spaces, country codes, formats), business names (accents, punctuation),
 * contacts, email, address, city, country, niche, and duplicate status.
 */
export function matchLeadComprehensive(lead: Lead, query: string, allLeads?: Lead[]): boolean {
  if (!query || !query.trim()) return true;

  const rawQuery = query.trim();
  const normalizedQuery = normalizeTextForSearch(rawQuery);
  const queryDigits = normalizePhoneDigits(rawQuery);

  // Special duplicate trigger keywords: "dup", "dups", "duplicate", "duplicates"
  if (/^(dup|dups|duplicate|duplicates|repetido|repetidos)$/i.test(rawQuery)) {
    if (allLeads && allLeads.length > 0) {
      return findLeadDuplicates(lead, allLeads).hasDuplicates;
    }
    return false;
  }

  // 1. PHONE NUMBER SEARCH (Matches any spacing like "923 456 789", "+244...", "(082)...")
  if (queryDigits && queryDigits.length >= 3) {
    const leadPhones = extractAllPhonesFromLead(lead);
    for (const phone of leadPhones) {
      const phoneDigits = normalizePhoneDigits(phone);
      // Direct substring match on clean digits
      if (phoneDigits.includes(queryDigits)) return true;

      // Check significant variants (handles national vs international format)
      const variants = getPhoneSignificantVariants(phone);
      const queryVariants = getPhoneSignificantVariants(rawQuery);

      for (const qv of queryVariants) {
        if (variants.some((v) => v.includes(qv) || qv.includes(v))) {
          return true;
        }
      }
    }
  }

  // 2. ID & BUSINESS NAME MATCH
  if (lead.id.toLowerCase().includes(rawQuery.toLowerCase())) return true;
  const leadNormName = normalizeTextForSearch(lead.name);
  if (leadNormName.includes(normalizedQuery)) return true;

  // 3. SEARCHABLE TEXT FIELDS
  const searchableParts = [
    lead.name,
    lead.id,
    lead.category,
    lead.industry,
    lead.city,
    lead.country,
    lead.province,
    lead.address,
    lead.source,
    lead.ownerName,
    lead.website,
    lead.googleBusinessUrl,
    lead.notes,
    lead.description,
    ...(lead.contacts || []).map((c) => `${c.value} ${c.contactPerson || ''} ${c.position || ''}`),
    ...(lead.channels || []).map((ch) => `${ch.channel} ${ch.detailValue || ''}`)
  ];

  const fullNormalizedBlob = normalizeTextForSearch(searchableParts.filter(Boolean).join(' '));

  // Direct phrase match
  if (fullNormalizedBlob.includes(normalizedQuery)) {
    return true;
  }

  // Multi-token word matching (all words in the search query must match something in the lead)
  const queryTokens = normalizedQuery.split(' ').filter((t) => t.length > 0);
  if (queryTokens.length > 1) {
    const allTokensMatch = queryTokens.every((token) => {
      // If token is purely digits, check against phone numbers too
      if (/^\d{3,}$/.test(token)) {
        const leadPhones = extractAllPhonesFromLead(lead);
        const matchedPhone = leadPhones.some((p) => normalizePhoneDigits(p).includes(token));
        if (matchedPhone) return true;
      }
      return fullNormalizedBlob.includes(token);
    });

    if (allTokensMatch) return true;
  }

  return false;
}
