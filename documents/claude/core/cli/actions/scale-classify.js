#!/usr/bin/env node

/**
 * Scale Classification for DD Generation
 *
 * Classifies project scale as LIGHT / MEDIUM / HEAVY based on 4 metrics.
 * Used by /design --detail (Step 0.4) to determine specialist loading.
 *
 * Usage:
 *   node core/cli/actions/scale-classify.js --input <scale-profile.json>
 *   require('./scale-classify.js').classify(profile) → { classification, details }
 *
 * EPS Framework v10.0
 */

const fs = require('fs');
const path = require('path');

const THRESHOLDS = {
  recordsPerOperation: { light: 1000, heavy: 100000 },
  operationsPerDay: { light: 50, heavy: 500 },
  concurrentUsers: { light: 5, heavy: 20 },
  maxResponseTimeSeconds: { light: 30, heavy: 5, inverted: true },
};

/**
 * Classify a single metric as LIGHT, MEDIUM, or HEAVY
 */
function classifyMetric(value, thresholds) {
  if (value == null || value === undefined) return 'LIGHT';

  if (thresholds.inverted) {
    // Lower value = heavier (e.g., SLA: <5s is HEAVY)
    if (value <= thresholds.heavy) return 'HEAVY';
    if (value >= thresholds.light) return 'LIGHT';
    return 'MEDIUM';
  }

  // Higher value = heavier
  if (value >= thresholds.heavy) return 'HEAVY';
  if (value <= thresholds.light) return 'LIGHT';
  return 'MEDIUM';
}

/**
 * Classify overall scale profile.
 * Rule: ANY metric HEAVY → overall HEAVY, ALL LIGHT → LIGHT, else MEDIUM.
 *
 * @param {object} profile - { recordsPerOperation, operationsPerDay, concurrentUsers, maxResponseTimeSeconds }
 * @returns {{ classification: string, details: Array<{ metric: string, value: any, level: string }> }}
 */
function classify(profile) {
  if (!profile || typeof profile !== 'object') {
    return { classification: 'LIGHT', details: [{ metric: 'input', value: null, level: 'LIGHT' }] };
  }

  const details = [];

  for (const [metric, thresholds] of Object.entries(THRESHOLDS)) {
    const value = profile[metric];
    const level = classifyMetric(value, thresholds);
    details.push({ metric, value: value ?? null, level });
  }

  const hasHeavy = details.some(d => d.level === 'HEAVY');
  const allLight = details.every(d => d.level === 'LIGHT');

  let classification;
  if (hasHeavy) {
    classification = 'HEAVY';
  } else if (allLight) {
    classification = 'LIGHT';
  } else {
    classification = 'MEDIUM';
  }

  return { classification, details };
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  let inputPath = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      inputPath = args[i + 1];
      i++;
    }
  }

  if (!inputPath) {
    console.error('Usage: node scale-classify.js --input <scale-profile.json>');
    process.exit(1);
  }

  const resolved = path.resolve(process.cwd(), inputPath);
  if (!fs.existsSync(resolved)) {
    console.error(`File not found: ${resolved}`);
    process.exit(1);
  }

  try {
    const profile = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
    const result = classify(profile);
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (e) {
    console.error(`Failed to parse: ${e.message}`);
    process.exit(1);
  }
}

module.exports = { classify, classifyMetric, THRESHOLDS };
