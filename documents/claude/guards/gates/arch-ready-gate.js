#!/usr/bin/env node

/**
 * Architecture-Ready Gate
 * Validates that architecture prerequisites are met before allowing
 * the streamlined arch-ready workflow (skip research/innovate/SRS).
 *
 * Prerequisites:
 *   P1: project-config.json has sourceRoots
 *   P2: feature-dictionary.json has populated modules
 *   P3: ADR files exist in architecture docs
 *
 * Usage:
 *   node guards/gates/arch-ready-gate.js [--project-dir <path>]
 *
 * Exit codes:
 *   0 = all prerequisites met (JSON output with details)
 *   1 = prerequisites not met (JSON output with failures)
 *
 * EPS Framework v10.0
 */

const fs = require("fs");
const path = require("path");

class ArchReadyGate {
  constructor(projectDir) {
    this.projectDir = projectDir || process.cwd();
    this.results = [];
  }

  /**
   * P1: project-config.json has required fields (sourceRoots)
   */
  checkProjectConfig() {
    const configPaths = [
      path.join(this.projectDir, ".claude", "config", "project-config.json"),
      path.join(this.projectDir, "config", "project-config.json"),
    ];

    let configFile = null;
    for (const p of configPaths) {
      if (fs.existsSync(p)) {
        configFile = p;
        break;
      }
    }

    if (!configFile) {
      this.results.push({
        code: "P1",
        name: "project-config",
        passed: false,
        message: "project-config.json not found",
      });
      return;
    }

    try {
      const config = JSON.parse(fs.readFileSync(configFile, "utf-8"));
      const hasSourceRoots = Array.isArray(config.sourceRoots) && config.sourceRoots.length > 0;

      if (hasSourceRoots) {
        this.results.push({
          code: "P1",
          name: "project-config",
          passed: true,
          message: `sourceRoots: ${config.sourceRoots.length}`,
          path: configFile,
        });
      } else {
        this.results.push({
          code: "P1",
          name: "project-config",
          passed: false,
          message: "Missing required field: sourceRoots",
          path: configFile,
        });
      }
    } catch (e) {
      this.results.push({
        code: "P1",
        name: "project-config",
        passed: false,
        message: `Failed to parse: ${e.message}`,
        path: configFile,
      });
    }
  }

  /**
   * P2: feature-dictionary.json has populated modules
   */
  checkFeatureDictionary() {
    const fdPaths = [
      path.join(this.projectDir, ".claude", "config", "feature-dictionary.json"),
      path.join(this.projectDir, "config", "feature-dictionary.json"),
    ];

    let fdFile = null;
    for (const p of fdPaths) {
      if (fs.existsSync(p)) {
        fdFile = p;
        break;
      }
    }

    if (!fdFile) {
      this.results.push({
        code: "P2",
        name: "feature-dictionary",
        passed: false,
        message: "feature-dictionary.json not found",
      });
      return;
    }

    try {
      const fd = JSON.parse(fs.readFileSync(fdFile, "utf-8"));
      const moduleCount = Object.keys(fd.modules || {}).length;

      if (moduleCount > 0) {
        this.results.push({
          code: "P2",
          name: "feature-dictionary",
          passed: true,
          message: `${moduleCount} modules defined`,
          path: fdFile,
        });
      } else {
        this.results.push({
          code: "P2",
          name: "feature-dictionary",
          passed: false,
          message: "No modules defined in feature-dictionary.json (modules is empty)",
          path: fdFile,
        });
      }
    } catch (e) {
      this.results.push({
        code: "P2",
        name: "feature-dictionary",
        passed: false,
        message: `Failed to parse: ${e.message}`,
        path: fdFile,
      });
    }
  }

  /**
   * P3: ADR files exist in architecture docs
   */
  checkADRs() {
    const adrSearchDirs = [
      path.join(this.projectDir, "documents", "architecture"),
      path.join(this.projectDir, "docs", "architecture"),
      path.join(this.projectDir, "architecture"),
    ];

    let adrFiles = [];
    let searchDir = null;

    for (const dir of adrSearchDirs) {
      if (fs.existsSync(dir)) {
        searchDir = dir;
        try {
          const files = fs.readdirSync(dir, { recursive: true });
          adrFiles = files.filter(f =>
            typeof f === "string" && /adr[-_]?\d+/i.test(f) && f.endsWith(".md")
          );
        } catch (e) {
          // ignore read errors
        }
        if (adrFiles.length > 0) break;
      }
    }

    if (adrFiles.length > 0) {
      this.results.push({
        code: "P3",
        name: "adr-decisions",
        passed: true,
        message: `${adrFiles.length} ADR files found in ${searchDir}`,
        path: searchDir,
        files: adrFiles.slice(0, 10), // sample
      });
    } else {
      this.results.push({
        code: "P3",
        name: "adr-decisions",
        passed: false,
        message: searchDir
          ? `No ADR files (adr-*.md) found in ${searchDir}`
          : "No architecture docs directory found (checked: documents/architecture/, docs/architecture/, architecture/)",
      });
    }
  }

  /**
   * Run all checks and return summary
   */
  validate() {
    this.checkProjectConfig();
    this.checkFeatureDictionary();
    this.checkADRs();

    const allPassed = this.results.every(r => r.passed);
    const passedCount = this.results.filter(r => r.passed).length;

    return {
      passed: allPassed,
      score: `${passedCount}/${this.results.length}`,
      checks: this.results,
      message: allPassed
        ? "All architecture prerequisites met. Arch-ready workflow is available."
        : `${this.results.length - passedCount} prerequisite(s) failed. Use full workflow (/research → /innovate → /design) or complete architecture docs first.`,
    };
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  let projectDir = process.cwd();

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--project-dir" && args[i + 1]) {
      projectDir = args[i + 1];
      i++;
    }
  }

  const gate = new ArchReadyGate(projectDir);
  const result = gate.validate();

  console.log(JSON.stringify(result, null, 2));
  process.exit(result.passed ? 0 : 1);
}

module.exports = { ArchReadyGate };
