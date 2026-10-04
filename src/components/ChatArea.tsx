"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Send,
  Square,
  Sparkles,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Search,
  BookOpen,
  Layers,
  Copy,
  ShieldCheck,
  Scale,
  Landmark,
  ShieldAlert,
  Clock,
  Lock,
  FileText,
  Compass,
} from "lucide-react";
import {
  ChatMessageItem,
  DocumentSummary,
  VerifiedCitation,
  AgentResearchStep,
} from "@/types";
import { extractKeyTerms, KeyTermsSummary } from "@/lib/key-terms";
import { UntitledUiLogo } from "@/components/UntitledUiLogo";

interface ChatAreaProps {
  selectedDocs: DocumentSummary[];
  messages: ChatMessageItem[];
  isLoading: boolean;
  activeSteps: AgentResearchStep[];
  onSendMessage: (question: string) => Promise<void>;
  onStopGeneration: () => void;
  onOpenCitation: (citation: VerifiedCitation) => void;
  activeDocText?: string;
  onOpenMobileSidebar?: () => void;
  isZenMode?: boolean;
  viewMode?: "split" | "chat" | "document";
}

export function ChatArea({
  selectedDocs,
  messages,
  isLoading,
  activeSteps,
  onSendMessage,
  onStopGeneration,
  onOpenCitation,
  activeDocText = "",
  onOpenMobileSidebar,
  isZenMode = false,
}: ChatAreaProps) {
  const [input, setInput] = useState("");
  const [expandedStepsMap, setExpandedStepsMap] = useState<Record<string, boolean>>({});
  const [copiedCitationId, setCopiedCitationId] = useState<string | null>(null);
  const [showPulseBar, setShowPulseBar] = useState(true);

  const keyTerms = useMemo<KeyTermsSummary | null>(() => {
    return activeDocText ? extractKeyTerms(activeDocText) : null;
  }, [activeDocText]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeSteps, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");
    await onSendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const toggleSteps = (msgId: string) => {
    setExpandedStepsMap((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const copyLegalCitation = (cit: VerifiedCitation) => {
    const pageStr = cit.pageNumber ? `p. ${cit.pageNumber}` : "Section Record";
    const legalCite = `${cit.documentName}, ${pageStr} ("${cit.quote}")`;
    navigator.clipboard.writeText(legalCite);
    setCopiedCitationId(cit.id);
    setTimeout(() => setCopiedCitationId(null), 2000);
  };

  const renderToolIcon = (tool: string) => {
    switch (tool) {
      case "search_document":
        return <Search className="w-3.5 h-3.5 text-[#2563EB]" />;
      case "get_section":
        return <BookOpen className="w-3.5 h-3.5 text-emerald-600" />;
      case "list_clauses":
        return <Layers className="w-3.5 h-3.5 text-indigo-600" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-blue-500" />;
    }
  };

  return (
    <div className="w-full flex flex-col h-full bg-white overflow-hidden text-zinc-900 font-sans">
      {/* Top Docket Header */}
      <header className="px-4 lg:px-6 py-3 border-b border-[#E5E5E2] bg-white flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          {onOpenMobileSidebar && (
            <button
              onClick={onOpenMobileSidebar}
              className="lg:hidden p-1.5 -ml-1 text-zinc-600 hover:bg-zinc-100 rounded-md"
              title="Open agreements drawer"
            >
              <Layers className="w-4 h-4 text-zinc-700" />
            </button>
          )}

          <div>
            <h2 className="font-editorial text-base font-semibold text-zinc-900 tracking-tight">
              Inquiry &amp; Diligence
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-xs sm:max-w-md">
              {selectedDocs.length === 0 ? (
                <span className="text-amber-700">
                  Select contracts from portfolio to begin
                </span>
              ) : selectedDocs.length === 1 ? (
                `Active: ${selectedDocs[0].name}`
              ) : (
                `Comparing ${selectedDocs.length} contracts`
              )}
            </p>
          </div>
        </div>

        {selectedDocs.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5">
            {selectedDocs.map((d) => (
              <span
                key={d.id}
                className="text-[11px] font-mono bg-[#FAFAF8] text-zinc-700 px-2.5 py-1 rounded-md border border-[#E5E5E2] max-w-[150px] truncate"
                title={d.name}
              >
                {d.name}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Executive Key-Terms Pulse Bar (Hidden in Zen Mode) */}
      {!isZenMode && keyTerms && (keyTerms.governingLaw || keyTerms.liabilityCap || keyTerms.terminationNotice) && (
        <div className="border-b border-[#E5E5E2] bg-[#FAFAF8] px-4 lg:px-6 py-2 shrink-0">
          <div className="flex items-center justify-between text-xs text-zinc-600">
            <div className="flex items-center gap-1.5 font-medium text-zinc-700 text-xs">
              <Scale className="w-3.5 h-3.5 text-[#1E3A8A]" />
              <span>Extracted Key Deal Terms</span>
            </div>

            <button
              onClick={() => setShowPulseBar(!showPulseBar)}
              className="text-[11px] text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              {showPulseBar ? "Hide" : "Show"}
            </button>
          </div>

          <AnimatePresence>
            {showPulseBar && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-1 text-xs"
              >
                {keyTerms.governingLaw && (
                  <div className="bg-white border border-[#E5E5E2] rounded-lg px-3 py-2 flex items-center gap-2 shadow-2xs">
                    <Landmark className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0" />
                    <div className="truncate">
                      <span className="text-zinc-400 text-[9px] block uppercase font-medium">GOVERNING LAW</span>
                      <span className="font-medium text-zinc-900 truncate block">{keyTerms.governingLaw}</span>
                    </div>
                  </div>
                )}

                {keyTerms.liabilityCap && (
                  <div className="bg-white border border-[#E5E5E2] rounded-lg px-3 py-2 flex items-center gap-2 shadow-2xs">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <div className="truncate">
                      <span className="text-zinc-400 text-[9px] block uppercase font-medium">LIABILITY CAP</span>
                      <span className="font-medium text-zinc-900 truncate block">{keyTerms.liabilityCap}</span>
                    </div>
                  </div>
                )}

                {keyTerms.terminationNotice && (
                  <div className="bg-white border border-[#E5E5E2] rounded-lg px-3 py-2 flex items-center gap-2 shadow-2xs">
                    <Clock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <div className="truncate">
                      <span className="text-zinc-400 text-[9px] block uppercase font-medium">NOTICE PERIOD</span>
                      <span className="font-medium text-zinc-900 truncate block">{keyTerms.terminationNotice}</span>
                    </div>
                  </div>
                )}

                {keyTerms.confidentialityTerm && (
                  <div className="bg-white border border-[#E5E5E2] rounded-lg px-3 py-2 flex items-center gap-2 shadow-2xs">
                    <Lock className="w-3.5 h-3.5 text-[#1E3A8A] shrink-0" />
                    <div className="truncate">
                      <span className="text-zinc-400 text-[9px] block uppercase font-medium">CONFIDENTIALITY</span>
                      <span className="font-medium text-zinc-900 truncate block">{keyTerms.confidentialityTerm}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Message List */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6 space-y-6 scrollbar-thin min-w-0">
        {selectedDocs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <UntitledUiLogo className="w-12 h-12 mb-4" size={48} />
            <h3 className="text-sm font-semibold text-zinc-900 font-editorial">
              Select Contract Matter to Begin
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mt-1 leading-relaxed font-sans">
              Check one or multiple agreements from the portfolio to unlock citation-verified analysis, BM25 clause retrieval, and diligence.
            </p>
          </div>
        ) : messages.length === 0 && !isLoading ? (
          <div className="min-h-full py-10 px-6 flex flex-col items-center justify-center max-w-2xl mx-auto text-center">
            <UntitledUiLogo className="w-10 h-10 mb-4" size={40} />
            <h2 className="font-editorial text-2xl sm:text-3xl font-normal text-zinc-900 tracking-tight">
              Contract Review &amp; Diligence
            </h2>
            <p className="text-sm text-zinc-500 max-w-md mt-2 mb-8 leading-relaxed font-sans">
              Precise clause-grounded diligence with verified pin-cites. Select a query below or type your inquiry.
            </p>

            {/* 4 Clean Diligence Inquiries */}
            <div className="w-full space-y-2.5 text-left">
              {/* 1. Liability */}
              <motion.button
                data-tour="liability-quick-query"
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onSendMessage("What is the limitation of liability cap and what exceptions apply to it?")}
                className="group w-full p-4 rounded-xl border border-[#E5E5E2] bg-white hover:border-[#1E3A8A] hover:shadow-xs transition-all flex items-center justify-between gap-4 text-left"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                      LIABILITY
                    </span>
                    <span className="text-xs font-medium text-zinc-900">
                      Limitation of Liability &amp; Super-Caps
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 truncate">
                    Aggregate liability caps, consequential damages waivers, and uncapped carve-outs.
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-[#1E3A8A] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
              </motion.button>

              {/* 2. Termination */}
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onSendMessage("What are the termination for convenience and termination for cause notice periods?")}
                className="group w-full p-4 rounded-xl border border-[#E5E5E2] bg-white hover:border-[#1E3A8A] hover:shadow-xs transition-all flex items-center justify-between gap-4 text-left"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                      TERMINATION
                    </span>
                    <span className="text-xs font-medium text-zinc-900">
                      Termination &amp; Notice Periods
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 truncate">
                    Convenience notice requirements, material breach cure timelines, and exit remedies.
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-[#1E3A8A] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
              </motion.button>

              {/* 3. Governing Law */}
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onSendMessage("Which state's governing law applies, and what is the dispute resolution venue?")}
                className="group w-full p-4 rounded-xl border border-[#E5E5E2] bg-white hover:border-[#1E3A8A] hover:shadow-xs transition-all flex items-center justify-between gap-4 text-left"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                      CHOICE OF LAW
                    </span>
                    <span className="text-xs font-medium text-zinc-900">
                      Governing Law &amp; Dispute Forum
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 truncate">
                    Controlling jurisdiction, conflict of laws waivers, and arbitration or court venue.
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-[#1E3A8A] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
              </motion.button>

              {/* 4. Confidentiality */}
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onSendMessage("What is the confidentiality term and does it survive contract termination?")}
                className="group w-full p-4 rounded-xl border border-[#E5E5E2] bg-white hover:border-[#1E3A8A] hover:shadow-xs transition-all flex items-center justify-between gap-4 text-left"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-700">
                      CONFIDENTIALITY
                    </span>
                    <span className="text-xs font-medium text-zinc-900">
                      Confidentiality &amp; Post-Term Survival
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 truncate">
                    Non-disclosure duration, trade secret protection, and return of confidential materials.
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-400 group-hover:text-[#1E3A8A] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
              </motion.button>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";
            const steps = msg.researchSteps || [];
            const isExpanded = expandedStepsMap[msg.id] ?? false;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 28 }}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <UntitledUiLogo className="w-8 h-8 shrink-0 mt-1" size={32} />
                )}

                <div className={`max-w-[96%] sm:max-w-[90%] min-w-0 flex-1 space-y-3 ${isUser ? "ml-auto" : ""}`}>
                  {isUser ? (
                    /* User Inquiry Bubble */
                    <div className="rounded-2xl px-5 py-3.5 bg-[#18181B] text-white shadow-xs max-w-xl ml-auto break-words">
                      <div className="flex items-center justify-between gap-3 text-[10px] font-mono text-zinc-400 mb-1 border-b border-zinc-800 pb-1">
                        <span className="uppercase tracking-wider font-medium text-zinc-300">
                          COUNSEL INQUIRY
                        </span>
                        <span>
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : ""}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm leading-relaxed text-zinc-100 break-words">{msg.content}</div>
                    </div>
                  ) : (
                    /* Assistant Legal Memorandum */
                    <div className="rounded-2xl border border-[#E5E5E2] bg-white shadow-xs overflow-hidden min-w-0">
                      {/* Memorandum Header */}
                      <div className="px-5 py-3 bg-[#FAFAF8] border-b border-[#E5E5E2] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-zinc-800 font-medium">
                          <FileText className="w-4 h-4 text-[#1E3A8A]" />
                          <span className="font-editorial text-sm font-semibold">Memorandum of Counsel</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-400 text-[11px] font-mono">
                          <span>
                            {msg.createdAt
                              ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                              : ""}
                          </span>
                        </div>
                      </div>

                      {/* Autonomous Research Trace (Hidden in Zen Mode) */}
                      {!isZenMode && steps.length > 0 && (
                        <div className="mx-5 mt-3 rounded-lg border border-[#E5E5E2] bg-[#FAFAF8] p-2.5 text-xs font-mono">
                          <button
                            onClick={() => toggleSteps(msg.id)}
                            className="flex items-center justify-between w-full text-zinc-700 hover:text-zinc-900 transition-colors"
                          >
                            <span className="flex items-center gap-2 text-[11px]">
                              <Compass className="w-3.5 h-3.5 text-[#1E3A8A]" />
                              <span className="font-medium text-zinc-800">
                                Research trace ({steps.length} rounds)
                              </span>
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                            )}
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-2 pt-2 border-t border-[#E5E5E2] space-y-1.5 text-[11px]"
                              >
                                {steps.map((step, sIdx) => (
                                  <div
                                    key={step.id || sIdx}
                                    className="p-2 rounded bg-white border border-[#E5E5E2] flex items-start gap-2"
                                  >
                                    <span className="mt-0.5 shrink-0">{renderToolIcon(step.tool)}</span>
                                    <div className="flex-1">
                                      <div className="font-medium text-zinc-800">
                                        Round {step.round} · <span className="text-[#1E3A8A]">{step.tool}</span>
                                      </div>
                                      <div className="text-zinc-600 mt-0.5">{step.message}</div>
                                    </div>
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Memorandum Content */}
                      <div className="px-6 py-5 text-xs sm:text-sm leading-relaxed text-zinc-800 font-sans break-words whitespace-pre-wrap selection:bg-[#1E3A8A]/10">
                        {msg.content}
                      </div>

                      {/* Verified Evidence & Pin-Cites Section */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="px-6 pb-6 pt-3 border-t border-[#E5E5E2] space-y-3">
                          <div className="flex items-center justify-between text-xs text-zinc-500">
                            <span className="flex items-center gap-1.5 font-medium text-zinc-700">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              Verified Evidence ({msg.citations.length})
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-2.5">
                            {msg.citations.map((cit) => (
                              <div
                                key={cit.id}
                                className="bg-[#FAFAF8] border border-[#E5E5E2] rounded-xl p-3.5 transition-all hover:border-zinc-300 hover:bg-white"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                                    <span
                                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-medium border ${
                                        cit.isVerified
                                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                          : "bg-amber-50 text-amber-800 border-amber-200"
                                      }`}
                                    >
                                      {cit.isVerified ? "PIN-CITE" : "UNVERIFIED"}
                                    </span>

                                    <span className="text-xs font-medium text-zinc-900 truncate max-w-xs">
                                      {cit.documentName}
                                    </span>

                                    {cit.pageNumber && (
                                      <span className="text-[10px] font-mono text-zinc-400 bg-white border border-[#E5E5E2] px-1.5 py-0.5 rounded">
                                        p. {cit.pageNumber}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                    <button
                                      onClick={() => copyLegalCitation(cit)}
                                      className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-md border border-[#E5E5E2] text-zinc-600 hover:text-zinc-900 hover:bg-white bg-white transition-colors"
                                      title="Copy formatted citation"
                                    >
                                      {copiedCitationId === cit.id ? (
                                        <span className="text-emerald-700 font-medium">Copied</span>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3 text-zinc-400" />
                                          <span>Cite</span>
                                        </>
                                      )}
                                    </button>

                                    {cit.isVerified && (
                                      <button
                                        data-tour="citation-inspect-btn"
                                        onClick={() => onOpenCitation(cit)}
                                        className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-[#1E3A8A] text-white hover:bg-[#172554] transition-colors shadow-2xs"
                                      >
                                        <span>Inspect ↗</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <blockquote className="border-l-2 border-[#1E3A8A] pl-3 italic text-zinc-800 font-editorial text-sm leading-relaxed my-2 py-1">
                                  &ldquo;{cit.quote}&rdquo;
                                </blockquote>

                                {!cit.isVerified && cit.reason && (
                                  <p className="text-[11px] text-amber-700 mt-1 font-mono">{cit.reason}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}

        {/* Live streaming status banner with stop button */}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-lg bg-[#1E3A8A]/10 text-[#1E3A8A] flex items-center justify-center shrink-0 mt-1 text-xs">
              <Scale className="w-4 h-4 animate-pulse" />
            </div>

            <div className="space-y-2 max-w-[85%]">
              {activeSteps.length > 0 && !isZenMode && (
                <div className="rounded-lg border border-[#E5E5E2] bg-white p-3 text-xs text-zinc-800 font-mono shadow-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#1E3A8A] animate-ping shrink-0" />
                    <span className="font-medium text-zinc-900">
                      {activeSteps[activeSteps.length - 1].message}
                    </span>
                  </div>
                </div>
              )}

              <div className="inline-flex items-center gap-2 text-xs font-mono text-zinc-500 bg-white px-3 py-1.5 rounded-full border border-[#E5E5E2] shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A8A] animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A8A] animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A8A] animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1 font-medium">Synthesizing citation-verified memorandum...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input box */}
      <div className="p-3 lg:p-4 border-t border-[#E5E5E2] bg-white">
        <form onSubmit={handleSubmit}>
          <div className="border border-[#E5E5E2] focus-within:border-[#1E3A8A] bg-[#FAFAF8] focus-within:bg-white rounded-2xl p-2.5 transition-all shadow-2xs relative">
            <textarea
              ref={textareaRef}
              data-tour="chat-input"
              rows={2}
              value={input}
              disabled={selectedDocs.length === 0}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                selectedDocs.length === 0
                  ? "Select a contract from the portfolio to begin..."
                  : "Ask about liability caps, notice periods, governing law... (Shift+Enter for newline)"
              }
              className="w-full resize-none bg-transparent px-2 py-1 pr-24 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none disabled:opacity-50 font-sans"
            />

            <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5">
              {isLoading ? (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={onStopGeneration}
                  title="Stop generation"
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop</span>
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  disabled={!input.trim() || selectedDocs.length === 0}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-[#1E3A8A] hover:bg-[#172554] disabled:opacity-30 rounded-lg transition-colors shadow-xs"
                >
                  <span>Ask</span>
                  <Send className="w-3 h-3" />
                </motion.button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
