import { describe, it, expect } from "vitest";
import fs from "fs/promises";
import path from "path";
import { parseDocument, validateFileFormat } from "../document-parser";

describe("Document Parsing & Validation Pipeline", () => {
  const fixturesDir = path.join(process.cwd(), "fixtures", "contracts");

  it("validates file format correctly and rejects unsupported formats", () => {
    expect(validateFileFormat("contract.pdf")).toBe("pdf");
    expect(validateFileFormat("agreement.docx")).toBe("docx");
    expect(() => validateFileFormat("spreadsheet.xlsx")).toThrow(/Unsupported file format/);
    expect(() => validateFileFormat("malicious.exe")).toThrow(/Unsupported file format/);
    expect(() => validateFileFormat("script.js")).toThrow(/Unsupported file format/);
  });

  it("parses valid multi-page PDF contracts extracting pages and text", async () => {
    const pdfPath = path.join(fixturesDir, "sample_contract.pdf");
    const buffer = await fs.readFile(pdfPath);

    const parsed = await parseDocument(buffer, "sample_contract.pdf");

    expect(parsed.fileType).toBe("pdf");
    expect(parsed.pageCount).toBe(2);
    expect(parsed.pages.length).toBe(2);
    expect(parsed.extractedText).toContain("COMMERCIAL LEASE AGREEMENT");
    expect(parsed.extractedText).toContain("Section 1. Premises and Term");
    expect(parsed.extractedText).toContain("$18,500");
    expect(parsed.pages[0].text).toContain("COMMERCIAL LEASE AGREEMENT");
    expect(parsed.pages[1].text).toContain("Section 4. Insurance and Indemnification");
  });

  it("parses valid DOCX contracts extracting structured text and HTML anchors", async () => {
    const docxPath = path.join(fixturesDir, "saas_agreement_v1.docx");
    const buffer = await fs.readFile(docxPath);

    const parsed = await parseDocument(buffer, "saas_agreement_v1.docx");

    expect(parsed.fileType).toBe("docx");
    expect(parsed.extractedText).toContain("MASTER CLOUD SERVICES AGREEMENT");
    expect(parsed.extractedText).toContain("Section 4. Limitation of Liability");
    expect(parsed.extractedText).toContain("$500,000");
    expect(parsed.htmlContent).toBeTruthy();
    expect(parsed.htmlContent).toContain("data-para-index");
    expect(parsed.pages.length).toBeGreaterThanOrEqual(1);
  });

  it("detects and rejects scanned / image-only PDFs with no readable text", async () => {
    const scannedPath = path.join(fixturesDir, "scanned_sample.pdf");
    const buffer = await fs.readFile(scannedPath);

    await expect(parseDocument(buffer, "scanned_sample.pdf")).rejects.toThrow(
      /OCR is not available \/ the PDF has no readable text/
    );
  });
});
