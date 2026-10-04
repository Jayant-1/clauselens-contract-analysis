# ClauseLens — Engineering Submission Note

- **Candidate**: Jayant Potdar
- **Live Production URL**: [https://clauselens-contract-analysis.vercel.app](https://clauselens-contract-analysis.vercel.app)
- **GitHub Repository**: [https://github.com/Jayant-1/clauselens-contract-analysis](https://github.com/Jayant-1/clauselens-contract-analysis)
- **Walkthrough Video**: [https://clauselens-contract-analysis.vercel.app/demo/clauselens-demo-walkthrough.webm](https://clauselens-contract-analysis.vercel.app/demo/clauselens-demo-walkthrough.webm)
- **Submission Target**: suryashish1@elcara.io

### 1. Quote Verification and Failure Modes
ClauseLens treats quote verification as a non-negotiable security and grounding guarantee. In legal diligence, citing the wrong clause or returning a syntactically valid quote from an unrelated provision (e.g., citing a 30-day termination notice when asked for a liability cap) is as catastrophic as outright hallucination.

To guarantee fidelity without trusting model-reported metadata, ClauseLens implements an independent, multi-stage verification pipeline:
- **Claimed Boundary Validation**: The verifier checks candidate quotes directly against `claimedDocumentId`, `claimedChunkId`, and `claimedSectionTitle` before falling back to full-page search. This guarantees that quotes cannot be attributed to the wrong section.
- **Section-Bound Chunking**: We eliminated cross-section overlap bleeding by immediately flushing preceding text buffers when a new clause heading is detected. Sections start strictly at their legal headings (`Section 4. Limitation of Liability` contains only Section 4 text).
- **Unicode & Punctuation Normalization**: Typographic curly quotes (`’`, `”`), em/en dashes (`—`, `–`), and arbitrary whitespace or line breaks are normalized into canonical forms without altering legal terminology.
- **Failure Modes & Defenses**:
  - *Scanned / Degraded PDFs*: Without reliable OCR text layers, string verification cannot produce sound guarantees. ClauseLens rejects unreadable scanned PDFs during upload rather than passing degraded text to the pipeline.
  - *Multi-Column Tables & Line Wraps*: Complex tables spanning page breaks can cause word-order fragmentation. ClauseLens uses whitespace-tolerant token matching and cross-page transition sliding windows to preserve quote continuity.
  - *Negative Evidence*: If a requested provision does not exist or evidence is unsupported, ClauseLens strictly enforces the non-negotiable rule: *"I could not find a supported answer in the selected document(s)."*

### 2. Large Document Strategy (150+ Page Contracts)
In real-world commercial contracts (MSAs, credit agreements, merger schedules), documents routinely exceed 100–200 pages. ClauseLens handles massive documents using a bounded-context architecture:
1. **Structural Clause Chunking**: Rather than splitting blindly on character or token counts, contracts are chunked along legal hierarchy (`Section`, `Article`, `Clause`, Roman numerals). Stable chunk IDs (`${docId}_chunk_${index}`) are indexed in SQLite with page numbers and offsets.
2. **Noise-Filtered Lexical BM25 Retrieval**: We implemented a MiniSearch retrieval engine with conversational noise filtering (`"what"`, `"is"`, `"the"`, `"quote"`), legal synonym expansion (`liability` $\rightarrow$ `aggregate liability`, `damages cap`), and a **6.0x boost for `sectionTitle`**. This ensures Section 4 consistently ranks #1 for liability queries.
3. **Independent Multi-Document Search**: Multi-contract queries retrieve top chunks independently per document, preventing one document from crowding out another.
4. **Context Window Protection**: The full text is never dumped into LLM prompts. Only the top-k verified chunks are passed into the agent loop.

### 3. Why Option 2 (Agentic Document Research) & How It Works
We chose **Option 2: Agentic Document Research** because legal diligence inherently requires multi-hop reasoning. In complex agreements:
- Provisions frequently cross-reference other sections (e.g., Section 4 Limitation of Liability stating *"Except as provided in Section 7 (Indemnification)..."*). Single-turn RAG retrieval misses these dependencies.
- Cross-document comparisons require inspecting corresponding provisions across distinct contracts.
- Our autonomous agent loop (up to 6 rounds) equips the engine with three tools: `search_document`, `get_section`, and `list_clauses`.
- Tools and structured outputs are strictly validated via Zod schemas (`StructuredAnswerSchema`, `SearchDocumentSchema`, etc.).
- When no AI API key is configured, ClauseLens operates in a **high-confidence deterministic autonomous mode**, executing real multi-round tool research over retrieved contract evidence to extract exact figures ($500,000 in V1, $1,000,000 in V2) and exact verbatim quotes.

### 4. Hardest Part of the Build
The hardest challenge was solving the semantic bleed and boundary misattribution between Section 3 and Section 4. A naive overlap window was carrying over termination notice sentences into the limitation of liability chunk. Fixing this required:
1. Re-architecting chunking to enforce strict section boundaries upon encountering legal headings.
2. Conditioning citation verification on claimed section/chunk boundaries.
3. Designing domain-specific retrieval expansion so legal queries reliably retrieve the exact governing clause.

### 5. What to Build Next With More Time
1. **Hybrid Dense + Lexical Retrieval**: Integrate local vector embeddings (via sqlite-vss or pgvector) alongside BM25 for hybrid semantic search.
2. **Native DOCX Redline Export**: Export Word documents with Track Changes XML markup for detected clause diffs.
3. **Multi-User Collaboration & Audit Trail**: Real-time shared diligence workspaces with team comments and compliance audit logging.
