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
  viewMode?: "split" | "chat" | "document";
}

export function DocumentViewer({
  document,
  activeHighlight,
  onClearHighlight,
  onCloseViewer,
  onBackToChatMobile,
  viewMode = "split",
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
          "ring-blue-500",
          "bg-blue-100/70",
          "transition-all"
        );
        const text = p.textContent?.toLowerCase() || "";
        if (text.includes(cleanQuote) || cleanQuote.includes(text.slice(0, 40))) {
          p.classList.add(
            "ring-2",
            "ring-blue-500",
            "bg-blue-100/70",
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
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#FAFAF8] text-zinc-400 p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center mb-3 shadow-xs text-[#1E3A8A] border border-[#E5E5E2]">
          <FileText className="w-6 h-6" />
        </div>
        <h3 className="font-editorial text-sm font-semibold text-zinc-700">
          Document Reader
        </h3>
        <p className="text-xs text-zinc-500 max-w-xs mt-1 leading-relaxed font-sans">
          Select an agreement from the portfolio or click &ldquo;Inspect&rdquo; on any verified evidence quote to read synchronized text.
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
          className="bg-blue-100 text-blue-950 px-1.5 py-0.5 rounded ring-1 ring-blue-400 font-editorial shadow-2xs"
        >
          {text.slice(idx, idx + cleanTarget.length)}
        </mark>
      );
      lastIndex = idx + cleanTarget.length;
    }

    return parts;
  };

  return (
    <div className="w-full flex flex-col h-full bg-[#FAFAF8] overflow-hidden relative text-zinc-900 font-sans">
      {/* Top Controls Toolbar */}
      <header className="px-4 lg:px-6 py-3 bg-white border-b border-[#E5E5E2] flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-[#E5E5E2] uppercase shrink-0">
            {document.fileType}
          </span>

          <span
            className="font-editorial text-sm font-semibold text-zinc-900 truncate"
            title={document.name}
          >
            {document.name}
          </span>
        </div>

        {/* Page navigation and zoom */}
        <div className="flex items-center gap-1.5">
          {document.pageCount > 1 && (
            <div className="flex items-center gap-0.5 bg-[#FAFAF8] border border-[#E5E5E2] rounded-lg p-0.5 text-xs text-zinc-700">
              <button
                disabled={currentPage <= 1}
                onClick={() => setSelectedPage(Math.max(1, currentPage - 1))}
                className="p-1 hover:bg-white rounded disabled:opacity-30 transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="px-1.5 text-[11px] font-mono">
                {currentPage} / {document.pageCount}
              </span>

              <button
                disabled={currentPage >= document.pageCount}
                onClick={() => setSelectedPage(Math.min(document.pageCount, currentPage + 1))}
                className="p-1 hover:bg-white rounded disabled:opacity-30 transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Zoom controls */}
          <div className="flex items-center gap-0.5 bg-[#FAFAF8] border border-[#E5E5E2] rounded-lg p-0.5 text-xs text-zinc-700">
            <button
              onClick={() => setZoomLevel((z) => Math.max(60, z - 15))}
              className="p-1 hover:bg-white rounded transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 text-[11px] font-mono">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(180, z + 15))}
              className="p-1 hover:bg-white rounded transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {onCloseViewer && (
            <button
              onClick={onCloseViewer}
              className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors rounded-lg hover:bg-[#FAFAF8]"
              title="Close viewer"
            >
              <X className="w-4 h-4" />
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
            className="bg-blue-50/80 border-b border-blue-200 px-4 lg:px-6 py-2 flex items-center justify-between text-xs text-blue-900 z-10"
          >
            <div className="flex items-center gap-2 truncate">
              <Highlighter className="w-3.5 h-3.5 shrink-0 text-[#1E3A8A]" />
              <span className="truncate text-xs">
                <strong>Citation highlight:</strong> Page {activeHighlight.pageNumber} &ldquo;{activeHighlight.quote.slice(0, 60)}...&rdquo;
              </span>
            </div>

            <button
              onClick={onClearHighlight}
              className="text-[11px] font-mono font-medium hover:underline ml-2 shrink-0 bg-white border border-blue-200 text-[#1E3A8A] px-2 py-0.5 rounded shadow-2xs"
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
        className="flex-1 overflow-y-auto p-4 lg:p-8 flex flex-col items-center scrollbar-thin bg-[#FAFAF8]"
      >
        {document.fileType === "pdf" ? (
          <div className="w-full flex flex-col items-center space-y-4">
            {/* Visual Canvas */}
            <div className="bg-white rounded-lg border border-[#E5E5E2] overflow-hidden relative shadow-xs">
              <canvas ref={canvasRef} className="max-w-full h-auto block" />
            </div>

            {/* Synchronized Exact Text Layer with Interactive Highlighting */}
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "top center" }}
              className={`w-full ${
                viewMode === "document" ? "max-w-4xl" : "max-w-2xl"
              } bg-white rounded-xl border border-[#E5E5E2] shadow-xs p-6 lg:p-10 font-editorial text-sm leading-relaxed text-zinc-800 whitespace-pre-wrap select-text`}
            >
              <div className="border-b border-[#E5E5E2] pb-2 mb-4 flex items-center justify-between font-mono text-[10px] text-zinc-400">
                <span className="flex items-center gap-1.5 font-medium text-[#1E3A8A]">
                  <Sparkles className="w-3.5 h-3.5 text-[#1E3A8A]" />
                  SYNCHRONIZED CLAUSE LAYER · PAGE {currentPage}
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
            className={`w-full ${
              viewMode === "document" ? "max-w-4xl" : "max-w-2xl"
            } bg-white rounded-xl border border-[#E5E5E2] shadow-xs p-6 lg:p-10 text-sm leading-relaxed text-zinc-800 select-text font-editorial`}
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
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1E3A8A] hover:bg-[#172554] text-white rounded-full shadow-lg text-xs font-medium"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Return to Inquiry</span>
          </motion.button>
        </motion.div>
      )}
    </div>
  );
}
