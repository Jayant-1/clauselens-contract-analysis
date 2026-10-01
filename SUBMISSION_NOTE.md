# ClauseLens — Engineering Submission Note

### 1. Quote Verification and Failure Modes
ClauseLens treats quote verification as a non-negotiable security and grounding guarantee. Language models are prone to hallucinating citations, altering minor punctuation, or generating quotes that appear plausible but do not exist in the source document. To guarantee fidelity without relying on model-provided offsets, ClauseLens implements an independent multi-pass pipeline:
- **Normalization Engine**: Normalizes Unicode typographic quotes, smart primes, dashes (em/en dashes collapsed to standardized hyphen boundaries), and sequences of irregular whitespace.
- **Cross-Boundary Matching**: Quotes that span line wraps or page boundaries are validated by comparing concatenated page transitions as well as normalized word sequences.
- **Disambiguation**: Repeated phrases (e.g., standard definitions or recurring boilerplate) are mapped to their specific retrieved chunk or prioritized by page proximity.
- **Failure Modes**: The primary failure mode occurs with poor-quality OCR or image-only PDFs where optical text layer information is garbled or non-existent. ClauseLens addresses this by rejecting unreadable scanned PDFs at upload rather than attempting unreliable processing. Another edge case involves severe table layouts with columns, which we resolve through whitespace-tolerant token matching.

### 2. Large Document Strategy (150+ Page Contracts)
In real-world commercial and legal workflows, 100+ page master service agreements, credit facilities, and lease agreements are common. ClauseLens handles massive contracts using a three-tier architecture:
1. **Clause-Aware Chunking**: Text is segmented along legal structural boundaries (`Section`, `Article`, `Clause`, Roman numerals) rather than arbitrary character slices, ensuring semantic coherence with 150-character contextual overlap.
2. **Persistent Storage & Indexing**: Chunks are stored in SQLite with page numbers and stable IDs (`${docId}_chunk_${index}`), and indexed with BM25 scoring via MiniSearch with header weighting (2.5x).
3. **Context Window Safety**: The entire contract is never dumped into the LLM prompt. Instead, relevant chunks are dynamically retrieved and presented to the model during the multi-round research loop. When queries fall outside retrieved evidence, the system safely falls back to: *"I could not find this in the selected document(s)."*

### 3. Why Option 2 (Agentic Document Research) & How It Works
We chose **Option 2: Agentic Document Research** because complex legal analysis requires multi-step investigation. Contracts are heavily cross-referential (e.g., a limitation of liability clause often points to separate indemnification or insurance schedules). A naive single-turn RAG retrieval routinely misses these dependencies.
Our implementation features:
- A multi-round loop (up to 6 rounds) equipped with three tools: `search_document`, `get_section`, and `list_clauses`.
- Strict schema validation using Zod. Malformed or unknown calls fail safely with informative feedback rather than crashing the runtime.
- Live Server-Sent Events (SSE) streaming visible activity updates (*"Searching termination provisions..."*, *"Reading Section 12..."*) directly to the user.

### 4. Hardest Part of the Build
The most challenging aspect was creating a unified citation-to-highlight mapping system that works consistently across both PDF and DOCX formats. PDF text streams often contain fragmented font glyphs and line wrap hyphens that do not match raw Unicode text 1:1, while DOCX files require paragraph-level DOM anchors. Bridging this gap required building the index mapper, synchronizing PDF.js canvas with an interactive text layer, and embedding paragraph identifiers into Mammoth’s HTML output.

### 5. What to Build Next With More Time
With additional time, the following high-impact enhancements would be added:
1. **Vector Embeddings with Hybrid Search**: Complement the existing BM25 lexical engine with local dense embeddings (e.g., pgvector / sqlite-vss) for hybrid lexical-semantic retrieval.
2. **Document Version Redlining Export**: Export DOCX redline files with Microsoft Word track-changes markup for the substantive comparison differences.
3. **Multi-User Collaboration & RBAC**: Organization workspaces, shared contract libraries, and audit logs for compliance teams.
