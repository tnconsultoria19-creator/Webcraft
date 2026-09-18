/**
 * Deterministic parser for ChatGPT Business Packages
 * 
 * Extracts exactly three outputs without using any AI rewriting or modification:
 * 1. Gemini Implementation Instruction
 * 2. Client Profile JSON
 * 3. Project / Domain Name (normalized machine-safe identifier)
 */

/**
 * Normalizes a business name into a machine-safe project / domain name:
 * 1. Convert all letters to lowercase.
 * 2. Remove all spaces.
 * 3. Remove special characters and symbols (&, @, #, %, !, ?, etc.).
 * 4. Remove unnecessary punctuation (commas, periods, apostrophes, quotes, brackets).
 * 5. Do not insert spaces or replace with hyphens/underscores.
 * 6. Strip diacritics/accents.
 * 
 * Examples:
 * "PS Royalty Massage & Spa"   -> "psroyaltymassagespa"
 * "Cape Town Beauty Studio"    -> "capetownbeautystudio"
 * "Joe's Auto Repairs"         -> "joesautorepairs"
 * "ABC Construction (Pty) Ltd" -> "abcconstructionptyltd"
 * "Angola Gospel Centro"       -> "angolagospelcentro"
 */
export function normalizeProjectDomainName(input: string): string {
  if (!input) return '';
  let clean = input.trim();
  // Remove markdown quotes, backticks, bold, italic
  clean = clean.replace(/[`*_~"]/g, '');
  // Split into lines
  const lines = clean.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
  
  // Find the first line that is not purely a section/header title
  const headerOnlyRegex = /^(?:#+\s*)?(?:={3,}\s*)?(?:WEBCRAFT_OUTPUT_3_PROJECT_DOMAIN_NAME|(?:(?:output|section|block)\s*\d+\s*[:\-–—]?\s*)?(?:project(?:\s*\/\s*|\s+)domain\s*name|domain\s*name|project\s*name|business\s*name))(?:\s*={3,})?\s*[:\-–—]?\s*$/i;
  let targetLine = lines[0] || '';
  for (const line of lines) {
    if (!headerOnlyRegex.test(line)) {
      targetLine = line;
      break;
    }
  }

  // Remove common labels/prefixes if inline with the value (e.g. "OUTPUT 3: PROJECT / DOMAIN NAME: psroyaltymassage")
  targetLine = targetLine.replace(/^(?:#+\s*)?(?:={3,}\s*)?(?:WEBCRAFT_OUTPUT_3_PROJECT_DOMAIN_NAME|(?:(?:output|section|block)\s*\d+\s*[:\-–—]?\s*)?(?:project(?:\s*\/\s*|\s+)domain\s*name|domain\s*name|project\s*name|business\s*name))(?:\s*={3,})?\s*[:\-–—]?\s*/i, '');
  // Strip protocol and www if user/ChatGPT provided a URL
  targetLine = targetLine.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '');
  // Strip common domain suffixes if user/ChatGPT appended them (.pages.dev, .cloudflarepages.com, .com, .co.za, etc.)
  targetLine = targetLine.replace(/\.(?:pages\.dev|cloudflarepages\.com|co\.za|com|org|net|io|app|dev|site)\b.*$/i, '');
  // Strip explanatory remarks if specifically present (e.g. "(ready for Cloudflare)", "- ready for domain")
  targetLine = targetLine.replace(/\s*\(\s*(?:ready\s+for|machine[\s-]*safe|cloudflare|domain|project|identifier).*?\)/gi, '');
  targetLine = targetLine.replace(/\s*[-–—]\s*(?:ready\s+for|machine[\s-]*safe|cloudflare|domain|project|identifier).*$/gi, '');
  // Strip accents/diacritics (e.g. é -> e)
  targetLine = targetLine.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Lowercase and remove all non-alphanumeric characters (spaces, punctuation, symbols, brackets, quotes, hyphens, underscores)
  return targetLine.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export interface ParsedChatGPTResponse {
  geminiInstruction: string;
  rawClientProfileJson: string;
  clientProfile: Record<string, any>;
  businessName: string;
  projectDomainName: string;
}

export interface ParseResult {
  success: boolean;
  error?: string;
  data?: ParsedChatGPTResponse;
}

/**
 * Extracts balanced JSON string from the text
 */
function extractJsonObject(text: string): { jsonStr: string; startIndex: number; endIndex: number } | null {
  // 1. Check if there is a markdown code fence ```json ... ```
  const codeFenceRegex = /```(?:json)?\s*(\{[\s\S]*?\})\s*```/i;
  const fenceMatch = text.match(codeFenceRegex);
  if (fenceMatch && fenceMatch[1]) {
    const startIndex = text.indexOf(fenceMatch[0]);
    return {
      jsonStr: fenceMatch[1].trim(),
      startIndex,
      endIndex: startIndex + fenceMatch[0].length
    };
  }

  // 2. Check if there is a Section 2 header
  const s2Match = text.match(/(?:#+\s*)?(?:SECTION\s*2|OUTPUT\s*2|CLIENT\s*PROFILE\s*(?:JSON)?)/i);
  let searchFrom = 0;
  if (s2Match && s2Match.index !== undefined) {
    searchFrom = s2Match.index;
  } else {
    // If no Section 2 header, search for "businessName"
    const bnIndex = text.indexOf('"businessName"');
    if (bnIndex !== -1) {
      searchFrom = bnIndex;
    }
  }

  // Find the first opening brace `{` after s2Match (or before bnIndex)
  let braceIndex = -1;
  if (s2Match && s2Match.index !== undefined) {
    braceIndex = text.indexOf('{', searchFrom);
  } else {
    for (let i = searchFrom; i >= 0; i--) {
      if (text[i] === '{') {
        braceIndex = i;
        break;
      }
    }
    if (braceIndex === -1) {
      braceIndex = text.indexOf('{');
    }
  }

  if (braceIndex === -1) return null;

  // Walk forward to find the matching closing brace `}`
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let closeIndex = -1;

  for (let i = braceIndex; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (escapeNext) {
        escapeNext = false;
      } else if (char === '\\') {
        escapeNext = true;
      } else if (char === '"') {
        inString = false;
      }
    } else {
      if (char === '"') {
        inString = true;
      } else if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          closeIndex = i;
          break;
        }
      }
    }
  }

  if (closeIndex === -1) {
    // Unclosed brace
    return {
      jsonStr: text.substring(braceIndex),
      startIndex: braceIndex,
      endIndex: text.length
    };
  }

  const jsonStr = text.substring(braceIndex, closeIndex + 1).trim();
  return {
    jsonStr,
    startIndex: braceIndex,
    endIndex: closeIndex + 1
  };
}

export function parseChatGPTPackage(rawInput: string): ParseResult {
  if (!rawInput || !rawInput.trim()) {
    return {
      success: false,
      error: 'Paste the ChatGPT business package first.'
    };
  }

  const text = rawInput.trim();

  // 1. Extract Section 2: Client Profile JSON
  const jsonExtract = extractJsonObject(text);
  if (!jsonExtract || !jsonExtract.jsonStr.includes('{')) {
    return {
      success: false,
      error: 'Client profile JSON not found.'
    };
  }

  let clientProfile: Record<string, any>;
  try {
    clientProfile = JSON.parse(jsonExtract.jsonStr);
  } catch {
    return {
      success: false,
      error: 'Client profile contains invalid JSON.'
    };
  }

  if (typeof clientProfile !== 'object' || clientProfile === null || Array.isArray(clientProfile)) {
    return {
      success: false,
      error: 'Client profile contains invalid JSON.'
    };
  }

  // Validate businessName
  const businessName = (clientProfile.businessName || '').toString().trim();
  if (!businessName) {
    return {
      success: false,
      error: 'Business name is required.'
    };
  }

  // 2. Extract Section 1: Gemini Implementation Instruction
  // Find where Section 1 begins:
  // Starts either at SECTION 1 / OUTPUT 1 / GEMINI IMPLEMENTATION INSTRUCTION marker, or at start of text.
  let instructionStartIndex = 0;
  const s1HeaderMatch = text.match(
    /^(?:#+\s*)?(?:SECTION\s*1\s*[:\-–—]?|OUTPUT\s*1\s*[:\-–—]?|GEMINI\s*IMPLEMENTATION\s*INSTRUCTION\s*[:\-–—]?)(?:[^\n]*\n)/im
  );

  if (s1HeaderMatch && s1HeaderMatch.index !== undefined) {
    instructionStartIndex = s1HeaderMatch.index + s1HeaderMatch[0].length;
  }

  // Find where Section 1 ends:
  // It ends where Section 2 begins.
  // Check for explicit Section 2 header before the JSON extract
  let instructionEndIndex = jsonExtract.startIndex;
  const textBeforeJson = text.substring(instructionStartIndex, jsonExtract.startIndex);
  const s2HeaderMatch = textBeforeJson.match(
    /(?:\n|^)(?:#+\s*)?(?:SECTION\s*2\s*[:\-–—]?|OUTPUT\s*2\s*[:\-–—]?|CLIENT\s*PROFILE\s*(?:JSON)?\s*[:\-–—]?)[^\n]*$/im
  );

  if (s2HeaderMatch && s2HeaderMatch.index !== undefined) {
    instructionEndIndex = instructionStartIndex + s2HeaderMatch.index;
  }

  let geminiInstruction = text.substring(instructionStartIndex, instructionEndIndex).trim();

  // Strip trailing markdown divider line (--- or ===) if present
  geminiInstruction = geminiInstruction.replace(/[\r\n]+[-=_]{3,}[\r\n]*$/, '').trim();

  if (!geminiInstruction) {
    return {
      success: false,
      error: 'Gemini implementation instruction not found.'
    };
  }

  // 3. Extract Section 3: Project / Domain Name (or Business Name)
  const afterJsonText = text.substring(jsonExtract.endIndex).trim();
  let rawOutput3 = '';
  
  const s3HeaderMatch = afterJsonText.match(
    /(?:#+\s*)?(?:={3,}\s*)?(?:WEBCRAFT_OUTPUT_3_PROJECT_DOMAIN_NAME|SECTION\s*3\s*[:\-–—]?|OUTPUT\s*3\s*[:\-–—]?|PROJECT\s*(?:\/|\s+)?DOMAIN\s*NAME\s*[:\-–—]?|BUSINESS\s*NAME\s*[:\-–—]?)(?:\s*={3,})?(?:[^\n]*\n)?([\s\S]*)/i
  );
  
  if (s3HeaderMatch && s3HeaderMatch[1]) {
    rawOutput3 = s3HeaderMatch[1].trim();
  } else if (afterJsonText) {
    rawOutput3 = afterJsonText;
  }

  // Normalize projectDomainName according to strict machine-safe domain rules
  // If no output 3 was provided, normalize directly from businessName
  const normalizedFromOutput3 = normalizeProjectDomainName(rawOutput3);
  const projectDomainName = normalizedFromOutput3 || normalizeProjectDomainName(businessName);

  // Format the JSON with 2 spaces for pristine display
  let formattedJson = jsonExtract.jsonStr;
  try {
    formattedJson = JSON.stringify(clientProfile, null, 2);
  } catch {
    formattedJson = jsonExtract.jsonStr;
  }

  return {
    success: true,
    data: {
      geminiInstruction,
      rawClientProfileJson: formattedJson,
      clientProfile,
      businessName,
      projectDomainName
    }
  };
}
