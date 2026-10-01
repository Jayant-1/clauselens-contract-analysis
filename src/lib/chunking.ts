import { normalizeText } from "./normalization";

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  pageNumber: number;
  sectionTitle: string;
  content: string;
  normalizedContent: string;
  startChar: number;
  endChar: number;
}

export interface ChunkingOptions {
  maxChunkSize?: number; // Target characters per chunk (default 900)
  overlapSize?: number;  // Overlap characters (default 150)
}

// Regex patterns to detect contract clause headings
const CLAUSE_HEADING_PATTERNS = [
  /^(?:section|sec\.|article|clause)\s+([0-9ivxlcdm]+[a-z0-9\.\-]*)\s*[:\.\-]?\s*(.*)$/i,
  /^([0-9]+\.[0-9]+(?:\.[0-9]+)*)\s+([A-Z][A-Za-z0-9\s,\-\(\)]+)$/,
  /^([IVXLCDM]+\.)\s+([A-Z\s]{3,50})$/,
  /^([A-Z][A-Z0-9\s\-_]{3,40}):/,
];

/**
 * Detects if a line looks like a legal contract section/clause heading
 */
export function extractSectionTitle(line: string): string | null {
  const trimmed = line.trim();
  if (trimmed.length < 3 || trimmed.length > 120) return null;

  for (const pattern of CLAUSE_HEADING_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match) {
      return trimmed;
    }
  }

  // Check uppercase title line e.g. "LIMITATION OF LIABILITY"
  if (/^[A-Z\s0-9,\.\-:]{4,50}$/.test(trimmed) && trimmed.split(/\s+/).length <= 8) {
    return trimmed;
  }

  return null;
}

/**
 * Chunks document pages into clause-aware, stable-ID chunks.
 * Handles 150+ page contracts without splitting clauses awkwardly.
 */
export function chunkDocument(
  documentId: string,
  pages: Array<{ pageNumber: number; text: string }>,
  options: ChunkingOptions = {}
): DocumentChunk[] {
  const maxChunkSize = options.maxChunkSize || 900;
  const overlapSize = options.overlapSize || 150;
  const chunks: DocumentChunk[] = [];

  let chunkIndex = 0;
  let globalCharOffset = 0;
  let currentSectionTitle = "General Provisions";

  for (const page of pages) {
    const lines = page.text.split(/\r?\n/);
    let currentChunkText = "";
    let chunkStartOffset = globalCharOffset;
    let chunkPageNumber = page.pageNumber;

    for (let lIdx = 0; lIdx < lines.length; lIdx++) {
      const line = lines[lIdx].trim();
      if (!line) {
        globalCharOffset += lines[lIdx].length + 1;
        continue;
      }

      // Check if line is a new clause heading
      const detectedHeading = extractSectionTitle(line);
      const isNewSection = !!detectedHeading;

      // If we hit a new section heading and already have accumulated text, flush chunk
      if (isNewSection && currentChunkText.trim().length >= 40) {
        const trimmed = currentChunkText.trim();
        if (trimmed.length > 0) {
          chunks.push({
            id: `${documentId}_chunk_${chunkIndex}`,
            documentId,
            chunkIndex,
            pageNumber: chunkPageNumber,
            sectionTitle: currentSectionTitle,
            content: trimmed,
            normalizedContent: normalizeText(trimmed),
            startChar: chunkStartOffset,
            endChar: chunkStartOffset + trimmed.length,
          });
          chunkIndex++;
        }

        // Keep last small overlap for context
        const words = currentChunkText.trim().split(/\s+/);
        const overlap = words.slice(-Math.min(words.length, 15)).join(" ");
        currentChunkText = overlap ? `${overlap}\n${line}\n` : `${line}\n`;
        chunkStartOffset = globalCharOffset;
        chunkPageNumber = page.pageNumber;
        currentSectionTitle = detectedHeading || currentSectionTitle;
        globalCharOffset += lines[lIdx].length + 1;
        continue;
      }

      if (detectedHeading) {
        currentSectionTitle = detectedHeading;
      }

      // Append line
      currentChunkText += `${line}\n`;

      // If chunk exceeded target max size, flush at sentence or paragraph boundary
      if (currentChunkText.length >= maxChunkSize) {
        const trimmed = currentChunkText.trim();
        chunks.push({
          id: `${documentId}_chunk_${chunkIndex}`,
          documentId,
          chunkIndex,
          pageNumber: chunkPageNumber,
          sectionTitle: currentSectionTitle,
          content: trimmed,
          normalizedContent: normalizeText(trimmed),
          startChar: chunkStartOffset,
          endChar: chunkStartOffset + trimmed.length,
        });
        chunkIndex++;

        // Prepare next chunk with overlap
        const overlapSlice = currentChunkText.slice(-overlapSize).trim();
        currentChunkText = overlapSlice ? `${overlapSlice}\n` : "";
        chunkStartOffset = globalCharOffset + lines[lIdx].length - (overlapSlice?.length || 0);
        chunkPageNumber = page.pageNumber;
      }

      globalCharOffset += lines[lIdx].length + 1;
    }

    // Flush any remaining text on the page if substantial
    if (currentChunkText.trim().length >= 100) {
      const trimmed = currentChunkText.trim();
      chunks.push({
        id: `${documentId}_chunk_${chunkIndex}`,
        documentId,
        chunkIndex,
        pageNumber: chunkPageNumber,
        sectionTitle: currentSectionTitle,
        content: trimmed,
        normalizedContent: normalizeText(trimmed),
        startChar: chunkStartOffset,
        endChar: chunkStartOffset + trimmed.length,
      });
      chunkIndex++;
      currentChunkText = "";
    }
  }

  // If document was very short and nothing was flushed yet
  if (chunks.length === 0 && pages.length > 0) {
    const fullText = pages.map((p) => p.text).join("\n\n").trim();
    if (fullText.length > 0) {
      chunks.push({
        id: `${documentId}_chunk_0`,
        documentId,
        chunkIndex: 0,
        pageNumber: 1,
        sectionTitle: currentSectionTitle,
        content: fullText,
        normalizedContent: normalizeText(fullText),
        startChar: 0,
        endChar: fullText.length,
      });
    }
  }

  return chunks;
}
