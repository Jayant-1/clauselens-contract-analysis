/**
 * Text normalization and quote verification pipeline for ClauseLens
 */

export interface PageText {
  pageNumber: number;
  text: string;
}

export interface MatchOccurrence {
  pageNumber: number;
  startOffset: number;
  endOffset: number;
  matchedText: string;
}

export interface VerificationResult {
  isVerified: boolean;
  matchedText: string | null;
  pageNumber: number | null;
  startOffset: number | null;
  endOffset: number | null;
  occurrencesCount: number;
  matches: MatchOccurrence[];
  reason?: string;
  confidence: number;
}

export interface DocumentChunkRef {
  id: string;
  sectionTitle: string;
  content: string;
  pageNumber: number;
}

export interface DocumentVerificationTarget {
  id: string;
  name: string;
  extractedText: string;
  pages: PageText[];
  chunks?: DocumentChunkRef[];
}

export interface VerifyQuoteOptions {
  preferredPage?: number;
  preferredStartOffset?: number;
  preferredEndOffset?: number;
  claimedDocumentId?: string;
  claimedSectionTitle?: string;
  claimedChunkId?: string;
  chunks?: DocumentChunkRef[];
}

/**
 * Normalizes text for legal text comparison and quotation matching:
 * - Converts to lowercase
 * - Normalizes unicode quotes, apostrophes, and primes
 * - Normalizes em dashes, en dashes, minus signs, hyphens to " - "
 * - Collapses all whitespace sequences to a single ASCII space
 * - Strips leading/trailing spaces
 */
export function normalizeText(text: string): string {
  if (!text) return "";

  return text
    // Replace smart single quotes, backticks, primes with standard single quote
    .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035`]/g, "'")
    // Replace smart double quotes, guillemets with standard double quote
    .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036«»]/g, '"')
    // Replace em dashes, en dashes, figure dashes, horizontal bars, hyphens with " - "
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, " - ")
    .replace(/\s*-\s*/g, " - ")
    // Replace non-breaking spaces, zero-width spaces, thin spaces
    .replace(/[\u00A0\u200B\u202F\uFEFF]/g, " ")
    // Collapse all whitespace (newlines, tabs, spaces) into a single space
    .replace(/\s+/g, " ")
    // Lowercase
    .toLowerCase()
    .trim();
}

/**
 * Tokenizes text into normalized word tokens with alphanumeric filtering
 */
export function tokenizeWords(text: string): string[] {
  const norm = normalizeText(text);
  const matches = norm.match(/[a-z0-9]+(?:'[a-z0-9]+)?/g);
  return matches || [];
}

/**
 * Strips punctuation except alphanumeric and spaces for flexible word matching
 */
export function stripPunctuation(text: string): string {
  return normalizeText(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Finds which page contains the given text or start of text
 */
export function findPageForMatch(
  matchedSlice: string,
  pages: PageText[],
  fallbackOffset: number = 0
): number {
  if (!pages || pages.length === 0) return 1;

  const normSlice = normalizeText(matchedSlice);
  if (!normSlice) return pages[0]?.pageNumber || 1;

  // 1. Direct or normalized match in a single page
  for (const page of pages) {
    if (page.text.includes(matchedSlice) || normalizeText(page.text).includes(normSlice)) {
      return page.pageNumber;
    }
  }

  // 2. Token match on the start of the slice (e.g. for cross-page quotes)
  const words = tokenizeWords(matchedSlice);
  if (words.length >= 3) {
    const headWords = words.slice(0, 3).join(" ");
    for (const page of pages) {
      if (normalizeText(page.text).includes(headWords)) {
        return page.pageNumber;
      }
    }
  }

  // 3. Fallback to offset accumulation
  let accumulated = 0;
  for (const page of pages) {
    accumulated += page.text.length + 1;
    if (fallbackOffset < accumulated) {
      return page.pageNumber;
    }
  }

  return pages[0]?.pageNumber || 1;
}

/**
 * Verifies a quote against a document with chunk/section boundary validation
 */
export function verifyQuote(
  rawQuote: string,
  document: DocumentVerificationTarget,
  options?: VerifyQuoteOptions
): VerificationResult {
  const cleanQuote = rawQuote ? rawQuote.trim() : "";
  if (!cleanQuote || cleanQuote.length < 3) {
    return {
      isVerified: false,
      matchedText: null,
      pageNumber: null,
      startOffset: null,
      endOffset: null,
      occurrencesCount: 0,
      matches: [],
      reason: "Quote is empty or too short to verify.",
      confidence: 0,
    };
  }

  // 1. Validate claimed document ID if provided
  if (options?.claimedDocumentId && options.claimedDocumentId !== document.id) {
    return {
      isVerified: false,
      matchedText: null,
      pageNumber: null,
      startOffset: null,
      endOffset: null,
      occurrencesCount: 0,
      matches: [],
      reason: `Document ID mismatch: citation claimed document "${options.claimedDocumentId}", but target document is "${document.id}".`,
      confidence: 0,
    };
  }

  const normQuote = normalizeText(cleanQuote);
  const occurrences: MatchOccurrence[] = [];

  // Pass 1: Page-by-page search for exact or normalized occurrences
  for (const page of document.pages) {
    // 1a. Direct substring match on this page
    if (page.text.includes(cleanQuote)) {
      let pos = 0;
      while (pos < page.text.length) {
        const idx = page.text.indexOf(cleanQuote, pos);
        if (idx === -1) break;
        const end = idx + cleanQuote.length;
        occurrences.push({
          pageNumber: page.pageNumber,
          startOffset: idx,
          endOffset: end,
          matchedText: page.text.slice(idx, end),
        });
        pos = idx + 1;
      }
    } else {
      // 1b. Normalized search on this page
      const normPage = normalizeText(page.text);
      if (normPage.includes(normQuote)) {
        const words = tokenizeWords(cleanQuote);
        if (words.length > 0) {
          const pattern = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("[\\s\\W_]+");
          try {
            const regex = new RegExp(pattern, "gi");
            let m: RegExpExecArray | null;
            while ((m = regex.exec(page.text)) !== null) {
              const idx = m.index;
              const end = idx + m[0].length;
              occurrences.push({
                pageNumber: page.pageNumber,
                startOffset: idx,
                endOffset: end,
                matchedText: page.text.slice(idx, end),
              });
              if (regex.lastIndex === m.index) regex.lastIndex++;
            }
          } catch {
            // fallback
          }
        }
      }
    }
  }

  // Pass 2: If no per-page match, check across page boundaries
  if (occurrences.length === 0 && document.pages.length > 1) {
    for (let i = 0; i < document.pages.length - 1; i++) {
      const p1 = document.pages[i];
      const p2 = document.pages[i + 1];
      const combined = `${p1.text} ${p2.text}`;
      const normCombined = normalizeText(combined);

      if (normCombined.includes(normQuote)) {
        occurrences.push({
          pageNumber: p1.pageNumber,
          startOffset: 0,
          endOffset: 0,
          matchedText: cleanQuote,
        });
        break;
      }
    }
  }

  // Pass 3: Global fallback if pages array was empty
  if (occurrences.length === 0 && document.extractedText) {
    const normFull = normalizeText(document.extractedText);
    if (normFull.includes(normQuote)) {
      occurrences.push({
        pageNumber: 1,
        startOffset: 0,
        endOffset: cleanQuote.length,
        matchedText: cleanQuote,
      });
    }
  }

  // If quote is not found anywhere in document
  if (occurrences.length === 0) {
    return {
      isVerified: false,
      matchedText: null,
      pageNumber: null,
      startOffset: null,
      endOffset: null,
      occurrencesCount: 0,
      matches: [],
      reason: `Quote text not found in document "${document.name}".`,
      confidence: 0,
    };
  }

  // Pass 4: Chunk and Section boundary verification
  const availableChunks = options?.chunks || document.chunks || [];
  if (availableChunks.length > 0) {
    // 4a. If specific chunk ID was claimed, verify quote is within that chunk
    if (options?.claimedChunkId) {
      const targetChunk = availableChunks.find((c) => c.id === options.claimedChunkId);
      if (targetChunk) {
        const normChunk = normalizeText(targetChunk.content);
        if (!normChunk.includes(normQuote)) {
          return {
            isVerified: false,
            matchedText: null,
            pageNumber: null,
            startOffset: null,
            endOffset: null,
            occurrencesCount: occurrences.length,
            matches: occurrences,
            reason: `Quote is outside claimed chunk "${options.claimedChunkId}" (${targetChunk.sectionTitle}).`,
            confidence: 0,
          };
        }
      }
    }

    // 4b. If specific section title was claimed, verify quote belongs to that section
    if (options?.claimedSectionTitle) {
      const normClaimedSection = normalizeText(options.claimedSectionTitle);
      const matchingSectionChunks = availableChunks.filter((c) => {
        const normSec = normalizeText(c.sectionTitle);
        return normSec.includes(normClaimedSection) || normClaimedSection.includes(normSec);
      });

      if (matchingSectionChunks.length > 0) {
        const sectionHasQuote = matchingSectionChunks.some((c) =>
          normalizeText(c.content).includes(normQuote)
        );

        if (!sectionHasQuote) {
          // Find which section actually contains this quote for clear error
          const actualChunk = availableChunks.find((c) =>
            normalizeText(c.content).includes(normQuote)
          );
          const actualSec = actualChunk ? actualChunk.sectionTitle : "another section";
          return {
            isVerified: false,
            matchedText: null,
            pageNumber: null,
            startOffset: null,
            endOffset: null,
            occurrencesCount: occurrences.length,
            matches: occurrences,
            reason: `Quote is outside claimed section "${options.claimedSectionTitle}" (actual location: "${actualSec}").`,
            confidence: 0,
          };
        }
      }
    }
  }

  // Disambiguation for repeated quotes
  let selectedMatch = occurrences[0];
  if (options?.preferredPage) {
    const pageMatch = occurrences.find((m) => m.pageNumber === options.preferredPage);
    if (pageMatch) {
      selectedMatch = pageMatch;
    }
  } else if (options?.preferredStartOffset !== undefined) {
    let minDistance = Infinity;
    for (const occ of occurrences) {
      const dist = Math.abs(occ.startOffset - options.preferredStartOffset);
      if (dist < minDistance) {
        minDistance = dist;
        selectedMatch = occ;
      }
    }
  }

  return {
    isVerified: true,
    matchedText: selectedMatch.matchedText,
    pageNumber: selectedMatch.pageNumber,
    startOffset: selectedMatch.startOffset,
    endOffset: selectedMatch.endOffset,
    occurrencesCount: occurrences.length,
    matches: occurrences,
    confidence: 1.0,
  };
}
