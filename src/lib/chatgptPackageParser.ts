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
      error: 'Paste at least one ChatGPT output block.'
    };
  }

  const text = rawInput.trim();

  // The user may paste any one, any two, or all three outputs.
  // Missing outputs are intentionally allowed.
  const jsonExtract = extractJsonObject(text);

  let clientProfile: Record<string, any> = {};
  let formattedJson = '';

  if (jsonExtract?.jsonStr && jsonExtract.jsonStr.includes('{')) {
    try {
      const parsed = JSON.parse(jsonExtract.jsonStr);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        clientProfile = parsed;
        formattedJson = JSON.stringify(parsed, null, 2);
      }
    } catch {
      // A JSON block may be absent or incomplete while another output is being processed.
      // Do not block the other outputs.
    }
  }

  const businessNameFromProfile = String(clientProfile.businessName || '').trim();

  // Extract Output 1 when present.
  let geminiInstruction = '';
  const output1Match = text.match(
    /===\s*WEBCRAFT_OUTPUT_1_GEMINI_INSTRUCTION\s*===([\s\S]*?)(?:===\s*END\s+WEBCRAFT_OUTPUT_1_GEMINI_INSTRUCTION\s*===|===\s*WEBCRAFT_OUTPUT_2_CLIENT_PROFILE_JSON\s*===|$)/i
  );
  if (output1Match?.[1]?.trim()) {
    geminiInstruction = output1Match[1].trim();
  } else {
    const s1HeaderMatch = text.match(
      /^(?:#+\s*)?(?:SECTION\s*1\s*[:\-–—]?|OUTPUT\s*1\s*[:\-–—]?|GEMINI\s*IMPLEMENTATION\s*INSTRUCTION\s*[:\-–—]?)(?:[^\n]*\n)/im
    );
    if (s1HeaderMatch && s1HeaderMatch.index !== undefined) {
      let end = jsonExtract?.startIndex ?? text.length;
      const section1 = text.substring(s1HeaderMatch.index + s1HeaderMatch[0].length, end);
      geminiInstruction = section1.replace(/[\r\n]+[-=_]{3,}[\r\n]*$/, '').trim();
    } else if (!jsonExtract) {
      // A short single-line value is more likely to be the Business Name / Project Name.
      // Longer multi-line content is treated as a Gemini implementation instruction.
      const looksLikeStandaloneName = !text.includes('\n') && text.length <= 160;
      if (!looksLikeStandaloneName) {
        geminiInstruction = text;
      }
    }
  }

  // Extract Output 2 only when valid JSON is present.
  if (!formattedJson && jsonExtract?.jsonStr) {
    try {
      const parsed = JSON.parse(jsonExtract.jsonStr);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        clientProfile = parsed;
        formattedJson = JSON.stringify(parsed, null, 2);
      }
    } catch {
      // Leave JSON blank rather than blocking the available outputs.
    }
  }

  // Extract Output 3 / business name / project identifier.
  const afterJsonText = jsonExtract ? text.substring(jsonExtract.endIndex).trim() : '';
  let output3Value = '';

  const explicitOutput3 = text.match(
    /===\s*WEBCRAFT_OUTPUT_3_PROJECT_DOMAIN_NAME\s*===([\s\S]*?)(?:===\s*END\s+WEBCRAFT_OUTPUT_3_PROJECT_DOMAIN_NAME\s*===|$)/i
  );
  if (explicitOutput3?.[1]?.trim()) {
    output3Value = explicitOutput3[1].trim();
  } else {
    const businessNameMatch = text.match(
      /(?:^|\n)\s*(?:BUSINESS\s*NAME|PROJECT\s*\/\s*DOMAIN\s*NAME|DOMAIN\s*NAME|PROJECT\s*NAME)\s*[:\-–—]\s*([^\n]+)/i
    );
    if (businessNameMatch?.[1]?.trim()) {
      output3Value = businessNameMatch[1].trim();
    } else if (afterJsonText) {
      output3Value = afterJsonText;
    } else if (!businessNameFromProfile && !geminiInstruction) {
      output3Value = text;
    }
  }

  const normalizedFromOutput3 = normalizeProjectDomainName(output3Value);
  const projectDomainName =
    normalizedFromOutput3 ||
    normalizeProjectDomainName(businessNameFromProfile);

  // If the third output is the only thing supplied, treat its readable value as the
  // business name so the user can continue and save the client instead of being blocked.
  const businessName =
    businessNameFromProfile ||
    output3Value
      .replace(/^===.*?===/s, '')
      .replace(/===.*$/s, '')
      .trim();

  // A partial package is still a valid processing result as long as at least one
  // supported output was supplied.
  if (!geminiInstruction && !formattedJson && !output3Value) {
    return {
      success: false,
      error: 'No Gemini instruction, client profile JSON, or business name/project name was detected.'
    };
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
