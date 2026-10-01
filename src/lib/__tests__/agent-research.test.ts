import { describe, it, expect } from "vitest";
import { executeTool, ToolDocumentContext } from "../agent/tools";
import { runAgenticResearch, ResearchStep } from "../agent/researcher";
import { chunkDocument } from "../chunking";

describe("Agentic Document Research (Part C - Option 2)", () => {
  const sampleDoc1: ToolDocumentContext = {
    id: "doc-1",
    name: "Master Cloud Agreement.docx",
    extractedText:
      "Section 1. Scope of Services\nProvider shall deliver cloud hosting.\nSection 4. Limitation of Liability\nIn no event shall aggregate liability exceed $500,000.\nSection 6. Governing Law\nThis Agreement is governed by Delaware law.",
    pages: [
      {
        pageNumber: 1,
        text: "Section 1. Scope of Services\nProvider shall deliver cloud hosting.\nSection 4. Limitation of Liability\nIn no event shall aggregate liability exceed $500,000.\nSection 6. Governing Law\nThis Agreement is governed by Delaware law.",
      },
    ],
    chunks: [],
  };
  sampleDoc1.chunks = chunkDocument(sampleDoc1.id, sampleDoc1.pages);

  const sampleDoc2: ToolDocumentContext = {
    id: "doc-2",
    name: "Consulting Agreement.pdf",
    extractedText:
      "Section 3. Payment\nInvoices are due in 30 days.\nSection 6. Governing Law\nThis Agreement is governed by New York law.",
    pages: [
      {
        pageNumber: 1,
        text: "Section 3. Payment\nInvoices are due in 30 days.\nSection 6. Governing Law\nThis Agreement is governed by New York law.",
      },
    ],
    chunks: [],
  };
  sampleDoc2.chunks = chunkDocument(sampleDoc2.id, sampleDoc2.pages);

  describe("Safe Tool Execution & Error Handling", () => {
    it("handles malformed JSON argument strings without crashing", () => {
      const result = executeTool("search_document", "{ malformed json :::", [sampleDoc1]);
      expect(result.success).toBe(false);
      expect(result.output).toContain("Malformed JSON");
    });

    it("handles missing required arguments safely using Zod validation", () => {
      // search_document requires 'query'
      const result = executeTool("search_document", {}, [sampleDoc1]);
      expect(result.success).toBe(false);
      expect(result.output).toContain("Missing or invalid search arguments");

      // get_section requires 'documentId' and 'sectionId'
      const resSection = executeTool("get_section", { documentId: "doc-1" }, [sampleDoc1]);
      expect(resSection.success).toBe(false);
      expect(resSection.output).toContain("Missing or invalid get_section arguments");
    });

    it("handles unknown or nonsensical tool names safely", () => {
      const result = executeTool("hack_system", { target: "admin" }, [sampleDoc1]);
      expect(result.success).toBe(false);
      expect(result.output).toContain("does not exist");
      expect(result.output).toContain("Available tools");
    });
  });

  describe("Tool Operations", () => {
    it("executes search_document returning BM25 ranked chunks with section titles and page numbers", () => {
      const result = executeTool("search_document", { query: "liability cap $500,000" }, [sampleDoc1]);
      expect(result.success).toBe(true);
      expect(result.activityMessage).toContain("Searching");
      expect(result.output).toContain("Limitation of Liability");
      expect(result.output).toContain("$500,000");
    });

    it("executes get_section retrieving the full verbatim section text", () => {
      const result = executeTool(
        "get_section",
        { documentId: "doc-1", sectionId: "Limitation of Liability" },
        [sampleDoc1]
      );
      expect(result.success).toBe(true);
      expect(result.activityMessage).toContain("Reading section");
      expect(result.output).toContain("aggregate liability exceed $500,000");
    });

    it("executes list_clauses returning all clause headers in a document", () => {
      const result = executeTool("list_clauses", { documentId: "doc-1" }, [sampleDoc1]);
      expect(result.success).toBe(true);
      expect(result.output).toContain("Scope of Services");
      expect(result.output).toContain("Limitation of Liability");
    });
  });

  describe("Multi-Round Autonomous Research Loop", () => {
    it("executes multiple tool rounds for a multi-step question and emits visible activity events", async () => {
      const activityEvents: ResearchStep[] = [];
      const streamedTokens: string[] = [];

      const response = await runAgenticResearch(
        "What is the limitation of liability and governing law?",
        [sampleDoc1, sampleDoc2],
        {
          onStep: (step) => activityEvents.push(step),
          onToken: (token) => streamedTokens.push(token),
        }
      );

      // Verify multiple tool rounds were executed
      expect(response.steps.length).toBeGreaterThanOrEqual(2);
      expect(response.steps.some((s) => s.round === 1)).toBe(true);
      expect(response.steps.some((s) => s.round === 2)).toBe(true);

      // Verify visible activity messages
      expect(response.steps.some((s) => s.message.toLowerCase().includes("searching"))).toBe(true);
      expect(response.steps.some((s) => s.message.toLowerCase().includes("reading"))).toBe(true);

      // Verify tokens were streamed
      expect(streamedTokens.length).toBeGreaterThan(0);

      // Verify final response contains grounded citations and verified quotes
      expect(response.answer).toBeTruthy();
      expect(response.citations.length).toBeGreaterThan(0);
      expect(response.citations.every((c) => c.isVerified)).toBe(true);
      expect(response.isGrounded).toBe(true);
    });

    it("returns 'I could not find this in the selected document(s)' when query has no matching evidence", async () => {
      const response = await runAgenticResearch(
        "What are the spacecraft orbital reentry orbital velocity requirements?",
        [sampleDoc1]
      );

      expect(response.answer).toContain("I could not find this in the selected document(s).");
      expect(response.isGrounded).toBe(false);
      expect(response.citations.length).toBe(0);
    });
  });
});
