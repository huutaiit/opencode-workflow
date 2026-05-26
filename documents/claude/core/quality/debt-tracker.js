#!/usr/bin/env node

/**
 * Quality Debt Tracker — L6 ENGINE
 *
 * Manages quality-debt.log (JSONL format) for tracking
 * code quality violations across EPS execution.
 *
 * Design Reference: DD-EPS §2.4 (F04)
 */

'use strict';

const fs = require('fs');
const path = require('path');

// Allow overriding for testing
let _pathOverride = null;

/**
 * Override the debt file path (for testing).
 * @param {string|null} p - Path override, or null to reset
 */
function setPathOverride(p) {
  _pathOverride = p;
}

/**
 * Resolve the debt log file path.
 * Uses EPS context directory if available, falls back to cwd.
 */
function getDebtFilePath() {
  if (_pathOverride) return _pathOverride;
  // Try EPS state-manager for active context
  try {
    const sm = require('../state/state-manager.js');
    const ctx = sm.findActiveContext();
    if (ctx) return path.join(ctx, 'quality-debt.log');
  } catch (_) {
    // state-manager not available — fall back
  }

  // Fallback: project root
  return path.join(process.cwd(), 'quality-debt.log');
}

/**
 * Append a single debt entry to the JSONL log.
 * Creates file if it doesn't exist.
 *
 * @param {object} entry - DebtEntry object
 * @param {string} [entry.sp] - Sub-plan ID
 * @param {string} [entry.file] - File with violation
 * @param {string} [entry.rule] - Rule name
 * @param {string} [entry.severity] - "critical" or "warning"
 * @param {string} [entry.message] - Human-readable message
 * @param {string} [entry.status] - "open", "fixed", or "consolidated"
 * @param {string|null} [entry.fixedBy] - Who fixed: "self-fix-loop", "consolidation", "manual"
 */
function appendEntry(entry) {
  try {
    const filePath = getDebtFilePath();
    const record = {
      ts: new Date().toISOString(),
      sp: entry.sp || '',
      file: entry.file || '',
      rule: entry.rule || '',
      severity: entry.severity || 'warning',
      message: entry.message || '',
      status: entry.status || 'open',
      fixedBy: entry.fixedBy || null
    };
    fs.appendFileSync(filePath, JSON.stringify(record) + '\n', 'utf8');
  } catch (err) {
    process.stderr.write(`[debt-tracker] appendEntry error: ${err.message}\n`);
  }
}

/**
 * Read all entries from the debt log.
 * Returns empty array if file doesn't exist or is corrupted.
 *
 * @returns {object[]} Array of DebtEntry objects
 */
function readAll() {
  try {
    const filePath = getDebtFilePath();
    if (!fs.existsSync(filePath)) return [];

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(l => l.trim());
    const entries = [];

    for (const line of lines) {
      try {
        entries.push(JSON.parse(line));
      } catch (_) {
        // Skip corrupted lines
      }
    }
    return entries;
  } catch (err) {
    process.stderr.write(`[debt-tracker] readAll error: ${err.message}\n`);
    return [];
  }
}

/**
 * Count open entries, optionally filtered by severity.
 *
 * @param {string} [severity] - "critical", "warning", or undefined for all
 * @returns {number} Count of matching open entries
 */
function countOpen(severity) {
  const entries = readAll();
  return entries.filter(e => {
    if (e.status !== 'open') return false;
    if (severity && e.severity !== severity) return false;
    return true;
  }).length;
}

/**
 * Mark matching entries as "consolidated".
 * Reads all, updates matching, writes back entire file.
 *
 * @param {object} filter - { rule?: string, sp?: string }
 * @returns {number} Number of entries updated
 */
function markConsolidated(filter) {
  try {
    const filePath = getDebtFilePath();
    const entries = readAll();
    let count = 0;

    for (const entry of entries) {
      if (entry.status !== 'open') continue;
      if (filter.rule && entry.rule !== filter.rule) continue;
      if (filter.sp && entry.sp !== filter.sp) continue;

      entry.status = 'consolidated';
      entry.fixedBy = 'consolidation';
      count++;
    }

    if (count > 0) {
      const content = entries.map(e => JSON.stringify(e)).join('\n') + '\n';
      fs.writeFileSync(filePath, content, 'utf8');
    }

    return count;
  } catch (err) {
    process.stderr.write(`[debt-tracker] markConsolidated error: ${err.message}\n`);
    return 0;
  }
}

module.exports = {
  getDebtFilePath,
  setPathOverride,
  appendEntry,
  readAll,
  countOpen,
  markConsolidated
};
