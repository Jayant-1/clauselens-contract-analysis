import MiniSearch from "minisearch";
import { DocumentChunk } from "./chunking";
import { normalizeText } from "./normalization";

export interface SearchResultChunk extends DocumentChunk {
  score: number;
  match: Record<string, string[]>;
  documentName?: string;
}

export interface RetrievalQuery {
  query: string;
  documentIds?: string[];
  limit?: number;
  minScore?: number;
}

/**
 * Legal concepts and synonym expansion mapping
 */
export const LEGAL_SYNONYMS: Record<string, string[]> = {
  "liability cap": [
    "liability",
    "limitation of liability",
    "cap",
    "aggregate liability",
    "exceed",
    "consequential damages",
    "damages",
    "sum of",
  ],
  "limitation of liability": [
    "liability",
    "limitation of liability",
    "cap",
    "aggregate liability",
    "exceed",
    "consequential damages",
    "damages",
    "sum of",
  ],
  "liability": [
    "liability",
    "limitation of liability",
    "cap",
    "aggregate liability",
    "exceed",
    "damages",
  ],
  "super-cap": [
    "super-cap",
    "super cap",
    "aggregate liability",
    "uncapped",
    "carve-out",
  ],
  "termination notice": [
    "termination",
    "notice",
    "convenience",
    "days",
    "cure",
    "material breach",
    "term and termination",
    "prior written notice",
  ],
  "termination": [
    "termination",
    "notice",
    "convenience",
    "days",
    "cure",
    "material breach",
    "term and termination",
    "written notice",
  ],
  "notice period": [
    "termination",
    "notice",
    "convenience",
    "days",
    "prior written notice",
  ],
  "governing law": [
    "governing law",
    "jurisdiction",
    "laws of",
    "venue",
    "dispute",
    "courts",
    "state of",
    "conflict of laws",
  ],
  "jurisdiction": [
    "governing law",
    "jurisdiction",
    "laws of",
    "venue",
    "dispute",
    "courts",
    "state of",
    "conflict of laws",
  ],
  "confidentiality": [
    "confidential",
    "confidentiality",
    "non-disclosure",
    "safeguard",
    "proprietary",
    "reasonable care",
    "trade secret",
  ],
  "confidential": [
    "confidential",
    "confidentiality",
    "non-disclosure",
    "safeguard",
    "proprietary",
    "reasonable care",
    "trade secret",
  ],
  "fees": [
    "fees",
    "invoicing",
    "payment",
    "invoices",
    "due",
    "subscription",
    "recurring",
    "annually",
    "advance",
  ],
  "invoicing": [
    "fees",
    "invoicing",
    "payment",
    "invoices",
    "due",
    "subscription",
    "recurring",
    "annually",
    "advance",
  ],
  "payment": [
    "fees",
    "invoicing",
    "payment",
    "invoices",
    "due",
    "subscription",
    "recurring",
    "annually",
    "advance",
  ],
  "indemnity": [
    "indemnity",
    "indemnification",
    "hold harmless",
    "defend",
    "claims",
  ],
  "indemnification": [
    "indemnity",
    "indemnification",
    "hold harmless",
    "defend",
    "claims",
  ],
  "term": [
    "term",
    "duration",
    "effective date",
    "initial term",
    "renewal",
    "expiration",
    "months",
  ],
  "data protection": [
    "data protection",
    "security",
    "safeguards",
    "soc-2",
    "customer data",
    "unauthorized",
    "administrative",
  ],
};

const NOISE_TOKENS = new Set([
  "what",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "can",
  "could",
  "shall",
  "should",
  "will",
  "would",
  "may",
  "might",
  "must",
  "the",
  "a",
  "an",
  "quote",
  "exact",
  "contractual",
  "wording",
  "in",
  "two",
  "contracts",
  "contract",
  "state",
  "old",
  "and",
  "new",
  "amount",
  "amounts",
  "with",
  "from",
  "into",
  "onto",
  "over",
  "than",
  "this",
  "that",
  "these",
  "those",
  "each",
  "document",
  "documents",
  "both",
  "all",
  "compare",
  "comparison",
  "tell",
  "me",
  "show",
  "find",
  "say",
  "about",
  "please",
  "give",
  "provide",
  "which",
  "where",
  "how",
  "much",
  "many",
  "explain",
]);

/**
 * Normalizes query and expands with legal domain synonyms while stripping noise
 */
export function normalizeAndExpandQuery(rawQuery: string): {
  expandedQuery: string;
  matchedConcepts: string[];
  keywords: string[];
} {
  const norm = normalizeText(rawQuery);
  const matchedConcepts: string[] = [];
  const addedSynonyms = new Set<string>();

  // Check multi-word and single-word legal concepts
  for (const [concept, synonyms] of Object.entries(LEGAL_SYNONYMS)) {
    if (norm.includes(concept)) {
      matchedConcepts.push(concept);
      for (const syn of synonyms) {
        addedSynonyms.add(syn);
      }
    }
  }

  // Extract non-noise keywords from raw query
  const rawWords = norm.split(/\s+/).map((w) => w.replace(/[^a-z0-9]/g, ""));
  const keywords = rawWords.filter((w) => w.length > 2 && !NOISE_TOKENS.has(w));

  for (const kw of keywords) {
    addedSynonyms.add(kw);
  }

  const queryTerms = Array.from(addedSynonyms);
  const expandedQuery = queryTerms.length > 0 ? queryTerms.join(" ") : norm;

  return {
    expandedQuery,
    matchedConcepts,
    keywords,
  };
}

/**
 * Creates and populates a MiniSearch index for contract chunks
 */
export function buildChunkIndex(chunks: DocumentChunk[]): MiniSearch<DocumentChunk> {
  const miniSearch = new MiniSearch<DocumentChunk>({
    fields: ["sectionTitle", "content", "normalizedContent"],
    storeFields: [
      "id",
      "documentId",
      "chunkIndex",
      "pageNumber",
      "sectionTitle",
      "content",
      "normalizedContent",
      "startChar",
      "endChar",
    ],
    searchOptions: {
      boost: { sectionTitle: 6.0, content: 1.0, normalizedContent: 1.5 },
      prefix: false,
      fuzzy: false,
      combineWith: "OR",
    },
  });

  miniSearch.addAll(chunks);
  return miniSearch;
}

/**
 * Executes search for a single document scope
 */
function searchSingleDoc(
  index: MiniSearch<DocumentChunk>,
  chunks: DocumentChunk[],
  cleanQuery: string,
  docId: string | undefined,
  limit: number,
  minScore: number,
  matchedConcepts: string[]
): SearchResultChunk[] {
  const rawResults = index.search(cleanQuery, {
    filter: docId ? (doc) => doc.documentId === docId : undefined,
  });

  const chunkMap = new Map<string, DocumentChunk>();
  for (const c of chunks) {
    if (!docId || c.documentId === docId) {
      chunkMap.set(c.id, c);
    }
  }

  const candidates: SearchResultChunk[] = [];
  for (const res of rawResults) {
    if (res.score < minScore) continue;
    const chunk = chunkMap.get(res.id);
    if (!chunk) continue;

    let adjustedScore = res.score;
    const normTitle = normalizeText(chunk.sectionTitle);

    // Boost chunks whose section title matches the legal concept
    for (const concept of matchedConcepts) {
      if (normTitle.includes(concept)) {
        adjustedScore *= 4.0;
        break;
      }
      const synonyms = LEGAL_SYNONYMS[concept] || [];
      if (synonyms.some((s) => normTitle.includes(s))) {
        adjustedScore *= 2.5;
        break;
      }
    }

    candidates.push({
      ...chunk,
      score: adjustedScore,
      match: res.match || {},
    });
  }

  // Fallback: If 0 results or no high confidence, do direct whole-word check
  if (candidates.length === 0) {
    const queryWords = cleanQuery
      .split(/\s+/)
      .map((w) => w.replace(/[^a-z0-9]/g, ""))
      .filter((w) => w.length > 2 && !NOISE_TOKENS.has(w));

    if (queryWords.length > 0) {
      for (const c of chunks) {
        if (docId && c.documentId !== docId) continue;

        const chunkWords = new Set(
          normalizeText(`${c.sectionTitle} ${c.content}`)
            .split(/\s+/)
            .map((w) => w.replace(/[^a-z0-9]/g, ""))
            .filter(Boolean)
        );

        let wordMatches = 0;
        for (const w of queryWords) {
          if (chunkWords.has(w)) {
            wordMatches++;
          }
        }

        if (wordMatches > 0) {
          let fallbackScore = (wordMatches / queryWords.length) * 2.0;
          const normTitle = normalizeText(c.sectionTitle);
          for (const concept of matchedConcepts) {
            if (normTitle.includes(concept)) {
              fallbackScore *= 3.0;
              break;
            }
          }

          if (fallbackScore >= minScore) {
            candidates.push({
              ...c,
              score: fallbackScore,
              match: {},
            });
          }
        }
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, limit);
}

/**
 * Executes a search query over chunks with relevance scoring, synonym expansion, and multi-doc isolation
 */
export function searchChunks(
  index: MiniSearch<DocumentChunk>,
  chunks: DocumentChunk[],
  options: RetrievalQuery
): SearchResultChunk[] {
  const { query, documentIds, limit = 8, minScore = 0.3 } = options;
  const rawClean = query.trim();
  if (!rawClean) return [];

  // Expand query with legal synonyms & extract matched concepts
  const { expandedQuery, matchedConcepts } = normalizeAndExpandQuery(rawClean);

  // If multiple documents are selected, retrieve top candidates INDEPENDENTLY from each document
  if (documentIds && documentIds.length > 1) {
    const perDocLimit = Math.max(2, Math.ceil(limit / documentIds.length));
    const combinedResults: SearchResultChunk[] = [];

    for (const docId of documentIds) {
      const docResults = searchSingleDoc(
        index,
        chunks,
        expandedQuery,
        docId,
        perDocLimit,
        minScore,
        matchedConcepts
      );
      combinedResults.push(...docResults);
    }

    // Sort by adjusted score
    combinedResults.sort((a, b) => b.score - a.score);
    return combinedResults.slice(0, limit);
  }

  // Single document or global search
  const singleDocId = documentIds && documentIds.length === 1 ? documentIds[0] : undefined;
  return searchSingleDoc(
    index,
    chunks,
    expandedQuery,
    singleDocId,
    limit,
    minScore,
    matchedConcepts
  );
}
