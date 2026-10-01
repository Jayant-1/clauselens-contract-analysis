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
      boost: { sectionTitle: 2.5, content: 1.0, normalizedContent: 1.2 },
      prefix: true,
      fuzzy: 0.2, // 20% fuzzy tolerance for minor typos
      combineWith: "OR",
    },
  });

  miniSearch.addAll(chunks);
  return miniSearch;
}

/**
 * Executes a search query over chunks with relevance scoring and threshold filtering
 */
export function searchChunks(
  index: MiniSearch<DocumentChunk>,
  chunks: DocumentChunk[],
  options: RetrievalQuery
): SearchResultChunk[] {
  const { query, documentIds, limit = 8, minScore = 0.5 } = options;
  const cleanQuery = query.trim();

  if (!cleanQuery) return [];

  // MiniSearch search
  const rawResults = index.search(cleanQuery, {
    filter: documentIds && documentIds.length > 0
      ? (doc) => documentIds.includes(doc.documentId)
      : undefined,
  });

  const chunkMap = new Map<string, DocumentChunk>();
  for (const c of chunks) {
    chunkMap.set(c.id, c);
  }

  const results: SearchResultChunk[] = [];
  for (const res of rawResults) {
    if (res.score < minScore) continue;
    const chunk = chunkMap.get(res.id);
    if (!chunk) continue;

    results.push({
      ...chunk,
      score: res.score,
      match: res.match || {},
    });

    if (results.length >= limit) break;
  }

  // Fallback: If MiniSearch yielded 0 results, do direct normalized substring / word overlap check
  if (results.length === 0) {
    const normQuery = normalizeText(cleanQuery);
    const queryWords = normQuery.split(/\s+/).filter((w) => w.length > 2);

    for (const c of chunks) {
      if (documentIds && documentIds.length > 0 && !documentIds.includes(c.documentId)) {
        continue;
      }

      let wordMatches = 0;
      for (const w of queryWords) {
        if (c.normalizedContent.includes(w) || normalizeText(c.sectionTitle).includes(w)) {
          wordMatches++;
        }
      }

      if (wordMatches > 0) {
        const fallbackScore = wordMatches / Math.max(queryWords.length, 1);
        if (fallbackScore >= 0.3) {
          results.push({
            ...c,
            score: fallbackScore * 2.0,
            match: {},
          });
        }
      }

      if (results.length >= limit) break;
    }

    results.sort((a, b) => b.score - a.score);
  }

  return results;
}
