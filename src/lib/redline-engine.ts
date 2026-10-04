import { diffWordsWithSpace } from "diff";
import {
  RedlinePerspective,
  RiskCategory,
  DiffWordItem,
  RedlineProposal,
} from "@/types";

export interface RedlineRequest {
  documentName?: string;
  clauseTitle: string;
  category: RiskCategory;
  originalText: string;
  perspective: RedlinePerspective;
}

const FALLBACK_CLAUSES: Record<
  RiskCategory,
  Record<
    RedlinePerspective,
    {
      text: string;
      rationale: string[];
    }
  >
> = {
  liability: {
    buyer: {
      text: "IN NO EVENT SHALL CUSTOMER'S LIABILITY EXCEED FEES PAID HEREUNDER. VENDOR'S TOTAL AGGREGATE LIABILITY SHALL BE CAPPED AT TWENTY-FOUR (24) MONTHS OF FEES PAID OR $1,000,000, WHICHEVER IS GREATER; PROVIDED THAT VENDOR'S INDEMNIFICATION, CONFIDENTIALITY, AND DATA SECURITY BREACH OBLIGATIONS SHALL REMAIN FULLY UNCAPPED.",
      rationale: [
        "Protects buyer from catastrophic balance-sheet exposure by placing an asymmetrical higher cap on the vendor.",
        "Ensures critical risk vectors (confidentiality, IP indemnity, cybersecurity breach) remain uncapped.",
        "Prevents vendor from escaping liability if data loss or trade secret disclosure occurs.",
      ],
    },
    seller: {
      text: "EACH PARTY'S ENTIRE AGGREGATE LIABILITY ARISING UNDER OR IN CONNECTION WITH THIS AGREEMENT SHALL BE STRICTLY LIMITED TO THE AMOUNTS ACTUALLY PAID BY CUSTOMER TO VENDOR IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM. IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES.",
      rationale: [
        "Establishes a firm 12-month trailing revenue ceiling on all vendor risk.",
        "Strict mutual exclusion of indirect and consequential damages prevents speculative lost-profit claims.",
        "Avoids open-ended super-caps that could compromise vendor solvency or insurance underwriting.",
      ],
    },
    balanced: {
      text: "EXCEPT FOR GROSS NEGLIGENCE, WILLFUL MISCONDUCT, OR INDEMNIFICATION OBLIGATIONS UNDER SECTION 8, EACH PARTY'S TOTAL AGGREGATE LIABILITY UNDER THIS AGREEMENT SHALL NOT EXCEED THE TOTAL FEES PAID OR PAYABLE IN THE TWELVE (12) MONTHS PRECEDING THE INCIDENT GIVING RISE TO LIABILITY. NEITHER PARTY SHALL BE LIABLE FOR INDIRECT OR CONSEQUENTIAL DAMAGES.",
      rationale: [
        "Market-standard compromise adopted by Fortune 500 legal teams.",
        "Exempts intentional misconduct and third-party indemnity while maintaining an equitable 12-month fee ceiling for standard operational breaches.",
        "Mutual waiver of consequential damages preserves commercial fairness.",
      ],
    },
  },
  indemnity: {
    buyer: {
      text: "VENDOR SHALL DEFEND, INDEMNIFY, AND HOLD HARMLESS CUSTOMER, ITS DIRECTORS, OFFICERS, AND EMPLOYEES FROM AND AGAINST ANY AND ALL THIRD-PARTY CLAIMS, DAMAGES, LOSSES, AND REASONABLE LEGAL FEES ARISING OUT OF OR RESULTING FROM: (A) ANY ALLEGED INFRINGEMENT OR MISAPPROPRIATION OF THIRD-PARTY INTELLECTUAL PROPERTY RIGHTS; (B) VENDOR'S BREACH OF CONFIDENTIALITY OR DATA SECURITY OBLIGATIONS; OR (C) VENDOR'S GROSS NEGLIGENCE OR WILLFUL MISCONDUCT.",
      rationale: [
        "Comprehensive defense protection covering IP infringement, data breaches, and gross negligence.",
        "Protects customer personnel and affiliates from being named in vendor-related litigation.",
        "Shifts all defense costs and final judgment awards entirely to the service provider.",
      ],
    },
    seller: {
      text: "VENDOR SHALL DEFEND CUSTOMER AGAINST ANY THIRD-PARTY CLAIM ALLEGING THAT CUSTOMER'S AUTHORIZED USE OF THE SERVICE DIRECTLY INFRINGES A VALID U.S. PATENT OR COPYRIGHT, PROVIDED CUSTOMER: (I) GIVES PROMPT WRITTEN NOTICE; (II) GRANTS VENDOR SOLE CONTROL OF DEFENSE AND SETTLEMENT; AND (III) PROVIDES REASONABLE COOPERATION. VENDOR SHALL HAVE NO LIABILITY FOR CLAIMS RESULTING FROM MODIFICATIONS, COMBINATIONS, OR CUSTOMER DATA.",
      rationale: [
        "Limits indemnity strictly to direct U.S. patent/copyright infringement.",
        "Requires prompt written notice and grants vendor sole authority over settlement terms.",
        "Carves out customer modifications, third-party software combinations, and customer-uploaded data.",
      ],
    },
    balanced: {
      text: "PROVIDER SHALL DEFEND AND INDEMNIFY CUSTOMER AGAINST THIRD-PARTY CLAIMS THAT THE CORE SERVICES INFRINGE INTELLECTUAL PROPERTY RIGHTS. RECIPROCALLY, CUSTOMER SHALL DEFEND AND INDEMNIFY PROVIDER AGAINST THIRD-PARTY CLAIMS ARISING FROM CUSTOMER DATA INFRINGING THIRD-PARTY RIGHTS OR VIOLATING APPLICABLE LAW. EACH INDEMNIFIED PARTY SHALL PROVIDE PROMPT NOTICE AND REASONABLE DEFENSE COOPERATION.",
      rationale: [
        "Equitable two-way allocation: vendor covers product IP, customer covers uploaded content/data.",
        "Both parties retain prompt notice requirements and reasonable defense cooperation obligations.",
        "Standard commercial alignment eliminating negotiation friction.",
      ],
    },
  },
  termination: {
    buyer: {
      text: "CUSTOMER MAY TERMINATE THIS AGREEMENT OR ANY ORDER FORM FOR CONVENIENCE AT ANY TIME UPON THIRTY (30) DAYS' ADVANCED WRITTEN NOTICE TO VENDOR. UPON SUCH TERMINATION, VENDOR SHALL IMMEDIATELY REFUND TO CUSTOMER ALL PREPAID, UNEARNED FEES APPORTIONED ON A PRO-RATA BASIS FOR THE REMAINING TERM.",
      rationale: [
        "Provides strategic agility if business requirements change or software adoption stalls.",
        "Guarantees prompt refund of unutilized prepaid subscription fees.",
        "Eliminates long-term budgetary lock-in.",
      ],
    },
    seller: {
      text: "THIS AGREEMENT SHALL AUTOMATICALLY RENEW FOR SUCCESSIVE TWELVE (12) MONTH PERIODS UNLESS EITHER PARTY DELIVERS WRITTEN NOTICE OF NON-RENEWAL AT LEAST SIXTY (60) DAYS PRIOR TO THE EXPIRATION OF THE CURRENT TERM. TERMINATION FOR CONVENIENCE IS EXPRESSLY EXCLUDED. EITHER PARTY MAY TERMINATE FOR CAUSE UPON THIRTY (30) DAYS' NOTICE AND OPPORTUNITY TO CURE.",
      rationale: [
        "Locks in predictable recurring ARR with a strict 60-day opt-out window.",
        "Prevents mid-term customer churn and preserves contract revenue realization.",
        "Requires formal notice and a 30-day cure period before termination for breach can occur.",
      ],
    },
    balanced: {
      text: "EITHER PARTY MAY TERMINATE THIS AGREEMENT FOR CAUSE UPON THIRTY (30) DAYS' PRIOR WRITTEN NOTICE IF THE OTHER PARTY COMMITS A MATERIAL BREACH AND FAILS TO CURE WITHIN SUCH PERIOD. THIS AGREEMENT SHALL RENEW ONLY UPON MUTUAL WRITTEN CONFIRMATION EXECUTED AT LEAST THIRTY (30) DAYS PRIOR TO TERM EXPIRATION.",
      rationale: [
        "Eliminates unfair automatic renewal traps by requiring mutual affirmative opt-in.",
        "Provides a bilateral 30-day cure window to resolve operational discrepancies before contract dissolution.",
        "Maintains commercial stability without coercive multi-year rollover.",
      ],
    },
  },
  data_privacy: {
    buyer: {
      text: "IN THE EVENT OF ANY CONFIRMED OR REASONABLY SUSPECTED SECURITY INCIDENT, UNAUTHORIZED ACCESS, OR PERSONAL DATA BREACH, VENDOR SHALL NOTIFY CUSTOMER IN WRITING WITHIN TWENTY-FOUR (24) HOURS OF DISCOVERY. VENDOR SHALL REMEDIATE THE INCIDENT AT ITS SOLE EXPENSE AND REIMBURSE CUSTOMER FOR ALL REASONABLE FORENSIC INVESTIGATION, CREDIT MONITORING, AND REGULATORY REPORTING COSTS.",
      rationale: [
        "Strict 24-hour notification window allows customer to meet statutory 72-hour reporting deadlines under GDPR/CCPA.",
        "Shifts all forensic, credit monitoring, and regulatory notification expenses to the vendor.",
        "Enforces rapid containment and daily status reporting.",
      ],
    },
    seller: {
      text: "VENDOR SHALL NOTIFY CUSTOMER WITHOUT UNDUE DELAY, AND IN NO EVENT LATER THAN SEVENTY-TWO (72) HOURS AFTER CONFIRMING A DATA BREACH INVOLVING CUSTOMER PERSONAL DATA, SUBJECT TO LAW ENFORCEMENT INVESTIGATION REQUIREMENTS. VENDOR SHALL TAKE COMMERCIALLY REASONABLE STEPS TO MITIGATE ADVERSE EFFECTS.",
      rationale: [
        "Aligns notice timeline with GDPR's 72-hour safe harbor threshold.",
        "Conditions notice on confirmation of actual breach rather than premature speculative rumors.",
        "Binds vendor solely to commercially reasonable mitigation without open-ended indemnification.",
      ],
    },
    balanced: {
      text: "VENDOR SHALL NOTIFY CUSTOMER IN WRITING WITHIN FORTY-EIGHT (48) HOURS OF BECOMING AWARE OF ANY CONFIRMED SECURITY INCIDENT IMPACTING CUSTOMER DATA. VENDOR SHALL PROMPTLY PROVIDE MATERIAL DETAILS REGARDING THE NATURE OF THE INCIDENT, AFFECTED DATA CATEGORIES, AND CORRECTIVE MEASURES UNDERTAKEN.",
      rationale: [
        "48-hour timeline provides realistic investigative lead-time while ensuring customer compliance with regulatory duties.",
        "Transparent disclosure of affected categories without speculative premature admissions.",
        "Standard commercial privacy baseline for enterprise SaaS.",
      ],
    },
  },
  ip: {
    buyer: {
      text: "CUSTOMER RETAINS ALL RIGHT, TITLE, AND INTEREST, INCLUDING ALL INTELLECTUAL PROPERTY RIGHTS, IN AND TO CUSTOMER DATA AND CUSTOMER CONFIDENTIAL INFORMATION. VENDOR SHALL NOT USE, AGGREGATE, OR EXPLOIT CUSTOMER DATA FOR MACHINE LEARNING MODEL TRAINING OR ANY PURPOSE OTHER THAN DELIVERING THE DIRECT SERVICES HEREUNDER.",
      rationale: [
        "Prevents vendor from harvesting customer proprietary data or trade secrets for AI model training.",
        "Affirms unquestioned customer ownership over all outputs, databases, and uploaded assets.",
        "Explicit reservation of rights prevents implied license grants.",
      ],
    },
    seller: {
      text: "CUSTOMER GRANTS VENDOR A WORLDWIDE, ROYALTY-FREE LICENSE TO HOST, COPY, AND TRANSMIT CUSTOMER DATA AS NECESSARY TO OPERATE AND MAINTAIN THE SERVICE. VENDOR MAY GENERATE DE-IDENTIFIED, ANONYMIZED STATISTICAL DATA DERIVED FROM USAGE TO IMPROVE PRODUCT PERFORMANCE AND BENCHMARKING.",
      rationale: [
        "Ensures vendor possesses necessary operational rights to host and route data via cloud infrastructure.",
        "Permits compilation of anonymized aggregate telemetry to optimize platform infrastructure.",
        "Safeguards vendor product algorithms and analytics assets.",
      ],
    },
    balanced: {
      text: "CUSTOMER RETAINS SOLE OWNERSHIP OF ALL CUSTOMER DATA. VENDOR RETAINS SOLE OWNERSHIP OF THE PLATFORM, SOFTWARE, AND DERIVATIVE WORKS. VENDOR RECEIVES A LIMITED, NON-EXCLUSIVE LICENSE TO PROCESS CUSTOMER DATA SOLELY DURING THE TERM AND EXCLUSIVELY TO PERFORM ITS CONTRACTUAL OBLIGATIONS HEREUNDER.",
      rationale: [
        "Clean, definitive separation between customer data ownership and vendor software IP.",
        "Prohibits vendor from repurposing customer assets for secondary commercial ventures.",
        "Mutual clarity eliminating intellectual property disputes.",
      ],
    },
  },
  confidentiality: {
    buyer: {
      text: "RECIPIENT SHALL HOLD ALL CONFIDENTIAL INFORMATION IN STRICT CONFIDENCE USING AT LEAST THE DEGREE OF CARE USED FOR ITS OWN CRITICAL ASSETS. CONFIDENTIALITY OBLIGATIONS SHALL SURVIVE FOR FIVE (5) YEARS FOLLOWING TERMINATION; PROVIDED THAT TRADE SECRETS AND PERSONAL DATA SHALL BE HELD CONFIDENTIAL IN PERPETUITY.",
      rationale: [
        "Extended 5-year general confidentiality survival protects long-term product roadmaps.",
        "Perpetual survival covenant for trade secrets prevents valuable formulas/IP from entering public domain.",
        "High fiduciary standard of care.",
      ],
    },
    seller: {
      text: "CONFIDENTIALITY OBLIGATIONS SHALL REMAIN IN EFFECT FOR A PERIOD OF TWO (2) YEARS FROM THE DATE OF DISCLOSURE. RECIPIENT MAY DISCLOSE CONFIDENTIAL INFORMATION AS REQUIRED BY LAW, PROVIDED IT FURNISHES PROMPT ADVANCE NOTICE TO PERMIT A PROTECTIVE ORDER.",
      rationale: [
        "Caps compliance overhead to 2 years, aligning with fast-moving technological obsolescence.",
        "Explicit carve-out for compelled regulatory or judicial subpoenas.",
        "Reduces indefinite custodial tracking liabilities.",
      ],
    },
    balanced: {
      text: "CONFIDENTIALITY OBLIGATIONS SHALL SURVIVE FOR THREE (3) YEARS FOLLOWING EXPIRATION OR TERMINATION OF THIS AGREEMENT; PROVIDED THAT WITH RESPECT TO ANY INFORMATION IDENTIFIED AS A TRADE SECRET, OBLIGATIONS SHALL CONTINUE FOR AS LONG AS SUCH INFORMATION CONSTITUTES A TRADE SECRET UNDER APPLICABLE LAW.",
      rationale: [
        "Standard 3-year term recognized across global commercial transactions.",
        "Statutory tether for trade secrets protects core IP without imposing artificial expiration.",
        "Standard balanced carve-outs for public domain and independent development.",
      ],
    },
  },
  governing_law: {
    buyer: {
      text: "THIS AGREEMENT SHALL BE GOVERNED BY AND CONSTRUED IN ACCORDANCE WITH THE LAWS OF THE STATE OF DELAWARE, WITHOUT GIVING EFFECT TO CONFLICT OF LAWS PRINCIPLES. EACH PARTY SUBMITS TO THE EXCLUSIVE JURISDICTION OF THE STATE AND FEDERAL COURTS LOCATED IN WILMINGTON, DELAWARE. EACH PARTY WAIVES ANY RIGHT TO A TRIAL BY JURY.",
      rationale: [
        "Delaware offers the most sophisticated, predictable commercial judiciary in the United States.",
        "Jury waiver reduces litigation volatility and expedites bench determinations.",
        "Convenient neutral forum for enterprise entities.",
      ],
    },
    seller: {
      text: "THIS AGREEMENT AND ANY DISPUTE ARISING HEREFROM SHALL BE GOVERNED BY THE LAWS OF THE STATE OF NEW YORK. ANY DISPUTE SHALL BE RESOLVED EXCLUSIVELY VIA BINDING ARBITRATION ADMINISTERED BY THE AMERICAN ARBITRATION ASSOCIATION (AAA) IN NEW YORK CITY UNDER ITS COMMERCIAL RULES.",
      rationale: [
        "Binding arbitration avoids protracted public court trials and minimizes public relations exposure.",
        "New York substantive law provides rigorous enforcement of limitation of liability and warranty waivers.",
        "Precludes class actions and limits discovery expenses.",
      ],
    },
    balanced: {
      text: "THIS AGREEMENT SHALL BE GOVERNED BY THE LAWS OF THE STATE OF DELAWARE, WITHOUT REGARD TO CONFLICTS OF LAW RULES. EACH PARTY IRREVOCABLY SUBMITS TO THE NON-EXCLUSIVE JURISDICTION OF DELAWARE COURTS. EITHER PARTY MAY SEEK IMMEDIATE INJUNCTIVE RELIEF IN ANY JURISDICTION TO PROTECT CONFIDENTIAL INFORMATION OR INTELLECTUAL PROPERTY.",
      rationale: [
        "Predictable Delaware substantive governance.",
        "Preserves emergency judicial injunctive relief for trade secret or copyright violations without arbitration delay.",
        "Mutual non-exclusive venue accommodates multinational operations.",
      ],
    },
  },
  warranties: {
    buyer: {
      text: "VENDOR WARRANTS THAT: (A) THE SERVICES WILL ACHIEVE AT LEAST 99.9% MONTHLY AVAILABILITY; (B) THE SERVICES WILL OPERATE IN MATERIAL CONFORMITY WITH DOCUMENTATION; AND (C) THE SERVICES CONTAIN NO MALICIOUS CODE OR BACKDOORS. IF VENDOR FAILS TO MEET THE UPTIME SLA, CUSTOMER SHALL RECEIVE PRO-RATA SERVICE CREDITS AND MAY TERMINATE FOR CHRONIC DOWNTIME.",
      rationale: [
        "Guarantees operational reliability with an enforceable 99.9% uptime SLA.",
        "Provides quantifiable financial remedies (service credits) and off-ramp termination for chronic failure.",
        "Express cybersecurity warranty against malware or unauthorized access mechanisms.",
      ],
    },
    seller: {
      text: "VENDOR WARRANTS THAT THE SERVICES WILL SUBSTANTIALLY CONFORM TO PUBLISHED SPECIFICATIONS FOR THIRTY (30) DAYS FOLLOWING INITIAL ACCESS. CUSTOMER'S SOLE AND EXCLUSIVE REMEDY FOR BREACH OF WARRANTY SHALL BE FOR VENDOR TO USE COMMERCIALLY REASONABLE EFFORTS TO REPAIR OR REPLACE THE NON-CONFORMING SERVICE. EXCEPT AS EXPRESSLY STATED, THE SERVICES ARE PROVIDED 'AS IS'.",
      rationale: [
        "Limits warranty exposure to a 30-day initial testing window.",
        "Caps customer remedy strictly to repair/reperformance, precluding damages claims.",
        "Explicit 'AS IS' disclaimer eliminates implied fitness for purpose or merchantability claims.",
      ],
    },
    balanced: {
      text: "PROVIDER WARRANTS THAT DURING THE SUBSCRIPTION TERM, THE SERVICE WILL PERFORM MATERIALLY IN ACCORDANCE WITH THE APPLICABLE SPECIFICATIONS AND THAT IT WILL EMPLOY INDUSTRY-STANDARD MEASURES TO PREVENT INTRODUCTION OF MALWARE. EXCEPT AS EXPRESSLY PROVIDED, ALL OTHER WARRANTIES, EXPRESS OR IMPLIED, ARE DISCLAIMED.",
      rationale: [
        "Protects customer throughout the full subscription duration without open-ended liability.",
        "Standard malware and conformance representation.",
        "Mutual commercial alignment eliminating complex SLA penalty negotiations.",
      ],
    },
  },
};

/**
 * Computes word-level diff and returns redline proposal with counsel rationale and counter-proposal memo
 */
export function generateRedlineProposal(req: RedlineRequest): RedlineProposal {
  const categoryFallback = FALLBACK_CLAUSES[req.category] || FALLBACK_CLAUSES.liability;
  const fallback = categoryFallback[req.perspective];

  const original = req.originalText || "Original clause text unavailable.";
  const proposed = fallback.text;

  // Word-level diff
  const rawDiff = diffWordsWithSpace(original, proposed);
  const diffParts: DiffWordItem[] = rawDiff.map((part) => ({
    value: part.value,
    added: part.added,
    removed: part.removed,
  }));

  const docName = req.documentName || "Commercial Agreement";
  const perspectiveLabel =
    req.perspective === "buyer"
      ? "Customer/Buyer-Protective"
      : req.perspective === "seller"
      ? "Vendor/Seller-Protective"
      : "Balanced Market Standard";

  const emailSubject = `Proposed Revisions — ${req.clauseTitle} (${docName})`;
  const emailRecipient = "opposing.counsel@company.com";
  const emailBody = `Dear Counsel,

In reviewing the draft of the ${docName}, our client has requested a revision to the "${req.clauseTitle}" provision to align with our institutional risk guidelines (${perspectiveLabel} standard).

Specific rationale:
${fallback.rationale.map((r) => `• ${r}`).join("\n")}

Proposed Language:
"${proposed}"

Please confirm if this revised language is acceptable or if we can discuss an equitable compromise during our next markup review.

Best regards,
Commercial Counsel`;

  return {
    id: `redline_${req.category}_${req.perspective}_${Date.now()}`,
    clauseTitle: req.clauseTitle,
    category: req.category,
    originalText: original,
    proposedText: proposed,
    perspective: req.perspective,
    diffParts,
    counselRationale: fallback.rationale,
    counterProposalMemo: {
      subject: emailSubject,
      recipient: emailRecipient,
      body: emailBody,
    },
  };
}
