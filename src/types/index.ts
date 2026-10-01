export type FileType = "pdf" | "docx";

export interface DocumentSummary {
  id: string;
  name: string;
  fileType: FileType;
  fileSize: number;
  filePath?: string;
  pageCount: number;
  totalChars: number;
  status: "ready" | "processing" | "error";
  errorMessage?: string | null;
  createdAt: string;
  _count?: {
    chunks: number;
  };
}

export interface DocumentPageDetail {
  pageNumber: number;
  text: string;
}

export interface DocumentChunkDetail {
  id: string;
  chunkIndex: number;
  pageNumber: number;
  sectionTitle: string;
  content: string;
}

export interface DocumentDetail extends DocumentSummary {
  fileUrl: string;
  extractedText?: string;
  htmlContent: string | null;
  pages: DocumentPageDetail[];
  chunks: DocumentChunkDetail[];
}

export interface VerifiedCitation {
  id: string;
  quote: string;
  documentId: string;
  documentName: string;
  pageNumber: number | null;
  sectionTitle?: string;
  isVerified: boolean;
  matchedText: string | null;
  occurrencesCount: number;
  reason?: string;
}

export interface AgentResearchStep {
  id: string;
  round: number;
  tool: string;
  message: string;
  status: "running" | "completed" | "error";
  timestamp: number;
  output?: string;
}

export interface ChatMessageItem {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: VerifiedCitation[];
  researchSteps?: AgentResearchStep[];
  createdAt?: string;
}

export interface ActiveHighlight {
  documentId: string;
  pageNumber: number;
  matchedText: string;
  quote: string;
  targetId?: string;
}
