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

// -------------------------------------------------------------
// Legal Diligence & Risk Engine Types
// -------------------------------------------------------------

export type PlaybookType = "enterprise-buyer" | "saas-vendor" | "balanced";

export type RiskSeverity = "critical" | "high" | "medium" | "low" | "compliant";

export type RiskCategory =
  | "liability"
  | "indemnity"
  | "termination"
  | "data_privacy"
  | "ip"
  | "confidentiality"
  | "governing_law"
  | "warranties";

export interface RiskFinding {
  id: string;
  category: RiskCategory;
  categoryLabel: string;
  title: string;
  severity: RiskSeverity;
  quote: string;
  pageNumber: number;
  analysis: string;
  businessImpact: string;
  recommendedAction: string;
  suggestedFallbackClause?: string;
}

export interface MissingClauseFinding {
  id: string;
  title: string;
  category: RiskCategory;
  severity: RiskSeverity;
  description: string;
  riskExplanation: string;
  standardMarketLanguage: string;
}

export interface ContractHealthAudit {
  documentId: string;
  documentName: string;
  playbook: PlaybookType;
  overallScore: number;
  grade: "A" | "B" | "C" | "D";
  gradeDescription: string;
  summary: string;
  findings: RiskFinding[];
  missingClauses: MissingClauseFinding[];
  stats: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    compliantCount: number;
    missingCount: number;
  };
}

export type RedlinePerspective = "buyer" | "seller" | "balanced";

export interface DiffWordItem {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export interface RedlineProposal {
  id: string;
  clauseTitle: string;
  category: RiskCategory;
  originalText: string;
  proposedText: string;
  perspective: RedlinePerspective;
  diffParts: DiffWordItem[];
  counselRationale: string[];
  counterProposalMemo: {
    subject: string;
    recipient: string;
    body: string;
  };
}

