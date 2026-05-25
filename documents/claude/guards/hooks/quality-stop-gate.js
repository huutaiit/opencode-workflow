#!/usr/bin/env node

/**
 * Quality Stop Gate — Stop Hook (L4 GUARD)
 *
 * Final gate before Claude finishes a response.
 * Checks if any critical violations remain open in debt log.
 *
 * Exit codes:
 *   0 = allow (no open critical violations)
 *   2 = block (open critical violations remain — Claude must continue fixing)
 *
 * Design Reference: DD-EPS §2.8 (F08)
 */

'use strict';

const path = require('path');

// Resolve module paths relative to EPS root
const EPS_ROOT = path.resolve(__dirname, '..', '..');
const debtTracker = require(path.join(EPS_ROOT, 'core', 'quality', 'debt-tracker.js'));
const ruleClassifier = require(path.join(EPS_ROOT, 'core', 'quality', 'rule-classifier.js'));

async function main() {
  // Check if quality guard is enabled
  const config = ruleClassifier.loadProjectConfig();
  if (config.enabled === false) {
    process.exit(0); // Quality guard disabled — allow stop
  }

  // Count open critical violations
  const criticalCount = debtTracker.countOpen('critical');

  if (criticalCount > 0) {
    process.stderr.write(
      `[quality-stop-gate] BLOCKED: ${criticalCount} critical violation(s) remain open.\n` +
      `Review quality-debt.log and fix remaining critical issues before finishing.\n`
    );
    process.exit(2); // Block — critical violations remain
  }

  process.exit(0); // Allow — no open critical violations
}

main().catch(err => {
  process.stderr.write(`[quality-stop-gate] Unexpected error: ${err.message}\n`);
  process.exit(0); // Fail-open
});
