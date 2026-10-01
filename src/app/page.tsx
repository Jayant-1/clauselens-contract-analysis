"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sidebar } from "@/components/Sidebar";
import { ChatArea } from "@/components/ChatArea";
import { DocumentViewer } from "@/components/DocumentViewer";
import { ComparisonView } from "@/components/ComparisonView";
import {
  DocumentSummary,
  DocumentDetail,
  ChatMessageItem,
  VerifiedCitation,
  AgentResearchStep,
  ActiveHighlight,
} from "@/types";
import {
  Scale,
  MessageSquare,
  FileText,
  Menu,
  GitCompare,
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
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [activeMobileTab, setActiveMobileTab] = useState<"chat" | "viewer">("chat");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

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
  };

  return (
    <main className="flex flex-col h-screen w-screen overflow-hidden bg-[#FBF9F6] dark:bg-[#0C0D10] text-zinc-900 dark:text-zinc-100 font-sans">
      {/* Mobile Top Navigation Header (< lg) */}
      <header className="lg:hidden px-4 py-2.5 bg-white/95 dark:bg-[#111216]/95 backdrop-blur-md border-b border-[#E6E2D9] dark:border-[#242730] flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-1.5 -ml-1 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
            title="Open contract drawer"
          >
            <Menu className="w-5 h-5 text-[#C5A880]" />
          </button>

          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded bg-[#16171B] dark:bg-[#F2F1EE] flex items-center justify-center text-[#C5A880] dark:text-[#8F6E3B]">
              <Scale className="w-3.5 h-3.5" />
            </div>
            <span className="font-serif font-bold text-xs tracking-tight text-zinc-900 dark:text-zinc-100">
              ClauseLens
            </span>
          </div>
        </div>

        {/* Mobile View Switcher Segmented Control */}
        <div className="flex items-center bg-[#FAF8F5] dark:bg-zinc-850 border border-[#E6E2D9] dark:border-[#2C303B] rounded-lg p-0.5 text-xs font-mono">
          <button
            onClick={() => setActiveMobileTab("chat")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
              activeMobileTab === "chat"
                ? "bg-white dark:bg-[#15171D] text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <MessageSquare className="w-3 h-3" />
            <span>Chat</span>
          </button>

          <button
            onClick={() => setActiveMobileTab("viewer")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors relative ${
              activeMobileTab === "viewer"
                ? "bg-white dark:bg-[#15171D] text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs"
                : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            <FileText className="w-3 h-3" />
            <span>Document</span>
            {activeHighlight && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#C5A880] animate-ping absolute top-1 right-1" />
            )}
          </button>
        </div>

        {documents.length >= 2 && (
          <button
            onClick={() => setIsCompareOpen(true)}
            className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
            title="Compare contracts"
          >
            <GitCompare className="w-4 h-4 text-[#C5A880]" />
          </button>
        )}
      </header>

      {/* Main Workspace Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Left Sidebar (>= lg) */}
        <div className="hidden lg:flex shrink-0">
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
          />
        </div>

        {/* Mobile Sliding Drawer (< lg) */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden flex">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileSidebarOpen(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 350, damping: 32 }}
                className="relative w-80 max-w-[85vw] h-full z-10 shadow-2xl"
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

        {/* Responsive Content Switching */}
        {/* Desktop View: Both ChatArea and DocumentViewer rendered side-by-side */}
        <div className="hidden lg:flex flex-1 h-full overflow-hidden">
          <ChatArea
            selectedDocs={documents.filter((d) => selectedDocIds.includes(d.id))}
            messages={messages}
            isLoading={isLoading}
            activeSteps={activeSteps}
            onSendMessage={handleSendMessage}
            onStopGeneration={handleStopGeneration}
            onOpenCitation={handleOpenCitation}
            activeDocText={activeViewerDoc?.extractedText || ""}
          />

          <DocumentViewer
            document={activeViewerDoc}
            activeHighlight={activeHighlight}
            onClearHighlight={() => setActiveHighlight(null)}
            onCloseViewer={() => setActiveViewerDoc(null)}
          />
        </div>

        {/* Mobile View: Shows either ChatArea or DocumentViewer based on activeMobileTab */}
        <div className="flex lg:hidden flex-1 h-full overflow-hidden">
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
            />
          ) : (
            <DocumentViewer
              document={activeViewerDoc}
              activeHighlight={activeHighlight}
              onClearHighlight={() => setActiveHighlight(null)}
              onCloseViewer={() => setActiveViewerDoc(null)}
              onBackToChatMobile={() => setActiveMobileTab("chat")}
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
    </main>
  );
}
