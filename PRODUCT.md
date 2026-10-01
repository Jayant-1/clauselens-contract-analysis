# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Legal counsel, contract managers, compliance officers, and procurement professionals reviewing commercial agreements (NDAs, MSAs, SaaS agreements, vendor contracts) under time sensitivity and strict fiduciary accountability.

## Product Purpose
Evidence-grounded legal contract analysis and comparative review. ClauseLens allows users to upload PDF and DOCX agreements, interrogate them via conversational search, receive answers backed strictly by verified quotes, and click citations to highlight the exact source passages in the document text layer.

## Positioning
Zero-hallucination, quote-verified contract intelligence. Unlike generic AI chat tools that summarize or invent citations, ClauseLens independently normalizes and algorithmically verifies every single quote against the raw extracted document text before displaying it, and provides side-by-side substantive clause comparison with materiality detection.

## Operating Context
Desktop legal analysis environment. Users evaluate high-risk contracts (50-150+ pages), compare revised drafts against baseline versions, conduct multi-round autonomous deep-dive investigations via tool calling (BM25 lexical retrieval, clause inspection), and review verified citations in split-screen PDF.js/DOCX viewers.

## Capabilities and Constraints
- Formats: PDF (unpdf text extraction, scanned PDF detection & rejection) and DOCX (mammoth paragraph preservation).
- Retrieval: Lexical BM25 (MiniSearch) over clause/heading-segmented chunks with stable chunk IDs; 150-page scale support without whole-document context blowup.
- Verification: Strict post-generation verification pipeline (case-folding, Unicode quote normalization, whitespace collapse, cross-line and cross-page spans). Unverified quotes are rejected or prominently flagged.
- Comparison: Side-by-side clause-level diffing with automatic extraction of material terms (liability caps, termination notice periods, governing law, payment terms) and High/Medium/Low significance scoring.
- Agentic Research: Option 2 autonomous multi-step research loop (up to 6 rounds of `search_document`, `get_section`, `list_clauses`) with live activity event streaming.
- Persistence: SQLite with Prisma (`dev.db`), local filesystem storage with S3/Vercel Blob pluggable provider abstraction.
- AI Configuration: Fully provider-agnostic via `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL`.

## Brand Commitments
- Name: ClauseLens
- Tone & Identity: Professional, trustworthy, restrained, high-density desktop utility. Dark-mode slate palette with amber citation pulses and emerald verified badges.

## Evidence on Hand
- Realistic sample contract fixtures: `fixtures/contracts/Enterprise_SaaS_Agreement_v1.docx`, `fixtures/contracts/Enterprise_SaaS_Agreement_v2.docx`, `fixtures/contracts/Vendor_Master_Services_Agreement_v1.docx`.
- Automated test suite: 35 passing unit, integration, and E2E API tests across 6 test suites covering quote verification, chunking/retrieval, clause comparison, agentic research, and file parsing.

## Product Principles
1. Evidence First: Never claim a clause exists or doesn't exist without verified document evidence. An answer without evidence is "I could not find this in the selected document(s)."
2. Independent Verification: Never trust model-reported offsets or page numbers. Every quote must match canonical document text through rigorous normalization.
3. Transparent Auditability: Every verified citation links directly to the source document, immediately scrolling and highlighting the text layer.
4. Deterministic Reliability: The application functions reliably with or without an active AI key, falling back to deterministic lexical retrieval and structured extraction when offline.

## Accessibility & Inclusion
Keyboard navigable controls, high-contrast dark theme UI, accessible file upload dropzones, ARIA dialog and status roles, and visible focus indicators.
