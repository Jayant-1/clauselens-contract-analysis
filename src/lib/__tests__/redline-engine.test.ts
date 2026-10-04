import { describe, it, expect } from "vitest";
import { generateRedlineProposal } from "../redline-engine";
import { generateMarkdownReport, generateJsonReport } from "../diligence-report";
import { auditContractRisk } from "../risk-engine";

describe("Deterministic Redline & Fallback Engine", () => {
  it("generates word-level tracked changes diff for buyer liability fallback", () => {
    const original = "In no event shall vendor's aggregate liability exceed $50,000.";
    const proposal = generateRedlineProposal({
      documentName: "Enterprise Master Agreement",
      clauseTitle: "Limitation of Liability",
      category: "liability",
      originalText: original,
      perspective: "buyer",
    });

    expect(proposal.clauseTitle).toBe("Limitation of Liability");
    expect(proposal.perspective).toBe("buyer");
    expect(proposal.diffParts.length).toBeGreaterThan(0);

    // Should contain added and removed tokens
    const hasAdded = proposal.diffParts.some((p) => p.added === true);
    const hasRemoved = proposal.diffParts.some((p) => p.removed === true);
    expect(hasAdded).toBe(true);
    expect(hasRemoved).toBe(true);

    // Should include strategic counsel rationale
    expect(proposal.counselRationale.length).toBeGreaterThanOrEqual(2);

    // Should format counter-proposal email
    expect(proposal.counterProposalMemo.subject).toContain("Proposed Revisions");
    expect(proposal.counterProposalMemo.body).toContain("Dear Counsel");
  });

  it("produces distinct fallbacks across buyer, seller, and balanced perspectives", () => {
    const original = "Vendor warrants the software is provided as-is without any warranties.";

    const buyerProposal = generateRedlineProposal({
      clauseTitle: "Warranties & SLAs",
      category: "warranties",
      originalText: original,
      perspective: "buyer",
    });

    const sellerProposal = generateRedlineProposal({
      clauseTitle: "Warranties & SLAs",
      category: "warranties",
      originalText: original,
      perspective: "seller",
    });

    const balancedProposal = generateRedlineProposal({
      clauseTitle: "Warranties & SLAs",
      category: "warranties",
      originalText: original,
      perspective: "balanced",
    });

    expect(buyerProposal.proposedText).toContain("99.9% MONTHLY AVAILABILITY");
    expect(sellerProposal.proposedText).toContain("THIRTY (30) DAYS");
    expect(balancedProposal.proposedText).toContain("MATERIALLY IN ACCORDANCE");
  });

  it("generates publication-grade Markdown due diligence report with verified audit matrix", () => {
    const text =
      "In no event shall aggregate liability exceed $500,000. Either party may terminate upon 30 days notice. Governed by Delaware law.";
    const mockDoc = {
      id: "doc-sample-1",
      name: "SaaS Enterprise Contract.docx",
      fileType: "docx" as const,
      fileSize: 45000,
      pageCount: 3,
      totalChars: text.length,
      status: "ready" as const,
      createdAt: new Date().toISOString(),
      fileUrl: "/api/documents/file/sample",
      extractedText: text,
      htmlContent: "<p>Sample</p>",
      pages: [{ pageNumber: 1, text }],
      chunks: [],
    };

    const audit = auditContractRisk({
      documentId: mockDoc.id,
      documentName: mockDoc.name,
      extractedText: text,
      pages: mockDoc.pages,
    });

    const mdReport = generateMarkdownReport({
      document: mockDoc,
      audit,
      generatedAt: "October 4, 2026",
    });

    expect(mdReport).toContain("# LEGAL DUE DILIGENCE MEMORANDUM");
    expect(mdReport).toContain("Executive Summary & Health Scorecard");
    expect(mdReport).toContain("Key Commercial Terms Table");
    expect(mdReport).toContain("Citation & Verbatim Evidence Appendix");

    const jsonReport = generateJsonReport({
      document: mockDoc,
      audit,
      generatedAt: "October 4, 2026",
    });
    const parsed = JSON.parse(jsonReport);
    expect(parsed.audit.overallScore).toBeDefined();
    expect(parsed.document.name).toBe("SaaS Enterprise Contract.docx");
  });
});
