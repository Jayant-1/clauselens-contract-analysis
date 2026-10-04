"use client";

import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  X,
  Printer,
  Copy,
  Check,
  Download,
  FileText,
  Scale,
} from "lucide-react";
import { DocumentDetail, ContractHealthAudit } from "@/types";
import { auditContractRisk } from "@/lib/risk-engine";
import { generateMarkdownReport, generateJsonReport } from "@/lib/diligence-report";
import { extractKeyTerms } from "@/lib/key-terms";

interface DiligenceReportModalProps {
  document: DocumentDetail | null;
  onClose: () => void;
}

export function DiligenceReportModal({
  document,
  onClose,
}: DiligenceReportModalProps) {
  const [activeTab, setActiveTab] = useState<"memo" | "markdown">("memo");
  const [copiedMd, setCopiedMd] = useState(false);

  const audit: ContractHealthAudit | null = useMemo(() => {
    if (!document) return null;
    return auditContractRisk({
      documentId: document.id,
      documentName: document.name,
      extractedText: document.extractedText || "",
      pages: document.pages,
    });
  }, [document]);

  const keyTerms = useMemo(() => {
    if (!document) return null;
    return extractKeyTerms(document.extractedText || "");
  }, [document]);

  const timestamp = useMemo(() => {
    return new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  const markdownContent = useMemo(() => {
    if (!document || !audit) return "";
    return generateMarkdownReport({
      document,
      audit,
      generatedAt: timestamp,
    });
  }, [document, audit, timestamp]);

  if (!document || !audit || !keyTerms) return null;

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const handleDownloadJson = () => {
    const jsonStr = generateJsonReport({
      document,
      audit,
      generatedAt: timestamp,
    });
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `diligence-report-${document.name.replace(/\.[^/.]+$/, "")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-5xl h-[92vh] bg-white rounded-2xl border border-[#E5E5E2] shadow-2xl flex flex-col overflow-hidden font-sans text-zinc-900"
      >
        {/* Modal Header */}
        <header className="px-6 py-4 border-b border-[#E5E5E2] bg-[#FAFAF8] flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1E3A8A] text-white flex items-center justify-center shadow-xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-editorial text-lg font-semibold tracking-tight text-zinc-900">
                  Legal Due Diligence Memorandum
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-md font-mono bg-zinc-100 text-zinc-600 border border-zinc-200">
                  Board & Partner Ready
                </span>
              </div>
              <p className="text-xs text-zinc-500 truncate max-w-md">
                Matter: <strong className="text-zinc-800">{document.name}</strong> • Evaluated on {timestamp}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher */}
            <div className="flex items-center bg-[#F4F4F0] border border-[#E5E5E2] rounded-lg p-0.5 text-xs mr-2">
              <button
                onClick={() => setActiveTab("memo")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  activeTab === "memo"
                    ? "bg-white text-zinc-900 font-semibold shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Executive Memo
              </button>
              <button
                onClick={() => setActiveTab("markdown")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  activeTab === "markdown"
                    ? "bg-white text-zinc-900 font-semibold shadow-2xs"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                Markdown
              </button>
            </div>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-lg transition-colors shadow-xs"
              title="Print or Save as PDF (Ctrl+P)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            {/* Copy Markdown */}
            <button
              onClick={handleCopyMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-50 border border-[#E5E5E2] rounded-lg transition-colors shadow-2xs"
            >
              {copiedMd ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Copy Markdown</span>
                </>
              )}
            </button>

            {/* Download JSON */}
            <button
              onClick={handleDownloadJson}
              className="p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
              title="Download structured JSON"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-[#FAFAF8] print:p-0 print:bg-white">
          {activeTab === "markdown" ? (
            <div className="bg-white p-6 rounded-xl border border-[#E5E5E2] shadow-2xs font-mono text-xs text-zinc-800 whitespace-pre-wrap leading-relaxed">
              {markdownContent}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-2xl border border-[#E5E5E2] shadow-xs print:shadow-none print:border-none space-y-8 text-zinc-900 font-sans">
              {/* Memorandum Masthead */}
              <div className="border-b-2 border-zinc-900 pb-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-zinc-500">
                    <Scale className="w-4 h-4 text-[#1E3A8A]" />
                    <span>ClauseLens Diligence Services</span>
                  </div>
                  <div className="text-xs font-mono text-zinc-400">
                    CONFIDENTIAL LEGAL WORK PRODUCT
                  </div>
                </div>

                <h1 className="font-editorial text-2xl md:text-3xl font-bold tracking-tight text-zinc-950">
                  LEGAL DUE DILIGENCE MEMORANDUM
                </h1>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-2">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">Agreement:</span>
                    <p className="font-semibold text-zinc-800 truncate">{document.name}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">Review Date:</span>
                    <p className="font-semibold text-zinc-800">{timestamp}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">Length / Format:</span>
                    <p className="font-semibold text-zinc-800">{document.pageCount} Pages ({document.fileType.toUpperCase()})</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">Overall Rating:</span>
                    <p className="font-semibold text-zinc-900">
                      Grade {audit.grade} ({audit.overallScore}/100)
                    </p>
                  </div>
                </div>
              </div>

              {/* 1. Executive Summary & Scorecard */}
              <div className="space-y-3">
                <h2 className="font-editorial text-lg font-semibold text-zinc-950">
                  1. Executive Summary & Health Scorecard
                </h2>
                <p className="text-xs text-zinc-700 leading-relaxed">{audit.summary}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 rounded-lg border border-red-200 bg-red-50/50 text-center">
                    <div className="text-2xl font-bold text-red-600">{audit.stats.criticalCount}</div>
                    <div className="text-[11px] font-medium text-red-800">Critical Flags</div>
                  </div>
                  <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/50 text-center">
                    <div className="text-2xl font-bold text-amber-600">{audit.stats.highCount}</div>
                    <div className="text-[11px] font-medium text-amber-800">High Risk Terms</div>
                  </div>
                  <div className="p-3 rounded-lg border border-yellow-200 bg-yellow-50/50 text-center">
                    <div className="text-2xl font-bold text-yellow-700">{audit.stats.mediumCount}</div>
                    <div className="text-[11px] font-medium text-yellow-800">Moderate Nuances</div>
                  </div>
                  <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 text-center">
                    <div className="text-2xl font-bold text-emerald-600">{audit.stats.compliantCount}</div>
                    <div className="text-[11px] font-medium text-emerald-800">Standard Clauses</div>
                  </div>
                </div>
              </div>

              {/* 2. Key Commercial Terms Table */}
              <div className="space-y-3">
                <h2 className="font-editorial text-lg font-semibold text-zinc-950">
                  2. Key Commercial Terms
                </h2>
                <div className="border border-[#E5E5E2] rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAFAF8] border-b border-[#E5E5E2] font-mono text-[10px] text-zinc-500 uppercase">
                      <tr>
                        <th className="p-3">Commercial Vector</th>
                        <th className="p-3">Extracted Provision</th>
                        <th className="p-3">Fiduciary Assessment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E5E2]">
                      <tr>
                        <td className="p-3 font-semibold text-zinc-800">Governing Law</td>
                        <td className="p-3 font-mono text-zinc-700">{keyTerms.governingLaw || "Not Specified / Silent"}</td>
                        <td className="p-3 text-zinc-600">
                          {keyTerms.governingLaw?.toLowerCase().includes("delaware") || keyTerms.governingLaw?.toLowerCase().includes("new york")
                            ? "Standard commercial jurisdiction"
                            : "Review local counsel and dispute venue"}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-zinc-800">Limitation of Liability</td>
                        <td className="p-3 font-mono text-zinc-700">{keyTerms.liabilityCap || "Not Specified / Uncapped"}</td>
                        <td className="p-3 text-zinc-600">
                          {keyTerms.liabilityCap ? "Finite monetary ceiling established" : "CRITICAL: General liability is uncapped"}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-zinc-800">Termination Notice</td>
                        <td className="p-3 font-mono text-zinc-700">{keyTerms.terminationNotice || "Not Specified / Silent"}</td>
                        <td className="p-3 text-zinc-600">
                          {keyTerms.terminationNotice ? "Defined notice window" : "Check for auto-renewal lock-in"}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-zinc-800">Confidentiality Term</td>
                        <td className="p-3 font-mono text-zinc-700">{keyTerms.confidentialityTerm || "Not Specified / Silent"}</td>
                        <td className="p-3 text-zinc-600">
                          {keyTerms.confidentialityTerm ? "Finite survival window" : "Verify trade secret protection in perpetuity"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Detailed Risk Findings Matrix */}
              <div className="space-y-4">
                <h2 className="font-editorial text-lg font-semibold text-zinc-950">
                  3. Substantive Risk Findings
                </h2>

                <div className="space-y-4">
                  {audit.findings.map((f, i) => (
                    <div
                      key={f.id}
                      className="p-4 rounded-xl border border-[#E5E5E2] bg-white space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-zinc-900 text-sm">
                          {i + 1}. {f.title}
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold ${
                            f.severity === "critical"
                              ? "bg-red-100 text-red-800"
                              : f.severity === "high"
                              ? "bg-amber-100 text-amber-800"
                              : f.severity === "medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {f.severity} • Page {f.pageNumber}
                        </span>
                      </div>

                      <div className="p-2.5 bg-[#FAFAF8] rounded border-l-2 border-[#1E3A8A] font-mono text-[11px] text-zinc-800">
                        &ldquo;{f.quote}&rdquo;
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-zinc-600">
                        <div>
                          <strong className="text-zinc-800">Legal Analysis:</strong> {f.analysis}
                        </div>
                        <div>
                          <strong className="text-zinc-800">Exposure:</strong> {f.businessImpact}
                        </div>
                      </div>

                      <div className="pt-2 text-zinc-700">
                        <strong className="text-zinc-900">Recommended Action:</strong> {f.recommendedAction}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. Missing Protections */}
              {audit.missingClauses.length > 0 && (
                <div className="space-y-3">
                  <h2 className="font-editorial text-lg font-semibold text-zinc-950">
                    4. Missing Standard Legal Protections
                  </h2>
                  <div className="space-y-3">
                    {audit.missingClauses.map((m, i) => (
                      <div
                        key={m.id}
                        className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200 text-xs space-y-1.5"
                      >
                        <div className="font-semibold text-amber-950 text-xs flex items-center justify-between">
                          <span>{i + 1}. {m.title}</span>
                          <span className="font-mono text-[10px] uppercase text-amber-800 font-bold">
                            {m.severity}
                          </span>
                        </div>
                        <p className="text-amber-900">{m.riskExplanation}</p>
                        <div className="p-2 bg-white rounded border border-amber-200/80 font-mono text-[10px] text-zinc-700">
                          <strong>Market Standard Language:</strong> {m.standardMarketLanguage}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Signoff Footer */}
              <div className="pt-6 border-t border-[#E5E5E2] flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <div>Prepared via ClauseLens Institutional Legal Copilot</div>
                <div>Strict Verification Protocol Applied</div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
