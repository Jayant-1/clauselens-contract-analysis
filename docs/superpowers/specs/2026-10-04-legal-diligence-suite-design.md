# ClauseLens — Institutional Legal Diligence Suite Design Specification

**Date:** 2026-10-04  
**Topic:** Deterministic Contract Risk & Compliance Audit, Redline Studio with Fallback Engine, Multi-Playbook Scoring, and Board-Ready Diligence Export  
**Status:** Validated Design (Draft for Review)

---

## 1. Executive Summary & Goals

ClauseLens currently excels at dual PDF/DOCX ingestion, lexical BM25 retrieval, algorithmic quote verification, split-screen citation highlighting, and side-by-side contract comparison.

To elevate ClauseLens into an institutional-grade legal copilot that decisively outclasses standard submissions, this specification introduces a **100% deterministic (zero external AI dependency)** intelligence suite comprising:
1. **Automated Risk & Compliance Audit Matrix**: Evaluates 8 core commercial risk vectors with calculated Contract Health Scores (0–100), severity triage (Critical / High / Medium / Compliant), and Missing Clause Gap Detection.
2. **Interactive Redline & Fallback Studio**: Generates tracked-changes markup (deletions in red strikethrough, additions in green) across Buyer, Seller, and Balanced perspectives with strategic counsel rationales and copy-ready counter-proposal emails.
3. **Dynamic Negotiation Playbook Switcher**: Real-time recalibration between Enterprise Buyer, SaaS Vendor, and Balanced Commercial playbooks.
4. **Board-Ready Due Diligence Memo Export Suite**: Instant compilation and export of formal legal memos (print/PDF optimized HTML, Markdown, and JSON) with verifiable citation audit trails.
5. **Modal / Slide-Over Architecture (Option B)**: High-density, distraction-free overlays keeping the primary split-screen document viewer and chat workspace intact.

---

## 2. Core Architecture & Modules

```
                    ┌──────────────────────────────────────────────┐
                    │               Next.js Client                 │
                    │        (src/app/page.tsx Workspace)          │
                    └───────┬──────────────┬──────────────┬────────┘
                            │              │              │
             ┌──────────────▼────┐  ┌──────▼──────┐  ┌────▼─────────────┐
             │  RiskAuditModal   │  │RedlineStudio│  │DiligenceReportMod│
             │   (Health & Risk) │  │  (Redlining)│  │   (Export Suite) │
             └──────────────┬────┘  └──────┬──────┘  └────┬─────────────┘
                            │              │              │
 ┌──────────────────────────▼──────────────▼──────────────▼─────────────────────────┐
 │                               Pure Deterministic Engine                          │
 │                                                                                  │
 │  ┌──────────────────────┐  ┌──────────────────────┐  ┌────────────────────────┐  │
 │  │   risk-engine.ts     │  │  redline-engine.ts   │  │  diligence-report.ts   │  │
 │  │ - 8 Risk Vectors     │  │ - 3 Perspectives     │  │ - Executive Summary    │  │
 │  │ - Health Score 0-100 │  │ - Tracked Changes    │  │ - Terms & Risk Tables  │  │
 │  │ - Missing Clauses    │  │ - Counsel Rationale  │  │ - Citation Appendix    │  │
 │  │ - 3 Playbook Profiles│  │ - Email Countermemo  │  │ - Print / PDF / MD     │  │
 │  └──────────────────────┘  └──────────────────────┘  └────────────────────────┘  │
 └──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Subsystem Specifications

### Subsystem A: Deterministic Risk & Compliance Engine (`src/lib/risk-engine.ts`)

#### 1. The 8 Commercial Risk Vectors
The engine runs lexical and clause pattern extractors over the canonical document text:
1. **Limitation of Liability**:
   * *Critical*: Uncapped liability or missing liability cap.
   * *High*: Liability cap exceeds 24x monthly fees, or excludes gross negligence/confidentiality.
   * *Medium*: 12–24x monthly fees or non-standard super-caps.
   * *Compliant*: Standard 12-month fees paid cap with mutual waiver of consequential damages.
2. **Indemnification & Defense Scope**:
   * *Critical*: Unilateral / one-sided indemnification obligation imposed without reciprocity.
   * *High*: Broad indemnity including indirect claims, uncapped indemnification.
   * *Medium*: Mutual indemnity with ambiguous defense control.
   * *Compliant*: Standard mutual IP infringement indemnity with carve-outs for customer modifications.
3. **Termination & Renewal Traps**:
   * *Critical*: Perpetual auto-renewal with < 15 days notice window or immediate lock-in.
   * *High*: Auto-renewal with 30-day notice, no termination for convenience.
   * *Medium*: Auto-renewal with 60-day notice.
   * *Compliant*: 30/60-day notice with mutual termination for convenience and 30-day cure period for cause.
4. **Data Privacy & Security SLA**:
   * *Critical*: Silent on data breach notification or no security commitments.
   * *High*: Data breach notification timeline > 72 hours.
   * *Medium*: Breach notification "as soon as practicable" without definite timeline.
   * *Compliant*: Strict 24–72 hour notification with SOC2/ISO standard adherence.
5. **Intellectual Property & Work Product**:
   * *Critical*: Broad assignment of vendor/pre-existing background IP.
   * *High*: Exclusive worldwide license with vague reversion.
   * *Compliant*: Clear separation of pre-existing background IP vs. customer data ownership.
6. **Confidentiality Duration & Exclusions**:
   * *High*: Confidentiality period < 2 years, or trade secrets expire after fixed term.
   * *Medium*: 3-year term with standard exclusions.
   * *Compliant*: 3–5 year survival with perpetual protection for trade secrets and personal data.
7. **Governing Law & Forum**:
   * *High*: Non-standard foreign jurisdictions, distant venues.
   * *Medium*: Mandatory binding arbitration without preliminary injunction carve-outs.
   * *Compliant*: Standard neutral jurisdictions (Delaware, New York, California, England & Wales) with judicial injunctive relief.
8. **Warranties & Disclaimers**:
   * *High*: Blanket "AS-IS" disclaimer with zero SLA or uptime commitments.
   * *Medium*: Limited 30-day warranty.
   * *Compliant*: 99.9% uptime SLA commitment with service credits.

#### 2. Health Score Algorithm (0–100)
* Base score = 100
* Deductions per vector:
  * Critical Risk: -20 points
  * High Risk: -12 points
  * Medium Risk: -6 points
  * Low Risk / Note: -2 points
* Bonuses:
  * Compliant / Balanced clauses: +3 points per verified standard protection
* Scale:
  * **Grade A (85–100)**: "Low Risk — Enterprise Ready" (Emerald)
  * **Grade B (70–84)**: "Moderate Risk — Standard Negotiation Recommended" (Amber)
  * **Grade C (50–69)**: "Elevated Risk — Material Counsel Review Required" (Orange)
  * **Grade D (0–49)**: "Critical Risk — Contains Major Deal-Breakers" (Ruby)

#### 3. Missing Clause Gap Scanner
Detects absence of standard protections:
* Missing Consequential Damages Waiver
* Missing Mutual IP Infringement Indemnity
* Missing Data Breach Notification SLA
* Missing Force Majeure Protection
* Missing Customer Data Ownership Affirmation
* Missing Non-Solicitation Mutual Terms

#### 4. Playbook Switcher Profiles
* **Enterprise Buyer**: Heavy penalties for uncapped liability, unilateral vendor terms, and slow breach notification.
* **SaaS Vendor**: Protects recurring revenue, caps liability to 12 months, limits uptime penalties.
* **Balanced Commercial**: Market-standard compromise positions.

---

### Subsystem B: Deterministic Redline & Fallback Studio (`src/lib/redline-engine.ts`)

#### 1. Fallback Positions Repository
Provides curated legal fallback provisions across 3 perspectives:
* **Buyer-Friendly**: Restrictive liability caps, comprehensive vendor indemnities, 24h breach notice, Delaware governing law.
* **Seller-Friendly**: Strict liability ceiling, mutual consequential damages waiver, client indemnity for content/data, 30-day cure period.
* **Balanced Standard**: Mutual commercial baseline accepted by top enterprise legal teams.

#### 2. Tracked Changes Diffing
* Leverages `diff` (`diffWordsWithSpace`) to generate fine-grained token-level changes.
* Deleted text formatted as strikethrough red with subtle background tint.
* Inserted fallback text formatted as bold emerald with underline.
* Unchanged text preserved in neutral slate for immediate context.

#### 3. Counsel Rationale & Counter-Proposal Memo
* Generates bulleted legal rationales explaining *why* the counter-position is necessary (e.g., mitigating fiduciary exposure, complying with corporate risk guidelines).
* Formulates a copy-ready negotiation email addressed to opposing counsel:
  * Subject line: `Proposed Revisions — [Clause Name] ([Document Name])`
  * Executive rationale
  * Verbatim proposed redline text

---

### Subsystem C: Board-Ready Due Diligence Memo Export (`src/lib/diligence-report.ts`)

Generates a publication-grade Diligence Memorandum:
1. **Header Block**: Contract Name, Date, File Hash/Type, Pages, Audit Timestamp, Evaluated Playbook.
2. **Executive Summary & Health Scorecard**: Overall Health Score, Risk Grade, and Risk Breakdown chart.
3. **Key Commercial Terms Table**: Liability cap amount, Payment terms, Governing law, Termination window, Breach SLA.
4. **Risk Matrix & Critical Findings**: Itemized table of all detected risks with category, severity, verbatim quote, page citation, and potential business impact.
5. **Missing Clause Inventory**: Unaddressed liabilities and missing market protections.
6. **Negotiation Action Plan**: Recommended priority redlines in order of severity.
7. **Citation Appendix**: Verbatim quotes with exact page numbers for complete audit trail.

**Output Channels**:
* **Print / PDF Optimized HTML**: Native CSS `@media print` layout with page breaks, legal serif/sans typography, high-contrast tables.
* **Markdown**: Clean GFM markdown with copy-to-clipboard.
* **JSON**: Structured machine-readable diligence data.

---

### Subsystem D: User Interface & Modal Architecture

Following Option B (Modal / Slide-Over Drawer):
1. **Top Navigation Bar Additions**:
   * `Risk Audit` button with live Health Score badge (e.g. `🛡️ Health: 84 (B)`).
   * `Redline Studio` button with pen/contract icon.
   * `Export Memo` button with document download icon.
2. **`RiskAuditModal.tsx`**:
   * Slide-over modal with backdrop blur.
   * Health score radial/bar gauge with grade badge.
   * Playbook dropdown (Enterprise Buyer / SaaS Vendor / Balanced).
   * Missing clauses banner.
   * Filterable risk card list (All, Critical, High, Medium, Compliant).
   * "Jump to Source" button that closes modal, loads document in split viewer, and highlights page text.
   * "Propose Redline" button that transitions directly into Redline Studio.
3. **`RedlineStudioModal.tsx`**:
   * Clause dropdown (selects from detected clauses in active document).
   * 3-position segment control (Buyer-Favorable / Seller-Favorable / Balanced).
   * Live visual diff container (red strikethrough / green additions).
   * Legal rationale card.
   * One-click "Copy Redline" and "Copy Counter-Proposal Email" buttons with copied checkmark feedback.
4. **`DiligenceReportModal.tsx`**:
   * Preview tabs: "Formal Memo (Print / PDF)" and "Raw Markdown".
   * Action buttons: "Print / Save PDF" (triggers `window.print()`), "Copy Markdown", "Download JSON".

---

## 4. Verification Plan

1. **Unit & Engine Tests (`src/lib/__tests__/risk-engine.test.ts` & `redline-engine.test.ts`)**:
   * Verify all 8 risk vectors against real contract fixtures (`Enterprise_SaaS_Agreement_v1.docx`, `saas_agreement_v2.docx`, `sample_contract.pdf`).
   * Test Health Score calculation and playbook switching.
   * Test missing clause detection on truncated/risky contracts.
   * Test word diffing and counter-proposal memo generation.
2. **UI & Build Verification**:
   * TypeScript type-check (`pnpm exec tsc --noEmit`): 0 errors.
   * Vitest test run (`pnpm test`): 100% pass rate.
   * Next.js production build (`pnpm build`): clean build.
   * Browser test: verify modal transitions, jump-to-citation linking, and print styles.
