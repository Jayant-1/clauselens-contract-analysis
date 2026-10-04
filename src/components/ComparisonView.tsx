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
          <span className="px-2 py-0.5 rounded text-[9px] font-grotesk font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200 flex items-center gap-1">
            <ShieldAlert className="w-2.5 h-2.5" />
            HIGH SIGNIFICANCE
          </span>
        );
      case "medium":
        return (
          <span className="px-2 py-0.5 rounded text-[9px] font-grotesk font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
            MEDIUM
          </span>
        );
      case "low":
        return (
          <span className="px-2 py-0.5 rounded text-[9px] font-grotesk font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
            LOW
          </span>
        );
    }
  };

  const getTypeBadge = (type: DifferenceType) => {
    switch (type) {
      case "added":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            + Added
          </span>
        );
      case "removed":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-red-50 text-red-700 border border-red-200">
            - Removed
          </span>
        );
      case "modified":
        return (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
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
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans text-slate-900"
      >
        {/* Top Header */}
        <header className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#2563EB] text-white flex items-center justify-center shadow-xs">
              <GitCompare className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 tracking-wider uppercase font-grotesk">
                Contract Clause Comparison &amp; Material Diff
              </h2>
              <p className="text-[11px] text-slate-500 font-sans">
                Identify added, removed, and modified clauses, liability cap changes, and governing law shifts.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Contract Selectors Bar */}
        <div className="px-5 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <div className="flex-1">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1 font-semibold">
                BASE CONTRACT (VERSION A)
              </label>
              <select
                value={docAId}
                onChange={(e) => setDocAId(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-medium text-slate-900 focus:outline-none focus:border-blue-500"
              >
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-4 text-[#2563EB]">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>

            <div className="flex-1">
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1 font-semibold">
                COMPARED CONTRACT (VERSION B)
              </label>
              <select
                value={docBId}
                onChange={(e) => setDocBId(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-medium text-slate-900 focus:outline-none focus:border-blue-500"
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
            className="px-4 py-2 text-xs font-grotesk font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-40 rounded-lg transition-colors shadow-xs shrink-0"
          >
            {isComparing ? "Analyzing Differences..." : "Compare Contracts"}
          </motion.button>
        </div>

        {error && (
          <div className="p-3 mx-5 mt-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Report Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 scrollbar-thin bg-slate-50">
          {!report && !isComparing ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <Scale className="w-10 h-10 text-slate-300 mb-2" />
              <h3 className="text-xs font-grotesk uppercase tracking-wider font-bold text-slate-700">
                Ready for Version Comparison
              </h3>
              <p className="text-xs max-w-sm mt-1 leading-relaxed text-slate-500 font-sans">
                Select two contracts above and click &ldquo;Compare Contracts&rdquo; to generate substantive legal diff analysis.
              </p>
            </div>
          ) : isComparing ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-mono text-slate-600">
                Extracting clauses, comparing material values, and rating significance...
              </p>
            </div>
          ) : report ? (
            <>
              {/* Executive Substantive Changes Summary */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <h3 className="text-[10px] font-grotesk font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Substantive Legal Changes Summary</span>
                </h3>
                <div className="text-xs leading-relaxed text-slate-800 whitespace-pre-line font-legal-serif">
                  {report.summary}
                </div>
              </div>

              {/* Stats Cards (Flat Bento Grid) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-xs">
                  <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold">TOTAL CLAUSES</div>
                  <div className="text-base font-bold text-slate-900 mt-0.5 font-grotesk">
                    {report.stats.totalClausesA} vs {report.stats.totalClausesB}
                  </div>
                </div>

                <div className="bg-red-50/60 border border-red-200 p-3 rounded-xl">
                  <div className="text-[10px] font-mono uppercase text-red-700 font-semibold">
                    HIGH SIGNIFICANCE
                  </div>
                  <div className="text-base font-bold text-red-700 mt-0.5 font-grotesk">
                    {report.stats.highSignificanceCount}
                  </div>
                </div>

                <div className="bg-amber-50/60 border border-amber-200 p-3 rounded-xl">
                  <div className="text-[10px] font-mono uppercase text-amber-800 font-semibold">
                    MEDIUM SIGNIFICANCE
                  </div>
                  <div className="text-base font-bold text-amber-800 mt-0.5 font-grotesk">
                    {report.stats.mediumSignificanceCount}
                  </div>
                </div>

                <div className="bg-blue-50/60 border border-blue-200 p-3 rounded-xl">
                  <div className="text-[10px] font-mono uppercase text-blue-700 font-semibold">
                    MODIFIED CLAUSES
                  </div>
                  <div className="text-base font-bold text-blue-700 mt-0.5 font-grotesk">
                    {report.stats.modifiedCount}
                  </div>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="flex items-center justify-between gap-4 pt-1 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-mono text-slate-500 mr-1">Significance:</span>
                    {(["all", "high", "medium", "low"] as const).map((sig) => (
                      <button
                        key={sig}
                        onClick={() => setFilterSignificance(sig)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider transition-colors ${
                          filterSignificance === sig
                            ? "bg-[#2563EB] text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {sig}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-mono text-slate-500 mr-1">Type:</span>
                    {(["all", "added", "removed", "modified"] as const).map((typ) => (
                      <button
                        key={typ}
                        onClick={() => setFilterType(typ)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider transition-colors ${
                          filterType === typ
                            ? "bg-[#2563EB] text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {typ}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-[11px] font-mono text-slate-500">
                  Showing {filteredDifferences.length} of {report.differences.length} changes
                </div>
              </div>

              {/* Differences List */}
              <div className="space-y-3">
                {filteredDifferences.map((diff) => (
                  <div
                    key={diff.id}
                    className="border border-slate-200 rounded-xl bg-white p-4 space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {getTypeBadge(diff.type)}
                        <h4 className="font-bold text-xs text-slate-900 font-grotesk">
                          {diff.clauseTitle}
                        </h4>
                      </div>

                      {getSignificanceBadge(diff.significance)}
                    </div>

                    {/* Substantive summary for this clause */}
                    <div className="text-xs text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <strong className="text-slate-900 font-mono text-[11px]">Material Change:</strong>{" "}
                      {diff.substantiveChange}
                    </div>

                    {/* Side-by-Side Clause Text Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                      {/* Doc A */}
                      <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1.5 font-semibold">
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
                              className="text-[#2563EB] hover:underline flex items-center gap-0.5"
                            >
                              p.{diff.docAClause.pageNumber} <ArrowUpRight className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>

                        <div className="text-xs text-slate-800 leading-relaxed max-h-40 overflow-y-auto font-legal-serif text-[12px] whitespace-pre-wrap">
                          {diff.docAClause?.content || (
                            <span className="italic text-slate-400 font-sans">Clause does not exist in Version A</span>
                          )}
                        </div>
                      </div>

                      {/* Doc B */}
                      <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-1.5 font-semibold">
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
                              className="text-[#2563EB] hover:underline flex items-center gap-0.5"
                            >
                              p.{diff.docBClause.pageNumber} <ArrowUpRight className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>

                        <div className="text-xs text-slate-800 leading-relaxed max-h-40 overflow-y-auto font-legal-serif text-[12px] whitespace-pre-wrap">
                          {diff.docBClause?.content || (
                            <span className="italic text-slate-400 font-sans">Clause does not exist in Version B</span>
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
