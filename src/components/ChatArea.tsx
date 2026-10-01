"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Send,
  Square,
  Sparkles,
  Check,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Search,
  BookOpen,
  Layers,
  Copy,
  CheckCheck,
  ShieldCheck,
  Scale,
  Landmark,
  ShieldAlert,
  Clock,
  Lock,
  FileText,
  Compass,
  Award,
  AlertTriangle,
} from "lucide-react";
import {
  ChatMessageItem,
  DocumentSummary,
  VerifiedCitation,
  AgentResearchStep,
} from "@/types";
import { extractKeyTerms, KeyTermsSummary } from "@/lib/key-terms";

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

  const lawyerQuickPrompts = [
    {
      category: "RISK EXPOSURE",
      label: "Liability & Cap Audit",
      prompt: "What is the limitation of liability cap and what exceptions apply to it?",
    },
    {
      category: "OPERATIONAL EXIT",
      label: "Termination & Notice",
      prompt: "What are the termination for convenience and termination for cause notice periods?",
    },
    {
      category: "CHOICE OF LAW",
      label: "Governing Law & Forum",
      prompt: "Which state's governing law applies, and what is the dispute resolution venue?",
    },
    {
      category: "DEFENSE SHIELD",
      label: "Indemnification Scope",
      prompt: "What are the indemnification obligations and defense triggers for each party?",
    },
    {
      category: "IP & SURVIVAL",
      label: "Confidentiality Term",
      prompt: "What is the confidentiality term and does it survive contract termination?",
    },
  ];

  const renderToolIcon = (tool: string) => {
    switch (tool) {
      case "search_document":
        return <Search className="w-3.5 h-3.5 text-[#C5A880]" />;
      case "get_section":
        return <BookOpen className="w-3.5 h-3.5 text-emerald-500" />;
      case "list_clauses":
        return <Layers className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FBF9F6] dark:bg-[#0A0B0E] border-r border-[#E6E2D9] dark:border-[#222530] overflow-hidden">
      {/* Top Docket Header */}
      <header className="px-4 lg:px-5 py-3 border-b border-[#E6E2D9] dark:border-[#222530] bg-white/90 dark:bg-[#101217]/90 backdrop-blur-md flex items-center justify-between shrink-0 z-10 shadow-2xs">
        <div className="flex items-center gap-3">
          {onOpenMobileSidebar && (
            <button
              onClick={onOpenMobileSidebar}
              className="lg:hidden p-1.5 -ml-1 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
              title="Open contracts drawer"
            >
              <Layers className="w-4 h-4 text-[#C5A880]" />
            </button>
          )}

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] tracking-widest uppercase font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Legal Intelligence Workbench
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[9px] font-mono text-[#8F6E3B] dark:text-[#D8BE96] bg-[#C5A880]/15 px-2 py-0.5 rounded-full font-semibold border border-[#C5A880]/20">
                <ShieldCheck className="w-3 h-3" />
                CITATION-VERIFIED
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate max-w-xs sm:max-w-md font-mono">
              {selectedDocs.length === 0 ? (
                <span className="text-[#96610B] dark:text-yellow-400 font-sans">
                  Select contracts from library to begin inquiry
                </span>
              ) : selectedDocs.length === 1 ? (
                `Active Matter: ${selectedDocs[0].name}`
              ) : (
                `Comparative Analysis: ${selectedDocs.length} contracts selected`
              )}
            </p>
          </div>
        </div>

        {selectedDocs.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5">
            {selectedDocs.map((d) => (
              <span
                key={d.id}
                className="text-[10px] font-mono bg-white dark:bg-[#15171F] text-zinc-700 dark:text-zinc-300 px-2.5 py-1 rounded-md border border-[#E6E2D9] dark:border-[#2C303B] max-w-[140px] truncate shadow-2xs"
                title={d.name}
              >
                {d.name}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Executive Key-Terms Pulse Bar */}
      {keyTerms && (keyTerms.governingLaw || keyTerms.liabilityCap || keyTerms.terminationNotice) && (
        <div className="border-b border-[#E6E2D9] dark:border-[#222530] bg-[#F7F4EE]/70 dark:bg-[#111319]/80 px-4 py-2 shrink-0">
          <div className="flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400">
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold text-[#8F6E3B] dark:text-[#D8BE96] uppercase tracking-wider">
              <Scale className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Extracted Key Deal Terms Pulse</span>
            </div>

            <button
              onClick={() => setShowPulseBar(!showPulseBar)}
              className="text-[10px] font-mono text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
            >
              {showPulseBar ? "Collapse" : "Expand"}
            </button>
          </div>

          <AnimatePresence>
            {showPulseBar && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 pt-1 font-mono text-[10px]"
              >
                {keyTerms.governingLaw && (
                  <div className="p-0.5 rounded-lg bg-gradient-to-b from-[#C5A880]/20 to-transparent border border-[#C5A880]/25">
                    <div className="bg-white dark:bg-[#161822] rounded-md px-2.5 py-1.5 flex items-center gap-2">
                      <Landmark className="w-3.5 h-3.5 text-[#C5A880] shrink-0" />
                      <div className="truncate">
                        <span className="text-zinc-400 text-[9px] block uppercase font-semibold">GOVERNING LAW</span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{keyTerms.governingLaw}</span>
                      </div>
                    </div>
                  </div>
                )}

                {keyTerms.liabilityCap && (
                  <div className="p-0.5 rounded-lg bg-gradient-to-b from-red-500/20 to-transparent border border-red-500/25">
                    <div className="bg-white dark:bg-[#161822] rounded-md px-2.5 py-1.5 flex items-center gap-2">
                      <ShieldAlert className="w-3.5 h-3.5 text-[#A82E2E] dark:text-red-400 shrink-0" />
                      <div className="truncate">
                        <span className="text-zinc-400 text-[9px] block uppercase font-semibold">LIABILITY CAP</span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{keyTerms.liabilityCap}</span>
                      </div>
                    </div>
                  </div>
                )}

                {keyTerms.terminationNotice && (
                  <div className="p-0.5 rounded-lg bg-gradient-to-b from-emerald-500/20 to-transparent border border-emerald-500/25">
                    <div className="bg-white dark:bg-[#161822] rounded-md px-2.5 py-1.5 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#1B663B] dark:text-[#86EFAC] shrink-0" />
                      <div className="truncate">
                        <span className="text-zinc-400 text-[9px] block uppercase font-semibold">NOTICE PERIOD</span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{keyTerms.terminationNotice}</span>
                      </div>
                    </div>
                  </div>
                )}

                {keyTerms.confidentialityTerm && (
                  <div className="p-0.5 rounded-lg bg-gradient-to-b from-purple-500/20 to-transparent border border-purple-500/25">
                    <div className="bg-white dark:bg-[#161822] rounded-md px-2.5 py-1.5 flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <div className="truncate">
                        <span className="text-zinc-400 text-[9px] block uppercase font-semibold">CONFIDENTIALITY</span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">{keyTerms.confidentialityTerm}</span>
                      </div>
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
            <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#14161E] border border-[#E6E2D9] dark:border-[#2C303E] text-[#8F6E3B] dark:text-[#D8BE96] flex items-center justify-center mb-4 shadow-sm">
              <Scale className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 font-serif">
              Select Contract Matter to Begin
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mt-1.5 leading-relaxed">
              Check one or multiple agreements from the library to unlock citation-verified analysis, BM25 clause retrieval, and agentic diligence.
            </p>
          </div>
        ) : messages.length === 0 && !isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-2xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#16171B] dark:bg-[#F2F1EE] text-[#C5A880] dark:text-[#8F6E3B] flex items-center justify-center mb-4 shadow-md">
              <Scale className="w-7 h-7" />
            </div>
            <h3 className="font-serif text-xl font-medium text-zinc-900 dark:text-zinc-100 tracking-tight">
              Contract Intelligence Workbench
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mt-2 leading-relaxed">
              Every finding is grounded exclusively in verified verbatim contract text. Select a structured legal inquiry or enter a custom prompt:
            </p>

            {/* Tactile Diligence Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full mt-6 text-left">
              {lawyerQuickPrompts.map((item) => (
                <motion.button
                  key={item.label}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSendMessage(item.prompt)}
                  className="group relative p-3 rounded-xl border border-[#E6E2D9] dark:border-[#262A36] bg-white dark:bg-[#13151D] hover:border-[#C5A880] dark:hover:border-[#C5A880]/60 transition-all shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono font-bold tracking-wider text-[#8F6E3B] dark:text-[#D8BE96]">
                        {item.category}
                      </span>
                      <div className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-[#1E212D] text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white flex items-center justify-center transition-colors">
                        <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </div>
                    </div>
                    <div className="font-serif text-xs font-semibold text-zinc-800 dark:text-zinc-200 mt-1">
                      {item.label}
                    </div>
                  </div>
                  <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2 line-clamp-2 leading-relaxed">
                    {item.prompt}
                  </p>
                </motion.button>
              ))}
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
                  <div className="w-8 h-8 rounded-lg bg-[#16171B] dark:bg-[#F2F1EE] text-[#C5A880] dark:text-[#8F6E3B] flex items-center justify-center shrink-0 mt-1 text-xs shadow-xs border border-zinc-700/30">
                    <Scale className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-[96%] sm:max-w-[90%] min-w-0 flex-1 space-y-3 ${isUser ? "ml-auto" : ""}`}>
                  {isUser ? (
                    /* User Inquiry Bubble */
                    <div className="rounded-xl px-4 py-3 bg-[#18191E] dark:bg-[#1A1D24] text-white border border-zinc-700/60 dark:border-zinc-700/50 shadow-sm break-words">
                      <div className="flex items-center justify-between gap-3 text-[10px] font-mono text-zinc-400 mb-1.5 border-b border-zinc-700/50 pb-1">
                        <span className="uppercase tracking-wider font-semibold text-[#D8BE96]">
                          INQUIRY // MATTER COUNSEL
                        </span>
                        <span>
                          {msg.createdAt
                            ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : "RECORDED"}
                        </span>
                      </div>
                      <div className="text-xs leading-relaxed font-sans break-words">{msg.content}</div>
                    </div>
                  ) : (
                    /* Assistant Legal Memorandum */
                    <div className="rounded-xl border border-[#E6E2D9] dark:border-[#222532] bg-white dark:bg-[#121419] shadow-sm overflow-hidden legal-memo-paper min-w-0">
                      {/* Memorandum Docket Header */}
                      <div className="px-4 py-2.5 bg-[#FAF8F5] dark:bg-[#15171F] border-b border-[#E6E2D9] dark:border-[#222532] flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                        <div className="flex items-center gap-1.5 shrink-0">
                          <FileText className="w-3.5 h-3.5 text-[#C5A880]" />
                          <span className="font-bold tracking-wider uppercase text-zinc-800 dark:text-zinc-200">
                            MEMORANDUM OF LAW
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 shrink-0">
                          <span className="font-mono">
                            DOCKET #{msg.id.slice(-6).toUpperCase()}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            GROUNDED
                          </span>
                        </div>
                      </div>

                      {/* Agentic Autonomous Research Drawer */}
                      {steps.length > 0 && (
                        <div className="mx-4 mt-3 rounded-lg border border-[#E6E2D9] dark:border-[#262A34] bg-[#FAF8F5]/80 dark:bg-[#15171E]/80 p-2.5 text-xs font-mono">
                          <button
                            onClick={() => toggleSteps(msg.id)}
                            className="flex items-center justify-between w-full text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                          >
                            <span className="flex items-center gap-2 text-[11px]">
                              <Compass className="w-3.5 h-3.5 text-[#C5A880]" />
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                Autonomous Tool Trace ({steps.length} rounds)
                              </span>
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-2 pt-2 border-t border-[#E6E2D9] dark:border-[#262A34] space-y-2 text-[10px]"
                              >
                                {steps.map((step, sIdx) => (
                                  <div
                                    key={step.id || sIdx}
                                    className="p-1.5 rounded bg-white dark:bg-[#101217] border border-[#E6E2D9] dark:border-[#242732] flex items-start gap-2"
                                  >
                                    <span className="mt-0.5 shrink-0">{renderToolIcon(step.tool)}</span>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-1.5 font-bold text-zinc-800 dark:text-zinc-200">
                                        <span>Round {step.round}</span>
                                        <span className="text-zinc-400 font-normal">|</span>
                                        <span className="text-[#8F6E3B] dark:text-[#D8BE96]">{step.tool}</span>
                                      </div>
                                      <div className="text-zinc-600 dark:text-zinc-400 mt-0.5">{step.message}</div>
                                    </div>
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}

                      {/* Memorandum Content */}
                      <div className="px-5 py-4 text-xs leading-relaxed text-zinc-800 dark:text-zinc-200 font-sans break-words overflow-hidden">
                        <div className="whitespace-pre-wrap break-words selection:bg-[#C5A880]/30">{msg.content}</div>
                      </div>

                      {/* Verified Evidence & Pin-Cites Section */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="px-5 pb-5 pt-2 border-t border-[#E6E2D9] dark:border-[#222532] space-y-2.5">
                          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                            <span className="flex items-center gap-1.5 font-bold text-zinc-700 dark:text-zinc-300">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              VERIFIED CONTRACT EVIDENCE PIN-CITES ({msg.citations.length})
                            </span>
                            <span className="text-[9px] text-[#8F6E3B] dark:text-[#D8BE96] bg-[#C5A880]/10 px-1.5 py-0.5 rounded">
                              EXACT MATCH
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-2.5">
                            {msg.citations.map((cit) => (
                              /* Concentric Double-Bezel Hardware Container */
                              <div
                                key={cit.id}
                                className={`p-1 rounded-xl transition-all ${
                                  cit.isVerified
                                    ? "bg-gradient-to-b from-[#C5A880]/20 via-[#FAF8F5] to-[#F5F2EB] dark:from-[#C5A880]/15 dark:via-[#161820] dark:to-[#111318] border border-[#C5A880]/30 dark:border-[#C5A880]/20"
                                    : "bg-gradient-to-b from-amber-500/20 to-transparent border border-amber-500/30"
                                }`}
                              >
                                <div className="bg-white dark:bg-[#14161E] rounded-lg p-3 border border-[#E6E2D9] dark:border-[#242732] shadow-2xs">
                                  <div className="flex flex-wrap items-center justify-between gap-y-1.5 gap-x-2 mb-2">
                                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                      {cit.isVerified ? (
                                        <span className="text-[9px] font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/50 flex items-center gap-1 shrink-0">
                                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                                          PIN-CITE
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-mono font-bold tracking-wider px-2 py-0.5 rounded bg-amber-50 dark:bg-yellow-950/40 text-amber-700 dark:text-yellow-300 border border-amber-300 dark:border-yellow-800/50 flex items-center gap-1 shrink-0">
                                          <AlertTriangle className="w-2.5 h-2.5" />
                                          UNVERIFIED
                                        </span>
                                      )}

                                      <span className="text-[11px] font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[130px] sm:max-w-xs">
                                        {cit.documentName}
                                      </span>

                                      {cit.pageNumber && (
                                        <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded shrink-0">
                                          p. {cit.pageNumber}
                                        </span>
                                      )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                                      {/* Copy Pin-Cite button */}
                                      <motion.button
                                        whileTap={{ scale: 0.94 }}
                                        type="button"
                                        onClick={() => copyLegalCitation(cit)}
                                        className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded border border-[#E6E2D9] dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-[#C5A880] transition-colors bg-zinc-50 dark:bg-zinc-850"
                                        title="Copy formatted citation"
                                      >
                                        {copiedCitationId === cit.id ? (
                                          <>
                                            <CheckCheck className="w-3 h-3 text-emerald-600" />
                                            <span className="text-emerald-600 font-semibold">Copied</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3 h-3 text-zinc-400" />
                                            <span>Cite</span>
                                          </>
                                        )}
                                      </motion.button>

                                      {/* Open Source Button */}
                                      {cit.isVerified && (
                                        <motion.button
                                          whileTap={{ scale: 0.94 }}
                                          type="button"
                                          onClick={() => onOpenCitation(cit)}
                                          className="group flex items-center gap-1 text-[10px] font-mono font-medium px-2.5 py-1 rounded bg-[#16171B] dark:bg-[#F2F1EE] text-white dark:text-[#16171B] hover:bg-[#282A33] dark:hover:bg-white transition-colors shadow-2xs"
                                        >
                                          <span>Inspect</span>
                                          <ArrowUpRight className="w-3 h-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                        </motion.button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Editorial Serif Blockquote */}
                                  <blockquote className="border-l-2 border-[#C5A880] pl-3 italic text-zinc-700 dark:text-zinc-300 font-serif text-xs leading-relaxed my-2">
                                    &ldquo;{cit.quote}&rdquo;
                                  </blockquote>

                                  {!cit.isVerified && cit.reason && (
                                    <p className="text-[10px] text-amber-700 dark:text-yellow-400 mt-1.5 font-mono">
                                      {cit.reason}
                                    </p>
                                  )}

                                  {cit.occurrencesCount > 1 && (
                                    <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 mt-1">
                                      Appears {cit.occurrencesCount} times in agreement (pointing to primary anchor)
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Grounding Seal Footer */}
                          <div className="pt-2 flex items-center justify-between text-[9px] font-mono text-zinc-400 dark:text-zinc-500">
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                              <Award className="w-3 h-3" />
                              INDEPENDENT GROUNDING VERIFICATION PASSED
                            </span>
                            <span>ZERO HALLUCINATIONS TOLERATED</span>
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
            <div className="w-8 h-8 rounded-lg bg-[#16171B] dark:bg-[#F2F1EE] text-[#C5A880] dark:text-[#8F6E3B] flex items-center justify-center shrink-0 mt-1 text-xs shadow-xs border border-zinc-700/30">
              <Scale className="w-4 h-4 animate-pulse" />
            </div>

            <div className="space-y-2 max-w-[85%]">
              {activeSteps.length > 0 && (
                <div className="rounded-lg border border-[#E6E2D9] dark:border-[#262A34] bg-white dark:bg-[#14161C] p-3 text-xs text-zinc-700 dark:text-zinc-300 font-mono shadow-2xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#C5A880] animate-ping shrink-0" />
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {activeSteps[activeSteps.length - 1].message}
                    </span>
                  </div>
                </div>
              )}

              <div className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 bg-white/60 dark:bg-[#14161C]/60 px-3 py-1.5 rounded-full border border-[#E6E2D9] dark:border-[#242730]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C5A880] animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#C5A880] animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#C5A880] animate-bounce [animation-delay:0.4s]" />
                <span className="ml-1 font-medium">Synthesizing citation-verified legal memorandum...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input box - Double-Bezel Hardware Architecture */}
      <div className="p-3 lg:p-4 border-t border-[#E6E2D9] dark:border-[#222530] bg-white/95 dark:bg-[#101217]/95 backdrop-blur-md">
        <form onSubmit={handleSubmit}>
          <div className="p-1 rounded-2xl bg-[#F0EDE6] dark:bg-[#161822] border border-[#E6E2D9] dark:border-[#2A2E3D] shadow-2xs">
            <div className="bg-white dark:bg-[#0E1015] rounded-xl p-2 relative">
              <textarea
                ref={textareaRef}
                rows={2}
                value={input}
                disabled={selectedDocs.length === 0}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedDocs.length === 0
                    ? "Select a contract from the library to ask questions..."
                    : "Ask about liability caps, notice periods, governing law... (Shift+Enter for newline)"
                }
                className="w-full resize-none bg-transparent px-2.5 py-1.5 pr-28 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none disabled:opacity-50 font-sans"
              />

              <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
                {isLoading ? (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={onStopGeneration}
                    title="Stop generation"
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#A82E2E] hover:bg-[#8F2626] rounded-lg transition-colors shadow-2xs"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Stop</span>
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    type="submit"
                    disabled={!input.trim() || selectedDocs.length === 0}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#16171B] hover:bg-[#282A33] dark:bg-[#F2F1EE] dark:text-[#16171B] dark:hover:bg-white disabled:opacity-40 rounded-lg transition-colors shadow-2xs"
                  >
                    <span>Execute</span>
                    <Send className="w-3 h-3" />
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
