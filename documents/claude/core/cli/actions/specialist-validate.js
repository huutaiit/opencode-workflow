"use strict";

/**
 * specialist-validate — Validate specialist .md file against SPEC-METADATA.md
 *
 * Args:
 *   --file <path>       — specialist file to validate (REQUIRED)
 *   --fix               — show suggested fixes (optional)
 *   --batch <dir>       — validate all specialists in directory (optional)
 *
 * Returns: { valid, errors[], warnings[], fieldCount, file }
 */

const fs = require("fs");
const path = require("path");

// 16 mandatory fields (spec v2.1 — section 3)
// Matches SPEC-METADATA.md v2.4 exactly:
//   6 system-parsed + 4 guidance + 3 tech context (v2.1) + 3 identity (v2.0)
const MANDATORY_FIELDS = [
  // System-Parsed (6 fields)
  { name: "Layer", parserKey: "layer", parsed: true },
  { name: "Directory Pattern", parserKey: "package", parsed: true, aliases: ["Package", "Namespace Pattern", "Module Pattern"] },
  { name: "Variant", parserKey: "variant", parsed: true },
  { name: "Naming Convention", parserKey: "naming", parsed: true },
  { name: "Imports From", parserKey: "importsfrom", parsed: true },
  { name: "Cannot Import", parserKey: "cannotimport", parsed: true },
  // Guidance (4 fields)
  { name: "Pattern Numbers", parserKey: null, parsed: false },
  { name: "Source Paths", parserKey: null, parsed: false },
  { name: "File Count", parserKey: null, parsed: false },
  { name: "Imported By", parserKey: null, parsed: false },
  // v2.1 Tech Context (3 fields — replace deprecated Framework, Architecture, Implementation Patterns)
  { name: "Dependencies", parserKey: "dependencies", parsed: true },
  { name: "When To Use", parserKey: "whentouse", parsed: true },
  { name: "Source Skeleton", parserKey: "sourceskeleton", parsed: true },
  // v2.0 Identity (3 fields)
  { name: "Specialist Type", parserKey: "specialisttype", parsed: true },
  { name: "Purpose", parserKey: "purpose", parsed: true },
  { name: "Activation Trigger", parserKey: "activationtrigger", parsed: true },
];

// Backward compat: fields deprecated in v2.1. If found, no error. If missing, no error.
const DEPRECATED_FIELDS = ["Framework", "Architecture", "Implementation Patterns"];

const KNOWN_FRAMEWORKS = [
  "java-spring-boot", "react", "nextjs", "csharp-dotnet-core",
  "python-fastapi", "python-django", "nestjs", "nodejs", "php-laravel",
];

const KNOWN_LAYERS = [
  "Domain", "Application", "Infrastructure", "Presentation", "Core",
  "Test", "Shared", "App", "Pages", "Widgets", "Features", "Entities",
  "Components", "Hooks", "Services", "Store", "WebAPI",
];

function validateSpecialist(filePath) {
  const errors = [];
  const warnings = [];

  if (!fs.existsSync(filePath)) {
    return { valid: false, errors: [`File not found: ${filePath}`], warnings: [], fieldCount: 0, file: filePath };
  }

  const content = fs.readFileSync(filePath, "utf8");
  const fileName = path.basename(filePath);

  // 1. Check Architecture Metadata section exists
  const metaMatch = content.match(/## Architecture Metadata[\s\S]*?(?=\n---|\n## [^A])/);
  if (!metaMatch) {
    errors.push("MISSING: '## Architecture Metadata' section not found");
    return { valid: false, errors, warnings, fieldCount: 0, file: fileName };
  }

  const metaBlock = metaMatch[0];
  const rows = metaBlock.split("\n").filter(l => l.startsWith("|") && !l.includes("---") && !l.includes("Property"));

  // 2. Extract fields from table
  const foundFields = new Map();
  for (const row of rows) {
    const cols = row.split("|").map(c => c.trim()).filter(Boolean);
    if (cols.length >= 2) {
      const key = cols[0].replace(/\*\*/g, "").trim();
      const value = cols[1].trim();
      foundFields.set(key, value);
    }
  }

  // 3. Check each mandatory field
  let fieldCount = 0;
  for (const field of MANDATORY_FIELDS) {
    const allNames = [field.name, ...(field.aliases || [])];
    const found = allNames.find(n => foundFields.has(n));

    if (!found) {
      errors.push(`MISSING FIELD: '${field.name}' not found in Architecture Metadata table`);
    } else {
      fieldCount++;
      const value = foundFields.get(found);

      // Check bare N/A
      if (value === "N/A") {
        errors.push(`BARE N/A: '${found}' = 'N/A' without justification. Spec requires explanation in parentheses if N/A is valid.`);
      }

      // Field-specific validations
      if (found === "Layer" || found === field.name && field.name === "Layer") {
        if (value === "ALL" && !value.includes("(")) {
          errors.push(`LAZY ALL: 'Layer' = 'ALL' without justification. Must include reason in parentheses.`);
        }
      }

      if (found === "Framework" || field.parserKey === "framework") {
        const fwValue = value.toLowerCase().trim();
        if (!KNOWN_FRAMEWORKS.includes(fwValue) && fwValue !== "n/a") {
          warnings.push(`UNKNOWN FRAMEWORK: '${value}' not in known list: ${KNOWN_FRAMEWORKS.join(", ")}`);
        }
      }

      if (found === "Pattern Numbers" || field.name === "Pattern Numbers") {
        if (!value.match(/\d+\.\d+/)) {
          warnings.push(`PATTERN FORMAT: '${value}' should contain N.N format (e.g., '101.1-101.12')`);
        }
      }

      if (found === "Source Paths" || field.name === "Source Paths") {
        if (!value.includes("/") && !value.includes("*")) {
          warnings.push(`SOURCE PATHS: '${value}' should contain path separators or glob patterns`);
        }
      }

      // v2.0: Specialist Type validation
      if (found === "Specialist Type" || field.parserKey === "specialisttype") {
        const validTypes = ["code", "rule-set", "architecture"];
        if (!validTypes.includes(value.toLowerCase().trim())) {
          errors.push(`INVALID TYPE: 'Specialist Type' = '${value}' — must be one of: ${validTypes.join(", ")}`);
        }
      }

      // v2.0: Purpose validation
      if (found === "Purpose" || field.parserKey === "purpose") {
        const startsWithVerb = /^(Generate|Enforce|Define|Validate|Create|Configure|Detect|Build|Manage|Implement)/i.test(value);
        if (!startsWithVerb) {
          warnings.push(`PURPOSE FORMAT: '${value.substring(0, 40)}...' should start with a verb (Generate, Enforce, Define, etc.)`);
        }
      }

      // v2.0: Activation Trigger validation
      if (found === "Activation Trigger" || field.parserKey === "activationtrigger") {
        const hasTrigger = /files:|keywords:|phase:/i.test(value);
        if (!hasTrigger) {
          warnings.push(`TRIGGER FORMAT: '${value.substring(0, 40)}...' should contain 'files:', 'keywords:', or 'phase:' prefix`);
        }
      }
    }
  }

  const valid = errors.length === 0;
  return { valid, errors, warnings, fieldCount, file: fileName };
}

function validateBatch(dirPath) {
  const results = [];
  const files = [];

  // Recursively find all *-specialist.md files
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name));
      } else if (entry.name.endsWith("-specialist.md") && !entry.name.startsWith("_")) {
        files.push(path.join(dir, entry.name));
      }
    }
  }

  walk(dirPath);

  for (const file of files) {
    results.push(validateSpecialist(file));
  }

  return results;
}

module.exports = {
  run: async function (ctx) {
    const { args, pkgRoot } = ctx;

    if (args.test) {
      return { test: true, available: true };
    }

    if (args.batch) {
      const dirPath = path.resolve(pkgRoot, args.batch);
      const results = validateBatch(dirPath);

      const total = results.length;
      const passed = results.filter(r => r.valid).length;
      const failed = total - passed;

      const summary = {
        total,
        passed,
        failed,
        results: results.map(r => ({
          file: r.file,
          valid: r.valid,
          fieldCount: r.fieldCount,
          errors: r.errors.length,
          warnings: r.warnings.length,
        })),
      };

      // Show details for failures
      if (args.fix) {
        summary.details = results.filter(r => !r.valid).map(r => ({
          file: r.file,
          errors: r.errors,
          warnings: r.warnings,
        }));
      }

      return summary;
    }

    if (!args.file) {
      return { error: "--file <path> is required (or --batch <dir> for batch validation)" };
    }

    const filePath = path.resolve(pkgRoot, args.file);
    return validateSpecialist(filePath);
  },
};
