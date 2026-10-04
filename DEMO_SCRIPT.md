# ClauseLens — 3–5 Minute Reviewer Demo Script

This script provides an exact, step-by-step walkthrough to evaluate all critical capabilities of ClauseLens in under 5 minutes.

---

### Step 0: Initial Launch & Portfolio Setup (0:00 – 0:30)

1. Open the application in your browser: `http://localhost:3000`.
2. Notice the **Agreements Sidebar** on the left. The pre-loaded contracts `saas_agreement_v1.docx` and `saas_agreement_v2.docx` appear in the portfolio.
3. Test Drag-and-Drop or Upload:
   - Click the upload dropzone or drag a contract file into the area.
   - Try dropping an unsupported file (e.g., an `.exe` or `.png`): observe the immediate red validation alert rejecting unsupported formats.
   - Note the real-time processing progress bar during legitimate uploads (20% → 55% → 80% → 100%).

---

### Step 1: Single-Document Grounded Diligence & Verified Citations (0:30 – 1:30)

1. Select only **`saas_agreement_v1.docx`** using the checkbox in the sidebar.
2. In the chat prompt input, ask:
   > *"What is the liability cap? Quote the exact contractual wording."*
3. **Observe the Agentic Research Steps**:
   - The visible research trace shows:
     - `search_document`: Searches for liability cap across `saas_agreement_v1.docx`.
     - `get_section`: Consumes the highest-confidence match and displays:
       `Reading section "Section 4. Limitation of Liability" in saas_agreement_v1.docx (Page 1)...`
4. **Inspect the Answer**:
   - The answer states **$500,000** and quotes Section 4 verbatim:
     > *"In no event shall either party's aggregate liability arising out of or related to this Agreement exceed the sum of $500,000 (five hundred thousand dollars)."*
   - Below the answer, observe the verified citation card tagged with **`PIN-CITE`** and **`saas_agreement_v1.docx p. 1`**.
   - Note that zero termination notice sentences are accepted into the liability evidence.

---

### Step 2: Interactive Citation Highlighting & Split Document Viewer (1:30 – 2:15)

1. Click the **`Inspect`** button on the citation card.
2. **Observe the Document Viewer**:
   - The right pane smoothly focuses on `saas_agreement_v1.docx`.
   - The view automatically scrolls to Section 4 on Page 1.
   - An animated amber highlight ring pulses around the exact quoted sentence.
   - An active highlight banner appears at the top with a one-click *"Clear highlight"* action.
3. Test the View Mode toggles in the header:
   - **`Split`**: Side-by-side chat and contract viewer.
   - **`Inquiry`**: Expands chat to full width for focused diligence.
   - **`Reader`**: Maximizes the contract viewer for distraction-free legal reading.

---

### Step 3: Multi-Document Comparative Diligence (2:15 – 3:15)

1. In the sidebar, click the **`All`** button (or check both `saas_agreement_v1.docx` and `saas_agreement_v2.docx`).
2. Ask:
   > *"Compare the liability cap in the two contracts. State the old and new amount, with a quote from each document."*
3. **Observe the Comparative Answer**:
   - The model explicitly states:
     > *"The liability cap increased from $500,000 in saas_agreement_v1.docx to $1,000,000 in saas_agreement_v2.docx."*
   - Inspect the citations: exactly two citations are produced:
     - Citation 1: Section 4 quote from `saas_agreement_v1.docx` ($500,000).
     - Citation 2: Section 4 quote from `saas_agreement_v2.docx` ($1,000,000).
   - Each citation is verified independently against its respective document boundary.

---

### Step 4: Strict Safe-Failure Rule / Non-Negotiable Grounding (3:15 – 3:45)

1. Ask an out-of-scope or absent contractual question:
   > *"What is the penalty for late delivery of physical hardware?"*
2. **Observe the Non-Negotiable Safe Fallback**:
   - The engine strictly returns the single concise sentence:
     > *"I could not find a supported answer in the selected document(s)."*
   - Confirm that **zero** hallucinated citations are generated and no unrelated sections (such as Governing Law or Confidentiality) are emitted.

---

### Step 5: Side-by-Side Clause Comparison & Redline Studio (3:45 – 4:30)

1. Click the **`Compare (2)`** button in the header bar.
2. Review the **Contract Comparison Modal**:
   - **Executive Plain-Language Summary**: Highlights material changes across liability, jurisdiction, and SLA uptime.
   - **Material Deal Shifts**:
     - *Liability Cap*: Increased from **$500,000** to **$1,000,000** (**High** significance).
     - *Governing Law*: Shifted from **New York** to **Delaware** (**High** significance).
     - *Termination Notice*: Extended from **30 days** to **60 days** (**Medium** significance).
   - Filter differences by significance (**All**, **High**, **Medium**, **Low**).
   - Click any difference card to immediately open and view the corresponding text in both source documents.

---

### Step 6: Risk Audit Matrix & Product Tour (4:30 – 5:00)

1. Click **`Risk Audit`** in the header:
   - View the automated portfolio risk assessment matrix.
   - Review categorized risk scores across Limitation of Liability, IP Indemnity, Data Protection, and SLA Guarantees.
2. Click **`Tour`** in the top navigation bar:
   - Experience the 5-step interactive walkthrough guiding new users through selecting contracts, asking inquiries, inspecting citations, comparing versions, and viewing audit risks.
