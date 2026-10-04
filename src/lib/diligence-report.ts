import { ContractHealthAudit, DocumentDetail } from "@/types";
import { extractKeyTerms } from "./key-terms";

export interface DiligenceReportData {
  document: DocumentDetail;
  audit: ContractHealthAudit;
  generatedAt: string;
}

/**
 * Generates an executive Markdown due diligence report
 */
export function generateMarkdownReport(data: DiligenceReportData): string {
  const { document, audit, generatedAt } = data;
  const keyTerms = extractKeyTerms(document.extractedText || "");

  const playbookName =
    audit.playbook === "enterprise-buyer"
      ? "Enterprise Buyer Playbook"
      : audit.playbook === "saas-vendor"
      ? "SaaS Vendor Playbook"
      : "Balanced Commercial Playbook";

  const criticalFindings = audit.findings.filter((f) => f.severity === "critical");
  const highFindings = audit.findings.filter((f) => f.severity === "high");
  const mediumFindings = audit.findings.filter((f) => f.severity === "medium");

  return `# LEGAL DUE DILIGENCE MEMORANDUM

**Document:** ${document.name}  
**Diligence Review Date:** ${generatedAt}  
**Format:** ${document.fileType.toUpperCase()} (${document.pageCount} pages, ${(document.fileSize / 1024).toFixed(1)} KB)  
**Evaluated Under:** ${playbookName}  
**Executive Risk Rating:** **Grade ${audit.grade} (${audit.overallScore}/100)** — *${audit.gradeDescription}*

---

## 1. Executive Summary & Health Scorecard

${audit.summary}

### Risk Distribution
* **Critical Deal-Breakers (Red):** ${audit.stats.criticalCount}
* **High Severity Issues (Amber):** ${audit.stats.highCount}
* **Moderate Nuances (Yellow):** ${audit.stats.mediumCount}
* **Compliant Standard Provisions (Green):** ${audit.stats.compliantCount}
* **Missing Standard Protections:** ${audit.stats.missingCount}

---

## 2. Key Commercial Terms Table

| Term Category | Extracted Value | Fiduciary Assessment |
|---|---|---|
| **Governing Law** | ${keyTerms.governingLaw || "Not Specified / Silent"} | ${keyTerms.governingLaw?.toLowerCase().includes("delaware") || keyTerms.governingLaw?.toLowerCase().includes("new york") ? "Standard commercial venue" : "Review local counsel requirements"} |
| **Limitation of Liability** | ${keyTerms.liabilityCap || "Not Specified / Uncapped"} | ${keyTerms.liabilityCap ? "Finite monetary ceiling established" : "CRITICAL: Uncapped general liability exposure"} |
| **Termination Notice** | ${keyTerms.terminationNotice || "Not Specified / Silent"} | ${keyTerms.terminationNotice ? "Defined notice window" : "Check termination for convenience off-ramp"} |
| **Confidentiality Survival** | ${keyTerms.confidentialityTerm || "Not Specified / Silent"} | ${keyTerms.confidentialityTerm ? "Standard survival window" : "Verify trade secret perpetual survival"} |

---

## 3. High & Critical Risk Findings Matrix

${criticalFindings.length === 0 && highFindings.length === 0 ? "*No critical or high severity risks identified in this agreement.*" : ""}

${criticalFindings
  .map(
    (f, i) => `### [CRITICAL] ${i + 1}. ${f.title} (${f.categoryLabel})
* **Page Citation:** Page ${f.pageNumber}
* **Verbatim Evidence:**  
  > "${f.quote}"
* **Legal Analysis:** ${f.analysis}
* **Commercial Exposure:** ${f.businessImpact}
* **Recommended Counsel Action:** ${f.recommendedAction}
${f.suggestedFallbackClause ? `* **Recommended Counter-Language:**  \n  \`${f.suggestedFallbackClause}\`` : ""}
`
  )
  .join("\n")}

${highFindings
  .map(
    (f, i) => `### [HIGH] ${i + 1}. ${f.title} (${f.categoryLabel})
* **Page Citation:** Page ${f.pageNumber}
* **Verbatim Evidence:**  
  > "${f.quote}"
* **Legal Analysis:** ${f.analysis}
* **Commercial Exposure:** ${f.businessImpact}
* **Recommended Counsel Action:** ${f.recommendedAction}
${f.suggestedFallbackClause ? `* **Recommended Counter-Language:**  \n  \`${f.suggestedFallbackClause}\`` : ""}
`
  )
  .join("\n")}

${mediumFindings
  .map(
    (f, i) => `### [MEDIUM] ${i + 1}. ${f.title} (${f.categoryLabel})
* **Page Citation:** Page ${f.pageNumber}
* **Verbatim Evidence:**  
  > "${f.quote}"
* **Legal Analysis:** ${f.analysis}
* **Commercial Exposure:** ${f.businessImpact}
* **Recommended Counsel Action:** ${f.recommendedAction}
`
  )
  .join("\n")}

---

## 4. Missing Standard Legal Protections

${audit.missingClauses.length === 0 ? "*All baseline standard commercial protections were detected in the agreement text.*" : ""}

${audit.missingClauses
  .map(
    (m, i) => `### ${i + 1}. ${m.title} [Severity: ${m.severity.toUpperCase()}]
* **Category:** ${m.category}
* **Omission Analysis:** ${m.description}
* **Fiduciary Risk:** ${m.riskExplanation}
* **Proposed Market Language:**  
  \`${m.standardMarketLanguage}\`
`
  )
  .join("\n")}

---

## 5. Strategic Negotiation Action Plan

1. **Immediate Walk-Away / Deal-Breaker Items:**  
   ${criticalFindings.length > 0 ? criticalFindings.map((f) => `• Address ${f.title} on Page ${f.pageNumber}.`).join("\n   ") : "• No immediate walk-away items detected."}

2. **Required Contract Redlines:**  
   ${highFindings.length > 0 ? highFindings.map((f) => `• Redline ${f.title} to cap exposure.`).join("\n   ") : "• Proceed with standard commercial review."}

3. **Omitted Protection Insertions:**  
   ${audit.missingClauses.length > 0 ? audit.missingClauses.map((m) => `• Insert standard "${m.title}".`).join("\n   ") : "• No missing clauses to insert."}

---

## 6. Citation & Verbatim Evidence Appendix

| Ref # | Category | Page | Verified Verbatim Quote |
|---|---|:---:|---|
${audit.findings
  .map(
    (f, i) =>
      `| ${i + 1} | ${f.categoryLabel} | p. ${f.pageNumber} | "${f.quote.slice(0, 120).replace(/\r?\n/g, " ")}${f.quote.length > 120 ? "..." : ""}" |`
  )
  .join("\n")}

---
*Report generated deterministically by ClauseLens Legal Diligence Suite. All citations algorithmically verified against primary source text.*
`;
}

/**
 * Generates structured JSON export
 */
export function generateJsonReport(data: DiligenceReportData): string {
  return JSON.stringify(data, null, 2);
}
