# ClauseLens — Verified Legal Contract Analysis

ClauseLens is a production-grade, evidence-grounded legal contract analysis web application. Built for enterprise legal workflows, ClauseLens allows attorneys, procurement specialists, and contract reviewers to upload complex legal contracts (PDF and DOCX), query them in real time, inspect independently verified citations, visually track clauses in a synchronized document viewer, and run side-by-side contract version comparisons.

---

## Key Features

1. **Evidence-Grounded Q&A with Independent Quote Verification**
   - Answers are strictly grounded in contract evidence.
   - Every citation undergoes independent multi-pass verification against the document's original text, rejecting hallucinations or paraphrases.
   - Quotes spanning multiple lines and page boundaries are matched with token-level precision.
   - If no verified evidence supports an answer, ClauseLens explicitly reports: *"I could not find this in the selected document(s)."*

2. **Split Document Viewer with Interactive Citation Highlighting**
   - Clicking *"Open source"* on any verified citation automatically scrolls the viewer to the exact page and paragraph.
   - High-contrast, pulsating amber highlights pinpoint the exact quoted passage.
   - Visual PDF.js rendering with a synchronized text layer.
   - Rich DOCX preview with embedded paragraph anchor IDs.

3. **Part C — Agentic Document Research (Option 2)**
   - Autonomous multi-round research loop (up to 6 rounds).
   - Real tool execution:
     - `search_document({ query, documentIds })` — BM25 lexical chunk retrieval with clause boosting.
     - `get_section({ documentId, sectionId })` — verbatim clause extraction.
     - `list_clauses({ documentId })` — document structural inspection.
   - Live activity events streamed to the UI (*"Searching termination provisions..."*, *"Reading Section 4..."*, *"Comparing clauses across 2 documents..."*).
   - Safe input validation with Zod; safely recovers from malformed tool calls without crashing.

4. **Clause-Level Contract Comparison & Material Change Analysis**
   - Compares two uploaded contract versions (e.g., v1 vs. v2) at clause and paragraph level.
   - Detects added, removed, and modified clauses.
   - Extracts and compares material values: liability caps, notice periods, and governing law jurisdictions.
   - Automatically assigns significance levels (**High**, **Medium**, **Low**).
   - Generates an executive substantive changes summary and allows clicking through to each document's page.

5. **Large-Document Strategy (150+ Page Contracts)**
   - Clause-aware chunking engine detects legal headings (`Section`, `Article`, `Clause`, Roman numerals, all-caps headers).
   - Stable chunk IDs persisted in SQLite via Prisma.
   - High-performance lexical retrieval powered by MiniSearch with BM25-style scoring and fuzzy tolerance.
   - Never loads the entire contract into the LLM context at once.

6. **Desktop-First Professional UI/UX**
   - Left sidebar with contract library, upload dropzone, progress tracking, and cascade deletion.
   - Main conversational area with token-by-token streaming, abortable generation (Stop button), and preserved partial text.
   - Right-side document viewer with page navigation, zoom, and active highlight alerts.

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │          ClauseLens Web Client         │
                      │     Next.js 16 (React 19, Tailwind)    │
                      └───────┬────────────────────────┬───────┘
                              │                        │
               Server-Sent Events (SSE)         File Streaming / REST
                              │                        │
                              ▼                        ▼
                      ┌────────────────────────────────────────┐
                      │          Next.js App Router API        │
                      │  /api/chat  /api/documents  /api/compare│
                      └───────┬────────────────────────┬───────┘
                              │                        │
            ┌─────────────────┴───────────────┐        │
            ▼                                 ▼        ▼
┌────────────────────────┐       ┌────────────────────────┐
│  Agent Research Loop   │       │  Storage Abstraction   │
│  - search_document     │       │  - Local filesystem    │
│  - get_section         │       │  - S3 / Vercel Blob    │
│  - list_clauses        │       └────────────────────────┘
│  - Zod Validation      │                     │
└───────────┬────────────┘                     │
            │                                  ▼
            ▼                       ┌─────────────────────┐
┌────────────────────────┐          │    SQLite Database  │
│ Independent Quote      │          │     (Prisma ORM)    │
│ Verification Pipeline  │          │ - Documents & Pages │
│ - Token alignment      │          │ - Clause Chunks     │
│ - Smart quote folding  │          │ - Sessions & Msgs   │
│ - Cross-page matching  │          │ - Comparisons       │
└────────────────────────┘          └─────────────────────┘
```

---

## Setup & Local Run Instructions

### Prerequisites
- Node.js 20+ or 22+ (tested on Node v22.18.0)
- npm 10+ or 11+

### 1. Clone & Install Dependencies
```bash
git clone <your-repo-url> clauselens
cd clauselens
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Configure your `.env` file:
```env
# Database
DATABASE_URL="file:./dev.db"

# Storage ("local" | "s3" | "vercel_blob")
STORAGE_PROVIDER="local"

# AI Provider Configuration (OpenAI-compatible)
AI_API_KEY="your-api-key-here"
AI_BASE_URL="https://api.openai.com/v1"
AI_MODEL="gpt-4o-mini"
```

> **Note on AI Configuration**: ClauseLens works with any OpenAI-compatible provider (OpenAI, OpenRouter, Groq, Ollama, vLLM). If `AI_API_KEY` is not provided, ClauseLens operates in **deterministic autonomous mode**, executing real multi-round tool research over retrieved contract evidence without crashing or inventing text.

### 3. Initialize the SQLite Database
```bash
npx prisma db push
```

### 4. Generate Fixtures (Optional, for testing)
```bash
npx tsx scripts/generate-fixtures.ts
```

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Test Suite Execution

Run all 35 unit, integration, and end-to-end tests:
```bash
npm test
```

To run tests with watch mode:
```bash
npm run test:watch
```

Run TypeScript strict type checking:
```bash
npx tsc --noEmit
```

Run ESLint:
```bash
npm run lint
```

Run production build:
```bash
npm run build
```

---

## How Quote Verification Works

ClauseLens does **not** trust page numbers or character offsets reported by language models. Instead, it routes candidate citations through an independent verification pipeline (`src/lib/normalization.ts`):

1. **Character & Unicode Normalization**:
   - Smart single/double quotes (`’`, `‘`, `“`, `”`, `«`, `»`) $\rightarrow$ ASCII quotes (`'`, `"`).
   - Em dashes, en dashes, minus signs (`—`, `–`, `−`) $\rightarrow$ standardized hyphen delimiters (` - `).
   - Non-breaking spaces and zero-width spaces $\rightarrow$ single space.
   - Whitespace collapse ($\backslash$r, $\backslash$n, tabs, multiple spaces $\rightarrow$ single space) and lowercasing.

2. **Multi-Pass Page Search**:
   - **Pass 1 (Direct Page Substring)**: Searches page-by-page for verbatim matches.
   - **Pass 2 (Normalized Token Search)**: Compares normalized token sequences, accommodating minor formatting or typographical differences.
   - **Pass 3 (Cross-Page Boundary Search)**: Matches quotes spanning page breaks (e.g., when a sentence begins at the bottom of Page 1 and concludes on Page 2).
   - **Pass 4 (Global Document Search)**: Full document fallback.

3. **Disambiguation & Occurrence Tracking**:
   - If a quote appears multiple times, ClauseLens calculates proximity to the preferred chunk/page from retrieval.
   - Returns occurrence counts (`occurrencesCount`) so users know if a clause repeated elsewhere.

4. **Rejection & Labelling**:
   - Fabricated or hallucinated quotes fail verification (`isVerified: false`) and are either filtered out or tagged with an orange **UNVERIFIED** alert badge.

### Known Limitations
- Severely degraded scanned PDFs without OCR readable text cannot be matched and are rejected at upload.
- Mathematical equations or complex nested ASCII tables may require token-level approximation if table column borders disrupt standard sentence flow.

---

## Large-Document Strategy (150+ Page Contracts)

1. **Clause-Aware Chunking**:
   - Legal documents are chunked by clause headings (`Section`, `Article`, `Clause`, Roman numerals) rather than arbitrary token cuts.
   - Target chunk size is 800–1200 characters with 150-character overlaps.
   - Every chunk is assigned a stable ID (`${docId}_chunk_${index}`), page number, and section title.
2. **Context Window Protection**:
   - The full document is never sent to the model.
   - Retrieval pulls the top $k$ relevant chunks (filtered by selected documents), keeping prompt sizes bounded.
3. **Lexical BM25 Retrieval**:
   - Powered by MiniSearch with field weighting (2.5x boost for `sectionTitle`, fuzzy match tolerance for typos).

---

## Part C: Why Option 2 (Agentic Document Research)?

### Why Option 2 Was Selected
Option 2 was chosen because legal contract analysis inherently requires multi-hop reasoning. In complex agreements:
1. One clause frequently references another (e.g., Section 4 Limitation of Liability explicitly states *"Except as provided in Section 7 (Indemnification)..."*). A single-turn retrieval often misses the referenced section.
2. Cross-document comparisons require inspecting corresponding provisions across distinct contracts.
3. An autonomous tool-calling loop enables the assistant to plan, inspect document structure (`list_clauses`), search specific terms (`search_document`), and read complete verbatim provisions (`get_section`).

### Implementation Details
- Located in `src/lib/agent/tools.ts` and `src/lib/agent/researcher.ts`.
- Maximum 6 research rounds.
- Strict input validation via Zod schemas (`SearchDocumentSchema`, `GetSectionSchema`, `ListClausesSchema`).
- Graceful recovery: invalid JSON or malformed arguments return helpful error messages to the model instead of crashing the server.
- Visible activity events streamed via Server-Sent Events (SSE).

### Hardest Challenge
The hardest challenge was ensuring that the agentic loop remains grounded and terminates gracefully when a provision does not exist. Language models tend to continue looping or hallucinating when an answer is absent. This was addressed by:
- Setting a hard limit of 6 rounds.
- Providing explicit negative constraints in the system prompt.
- Enforcing the mandatory fallback: *"I could not find this in the selected document(s)."*

---

## Document Comparison Workflow

1. Select two contracts in the Comparison modal.
2. The comparison engine (`src/lib/comparison.ts`) extracts all clauses from both versions.
3. Differences are categorized as **Added**, **Removed**, or **Modified**.
4. Material values (liability amounts, notice periods in days, governing law states) are extracted and compared.
5. Differences are assigned significance ratings:
   - **High**: Liability caps, indemnification, governing law.
   - **Medium**: Termination periods, payment terms.
   - **Low**: Grammatical and general language updates.
6. Side-by-side view with word-level diffing and direct links to source document pages.

---

## Deployment Instructions

### Vercel
1. Push repository to GitHub.
2. Import project in Vercel.
3. Configure environment variables in Vercel Dashboard:
   - `DATABASE_URL`: For persistent production, connect a PostgreSQL or remote SQLite database (such as Turso or Supabase), or run `npx prisma db push`.
   - `AI_API_KEY`: Your OpenAI/OpenRouter API key.
   - `AI_BASE_URL`: `https://api.openai.com/v1`
   - `AI_MODEL`: `gpt-4o-mini`
   - `STORAGE_PROVIDER`: `vercel_blob`
   - `BLOB_READ_WRITE_TOKEN`: Your Vercel Blob token.
4. Deploy!

### Railway / Render
1. Connect repository.
2. Build command: `npm install && npx prisma db push && npm run build`
3. Start command: `npm run start`
4. Set environment variables (`DATABASE_URL`, `AI_API_KEY`, etc.).

---

## Screenshots

> *Placeholder: Screenshots of the ClauseLens UI can be found below or generated by running the application.*

| Document Library & Chat | Verified Citation Highlighting |
|---|---|
| ![ClauseLens Main Chat](https://placehold.co/600x400/1e293b/ffffff?text=ClauseLens+Chat+with+Citations) | ![Citation Highlighting](https://placehold.co/600x400/1e293b/ffffff?text=Document+Viewer+Highlight) |

| Side-by-Side Comparison | Agentic Activity Stream |
|---|---|
| ![Comparison Modal](https://placehold.co/600x400/1e293b/ffffff?text=Contract+Comparison+View) | ![Agentic Research Steps](https://placehold.co/600x400/1e293b/ffffff?text=Agentic+Research+Timeline) |

---

## Concise Demo Script (3–5 Minutes)

1. **Upload Document (0:00 - 0:45)**:
   - Drag and drop `sample_contract.pdf` into the left sidebar dropzone.
   - Observe progress indicator transitioning through *"Uploading..."*, *"Extracting clauses..."*, and *"Ready!"*.
   - Try dropping an invalid file (`contract.exe` or `scanned_sample.pdf`) to show the graceful rejection banner.
2. **Ask Question & Streaming (0:45 - 1:30)**:
   - Click a suggestion: *"What is the limitation of liability cap?"*.
   - Watch the agentic activity stream display live research rounds (*"Searching for..."*, *"Reading Section 4..."*).
   - Watch the answer stream token-by-token.
3. **Show Verified Quote (1:30 - 2:00)**:
   - Point out the green **VERIFIED QUOTE** badge on the citation card.
   - Note the document name, page number, and exact quoted clause.
4. **Click Quote & Show Highlight (2:00 - 2:45)**:
   - Click *"Open source"* on the citation.
   - The right-hand viewer opens the contract, jumps to Page 1, and pulses the amber highlight over the exact clause.
5. **Compare Two Documents (2:45 - 3:30)**:
   - Upload `saas_agreement_v1.docx` and `saas_agreement_v2.docx`.
   - Click the **Compare** button in the sidebar.
   - Select Version 1 and Version 2 and click *"Compare Contracts"*.
   - Review the Executive Substantive Changes Summary.
   - Filter by **High Significance** to highlight the liability cap change ($500,000 $\rightarrow$ $1,000,000) and governing law change (New York $\rightarrow$ Delaware).
6. **Agentic Research Activity (3:30 - 4:15)**:
   - Expand the **Agentic Research History** accordion in chat.
   - Show how the model iteratively called `search_document` and `get_section` before finalizing its grounded response.
