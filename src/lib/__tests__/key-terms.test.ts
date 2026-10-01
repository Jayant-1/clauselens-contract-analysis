import { describe, it, expect } from "vitest";
import { extractKeyTerms } from "../key-terms";

describe("Executive Key-Terms Extraction", () => {
  it("extracts governing law, liability cap, termination, and confidentiality", () => {
    const contractText = `
      This Master Services Agreement is entered into by and between Alpha Corp and Beta LLC.
      1. Term and Termination: Either party may terminate this Agreement for convenience upon sixty (60) days prior written notice.
      2. Limitation of Liability: In no event shall either party's aggregate liability exceed $1,000,000 or the total fees paid.
      3. Confidentiality: Each party's confidentiality obligations shall survive for three (3) years following termination.
      4. Governing Law: This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware without regard to conflict of law principles.
    `;

    const terms = extractKeyTerms(contractText);

    expect(terms.governingLaw).toBe("Delaware");
    expect(terms.liabilityCap).toBe("$1,000,000");
    expect(terms.terminationNotice).toContain("60");
    expect(terms.confidentialityTerm).toContain("3");
  });

  it("handles empty or partial text gracefully", () => {
    const terms = extractKeyTerms("");
    expect(terms.governingLaw).toBeNull();
    expect(terms.liabilityCap).toBeNull();
    expect(terms.terminationNotice).toBeNull();
    expect(terms.confidentialityTerm).toBeNull();
  });
});
