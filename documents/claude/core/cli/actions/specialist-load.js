"use strict";

/**
 * specialist-load — Load specialist .md file content
 * Resolves specialist directory from stack config (via StackResolver)
 * and reads a specific specialist file by name.
 *
 * Args:
 *   --type [document|code]  — specialist category (REQUIRED)
 *   --category <string>     — subfolder (document: srs, basic-design, etc. | code: test-plan, testing, etc.)
 *   --name <string>         — specialist file name without .md (REQUIRED unless --list)
 *   --stack <stackKey>      — override stack (optional)
 *   --variant <variantId>   — override variant (optional)
 *   --list                  — list available specialists for type/category
 *
 * Returns: { name, type, category, content, path, lines }
 */

const fs = require("fs");
const path = require("path");

/**
 * Recursively find a specialist .md file within a directory tree.
 * Checks the base directory first (flat lookup), then searches subdirectories.
 * @param {string} baseDir - Root specialist directory
 * @param {string} name - Specialist file name without .md
 * @returns {string|null} Full path to the specialist file, or null if not found
 */
function findSpecialistFile(baseDir, name) {
  if (!fs.existsSync(baseDir)) return null;

  const target = `${name}.md`;

  // Recursive walk — matches _scanSpecialists() behavior (stack-resolver.js:367-376)
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('_')) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = walk(full);
        if (found) return found;
      } else if (entry.name === target) {
        return full;
      }
    }
    return null;
  };

  return walk(baseDir);
}

// ═══════════════════════════════════════════════════════
// EXECUTE-VALIDATE-FIX: Source-path resolution functions
// ═══════════════════════════════════════════════════════

/**
 * Parse _INDEX.md "Source Path → Specialist Lookup" table (Tier 3)
 * @param {string} indexContent - Raw markdown content of _INDEX.md
 * @returns {Array<{ pattern: string, specialists: Array<{ name: string, patternNumbers: string[] }> }>}
 */
function parseIndexTable(indexContent) {
  const entries = [];
  const lines = indexContent.split('\n');
  let inTable = false;

  for (const line of lines) {
    if (line.includes('Source Path') && line.includes('Specialist')) {
      inTable = true;
      continue;
    }
    if (inTable && line.startsWith('|---')) continue;
    if (inTable && line.startsWith('|')) {
      const cols = line.split('|').map(c => c.trim()).filter(Boolean);
      if (cols.length >= 2) {
        const rawPattern = cols[0];
        const specParts = cols[1].split(',').map(s => s.trim());
        const specialists = specParts.map(sp => {
          const match = sp.match(/^(.+?)\s*\(([^)]+)\)$/);
          return match
            ? { name: match[1].trim(), patternNumbers: [match[2].trim()] }
            : { name: sp, patternNumbers: [] };
        });

        // Strip backticks and split comma-separated patterns
        const subPatterns = rawPattern
          .split(/,\s*/)
          .map(p => p.replace(/`/g, '').trim())
          .filter(Boolean);

        for (const pattern of subPatterns) {
          entries.push({ pattern, specialists });
        }
      }
    } else if (inTable && !line.startsWith('|')) {
      inTable = false;
    }
  }
  return entries;
}

/**
 * Match input source path against _INDEX.md patterns
 * Supports wildcard {moduleCode} and glob * patterns
 * @param {string} sourcePath - e.g. "com.example.app.application.service.customer.CustomerService"
 * @param {Array} indexEntries - parsed from parseIndexTable()
 * @returns {Array<{ name: string, patternNumbers: string[] }>} all matched specialists
 */
function matchSourcePath(sourcePath, indexEntries) {
  const matched = [];
  const normalized = sourcePath.replace(/^com\.\w+\.app\.?/, '.');

  for (const entry of indexEntries) {
    const regexStr = entry.pattern
      .replace(/\./g, '\\.')
      .replace(/\{moduleCode\}/g, '[\\w]+')
      .replace(/\*/g, '.*');
    const regex = new RegExp(regexStr);

    if (regex.test(normalized) || regex.test(sourcePath)) {
      matched.push(...entry.specialists);
    }
  }

  const unique = new Map();
  for (const spec of matched) {
    if (unique.has(spec.name)) {
      const existing = unique.get(spec.name);
      existing.patternNumbers.push(...spec.patternNumbers);
    } else {
      unique.set(spec.name, { ...spec, patternNumbers: [...spec.patternNumbers] });
    }
  }
  return [...unique.values()];
}

/**
 * Parse Architecture Metadata table from specialist .md file (Tier 4)
 * @param {string} content - Raw markdown content of specialist file
 * @returns {{ layer, package, variant, importsFrom, cannotImport, namingConvention, framework, architecture, implementationPatterns, dependencies, whenToUse, sourceSkeleton } | null}
 */
function parseArchMetadata(content) {
  const metaMatch = content.match(/## Architecture Metadata[\s\S]*?\r?\n\r?\n---/);
  if (!metaMatch) return null;

  const block = metaMatch[0];
  const fields = {};
  const rows = block.split('\n').filter(l => l.startsWith('|') && !l.includes('---') && !l.includes('Field'));

  for (const row of rows) {
    const cols = row.split('|').map(c => c.trim()).filter(Boolean);
    if (cols.length >= 2) {
      const key = cols[0].toLowerCase().replace(/[\s*]+/g, '');
      const value = cols[1];
      if (key === 'layer') fields.layer = value;
      else if (key === 'package') fields.package = value;
      else if (key === 'variant') fields.variant = value;
      else if (key.includes('importsfrom')) fields.importsFrom = value.split(',').map(s => s.trim());
      else if (key.includes('cannotimport')) fields.cannotImport = value.split(',').map(s => s.trim());
      else if (key.includes('naming')) fields.namingConvention = value;
      // 5-dimension model fields (BD D5) — framework/architecture kept for backward compat
      else if (key === 'framework') fields.framework = value;
      else if (key === 'architecture') fields.architecture = value;
      else if (key.includes('implementationpatterns')) {
        fields.implementationPatterns = value && value !== 'N/A'
          ? value.split(',').map(s => s.trim()).filter(Boolean)
          : [];
      }
      // New metadata fields (v2) — tech context
      else if (key === 'dependencies') {
        fields.dependencies = value && value !== 'none'
          ? value.split(',').map(s => s.trim()).filter(Boolean)
          : [];
      }
      else if (key.includes('whentouse')) fields.whenToUse = value;
      else if (key.includes('sourceskeleton')) {
        fields.sourceSkeleton = value && value !== 'none'
          ? value.split(',').map(s => s.trim()).filter(Boolean)
          : [];
      }
    }
  }
  return Object.keys(fields).length > 0 ? fields : null;
}

/**
 * Check variant compatibility between specialist and project (Gap G2)
 * @param {object} metadata - parsed Architecture Metadata
 * @param {string} projectVariant - variant ID (e.g. "reactive", "clean-modulith")
 * @param {string} [variantName] - variant display name from stack JSON (e.g. "Clean-Modulith Stack (Blocking + Virtual Threads)")
 * @returns {string|null} warning message if mismatch, null if compatible
 */
function checkVariantCompat(metadata, projectVariant, variantName) {
  if (!metadata || !metadata.variant) return null;

  // ALL / All variants = compatible with everything
  if (metadata.variant === 'ALL' || metadata.variant.startsWith('All')) return null;

  // No variant name from stack config → skip check
  if (!variantName) return null;

  // Compare: first word of variantName against metadata.variant
  const keyword = variantName.split(' ')[0];
  if (!metadata.variant.includes(keyword)) {
    return `Specialist variant '${metadata.variant}' does not match project variant '${projectVariant}'`;
  }
  return null;
}

/**
 * Extract target architecture layer from source path
 * @param {string} sourcePath
 * @returns {string|null} "Domain" | "Application" | "Infrastructure" | "Presentation" | null
 */
function extractTargetLayer(sourcePath) {
  if (sourcePath.includes('.domain.')) return 'Domain';
  if (sourcePath.includes('.application.service.') || sourcePath.includes('.application.port.')) return 'Application';
  if (sourcePath.includes('.infrastructure.')) return 'Infrastructure';
  if (sourcePath.includes('.presentation.') || sourcePath.includes('.controller.')) return 'Presentation';
  return null;
}

/**
 * Rank specialists by 3 criteria: variant match (50%), layer specificity (30%), pattern count (20%)
 * @param {Array} specialists - with metadata and patternNumbers
 * @param {string} projectVariant - variant ID from StackResolver
 * @param {string|null} targetLayer - from extractTargetLayer
 * @param {string} [variantName] - variant display name from stack JSON
 * @returns {{ specialists: Array, primarySpecialist: string|null }}
 */
function rankSpecialists(specialists, projectVariant, targetLayer, variantName) {
  const ranked = specialists.map(spec => {
    let score = 0;
    const reasons = [];

    // Criterion 1: Variant match (50%)
    if (spec.metadata && spec.metadata.variant) {
      const warning = checkVariantCompat(spec.metadata, projectVariant, variantName);
      if (!warning) { score += 50; reasons.push('variant:match(50)'); }
      else { reasons.push('variant:mismatch(0)'); }
    } else {
      score += 25; reasons.push('variant:neutral(25)');
    }

    // Criterion 2: Layer specificity (30%)
    if (spec.metadata && spec.metadata.layer && targetLayer) {
      if (spec.metadata.layer === targetLayer) { score += 30; reasons.push('layer:exact(30)'); }
      else { score += 5; reasons.push('layer:different(5)'); }
    } else {
      score += 15; reasons.push('layer:generic(15)');
    }

    // Criterion 3: Pattern count (20%)
    const patternCount = (spec.patternNumbers || []).length;
    const patternScore = Math.min(patternCount * 10, 20);
    score += patternScore;
    reasons.push(`patterns:${patternCount}(${patternScore})`);

    return {
      ...spec,
      rankScore: score,
      rankRole: score >= 70 ? 'primary' : 'supplementary',
      rankReason: reasons.join(' + '),
    };
  });

  ranked.sort((a, b) => b.rankScore - a.rankScore);

  return {
    specialists: ranked,
    primarySpecialist: ranked.find(s => s.rankRole === 'primary')?.name || null,
  };
}

// Export parseArchMetadata for use by stack-resolver.js _scanSpecialists()
module.exports = {
  parseArchMetadata,
  findSpecialistFile,
  run: async function (ctx) {
    const { args, pkgRoot } = ctx;

    if (args.test) {
      return { test: true, available: true };
    }

    const type = args.type;
    if (!type || !["document", "code"].includes(type)) {
      return { error: "--type must be 'document' or 'code'" };
    }

    // EXECUTE-VALIDATE-FIX: --source-path flow (Tier 3+4 resolution)
    if (args.sourcePath && type === "code") {
      try {
        const { StackResolver } = require(path.join(pkgRoot, "core/state/stack-resolver"));
        const resolver = new StackResolver();
        await resolver.loadStacks();

        const defaults = resolver.getDefaults();
        const stackKey = args.stack || (defaults.primary && defaults.primary.stackKey) || null;
        const variantId = args.variant || (defaults.primary && defaults.primary.variantId) || null;

        if (!stackKey) {
          return { ok: false, error: "No stack key found. Use --stack or set project-config.json" };
        }

        const variantConfig = resolver.getVariant(stackKey, variantId);
        const variantName = variantConfig.name || null;
        const specialistDirName = resolver.getSpecialistDir(stackKey, variantId);
        const indexPath = path.join(pkgRoot, "specialists/code", specialistDirName, "_INDEX.md");

        if (!fs.existsSync(indexPath)) {
          return { ok: false, error: `_INDEX.md not found at ${indexPath}` };
        }

        const indexContent = fs.readFileSync(indexPath, "utf8");
        const indexEntries = parseIndexTable(indexContent);
        const matchedSpecs = matchSourcePath(args.sourcePath, indexEntries);

        if (matchedSpecs.length === 0) {
          return { ok: true, specialists: [], matchCount: 0, note: "No specialists matched" };
        }

        const specBaseDir = path.join(pkgRoot, "specialists/code", specialistDirName);
        const results = [];

        for (const specRef of matchedSpecs) {
          const specPath = findSpecialistFile(specBaseDir, specRef.name);
          if (!specPath) continue;

          const content = fs.readFileSync(specPath, "utf8");
          const entry = {
            name: specRef.name, content, path: specPath,
            lines: content.split("\n").length,
            patternNumbers: specRef.patternNumbers,
          };

          if (args.parseMetadata) {
            entry.metadata = parseArchMetadata(content);
          }

          if (args.filterVariant && entry.metadata) {
            entry.variantWarning = checkVariantCompat(entry.metadata, variantId, variantName);
          }

          results.push(entry);
        }

        const targetLayer = extractTargetLayer(args.sourcePath);
        const ranked = rankSpecialists(results, variantId, targetLayer, variantName);

        return {
          ok: true, type: "code", stackKey, variantId,
          sourcePath: args.sourcePath,
          specialists: ranked.specialists,
          primarySpecialist: ranked.primarySpecialist,
          matchCount: ranked.specialists.length,
        };
      } catch (err) {
        return { ok: false, error: `Source-path resolution failed: ${err.message}` };
      }
    }

    let specDir;
    let stackKey, variantId, specialistDirName;

    if (type === "document") {
      const category = args.category;
      if (!category && !args.list) {
        return { error: "--category is required for document type" };
      }
      specDir = path.join(pkgRoot, "specialists/document", category || "");
    } else {
      // code type — resolve via StackResolver
      try {
        const { StackResolver } = require(path.join(pkgRoot, "core/state/stack-resolver"));
        const resolver = new StackResolver();
        await resolver.loadStacks();

        const defaults = resolver.getDefaults();
        stackKey = args.stack || (defaults.primary && defaults.primary.stackKey) || null;
        variantId = args.variant || (defaults.primary && defaults.primary.variantId) || null;

        if (!stackKey) {
          return { error: "No stack key found. Use --stack or set project-config.json" };
        }

        specialistDirName = resolver.getSpecialistDir(stackKey, variantId);
        specDir = path.join(pkgRoot, "specialists/code", specialistDirName);

        // Append --category subdirectory if provided (e.g., test-plan, testing)
        if (args.category) {
          specDir = path.join(specDir, args.category);
        }

        // For --list mode on code type
        if (args.list) {
          if (args.category) {
            // List files in category subdirectory
            if (!fs.existsSync(specDir)) {
              return { error: `Directory not found: ${specDir}`, type, category: args.category };
            }
            const files = fs.readdirSync(specDir).filter((f) => f.endsWith(".md") && !f.startsWith("_"));
            return {
              type,
              stackKey,
              variantId,
              specialistDir: specialistDirName,
              category: args.category,
              specialists: files.map((f) => f.replace(".md", "")),
              count: files.length,
            };
          }
          // No category: use resolver's top-level specialist list + shared specialists
          const specialists = resolver.getSpecialists(stackKey, variantId);

          // Also scan _shared/ subdirectories for shared specialists
          const sharedBase = path.join(pkgRoot, "specialists/code/_shared");
          const sharedSpecialists = [];
          if (fs.existsSync(sharedBase)) {
            fs.readdirSync(sharedBase, { withFileTypes: true })
              .filter(d => d.isDirectory())
              .forEach(d => {
                const sharedDir = path.join(sharedBase, d.name);
                fs.readdirSync(sharedDir)
                  .filter(f => f.endsWith(".md") && !f.startsWith("_"))
                  .forEach(f => sharedSpecialists.push(f.replace(".md", "")));
              });
          }

          return {
            type,
            stackKey,
            variantId,
            specialistDir: specialistDirName,
            specialists: [...specialists, ...sharedSpecialists],
            sharedSpecialists,
            count: specialists.length + sharedSpecialists.length,
          };
        }
      } catch (err) {
        return { error: `StackResolver failed: ${err.message}` };
      }
    }

    // --list mode for document type
    if (args.list) {
      if (!fs.existsSync(specDir)) {
        return { error: `Directory not found: ${specDir}`, type, category: args.category };
      }
      const files = fs.readdirSync(specDir).filter((f) => f.endsWith(".md") && !f.startsWith("_"));
      return {
        type,
        category: args.category,
        specialists: files.map((f) => f.replace(".md", "")),
        count: files.length,
      };
    }

    // --name is required for non-list mode
    const name = args.name;
    if (!name) {
      return { error: "--name is required (specialist file name without .md)" };
    }

    // Read specialist file — check stack-specific dir (with subfolder search), then _shared/ fallback
    let specPath = (type === "code") ? findSpecialistFile(specDir, name) : null;
    if (!specPath) specPath = path.join(specDir, `${name}.md`);
    let resolvedCategory = args.category || specialistDirName;

    if (!fs.existsSync(specPath) && type === "code") {
      // Fallback: search _shared/ subdirectories
      const sharedBase = path.join(pkgRoot, "specialists/code/_shared");
      if (fs.existsSync(sharedBase)) {
        const sharedDirs = fs.readdirSync(sharedBase, { withFileTypes: true })
          .filter(d => d.isDirectory());
        for (const d of sharedDirs) {
          const sharedPath = path.join(sharedBase, d.name, `${name}.md`);
          if (fs.existsSync(sharedPath)) {
            specPath = sharedPath;
            resolvedCategory = `_shared/${d.name}`;
            break;
          }
        }
      }
    }

    if (!fs.existsSync(specPath)) {
      return {
        error: `Specialist not found: ${specPath}`,
        name,
        type,
        category: resolvedCategory,
      };
    }

    const content = fs.readFileSync(specPath, "utf8");

    return {
      name,
      type,
      category: resolvedCategory,
      content,
      path: specPath,
      lines: content.split("\n").length,
    };
  },
};
