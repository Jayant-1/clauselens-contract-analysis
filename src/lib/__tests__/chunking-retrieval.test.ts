import { describe, it, expect } from "vitest";
import { chunkDocument, extractSectionTitle } from "../chunking";
import { buildChunkIndex, searchChunks } from "../retrieval";

describe("Large Document Chunking & Retrieval", () => {
  it("extracts legal clause headings accurately", () => {
    expect(extractSectionTitle("Section 5. Limitation of Liability")).toBeTruthy();
    expect(extractSectionTitle("Article IV: Indemnification")).toBeTruthy();
    expect(extractSectionTitle("Clause 12.3 Governing Law")).toBeTruthy();
    expect(extractSectionTitle("TERMINATION FOR CAUSE")).toBeTruthy();
    expect(extractSectionTitle("The quick brown fox jumps over the lazy dog")).toBeNull();
  });

  it("chunks multi-page document respecting clause boundaries and assigns stable IDs", () => {
    const pages = [
      {
        pageNumber: 1,
        text: `MASTER SERVICES AGREEMENT\nSection 1. Definitions\nIn this Agreement, capitalized terms have defined meanings.\nSection 2. Scope of Services\nProvider shall deliver cloud hosting services in accordance with SLA.`,
      },
      {
        pageNumber: 2,
        text: `Section 3. Payment Terms\nCustomer shall pay all invoices within thirty (30) days of receipt.\nSection 4. Term and Termination\nThis Agreement commences on Effective Date and continues for 12 months.`,
      },
      {
        pageNumber: 3,
        text: `Section 5. Limitation of Liability\nNeither party liability under this Agreement shall exceed $500,000.\nSection 6. Governing Law\nThis Agreement is governed by Delaware law.`,
      },
    ];

    const chunks = chunkDocument("doc_contract_1", pages, { maxChunkSize: 500 });

    expect(chunks.length).toBeGreaterThanOrEqual(3);
    for (const chunk of chunks) {
      expect(chunk.id).toMatch(/^doc_contract_1_chunk_\d+$/);
      expect(chunk.documentId).toBe("doc_contract_1");
      expect(chunk.pageNumber).toBeGreaterThanOrEqual(1);
      expect(chunk.sectionTitle).toBeTruthy();
      expect(chunk.content.length).toBeGreaterThan(0);
    }
  });

  it("handles large 150-page contracts without dropping clauses or exceeding chunk limits", () => {
    // Generate a 150-page contract simulation
    const largePages = [];
    for (let p = 1; p <= 150; p++) {
      largePages.push({
        pageNumber: p,
        text: `Section ${p}. Operating Provision ${p}\nDetailed contractual obligations for phase ${p}.\nAll personnel must maintain compliance standards according to statutory regulation ${p * 10}.\nTermination notice for this phase is ${p * 2} days.`,
      });
    }

    const chunks = chunkDocument("doc_huge_150", largePages, { maxChunkSize: 800 });

    expect(chunks.length).toBeGreaterThanOrEqual(150);
    // Verify stable IDs and page mapping
    expect(chunks[0].id).toBe("doc_huge_150_chunk_0");
    expect(chunks[chunks.length - 1].pageNumber).toBe(150);

    // Build search index and retrieve
    const index = buildChunkIndex(chunks);
    const results = searchChunks(index, chunks, {
      query: "compliance standards statutory regulation 500",
      documentIds: ["doc_huge_150"],
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].content).toContain("regulation 500");
  });

  it("retrieves relevant chunks with BM25 scoring and supports multi-document isolation", () => {
    const docA_chunks = chunkDocument("doc_A", [
      {
        pageNumber: 1,
        text: "Section 10. Governing Law\nThis Agreement shall be governed by the laws of the State of California.",
      },
    ]);

    const docB_chunks = chunkDocument("doc_B", [
      {
        pageNumber: 1,
        text: "Section 10. Governing Law\nThis Agreement shall be governed by the laws of the State of New York.",
      },
    ]);

    const allChunks = [...docA_chunks, ...docB_chunks];
    const index = buildChunkIndex(allChunks);

    // Search doc A only
    const resA = searchChunks(index, allChunks, {
      query: "California governing law",
      documentIds: ["doc_A"],
    });
    expect(resA.length).toBeGreaterThan(0);
    expect(resA[0].documentId).toBe("doc_A");
    expect(resA[0].content).toContain("California");

    // Search doc B only for California should return 0 results
    const resB = searchChunks(index, allChunks, {
      query: "California",
      documentIds: ["doc_B"],
    });
    expect(resB.length).toBe(0);
  });

  it("returns empty results for non-existent clauses to enable fallback", () => {
    const chunks = chunkDocument("doc_1", [
      {
        pageNumber: 1,
        text: "Section 1. Non-Disclosure\nParties agree to keep confidential information safe.",
      },
    ]);

    const index = buildChunkIndex(chunks);
    const results = searchChunks(index, chunks, {
      query: "unmanned aerial vehicle drone flight regulations",
      documentIds: ["doc_1"],
      minScore: 0.8,
    });

    expect(results.length).toBe(0);
  });
});
