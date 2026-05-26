#!/usr/bin/env node

/**
 * Quality Check — PostToolUse Hook (L4 GUARD)
 *
 * Runs after Edit/Write operations. Checks code quality via:
 * 1. Linter (resolved from stack JSON qualityRules)
 * 2. Type check (resolved from stack JSON qualityRules)
 * 3. Audit (npm audit for Node.js projects)
 * 4. Custom rules (no-any, no-duplicate-api, no-hardcoded)
 *
 * Exit codes:
 *   0 = allow (all checks pass, or only warnings logged)
 *   2 = block (critical violations found — Claude should fix)
 *
 * Design Reference: DD-EPS §2.2 (F02), §2.3 (F03)
 */

'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Resolve module paths relative to EPS root
const EPS_ROOT = path.resolve(__dirname, '..', '..');
const ruleClassifier = require(path.join(EPS_ROOT, 'core', 'quality', 'rule-classifier.js'));
const debtTracker = require(path.join(EPS_ROOT, 'core', 'quality', 'debt-tracker.js'));
const consolidationTrigger = require(path.join(EPS_ROOT, 'core', 'quality', 'consolidation-trigger.js'));

const TOOL_TIMEOUT = 15000; // 15s per tool
const HOOK_TIMEOUT = 30000; // 30s total timeout

/**
 * Sanitize file path to prevent command injection.
 */
function sanitizePath(filePath) {
  if (!filePath || typeof filePath !== 'string') return null;
  // Block shell metacharacters
  if (/[;|`$(){}]/.test(filePath)) return null;
  return filePath;
}

/**
 * Run a shell command with timeout. Returns { ok, stdout, stderr }.
 */
function runCmd(cmd, timeoutMs) {
  try {
    const stdout = execSync(cmd, {
      timeout: timeoutMs || TOOL_TIMEOUT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd()
    });
    return { ok: true, stdout, stderr: '' };
  } catch (err) {
    return {
      ok: false,
      stdout: err.stdout || '',
      stderr: err.stderr || err.message || ''
    };
  }
}

/**
 * Check if a tool is available on PATH.
 */
function toolExists(name) {
  try {
    execSync(`which ${name}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Run linter check based on stack qualityRules.
 */
function runLinter(filePath, linterName) {
  const violations = [];
  if (!linterName) return violations;

  if (linterName === 'eslint') {
    if (!toolExists('npx')) {
      process.stderr.write('[quality-check] WARN: npx not found, skipping eslint\n');
      return violations;
    }
    const result = runCmd(`npx eslint --max-warnings 0 --format json "${filePath}"`);
    if (!result.ok) {
      try {
        const parsed = JSON.parse(result.stdout);
        for (const file of parsed) {
          for (const msg of (file.messages || [])) {
            violations.push({
              rule: msg.ruleId || 'eslint-zero-warnings',
              file: file.filePath || filePath,
              message: `Line ${msg.line}: ${msg.message}`,
              line: msg.line
            });
          }
        }
      } catch (_) {
        if (result.stderr.includes('error') || result.stderr.includes('warning')) {
          violations.push({
            rule: 'eslint-zero-warnings',
            file: filePath,
            message: result.stderr.trim().substring(0, 200)
          });
        }
      }
    }
  } else if (linterName === 'checkstyle') {
    if (fs.existsSync(path.join(process.cwd(), 'pom.xml'))) {
      const result = runCmd('mvn checkstyle:check -q');
      if (!result.ok) {
        violations.push({
          rule: 'checkstyle',
          file: filePath,
          message: result.stderr.trim().substring(0, 200)
        });
      }
    }
  } else if (linterName === 'ruff') {
    if (toolExists('ruff')) {
      const result = runCmd(`ruff check "${filePath}" --output-format json`);
      if (!result.ok) {
        try {
          const parsed = JSON.parse(result.stdout);
          for (const item of parsed) {
            violations.push({
              rule: item.code || 'ruff',
              file: filePath,
              message: `Line ${item.location?.row}: ${item.message}`,
              line: item.location?.row
            });
          }
        } catch (_) {
          violations.push({
            rule: 'ruff',
            file: filePath,
            message: result.stderr.trim().substring(0, 200)
          });
        }
      }
    }
  } else if (linterName === 'dotnet-format') {
    if (toolExists('dotnet')) {
      const result = runCmd(`dotnet format --verify-no-changes "${filePath}"`);
      if (!result.ok) {
        violations.push({
          rule: 'dotnet-format',
          file: filePath,
          message: result.stderr.trim().substring(0, 200)
        });
      }
    }
  } else if (linterName === 'dart-analyze') {
    if (toolExists('dart')) {
      const result = runCmd(`dart analyze "${filePath}"`);
      if (!result.ok) {
        violations.push({
          rule: 'dart-analyze',
          file: filePath,
          message: result.stderr.trim().substring(0, 200)
        });
      }
    }
  } else if (linterName === 'phpstan') {
    if (toolExists('phpstan') || toolExists('vendor/bin/phpstan')) {
      const bin = toolExists('phpstan') ? 'phpstan' : 'vendor/bin/phpstan';
      const result = runCmd(`${bin} analyse "${filePath}" --no-progress`);
      if (!result.ok) {
        violations.push({
          rule: 'phpstan',
          file: filePath,
          message: result.stderr.trim().substring(0, 200)
        });
      }
    }
  }

  return violations;
}

/**
 * Run type checker based on stack qualityRules.
 */
function runTypeCheck(filePath, typecheckName) {
  const violations = [];
  if (!typecheckName) return violations;

  if (typecheckName === 'tsc') {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      if (fs.existsSync(path.join(process.cwd(), 'tsconfig.json'))) {
        const result = runCmd('npx tsc --noEmit');
        if (!result.ok) {
          const lines = (result.stdout + result.stderr).split('\n');
          for (const line of lines) {
            if (line.includes(filePath) && line.includes('error')) {
              violations.push({
                rule: 'tsc-error',
                file: filePath,
                message: line.trim().substring(0, 200)
              });
            }
          }
        }
      }
    }
  } else if (typecheckName === 'javac') {
    // Java type checking handled by Maven/Gradle build — skip standalone javac
  } else if (typecheckName === 'mypy') {
    if (toolExists('mypy')) {
      const result = runCmd(`mypy "${filePath}" --no-error-summary`);
      if (!result.ok) {
        violations.push({
          rule: 'mypy',
          file: filePath,
          message: result.stderr.trim().substring(0, 200)
        });
      }
    }
  } else if (typecheckName === 'dotnet-build') {
    if (toolExists('dotnet')) {
      const result = runCmd('dotnet build --no-restore -v q');
      if (!result.ok) {
        const lines = (result.stdout + result.stderr).split('\n');
        for (const line of lines) {
          if (line.includes(filePath) && line.includes('error')) {
            violations.push({
              rule: 'dotnet-build-error',
              file: filePath,
              message: line.trim().substring(0, 200)
            });
          }
        }
      }
    }
  }

  return violations;
}

/**
 * Run security audit for Node.js projects.
 */
function runAudit() {
  const violations = [];

  if (fs.existsSync(path.join(process.cwd(), 'package.json'))) {
    const result = runCmd('npm audit --audit-level=critical --json');
    if (!result.ok) {
      try {
        const parsed = JSON.parse(result.stdout);
        if (parsed.metadata && parsed.metadata.vulnerabilities) {
          const critical = parsed.metadata.vulnerabilities.critical || 0;
          if (critical > 0) {
            violations.push({
              rule: 'npm-audit-critical',
              file: 'package.json',
              message: `${critical} critical vulnerabilities found`
            });
          }
        }
      } catch (_) {
        // Non-JSON audit output — ignore
      }
    }
  }

  return violations;
}

/**
 * Run custom checks (no-any, no-hardcoded, etc.) on a single file.
 */
function runCustomChecks(filePath) {
  const violations = [];

  try {
    if (!fs.existsSync(filePath)) return violations;
    const content = fs.readFileSync(filePath, 'utf8');

    // no-any: Check for TypeScript 'any' type usage
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      const anyMatches = content.match(/:\s*any\b/g);
      if (anyMatches && anyMatches.length > 0) {
        violations.push({
          rule: 'no-any',
          file: filePath,
          message: `${anyMatches.length} 'any' type(s) found — use 'unknown', generics, or explicit types`
        });
      }
    }

    // no-hardcoded-ips: Check for hardcoded IP addresses
    const ipPattern = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
    const ips = content.match(ipPattern);
    if (ips && ips.length > 0) {
      const realIps = ips.filter(ip => !ip.startsWith('0.') && ip !== '127.0.0.1' && ip !== '0.0.0.0');
      if (realIps.length > 0) {
        violations.push({
          rule: 'no-hardcoded-ips',
          file: filePath,
          message: `Hardcoded IP(s) found: ${realIps.join(', ')} — use environment variables or config`
        });
      }
    }

    // no-hardcoded-strings: Check for hardcoded user-facing strings (simplified)
    if (filePath.endsWith('.tsx') || filePath.endsWith('.php')) {
      const hardcodedJsx = content.match(/>[\u4e00-\u9fff\u0600-\u06ff\u00c0-\u00ff\u0100-\u024f\u1ea0-\u1ef9]+[^<]{3,}</g);
      if (hardcodedJsx && hardcodedJsx.length > 3) {
        violations.push({
          rule: 'no-hardcoded-strings',
          file: filePath,
          message: `${hardcodedJsx.length} hardcoded non-ASCII strings in JSX — use i18n keys`
        });
      }
    }
  } catch (_) {
    // File read error — skip custom checks
  }

  return violations;
}

/**
 * Load and manage retry state for self-fix loop (F03).
 */
function loadRetryState(contextDir) {
  const stateFile = path.join(contextDir, '.quality-retry-state.json');
  try {
    if (fs.existsSync(stateFile)) {
      return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    }
  } catch (_) {
    // Corrupted — reset
  }
  return { retries: {}, spId: '' };
}

function saveRetryState(contextDir, state) {
  const stateFile = path.join(contextDir, '.quality-retry-state.json');
  try {
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf8');
  } catch (_) {
    // Ignore write errors
  }
}

/**
 * Main hook entry point.
 */
async function main() {
  const startTime = Date.now();

  // Read stdin JSON from Claude Code
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let toolInput;
  try {
    toolInput = JSON.parse(input);
  } catch (_) {
    // Invalid stdin — fail-open
    process.exit(0);
  }

  // Extract file path from tool input
  const filePath = sanitizePath(
    toolInput.tool_input?.file_path ||
    toolInput.tool_input?.path ||
    toolInput.file_path ||
    ''
  );

  if (!filePath) {
    process.exit(0); // No file path — nothing to check
  }

  // Load project-level config — check if enabled
  const projectConfig = ruleClassifier.loadProjectConfig();
  if (projectConfig.enabled === false) {
    process.exit(0); // Quality guard disabled
  }

  // Resolve stack from file extension
  const stackKey = ruleClassifier.resolveStackKey(filePath);
  if (!stackKey) {
    process.exit(0); // No matching stack — unsupported file type
  }

  // Load stack-specific quality rules
  const stackRules = ruleClassifier.loadStackRules(stackKey);

  // Collect all violations
  const allViolations = [];

  // Run checks with total timeout guard
  if (Date.now() - startTime < HOOK_TIMEOUT) {
    allViolations.push(...runLinter(filePath, stackRules.linter));
  }
  if (Date.now() - startTime < HOOK_TIMEOUT) {
    allViolations.push(...runTypeCheck(filePath, stackRules.typecheck));
  }
  if (Date.now() - startTime < HOOK_TIMEOUT) {
    allViolations.push(...runAudit());
  }
  if (Date.now() - startTime < HOOK_TIMEOUT) {
    allViolations.push(...runCustomChecks(filePath));
  }

  if (allViolations.length === 0) {
    process.exit(0); // All clean
  }

  // Classify violations using stack-specific rules
  const classified = ruleClassifier.classifyAll(allViolations, stackKey);

  // Self-fix loop: check retry state
  let contextDir = process.cwd();
  try {
    const sm = require(path.join(EPS_ROOT, 'core', 'state', 'state-manager.js'));
    contextDir = sm.findActiveContext() || process.cwd();
  } catch (_) {}

  const retryState = loadRetryState(contextDir);
  const maxRetries = projectConfig.maxRetries || 3;

  // Process critical violations through retry tracking
  const blockingViolations = [];
  for (const v of classified.critical) {
    const key = `${v.file}:${v.rule}`;
    const count = retryState.retries[key] || 0;

    if (count >= maxRetries) {
      // Exhausted retries — log as debt, don't block
      debtTracker.appendEntry({
        sp: retryState.spId,
        file: v.file,
        rule: v.rule,
        severity: 'critical',
        message: v.message,
        status: 'open'
      });
    } else {
      retryState.retries[key] = count + 1;
      blockingViolations.push(v);
    }
  }

  // Log all warnings as debt
  for (const v of classified.warning) {
    debtTracker.appendEntry({
      sp: retryState.spId,
      file: v.file,
      rule: v.rule,
      severity: 'warning',
      message: v.message,
      status: 'open'
    });
  }

  saveRetryState(contextDir, retryState);

  // Check if consolidation needed
  if (consolidationTrigger.shouldTrigger()) {
    process.stderr.write('\n[quality-check] CONSOLIDATION RECOMMENDED: debt threshold exceeded.\n');
    process.stderr.write('Run consolidation skill to clean up accumulated debt.\n\n');
  }

  // Output results
  if (blockingViolations.length > 0) {
    const output = blockingViolations.map(v =>
      `[CRITICAL] ${v.rule}: ${v.file} — ${v.message}`
    ).join('\n');

    if (classified.warning.length > 0) {
      const warnings = classified.warning.map(v =>
        `[WARNING] ${v.rule}: ${v.file} — ${v.message}`
      ).join('\n');
      process.stderr.write(output + '\n' + warnings + '\n');
    } else {
      process.stderr.write(output + '\n');
    }

    process.exit(2); // Block — critical violations need fixing
  }

  // Only warnings — allow but notify
  if (classified.warning.length > 0) {
    const warnings = classified.warning.map(v =>
      `[WARNING] ${v.rule}: ${v.file} — ${v.message}`
    ).join('\n');
    process.stderr.write(warnings + '\n');
  }

  process.exit(0); // Allow — no critical violations
}

main().catch(err => {
  process.stderr.write(`[quality-check] Unexpected error: ${err.message}\n`);
  process.exit(0); // Fail-open
});
