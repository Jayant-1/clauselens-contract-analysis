"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sidebar } from "@/components/Sidebar";
import { ChatArea } from "@/components/ChatArea";
import { DocumentViewer } from "@/components/DocumentViewer";
import { ComparisonView } from "@/components/ComparisonView";
import { RiskAuditModal } from "@/components/RiskAuditModal";
import { RedlineStudioModal } from "@/components/RedlineStudioModal";
import { DiligenceReportModal } from "@/components/DiligenceReportModal";
import { InteractiveTour } from "@/components/InteractiveTour";
import { UntitledUiLogo } from "@/components/UntitledUiLogo";
import { auditContractRisk } from "@/lib/risk-engine";
import {
  DocumentSummary,
  DocumentDetail,
  ChatMessageItem,
  VerifiedCitation,
  AgentResearchStep,
  ActiveHighlight,
  RiskCategory,
} from "@/types";
import {
  MessageSquare,
  FileText,
  Menu,
  GitCompare,
  PanelLeftOpen,
  Columns2,
  BookOpen,
  EyeOff,
  Eye,
  ShieldAlert,
  Compass,
} from "lucide-react";

export default function Home() {
  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [activeViewerDoc, setActiveViewerDoc] = useState<DocumentDetail | null>(null);
  const [activeHighlight, setActiveHighlight] = useState<ActiveHighlight | null>(null);
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSteps, setActiveSteps] = useState<AgentResearchStep[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [isRiskAuditOpen, setIsRiskAuditOpen] = useState(false);
  const [isRedlineStudioOpen, setIsRedlineStudioOpen] = useState(false);
  const [isDiligenceReportOpen, setIsDiligenceReportOpen] = useState(false);
  const [redlineTarget, setRedlineTarget] = useState<{
    clauseTitle: string;
    category: RiskCategory;
    quote: string;
  } | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<"chat" | "viewer">("chat");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Interactive Product Walkthrough Tour State
  const [isTourActive, setIsTourActive] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);

  // Smart Focus & Whitespace Controls
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<"split" | "chat" | "document">("split");
  const [isZenMode, setIsZenMode] = useState(false);

  // Keyboard shortcut: Ctrl+B / Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const abortControllerRef = useRef<AbortController | null>(null);

  const activeDocAudit = useMemo(() => {
    if (!activeViewerDoc) return null;
    return auditContractRisk({
      documentId: activeViewerDoc.id,
      documentName: activeViewerDoc.name,
      extractedText: activeViewerDoc.extractedText || "",
      pages: activeViewerDoc.pages,
    });
  }, [activeViewerDoc]);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (data.success && Array.isArray(data.documents)) {
        setDocuments(data.documents);
        // Default select the first document if none selected
        if (data.documents.length > 0 && selectedDocIds.length === 0) {
          setSelectedDocIds([data.documents[0].id]);
          handleOpenDocInViewer(data.documents[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
    }
  }, [selectedDocIds.length]);

  // Load documents on mount
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Re-load saved chat history whenever selectedDocIds changes
  useEffect(() => {
    if (selectedDocIds.length === 0) {
      setMessages([]);
      setCurrentSessionId(null);
      return;
    }

    async function loadChatHistory() {
      try {
        const query = selectedDocIds.join(",");
        const res = await fetch(`/api/chat?documentIds=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success && data.session) {
          setCurrentSessionId(data.session.id);
          setMessages(data.session.messages || []);
        } else {
          setCurrentSessionId(null);
          setMessages([]);
        }
      } catch (err) {
        console.error("Error loading chat history:", err);
      }
    }

    loadChatHistory();
  }, [selectedDocIds]);

  const handleToggleSelectDoc = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
    );
    if (isTourActive && tourStepIndex === 0) {
      setTourStepIndex(1);
    }
  };

  const handleSelectAllDocs = () => {
    setSelectedDocIds(documents.map((d) => d.id));
  };

  const handleDeselectAllDocs = () => {
    setSelectedDocIds([]);
  };

  const handleOpenDocInViewer = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`);
      const data = await res.json();
      if (data.success && data.document) {
        setActiveViewerDoc(data.document);
        if (isTourActive && tourStepIndex === 0) {
          setTourStepIndex(1);
        }
      }
    } catch (err) {
      console.error("Error loading document details:", err);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        setSelectedDocIds((prev) => prev.filter((dId) => dId !== id));
        if (activeViewerDoc?.id === id) {
          setActiveViewerDoc(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete document:", err);
    }
  };

  const handleSendMessage = async (question: string) => {
    if (!question.trim() || selectedDocIds.length === 0 || isLoading) return;

    if (isTourActive && tourStepIndex === 1) {
      setTourStepIndex(2);
    }

    // Set loading state and reset steps
    setIsLoading(true);
    setActiveSteps([]);

    const userMessage: ChatMessageItem = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: question,
      createdAt: new Date().toISOString(),
    };

    const tempAssistantId = `asst_${Date.now()}`;
    const initialAssistantMessage: ChatMessageItem = {
      id: tempAssistantId,
      role: "assistant",
      content: "",
      citations: [],
      researchSteps: [],
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);

    // Create AbortController for stop button
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          documentIds: selectedDocIds,
          sessionId: currentSessionId,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process question.");
      }

      if (!response.body) {
        throw new Error("No response stream available.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulatedAnswer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          let event = "message";
          let dataStr = "";

          const eventMatch = line.match(/^event:\s*(\w+)/m);
          if (eventMatch) event = eventMatch[1];

          const dataMatch = line.match(/^data:\s*(.+)$/m);
          if (dataMatch) dataStr = dataMatch[1];

          if (!dataStr) continue;

          try {
            const parsed = JSON.parse(dataStr);

            if (event === "init") {
              if (parsed.sessionId) setCurrentSessionId(parsed.sessionId);
            } else if (event === "step") {
              setActiveSteps((prev) => {
                const existingIdx = prev.findIndex((s) => s.id === parsed.id);
                if (existingIdx !== -1) {
                  const updated = [...prev];
                  updated[existingIdx] = parsed;
                  return updated;
                }
                return [...prev, parsed];
              });
            } else if (event === "token") {
              accumulatedAnswer += parsed.token;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === tempAssistantId
                    ? { ...msg, content: accumulatedAnswer }
                    : msg
                )
              );
            } else if (event === "done") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === tempAssistantId
                    ? {
                        ...msg,
                        id: parsed.messageId || tempAssistantId,
                        content: parsed.answer,
                        citations: parsed.citations,
                        researchSteps: parsed.steps,
                      }
                    : msg
                )
              );
            } else if (event === "error") {
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === tempAssistantId
                    ? {
                        ...msg,
                        content:
                          accumulatedAnswer ||
                          `Error: ${parsed.error || "Generation stopped or encountered an error."}`,
                      }
                    : msg
                )
              );
            }
          } catch {
            // parse error
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") {
        console.log("Generation aborted by user.");
      } else {
        console.error("Chat error:", err);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === tempAssistantId && !msg.content
              ? {
                  ...msg,
                  content: `Error: ${err instanceof Error ? err.message : "Failed to generate answer."}`,
                }
              : msg
          )
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleOpenCitation = async (citation: VerifiedCitation) => {
    // Open target document if not already in viewer
    if (activeViewerDoc?.id !== citation.documentId) {
      await handleOpenDocInViewer(citation.documentId);
    }

    setActiveHighlight({
      documentId: citation.documentId,
      pageNumber: citation.pageNumber || 1,
      matchedText: citation.matchedText || citation.quote,
      quote: citation.quote,
    });

    // Automatically navigate to viewer tab on mobile
    setActiveMobileTab("viewer");

    if (isTourActive && tourStepIndex === 2) {
      setTourStepIndex(3);
    }
  };

  const handleOpenClauseInDoc = async (
    docId: string,
    pageNumber: number,
    quote: string
  ) => {
    if (activeViewerDoc?.id !== docId) {
      await handleOpenDocInViewer(docId);
    }

    setActiveHighlight({
      documentId: docId,
      pageNumber,
      matchedText: quote,
      quote,
    });

    setActiveMobileTab("viewer");

    if (isTourActive && tourStepIndex === 2) {
      setTourStepIndex(3);
    }
  };

  const handleTourAutoPerform = useCallback(
    async (stepIdx: number) => {
      if (stepIdx === 0) {
        // Phase 1: Select Contract
        if (documents.length > 0) {
          const docId = documents[0].id;
          if (!selectedDocIds.includes(docId)) {
            setSelectedDocIds([docId]);
          }
          await handleOpenDocInViewer(docId);
          setTourStepIndex(1);
        }
      } else if (stepIdx === 1) {
        // Phase 2: Commercial Inquiry
        await handleSendMessage(
          "What is the limitation of liability cap and what exceptions apply to it?"
        );
        setTourStepIndex(2);
      } else if (stepIdx === 2) {
        // Phase 3: Pin-Cite Verification
        const lastMsgWithCitations = [...messages]
          .reverse()
          .find((m) => m.role === "assistant" && m.citations && m.citations.length > 0);

        if (
          lastMsgWithCitations &&
          lastMsgWithCitations.citations &&
          lastMsgWithCitations.citations.length > 0
        ) {
          handleOpenCitation(lastMsgWithCitations.citations[0]);
        } else if (activeViewerDoc) {
          handleOpenClauseInDoc(
            activeViewerDoc.id,
            1,
            "aggregate liability arising out of or related to this Agreement"
          );
        }
        setTourStepIndex(3);
      } else if (stepIdx === 3) {
        // Phase 4: Risk Audit Matrix
        setIsRiskAuditOpen(true);
        setTourStepIndex(4);
      } else if (stepIdx === 4) {
        // Phase 5: Redline Studio
        const findingQuote =
          activeDocAudit?.findings[0]?.quote ||
          "IN NO EVENT SHALL EITHER PARTY'S AGGREGATE LIABILITY EXCEED THE TOTAL AMOUNT PAID";
        const findingTitle =
          activeDocAudit?.findings[0]?.title || "Uncapped / Excessive Liability Ceiling";
        const findingCategory =
          (activeDocAudit?.findings[0]?.category as RiskCategory) || "liability";

        setIsRiskAuditOpen(false);
        setRedlineTarget({
          clauseTitle: findingTitle,
          category: findingCategory,
          quote: findingQuote,
        });
        setIsRedlineStudioOpen(true);
        setTourStepIndex(5);
      } else if (stepIdx === 5) {
        // Phase 6: Diligence Memo
        setIsRedlineStudioOpen(false);
        setIsDiligenceReportOpen(true);
        setTourStepIndex(6);
      }
    },
    [
      documents,
      selectedDocIds,
      handleOpenDocInViewer,
      handleSendMessage,
      messages,
      activeViewerDoc,
      handleOpenCitation,
      handleOpenClauseInDoc,
      activeDocAudit,
    ]
  );

  return (
    <main className="flex flex-col h-screen w-screen overflow-hidden bg-[#FAFAF8] text-[#18181B] font-sans">
      {/* Top Editorial Navigation Bar */}
      <header className="h-14 shrink-0 px-4 sm:px-6 flex items-center justify-between border-b border-[#E5E5E2] bg-white/80 backdrop-blur-md z-20">
        {/* Left: Sidebar Toggle & Editorial Brand */}
        <div className="flex items-center gap-3">
          {/* Mobile Drawer Button */}
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="lg:hidden p-1.5 -ml-1 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
            title="Open contract drawer"
          >
            <Menu className="w-5 h-5 text-zinc-700" />
          </button>

          <div className="flex items-center gap-2.5">
            <UntitledUiLogo className="w-7 h-7" size={28} />
            <div className="flex items-baseline gap-2">
              <span className="font-editorial text-lg font-semibold tracking-tight text-zinc-900">
                ClauseLens
              </span>
              <span className="hidden sm:inline-block font-sans text-[11px] text-zinc-500 font-medium">
                Contract Diligence
              </span>
            </div>
          </div>

          {activeViewerDoc && (
            <div className="hidden xl:flex items-center gap-2 pl-3 border-l border-[#E5E5E2] text-xs text-zinc-500 truncate max-w-xs">
              <span className="text-[10px] font-mono text-zinc-400">ACTIVE:</span>
              <span className="truncate font-medium text-zinc-800">{activeViewerDoc.name}</span>
            </div>
          )}
        </div>

        {/* Center: Smart Focus Mode Controller (Desktop) */}
        <div className="hidden md:flex items-center bg-[#F4F4F0] border border-[#E5E5E2] rounded-xl p-0.5 text-xs">
          <button
            onClick={() => setViewMode("split")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              viewMode === "split"
                ? "bg-white text-zinc-900 shadow-xs font-semibold"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
            title="Side-by-side Chat & Document Viewer"
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>Split</span>
          </button>

          <button
            onClick={() => setViewMode("chat")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              viewMode === "chat"
                ? "bg-white text-zinc-900 shadow-xs font-semibold"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
            title="Expanded Inquiry Focus (Centered single column)"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Inquiry</span>
          </button>

          <button
            onClick={() => setViewMode("document")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              viewMode === "document"
                ? "bg-white text-zinc-900 shadow-xs font-semibold"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
            title="Expanded Contract Reader"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Reader</span>
          </button>
        </div>

        {/* Right Actions: Context-Aware & Clean */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Guided Diligence Walkthrough Button */}
          <button
            data-tour="mission-trigger"
            onClick={() => {
              setIsTourActive(true);
              setTourStepIndex(0);
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border shadow-2xs ${
              isTourActive
                ? "bg-[#1E3A8A] text-white border-[#1E3A8A]"
                : "bg-white text-zinc-700 border-[#E5E5E2] hover:bg-[#F4F4F0]"
            }`}
            title="Start Interactive Guided Diligence Mission Walkthrough"
          >
            <Compass className="w-3.5 h-3.5 text-blue-600" />
            <span>Tour</span>
          </button>

          {/* Substantive Diff Button — Only shown when 2+ contracts are selected to compare */}
          {selectedDocIds.length >= 2 && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsCompareOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#1E3A8A] hover:bg-[#172554] rounded-lg transition-all shadow-xs"
              title="Compare selected contracts side-by-side"
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Compare ({selectedDocIds.length})</span>
            </motion.button>
          )}

          {/* Risk & Compliance Matrix Button — Relevant for active contract */}
          {activeViewerDoc && (
            <button
              data-tour="risk-audit-btn"
              onClick={() => {
                setIsRiskAuditOpen(true);
                if (isTourActive && tourStepIndex === 3) {
                  setTourStepIndex(4);
                }
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border bg-white border-[#E5E5E2] hover:bg-[#F4F4F0] text-zinc-700 shadow-2xs"
              title="Open Contract Risk & Compliance Audit Matrix"
            >
              <ShieldAlert
                className={`w-3.5 h-3.5 ${
                  activeDocAudit?.grade === "A"
                    ? "text-emerald-600"
                    : activeDocAudit?.grade === "B"
                    ? "text-amber-500"
                    : "text-red-500"
                }`}
              />
              <span className="hidden sm:inline">Risk Audit</span>
              {activeDocAudit && (
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded ${
                    activeDocAudit.overallScore >= 80
                      ? "bg-emerald-100 text-emerald-800"
                      : activeDocAudit.overallScore >= 60
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {activeDocAudit.overallScore} ({activeDocAudit.grade})
                </span>
              )}
            </button>
          )}

          {/* Export Diligence Memo Button — Relevant for active contract */}
          {activeViewerDoc && (
            <button
              data-tour="export-memo-btn"
              onClick={() => {
                setIsDiligenceReportOpen(true);
                if (isTourActive && tourStepIndex === 5) {
                  setTourStepIndex(6);
                }
              }}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border bg-white border-[#E5E5E2] hover:bg-[#F4F4F0] text-zinc-700 shadow-2xs"
              title="Export Board-Ready Due Diligence Memorandum"
            >
              <FileText className="w-3.5 h-3.5 text-zinc-500" />
              <span>Export Memo</span>
            </button>
          )}

          {/* Zen Focus Toggle (Compact icon button with tooltip) */}
          <button
            onClick={() => setIsZenMode(!isZenMode)}
            className={`p-1.5 rounded-lg text-xs transition-colors border ${
              isZenMode
                ? "bg-[#1E3A8A]/10 text-[#1E3A8A] border-[#1E3A8A]/30"
                : "text-zinc-500 hover:text-zinc-900 bg-white border-[#E5E5E2] hover:bg-[#F4F4F0]"
            }`}
            title={isZenMode ? "Exit Zen Focus" : "Zen Focus (Hide technical traces for clean reading)"}
          >
            {isZenMode ? (
              <EyeOff className="w-4 h-4 text-[#1E3A8A]" />
            ) : (
              <Eye className="w-4 h-4 text-zinc-500" />
            )}
          </button>

          {/* Mobile View Switcher (< md) */}
          <div className="flex md:hidden items-center bg-[#F4F4F0] border border-[#E5E5E2] rounded-lg p-0.5 text-xs">
            <button
              onClick={() => setActiveMobileTab("chat")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                activeMobileTab === "chat"
                  ? "bg-white text-zinc-900 font-semibold shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <MessageSquare className="w-3 h-3" />
              <span>Chat</span>
            </button>

            <button
              onClick={() => setActiveMobileTab("viewer")}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors relative ${
                activeMobileTab === "viewer"
                  ? "bg-white text-zinc-900 font-semibold shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>Doc</span>
              {activeHighlight && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#1E3A8A] animate-ping absolute top-1 right-1" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Floating Expand Sidebar Button (when collapsed) */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="hidden lg:flex absolute left-3 top-3 z-30 items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-[#E5E5E2] shadow-sm text-xs font-medium text-zinc-700 hover:text-zinc-900 hover:bg-[#F4F4F0] transition-colors"
            title="Expand agreements sidebar (Ctrl+B)"
          >
            <PanelLeftOpen className="w-4 h-4 text-zinc-600" />
            <span>Agreements</span>
          </button>
        )}

        {/* Collapsible Desktop Left Sidebar (>= lg) */}
        <AnimatePresence initial={false}>
          {isSidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="hidden lg:flex flex-col h-full shrink-0 border-r border-[#E5E5E2] bg-white overflow-hidden z-10"
            >
              <div className="w-[300px] h-full flex flex-col">
                <Sidebar
                  documents={documents}
                  selectedDocIds={selectedDocIds}
                  activeViewerDocId={activeViewerDoc?.id || null}
                  onToggleSelectDoc={handleToggleSelectDoc}
                  onSelectAllDocs={handleSelectAllDocs}
                  onDeselectAllDocs={handleDeselectAllDocs}
                  onOpenDocInViewer={handleOpenDocInViewer}
                  onDeleteDoc={handleDeleteDoc}
                  onUploadSuccess={fetchDocuments}
                  onOpenCompareModal={() => setIsCompareOpen(true)}
                  onToggleCollapse={() => setIsSidebarOpen(false)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Sliding Drawer (< lg) */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden flex">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileSidebarOpen(false)}
                className="fixed inset-0 bg-black/30 backdrop-blur-xs"
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 350, damping: 32 }}
                className="relative w-80 max-w-[85vw] h-full z-10 shadow-2xl bg-white border-r border-[#E5E5E2] overflow-hidden"
              >
                <Sidebar
                  documents={documents}
                  selectedDocIds={selectedDocIds}
                  activeViewerDocId={activeViewerDoc?.id || null}
                  onToggleSelectDoc={handleToggleSelectDoc}
                  onSelectAllDocs={handleSelectAllDocs}
                  onDeselectAllDocs={handleDeselectAllDocs}
                  onOpenDocInViewer={handleOpenDocInViewer}
                  onDeleteDoc={handleDeleteDoc}
                  onUploadSuccess={fetchDocuments}
                  onOpenCompareModal={() => {
                    setIsMobileSidebarOpen(false);
                    setIsCompareOpen(true);
                  }}
                  onCloseMobile={() => setIsMobileSidebarOpen(false)}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Desktop View: Governed by viewMode */}
        <div className="hidden lg:flex flex-1 h-full overflow-hidden min-w-0 bg-[#FAFAF8]">
          {viewMode === "split" && (
            <div className="flex-1 flex h-full overflow-hidden divide-x divide-[#E5E5E2]">
              <div className="flex-1 h-full overflow-hidden min-w-0 bg-white">
                <ChatArea
                  selectedDocs={documents.filter((d) => selectedDocIds.includes(d.id))}
                  messages={messages}
                  isLoading={isLoading}
                  activeSteps={activeSteps}
                  onSendMessage={handleSendMessage}
                  onStopGeneration={handleStopGeneration}
                  onOpenCitation={handleOpenCitation}
                  activeDocText={activeViewerDoc?.extractedText || ""}
                  isZenMode={isZenMode}
                  viewMode={viewMode}
                />
              </div>

              <div className="flex-1 h-full overflow-hidden min-w-0 bg-[#FAFAF8]">
                <DocumentViewer
                  document={activeViewerDoc}
                  activeHighlight={activeHighlight}
                  onClearHighlight={() => setActiveHighlight(null)}
                  onCloseViewer={() => setActiveViewerDoc(null)}
                  viewMode={viewMode}
                />
              </div>
            </div>
          )}

          {viewMode === "chat" && (
            <div className="flex-1 h-full overflow-hidden flex justify-center bg-[#FAFAF8]">
              <div className="max-w-4xl w-full h-full bg-white shadow-xs border-x border-[#E5E5E2] overflow-hidden">
                <ChatArea
                  selectedDocs={documents.filter((d) => selectedDocIds.includes(d.id))}
                  messages={messages}
                  isLoading={isLoading}
                  activeSteps={activeSteps}
                  onSendMessage={handleSendMessage}
                  onStopGeneration={handleStopGeneration}
                  onOpenCitation={handleOpenCitation}
                  activeDocText={activeViewerDoc?.extractedText || ""}
                  isZenMode={isZenMode}
                  viewMode={viewMode}
                />
              </div>
            </div>
          )}

          {viewMode === "document" && (
            <div className="flex-1 h-full overflow-hidden flex justify-center bg-[#FAFAF8]">
              <div className="max-w-5xl w-full h-full bg-white shadow-xs border-x border-[#E5E5E2] overflow-hidden">
                <DocumentViewer
                  document={activeViewerDoc}
                  activeHighlight={activeHighlight}
                  onClearHighlight={() => setActiveHighlight(null)}
                  onCloseViewer={() => setActiveViewerDoc(null)}
                  viewMode={viewMode}
                />
              </div>
            </div>
          )}
        </div>

        {/* Mobile View: Shows either ChatArea or DocumentViewer based on activeMobileTab */}
        <div className="flex lg:hidden flex-1 h-full overflow-hidden bg-white min-w-0">
          {activeMobileTab === "chat" ? (
            <ChatArea
              selectedDocs={documents.filter((d) => selectedDocIds.includes(d.id))}
              messages={messages}
              isLoading={isLoading}
              activeSteps={activeSteps}
              onSendMessage={handleSendMessage}
              onStopGeneration={handleStopGeneration}
              onOpenCitation={handleOpenCitation}
              activeDocText={activeViewerDoc?.extractedText || ""}
              onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
              isZenMode={isZenMode}
              viewMode="chat"
            />
          ) : (
            <DocumentViewer
              document={activeViewerDoc}
              activeHighlight={activeHighlight}
              onClearHighlight={() => setActiveHighlight(null)}
              onCloseViewer={() => setActiveViewerDoc(null)}
              onBackToChatMobile={() => setActiveMobileTab("chat")}
              viewMode="document"
            />
          )}
        </div>
      </div>

      {/* Comparison Modal */}
      {isCompareOpen && (
        <ComparisonView
          documents={documents}
          onClose={() => setIsCompareOpen(false)}
          onOpenClauseInDoc={handleOpenClauseInDoc}
        />
      )}

      {/* Risk & Compliance Audit Matrix Modal */}
      {isRiskAuditOpen && activeViewerDoc && (
        <RiskAuditModal
          document={activeViewerDoc}
          onClose={() => setIsRiskAuditOpen(false)}
          onOpenSourceInViewer={handleOpenClauseInDoc}
          onOpenRedlineForClause={(title, category, quote) => {
            setRedlineTarget({ clauseTitle: title, category, quote });
            setIsRiskAuditOpen(false);
            setIsRedlineStudioOpen(true);
            if (isTourActive && tourStepIndex === 4) {
              setTourStepIndex(5);
            }
          }}
          onOpenReportModal={() => {
            setIsRiskAuditOpen(false);
            setIsDiligenceReportOpen(true);
            if (isTourActive && tourStepIndex === 5) {
              setTourStepIndex(6);
            }
          }}
        />
      )}

      {/* Redline & Negotiation Studio Modal */}
      {isRedlineStudioOpen && (
        <RedlineStudioModal
          initialClauseTitle={redlineTarget?.clauseTitle || "Limitation of Liability"}
          initialCategory={redlineTarget?.category || "liability"}
          initialOriginalText={redlineTarget?.quote || ""}
          documentName={activeViewerDoc?.name || "Commercial Agreement"}
          onClose={() => setIsRedlineStudioOpen(false)}
        />
      )}

      {/* Due Diligence Memorandum Export Modal */}
      {isDiligenceReportOpen && activeViewerDoc && (
        <DiligenceReportModal
          document={activeViewerDoc}
          onClose={() => setIsDiligenceReportOpen(false)}
        />
      )}

      {/* Interactive Product Walkthrough HUD & Spotlight */}
      <InteractiveTour
        isActive={isTourActive}
        currentStepIndex={tourStepIndex}
        onStepChange={(stepIdx) => setTourStepIndex(stepIdx)}
        onClose={() => setIsTourActive(false)}
        onAutoPerform={handleTourAutoPerform}
        onRestart={() => {
          setTourStepIndex(0);
          setIsTourActive(true);
        }}
      />
    </main>
  );
}

