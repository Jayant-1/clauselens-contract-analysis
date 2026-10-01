"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  UploadCloud,
  Trash2,
  CheckSquare,
  Square,
  Scale,
  GitCompare,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";
import { DocumentSummary } from "@/types";

interface SidebarProps {
  documents: DocumentSummary[];
  selectedDocIds: string[];
  activeViewerDocId: string | null;
  onToggleSelectDoc: (id: string) => void;
  onSelectAllDocs: () => void;
  onDeselectAllDocs: () => void;
  onOpenDocInViewer: (id: string) => void;
  onDeleteDoc: (id: string, name: string) => Promise<void>;
  onUploadSuccess: () => Promise<void>;
  onOpenCompareModal: () => void;
  onCloseMobile?: () => void;
}

export function Sidebar({
  documents,
  selectedDocIds,
  activeViewerDocId,
  onToggleSelectDoc,
  onSelectAllDocs,
  onDeselectAllDocs,
  onOpenDocInViewer,
  onDeleteDoc,
  onUploadSuccess,
  onOpenCompareModal,
  onCloseMobile,
}: SidebarProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<{ id: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadFile = async (file: File) => {
    setErrorMessage(null);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "pdf" && ext !== "docx") {
      setErrorMessage(
        `Unsupported format ".${ext}". ClauseLens strictly accepts PDF (.pdf) and DOCX (.docx) legal contracts.`
      );
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(20);
      setUploadStatusText("Uploading contract...");

      const formData = new FormData();
      formData.append("file", file);

      const timer = setTimeout(() => {
        setUploadProgress(55);
        setUploadStatusText("Extracting clauses & detecting text...");
      }, 500);

      const timer2 = setTimeout(() => {
        setUploadProgress(80);
        setUploadStatusText("Chunking & indexing for retrieval...");
      }, 1200);

      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      clearTimeout(timer);
      clearTimeout(timer2);

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to process contract.");
      }

      setUploadProgress(100);
      setUploadStatusText("Ready");
      await onUploadSuccess();
      onOpenDocInViewer(data.document.id);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStatusText("");
        if (onCloseMobile) onCloseMobile();
      }, 600);
    } catch (err: unknown) {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatusText("");
      setErrorMessage(err instanceof Error ? err.message : "Contract upload failed.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  return (
    <aside className="w-full lg:w-72 border-r border-[#E6E2D9] dark:border-[#242730] bg-[#FBF9F6] dark:bg-[#0C0D10] flex flex-col h-full select-none">
      {/* Brand Header */}
      <div className="px-4 py-3.5 border-b border-[#E6E2D9] dark:border-[#242730] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#16171B] dark:bg-[#F2F1EE] flex items-center justify-center text-[#C5A880] dark:text-[#8F6E3B] shadow-xs">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm tracking-tight leading-none font-serif">
                ClauseLens
              </h1>
              <span className="text-[9px] font-mono uppercase px-1 py-0.2 rounded bg-[#C5A880]/15 text-[#8F6E3B] dark:text-[#D8BE96] font-bold">
                LEGAL
              </span>
            </div>
            <p className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 mt-0.5">
              Verified Contract Intelligence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {documents.length >= 2 && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onOpenCompareModal}
              title="Compare two contract versions"
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-[#14161B] hover:border-[#C5A880]/50 border border-[#E6E2D9] dark:border-[#242730] rounded-md transition-colors shadow-2xs"
            >
              <GitCompare className="w-3 h-3 text-[#C5A880]" />
              Compare
            </motion.button>
          )}

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Upload Dropzone */}
      <div className="p-3">
        <motion.div
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border border-dashed rounded-lg p-3.5 text-center cursor-pointer transition-all ${
            isUploading
              ? "border-[#C5A880] bg-[#C5A880]/5 dark:bg-[#C5A880]/10"
              : "border-[#D5CFC4] dark:border-[#2C303B] hover:border-[#C5A880] dark:hover:border-[#C5A880]/70 bg-white dark:bg-[#14161B]/60 shadow-2xs"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileChange}
            className="hidden"
          />

          {isUploading ? (
            <div className="space-y-2 py-0.5">
              <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-[#8F6E3B] dark:text-[#D8BE96]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{uploadStatusText}</span>
              </div>
              <div className="w-full bg-[#E6E2D9] dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                <motion.div
                  className="bg-[#C5A880] h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2.5 text-zinc-600 dark:text-zinc-400">
              <div className="w-8 h-8 rounded-full bg-[#F4F1EA] dark:bg-zinc-800/80 flex items-center justify-center text-[#8F6E3B] dark:text-[#D8BE96] shrink-0">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                  Upload Contract
                </p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                  PDF / DOCX (150+ pages)
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Error notification banner */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mt-2.5 p-2.5 bg-[#FDF0F0] dark:bg-red-950/30 border border-[#A82E2E]/20 rounded-md text-[#A82E2E] dark:text-red-300 text-xs flex items-start gap-2"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed text-[11px]">{errorMessage}</div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-[#A82E2E]/70 hover:text-[#A82E2E] font-bold text-xs"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Library Controls */}
      <div className="px-3.5 py-1.5 flex items-center justify-between text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
        <span className="tracking-wider">CONTRACTS ({documents.length})</span>
        {documents.length > 1 && (
          <div className="flex items-center gap-1.5 text-[10px]">
            <button
              onClick={onSelectAllDocs}
              className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
            >
              Select All
            </button>
            <span>/</span>
            <button
              onClick={onDeselectAllDocs}
              className="hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1.5 scrollbar-thin">
        {documents.length === 0 ? (
          <div className="text-center py-12 px-3">
            <div className="w-10 h-10 rounded-full bg-[#F4F1EA] dark:bg-zinc-800/60 flex items-center justify-center mx-auto mb-2 text-zinc-400">
              <FileText className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              No contracts loaded
            </p>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 leading-relaxed">
              Upload an agreement to analyze clauses with verified citations.
            </p>
          </div>
        ) : (
          documents.map((doc) => {
            const isSelected = selectedDocIds.includes(doc.id);
            const isViewerActive = activeViewerDocId === doc.id;

            return (
              <motion.div
                key={doc.id}
                whileHover={{ scale: 1.008 }}
                whileTap={{ scale: 0.99 }}
                className={`group relative rounded-lg border p-2.5 transition-colors cursor-pointer ${
                  isViewerActive
                    ? "bg-white dark:bg-[#14161B] border-[#C5A880] shadow-xs"
                    : "bg-white dark:bg-[#14161B]/50 border-[#E6E2D9] dark:border-[#242730] hover:border-[#D5CFC4] dark:hover:border-zinc-700"
                }`}
                onClick={() => {
                  onOpenDocInViewer(doc.id);
                  if (onCloseMobile) onCloseMobile();
                }}
              >
                <div className="flex items-start gap-2">
                  {/* Select for chat checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelectDoc(doc.id);
                    }}
                    title={isSelected ? "Deselect for inquiry" : "Select for inquiry"}
                    className="mt-0.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 shrink-0"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-[#8F6E3B] dark:text-[#D8BE96]" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-700" />
                    )}
                  </button>

                  {/* Doc details */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate"
                      title={doc.name}
                    >
                      {doc.name}
                    </p>

                    <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px]">
                      <span
                        className={`px-1 py-0.2 rounded text-[9px] font-semibold ${
                          doc.fileType === "pdf"
                            ? "bg-[#FDF0F0] text-[#A82E2E] dark:bg-red-950/40 dark:text-red-300"
                            : "bg-[#EBF5FA] text-[#1F6C9F] dark:bg-blue-950/40 dark:text-blue-300"
                        }`}
                      >
                        {doc.fileType.toUpperCase()}
                      </span>

                      <span className="text-zinc-400 dark:text-zinc-500">
                        {doc.pageCount}p
                      </span>

                      <span className="text-zinc-300 dark:text-zinc-700">•</span>

                      <span className="text-zinc-400 dark:text-zinc-500">
                        {formatFileSize(doc.fileSize)}
                      </span>
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDocToDelete({ id: doc.id, name: doc.name });
                    }}
                    title="Delete contract and chat history"
                    className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-[#A82E2E] p-1 transition-opacity shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Selected indicator footer */}
      <div className="p-3 border-t border-[#E6E2D9] dark:border-[#242730] bg-[#FBF9F6] dark:bg-[#0C0D10]">
        <div className="flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400 font-mono">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                selectedDocIds.length > 0 ? "bg-[#10B981] animate-pulse" : "bg-zinc-300 dark:bg-zinc-700"
              }`}
            />
            {selectedDocIds.length} active in query scope
          </span>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {docToDelete && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#14161B] border border-[#E6E2D9] dark:border-[#242730] rounded-xl p-5 max-w-sm w-full shadow-lg"
            >
              <div className="flex items-center gap-2.5 text-[#A82E2E] mb-3">
                <Trash2 className="w-4 h-4 shrink-0" />
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm font-serif">
                  Delete Contract
                </h3>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-4">
                Permanently remove <strong>&ldquo;{docToDelete.name}&rdquo;</strong> and all associated chunks and chat history?
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setDocToDelete(null)}
                  className="px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={async () => {
                    const target = docToDelete;
                    setDocToDelete(null);
                    if (target) await onDeleteDoc(target.id, target.name);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-[#A82E2E] hover:bg-[#8F2626] rounded-md transition-colors shadow-2xs"
                >
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </aside>
  );
}
