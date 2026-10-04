import { describe, it, expect } from "vitest";
import fs from "fs/promises";
import path from "path";
import { parseDocument } from "../document-parser";
import { auditContractRisk } from "../risk-engine";

describe("Deterministic Risk & Compliance Engine", () => {
  const fixturesDir = path.join(process.cwd(), "fixtures", "contracts");

  it("identifies uncapped liability as critical risk when no cap is present", () => {
    const text =
      "Vendor shall provide cloud services to Customer. In the event of dispute, Customer agrees to pay all fees.";
    const audit = auditContractRisk({
      documentId: "test-doc-1",
      documentName: "Uncapped Agreement",
      extractedText: text,
      pages: [{ pageNumber: 1, text }],
    });

    const liabilityRisk = audit.findings.find((f) => f.category === "liability");
    expect(liabilityRisk).toBeDefined();
    expect(["critical", "high"]).toContain(liabilityRisk?.severity);
    expect(liabilityRisk?.title).toContain("Missing Aggregate Liability Cap");
  });

  it("identifies standard 12-month liability cap and mutual waiver as compliant", () => {
    const text =
      "Each party's total aggregate liability shall not exceed fees paid in the prior 12 months. In no event shall either party be liable for consequential damages.";
    const audit = auditContractRisk({
      documentId: "test-doc-2",
      documentName: "Compliant Liability Agreement",
      extractedText: text,
      pages: [{ pageNumber: 1, text }],
    });

    const compliantFindings = audit.findings.filter((f) => f.category === "liability" && f.severity === "compliant");
    expect(compliantFindings.length).toBeGreaterThanOrEqual(1);
  });

  it("re-weights health score dynamically when switching from balanced to enterprise-buyer playbook", () => {
    const text =
      "Total liability shall not exceed $100,000. Customer shall defend and indemnify Vendor against all claims. This agreement automatically renews for 1-year terms unless notice is provided 10 days in advance.";

    const balancedAudit = auditContractRisk(
      {
        documentId: "test-doc-3",
        documentName: "Buyer Evaluation Agreement",
        extractedText: text,
        pages: [{ pageNumber: 1, text }],
      },
      "balanced"
    );

    const buyerAudit = auditContractRisk(
      {
        documentId: "test-doc-3",
        documentName: "Buyer Evaluation Agreement",
        extractedText: text,
        pages: [{ pageNumber: 1, text }],
      },
      "enterprise-buyer"
    );

    // Enterprise buyer has stricter penalty weighting on unilateral vendor terms
    expect(buyerAudit.overallScore).toBeLessThanOrEqual(balancedAudit.overallScore);
    expect(["C", "D"]).toContain(buyerAudit.grade);
  });

  it("detects missing standard clauses such as vendor IP indemnity and breach SLA", () => {
    const text =
      "Customer hires Contractor to build custom software. Payment is due in 30 days. Delaware law applies.";

    const audit = auditContractRisk({
      documentId: "test-doc-4",
      documentName: "Barebones Agreement",
      extractedText: text,
      pages: [{ pageNumber: 1, text }],
    });

    expect(audit.missingClauses.length).toBeGreaterThanOrEqual(2);
    const hasMissingIndemnity = audit.missingClauses.some((m) => m.category === "indemnity");
    const hasMissingBreach = audit.missingClauses.some((m) => m.category === "data_privacy");
    expect(hasMissingIndemnity).toBe(true);
    expect(hasMissingBreach).toBe(true);
  });

  it("audits real contract fixture saas_agreement_v1.docx and produces valid health score and findings", async () => {
    const buf = await fs.readFile(path.join(fixturesDir, "saas_agreement_v1.docx"));
    const doc = await parseDocument(buf, "saas_agreement_v1.docx");

    const audit = auditContractRisk({
      documentId: "doc-v1",
      documentName: "SaaS Agreement v1.docx",
      extractedText: doc.extractedText,
      pages: doc.pages,
    });

    expect(audit.overallScore).toBeGreaterThan(0);
    expect(audit.overallScore).toBeLessThanOrEqual(100);
    expect(["A", "B", "C", "D"]).toContain(audit.grade);
    expect(audit.findings.length).toBeGreaterThan(0);

    // Finding citations link to real page numbers
    for (const finding of audit.findings) {
      expect(finding.pageNumber).toBeGreaterThanOrEqual(1);
      expect(finding.quote.length).toBeGreaterThan(0);
    }
  });
});
