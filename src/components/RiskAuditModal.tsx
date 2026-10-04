"use client";

import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  X,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  FileText,
  PenTool,
  ArrowUpRight,
  SlidersHorizontal,
  Copy,
  Check,
  AlertCircle,
  Download,
} from "lucide-react";
import {
  DocumentDetail,
  ContractHealthAudit,
  PlaybookType,
  RiskSeverity,
  RiskCategory,
} from "@/types";
import { auditContractRisk } from "@/lib/risk-engine";

interface RiskAuditModalProps {
  document: DocumentDetail | null;
  onClose: () => void;
  onOpenSourceInViewer: (docId: string, pageNumber: number, quote: string) => void;
  onOpenRedlineForClause: (clauseTitle: string, category: RiskCategory, quote: string) => void;
  onOpenReportModal: () => void;
}

export function RiskAuditModal({
  document,
  onClose,
  onOpenSourceInViewer,
  onOpenRedlineForClause,
  onOpenReportModal,
}: RiskAuditModalProps) {
  const [playbook, setPlaybook] = useState<PlaybookType>("balanced");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [copiedGapId, setCopiedGapId] = useState<string | null>(null);

  const audit: ContractHealthAudit | null = useMemo(() => {
    if (!document) return null;
    return auditContractRisk(
      {
        documentId: document.id,
        documentName: document.name,
        extractedText: document.extractedText || "",
        pages: document.pages,
      },
      playbook
    );
  }, [document, playbook]);

  if (!document || !audit) return null;

  const filteredFindings = audit.findings.filter((f) => {
    if (severityFilter === "all") return true;
    return f.severity === severityFilter;
  });

  const getSeverityBadge = (severity: RiskSeverity) => {
    switch (severity) {
      case "critical":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800 border border-red-200">
            <ShieldAlert className="w-3 h-3 text-red-600" />
            Critical Risk
          </span>
        );
      case "high":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            High Risk
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
            <AlertCircle className="w-3 h-3 text-yellow-600" />
            Medium
          </span>
        );
      case "compliant":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Standard / Compliant
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700">
            Note
          </span>
        );
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A":
        return "text-emerald-700 bg-emerald-50 border-emerald-300";
      case "B":
        return "text-amber-700 bg-amber-50 border-amber-300";
      case "C":
        return "text-orange-700 bg-orange-50 border-orange-300";
      default:
        return "text-red-700 bg-red-50 border-red-300";
    }
  };

  const handleCopyGapLanguage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedGapId(id);
    setTimeout(() => setCopiedGapId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-6xl h-[92vh] bg-white rounded-2xl border border-[#E5E5E2] shadow-2xl flex flex-col overflow-hidden font-sans text-zinc-900"
      >
        {/* Top Header */}
        <header className="px-6 py-4 border-b border-[#E5E5E2] bg-[#FAFAF8] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1E3A8A] text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-editorial text-lg font-semibold tracking-tight text-zinc-900">
                  Risk & Compliance Matrix
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-md font-mono bg-zinc-100 text-zinc-600 border border-zinc-200">
                  100% Deterministic Audit
                </span>
              </div>
              <p className="text-xs text-zinc-500 truncate max-w-md">
                Matter: <strong className="text-zinc-800">{document.name}</strong> • {document.pageCount} pages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenReportModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-50 border border-[#E5E5E2] rounded-lg shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-zinc-500" />
              <span>Export Memo</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
              title="Close audit modal (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Modal Main Body: 2-Column Split */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[#E5E5E2]">
          {/* Left Column: Health Scorecard & Playbook Selector */}
          <div className="w-full md:w-80 lg:w-96 p-5 bg-[#FAFAF8] overflow-y-auto space-y-5 shrink-0">
            {/* Playbook Switcher */}
            <div className="bg-white p-4 rounded-xl border border-[#E5E5E2] shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-zinc-800 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#1E3A8A]" />
                  Negotiation Playbook
                </label>
                <span className="text-[10px] text-zinc-400 font-mono">Profile</span>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {[
                  { id: "balanced", label: "Balanced Standard", desc: "Equitable market baseline" },
                  { id: "enterprise-buyer", label: "Enterprise Buyer", desc: "Strict liability & mutual IP" },
                  { id: "saas-vendor", label: "SaaS Vendor", desc: "Protects ARR & limited remedy" },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPlaybook(p.id as PlaybookType)}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                      playbook === p.id
                        ? "bg-[#1E3A8A]/5 border-[#1E3A8A] text-[#1E3A8A] font-medium shadow-xs"
                        : "bg-white border-[#E5E5E2] text-zinc-600 hover:border-zinc-300"
                    }`}
                  >
                    <div className="font-semibold text-zinc-900">{p.label}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Overall Contract Health Card */}
            <div className="bg-white p-4 rounded-xl border border-[#E5E5E2] shadow-2xs text-center">
              <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-2">
                Contract Health Index
              </div>

              <div className="flex items-center justify-center gap-4 py-2">
                <div className="text-5xl font-editorial font-bold text-zinc-900">
                  {audit.overallScore}
                  <span className="text-lg font-sans text-zinc-400 font-normal">/100</span>
                </div>

                <div
                  className={`w-12 h-12 rounded-xl border flex items-center justify-center font-editorial text-2xl font-bold ${getGradeColor(
                    audit.grade
                  )}`}
                >
                  {audit.grade}
                </div>
              </div>

              <p className="text-xs font-medium text-zinc-700 mt-1">{audit.gradeDescription}</p>

              {/* Score Progress Bar */}
              <div className="w-full bg-zinc-100 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    audit.overallScore >= 85
                      ? "bg-emerald-600"
                      : audit.overallScore >= 70
                      ? "bg-amber-500"
                      : audit.overallScore >= 50
                      ? "bg-orange-500"
                      : "bg-red-600"
                  }`}
                  style={{ width: `${audit.overallScore}%` }}
                />
              </div>

              {/* Mini Stats Breakdown */}
              <div className="grid grid-cols-4 gap-1 mt-4 pt-3 border-t border-[#E5E5E2] text-center font-mono text-[10px]">
                <div>
                  <div className="font-bold text-red-600 text-sm">{audit.stats.criticalCount}</div>
                  <div className="text-zinc-400">Critical</div>
                </div>
                <div>
                  <div className="font-bold text-amber-600 text-sm">{audit.stats.highCount}</div>
                  <div className="text-zinc-400">High</div>
                </div>
                <div>
                  <div className="font-bold text-yellow-600 text-sm">{audit.stats.mediumCount}</div>
                  <div className="text-zinc-400">Medium</div>
                </div>
                <div>
                  <div className="font-bold text-emerald-600 text-sm">{audit.stats.compliantCount}</div>
                  <div className="text-zinc-400">Compliant</div>
                </div>
              </div>
            </div>

            {/* Missing Clauses Section */}
            {audit.missingClauses.length > 0 && (
              <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Missing Protections ({audit.missingClauses.length})</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  These standard provisions were not found in the text, creating potential unhedged risk:
                </p>

                <div className="space-y-2">
                  {audit.missingClauses.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 bg-white rounded-lg border border-amber-200/80 text-xs shadow-2xs"
                    >
                      <div className="font-semibold text-zinc-900 text-[11px] flex items-center justify-between">
                        <span>{m.title}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 uppercase">
                          {m.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1 leading-normal">{m.riskExplanation}</p>
                      <div className="mt-2 pt-2 border-t border-zinc-100 flex items-center justify-between">
                        <span className="text-[10px] text-zinc-400 font-mono">Market Standard</span>
                        <button
                          onClick={() => handleCopyGapLanguage(m.id, m.standardMarketLanguage)}
                          className="flex items-center gap-1 text-[11px] font-medium text-[#1E3A8A] hover:underline"
                        >
                          {copiedGapId === m.id ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy Clause</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Interactive Findings & Action Cards */}
          <div className="flex-1 flex flex-col bg-white overflow-hidden min-w-0">
            {/* Filter Bar */}
            <div className="px-6 py-3 border-b border-[#E5E5E2] bg-[#FAFAF8] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs scrollbar-none">
                {[
                  { id: "all", label: `All Findings (${audit.findings.length})` },
                  { id: "critical", label: `Critical (${audit.stats.criticalCount})` },
                  { id: "high", label: `High Risk (${audit.stats.highCount})` },
                  { id: "medium", label: `Medium (${audit.stats.mediumCount})` },
                  { id: "compliant", label: `Compliant (${audit.stats.compliantCount})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSeverityFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 ${
                      severityFilter === tab.id
                        ? "bg-white text-zinc-900 border border-[#E5E5E2] shadow-2xs font-semibold"
                        : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="text-[11px] text-zinc-400 font-mono hidden sm:block">
                Showing {filteredFindings.length} of {audit.findings.length}
              </div>
            </div>

            {/* Scrollable Findings List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
              {filteredFindings.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-zinc-500">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                  <p className="text-sm font-medium text-zinc-800">No matching risk items in this category</p>
                  <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                    Select a different severity filter or switch negotiation playbooks.
                  </p>
                </div>
              ) : (
                filteredFindings.map((finding) => (
                  <div
                    key={finding.id}
                    className="p-4 rounded-xl border border-[#E5E5E2] bg-white hover:border-zinc-300 transition-all shadow-2xs space-y-3"
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wide">
                            {finding.categoryLabel}
                          </span>
                          <span className="text-zinc-300">•</span>
                          <span className="text-[11px] font-mono text-zinc-500 font-medium">
                            Page {finding.pageNumber}
                          </span>
                        </div>
                        <h3 className="text-sm font-semibold text-zinc-900 mt-0.5">{finding.title}</h3>
                      </div>

                      <div className="shrink-0">{getSeverityBadge(finding.severity)}</div>
                    </div>

                    {/* Verbatim Quote Box */}
                    <div className="p-3 bg-[#FAFAF8] rounded-lg border-l-2 border-[#1E3A8A] text-xs font-mono text-zinc-800 leading-relaxed overflow-x-auto">
                      &ldquo;{finding.quote}&rdquo;
                    </div>

                    {/* Legal Analysis & Impact */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-zinc-400 uppercase font-semibold">
                          Legal Analysis
                        </span>
                        <p className="text-zinc-700 leading-relaxed">{finding.analysis}</p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-zinc-400 uppercase font-semibold">
                          Commercial Exposure
                        </span>
                        <p className="text-zinc-700 leading-relaxed">{finding.businessImpact}</p>
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-2 border-t border-[#E5E5E2] flex items-center justify-between">
                      <div className="text-[11px] text-zinc-500 truncate max-w-xs sm:max-w-md">
                        <strong className="text-zinc-700">Action:</strong> {finding.recommendedAction}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Open in Viewer Button */}
                        <button
                          onClick={() => {
                            onClose();
                            onOpenSourceInViewer(document.id, finding.pageNumber, finding.quote);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-white hover:bg-zinc-50 border border-[#E5E5E2] rounded-lg transition-colors shadow-2xs"
                          title="Scroll to exact page in document viewer"
                        >
                          <FileText className="w-3.5 h-3.5 text-zinc-500" />
                          <span>Jump to Page {finding.pageNumber}</span>
                          <ArrowUpRight className="w-3 h-3 text-zinc-400" />
                        </button>

                        {/* Open in Redline Studio Button */}
                        <button
                          data-tour="propose-redline-btn"
                          onClick={() => {
                            onClose();
                            onOpenRedlineForClause(finding.title, finding.category, finding.quote);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-lg transition-colors shadow-xs"
                          title="Generate proposed redlines for this clause"
                        >
                          <PenTool className="w-3 h-3" />
                          <span>Propose Redline</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
