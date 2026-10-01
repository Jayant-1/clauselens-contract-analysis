import { describe, it, expect } from "vitest";
import { verifyQuote, DocumentVerificationTarget } from "../normalization";

describe("Quote Verification Pipeline", () => {
  const doc1: DocumentVerificationTarget = {
    id: "doc-1",
    name: "Master Services Agreement.pdf",
    extractedText: `
      MASTER SERVICES AGREEMENT
      This Agreement is entered into as of January 15, 2024.
      
      Section 5. Limitation of Liability.
      Except for willful misconduct or breach of confidentiality,
      either party’s total aggregate liability—arising out of or related to this Agreement—
      shall not exceed $1,000,000 (one million dollars).
      
      Section 8. Confidentiality.
      "Confidential Information" shall mean all proprietary information disclosed by one party to the other.
      Each party agrees to safeguard Confidential Information with reasonable care.
      
      Section 12. Governing Law.
      This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware.
    `,
    pages: [
      {
        pageNumber: 1,
        text: `MASTER SERVICES AGREEMENT\nThis Agreement is entered into as of January 15, 2024.\nSection 5. Limitation of Liability.\nExcept for willful misconduct or breach of confidentiality,\neither party’s total aggregate liability—arising out of or related to this Agreement—\nshall not exceed $1,000,000 (one million dollars).`,
      },
      {
        pageNumber: 2,
        text: `Section 8. Confidentiality.\n"Confidential Information" shall mean all proprietary information disclosed by one party to the other.\nEach party agrees to safeguard Confidential Information with reasonable care.\nSection 12. Governing Law.\nThis Agreement shall be governed by and construed in accordance with the laws of the State of Delaware.`,
      },
    ],
  };

  const doc2: DocumentVerificationTarget = {
    id: "doc-2",
    name: "Consulting Agreement.pdf",
    extractedText: `
      CONSULTING AGREEMENT
      Section 12. Governing Law.
      This Agreement shall be governed by and construed in accordance with the laws of the State of New York.
    `,
    pages: [
      {
        pageNumber: 1,
        text: `CONSULTING AGREEMENT\nSection 12. Governing Law.\nThis Agreement shall be governed by and construed in accordance with the laws of the State of New York.`,
      },
    ],
  };

  it("handles whitespace differences across newlines and irregular spaces", () => {
    const quoteWithExtraSpaces =
      "either party's total   aggregate   liability - arising out of or related to this Agreement";
    const result = verifyQuote(quoteWithExtraSpaces, doc1);

    expect(result.isVerified).toBe(true);
    expect(result.pageNumber).toBe(1);
    expect(result.matchedText).toContain("liability");
  });

  it("handles punctuation and unicode smart quotes/dashes changes", () => {
    // Model uses standard ASCII quotes and dashes, document uses smart quotes and em-dash
    const quote =
      'either party\'s total aggregate liability - arising out of or related to this Agreement - shall not exceed $1,000,000';
    const result = verifyQuote(quote, doc1);

    expect(result.isVerified).toBe(true);
    expect(result.pageNumber).toBe(1);
  });

  it("identifies and disambiguates repeated quote text", () => {
    const docWithRepeatedPhrases: DocumentVerificationTarget = {
      id: "doc-rep",
      name: "Repeated Terms.pdf",
      extractedText: "Section 1: General Term.\nSection 2: General Term.\nSection 3: General Term.",
      pages: [
        { pageNumber: 1, text: "Section 1: General Term." },
        { pageNumber: 2, text: "Section 2: General Term." },
        { pageNumber: 3, text: "Section 3: General Term." },
      ],
    };

    const quote = "General Term";
    // Without preference, selects first match
    const result1 = verifyQuote(quote, docWithRepeatedPhrases);
    expect(result1.isVerified).toBe(true);
    expect(result1.occurrencesCount).toBe(3);
    expect(result1.pageNumber).toBe(1);

    // With preferred page 3, disambiguates to page 3
    const result3 = verifyQuote(quote, docWithRepeatedPhrases, { preferredPage: 3 });
    expect(result3.isVerified).toBe(true);
    expect(result3.pageNumber).toBe(3);
  });

  it("supports cross-page quote matching spanning page boundaries", () => {
    const crossPageDoc: DocumentVerificationTarget = {
      id: "cross-doc",
      name: "Cross Page Contract.pdf",
      extractedText: "This Agreement may be terminated by either party upon thirty days written notice.",
      pages: [
        { pageNumber: 1, text: "This Agreement may be terminated by either party" },
        { pageNumber: 2, text: "upon thirty days written notice." },
      ],
    };

    const quote = "This Agreement may be terminated by either party upon thirty days written notice";
    const result = verifyQuote(quote, crossPageDoc);

    expect(result.isVerified).toBe(true);
    expect(result.pageNumber).toBe(1);
  });

  it("rejects a fabricated quote with clear reason", () => {
    const fabricatedQuote = "The supplier shall pay liquidated damages of fifty million dollars upon any breach.";
    const result = verifyQuote(fabricatedQuote, doc1);

    expect(result.isVerified).toBe(false);
    expect(result.matchedText).toBeNull();
    expect(result.reason).toContain("not found in document");
  });

  it("verifies multi-document quotes against the correct document only", () => {
    const delawareQuote = "laws of the State of Delaware";
    const newYorkQuote = "laws of the State of New York";

    // Delaware quote against Doc 1 (Delaware) should succeed
    const r1 = verifyQuote(delawareQuote, doc1);
    expect(r1.isVerified).toBe(true);
    expect(r1.pageNumber).toBe(2);

    // Delaware quote against Doc 2 (New York) should FAIL
    const r2 = verifyQuote(delawareQuote, doc2);
    expect(r2.isVerified).toBe(false);

    // New York quote against Doc 1 (Delaware) should FAIL
    const r3 = verifyQuote(newYorkQuote, doc1);
    expect(r3.isVerified).toBe(false);

    // New York quote against Doc 2 (New York) should succeed
    const r4 = verifyQuote(newYorkQuote, doc2);
    expect(r4.isVerified).toBe(true);
    expect(r4.pageNumber).toBe(1);
  });
});
