"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Highlighter,
  X,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { DocumentDetail, ActiveHighlight } from "@/types";

interface PdfPageProxy {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  render: (options: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
}

interface PdfDocumentProxy {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPageProxy>;
}

interface DocumentViewerProps {
  document: DocumentDetail | null;
  activeHighlight: ActiveHighlight | null;
  onClearHighlight: () => void;
  onCloseViewer?: () => void;
  onBackToChatMobile?: () => void;
}

export function DocumentViewer({
  document,
  activeHighlight,
  onClearHighlight,
  onCloseViewer,
  onBackToChatMobile,
}: DocumentViewerProps) {
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const docxContentRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<PdfDocumentProxy | null>(null);

  const currentPage = activeHighlight?.pageNumber ?? selectedPage ?? 1;

  const renderPdfPage = useCallback(async (pageNum: number, pdf: PdfDocumentProxy) => {
    if (!canvasRef.current || !pdf) return;

    try {
      const page = await pdf.getPage(pageNum);
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) return;

      const scale = (zoomLevel / 100) * 1.5;
      const viewport = page.getViewport({ scale });

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport,
      };

      await page.render(renderContext).promise;
    } catch (err) {
      console.warn("Error rendering canvas page:", err);
    }
  }, [zoomLevel]);

  // Load PDF when document changes
  useEffect(() => {
    if (!document || document.fileType !== "pdf") {
      pdfDocRef.current = null;
      return;
    }

    let isMounted = true;

    async function loadPdf() {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const loadingTask = pdfjsLib.getDocument({
          url: `/api/documents/file/${encodeURIComponent(document?.filePath || "")}`,
        });

        const pdf = (await loadingTask.promise) as unknown as PdfDocumentProxy;
        if (isMounted) {
          pdfDocRef.current = pdf;
          renderPdfPage(currentPage, pdf);
        }
      } catch (err: unknown) {
        console.warn("PDF.js render fallback to extracted text view:", err);
      }
    }

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [document, currentPage, renderPdfPage]);

  // Re-render PDF page on page change or zoom
  useEffect(() => {
    if (pdfDocRef.current && document?.fileType === "pdf") {
      renderPdfPage(currentPage, pdfDocRef.current);
    }
  }, [currentPage, renderPdfPage, document?.fileType]);

  // DOCX highlight handling: scroll into view and apply highlight styles
  useEffect(() => {
    if (document?.fileType === "docx" && docxContentRef.current && activeHighlight?.quote) {
      const container = docxContentRef.current;
      const cleanQuote = activeHighlight.quote.toLowerCase();

      const paragraphs = container.querySelectorAll("p");
      let foundMatch = false;

      paragraphs.forEach((p) => {
        p.classList.remove(
          "ring-2",
          "ring-[#C5A880]",
          "bg-[#C5A880]/20",
          "dark:bg-[#C5A880]/30",
          "transition-all"
        );
        const text = p.textContent?.toLowerCase() || "";
        if (text.includes(cleanQuote) || cleanQuote.includes(text.slice(0, 40))) {
          p.classList.add(
            "ring-2",
            "ring-[#C5A880]",
            "bg-[#C5A880]/20",
            "dark:bg-[#C5A880]/30",
            "transition-all",
            "duration-300",
            "rounded",
            "p-1"
          );
          if (!foundMatch) {
            p.scrollIntoView({ behavior: "smooth", block: "center" });
            foundMatch = true;
          }
        }
      });
    }
  }, [activeHighlight, document?.id, document?.fileType]);

  if (!document) {
    return (
      <div className="w-full lg:w-[48%] hidden lg:flex flex-col items-center justify-center h-full bg-[#FAF8F5] dark:bg-[#0C0D10] text-zinc-400 p-8 text-center border-l border-[#E6E2D9] dark:border-[#242730]">
        <div className="w-12 h-12 rounded-xl bg-white dark:bg-zinc-850 flex items-center justify-center mb-3 shadow-xs text-zinc-400 border border-[#E6E2D9] dark:border-[#2C303B]">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="text-xs font-semibold uppercase tracking-wider font-mono text-zinc-700 dark:text-zinc-300">
          Split Document Viewer
        </h3>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 max-w-xs mt-1 leading-relaxed">
          Open a contract from the library or click &ldquo;Open&rdquo; on any verified evidence quote to inspect synchronized text.
        </p>
      </div>
    );
  }

  const currentPageData = document.pages.find((p) => p.pageNumber === currentPage);

  const renderHighlightedText = (text: string) => {
    const highlightTarget = activeHighlight?.quote.trim() || "";
    if (!highlightTarget || highlightTarget.length < 3) {
      return text;
    }

    const cleanTarget = highlightTarget.toLowerCase();
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const lowerText = text.toLowerCase();

    while (true) {
      const idx = lowerText.indexOf(cleanTarget, lastIndex);
      if (idx === -1) {
        parts.push(text.slice(lastIndex));
        break;
      }

      parts.push(text.slice(lastIndex, idx));
      parts.push(
        <mark
          key={`hl_${idx}`}
          className="bg-[#C5A880]/30 dark:bg-[#C5A880]/40 text-zinc-950 dark:text-white px-1.5 py-0.5 rounded ring-2 ring-[#C5A880] font-serif shadow-xs"
        >
          {text.slice(idx, idx + cleanTarget.length)}
        </mark>
      );
      lastIndex = idx + cleanTarget.length;
    }

    return parts;
  };

  return (
    <div className="w-full flex flex-col h-full bg-[#FAF8F5] dark:bg-[#0F1116] overflow-hidden relative">
      {/* Top Controls Toolbar */}
      <header className="px-4 py-2.5 bg-white/95 dark:bg-[#111216]/95 backdrop-blur-md border-b border-[#E6E2D9] dark:border-[#242730] flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded shrink-0 ${
              document.fileType === "pdf"
                ? "bg-[#FDF0F0] text-[#A82E2E] dark:bg-red-950/40 dark:text-red-300"
                : "bg-[#EBF5FA] text-[#1F6C9F] dark:bg-blue-950/40 dark:text-blue-300"
            }`}
          >
            {document.fileType.toUpperCase()}
          </span>

          <span
            className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate font-serif"
            title={document.name}
          >
            {document.name}
          </span>
        </div>

        {/* Page navigation and zoom */}
        <div className="flex items-center gap-1.5">
          {document.pageCount > 1 && (
            <div className="flex items-center gap-0.5 bg-[#FAF8F5] dark:bg-[#1A1D24] border border-[#E6E2D9] dark:border-[#2C303B] rounded-md p-0.5 text-xs text-zinc-700 dark:text-zinc-300">
              <button
                disabled={currentPage <= 1}
                onClick={() => setSelectedPage(Math.max(1, currentPage - 1))}
                className="p-1 hover:bg-white dark:hover:bg-zinc-700 rounded disabled:opacity-30 transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>

              <span className="px-1 text-[10px] font-mono">
                {currentPage} / {document.pageCount}
              </span>

              <button
                disabled={currentPage >= document.pageCount}
                onClick={() => setSelectedPage(Math.min(document.pageCount, currentPage + 1))}
                className="p-1 hover:bg-white dark:hover:bg-zinc-700 rounded disabled:opacity-30 transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Zoom controls */}
          <div className="flex items-center gap-0.5 bg-[#FAF8F5] dark:bg-[#1A1D24] border border-[#E6E2D9] dark:border-[#2C303B] rounded-md p-0.5 text-xs text-zinc-700 dark:text-zinc-300">
            <button
              onClick={() => setZoomLevel((z) => Math.max(60, z - 15))}
              className="p-1 hover:bg-white dark:hover:bg-zinc-700 rounded transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="px-1 text-[10px] font-mono">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(180, z + 15))}
              className="p-1 hover:bg-white dark:hover:bg-zinc-700 rounded transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>

          {onCloseViewer && (
            <button
              onClick={onCloseViewer}
              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              title="Close viewer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* Active Citation Highlight Status Banner */}
      <AnimatePresence>
        {activeHighlight && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-[#C5A880]/15 dark:bg-[#C5A880]/20 border-b border-[#C5A880]/40 px-4 py-2 flex items-center justify-between text-xs text-[#8F6E3B] dark:text-[#D8BE96] z-10"
          >
            <div className="flex items-center gap-2 truncate">
              <Highlighter className="w-3.5 h-3.5 shrink-0 text-[#C5A880]" />
              <span className="truncate text-[11px]">
                <strong>Citation highlight active:</strong> Page {activeHighlight.pageNumber} &ldquo;{activeHighlight.quote.slice(0, 50)}...&rdquo;
              </span>
            </div>

            <button
              onClick={onClearHighlight}
              className="text-[10px] font-mono font-bold hover:underline ml-2 shrink-0 bg-white/60 dark:bg-black/40 px-2 py-0.5 rounded"
              title="Clear highlight"
            >
              Clear
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Document Content Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 lg:p-6 flex flex-col items-center scrollbar-thin"
      >
        {document.fileType === "pdf" ? (
          <div className="w-full flex flex-col items-center space-y-4">
            {/* Visual Canvas */}
            <div className="bg-white dark:bg-[#14161C] rounded-sm border border-[#E6E2D9] dark:border-[#262A34] overflow-hidden relative shadow-xs">
              <canvas ref={canvasRef} className="max-w-full h-auto block" />
            </div>

            {/* Synchronized Exact Text Layer with Interactive Highlighting */}
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
              className="w-full max-w-2xl parchment-sheet rounded-xl p-6 lg:p-8 font-serif text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap select-text"
            >
              <div className="border-b border-[#E6E2D9]/70 dark:border-[#262A34] pb-2 mb-4 flex items-center justify-between font-mono text-[10px] text-zinc-400">
                <span className="flex items-center gap-1.5 font-semibold text-[#8F6E3B] dark:text-[#D8BE96]">
                  <Sparkles className="w-3.5 h-3.5 text-[#C5A880]" />
                  DOCUMENT SYNCHRONIZED TEXT LAYER (PAGE {currentPage})
                </span>
                <span>{currentPageData?.text.length || 0} characters</span>
              </div>

              {currentPageData
                ? renderHighlightedText(currentPageData.text)
                : "No text extracted on this page."}
            </div>
          </div>
        ) : (
          /* DOCX Formatted Preview with Paragraph Anchors */
          <div
            ref={docxContentRef}
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
            className="w-full max-w-2xl parchment-sheet rounded-xl p-6 lg:p-8 text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 select-text prose dark:prose-invert max-w-none font-serif"
            dangerouslySetInnerHTML={{
              __html: document.htmlContent || `<pre>${document.extractedText || ""}</pre>`,
            }}
          />
        )}
      </div>

      {/* Mobile Floating "Back to Chat" Button */}
      {onBackToChatMobile && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="lg:hidden absolute bottom-4 right-4 z-20"
        >
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onBackToChatMobile}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#16171B] dark:bg-[#F2F1EE] text-white dark:text-[#16171B] rounded-full shadow-lg text-xs font-medium"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Return to Inquiry</span>
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
