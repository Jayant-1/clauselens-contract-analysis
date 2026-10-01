---
name: ClauseLens
description: Modern Legal Atelier - Prestigious, motion-enhanced contract intelligence
colors:
  primary: "#16171b"
  accent-gold: "#c5a880"
  accent-gold-deep: "#8f6e3b"
  neutral-bg: "#fbf9f6"
  neutral-surface: "#ffffff"
  border-subtle: "#e6e2d9"
  verified-bg: "#edf8f1"
  verified-text: "#1b663b"
  unverified-bg: "#fef7eb"
  unverified-text: "#96610b"
  alert-bg: "#fdf0f0"
  alert-text: "#a82e2e"
typography:
  display:
    fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "-0.012em"
  legal-serif:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.6
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral-surface}"
    rounded: "{rounded.md}"
    padding: "6px 14px"
---

# Design System: ClauseLens (Modern Legal Atelier)

## Overview

**Creative North Star: "The Modern Legal Atelier"**

ClauseLens is a prestigious, high-density contract intelligence workbench designed for law firm partners, litigation associates, and in-house general counsel. It balances the timeless authority of an elite law chamber with the fluid, tactile reactivity of modern software (Linear, Bloomberg Law).

Key Characteristics:
- **Warm Obsidian & Bone Canvas**: Ivory paper (`#FBF9F6`) in light mode, deep obsidian (`#0C0D10`) in dark mode.
- **Champagne Gold Accents**: Intentional highlights in Champagne Gold (`#C5A880` / `#8F6E3B`) for legal scales, active tabs, and citation focus.
- **Fluid Motion (`motion`)**: Spring physics (`stiffness: 350, damping: 28`) for message reveal, timeline expansion, and modal presentation.
- **Mobile & Tablet Adaptability**: Full responsive split layout with sliding contract drawer and instant view-switcher tabs.

## Colors

### Primary
- **Obsidian Black** (`#16171B` / Dark `#F2F1EE`): Primary actions, header iconography, and high-contrast typography.

### Accent
- **Champagne Gold** (`#C5A880` / Dark `#D8BE96`): Brand emblem, active document indication, and citation pulse rings.
- **Deep Amber Gold** (`#8F6E3B`): High-contrast labels on light surfaces.

### Neutral
- **Warm Ivory Paper** (`#FBF9F6` / Dark `#0C0D10`): Canvas background.
- **Pure Paper Surface** (`#FFFFFF` / Dark `#14161B`): Document reading cards and elevated panels.
- **Hairline Border** (`#E6E2D9` / Dark `#242730`): Crisp 1px structural framing.

### Semantic Status
- **Verified Sage** (`#EDF8F1` bg, `#1B663B` text): Verified quotes and grounded evidence.
- **Amber Warning** (`#FEF7EB` bg, `#96610B` text): Unverified claims or cautionary notes.
- **Diff Red** (`#FDF0F0` bg, `#A82E2E` text): Material clause changes and high significance alerts.

## Typography

**Primary Sans:** Geist Sans (clean legibility for toolbars, buttons, chat input)  
**Editorial Serif:** Georgia / Times (authoritative legal contracts and quoted evidence)  
**Monospace:** Geist Mono (metadata, pin-cites, page numbers, character stats)

## Layout & Responsiveness

- **Desktop (≥ 1024px)**: 3-pane split layout:
  - Left Library Rail (288px)
  - Center Analytical Chat (flexible)
  - Right Document Viewer (48%)
- **Mobile & Tablet (< 1024px)**:
  - Slide-in contract library drawer via hamburger trigger.
  - Top segmented control switching between `[Chat]` and `[Document]`.
  - Automatic navigation from Chat to Document when a citation is clicked, with floating "Return to Inquiry" button.

## Elevation & Depth

- Elevation is defined by hairline 1px borders and surface tone differences.
- Modals utilize a soft backdrop blur (`backdrop-blur-sm`) and spring scale entrance.

## Components

### Executive Key Terms Pulse Bar
- Instant deal overview (Governing Law, Liability Cap, Notice Period, Confidentiality).

### Verified Evidence Cards
- Displays quote, document source, page number, and two primary actions:
  - **Cite**: One-click legal memo pin-cite copy with animated confirmation.
  - **Open**: Instant pan-and-scroll text layer highlight.

### Lawyer Quick-Audit Prompts
- One-click prompt chips for liability caps, termination notice, indemnity, and governing law.
