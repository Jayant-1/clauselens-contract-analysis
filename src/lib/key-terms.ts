import { extractMaterialValues } from "./comparison";

export interface KeyTermsSummary {
  governingLaw: string | null;
  liabilityCap: string | null;
  terminationNotice: string | null;
  confidentialityTerm: string | null;
}

/**
 * Extracts high-level executive terms from a contract's text for attorneys
 */
export function extractKeyTerms(text: string): KeyTermsSummary {
  if (!text) {
    return {
      governingLaw: null,
      liabilityCap: null,
      terminationNotice: null,
      confidentialityTerm: null,
    };
  }

  // 1. Governing Law
  let governingLaw: string | null = null;
  const govLawMatch = text.match(
    /(?:governed by|construed in accordance with|laws of)(?: the)? State of ([A-Za-z\s]+?)(?:,|\.|\s+without|\s+and|\s+excluding)/i
  );
  if (govLawMatch) {
    governingLaw = govLawMatch[1].trim();
  } else {
    const fallbackGov = text.match(/State of ([A-Za-z]+) (?:law|without regard)/i);
    if (fallbackGov) governingLaw = fallbackGov[1].trim();
  }

  // 2. Liability Cap
  let liabilityCap: string | null = null;
  const capDollarMatch = text.match(
    /(?:aggregate liability|total liability|liability under this agreement)[^.]*?(\$(?:\d{1,3}(?:,\d{3})*|\d+)(?:\.\d{2})?(?:\s*(?:million|thousand))?)/i
  );
  if (capDollarMatch) {
    liabilityCap = capDollarMatch[1];
  } else {
    const capFeesMatch = text.match(
      /(?:aggregate liability|total liability)[^.]*?(equal to the (?:total )?fees paid|fees paid[^.]*?prior \d+ months|\d+ months? fees)/i
    );
    if (capFeesMatch) {
      liabilityCap = capFeesMatch[1].trim();
    } else {
      const material = extractMaterialValues(text);
      if (material.money.length > 0) {
        liabilityCap = material.money[0];
      }
    }
  }

  // 3. Termination Notice
  let terminationNotice: string | null = null;
  const termNoticeMatch = text.match(
    /(?:terminate|termination)[^.]*?((?:[0-9]+|thirty|sixty|ninety)\s*(?:\([0-9]+\))?\s*days?)(?:\s*(?:prior|advance)?\s*written notice)?/i
  );
  if (termNoticeMatch) {
    terminationNotice = termNoticeMatch[1].trim();
  } else {
    const daysMatch = text.match(/(?:written notice of at least|upon)\s*([0-9]+\s*days)/i);
    if (daysMatch) terminationNotice = daysMatch[1].trim();
  }

  // 4. Confidentiality / Survival Term
  let confidentialityTerm: string | null = null;
  const confMatch = text.match(
    /(?:confidentiality|nondisclosure|survive)[^.]*?((?:[0-9]+|one|two|three|five)\s*(?:\([0-9]+\))?\s*years?)/i
  );
  if (confMatch) {
    confidentialityTerm = confMatch[1].trim();
  }

  return {
    governingLaw,
    liabilityCap,
    terminationNotice,
    confidentialityTerm,
  };
}
