# ClauseLens — Verified Legal Contract Analysis

ClauseLens is a production-grade, evidence-grounded legal contract analysis web application. Built for enterprise legal workflows, ClauseLens allows attorneys, procurement specialists, and contract reviewers to upload complex legal contracts (PDF and DOCX), query them in real time, inspect independently verified citations, visually track clauses in a synchronized document viewer, and run side-by-side contract version comparisons.

---

## Key Features

1. **Evidence-Grounded Q&A with Strict Quote Verification (Non-Negotiable Rule)**
   - Answers are strictly grounded in contract evidence.
   - **Non-Negotiable Safety Rule**: Quotes must strictly support the factual claim made. If evidence is unsupported or absent, ClauseLens explicitly returns:
     > *"I could not find a supported answer in the selected document(s)."*
   - Candidate citations undergo multi-pass verification against original document text, checking claimed section and chunk boundaries before falling back to full-page search.
   - Normalization engine accommodates typographic smart quotes (`’`, `“`), en/em dashes (`—`, `–`), and multi-line breaks without allowing semantic drift or false cross-clause matches.

2. **Split Document Viewer with Interactive Citation Highlighting**
   - Clicking *"Open source"* on any verified citation jumps to the exact document, scrolls to the target page, and pulses an animated amber highlight over the quoted text.
   - High-fidelity PDF rendering with synchronized text layer via PDF.js.
   - Rich DOCX preview with embedded paragraph anchor IDs generated via Mammoth.

3. **Autonomous Agentic Diligence Engine (Part C: Option 2)**
   - Multi-round research loop (up to 6 rounds) using real tool execution:
     - `search_document({ query, documentIds })` — BM25 lexical chunk retrieval with 6.0x section header boosting and legal synonym expansion.
     - `get_section({ documentId, sectionId })` — verbatim clause extraction by section.
     - `list_clauses({ documentId })` — structural inspection of contract headings.
   - Live activity events streamed via Server-Sent Events (SSE) (*"Searching for liability cap..."*, *"Reading Section 4..."*, *"Comparing clauses across 2 documents..."*).
   - Strict Zod schema validation (`StructuredAnswerSchema`, `SearchDocumentSchema`, etc.) preventing malformed tool invocations from crashing the process.
   - High-confidence deterministic fallback engine when no AI API key is configured, extracting exact figures and verbatim clauses without hallucination.

4. **Clause-Level Contract Comparison & Material Change Analysis**
   - Side-by-side contract diffing detecting Added, Removed, and Modified clauses.
   - Automated material value extraction: liability caps, termination notice periods, and governing law jurisdictions.
   - Significance categorization (**High**, **Medium**, **Low**) with dual filtering and direct navigation to document pages.

5. **Large-Document Strategy (150+ Page Contracts)**
   - Section-bound chunking engine detects legal headings (`Section`, `Article`, `Clause`, Roman numerals, all-caps headers).
   - Flushes chunks immediately when a new section heading is encountered, completely eliminating cross-section overlap bleeding.
   - Lexical retrieval powered by MiniSearch with BM25-style scoring, query noise filtering, and 6.0x section header weighting.
   - Memory and context window protection: entire contracts are never dumped into LLM prompts.

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
- `pnpm` 9+ or 10+ (exclusive package manager)

### 1. Clone & Install Dependencies
```bash
git clone <your-repo-url> clauselens
cd clauselens
pnpm install
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

> **Note on AI Configuration**: ClauseLens works with any OpenAI-compatible provider (OpenAI, OpenRouter, Groq, Ollama, vLLM). If `AI_API_KEY` is not provided, ClauseLens operates in **deterministic autonomous mode**, executing real multi-round tool research over retrieved contract evidence without crashing, hallucinating, or emitting unsupported quotes.

### 3. Initialize the SQLite Database
```bash
pnpm exec prisma db push
```

### 4. Start Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Test Suite Execution

Run all 63 unit, acceptance, and end-to-end tests:
```bash
pnpm test
```

To run tests with watch mode:
```bash
pnpm test:watch
```

Run TypeScript strict type checking:
```bash
pnpm exec tsc --noEmit
```

Run ESLint:
```bash
pnpm run lint
```

Run production build:
```bash
pnpm build
```

---

## How Quote Verification Works

ClauseLens does **not** trust page numbers or character offsets reported by language models. Instead, it routes candidate citations through an independent verification pipeline (`src/lib/normalization.ts`):

1. **Claimed Boundary Validation**:
   - The pipeline checks candidate quotes against the specific `claimedDocumentId`, `claimedChunkId`, and `claimedSectionTitle`.
   - Prevents quotes from one clause (such as Section 3 termination notices) from being verified under another (such as Section 4 limitation of liability).

2. **Character & Unicode Normalization**:
   - Smart single/double quotes (`’`, `‘`, `“`, `”`, `«`, `»`) $\rightarrow$ ASCII quotes (`'`, `"`).
   - Em dashes, en dashes, minus signs (`—`, `–`, `−`) $\rightarrow$ standardized hyphen delimiters (` - `).
   - Non-breaking spaces and zero-width spaces $\rightarrow$ single space.
   - Whitespace collapse ($\backslash$r, $\backslash$n, tabs, multiple spaces $\rightarrow$ single space) and lowercasing.

3. **Multi-Pass Search Hierarchy**:
   - **Pass 1 (Claimed Section/Chunk Search)**: Validates whether the quote resides inside the claimed chunk/section.
   - **Pass 2 (Direct Page Substring)**: Searches page-by-page for verbatim matches.
   - **Pass 3 (Normalized Token Search)**: Compares normalized token sequences, accommodating minor line-wrap formatting differences.
   - **Pass 4 (Cross-Page Boundary Search)**: Matches quotes spanning page transitions.

4. **Disambiguation & Occurrence Tracking**:
   - If a quote appears multiple times, ClauseLens calculates proximity to the preferred chunk/page from retrieval.
   - Returns occurrence counts (`occurrencesCount`) so users know if a clause repeated elsewhere.

5. **Rejection & Labelling**:
   - Fabricated or cross-clause mismatched quotes fail verification (`isVerified: false`) and are omitted or tagged with an orange **UNVERIFIED** alert badge.

---

## Large-Document Strategy (150+ Page Contracts)

1. **Section-Bound Chunking**:
   - Legal documents are chunked by clause headings (`Section`, `Article`, `Clause`, Roman numerals, all-caps titles).
   - Whenever a new clause heading is encountered, previous chunk buffers are flushed immediately without prepending prior text. This eliminates cross-section overlap bleeding.
   - Every chunk is assigned a stable ID (`${docId}_chunk_${index}`), page number, and section title in SQLite.
2. **Context Window Protection**:
   - The full document is never sent to the model.
   - Retrieval pulls the top $k$ relevant chunks independently for each selected document, preventing single-contract dominance.
3. **Lexical BM25 Retrieval & Query Normalization**:
   - Powered by MiniSearch with **6.0x boost for `sectionTitle`**.
   - Removes conversational noise tokens (`"what"`, `"is"`, `"the"`, `"quote"`, `"contractual"`, `"wording"`, `"compare"`, `"two"`, `"contracts"`).
   - Expands queries using domain-specific legal synonym dictionaries (liability $\rightarrow$ aggregate liability, damages cap; termination $\rightarrow$ notice, convenience, cure period; governing law $\rightarrow$ jurisdiction, laws of).

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
- High-confidence deterministic fallback engine when no AI key is provided, generating grounded answers and exact quotes.
- Live activity events streamed via Server-Sent Events (SSE).

### Hardest Challenge
The hardest challenge was ensuring that the agentic loop remains grounded and terminates gracefully when a provision does not exist. Language models tend to continue looping or hallucinating when an answer is absent. This was addressed by:
- Setting a hard limit of 6 rounds.
- Enforcing the non-negotiable safety rule: *"I could not find a supported answer in the selected document(s)."*
- Rejecting answers with unrelated or fabricated citations.

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

1. **Single-Document Query (0:00 - 1:00)**:
   - Select `saas_agreement_v1.docx`.
   - Ask: *"What is the liability cap? Quote the exact contractual wording."*
   - Observe live agent steps (`search_document`, `get_section`).
   - Notice the answer explicitly states **$500,000** with Section 4 quote:
     > *"In no event shall either party's aggregate liability arising out of or related to this Agreement exceed the sum of $500,000 (five hundred thousand dollars)."*
   - Verify the citation badge displays **VERIFIED QUOTE** under Section 4.

2. **Click Quote & View Highlight (1:00 - 1:45)**:
   - Click *"Open source"* on the citation card.
   - The right-hand Document Viewer opens `saas_agreement_v1.docx` and pulses the amber highlight over Section 4.

3. **Multi-Document Comparison Query (1:45 - 2:45)**:
   - Select both `saas_agreement_v1.docx` and `saas_agreement_v2.docx`.
   - Ask: *"Compare the liability cap in the two contracts. State the old and new amount, with a quote from each document."*
   - Observe the comparative answer:
     > *"The liability cap increased from $500,000 in saas_agreement_v1.docx to $1,000,000 in saas_agreement_v2.docx."*
   - Inspect the two verified citations: one Section 4 quote from V1 and one Section 4 quote from V2.

4. **Safe Failure / Negative Constraint (2:45 - 3:30)**:
   - Ask: *"What is the penalty for late delivery of physical hardware?"*
   - Observe the safe fallback answer:
     > *"I could not find a supported answer in the selected document(s)."*
   - Confirm zero hallucinated citations are emitted.

5. **Side-by-Side Comparison & Risk Audit (3:30 - 4:30)**:
   - Open the **Compare** modal.
   - Review the Executive Summary and High-Significance diffs ($500K $\rightarrow$ $1M cap, New York $\rightarrow$ Delaware governing law).
   - Open the **Risk Audit** to view automated clause compliance scoring.

---

## Documented Limitations

- **Scanned Image PDFs**: Severely degraded physical scans without embedded OCR text layers are rejected at upload to prevent hallucinated extraction.
- **Complex Multi-Page Tables**: Tables where column text wraps arbitrarily across page breaks may require paragraph-level token approximation.
- **Nested Appendices**: Unnumbered exhibits with non-standard bullet notation rely on BM25 body text scoring rather than section heading boosts.
