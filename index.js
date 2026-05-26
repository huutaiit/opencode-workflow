/**
 * opencode-workflow — Engineering Process System for opencode
 *
 * This package provides an auto-chain design-to-implementation pipeline
 * inspired by the EPS (Engineering Process System) framework.
 *
 * Installation:
 *   npm install opencode-workflow
 *   npx opencode-workflow init
 *
 * Usage in opencode:
 *   /research  → /innovate  → /design  → /plan  → /execute  → /validate  → /test
 */

export const VERSION = "1.0.0"

export const WORKFLOW_MODES = {
  FULL: "/research → /innovate → /design (SRS+BD+DD) → /plan → /execute",
  ARCH_READY: "/design --init → /design (BD+DD) → /plan → /execute",
  BUGFIX: "/research → /plan → /execute",
}

export const STATE_MACHINE = [
  "INITIAL",
  "RESEARCHED",
  "INNOVATE_SRS",
  "SRS_CREATED",
  "INNOVATE_TECHNICAL",
  "BD_CREATED",
  "DD_CREATED",
  "BD_DD_CREATED",
  "PLAN_CREATED",
  "PLAN_REVIEWED",
  "EXECUTED",
  "VALIDATED",
  "TESTED",
]

export const QUALITY_GATES = {
  D1: { phase: "research", threshold: "≥2 sources/section" },
  D2: { phase: "innovate", threshold: "All decisions documented" },
  D3: { phase: "design", threshold: "SRS + BD complete" },
  D4: { phase: "pre-plan", threshold: "All design docs exist + validated" },
  G0: { phase: "pre-execute", threshold: "Confidence ≥90%" },
}

export default {
  VERSION,
  WORKFLOW_MODES,
  STATE_MACHINE,
  QUALITY_GATES,
}
