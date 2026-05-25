#!/usr/bin/env node

/**
 * Tiered Rule Classifier — L6 ENGINE
 *
 * Classifies violations as "critical" (REJECT) or "warning" (LOG).
 *
 * Project-level config (enabled, maxRetries, consolidation) comes from
 * project-config.json → qualityGuard.
 *
 * Stack-level rules (critical/warning lists, linter, typecheck) come from
 * defaults/config/stacks/<stackKey>.json → qualityRules.
 *
 * Design Reference: DD-EPS §2.5 (F05)
 */

'use strict';

const fs = require('fs');
const path = require('path');

let _projectCache = null;
let _stackCache = {};

// Resolve EPS root (two levels up from core/quality/)
const EPS_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Load project-level qualityGuard config from project-config.json.
 * Contains: enabled, maxRetries, consolidation.
 *
 * @returns {object} Project-level quality config
 */
function loadProjectConfig() {
  if (_projectCache) return _projectCache;

  const configPaths = [
    path.join(process.cwd(), '.claude', 'config', 'project-config.json'),
    path.join(process.cwd(), 'config', 'project-config.json')
  ];

  for (const configPath of configPaths) {
    try {
      if (!fs.existsSync(configPath)) continue;
      const raw = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(raw);

      if (config.qualityGuard) {
        _projectCache = config.qualityGuard;
        return _projectCache;
      }
    } catch (_) {
      // Invalid JSON or read error — try next path
    }
  }

  // Default config (fail-open: disabled)
  _projectCache = {
    enabled: false,
    maxRetries: 3,
    consolidation: { threshold: 10, triggerOn: 'warning-count' }
  };
  return _projectCache;
}

/**
 * Load qualityRules from a stack JSON file.
 *
 * @param {string} stackKey - Stack identifier (e.g. "typescript-react", "java-spring-boot")
 * @returns {{ linter: string|null, typecheck: string|null, critical: string[], warning: string[] }}
 */
function loadStackRules(stackKey) {
  if (!stackKey) return { linter: null, typecheck: null, critical: [], warning: [] };
  if (_stackCache[stackKey]) return _stackCache[stackKey];

  const stackPath = path.join(EPS_ROOT, 'defaults', 'config', 'stacks', `${stackKey}.json`);

  try {
    if (fs.existsSync(stackPath)) {
      const raw = fs.readFileSync(stackPath, 'utf8');
      const stackConfig = JSON.parse(raw);

      if (stackConfig.qualityRules) {
        _stackCache[stackKey] = {
          linter: stackConfig.qualityRules.linter || null,
          typecheck: stackConfig.qualityRules.typecheck || null,
          critical: stackConfig.qualityRules.critical || [],
          warning: stackConfig.qualityRules.warning || []
        };
        return _stackCache[stackKey];
      }
    }
  } catch (_) {
    // Invalid JSON or read error — fall through
  }

  _stackCache[stackKey] = { linter: null, typecheck: null, critical: [], warning: [] };
  return _stackCache[stackKey];
}

/**
 * Resolve stackKey from file extension using _index.json + project-config sourceRoots.
 *
 * @param {string} filePath - File being checked
 * @returns {string|null} Stack key (e.g. "typescript-react")
 */
function resolveStackKey(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  // Load _index.json for extension → language → stacks mapping
  const indexPath = path.join(EPS_ROOT, 'defaults', 'config', 'stacks', '_index.json');
  let index;
  try {
    index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  } catch (_) {
    return null;
  }

  const language = index.extensionToLanguage && index.extensionToLanguage[ext];
  if (!language) return null;

  // Try to match against project-config sourceRoots for precise stack
  const configPaths = [
    path.join(process.cwd(), '.claude', 'config', 'project-config.json'),
    path.join(process.cwd(), 'config', 'project-config.json')
  ];

  for (const configPath of configPaths) {
    try {
      if (!fs.existsSync(configPath)) continue;
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const sourceRoots = config.sourceRoots || [];

      for (const root of sourceRoots) {
        if (root.language === language || root.stack === language || root.stackKey === language) {
          const key = root.stackKey || root.stack;
          if (key && index.stacks && index.stacks[key]) return key;
        }
      }
    } catch (_) {
      // continue to fallback
    }
  }

  // Fallback: first registered stack for this language
  const stacks = index.languageToStacks && index.languageToStacks[language];
  return stacks && stacks.length > 0 ? stacks[0] : null;
}

/**
 * Backward-compatible loadConfig — merges project config + stack rules.
 *
 * @param {string} [stackKey] - Optional stack key. If omitted, returns project config with empty rules.
 * @returns {object} Merged config
 */
function loadConfig(stackKey) {
  const project = loadProjectConfig();
  const rules = stackKey ? loadStackRules(stackKey) : { linter: null, typecheck: null, critical: [], warning: [] };

  return {
    enabled: project.enabled,
    maxRetries: project.maxRetries || 3,
    consolidation: project.consolidation || { threshold: 10, triggerOn: 'warning-count' },
    rules: { critical: rules.critical, warning: rules.warning },
    linter: rules.linter,
    typecheck: rules.typecheck
  };
}

/**
 * Classify a single rule name against a stack's rules.
 *
 * @param {string} ruleName - The rule identifier
 * @param {string} [stackKey] - Stack key for rule lookup
 * @returns {"critical"|"warning"} Classification result
 */
function classify(ruleName, stackKey) {
  const config = loadConfig(stackKey);
  const rules = config.rules || {};

  if (Array.isArray(rules.critical) && rules.critical.includes(ruleName)) {
    return 'critical';
  }
  if (Array.isArray(rules.warning) && rules.warning.includes(ruleName)) {
    return 'warning';
  }

  // Default: warning (fail-open per P4)
  return 'warning';
}

/**
 * Classify a list of violations, splitting into critical and warning buckets.
 *
 * @param {object[]} violations - Array of { rule, file, message, ... }
 * @param {string} [stackKey] - Stack key for rule lookup
 * @returns {{ critical: object[], warning: object[] }}
 */
function classifyAll(violations, stackKey) {
  const result = { critical: [], warning: [] };

  for (const v of violations) {
    const severity = classify(v.rule, stackKey);
    v.severity = severity;
    result[severity].push(v);
  }

  return result;
}

/**
 * Reset all caches (useful for testing).
 */
function resetCache() {
  _projectCache = null;
  _stackCache = {};
}

module.exports = {
  loadProjectConfig,
  loadStackRules,
  resolveStackKey,
  loadConfig,
  classify,
  classifyAll,
  resetCache
};
