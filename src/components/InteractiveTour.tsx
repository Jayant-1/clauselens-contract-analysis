"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  Zap,
  Target,
  Check,
  Trophy,
  RotateCcw,
} from "lucide-react";
import { UntitledUiLogo } from "./UntitledUiLogo";

export interface TourStep {
  id: string;
  stepNumber: number;
  totalSteps: number;
  phaseBadge: string;
  title: string;
  objective: string;
  counselRationale: string;
  targetSelector: string;
  actionHint: string;
  autoActionLabel: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "step-select-doc",
    stepNumber: 1,
    totalSteps: 6,
    phaseBadge: "PHASE 1: MATTER INTAKE",
    title: "Select Contract for Diligence",
    objective: "Select SaaS Master Subscription Agreement (v1) from your portfolio to index clauses and load full text.",
    counselRationale: "Institutional diligence requires anchoring in the specific executed matter before investigating liability, indemnification, or renewal traps.",
    targetSelector: '[data-tour="contract-item"]',
    actionHint: "Click the contract card in the left portfolio sidebar",
    autoActionLabel: "Auto-Select Contract",
  },
  {
    id: "step-liability-query",
    stepNumber: 2,
    totalSteps: 6,
    phaseBadge: "PHASE 2: COMMERCIAL INQUIRY",
    title: "Inquire: Limitation of Liability Exposure",
    objective: "Run an autonomous diligence inquiry to examine aggregate liability caps, super-caps, and uncapped carve-outs.",
    counselRationale: "Uncapped liability or missing consequential damages waivers represent catastrophic commercial exposure. Early verification is critical.",
    targetSelector: '[data-tour="liability-quick-query"]',
    actionHint: "Click the 'Limitation of Liability & Super-Caps' inquiry pill",
    autoActionLabel: "Run Liability Inquiry",
  },
  {
    id: "step-inspect-citation",
    stepNumber: 3,
    totalSteps: 6,
    phaseBadge: "PHASE 3: PIN-CITE VERIFICATION",
    title: "Cross-Examine Ground-Truth Evidence",
    objective: "Inspect the verbatim contract quote in the split-screen viewer with synchronized page scrolling and highlight halo.",
    counselRationale: "Never rely on ungrounded summaries. Pin-cites prove the exact page and clause line existing in the signed agreement.",
    targetSelector: '[data-tour="citation-inspect-btn"]',
    actionHint: "Click 'Inspect ↗' on the verified Pin-Cite card in the Memorandum",
    autoActionLabel: "Inspect Pin-Cite",
  },
  {
    id: "step-risk-audit",
    stepNumber: 4,
    totalSteps: 6,
    phaseBadge: "PHASE 4: 8-VECTOR RISK AUDIT",
    title: "Open Risk & Compliance Audit Matrix",
    objective: "Inspect the Contract Health Score (0–100), letter grade (A–D), and scan for Missing Essential Protections.",
    counselRationale: "Automates institutional baseline compliance checks across 8 commercial vectors including data breach notice and auto-renewal traps.",
    targetSelector: '[data-tour="risk-audit-btn"]',
    actionHint: "Click 'Risk Audit' in the top navigation bar",
    autoActionLabel: "Launch Risk Audit",
  },
  {
    id: "step-propose-redline",
    stepNumber: 5,
    totalSteps: 6,
    phaseBadge: "PHASE 5: REDLINE REMEDIATION",
    title: "Generate Tracked Changes Redline",
    objective: "Review word-level redline diff (deletions and additions), counsel strategic rationale, and counter-proposal email.",
    counselRationale: "Empowers counsel to turn identified risks into push-button, market-calibrated counter-language ready for opposing counsel.",
    targetSelector: '[data-tour="propose-redline-btn"]',
    actionHint: "Click 'Propose Redline' on the high-severity Liability finding",
    autoActionLabel: "Propose Redline",
  },
  {
    id: "step-export-memo",
    stepNumber: 6,
    totalSteps: 6,
    phaseBadge: "PHASE 6: INSTITUTIONAL REPORTING",
    title: "Generate Due Diligence Memorandum",
    objective: "Review the board-ready diligence memorandum formatted with deal metadata, risk matrix, and citation appendix.",
    counselRationale: "Produces an audit-grade memorandum for investment committees, General Counsel, and board reviews with print/PDF export.",
    targetSelector: '[data-tour="export-memo-btn"]',
    actionHint: "Click 'Export Memo' in the top navigation bar",
    autoActionLabel: "Review Diligence Memo",
  },
];

interface InteractiveTourProps {
  isActive: boolean;
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  onClose: () => void;
  onAutoPerform: (stepIndex: number) => void;
  onRestart: () => void;
}

export function InteractiveTour({
  isActive,
  currentStepIndex,
  onStepChange,
  onClose,
  onAutoPerform,
  onRestart,
}: InteractiveTourProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [hudPosition, setHudPosition] = useState<"bottom" | "top">("bottom");
  const isComplete = currentStepIndex >= TOUR_STEPS.length;
  const currentStep = TOUR_STEPS[currentStepIndex];

  // Update target bounding box on step change or window resize
  const updateTargetRect = useCallback(() => {
    if (!isActive || isComplete || !currentStep) {
      setTargetRect(null);
      return;
    }

    const elements = Array.from(document.querySelectorAll(currentStep.targetSelector));
    const targetEl =
      elements.find((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      }) || elements[0] || null;

    if (targetEl) {
      const rect = targetEl.getBoundingClientRect();
      setTargetRect(rect);

      // If target is in lower 45% of viewport, dock HUD at top
      if (rect.top > window.innerHeight * 0.55) {
        setHudPosition("top");
      } else {
        setHudPosition("bottom");
      }
    } else {
      setTargetRect(null);
      setHudPosition("bottom");
    }
  }, [isActive, isComplete, currentStep]);

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      updateTargetRect();
    });
    const handleResize = () => updateTargetRect();
    const handleScroll = () => updateTargetRect();

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    const interval = setInterval(updateTargetRect, 500);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
      clearInterval(interval);
    };
  }, [updateTargetRect]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Target Element Spotlight & Pulsing Halo */}
      {targetRect && !isComplete && (
        <div
          className="fixed pointer-events-none transition-all duration-300 ease-out z-40"
          style={{
            top: Math.max(4, targetRect.top - 6),
            left: Math.max(4, targetRect.left - 6),
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        >
          {/* Pulsing Outer Glow */}
          <div className="absolute inset-0 rounded-xl border-2 border-[#1E3A8A] ring-4 ring-[#1E3A8A]/30 animate-pulse" />

          {/* Tactical Target Indicator Flag */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`absolute ${
              hudPosition === "top"
                ? "top-full mt-2 left-1/2 -translate-x-1/2"
                : "bottom-full mb-2 left-1/2 -translate-x-1/2"
            } whitespace-nowrap bg-[#1E3A8A] text-white text-[11px] font-mono font-semibold px-2.5 py-1 rounded-md shadow-md flex items-center gap-1.5 z-50`}
          >
            <Target className="w-3.5 h-3.5 text-blue-200 animate-spin" style={{ animationDuration: "6s" }} />
            <span>Click here to complete objective</span>
          </motion.div>
        </div>
      )}

      {/* Mission Accomplished Debrief Modal */}
      <AnimatePresence>
        {isComplete && (
          <div className="fixed inset-0 pointer-events-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="bg-white rounded-2xl border border-[#E5E5E2] shadow-2xl max-w-lg w-full overflow-hidden text-zinc-900"
            >
              {/* Header Banner */}
              <div className="bg-gradient-to-br from-[#1E3A8A] to-[#0F172A] text-white p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Trophy className="w-40 h-40" />
                </div>

                <div className="relative z-10 flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                    <UntitledUiLogo className="w-6 h-6 brightness-200" size={24} />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono tracking-wider uppercase text-blue-200 block">
                      MISSION ACCOMPLISHED
                    </span>
                    <h2 className="font-editorial text-2xl font-bold tracking-tight">
                      Diligence Certified
                    </h2>
                  </div>
                </div>

                <p className="text-xs text-blue-100/90 leading-relaxed font-sans relative z-10 max-w-md">
                  You have completed an end-to-end institutional diligence workflow: from contract ingestion to pin-cite cross-examination, risk scoring, tracked redlines, and memorandum export.
                </p>
              </div>

              {/* Verified Checklist */}
              <div className="p-6 space-y-4">
                <div className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">
                  Diligence Milestones Completed
                </div>

                <div className="grid grid-cols-1 gap-2.5 text-xs">
                  {[
                    "Matter Ingestion & Document Verification",
                    "Limitation of Liability & Super-Cap Inquiry",
                    "Ground-Truth Pin-Cite Cross-Examination",
                    "8-Vector Risk & Health Score Audit",
                    "Tracked Changes Redline & Counsel Rationale",
                    "Board-Ready Due Diligence Memorandum",
                  ].map((milestone, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 p-2 rounded-lg bg-[#FAFAF8] border border-[#E5E5E2]"
                    >
                      <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                      <span className="font-medium text-zinc-800">{milestone}</span>
                    </div>
                  ))}
                </div>

                {/* Scorecard Strip */}
                <div className="grid grid-cols-3 gap-2 pt-2 text-center font-mono">
                  <div className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200">
                    <div className="text-lg font-bold text-zinc-900 font-editorial">6 / 6</div>
                    <div className="text-[10px] text-zinc-500 uppercase">Objectives</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                    <div className="text-lg font-bold font-editorial">100%</div>
                    <div className="text-[10px] text-emerald-700 uppercase">Deterministic</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-[#1E3A8A]">
                    <div className="text-lg font-bold font-editorial">0.0s</div>
                    <div className="text-[10px] text-blue-700 uppercase">AI Latency</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-[#E5E5E2] flex items-center justify-between gap-3">
                  <button
                    onClick={onRestart}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Replay Mission</span>
                  </button>

                  <button
                    onClick={onClose}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1E3A8A] text-white text-xs font-semibold hover:bg-[#172554] shadow-md hover:shadow-lg transition-all"
                  >
                    <span>Explore Freely</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Mission HUD Controller */}
      <AnimatePresence>
        {!isComplete && currentStep && (
          <div
            className={`fixed ${
              hudPosition === "top" ? "top-5" : "bottom-6"
            } left-1/2 -translate-x-1/2 pointer-events-auto z-50 w-full max-w-2xl px-4`}
          >
            <motion.div
              layout
              initial={{ opacity: 0, y: hudPosition === "top" ? -20 : 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: hudPosition === "top" ? -20 : 20, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="bg-[#18181B] text-white rounded-2xl shadow-2xl border border-zinc-700/80 p-4 sm:p-5 backdrop-blur-xl"
            >
              {/* Header Row: Phase Badge, Progress, and Exit */}
              <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#1E3A8A] text-blue-100 uppercase tracking-wider">
                    {currentStep.phaseBadge}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">
                    Objective {currentStep.stepNumber} of {currentStep.totalSteps}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Progress Indicator */}
                  <div className="hidden sm:flex items-center gap-1.5 font-mono text-xs text-zinc-400">
                    <div className="w-24 bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-400 h-full transition-all duration-300"
                        style={{
                          width: `${((currentStep.stepNumber - 1) / currentStep.totalSteps) * 100}%`,
                        }}
                      />
                    </div>
                    <span>{Math.round(((currentStep.stepNumber - 1) / currentStep.totalSteps) * 100)}%</span>
                  </div>

                  <button
                    onClick={onClose}
                    className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                    title="Exit Walkthrough"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Body: Title, Objective, and Tactical Counsel Rationale */}
              <div className="py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                  <h3 className="font-editorial text-base sm:text-lg font-bold text-white tracking-tight">
                    {currentStep.title}
                  </h3>
                </div>

                <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed font-sans">
                  {currentStep.objective}
                </p>

                {/* Counsel Rationale */}
                <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs flex items-start gap-2.5">
                  <Target className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-zinc-400 leading-relaxed font-sans">
                    <strong className="text-zinc-200 font-medium">Counsel Context: </strong>
                    {currentStep.counselRationale}
                  </div>
                </div>

                {/* Tactical Action Hint */}
                <div className="flex items-center gap-1.5 text-xs text-blue-300 font-medium pt-0.5">
                  <span>👉</span>
                  <span>{currentStep.actionHint}</span>
                </div>
              </div>

              {/* Footer Controls: Back, Auto-Perform, Next */}
              <div className="pt-3 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {currentStepIndex > 0 && (
                    <button
                      onClick={() => onStepChange(currentStepIndex - 1)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Push-Button Auto-Perform (User Never Stuck) */}
                  <button
                    onClick={() => onAutoPerform(currentStepIndex)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 hover:border-blue-400 transition-all shadow-sm"
                    title="Automatically perform this action and advance"
                  >
                    <Zap className="w-3.5 h-3.5 text-blue-300 fill-current" />
                    <span>{currentStep.autoActionLabel}</span>
                  </button>

                  {/* Manual Advance Button */}
                  <button
                    onClick={() => onStepChange(currentStepIndex + 1)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                    title="Skip to next objective"
                  >
                    <span>Skip</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
