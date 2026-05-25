#!/usr/bin/env node

/**
 * Adaptive Consolidation Trigger — L6 ENGINE
 *
 * Monitors quality-debt.log and triggers consolidation
 * when warning count exceeds configurable threshold.
 *
 * Design Reference: DD-EPS §2.6 (F06)
 */

'use strict';

const debtTracker = require('./debt-tracker.js');
const ruleClassifier = require('./rule-classifier.js');

/**
 * Get the consolidation threshold from config.
 *
 * @returns {number} Threshold value (default: 10)
 */
function getThreshold() {
  const config = ruleClassifier.loadProjectConfig();
  const consolidation = config.consolidation || {};
  return consolidation.threshold != null ? consolidation.threshold : 10;
}

/**
 * Get the current count of open warnings.
 *
 * @returns {number} Open warning count
 */
function getOpenCount() {
  return debtTracker.countOpen('warning');
}

/**
 * Determine if consolidation should be triggered.
 *
 * Triggers when:
 * - Open warning count exceeds threshold (adaptive)
 * - Threshold of 0 means trigger on any warning
 *
 * @returns {boolean} true if consolidation needed
 */
function shouldTrigger() {
  const threshold = getThreshold();
  const count = getOpenCount();
  return count > threshold;
}

module.exports = {
  getThreshold,
  getOpenCount,
  shouldTrigger
};
