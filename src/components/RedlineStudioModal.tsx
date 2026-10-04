"use client";

import React, { useState, useMemo } from "react";
import { motion } from "motion/react";
import {
  X,
  PenTool,
  Copy,
  Check,
  Mail,
  ShieldCheck,
} from "lucide-react";
import {
  RedlinePerspective,
  RiskCategory,
  RedlineProposal,
} from "@/types";
import { generateRedlineProposal } from "@/lib/redline-engine";

interface RedlineStudioModalProps {
  initialClauseTitle?: string;
  initialCategory?: RiskCategory;
  initialOriginalText?: string;
  documentName?: string;
  onClose: () => void;
}

const CATEGORY_OPTIONS: { id: RiskCategory; label: string }[] = [
  { id: "liability", label: "Limitation of Liability" },
  { id: "indemnity", label: "Indemnification & Defense" },
  { id: "termination", label: "Termination & Renewal" },
  { id: "data_privacy", label: "Data Privacy & Breach SLA" },
  { id: "ip", label: "Intellectual Property Rights" },
  { id: "confidentiality", label: "Confidentiality & Survival" },
  { id: "governing_law", label: "Governing Law & Forum" },
  { id: "warranties", label: "Warranties & SLAs" },
];

export function RedlineStudioModal({
  initialClauseTitle = "Limitation of Liability",
  initialCategory = "liability",
  initialOriginalText = "",
  documentName = "Commercial Agreement",
  onClose,
}: RedlineStudioModalProps) {
  const [category, setCategory] = useState<RiskCategory>(initialCategory);
  const [perspective, setPerspective] = useState<RedlinePerspective>("buyer");
  const [originalText, setOriginalText] = useState(
    initialOriginalText ||
      "Neither party shall be liable for indirect damages, and aggregate liability shall be uncapped or determined under common law."
  );
  const [clauseTitle, setClauseTitle] = useState(initialClauseTitle);
  const [copiedRedline, setCopiedRedline] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const proposal: RedlineProposal = useMemo(() => {
    return generateRedlineProposal({
      documentName,
      clauseTitle,
      category,
      originalText,
      perspective,
    });
  }, [documentName, clauseTitle, category, originalText, perspective]);

  const handleCopyRedline = () => {
    navigator.clipboard.writeText(proposal.proposedText);
    setCopiedRedline(true);
    setTimeout(() => setCopiedRedline(false), 2000);
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(proposal.counterProposalMemo.body);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 8 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-5xl h-[90vh] bg-white rounded-2xl border border-[#E5E5E2] shadow-2xl flex flex-col overflow-hidden font-sans text-zinc-900"
      >
        {/* Top Header */}
        <header className="px-6 py-4 border-b border-[#E5E5E2] bg-[#FAFAF8] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1E3A8A] text-white flex items-center justify-center shadow-xs">
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-editorial text-lg font-semibold tracking-tight text-zinc-900">
                  Redline & Negotiation Studio
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-md font-mono bg-zinc-100 text-zinc-600 border border-zinc-200">
                  Tracked Changes Engine
                </span>
              </div>
              <p className="text-xs text-zinc-500 truncate max-w-md">
                Matter: <strong className="text-zinc-800">{documentName}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
            title="Close redline studio (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Toolbar: Category Selector & Perspective Control */}
        <div className="px-6 py-3.5 border-b border-[#E5E5E2] bg-white flex flex-wrap items-center justify-between gap-4 shrink-0">
          {/* Category Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-zinc-600">Clause Topic:</label>
            <select
              value={category}
              onChange={(e) => {
                const cat = e.target.value as RiskCategory;
                setCategory(cat);
                const opt = CATEGORY_OPTIONS.find((o) => o.id === cat);
                if (opt) setClauseTitle(opt.label);
              }}
              className="px-3 py-1.5 text-xs font-medium bg-[#FAFAF8] border border-[#E5E5E2] rounded-lg text-zinc-800 focus:outline-none focus:ring-1 focus:ring-[#1E3A8A]"
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Perspective 3-Way Switcher */}
          <div className="flex items-center bg-[#F4F4F0] border border-[#E5E5E2] rounded-lg p-1 text-xs">
            <button
              onClick={() => setPerspective("buyer")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                perspective === "buyer"
                  ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <span>Buyer-Favorable</span>
            </button>

            <button
              onClick={() => setPerspective("balanced")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                perspective === "balanced"
                  ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <span>Market Standard</span>
            </button>

            <button
              onClick={() => setPerspective("seller")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
                perspective === "seller"
                  ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <span>Seller-Favorable</span>
            </button>
          </div>
        </div>

        {/* Studio Content Area: Split View */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-[#E5E5E2]">
          {/* Left Panel: Original Draft & Strategic Rationale */}
          <div className="w-full md:w-1/2 p-6 overflow-y-auto space-y-5 bg-[#FAFAF8]">
            {/* Original Draft Box */}
            <div className="bg-white p-4 rounded-xl border border-[#E5E5E2] shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-zinc-400 uppercase font-semibold">
                  Original Contract Draft
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">Editable</span>
              </div>
              <textarea
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
                rows={5}
                className="w-full p-2.5 text-xs font-mono text-zinc-800 bg-[#FAFAF8] border border-[#E5E5E2] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#1E3A8A] leading-relaxed"
                placeholder="Paste or edit the original clause text..."
              />
            </div>

            {/* Strategic Counsel Rationale */}
            <div className="bg-white p-4 rounded-xl border border-[#E5E5E2] shadow-2xs space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800">
                <ShieldCheck className="w-4 h-4 text-[#1E3A8A]" />
                <span>Counsel Strategic Rationale ({perspective.toUpperCase()})</span>
              </div>

              <ul className="space-y-2 text-xs text-zinc-600">
                {proposal.counselRationale.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-[#1E3A8A] font-bold text-sm leading-none">•</span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Counter-Proposal Email Preview */}
            <div className="bg-white p-4 rounded-xl border border-[#E5E5E2] shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800">
                  <Mail className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Counter-Proposal Email Draft</span>
                </div>

                <button
                  onClick={handleCopyEmail}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#1E3A8A] hover:bg-[#1E3A8A]/5 rounded-md transition-colors"
                >
                  {copiedEmail ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Email</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 bg-[#FAFAF8] rounded-lg border border-[#E5E5E2] text-[11px] font-mono text-zinc-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                <div className="text-zinc-400 font-semibold mb-1">
                  Subject: {proposal.counterProposalMemo.subject}
                </div>
                {proposal.counterProposalMemo.body}
              </div>
            </div>
          </div>

          {/* Right Panel: Live Visual Tracked Changes Redline */}
          <div className="w-full md:w-1/2 p-6 flex flex-col bg-white overflow-hidden">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-900">Tracked Changes Markup</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {perspective === "buyer" ? "Buyer Fallback" : perspective === "seller" ? "Seller Ceiling" : "Market Neutral"}
                </span>
              </div>

              <button
                onClick={handleCopyRedline}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-lg transition-colors shadow-xs"
              >
                {copiedRedline ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Redline Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Proposed Clause</span>
                  </>
                )}
              </button>
            </div>

            {/* Visual Diff Box */}
            <div className="flex-1 p-5 rounded-xl border border-[#E5E5E2] bg-[#FAFAF8] overflow-y-auto font-mono text-xs leading-relaxed space-y-3">
              <div className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wider">
                Comparative Markup Display:
              </div>

              <div className="p-4 bg-white rounded-lg border border-zinc-200 shadow-2xs leading-loose">
                {proposal.diffParts.map((part, i) => {
                  if (part.added) {
                    return (
                      <span
                        key={i}
                        className="bg-emerald-100 text-emerald-900 font-semibold underline decoration-emerald-500 px-1 py-0.5 rounded mx-0.5"
                        title="Proposed addition"
                      >
                        {part.value}
                      </span>
                    );
                  }
                  if (part.removed) {
                    return (
                      <span
                        key={i}
                        className="bg-red-100 text-red-800 line-through opacity-70 px-1 py-0.5 rounded mx-0.5"
                        title="Proposed deletion"
                      >
                        {part.value}
                      </span>
                    );
                  }
                  return <span key={i} className="text-zinc-800">{part.value}</span>;
                })}
              </div>

              <div className="flex items-center gap-4 text-[11px] font-mono text-zinc-500 pt-2">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-red-100 border border-red-300" />
                  <span>Strikethrough = Deleted Language</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-300" />
                  <span>Green Bold = Proposed Additions</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
