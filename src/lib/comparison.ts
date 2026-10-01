import { diffWordsWithSpace } from "diff";
import { normalizeText } from "./normalization";
import { extractSectionTitle } from "./chunking";

export type DifferenceType = "added" | "removed" | "modified" | "unchanged";
export type SignificanceLevel = "high" | "medium" | "low";

export interface MaterialChangeDetail {
  category: "liability_cap" | "governing_law" | "termination_period" | "payment_terms" | "data_protection" | "general";
  oldValue: string | null;
  newValue: string | null;
  description: string;
}

export interface DiffWordPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export interface ClauseDifference {
  id: string;
  clauseTitle: string;
  type: DifferenceType;
  significance: SignificanceLevel;
  docAClause: { content: string; pageNumber: number } | null;
  docBClause: { content: string; pageNumber: number } | null;
  substantiveChange: string;
  materialChanges: MaterialChangeDetail[];
  wordDiffs: DiffWordPart[];
}

export interface ComparisonReport {
  docAId: string;
  docAName: string;
  docBId: string;
  docBName: string;
  summary: string;
  stats: {
    totalClausesA: number;
    totalClausesB: number;
    addedCount: number;
    removedCount: number;
    modifiedCount: number;
    highSignificanceCount: number;
    mediumSignificanceCount: number;
    lowSignificanceCount: number;
  };
  differences: ClauseDifference[];
}

export interface DocumentComparisonInput {
  id: string;
  name: string;
  extractedText: string;
  pages: Array<{ pageNumber: number; text: string }>;
}

export interface ExtractedClause {
  title: string;
  content: string;
  pageNumber: number;
}

/**
 * Extracts clauses from document pages based on headings and paragraph structures
 */
export function extractClauses(doc: DocumentComparisonInput): ExtractedClause[] {
  const clauses: ExtractedClause[] = [];
  let currentTitle = "Preamble & General Terms";
  let currentContent = "";
  let currentPage = 1;

  for (const page of doc.pages) {
    const lines = page.text.split(/\r?\n/);
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const heading = extractSectionTitle(line);
      if (heading) {
        if (currentContent.trim()) {
          clauses.push({
            title: currentTitle,
            content: currentContent.trim(),
            pageNumber: currentPage,
          });
        }
        currentTitle = heading;
        currentContent = "";
        currentPage = page.pageNumber;
      } else {
        currentContent += `${line}\n`;
      }
    }
  }

  if (currentContent.trim()) {
    clauses.push({
      title: currentTitle,
      content: currentContent.trim(),
      pageNumber: currentPage,
    });
  }

  return clauses;
}

/**
 * Extracts specific material values such as liability caps, governing law, termination notice periods
 */
export function extractMaterialValues(text: string): {
  money: string[];
  days: string[];
  governingLaw: string | null;
} {
  const moneyRegex = /\$(?:\d{1,3}(?:,\d{3})*|\d+)(?:\.\d{2})?(?:\s*(?:million|billion|thousand|hundred))?/gi;
  const money = text.match(moneyRegex) || [];

  const daysRegex = /(?:[0-9]+|thirty|sixty|ninety|one hundred twenty)\s*(?:\([0-9]+\))?\s*days/gi;
  const days = text.match(daysRegex) || [];

  const govLawRegex = /laws of the State of ([A-Za-z\s]+?)(?:,|\.|\s+without|\s+and)/i;
  const govLawMatch = text.match(govLawRegex);
  const governingLaw = govLawMatch ? govLawMatch[1].trim() : null;

  return { money, days, governingLaw };
}

/**
 * Determines significance and extracts material change details between two clause versions
 */
export function evaluateClauseChange(
  title: string,
  contentA: string | null,
  contentB: string | null
): {
  significance: SignificanceLevel;
  materialChanges: MaterialChangeDetail[];
  substantiveChange: string;
} {
  const normTitle = normalizeText(title);
  const materialChanges: MaterialChangeDetail[] = [];

  // If added or removed
  if (!contentA && contentB) {
    const isMajor = /liability|indemn|secur|data protection|governing|terminat/i.test(normTitle);
    return {
      significance: isMajor ? "high" : "medium",
      materialChanges: [
        {
          category: "general",
          oldValue: null,
          newValue: "Clause newly introduced",
          description: `Added new clause "${title}".`,
        },
      ],
      substantiveChange: `Introduced new clause "${title}".`,
    };
  }

  if (contentA && !contentB) {
    const isMajor = /liability|indemn|secur|data protection|governing|terminat/i.test(normTitle);
    return {
      significance: isMajor ? "high" : "medium",
      materialChanges: [
        {
          category: "general",
          oldValue: "Previously active clause",
          newValue: null,
          description: `Removed clause "${title}".`,
        },
      ],
      substantiveChange: `Deleted clause "${title}".`,
    };
  }

  const textA = contentA || "";
  const textB = contentB || "";

  const valsA = extractMaterialValues(textA);
  const valsB = extractMaterialValues(textB);

  // Check Liability Cap
  if (/liability|damage|cap/i.test(normTitle) || valsA.money.length > 0 || valsB.money.length > 0) {
    const moneyA = valsA.money.join(", ");
    const moneyB = valsB.money.join(", ");
    if (moneyA !== moneyB && (moneyA || moneyB)) {
      materialChanges.push({
        category: "liability_cap",
        oldValue: moneyA || "None stated",
        newValue: moneyB || "None stated",
        description: `Liability cap changed from ${moneyA || "unspecified"} to ${moneyB || "unspecified"}.`,
      });
    }
  }

  // Check Governing Law
  if (/governing law|jurisdiction/i.test(normTitle) || valsA.governingLaw || valsB.governingLaw) {
    if (valsA.governingLaw && valsB.governingLaw && valsA.governingLaw !== valsB.governingLaw) {
      materialChanges.push({
        category: "governing_law",
        oldValue: valsA.governingLaw,
        newValue: valsB.governingLaw,
        description: `Governing law jurisdiction changed from State of ${valsA.governingLaw} to State of ${valsB.governingLaw}.`,
      });
    }
  }

  // Check Termination Period
  if (/terminat|notice|period/i.test(normTitle) || valsA.days.length > 0 || valsB.days.length > 0) {
    const daysA = valsA.days.join(", ");
    const daysB = valsB.days.join(", ");
    if (daysA !== daysB && (daysA || daysB)) {
      materialChanges.push({
        category: "termination_period",
        oldValue: daysA || "Unspecified",
        newValue: daysB || "Unspecified",
        description: `Notice/termination period changed from ${daysA || "unspecified"} to ${daysB || "unspecified"}.`,
      });
    }
  }

  // Determine significance level
  let significance: SignificanceLevel = "low";
  if (
    materialChanges.some(
      (m) => m.category === "liability_cap" || m.category === "governing_law"
    ) ||
    /limitation of liability|indemnification|governing law/i.test(normTitle)
  ) {
    significance = "high";
  } else if (
    materialChanges.some((m) => m.category === "termination_period") ||
    /term and termination|payment terms|fees/i.test(normTitle)
  ) {
    significance = "medium";
  } else if (materialChanges.length > 0) {
    significance = "medium";
  }

  // Build plain-language explanation
  let substantiveChange = "";
  if (materialChanges.length > 0) {
    substantiveChange = materialChanges.map((m) => m.description).join(" ");
  } else {
    substantiveChange = `Modified language in ${title}.`;
  }

  return { significance, materialChanges, substantiveChange };
}

/**
 * Compares two legal contracts clause by clause
 */
export function compareContracts(
  docA: DocumentComparisonInput,
  docB: DocumentComparisonInput
): ComparisonReport {
  const clausesA = extractClauses(docA);
  const clausesB = extractClauses(docB);

  const mapA = new Map<string, ExtractedClause>();
  for (const c of clausesA) {
    mapA.set(normalizeText(c.title), c);
  }

  const mapB = new Map<string, ExtractedClause>();
  for (const c of clausesB) {
    mapB.set(normalizeText(c.title), c);
  }

  const allTitles = new Set<string>();
  for (const c of clausesA) allTitles.add(c.title);
  for (const c of clausesB) allTitles.add(c.title);

  const differences: ClauseDifference[] = [];
  let diffCounter = 0;

  for (const title of allTitles) {
    const norm = normalizeText(title);
    const clauseA = mapA.get(norm) || null;
    const clauseB = mapB.get(norm) || null;

    if (!clauseA && clauseB) {
      // Added in B
      const evalResult = evaluateClauseChange(title, null, clauseB.content);
      differences.push({
        id: `diff_${diffCounter++}`,
        clauseTitle: title,
        type: "added",
        significance: evalResult.significance,
        docAClause: null,
        docBClause: { content: clauseB.content, pageNumber: clauseB.pageNumber },
        substantiveChange: evalResult.substantiveChange,
        materialChanges: evalResult.materialChanges,
        wordDiffs: diffWordsWithSpace("", clauseB.content),
      });
    } else if (clauseA && !clauseB) {
      // Removed in B
      const evalResult = evaluateClauseChange(title, clauseA.content, null);
      differences.push({
        id: `diff_${diffCounter++}`,
        clauseTitle: title,
        type: "removed",
        significance: evalResult.significance,
        docAClause: { content: clauseA.content, pageNumber: clauseA.pageNumber },
        docBClause: null,
        substantiveChange: evalResult.substantiveChange,
        materialChanges: evalResult.materialChanges,
        wordDiffs: diffWordsWithSpace(clauseA.content, ""),
      });
    } else if (clauseA && clauseB) {
      // Check if modified
      const normA = normalizeText(clauseA.content);
      const normB = normalizeText(clauseB.content);

      if (normA !== normB) {
        const evalResult = evaluateClauseChange(title, clauseA.content, clauseB.content);
        differences.push({
          id: `diff_${diffCounter++}`,
          clauseTitle: title,
          type: "modified",
          significance: evalResult.significance,
          docAClause: { content: clauseA.content, pageNumber: clauseA.pageNumber },
          docBClause: { content: clauseB.content, pageNumber: clauseB.pageNumber },
          substantiveChange: evalResult.substantiveChange,
          materialChanges: evalResult.materialChanges,
          wordDiffs: diffWordsWithSpace(clauseA.content, clauseB.content),
        });
      }
    }
  }

  // Sort differences: High significance first, then Medium, then Low
  const priorityOrder: Record<SignificanceLevel, number> = { high: 0, medium: 1, low: 2 };
  differences.sort((a, b) => priorityOrder[a.significance] - priorityOrder[b.significance]);

  // Statistics
  const addedCount = differences.filter((d) => d.type === "added").length;
  const removedCount = differences.filter((d) => d.type === "removed").length;
  const modifiedCount = differences.filter((d) => d.type === "modified").length;
  const highSignificanceCount = differences.filter((d) => d.significance === "high").length;
  const mediumSignificanceCount = differences.filter((d) => d.significance === "medium").length;
  const lowSignificanceCount = differences.filter((d) => d.significance === "low").length;

  // Build substantive changes summary
  const summaryPoints: string[] = [];
  if (differences.length === 0) {
    summaryPoints.push("Both contract versions are substantively identical with no material differences detected.");
  } else {
    for (const diff of differences) {
      if (diff.significance === "high" || diff.significance === "medium") {
        summaryPoints.push(`- **${diff.clauseTitle}** (${diff.significance.toUpperCase()}): ${diff.substantiveChange}`);
      }
    }
  }

  const executiveSummary = summaryPoints.length > 0
    ? `Comparison of **${docA.name}** and **${docB.name}** identified ${differences.length} substantive change(s):\n\n${summaryPoints.join("\n")}`
    : `No substantive changes detected between ${docA.name} and ${docB.name}.`;

  return {
    docAId: docA.id,
    docAName: docA.name,
    docBId: docB.id,
    docBName: docB.name,
    summary: executiveSummary,
    stats: {
      totalClausesA: clausesA.length,
      totalClausesB: clausesB.length,
      addedCount,
      removedCount,
      modifiedCount,
      highSignificanceCount,
      mediumSignificanceCount,
      lowSignificanceCount,
    },
    differences,
  };
}
