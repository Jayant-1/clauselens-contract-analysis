import { describe, it, expect } from "vitest";
import fs from "fs/promises";
import path from "path";
import { parseDocument } from "../document-parser";
import { compareContracts, extractMaterialValues } from "../comparison";

describe("Contract Comparison Engine", () => {
  const fixturesDir = path.join(process.cwd(), "fixtures", "contracts");

  it("extracts material numbers, dates, and governing law accurately", () => {
    const text =
      "In no event shall aggregate liability exceed $1,000,000. Either party may terminate upon sixty (60) days prior written notice. This Agreement is governed by the laws of the State of Delaware, without regard to conflict.";
    const vals = extractMaterialValues(text);

    expect(vals.money).toContain("$1,000,000");
    expect(vals.days.some((d) => d.includes("60"))).toBe(true);
    expect(vals.governingLaw).toBe("Delaware");
  });

  it("compares saas_agreement_v1 and saas_agreement_v2 detecting liability cap, termination period, and governing law changes", async () => {
    const buf1 = await fs.readFile(path.join(fixturesDir, "saas_agreement_v1.docx"));
    const buf2 = await fs.readFile(path.join(fixturesDir, "saas_agreement_v2.docx"));

    const doc1 = await parseDocument(buf1, "saas_agreement_v1.docx");
    const doc2 = await parseDocument(buf2, "saas_agreement_v2.docx");

    const report = compareContracts(
      {
        id: "doc-v1",
        name: "SaaS Agreement v1.docx",
        extractedText: doc1.extractedText,
        pages: doc1.pages,
      },
      {
        id: "doc-v2",
        name: "SaaS Agreement v2.docx",
        extractedText: doc2.extractedText,
        pages: doc2.pages,
      }
    );

    expect(report.differences.length).toBeGreaterThanOrEqual(3);

    // 1. Liability cap change ($500,000 -> $1,000,000)
    const liabilityDiff = report.differences.find(
      (d) =>
        d.clauseTitle.toLowerCase().includes("liability") ||
        d.materialChanges.some((m) => m.category === "liability_cap")
    );
    expect(liabilityDiff).toBeDefined();
    expect(liabilityDiff?.significance).toBe("high");
    expect(liabilityDiff?.substantiveChange).toContain("500,000");
    expect(liabilityDiff?.substantiveChange).toContain("1,000,000");

    // 2. Governing law change (New York -> Delaware)
    const lawDiff = report.differences.find(
      (d) =>
        d.clauseTitle.toLowerCase().includes("governing law") ||
        d.materialChanges.some((m) => m.category === "governing_law")
    );
    expect(lawDiff).toBeDefined();
    expect(lawDiff?.significance).toBe("high");
    expect(lawDiff?.substantiveChange).toContain("Delaware");

    // 3. Termination notice period change (30 days -> 60 days)
    const termDiff = report.differences.find(
      (d) =>
        d.clauseTitle.toLowerCase().includes("term") ||
        d.materialChanges.some((m) => m.category === "termination_period")
    );
    expect(termDiff).toBeDefined();
    expect(termDiff?.significance).toBe("medium");
    expect(termDiff?.substantiveChange).toContain("60");

    // 4. Added clause: Section 7. Data Protection
    const addedDiff = report.differences.find(
      (d) => d.type === "added" && d.clauseTitle.toLowerCase().includes("data protection")
    );
    expect(addedDiff).toBeDefined();

    // Verify summary contains high and medium significance changes
    expect(report.summary).toContain("Limitation of Liability");
    expect(report.summary).toContain("Governing Law");
  });

  it("sorts high-significance differences before medium and low", async () => {
    const buf1 = await fs.readFile(path.join(fixturesDir, "saas_agreement_v1.docx"));
    const buf2 = await fs.readFile(path.join(fixturesDir, "saas_agreement_v2.docx"));

    const doc1 = await parseDocument(buf1, "saas_agreement_v1.docx");
    const doc2 = await parseDocument(buf2, "saas_agreement_v2.docx");

    const report = compareContracts(
      {
        id: "doc-v1",
        name: "SaaS Agreement v1.docx",
        extractedText: doc1.extractedText,
        pages: doc1.pages,
      },
      {
        id: "doc-v2",
        name: "SaaS Agreement v2.docx",
        extractedText: doc2.extractedText,
        pages: doc2.pages,
      }
    );

    // First difference in array should have high significance
    expect(report.differences[0].significance).toBe("high");
  });
});
