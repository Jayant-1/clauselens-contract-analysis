import { extractText as extractPdfText } from "unpdf";
import mammoth from "mammoth";
import { normalizeText } from "./normalization";

export interface ParsedPage {
  pageNumber: number;
  text: string;
  normalizedText: string;
}

export interface ParsedDocument {
  fileType: "pdf" | "docx";
  pageCount: number;
  totalChars: number;
  extractedText: string;
  normalizedText: string;
  htmlContent: string | null;
  pages: ParsedPage[];
}

/**
 * Validates file extension and MIME type.
 * Throws a clear error if the file is not a PDF or DOCX.
 */
export function validateFileFormat(filename: string, mimeType?: string): "pdf" | "docx" {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (ext === "pdf" || mimeType === "application/pdf") {
    return "pdf";
  }

  if (
    ext === "docx" ||
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return "docx";
  }

  throw new Error(
    `Unsupported file format "${ext || "unknown"}". ClauseLens only supports PDF (.pdf) and Microsoft Word (.docx) contracts.`
  );
}

/**
 * Parses a PDF buffer:
 * - Extracts text page-by-page
 * - Detects scanned / image-only PDFs with no meaningful text
 * - Normalizes extracted text
 */
export async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  const uint8 = new Uint8Array(buffer);
  const result = await extractPdfText(uint8, { mergePages: false });

  const totalPages = result.totalPages || (Array.isArray(result.text) ? result.text.length : 1);
  const rawPages: string[] = Array.isArray(result.text) ? result.text : [result.text || ""];

  const pages: ParsedPage[] = rawPages.map((pageStr, idx) => {
    const text = pageStr ? pageStr.trim() : "";
    return {
      pageNumber: idx + 1,
      text,
      normalizedText: normalizeText(text),
    };
  });

  const fullText = pages.map((p) => p.text).join("\n\n").trim();
  const alphanumericCount = fullText.replace(/[^a-zA-Z0-9]/g, "").length;

  // Scanned / image-only PDF detection:
  // If the PDF has pages but virtually no alphanumeric characters, it is scanned/image-only.
  if (totalPages > 0 && (alphanumericCount < 30 || alphanumericCount / totalPages < 8)) {
    throw new Error(
      "OCR is not available / the PDF has no readable text. Scanned or image-only documents cannot be processed."
    );
  }

  return {
    fileType: "pdf",
    pageCount: totalPages,
    totalChars: fullText.length,
    extractedText: fullText,
    normalizedText: normalizeText(fullText),
    htmlContent: null,
    pages,
  };
}

/**
 * Parses a DOCX buffer:
 * - Extracts paragraphs while preserving paragraph order
 * - Embeds paragraph anchors in HTML preview for highlighting
 * - Normalizes extracted text
 */
export async function parseDocx(buffer: Buffer): Promise<ParsedDocument> {
  // Extract clean text
  const rawResult = await mammoth.extractRawText({ buffer });
  const rawText = rawResult.value.trim();

  if (!rawText || rawText.length < 10) {
    throw new Error("The DOCX document is empty or could not be read.");
  }

  // Convert to formatted HTML preview
  const htmlResult = await mammoth.convertToHtml({ buffer });
  let html = htmlResult.value;

  // Add paragraph IDs to HTML for citation highlighting
  let pIndex = 0;
  html = html.replace(/<p>/g, () => {
    const id = `p-anchor-${pIndex++}`;
    return `<p id="${id}" class="contract-para hover:bg-amber-50/50 transition-colors p-1 rounded" data-para-index="${pIndex - 1}">`;
  });

  // Split raw text into paragraphs
  const paragraphs = rawText
    .split(/\r?\n\r?\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // Group paragraphs into virtual pages (~4 paragraphs or ~2500 chars per page)
  const pages: ParsedPage[] = [];
  let currentPageText = "";
  let currentPageNum = 1;

  for (let i = 0; i < paragraphs.length; i++) {
    currentPageText += `${paragraphs[i]}\n\n`;
    if (currentPageText.length >= 2200 || i === paragraphs.length - 1) {
      const trimmed = currentPageText.trim();
      pages.push({
        pageNumber: currentPageNum,
        text: trimmed,
        normalizedText: normalizeText(trimmed),
      });
      currentPageNum++;
      currentPageText = "";
    }
  }

  return {
    fileType: "docx",
    pageCount: pages.length,
    totalChars: rawText.length,
    extractedText: rawText,
    normalizedText: normalizeText(rawText),
    htmlContent: html,
    pages,
  };
}

/**
 * Universal document parser entry point.
 */
export async function parseDocument(
  buffer: Buffer,
  filename: string,
  mimeType?: string
): Promise<ParsedDocument> {
  const fileType = validateFileFormat(filename, mimeType);

  if (fileType === "pdf") {
    return await parsePdf(buffer);
  } else {
    return await parseDocx(buffer);
  }
}
