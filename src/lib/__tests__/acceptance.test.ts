import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import { parseDocument } from "../document-parser";
import { chunkDocument } from "../chunking";
import { buildChunkIndex, searchChunks } from "../retrieval";
import { verifyQuote, DocumentVerificationTarget } from "../normalization";
import { runAgenticResearch } from "../agent/researcher";
import { executeTool, ToolDocumentContext } from "../agent/tools";
import { compareContracts } from "../comparison";

describe("Acceptance Tests: ClauseLens Legal Contract Diligence Engine", () => {
  let docV1Context: ToolDocumentContext;
  let docV2Context: ToolDocumentContext;
  let targetDocV1: DocumentVerificationTarget;

  beforeAll(async () => {
    const v1Path = path.resolve(process.cwd(), "fixtures/contracts/saas_agreement_v1.docx");
    const v2Path = path.resolve(process.cwd(), "fixtures/contracts/saas_agreement_v2.docx");

    const v1Buf = fs.readFileSync(v1Path);
    const v2Buf = fs.readFileSync(v2Path);

    const parsedV1 = await parseDocument(v1Buf, "saas_agreement_v1.docx");
    const parsedV2 = await parseDocument(v2Buf, "saas_agreement_v2.docx");

    const chunksV1 = chunkDocument("doc_v1", parsedV1.pages);
    const chunksV2 = chunkDocument("doc_v2", parsedV2.pages);

    docV1Context = {
      id: "doc_v1",
      name: "saas_agreement_v1.docx",
      extractedText: parsedV1.extractedText,
      pages: parsedV1.pages,
      chunks: chunksV1,
    };

    docV2Context = {
      id: "doc_v2",
      name: "saas_agreement_v2.docx",
      extractedText: parsedV2.extractedText,
      pages: parsedV2.pages,
      chunks: chunksV2,
    };

    targetDocV1 = {
      id: "doc_v1",
      name: "saas_agreement_v1.docx",
      extractedText: parsedV1.extractedText,
      pages: parsedV1.pages,
      chunks: chunksV1,
    };
  });

  it("verifies contract fixture contexts cleanly without cross-section contamination", () => {
    // Assert Section 4 chunk in V1 starts cleanly with Section 4 and does NOT contain Section 3 termination notice
    const sec4V1 = docV1Context.chunks.find((c) => c.sectionTitle.includes("Limitation of Liability"));
    expect(sec4V1).toBeDefined();
    expect(sec4V1!.content).toContain("$500,000");
    expect(sec4V1!.content).not.toContain("terminate this Agreement for convenience");
    expect(sec4V1!.content).not.toContain("thirty (30) days prior written notice");

    // Assert Section 4 chunk in V2 contains $1,000,000 and not termination notice
    const sec4V2 = docV2Context.chunks.find((c) => c.sectionTitle.includes("Limitation of Liability"));
    expect(sec4V2).toBeDefined();
    expect(sec4V2!.content).toContain("$1,000,000");
    expect(sec4V2!.content).not.toContain("terminate this Agreement for convenience");
    expect(sec4V2!.content).not.toContain("sixty (60) days prior written notice");
  });

  // TEST 1: Single-Document Liability Test
  describe("1. Single-Document Liability Test", () => {
    it("answers liability cap question with $500,000 and Section 4 quote, rejecting termination quotes", async () => {
      const question = "What is the liability cap? Quote the exact contractual wording.";
      const response = await runAgenticResearch(question, [docV1Context]);

      // Assert answer includes $500,000
      expect(response.answer).toContain("$500,000");

      // Assert every displayed quote comes from Section 4
      expect(response.citations.length).toBeGreaterThan(0);
      for (const citation of response.citations) {
        expect(citation.sectionTitle).toContain("Limitation of Liability");
        expect(citation.quote).toContain("$500,000");
        expect(citation.isVerified).toBe(true);

        // Assert no termination quotation is accepted as liability evidence
        expect(citation.quote.toLowerCase()).not.toContain("terminate");
        expect(citation.quote.toLowerCase()).not.toContain("convenience");
        expect(citation.quote.toLowerCase()).not.toContain("notice");
      }

      expect(response.isGrounded).toBe(true);
    });
  });

  // TEST 2: Multi-Document Liability Test
  describe("2. Multi-Document Liability Test", () => {
    it("compares liability caps: V1 = $500,000 and V2 = $1,000,000 with verified Section 4 citations per document", async () => {
      const question =
        "Compare the liability cap in the two contracts. State the old and new amount, with a quote from each document.";
      const response = await runAgenticResearch(question, [docV1Context, docV2Context]);

      // Assert V1 says $500,000
      expect(response.answer).toContain("$500,000");
      // Assert V2 says $1,000,000
      expect(response.answer).toContain("$1,000,000");

      // Assert citations are verified against their own correct document
      expect(response.citations.length).toBe(2);

      const citV1 = response.citations.find((c) => c.documentId === "doc_v1");
      const citV2 = response.citations.find((c) => c.documentId === "doc_v2");

      expect(citV1).toBeDefined();
      expect(citV1!.quote).toContain("$500,000");
      expect(citV1!.sectionTitle).toContain("Limitation of Liability");
      expect(citV1!.isVerified).toBe(true);

      expect(citV2).toBeDefined();
      expect(citV2!.quote).toContain("$1,000,000");
      expect(citV2!.sectionTitle).toContain("Limitation of Liability");
      expect(citV2!.isVerified).toBe(true);

      expect(response.isGrounded).toBe(true);
    });
  });

  // TEST 3: Retrieval Test
  describe("3. Retrieval Ranking Test", () => {
    it("ranks Section 4 Limitation of Liability above all unrelated clauses for 'liability cap'", () => {
      const allChunks = [...docV1Context.chunks, ...docV2Context.chunks];
      const index = buildChunkIndex(allChunks);

      const results = searchChunks(index, allChunks, {
        query: "What is the liability cap? Quote the exact contractual wording.",
        documentIds: ["doc_v1"],
        limit: 5,
      });

      expect(results.length).toBeGreaterThan(0);
      // Assert rank 1 is Section 4 Limitation of Liability
      expect(results[0].sectionTitle).toContain("Limitation of Liability");
      expect(results[0].content).toContain("$500,000");

      // Verify governing law or termination is NOT ranked above Section 4
      const sec4Index = results.findIndex((r) => r.sectionTitle.includes("Limitation of Liability"));
      const govLawIndex = results.findIndex((r) => r.sectionTitle.includes("Governing Law"));
      const termIndex = results.findIndex((r) => r.sectionTitle.includes("Term and Termination"));

      expect(sec4Index).toBe(0);
      if (govLawIndex !== -1) {
        expect(sec4Index).toBeLessThan(govLawIndex);
      }
      if (termIndex !== -1) {
        expect(sec4Index).toBeLessThan(termIndex);
      }
    });
  });

  // TEST 4: Citation Verification Tests
  describe("4. Citation Verification Tests", () => {
    it("accepts quotes with whitespace differences (newlines, tabs, spacing)", () => {
      const quoteWithIrregularSpacing =
        "In  no   event shall either party's   aggregate liability arising out of or related to this Agreement exceed the sum of $500,000";
      const result = verifyQuote(quoteWithIrregularSpacing, targetDocV1);
      expect(result.isVerified).toBe(true);
      expect(result.matchedText).toBeTruthy();
    });

    it("rejects fake or hallucinated quotes", () => {
      const fakeQuote = "Provider shall provide unlimited indemnity up to $50,000,000 for any hardware failure";
      const result = verifyQuote(fakeQuote, targetDocV1);
      expect(result.isVerified).toBe(false);
      expect(result.reason).toContain("not found in document");
    });

    it("rejects quotes from the wrong document", () => {
      const quote = "In no event shall either party's aggregate liability arising out of or related to this Agreement exceed the sum of $500,000";
      const result = verifyQuote(quote, targetDocV1, {
        claimedDocumentId: "doc_v2_wrong",
      });
      expect(result.isVerified).toBe(false);
      expect(result.reason).toContain("Document ID mismatch");
    });

    it("rejects quotes that are outside the claimed section", () => {
      // Termination quote claimed under Section 4 Limitation of Liability
      const terminationQuote =
        "Either party may terminate this Agreement for convenience upon thirty (30) days prior written notice";
      const result = verifyQuote(terminationQuote, targetDocV1, {
        claimedSectionTitle: "Section 4. Limitation of Liability",
        chunks: targetDocV1.chunks,
      });
      expect(result.isVerified).toBe(false);
      expect(result.reason).toContain("outside claimed section");
    });

    it("handles repeated quotes correctly with occurrence tracking and disambiguation", () => {
      const repeatedPhrase = "reasonable care";
      const result = verifyQuote(repeatedPhrase, targetDocV1);
      expect(result.isVerified).toBe(true);
      expect(result.occurrencesCount).toBeGreaterThanOrEqual(1);
    });
  });

  // TEST 5: Safe Failure Tests
  describe("5. Safe Failure Tests", () => {
    it("returns 'I could not find a supported answer' for out-of-document questions", async () => {
      const outOfScopeQuestion =
        "What are the spacecraft orbital velocity and hypersonic reentry thermal shield specifications?";
      const response = await runAgenticResearch(outOfScopeQuestion, [docV1Context]);

      expect(response.answer).toContain("I could not find a supported answer in the selected document(s).");
      expect(response.citations.length).toBe(0);
      expect(response.isGrounded).toBe(false);
    });

    it("never produces an unrelated answer when AI is unconfigured", async () => {
      const unconfiguredQuestion = "What are the export control licensing requirements for military encryption?";
      const response = await runAgenticResearch(unconfiguredQuestion, [docV1Context, docV2Context]);

      expect(response.answer).toContain("I could not find a supported answer in the selected document(s).");
      // Must NOT contain random quotes from Governing Law or Fees
      expect(response.citations.length).toBe(0);
    });

    it("handles malformed agent tool calls safely without crashing", () => {
      const malformedCall = executeTool("search_document", "{ not: valid: json :::", [docV1Context]);
      expect(malformedCall.success).toBe(false);
      expect(malformedCall.output).toContain("Malformed JSON");

      const emptyArgsCall = executeTool("get_section", {}, [docV1Context]);
      expect(emptyArgsCall.success).toBe(false);
      expect(emptyArgsCall.output).toContain("Missing or invalid get_section arguments");
    });
  });

  // TEST 6: UI & Contract Comparison Engine Tests
  describe("6. Document Comparison & Feature Integrity Tests", () => {
    it("compares V1 and V2 detecting liability cap increase ($500k -> $1M) with high significance", () => {
      const comparison = compareContracts(docV1Context, docV2Context);

      expect(comparison.differences.length).toBeGreaterThan(0);
      expect(comparison.summary).toBeTruthy();

      // Verify liability diff has high significance
      const liabilityDiff = comparison.differences.find((d) =>
        d.clauseTitle.toLowerCase().includes("liability")
      );
      expect(liabilityDiff).toBeDefined();
      expect(liabilityDiff!.significance).toBe("high");
      expect(liabilityDiff!.docAClause?.content).toContain("500,000");
      expect(liabilityDiff!.docBClause?.content).toContain("1,000,000");
    });

    it("verifies 150-page large document chunking simulation without dropping clauses", () => {
      const largePages = [];
      for (let p = 1; p <= 150; p++) {
        largePages.push({
          pageNumber: p,
          text: `Section ${p}. Operating Clause ${p}\nObligation details for section ${p} are established herein.\nStatutory compliance code is CC-${p * 100}.`,
        });
      }

      const chunks = chunkDocument("doc_150_pages", largePages, { maxChunkSize: 800 });
      expect(chunks.length).toBeGreaterThanOrEqual(150);
      expect(chunks[0].id).toBe("doc_150_pages_chunk_0");
      expect(chunks[chunks.length - 1].pageNumber).toBe(150);
    });

    it("generates, parses, indexes, and retrieves from a realistic 150-page PDF on page 148", async () => {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      for (let i = 1; i <= 150; i++) {
        const page = pdfDoc.addPage([600, 800]);
        page.drawText(`Section ${i}. Master Service Clause ${i}`, {
          x: 50,
          y: 700,
          size: 14,
          font,
          color: rgb(0, 0, 0),
        });
        if (i === 148) {
          page.drawText("The aggregate environmental liability cap on later page is exactly $8,500,000.", {
            x: 50,
            y: 650,
            size: 12,
            font,
            color: rgb(0, 0, 0),
          });
        } else {
          page.drawText(`Standard covenant terms and operational obligations for operating period ${i}.`, {
            x: 50,
            y: 650,
            size: 12,
            font,
            color: rgb(0, 0, 0),
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const buffer = Buffer.from(pdfBytes);

      // 1. Confirm it parses successfully
      const parsed = await parseDocument(buffer, "realistic_150_pages.pdf");
      expect(parsed.pageCount).toBe(150);
      expect(parsed.pages.length).toBe(150);

      // 2. Chunking spans all 150 pages
      const chunks = chunkDocument("doc_150_real", parsed.pages);
      expect(chunks.length).toBeGreaterThanOrEqual(150);
      expect(chunks[chunks.length - 1].pageNumber).toBe(150);

      // 3. Confirm retrieval retrieves evidence from later pages (Page 148)
      const index = buildChunkIndex(chunks);
      const results = searchChunks(index, chunks, {
        query: "What is the environmental liability cap on later page?",
        limit: 5,
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].pageNumber).toBe(148);
      expect(results[0].content).toContain("$8,500,000");

      // 4. Confirm independent quote verification succeeds for the late-page quote
      const verification = verifyQuote(
        "The aggregate environmental liability cap on later page is exactly $8,500,000.",
        {
          id: "doc_150_real",
          name: "realistic_150_pages.pdf",
          extractedText: parsed.extractedText,
          pages: parsed.pages,
        }
      );
      expect(verification.isVerified).toBe(true);
      expect(verification.pageNumber).toBe(148);

      // 5. Confirm that an absent provision across all 150 pages is not falsely found
      const absentResults = searchChunks(index, chunks, {
        query: "What is the liquidated damages penalty for satellite orbital collision?",
        limit: 5,
      });
      const hasFalseMatch = absentResults.some((r) => r.content.includes("orbital collision"));
      expect(hasFalseMatch).toBe(false);
    });
  });
});
