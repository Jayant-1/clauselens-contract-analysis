import {
  PlaybookType,
  RiskSeverity,
  RiskCategory,
  RiskFinding,
  MissingClauseFinding,
  ContractHealthAudit,
  DocumentPageDetail,
} from "@/types";

export interface RiskEngineInput {
  documentId: string;
  documentName: string;
  extractedText: string;
  pages?: DocumentPageDetail[];
}

const CATEGORY_LABELS: Record<RiskCategory, string> = {
  liability: "Limitation of Liability",
  indemnity: "Indemnification & Defense",
  termination: "Termination & Renewal",
  data_privacy: "Data Privacy & Breach SLA",
  ip: "Intellectual Property Rights",
  confidentiality: "Confidentiality & Non-Disclosure",
  governing_law: "Governing Law & Dispute Resolution",
  warranties: "Warranties & Service Levels",
};

/**
 * Helper to find the page number for a given matching snippet
 */
function findPageForSnippet(pages: DocumentPageDetail[] | undefined, snippet: string): number {
  if (!pages || pages.length === 0) return 1;
  const cleanSnippet = snippet.slice(0, 80).toLowerCase().replace(/\s+/g, " ");

  for (const page of pages) {
    const pageText = page.text.toLowerCase().replace(/\s+/g, " ");
    if (pageText.includes(cleanSnippet)) {
      return page.pageNumber;
    }
  }
  return 1;
}

/**
 * Evaluates contract text against the 8 core legal risk vectors
 */
export function auditContractRisk(
  input: RiskEngineInput,
  playbook: PlaybookType = "balanced"
): ContractHealthAudit {
  const text = input.extractedText || "";
  const pages = input.pages || [];
  const findings: RiskFinding[] = [];
  let findingCounter = 1;

  const addFinding = (
    category: RiskCategory,
    title: string,
    severity: RiskSeverity,
    quote: string,
    analysis: string,
    businessImpact: string,
    recommendedAction: string,
    suggestedFallbackClause?: string
  ) => {
    const pageNumber = findPageForSnippet(pages, quote);
    findings.push({
      id: `risk_${input.documentId}_${findingCounter++}`,
      category,
      categoryLabel: CATEGORY_LABELS[category],
      title,
      severity,
      quote: quote.trim(),
      pageNumber,
      analysis,
      businessImpact,
      recommendedAction,
      suggestedFallbackClause,
    });
  };

  // =========================================================================
  // 1. LIMITATION OF LIABILITY
  // =========================================================================
  const uncappedMatch = text.match(
    /(?:shall\s+not\s+apply\s+to|excluding|without\s+limitation)[^.]*?(?:indemnification|confidentiality|data\s+breach|ipr?|infringement)[^.]*?(?:unlimited|no\s+cap|no\s+limitation)/i
  );
  const capMatch = text.match(
    /(?:aggregate\s+liability|total\s+liability|maximum\s+liability)[^.]*?(?:exceed|equal\s+to|limited\s+to)[^.]*?(\$[0-9,]+|\b\d+\s*months?\s+fees?|\bfees\s+paid[^.]*?prior\s+\d+\s+months)/i
  );
  const consequentialWaiver = text.match(
    /(?:neither\s+party|in\s+no\s+event)[^.]*?shall\s+be\s+liable[^.]*?(?:indirect|consequential|incidental|punitive|special)\s+damages/i
  );

  if (!capMatch && !uncappedMatch) {
    addFinding(
      "liability",
      "Missing Aggregate Liability Cap",
      playbook === "enterprise-buyer" ? "high" : "critical",
      "No clear aggregate liability cap found in agreement text.",
      "The agreement does not express a finite monetary ceiling for contract claims, creating unquantified balance sheet exposure.",
      "Exposure to uncapped general damages in the event of contractual breach or performance dispute.",
      "Insert a standard aggregate liability cap equal to fees paid in the prior 12 months.",
      "IN NO EVENT SHALL EITHER PARTY'S AGGREGATE LIABILITY ARISING OUT OF OR RELATED TO THIS AGREEMENT EXCEED THE TOTAL AMOUNTS ACTUALLY PAID OR PAYABLE BY CUSTOMER HEREUNDER IN THE TWELVE (12) MONTHS PRECEDING THE INCIDENT GIVING RISE TO LIABILITY."
    );
  } else if (capMatch) {
    const capText = capMatch[0];
    const isFeesPaid12Months = /12\s*months|twelve\s*months/i.test(capText);

    if (playbook === "enterprise-buyer" && !isFeesPaid12Months && /\$([0-9,]+)/.test(capText)) {
      addFinding(
        "liability",
        "Fixed Dollar Liability Ceiling",
        "medium",
        capText,
        `Contract sets a fixed dollar cap (${capMatch[1]}) rather than a floating multiple of contract fees.`,
        "Fixed dollar amounts may become disproportionately low or high as deal volume scales over time.",
        "Align cap to a floating 12-month trailing revenue/fee multiple.",
        "EACH PARTY'S TOTAL AGGREGATE LIABILITY UNDER THIS AGREEMENT SHALL BE STRICTLY LIMITED TO THE FEES PAID IN THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE CLAIM."
      );
    } else {
      addFinding(
        "liability",
        "Standard Fee-Based Liability Cap",
        "compliant",
        capText,
        "Liability is clearly capped against trailing contract fees.",
        "Establishes a predictable, market-standard commercial ceiling for ordinary breach of contract.",
        "Maintain current language; verify super-caps are mutually bounded."
      );
    }
  }

  if (consequentialWaiver) {
    addFinding(
      "liability",
      "Mutual Consequential Damages Waiver",
      "compliant",
      consequentialWaiver[0],
      "Both parties waive indirect, special, consequential, and punitive damages.",
      "Prevents speculative lost profit claims and protects operational solvency in disputes.",
      "Maintain mutual waiver."
    );
  }

  // =========================================================================
  // 2. INDEMNIFICATION & DEFENSE
  // =========================================================================
  const vendorIndemnity = text.match(
    /(?:vendor|provider|licensor|supplier|contractor)\s+shall\s+(?:defend|indemnify|hold\s+harmless)[^.]*?(?:customer|client)[^.]*?(?:infringement|misappropriation|third[- ]party\s+claim)/i
  );
  const customerIndemnity = text.match(
    /(?:customer|client)\s+shall\s+(?:defend|indemnify|hold\s+harmless)[^.]*?(?:vendor|provider|licensor)/i
  );

  if (customerIndemnity && !vendorIndemnity) {
    addFinding(
      "indemnity",
      "Unilateral Asymmetric Indemnification",
      "critical",
      customerIndemnity[0],
      "The agreement imposes indemnification duties solely on the customer while offering no reciprocal IP indemnity from the vendor.",
      "Customer assumes full litigation defense costs for third-party claims without protection if the vendor's software infringes IP.",
      "Insist on mutual indemnification or standard vendor IP defense commitment.",
      "PROVIDER SHALL DEFEND CUSTOMER AGAINST ANY THIRD-PARTY CLAIM ALLEGING THAT CUSTOMER'S USE OF THE SERVICE INFRINGES ANY VALID PATENT, COPYRIGHT, OR TRADE SECRET, AND INDEMNIFY CUSTOMER FOR RESULTING DAMAGES FINALLY AWARDED."
    );
  } else if (vendorIndemnity && customerIndemnity) {
    addFinding(
      "indemnity",
      "Mutual Indemnification Provisions",
      "compliant",
      vendorIndemnity[0],
      "Agreement contains balanced indemnification allocations for both provider IP and customer data.",
      "Distributes third-party liability equitably based on each party's operational responsibilities.",
      "Verify defense notification timelines (e.g. prompt written notice) and control of settlement."
    );
  } else if (vendorIndemnity && !customerIndemnity) {
    addFinding(
      "indemnity",
      "Vendor IP Indemnity Present",
      playbook === "saas-vendor" ? "medium" : "compliant",
      vendorIndemnity[0],
      "Vendor defends customer against third-party IP infringement claims.",
      playbook === "saas-vendor"
        ? "Vendor is indemnifying without reciprocal customer indemnity for unlawful data upload."
        : "Standard buyer protection against copyright/patent infringement claims.",
      playbook === "saas-vendor"
        ? "Add customer indemnity for customer data violations."
        : "Ensure no unfair settlement or modification exclusions."
    );
  }

  // =========================================================================
  // 3. TERMINATION & RENEWAL TRAPS
  // =========================================================================
  const autoRenewalMatch = text.match(
    /(?:automatically\s+renew|auto[- ]renew|evergreen)[^.]*?(?:unless|prior\s+to)[^.]*?((?:[0-9]+|thirty|sixty|ninety)\s*days?)/i
  );
  const convenienceTermMatch = text.match(
    /(?:terminate|termination)\s+for\s+convenience|without\s+cause[^.]*?(?:written\s+notice\s+of|upon)\s*([0-9]+\s*days?)/i
  );

  if (autoRenewalMatch) {
    const noticeDays = autoRenewalMatch[1];
    const isShortNotice = /10|15|fifteen/i.test(noticeDays);
    addFinding(
      "termination",
      "Automatic Contract Renewal Mechanism",
      isShortNotice ? "critical" : "medium",
      autoRenewalMatch[0],
      `Contract automatically renews unless non-renewal notice is delivered ${noticeDays} in advance.`,
      "Risk of unwanted multi-year financial lock-in if renewal reminder deadlines are missed by internal teams.",
      "Require at least 30-60 days non-renewal notice or change to explicit opt-in renewal.",
      "THIS AGREEMENT SHALL RENEW FOR SUCCESSIVE ONE (1) YEAR TERMS ONLY UPON MUTUAL WRITTEN AGREEMENT OF THE PARTIES EXECUTED AT LEAST THIRTY (30) DAYS PRIOR TO THE EXPIRATION OF THE THEN-CURRENT TERM."
    );
  }

  if (convenienceTermMatch) {
    addFinding(
      "termination",
      "Termination for Convenience Permitted",
      "compliant",
      convenienceTermMatch[0],
      "Either party may terminate the contract without cause upon standard advance written notice.",
      "Provides strategic off-ramp if business requirements shift or vendor performance degrades.",
      "Ensure pro-rata refund of prepaid unearned fees upon convenience termination."
    );
  } else {
    addFinding(
      "termination",
      "No Termination for Convenience",
      playbook === "enterprise-buyer" ? "high" : "low",
      "Agreement permits termination only for cause / material breach.",
      "Buyer remains financially bound for the full contract term even if product utility declines.",
      "Incorporate 30-day or 60-day termination for convenience with refund of prepaid unutilized fees.",
      "CUSTOMER MAY TERMINATE THIS AGREEMENT OR ANY ORDER FORM FOR CONVENIENCE AT ANY TIME UPON SIXTY (60) DAYS' PRIOR WRITTEN NOTICE TO VENDOR."
    );
  }

  // =========================================================================
  // 4. DATA PRIVACY & BREACH SLA
  // =========================================================================
  const breachSlaMatch = text.match(
    /(?:security\s+incident|data\s+breach|unauthorized\s+access)[^.]*?(?:notify|notification)[^.]*?(?:within\s+)?(\d+\s*(?:hours?|days?)|without\s+undue\s+delay|promptly)/i
  );

  if (breachSlaMatch) {
    const breachWindow = breachSlaMatch[1];
    const isStrict = /24\s*hours?|48\s*hours?|72\s*hours?/i.test(breachWindow);

    if (isStrict) {
      addFinding(
        "data_privacy",
        "Defined Security Breach Notice Timeline",
        "compliant",
        breachSlaMatch[0],
        `Vendor commits to notifying of suspected security breaches within ${breachWindow}.`,
        "Enables compliance with statutory reporting windows under GDPR (72h) and state breach laws.",
        "Ensure incident investigation cooperation obligations are included."
      );
    } else {
      addFinding(
        "data_privacy",
        "Ambiguous Security Incident SLA",
        playbook === "enterprise-buyer" ? "high" : "medium",
        breachSlaMatch[0],
        `Notice timeline is qualitative ('${breachWindow}') rather than an enforceable hour-bound commitment.`,
        "Delayed breach reporting can trigger severe regulatory fines and reputational damages for the data controller.",
        "Require written notice within twenty-four (24) or forty-eight (48) hours of confirmed breach.",
        "IN THE EVENT OF ANY CONFIRMED OR SUSPECTED SECURITY BREACH INVOLVING CUSTOMER DATA, VENDOR SHALL NOTIFY CUSTOMER IN WRITING WITHIN TWENTY-FOUR (24) HOURS OF DISCOVERY."
      );
    }
  } else {
    addFinding(
      "data_privacy",
      "Missing Security Breach SLA",
      "critical",
      "No breach notification timeline found in agreement.",
      "Complete omission of incident response and breach notification obligations.",
      "Exposes customer to catastrophic GDPR/HIPAA regulatory penalties if vendor experiences a silent compromise.",
      "Insert standard enterprise 48-hour data breach notification and mitigation covenant.",
      "VENDOR SHALL NOTIFY CUSTOMER WITHOUT UNDUE DELAY AND IN NO EVENT LATER THAN FORTY-EIGHT (48) HOURS AFTER BECOMING AWARE OF A PERSONAL DATA BREACH."
    );
  }

  // =========================================================================
  // 5. INTELLECTUAL PROPERTY & WORK PRODUCT
  // =========================================================================
  const ipOwnershipMatch = text.match(
    /(?:customer|client)\s+(?:owns|retains\s+all\s+right|shall\s+own)[^.]*?(?:customer\s+data|confidential\s+information|ip)/i
  );
  const broadVendorLicense = text.match(
    /(?:irrevocable|perpetual|royalty[- ]free|worldwide)\s+license[^.]*?(?:customer\s+data|use\s+for\s+any\s+purpose|training|ai\s+models)/i
  );

  if (broadVendorLicense) {
    addFinding(
      "ip",
      "Excessive License to Customer Data / IP",
      "critical",
      broadVendorLicense[0],
      "Agreement grants vendor an irrevocable or perpetual license to use customer data beyond providing the core service.",
      "Customer proprietary information or customer confidential data could be incorporated into vendor models or marketing.",
      "Limit data license strictly to the purpose of operating the services during the contract term.",
      "CUSTOMER GRANTS VENDOR A LIMITED, NON-EXCLUSIVE, NON-TRANSFERABLE LICENSE TO HOST AND TRANSMIT CUSTOMER DATA SOLELY AS NECESSARY TO PROVIDE THE SERVICES DURING THE TERM."
    );
  }

  if (ipOwnershipMatch) {
    addFinding(
      "ip",
      "Customer Data Ownership Affirmed",
      "compliant",
      ipOwnershipMatch[0],
      "Customer explicitly retains all rights, title, and interest in and to customer data.",
      "Safeguards company IP, client assets, and proprietary trade secrets from vendor claims.",
      "Retain current reservation of rights clause."
    );
  }

  // =========================================================================
  // 6. CONFIDENTIALITY DURATION & SURVIVAL
  // =========================================================================
  const confDurationMatch = text.match(
    /(?:confidentiality|nondisclosure|confidential\s+information)[^.]*?(?:survive|period\s+of|term\s+of)[^.]*?((?:[0-9]+|one|two|three|five)\s*years?)/i
  );
  const tradeSecretException = text.match(
    /(?:trade\s+secrets|personal\s+data)[^.]*?(?:survive\s+in\s+perpetuity|perpetual|so\s+long\s+as)/i
  );

  if (confDurationMatch) {
    const yearsText = confDurationMatch[1];
    const isShort = /1|one|2|two/i.test(yearsText);

    if (isShort && !tradeSecretException) {
      addFinding(
        "confidentiality",
        "Short Confidentiality Survival Window",
        "high",
        confDurationMatch[0],
        `Confidentiality obligations terminate after only ${yearsText}, risking premature trade secret forfeiture.`,
        "Proprietary technical specifications and customer pricing could lose protection while still commercially sensitive.",
        "Extend confidentiality to 3–5 years and ensure trade secrets survive perpetually.",
        "CONFIDENTIALITY OBLIGATIONS SHALL SURVIVE FOR FIVE (5) YEARS FROM TERMINATION; PROVIDED THAT TRADE SECRETS SHALL REMAIN CONFIDENTIAL IN PERPETUITY."
      );
    } else {
      addFinding(
        "confidentiality",
        "Standard Confidentiality Survival",
        "compliant",
        confDurationMatch[0],
        `Confidentiality survives for ${yearsText}, consistent with standard commercial agreements.`,
        "Ensures adequate protection for disclosed business information and proprietary workflows.",
        "Confirm that trade secrets and customer data enjoy perpetual protection."
      );
    }
  }

  // =========================================================================
  // 7. GOVERNING LAW & FORUM
  // =========================================================================
  const govLawMatch = text.match(
    /(?:governed\s+by|construed\s+in\s+accordance\s+with)[^.]*?(?:laws\s+of\s+(?:the\s+)?State\s+of\s+([A-Za-z\s]+?)|laws\s+of\s+([A-Za-z\s]+?))(?:,|\.|\s+without|\s+and)/i
  );
  const arbitrationMatch = text.match(
    /(?:binding\s+arbitration|american\s+arbitration\s+association|jams|arbitrator)[^.]*?(?:exclusive|disputes?)/i
  );

  if (govLawMatch) {
    const jurisdiction = (govLawMatch[1] || govLawMatch[2] || "").trim();
    const isStandardState = /delaware|new\s*york|california|england/i.test(jurisdiction);

    if (isStandardState) {
      addFinding(
        "governing_law",
        `Standard Commercial Forum (${jurisdiction})`,
        "compliant",
        govLawMatch[0],
        `Governed by the laws of ${jurisdiction}, a recognized, predictable commercial venue.`,
        "Established body of corporate and commercial precedent reduces litigation uncertainty.",
        "Maintain current jurisdiction selection."
      );
    } else {
      addFinding(
        "governing_law",
        `Non-Standard Governing Forum (${jurisdiction})`,
        "medium",
        govLawMatch[0],
        `Agreement specifies ${jurisdiction} as governing jurisdiction rather than standard commercial forums.`,
        "May require retaining local counsel and litigating in unfamiliar courts if disputes arise.",
        "Propose Delaware or New York law with mutual waiver of jury trial.",
        "THIS AGREEMENT SHALL BE GOVERNED BY AND CONSTRUED UNDER THE LAWS OF THE STATE OF DELAWARE, WITHOUT REGARD TO CONFLICTS OF LAW PRINCIPLES."
      );
    }
  }

  if (arbitrationMatch) {
    addFinding(
      "governing_law",
      "Mandatory Binding Arbitration",
      "medium",
      arbitrationMatch[0],
      "All disputes must be resolved through binding arbitration, waiving access to public court systems.",
      "Arbitration can be faster but limits appellate review and often carries high administrative filing fees.",
      "Ensure preliminary injunctive relief for IP/confidentiality breaches can still be sought in court.",
      "NOTWITHSTANDING ARBITRATION PROVISIONS, EITHER PARTY MAY SEEK PRELIMINARY EQUITABLE OR INJUNCTIVE RELIEF IN ANY COURT OF COMPETENT JURISDICTION."
    );
  }

  // =========================================================================
  // 8. WARRANTIES & DISCLAIMERS
  // =========================================================================
  const asIsDisclaimer = text.match(
    /(?:as[- ]is|with\s+all\s+faults)[^.]*?(?:disclaims?\s+all\s+warranties|no\s+warranty)/i
  );
  const uptimeSlaMatch = text.match(
    /(?:99\.\d+%\s+uptime|availability\s+sla|service\s+level\s+agreement)/i
  );

  if (asIsDisclaimer && !uptimeSlaMatch) {
    addFinding(
      "warranties",
      "Broad As-Is Disclaimer with Zero Uptime SLA",
      playbook === "enterprise-buyer" ? "high" : "medium",
      asIsDisclaimer[0],
      "Vendor provides software entirely 'AS-IS' without warranty of functionality or availability uptime.",
      "No legal recourse if the system experiences continuous downtime or fails to perform basic operations.",
      "Incorporate standard 99.9% availability SLA with pro-rata service credits for downtime.",
      "VENDOR WARRANTS THAT THE CLOUD SERVICE WILL ACHIEVE 99.9% MONTHLY AVAILABILITY AND MATERIALLY CONFORM TO PUBLISHED SPECIFICATIONS."
    );
  } else if (uptimeSlaMatch) {
    addFinding(
      "warranties",
      "Service Level Uptime Commitment Included",
      "compliant",
      uptimeSlaMatch[0],
      "Agreement contains measurable uptime availability warranty.",
      "Protects operational dependencies with quantifiable service availability targets.",
      "Confirm remedy structure includes service credits and termination rights for chronic outages."
    );
  }

  // =========================================================================
  // 9. MISSING CLAUSE GAP DETECTION
  // =========================================================================
  const missingClauses: MissingClauseFinding[] = [];

  if (!consequentialWaiver) {
    missingClauses.push({
      id: "gap_consequential_waiver",
      title: "Missing Consequential Damages Waiver",
      category: "liability",
      severity: "high",
      description: "No mutual waiver of indirect, punitive, or consequential damages was detected.",
      riskExplanation:
        "Either party could face claims for speculative loss of anticipated profits or business interruptions.",
      standardMarketLanguage:
        "NEITHER PARTY SHALL BE LIABLE TO THE OTHER FOR ANY INDIRECT, SPECIAL, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM THIS AGREEMENT.",
    });
  }

  if (!vendorIndemnity) {
    missingClauses.push({
      id: "gap_ip_indemnity",
      title: "Missing Vendor IP Infringement Indemnity",
      category: "indemnity",
      severity: "critical",
      description: "No commitment from vendor to defend customer against third-party patent or copyright claims.",
      riskExplanation:
        "If a third party sues customer for using the vendor's application, customer must pay legal defense and damage awards entirely alone.",
      standardMarketLanguage:
        "PROVIDER SHALL DEFEND AND INDEMNIFY CUSTOMER AGAINST ANY THIRD-PARTY CLAIM ALLEGING THAT THE PLATFORM INFRINGES ANY THIRD-PARTY INTELLECTUAL PROPERTY RIGHT.",
    });
  }

  if (!breachSlaMatch) {
    missingClauses.push({
      id: "gap_breach_sla",
      title: "Missing Data Incident Notification SLA",
      category: "data_privacy",
      severity: "critical",
      description: "Agreement contains no defined timeline for reporting cybersecurity breaches or data leaks.",
      riskExplanation:
        "Prevents customer from meeting mandatory 72-hour reporting windows under global privacy regulations.",
      standardMarketLanguage:
        "VENDOR SHALL PROMPTLY, AND IN NO EVENT LATER THAN FORTY-EIGHT (48) HOURS FOLLOWING DISCOVERY, NOTIFY CUSTOMER IN WRITING OF ANY CONFIRMED SECURITY INCIDENT.",
    });
  }

  const forceMajeureMatch = /force\s+majeure|acts\s+of\s+god|war|pandemic|natural\s+disaster/i.test(text);
  if (!forceMajeureMatch) {
    missingClauses.push({
      id: "gap_force_majeure",
      title: "Missing Force Majeure Protection",
      category: "termination",
      severity: "low",
      description: "No excuse of performance for catastrophic events outside reasonable control.",
      riskExplanation:
        "Parties may be held in breach of contract during natural disasters, war, or utility blackouts.",
      standardMarketLanguage:
        "NEITHER PARTY SHALL BE LIABLE FOR DELAYS OR FAILURE IN PERFORMANCE RESULTING FROM ACTS BEYOND REASONABLE CONTROL, INCLUDING ACTS OF GOD, WAR, OR UTILITY FAILURES.",
    });
  }

  // =========================================================================
  // 10. HEALTH SCORE COMPUTATION (0 - 100)
  // =========================================================================
  let score = 100;

  // Deductions based on Playbook
  const severityWeights =
    playbook === "enterprise-buyer"
      ? { critical: 24, high: 14, medium: 7, low: 2, missingCritical: 15, missingHigh: 10 }
      : playbook === "saas-vendor"
      ? { critical: 18, high: 12, medium: 6, low: 2, missingCritical: 12, missingHigh: 8 }
      : { critical: 20, high: 12, medium: 6, low: 2, missingCritical: 12, missingHigh: 8 };

  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;
  let compliantCount = 0;

  for (const f of findings) {
    if (f.severity === "critical") {
      criticalCount++;
      score -= severityWeights.critical;
    } else if (f.severity === "high") {
      highCount++;
      score -= severityWeights.high;
    } else if (f.severity === "medium") {
      mediumCount++;
      score -= severityWeights.medium;
    } else if (f.severity === "low") {
      lowCount++;
      score -= severityWeights.low;
    } else if (f.severity === "compliant") {
      compliantCount++;
      score += 2; // small bonus for compliant clauses
    }
  }

  for (const m of missingClauses) {
    if (m.severity === "critical") {
      score -= severityWeights.missingCritical;
    } else if (m.severity === "high") {
      score -= severityWeights.missingHigh;
    }
  }

  score = Math.max(12, Math.min(100, Math.round(score)));

  let grade: "A" | "B" | "C" | "D" = "A";
  let gradeDescription = "Enterprise Ready — Fiduciary standards met";

  if (score < 50 || criticalCount >= 2) {
    grade = "D";
    gradeDescription = "Critical Risk — Contains deal-breaking liabilities";
  } else if (score < 70 || criticalCount === 1) {
    grade = "C";
    gradeDescription = "Elevated Risk — Substantive renegotiation required";
  } else if (score < 85) {
    grade = "B";
    gradeDescription = "Moderate Risk — Standard commercial adjustments recommended";
  }

  const summary = `Evaluated under ${
    playbook === "enterprise-buyer"
      ? "Enterprise Buyer"
      : playbook === "saas-vendor"
      ? "SaaS Vendor"
      : "Balanced Commercial"
  } playbook. Detected ${criticalCount} critical flag(s), ${highCount} high risk factor(s), and ${
    missingClauses.length
  } omitted standard legal protection(s). Overall contract health scored at ${score}/100 (Grade ${grade}).`;

  return {
    documentId: input.documentId,
    documentName: input.documentName,
    playbook,
    overallScore: score,
    grade,
    gradeDescription,
    summary,
    findings,
    missingClauses,
    stats: {
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      compliantCount,
      missingCount: missingClauses.length,
    },
  };
}
