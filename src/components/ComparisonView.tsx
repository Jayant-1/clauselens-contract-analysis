"use client";

import React, { useState } from "react";
import { motion } from "motion/react";
import {
  GitCompare,
  X,
  AlertCircle,
  Check,
  ArrowRight,
  ArrowUpRight,
  Scale,
  ShieldAlert,
} from "lucide-react";
import { DocumentSummary } from "@/types";
import {
  ComparisonReport,
  SignificanceLevel,
  DifferenceType,
} from "@/lib/comparison";

interface ComparisonViewProps {
  documents: DocumentSummary[];
  onClose: () => void;
  onOpenClauseInDoc: (docId: string, pageNumber: number, quote: string) => void;
}

export function ComparisonView({
  documents,
  onClose,
  onOpenClauseInDoc,
}: ComparisonViewProps) {
  const [docAId, setDocAId] = useState<string>(documents[0]?.id || "");
  const [docBId, setDocBId] = useState<string>(documents[1]?.id || documents[0]?.id || "");
  const [isComparing, setIsComparing] = useState(false);
  const [report, setReport] = useState<ComparisonReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterSignificance, setFilterSignificance] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  const runComparison = async () => {
    if (!docAId || !docBId || docAId === docBId) {
      setError("Please select two distinct contracts to compare.");
      return;
    }

    try {
      setIsComparing(true);
      setError(null);

      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docAId, docBId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to compare contracts.");
      }

      setReport(data.report);
      setIsComparing(false);
    } catch (err: unknown) {
      setIsComparing(false);
      setError(err instanceof Error ? err.message : "Comparison failed.");
    }
  };

  const getSignificanceBadge = (significance: SignificanceLevel) => {
    switch (significance) {
      case "high":
        return (
          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-[#FDF0F0] text-[#A82E2E] dark:bg-red-950/40 dark:text-red-300 border border-[#A82E2E]/20 flex items-center gap-1">
            <ShieldAlert className="w-2.5 h-2.5" />
            HIGH SIGNIFICANCE
          </span>
        );
      case "medium":
        return (
          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-[#FEF7EB] text-[#96610B] dark:bg-yellow-950/40 dark:text-yellow-300 border border-[#96610B]/20">
            MEDIUM
          </span>
        );
      case "low":
        return (
          <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            LOW
          </span>
        );
    }
  };

  const getTypeBadge = (type: DifferenceType) => {
    switch (type) {
      case "added":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-[#EDF8F1] text-[#1B663B] dark:bg-emerald-950/40 dark:text-[#86EFAC]">
            + Added
          </span>
        );
      case "removed":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-[#FDF0F0] text-[#A82E2E] dark:bg-red-950/40 dark:text-red-300">
            - Removed
          </span>
        );
      case "modified":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-[#EBF5FA] text-[#1F6C9F] dark:bg-blue-950/40 dark:text-blue-300">
            ~ Modified
          </span>
        );
      default:
        return null;
    }
  };

  const filteredDifferences = (report?.differences || []).filter((diff) => {
    if (filterSignificance !== "all" && diff.significance !== filterSignificance) return false;
    if (filterType !== "all" && diff.type !== filterType) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="bg-white dark:bg-[#111216] border border-[#E6E2D9] dark:border-[#242730] rounded-xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Top Header */}
        <header className="px-5 py-3.5 border-b border-[#E6E2D9] dark:border-[#242730] flex items-center justify-between bg-[#FBF9F6] dark:bg-[#0C0D10] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#16171B] dark:bg-[#F2F1EE] text-[#C5A880] dark:text-[#8F6E3B] flex items-center justify-center shadow-xs">
              <GitCompare className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 tracking-wider uppercase font-mono">
                Contract Clause Comparison &amp; Material Diff
              </h2>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                Identify added, removed, and modified clauses, liability cap changes, and governing law shifts.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Contract Selectors Bar */}
        <div className="px-5 py-3 border-b border-[#E6E2D9] dark:border-[#242730] bg-white dark:bg-[#111216] flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <div className="flex-1">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                BASE CONTRACT (VERSION A)
              </label>
              <select
                value={docAId}
                onChange={(e) => setDocAId(e.target.value)}
                className="w-full text-xs rounded-md border border-[#D5CFC4] dark:border-[#2C303B] bg-white dark:bg-[#15171D] px-2.5 py-1.5 font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#C5A880]"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4 text-[#C5A880]">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>

            <div className="flex-1">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                COMPARED CONTRACT (VERSION B)
              </label>
              <select
                value={docBId}
                onChange={(e) => setDocBId(e.target.value)}
                className="w-full text-xs rounded-md border border-[#D5CFC4] dark:border-[#2C303B] bg-white dark:bg-[#15171D] px-2.5 py-1.5 font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-[#C5A880]"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={runComparison}
            disabled={isComparing || docAId === docBId}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#16171B] hover:bg-[#272930] dark:bg-[#F2F1EE] dark:text-[#16171B] dark:hover:bg-white disabled:opacity-40 rounded-md transition-colors shadow-xs shrink-0"
          >
            {isComparing ? "Analyzing Differences..." : "Compare Contracts"}
          </motion.button>
        </div>

        {error && (
          <div className="p-3 mx-5 mt-3 bg-[#FDF0F0] dark:bg-red-950/30 border border-[#A82E2E]/20 rounded-md text-[#A82E2E] dark:text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Report Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 scrollbar-thin">
          {!report && !isComparing ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-400">
              <Scale className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mb-2" />
              <h3 className="text-xs font-mono uppercase tracking-wider font-semibold text-zinc-700 dark:text-zinc-300">
                Ready for Version Comparison
              </h3>
              <p className="text-xs max-w-sm mt-1 leading-relaxed text-zinc-400 dark:text-zinc-500">
                Select two contracts above and click &ldquo;Compare Contracts&rdquo; to generate substantive legal diff analysis.
              </p>
            </div>
          ) : isComparing ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-8 h-8 border-2 border-[#C5A880] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                Extracting clauses, comparing material values, and rating significance...
              </p>
            </div>
          ) : report ? (
            <>
              {/* Executive Substantive Changes Summary */}
              <div className="bg-[#FAF8F5] dark:bg-[#14161C] border border-[#E6E2D9] dark:border-[#262A34] rounded-lg p-4 shadow-2xs">
                <h3 className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[#1B663B] dark:text-[#86EFAC]" />
                  <span>Substantive Legal Changes Summary</span>
                </h3>
                <div className="text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-line font-serif">
                  {report.summary}
                </div>
              </div>

              {/* Stats Cards (Flat Bento Grid) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-[#15171D] border border-[#E6E2D9] dark:border-[#262A34] p-3 rounded-lg shadow-2xs">
                  <div className="text-[10px] font-mono uppercase text-zinc-400">TOTAL CLAUSES</div>
                  <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5 font-serif">
                    {report.stats.totalClausesA} vs {report.stats.totalClausesB}
                  </div>
                </div>

                <div className="bg-[#FDF0F0]/60 dark:bg-red-950/20 border border-[#A82E2E]/20 p-3 rounded-lg">
                  <div className="text-[10px] font-mono uppercase text-[#A82E2E] dark:text-red-300">
                    HIGH SIGNIFICANCE
                  </div>
                  <div className="text-base font-semibold text-[#A82E2E] dark:text-red-300 mt-0.5 font-serif">
                    {report.stats.highSignificanceCount}
                  </div>
                </div>

                <div className="bg-[#FEF7EB]/60 dark:bg-yellow-950/20 border border-[#96610B]/20 p-3 rounded-lg">
                  <div className="text-[10px] font-mono uppercase text-[#96610B] dark:text-yellow-300">
                    MEDIUM SIGNIFICANCE
                  </div>
                  <div className="text-base font-semibold text-[#96610B] dark:text-yellow-300 mt-0.5 font-serif">
                    {report.stats.mediumSignificanceCount}
                  </div>
                </div>

                <div className="bg-[#EBF5FA]/60 dark:bg-blue-950/20 border border-[#1F6C9F]/20 p-3 rounded-lg">
                  <div className="text-[10px] font-mono uppercase text-[#1F6C9F] dark:text-blue-300">
                    MODIFIED CLAUSES
                  </div>
                  <div className="text-base font-semibold text-[#1F6C9F] dark:text-blue-300 mt-0.5 font-serif">
                    {report.stats.modifiedCount}
                  </div>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="flex items-center justify-between gap-4 pt-1 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-mono text-zinc-400 mr-1">Significance:</span>
                    {(["all", "high", "medium", "low"] as const).map((sig) => (
                      <button
                        key={sig}
                        onClick={() => setFilterSignificance(sig)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider transition-colors ${
                          filterSignificance === sig
                            ? "bg-[#16171B] text-white dark:bg-[#F2F1EE] dark:text-[#16171B]"
                            : "bg-[#FAF8F5] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200"
                        }`}
                      >
                        {sig}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-mono text-zinc-400 mr-1">Type:</span>
                    {(["all", "added", "removed", "modified"] as const).map((typ) => (
                      <button
                        key={typ}
                        onClick={() => setFilterType(typ)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider transition-colors ${
                          filterType === typ
                            ? "bg-[#16171B] text-white dark:bg-[#F2F1EE] dark:text-[#16171B]"
                            : "bg-[#FAF8F5] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200"
                        }`}
                      >
                        {typ}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-[11px] font-mono text-zinc-400">
                  Showing {filteredDifferences.length} of {report.differences.length} changes
                </div>
              </div>

              {/* Differences List */}
              <div className="space-y-3">
                {filteredDifferences.map((diff) => (
                  <div
                    key={diff.id}
                    className="border border-[#E6E2D9] dark:border-[#262A34] rounded-lg bg-white dark:bg-[#14161C] p-4 space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {getTypeBadge(diff.type)}
                        <h4 className="font-semibold text-xs text-zinc-900 dark:text-zinc-100 font-serif">
                          {diff.clauseTitle}
                        </h4>
                      </div>

                      {getSignificanceBadge(diff.significance)}
                    </div>

                    {/* Substantive summary for this clause */}
                    <div className="text-xs text-zinc-700 dark:text-zinc-300 bg-[#FAF8F5] dark:bg-[#181A22] p-2.5 rounded border border-[#E6E2D9]/80 dark:border-[#282C38]">
                      <strong className="text-zinc-900 dark:text-zinc-100 font-mono text-[11px]">Material Change:</strong>{" "}
                      {diff.substantiveChange}
                    </div>

                    {/* Side-by-Side Clause Text Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {/* Doc A */}
                      <div className="border border-[#E6E2D9] dark:border-[#262A34] rounded p-3 bg-[#FAF8F5]/60 dark:bg-zinc-950/40">
                        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1.5">
                          <span>VERSION A ({report.docAName})</span>
                          {diff.docAClause && (
                            <button
                              onClick={() => {
                                onClose();
                                onOpenClauseInDoc(
                                  report.docAId,
                                  diff.docAClause!.pageNumber,
                                  diff.docAClause!.content.slice(0, 100)
                                );
                              }}
                              className="text-[#8F6E3B] dark:text-[#D8BE96] hover:underline flex items-center gap-0.5"
                            >
                              p.{diff.docAClause.pageNumber} <ArrowUpRight className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>

                        <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed max-h-40 overflow-y-auto font-serif text-[11px] whitespace-pre-wrap">
                          {diff.docAClause?.content || (
                            <span className="italic text-zinc-400 font-sans">Clause does not exist in Version A</span>
                          )}
                        </div>
                      </div>

                      {/* Doc B */}
                      <div className="border border-[#E6E2D9] dark:border-[#262A34] rounded p-3 bg-[#FAF8F5]/60 dark:bg-zinc-950/40">
                        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mb-1.5">
                          <span>VERSION B ({report.docBName})</span>
                          {diff.docBClause && (
                            <button
                              onClick={() => {
                                onClose();
                                onOpenClauseInDoc(
                                  report.docBId,
                                  diff.docBClause!.pageNumber,
                                  diff.docBClause!.content.slice(0, 100)
                                );
                              }}
                              className="text-[#8F6E3B] dark:text-[#D8BE96] hover:underline flex items-center gap-0.5"
                            >
                              p.{diff.docBClause.pageNumber} <ArrowUpRight className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>

                        <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed max-h-40 overflow-y-auto font-serif text-[11px] whitespace-pre-wrap">
                          {diff.docBClause?.content || (
                            <span className="italic text-zinc-400 font-sans">Clause does not exist in Version B</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
