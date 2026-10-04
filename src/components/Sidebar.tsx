"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  UploadCloud,
  Trash2,
  CheckSquare,
  Square,
  GitCompare,
  AlertCircle,
  Loader2,
  X,
  FolderOpen,
  PanelLeftClose,
} from "lucide-react";
import { DocumentSummary } from "@/types";
import { UntitledUiLogo } from "@/components/UntitledUiLogo";

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
  onToggleCollapse?: () => void;
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
  onToggleCollapse,
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
    <aside className="w-full flex flex-col h-full select-none bg-white overflow-hidden text-zinc-900 font-sans">
      {/* Dossier Header */}
      <div className="px-4 py-3.5 border-b border-[#E5E5E2] flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#1E3A8A]/10 text-[#1E3A8A] flex items-center justify-center">
            <FolderOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="font-editorial text-sm font-semibold text-zinc-900">
                Agreements
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-zinc-100 text-zinc-600 font-medium">
                {documents.length}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onCloseMobile && documents.length >= 2 && (
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={onOpenCompareModal}
              title="Compare two contract versions"
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-zinc-700 bg-white hover:border-[#1E3A8A] border border-[#E5E5E2] rounded-md transition-colors shadow-xs"
            >
              <GitCompare className="w-3 h-3 text-[#1E3A8A]" />
              <span>Compare</span>
            </motion.button>
          )}

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-[#F4F4F0] rounded-md transition-colors"
              title="Collapse sidebar (Ctrl+B)"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 rounded-md"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Intake Upload Section */}
      <div className="p-3 shrink-0">
        <motion.div
          whileHover={{ scale: 1.005 }}
          whileTap={{ scale: 0.995 }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`rounded-xl p-3.5 text-center cursor-pointer transition-all ${
            isUploading
              ? "border border-[#1E3A8A] bg-[#1E3A8A]/5"
              : "border border-dashed border-[#D4D4D0] hover:border-[#1E3A8A] bg-[#FAFAF8] hover:bg-white"
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
            <div className="space-y-2 py-1">
              <div className="flex items-center justify-center gap-1.5 text-xs font-mono text-[#1E3A8A] font-semibold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{uploadStatusText}</span>
              </div>
              <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                <motion.div
                  className="bg-[#1E3A8A] h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2.5 text-zinc-600 py-0.5">
              <div className="w-7 h-7 rounded-lg bg-white border border-[#E5E5E2] flex items-center justify-center text-[#1E3A8A] shrink-0 shadow-2xs">
                <UploadCloud className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-xs font-medium text-zinc-900 font-sans">
                  Upload Contract
                </p>
                <p className="text-[10px] text-zinc-400 font-mono">
                  PDF or DOCX (up to 200 pages)
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
              className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-start gap-2"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1 leading-relaxed text-[11px]">{errorMessage}</div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-red-500 hover:text-red-700 font-bold text-xs"
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Library Selection Controls */}
      <div className="px-4 py-2 flex items-center justify-between text-[11px] text-zinc-500 border-b border-[#E5E5E2] bg-[#FAFAF8] shrink-0">
        <span className="font-medium text-zinc-600">PORTFOLIO ({documents.length})</span>
        {documents.length > 1 && (
          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={onSelectAllDocs}
              className="hover:text-[#1E3A8A] transition-colors"
            >
              All
            </button>
            <span className="text-zinc-300">•</span>
            <button
              onClick={onDeselectAllDocs}
              className="hover:text-[#1E3A8A] transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
        {documents.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center text-center p-4">
            <UntitledUiLogo className="w-8 h-8 opacity-60 mb-2 grayscale" size={32} />
            <p className="text-xs font-medium text-zinc-700">
              No contracts loaded
            </p>
            <p className="text-[11px] text-zinc-400 mt-1 max-w-[180px]">
              Drop contract PDF or DOCX files above to index clauses.
            </p>
          </div>
        ) : (
          documents.map((doc, idx) => {
            const isSelected = selectedDocIds.includes(doc.id);
            const isActiveViewer = activeViewerDocId === doc.id;

            return (
              <motion.div
                key={doc.id}
                data-tour={idx === 0 ? "contract-item" : undefined}
                whileHover={{ y: -1 }}
                onClick={() => onOpenDocInViewer(doc.id)}
                className={`group relative rounded-xl p-3 cursor-pointer transition-all border ${
                  isActiveViewer
                    ? "bg-[#1E3A8A]/5 border-[#1E3A8A] shadow-xs"
                    : "bg-white border-[#E5E5E2] hover:border-zinc-300 hover:bg-[#FAFAF8]"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {/* Select for inquiry checkbox */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelectDoc(doc.id);
                    }}
                    title={isSelected ? "Deselect for inquiry" : "Select for inquiry"}
                    className="mt-0.5 text-zinc-400 hover:text-zinc-900 shrink-0"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-[#1E3A8A]" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-300 hover:text-zinc-500" />
                    )}
                  </button>

                  {/* Doc details */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-medium text-zinc-900 truncate font-sans"
                      title={doc.name}
                    >
                      {doc.name}
                    </p>

                    <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px]">
                      <span className="px-1.5 py-0.2 rounded font-medium bg-zinc-100 text-zinc-600 border border-zinc-200 uppercase">
                        {doc.fileType}
                      </span>

                      <span className="text-zinc-500">
                        {doc.pageCount} {doc.pageCount === 1 ? "pg" : "pgs"}
                      </span>

                      <span className="text-zinc-300">•</span>

                      <span className="text-zinc-400">
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
                    className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-600 p-1 transition-opacity shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Selected Scope Footer */}
      <div className="p-3 border-t border-[#E5E5E2] bg-[#FAFAF8] shrink-0">
        <div className="flex items-center justify-between text-xs text-zinc-600">
          <span className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                selectedDocIds.length > 0 ? "bg-emerald-500" : "bg-zinc-300"
              }`}
            />
            <span className="font-medium text-[11px]">
              {selectedDocIds.length} {selectedDocIds.length === 1 ? "matter" : "matters"} in scope
            </span>
          </span>
          <span className="text-[10px] text-zinc-400 font-mono">
            {documents.length} loaded
          </span>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {docToDelete && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl p-5 max-w-sm w-full shadow-xl"
            >
              <div className="flex items-center gap-2.5 text-red-600 mb-3">
                <Trash2 className="w-4 h-4 shrink-0" />
                <h3 className="font-semibold text-slate-900 text-sm font-grotesk">
                  Delete Contract
                </h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Permanently remove <strong>&ldquo;{docToDelete.name}&rdquo;</strong> and all associated chunks and chat history?
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setDocToDelete(null)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
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
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-xs font-grotesk"
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
