#!/usr/bin/env node
"use strict";

/**
 * CLI wrapper for GeminiIntegrator v2.0
 * Subprocess solution for reliable Gemini calls from INNOVATE commands.
 *
 * NEW in v2.0:
 *   --context-dir      Auto-load all files from memory-bank context directory
 *   --conversation     Claude's conversation summary injection
 *   --conversation-file  Load conversation from file (for multiline)
 *   --rag-query        Query RAG before Gemini (default: true)
 *   --rag-layers       Comma-separated RAG layers to query
 *   --no-rag           Skip RAG query
 *   --rag-only         Only query RAG, no Gemini call
 *   --verbose          Show debug output
 *   --dry-run          Show input without calling Gemini
 *
 * Usage:
 *   # Mode 1: Context directory (recommended)
 *   node call-gemini.js --type INNOVATE_BD --context-dir .claude/memory-bank/master/USR-auth-cuong
 *
 *   # Mode 2: Explicit files (backward compatible)
 *   node call-gemini.js --type INNOVATE_SRS --evidence <file> [options]
 *
 * Exit codes:
 *   0 - Success
 *   1 - Gemini unavailable or initialization failed
 *   2 - Invalid arguments
 *   3 - Required file not found
 *   4 - Gemini API error
 *   5 - RAG query error
 *
 * Version: 2.0.0
 */

const fs = require("fs");
const path = require("path");
const http = require("http");

// ============================================================================
// ARGUMENT PARSING
// ============================================================================

function parseArgs(argv) {
  const args = {
    // v1.0 flags (backward compatible)
    type: null,
    evidence: null,
    srs: null,
    bd: null,
    arch: null,
    feature: null,
    taskType: "new",
    taskSummary: "",
    constraints: "",
    output: "json",
    outputFile: null,
    // v2.0 new flags
    contextDir: null,
    conversation: null,
    ragQuery: true,
    ragLayers: null,
    ragOnly: false,
    verbose: false,
    dryRun: false,
    // v3.0 debate flags
    mode: "generate",
    critiqueFile: null,
    transcriptFile: null,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const nextArg = argv[i + 1];

    switch (arg) {
      // v1.0 flags
      case "--type":
        args.type = nextArg;
        i++;
        break;
      case "--evidence":
        args.evidence = nextArg;
        i++;
        break;
      case "--srs":
        args.srs = nextArg;
        i++;
        break;
      case "--bd":
        args.bd = nextArg;
        i++;
        break;
      case "--arch":
        args.arch = nextArg;
        i++;
        break;
      case "--feature":
        args.feature = nextArg;
        i++;
        break;
      case "--task-type":
        args.taskType = nextArg;
        i++;
        break;
      case "--task-summary":
        args.taskSummary = nextArg;
        i++;
        break;
      case "--constraints":
        args.constraints = nextArg;
        i++;
        break;
      case "--output":
        args.output = nextArg;
        i++;
        break;
      case "--output-file":
        args.outputFile = nextArg;
        i++;
        break;
      // v2.0 new flags
      case "--context-dir":
        args.contextDir = nextArg;
        i++;
        break;
      case "--conversation":
        args.conversation = nextArg;
        i++;
        break;
      case "--conversation-file":
        // Load conversation from file (safer for multiline/special chars)
        const convPath = path.resolve(nextArg);
        if (fs.existsSync(convPath)) {
          args.conversation = fs.readFileSync(convPath, "utf8");
        } else {
          console.error(`[call-gemini] Conversation file not found: ${convPath}`);
        }
        i++;
        break;
      case "--rag-layers":
        args.ragLayers = nextArg.split(",").map((l) => l.trim());
        i++;
        break;
      case "--no-rag":
        args.ragQuery = false;
        break;
      case "--rag-only":
        args.ragOnly = true;
        break;
      case "--verbose":
        args.verbose = true;
        break;
      case "--dry-run":
        args.dryRun = true;
        break;
      // v3.0 debate flags
      case "--mode":
        args.mode = nextArg;
        i++;
        break;
      case "--critique-file": {
        const critPath = path.resolve(nextArg);
        if (fs.existsSync(critPath)) {
          args.critiqueFile = critPath;
        } else {
          console.error(`[call-gemini] Critique file not found: ${critPath}`);
        }
        i++;
        break;
      }
      case "--transcript-file": {
        const transPath = path.resolve(nextArg);
        if (fs.existsSync(transPath)) {
          args.transcriptFile = transPath;
        } else {
          console.error(`[call-gemini] Transcript file not found: ${transPath}`);
        }
        i++;
        break;
      }
      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
    }
  }

  return args;
}

function printUsage() {
  console.log(`
call-gemini.js v2.0 - Subprocess wrapper for Gemini SDK

Usage: node call-gemini.js --type <TYPE> [options]

Modes:
  --context-dir <path>    Auto-load from memory-bank context directory (NEW)
  --evidence <file>       Explicit evidence file path (backward compat)

Types:
  INNOVATE_SRS   Generate SRS business approach alternatives
  INNOVATE_BD    Generate BD architecture alternatives
  INNOVATE_DD    Generate DD technical implementation alternatives

Required for each type:
  INNOVATE_SRS: --evidence (or --context-dir)
  INNOVATE_BD:  --srs --arch (or --context-dir)
  INNOVATE_DD:  --bd (or --context-dir)

Options:
  --type <type>           Required. Type of innovation phase
  --context-dir <path>    Memory-bank context directory (auto-loads files)
  --evidence <file>       Path to evidence.md
  --srs <file>            Path to innovate-srs-selection.md
  --bd <file>             Path to innovate-bd-selection.md
  --arch <file>           Path to architecture file
  --feature <name>        Feature name (auto-detected from context.md)
  --task-type <type>      new | enhancement | bugfix | infrastructure
  --task-summary <text>   Brief task summary
  --conversation <text>   Claude's conversation summary (NEW)
  --conversation-file <f> Load conversation from file (NEW)
  --rag-query             Query RAG before Gemini (default: true) (NEW)
  --rag-layers <list>     Comma-separated RAG layers (NEW)
  --no-rag                Skip RAG query (NEW)
  --rag-only              Only query RAG, no Gemini call (NEW)
  --verbose               Show debug output (NEW)
  --dry-run               Show input without calling Gemini (NEW)
  --output <format>       json | text (default: json)
  --output-file <path>    Write result to file
  --help, -h              Show this help

Exit codes:
  0 - Success
  1 - Gemini unavailable
  2 - Invalid arguments
  3 - Required file not found
  4 - Gemini API error
  5 - RAG query error

Examples:
  # Mode 1: Context directory (recommended)
  node call-gemini.js --type INNOVATE_BD \\
    --context-dir .claude/memory-bank/master/USR-auth-cuong \\
    --output-file cache/gemini-bd.json

  # Mode 2: Explicit files (backward compatible)
  node call-gemini.js --type INNOVATE_SRS \\
    --evidence .claude/memory-bank/master/USR-auth/evidence.md \\
    --feature "user-authentication"

  # With conversation context
  node call-gemini.js --type INNOVATE_BD \\
    --context-dir .claude/memory-bank/master/USR-auth-cuong \\
    --conversation "User prefers minimal scope, focus on core auth only"

  # RAG-only mode (debug)
  node call-gemini.js --type INNOVATE_BD \\
    --context-dir .claude/memory-bank/master/USR-auth-cuong \\
    --rag-only --verbose
`);
}

// ============================================================================
// FILE LOADING
// ============================================================================

function readFileSafe(filePath) {
  if (!filePath) return null;

  // Check if it's inline text (not a file path)
  if (!filePath.includes("/") && !filePath.includes("\\") && !filePath.endsWith(".md")) {
    return filePath; // Return as-is (inline text)
  }

  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    console.error(`[call-gemini] File not found: ${resolvedPath}`);
    return null;
  }

  try {
    return fs.readFileSync(resolvedPath, "utf8");
  } catch (err) {
    console.error(`[call-gemini] Error reading file ${resolvedPath}: ${err.message}`);
    return null;
  }
}

/**
 * v2.0: Load all files from context directory automatically
 */
function loadContextDirectory(contextDir) {
  const resolvedDir = path.resolve(contextDir);
  if (!fs.existsSync(resolvedDir)) {
    console.error(`[call-gemini] Context directory not found: ${resolvedDir}`);
    return null;
  }

  const files = {
    evidence: path.join(resolvedDir, "evidence.md"),
    srs: path.join(resolvedDir, "innovate-srs-selection.md"),
    bd: path.join(resolvedDir, "innovate-bd-selection.md"),
    context: path.join(resolvedDir, "context.md"),
  };

  const contents = {};
  for (const [key, filePath] of Object.entries(files)) {
    if (fs.existsSync(filePath)) {
      contents[key] = fs.readFileSync(filePath, "utf8");
    }
  }

  // Parse context.md for metadata
  if (contents.context) {
    const taskTypeMatch = contents.context.match(/Task Type:\s*(\w+)/i);
    const featureMatch = contents.context.match(/Feature ID:\s*([^\n]+)/i);
    const moduleMatch = contents.context.match(/Module:\s*(\w+)/i);

    contents.metadata = {
      taskType: taskTypeMatch?.[1] || "new",
      feature: featureMatch?.[1]?.trim() || "",
      module: moduleMatch?.[1] || "",
    };
  }

  return contents;
}

// ============================================================================
// RAG INTEGRATION (v2.0)
// ============================================================================

/**
 * Check if RAG server is available with timeout
 */
async function checkRAGAvailability(timeoutMs = 3000) {
  const ragServerPath = path.join(process.cwd(), '.claude/config/rag-server.json');
  const legacyRagPath = path.join(process.cwd(), '.claude/config/hipporag-config.json');
  let ragUrl = "http://localhost:8000";
  try {
    if (fs.existsSync(ragServerPath)) {
      ragUrl = JSON.parse(fs.readFileSync(ragServerPath, 'utf8')).hipporag?.url || ragUrl;
    } else {
      ragUrl = JSON.parse(fs.readFileSync(legacyRagPath, 'utf8')).url || ragUrl;
    }
  } catch (e) {}
  return new Promise((resolve) => {
    const req = http.get(`${ragUrl}/health`, { timeout: timeoutMs }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * Query RAG for context based on innovation type
 */
async function queryRAGContext(type, feature, args) {
  const ragContext = {
    patterns: [],
    conventions: [],
    guidance: [],
    source: "rag",
  };

  // Pre-flight check
  const isAvailable = await checkRAGAvailability();
  if (!isAvailable) {
    if (args.verbose) {
      console.error("[call-gemini] RAG server unavailable");
    }
    ragContext.source = "unavailable";
    return ragContext;
  }

  try {
    // Import RAG service
    const { HippoRAGService } = require('../rag/hipporag-service');

    // Get RAG service instance for _global (EPS knowledge)
    const ragService = HippoRAGService.getInstance("_global", "dev");

    // Determine layers based on innovate type
    const stacks = ragService._getProjectStacks();
    const epsCodeLayers = stacks.map((s) => `eps-code-${s}`);

    const defaultLayers = {
      INNOVATE_SRS: ["eps-doc-srs"],
      INNOVATE_BD: ["eps-doc-basic-design", ...epsCodeLayers, "arch", "code"],
      INNOVATE_DD: ["code", "eps-doc-detail-design-frontend", "eps-doc-detail-design-backend", ...epsCodeLayers],
    };

    const layers = args.ragLayers || defaultLayers[type] || epsCodeLayers;

    if (args.verbose) {
      console.error(`[call-gemini] Querying RAG layers: ${layers.join(", ")}`);
    }

    const result = await ragService.getContext(
      `${feature} architecture patterns service component`,
      { name: "call-gemini" }, // agentDef
      { layers: layers, topK: 5 }
    );

    if (result?.chunks) {
      for (const chunk of result.chunks) {
        const content = chunk.content || chunk.text || "";
        if (!content) continue;

        if (chunk.metadata?.docType === "specialist") {
          // Extract DO/DON'T guidance from specialists
          const guidance = extractGuidance(content);
          ragContext.guidance.push(...guidance);
        } else if (chunk.metadata?.layer === "code") {
          ragContext.conventions.push(content.substring(0, 300));
        } else {
          ragContext.patterns.push(content.substring(0, 500));
        }
      }
    }

    if (args.verbose) {
      console.error(
        `[call-gemini] RAG results: ${ragContext.patterns.length} patterns, ${ragContext.conventions.length} conventions, ${ragContext.guidance.length} guidance`
      );
    }
  } catch (err) {
    console.error(`[call-gemini] RAG query failed: ${err.message}`);
    ragContext.source = "error";
  }

  return ragContext;
}

/**
 * Extract DO/DON'T guidance from specialist content
 */
function extractGuidance(content) {
  const guidance = [];
  const doMatches = content.match(/### ✅ (?:DO|USE)[:\s]*([\s\S]*?)(?=###|$)/gi);
  const dontMatches = content.match(/### ❌ (?:DON'T|DO NOT|AVOID)[:\s]*([\s\S]*?)(?=###|$)/gi);

  if (doMatches) guidance.push(...doMatches.map((m) => m.trim().substring(0, 200)));
  if (dontMatches) guidance.push(...dontMatches.map((m) => m.trim().substring(0, 200)));

  return guidance;
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateArgs(args) {
  const errors = [];

  if (!args.type) {
    errors.push("--type is required");
  } else if (!["INNOVATE_SRS", "INNOVATE_BD", "INNOVATE_DD"].includes(args.type)) {
    errors.push(`Invalid --type: ${args.type}. Must be INNOVATE_SRS, INNOVATE_BD, or INNOVATE_DD`);
  }

  // v3.0: Validate debate mode
  const validModes = ["generate", "refine", "final"];
  if (!validModes.includes(args.mode)) {
    errors.push(`Invalid --mode: ${args.mode}. Must be generate, refine, or final`);
  }

  if (args.mode === "refine" && !args.critiqueFile && !args.contextDir) {
    errors.push("--mode refine requires --critique-file or --context-dir");
  }

  if (args.mode === "final" && !args.transcriptFile && !args.contextDir) {
    errors.push("--mode final requires --transcript-file or --context-dir");
  }

  // If --context-dir is provided, skip individual file validation
  if (args.contextDir) {
    return errors;
  }

  // v3.0: refine/final modes don't need evidence/srs/bd files
  if (args.mode === "refine" || args.mode === "final") {
    return errors;
  }

  // Otherwise, validate individual files (backward compat, generate mode only)
  switch (args.type) {
    case "INNOVATE_SRS":
      if (!args.evidence) {
        errors.push("INNOVATE_SRS requires --evidence or --context-dir");
      }
      break;

    case "INNOVATE_BD":
      if (!args.srs) {
        errors.push("INNOVATE_BD requires --srs or --context-dir");
      }
      if (!args.arch) {
        errors.push("INNOVATE_BD requires --arch or --context-dir");
      }
      break;

    case "INNOVATE_DD":
      if (!args.bd) {
        errors.push("INNOVATE_DD requires --bd or --context-dir");
      }
      break;
  }

  return errors;
}

// ============================================================================
// CONTENT BUILDING
// ============================================================================

function buildCombinedContent(args, contents, ragContext) {
  const sections = [];

  // Add conversation context (v2.0)
  if (args.conversation) {
    sections.push("=== CONVERSATION CONTEXT ===");
    sections.push(args.conversation);
    sections.push("");
  }

  // Add RAG context (v2.0)
  if (ragContext && ragContext.source !== "unavailable" && ragContext.source !== "error") {
    if (ragContext.patterns.length > 0) {
      sections.push("=== RAG: ARCHITECTURE PATTERNS ===");
      sections.push(ragContext.patterns.join("\n---\n"));
      sections.push("");
    }
    if (ragContext.conventions.length > 0) {
      sections.push("=== RAG: CODE CONVENTIONS ===");
      sections.push(ragContext.conventions.join("\n---\n"));
      sections.push("");
    }
    if (ragContext.guidance.length > 0) {
      sections.push("=== RAG: SPECIALIST GUIDANCE ===");
      sections.push(ragContext.guidance.join("\n"));
      sections.push("");
    }
  }

  // Type-specific content
  switch (args.type) {
    case "INNOVATE_SRS":
      sections.push("=== RESEARCH EVIDENCE ===");
      sections.push(contents.evidence || "(No evidence)");
      break;

    case "INNOVATE_BD":
      sections.push("=== SRS SELECTION ===");
      sections.push(contents.srs || "(No SRS selection)");
      sections.push("");
      sections.push("=== ARCHITECTURE CONTEXT ===");
      sections.push(contents.arch || "(No architecture)");
      sections.push("");
      sections.push("=== RESEARCH EVIDENCE ===");
      sections.push(contents.evidence || "(No additional evidence)");
      break;

    case "INNOVATE_DD":
      sections.push("=== BD SELECTION (ARCHITECTURE LOCKED) ===");
      sections.push(contents.bd || "(No BD selection)");
      sections.push("");
      sections.push("=== SRS SELECTION (REQUIREMENTS) ===");
      sections.push(contents.srs || "(No SRS selection)");
      sections.push("");
      sections.push("=== RESEARCH EVIDENCE ===");
      sections.push(contents.evidence || "(No additional evidence)");
      break;
  }

  return sections.join("\n");
}

// ============================================================================
// DEBATE MODE HANDLERS (v3.0)
// ============================================================================

/**
 * Handle debate refine mode (Round 3).
 * Loads critique, appends to transcript, calls Gemini debateRound('refine').
 */
async function handleRefineMode(args, contents, ragContext, gemini) {
  let critiqueContent = "";
  if (args.critiqueFile) {
    critiqueContent = fs.readFileSync(args.critiqueFile, "utf8");
  }

  if (!critiqueContent) {
    console.error("[call-gemini] No critique content available for refine mode");
    process.exit(3);
  }

  let transcript = "";
  if (args.transcriptFile && fs.existsSync(args.transcriptFile)) {
    transcript = fs.readFileSync(args.transcriptFile, "utf8");
  }

  if (!transcript) {
    const evidenceContent = buildCombinedContent(args, contents, ragContext);
    transcript = "### Round 1 — Generate\n[GEMINI] " + evidenceContent.substring(0, 2000) + "\n";
  }

  transcript += "\n### Round 2 — Critique\n";
  const critiqueLines = critiqueContent.split("\n").filter(l => l.trim());
  for (const line of critiqueLines) {
    transcript += "[CLAUDE] " + line + "\n";
  }

  const context = {
    featureName: args.feature || "",
    taskType: args.taskType,
    taskSummary: args.taskSummary,
    userPreferences: args.conversation || "",
  };

  try {
    if (args.verbose) {
      console.error(`[call-gemini] Refine mode: transcript ${transcript.length} chars`);
    }

    const result = await gemini.debateRound("refine", transcript, args.type, context);

    const output = {
      status: "success",
      source: "gemini-debate",
      mode: "refine",
      type: args.type,
      round: 3,
      options: result.options || [],
      raw: result.raw || "",
      timestamp: new Date().toISOString(),
    };

    outputResult(output, args);

    if (args.transcriptFile) {
      const refineSection = "\n### Round 3 — Refine\n" +
        result.raw.split("\n").filter(l => l.trim()).map(l => "[GEMINI] " + l).join("\n") + "\n";
      fs.appendFileSync(args.transcriptFile, refineSection, "utf8");
      if (args.verbose) {
        console.error(`[call-gemini] Transcript updated: ${args.transcriptFile}`);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error(`[call-gemini] Refine mode error: ${err.message}`);
    outputResult({ status: "error", mode: "refine", error: err.message }, args);
    process.exit(4);
  }
}

/**
 * Handle debate final mode (Round 5).
 * Loads full transcript, calls Gemini debateRound('final'), parses convergence.
 */
async function handleFinalMode(args, contents, ragContext, gemini) {
  let transcript = "";
  if (args.transcriptFile) {
    transcript = fs.readFileSync(args.transcriptFile, "utf8");
  }

  if (!transcript || transcript.length < 100) {
    console.error("[call-gemini] Transcript too short for final mode. Need at least R1-R4.");
    process.exit(3);
  }

  if (args.critiqueFile) {
    const r4Critique = fs.readFileSync(args.critiqueFile, "utf8");
    transcript += "\n### Round 4 — Critique\n";
    const critiqueLines = r4Critique.split("\n").filter(l => l.trim());
    for (const line of critiqueLines) {
      transcript += "[CLAUDE] " + line + "\n";
    }
  }

  const context = {
    featureName: args.feature || "",
    taskType: args.taskType,
    taskSummary: args.taskSummary,
    userPreferences: args.conversation || "",
  };

  try {
    if (args.verbose) {
      console.error(`[call-gemini] Final mode: transcript ${transcript.length} chars`);
    }

    const result = await gemini.debateRound("final", transcript, args.type, context);

    const output = {
      status: "success",
      source: "gemini-debate",
      mode: "final",
      type: args.type,
      round: 5,
      convergence: result.convergence,
      raw: result.raw || "",
      timestamp: new Date().toISOString(),
    };

    outputResult(output, args);

    if (args.transcriptFile) {
      const finalSection = "\n### Round 5 — Final\n" +
        result.raw.split("\n").filter(l => l.trim()).map(l => "[GEMINI] " + l).join("\n") + "\n";
      fs.appendFileSync(args.transcriptFile, finalSection, "utf8");
    }

    process.exit(0);
  } catch (err) {
    console.error(`[call-gemini] Final mode error: ${err.message}`);
    outputResult({ status: "error", mode: "final", error: err.message }, args);
    process.exit(4);
  }
}

// ============================================================================
// OUTPUT
// ============================================================================

function outputResult(result, args) {
  let output;

  if (args.output === "text") {
    if (result.status === "success" && result.raw) {
      output = result.raw;
    } else if (result.status === "unavailable") {
      output = `Gemini unavailable: ${result.message}`;
    } else if (result.status === "error") {
      output = `Gemini error: ${result.error}`;
    } else {
      output = JSON.stringify(result, null, 2);
    }
  } else {
    output = JSON.stringify(result, null, 2);
  }

  if (args.outputFile) {
    const outputPath = path.resolve(args.outputFile);
    // Ensure directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, output, "utf8");
    console.error(`[call-gemini] Result written to: ${outputPath}`);
  } else {
    console.log(output);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = parseArgs(process.argv);

  if (args.verbose) {
    console.error("[call-gemini] v2.0 - Starting...");
    console.error(`[call-gemini] Type: ${args.type}`);
    console.error(`[call-gemini] Context dir: ${args.contextDir || "(none)"}`);
    console.error(`[call-gemini] RAG query: ${args.ragQuery}`);
  }

  // Validate arguments
  const validationErrors = validateArgs(args);
  if (validationErrors.length > 0) {
    console.error("[call-gemini] Validation errors:");
    validationErrors.forEach((e) => console.error(`  - ${e}`));
    console.error("\nRun with --help for usage information.");
    process.exit(2);
  }

  // Load contents
  let contents = {};
  let metadata = {};

  if (args.contextDir) {
    // v2.0: Load from context directory
    const contextContents = loadContextDirectory(args.contextDir);
    if (!contextContents) {
      process.exit(3);
    }
    contents = contextContents;
    metadata = contextContents.metadata || {};

    // Auto-detect feature and taskType if not provided
    if (!args.feature && metadata.feature) {
      args.feature = metadata.feature;
    }
    if (args.taskType === "new" && metadata.taskType) {
      args.taskType = metadata.taskType;
    }

    if (args.verbose) {
      console.error(`[call-gemini] Loaded from context-dir:`);
      console.error(`  - evidence: ${contents.evidence ? "yes" : "no"}`);
      console.error(`  - srs: ${contents.srs ? "yes" : "no"}`);
      console.error(`  - bd: ${contents.bd ? "yes" : "no"}`);
      console.error(`  - feature: ${args.feature}`);
      console.error(`  - taskType: ${args.taskType}`);
    }
  } else {
    // v1.0: Load from individual files (backward compat)
    contents = {
      evidence: readFileSafe(args.evidence),
      srs: readFileSafe(args.srs),
      bd: readFileSafe(args.bd),
      arch: readFileSafe(args.arch),
      constraints: readFileSafe(args.constraints),
    };
  }

  // Validate required content exists
  switch (args.type) {
    case "INNOVATE_SRS":
      if (!contents.evidence || contents.evidence.length < 100) {
        console.error("[call-gemini] Evidence content is empty or too short (<100 chars)");
        process.exit(3);
      }
      break;

    case "INNOVATE_BD":
      if (!contents.srs || contents.srs.length < 100) {
        console.error("[call-gemini] SRS content is empty or too short (<100 chars)");
        process.exit(3);
      }
      break;

    case "INNOVATE_DD":
      if (!contents.bd || contents.bd.length < 100) {
        console.error("[call-gemini] BD content is empty or too short (<100 chars)");
        console.error("   DD phase requires BD selection. Run /design --basic first.");
        process.exit(3);
      }
      break;
  }

  // Query RAG (v2.0)
  let ragContext = { patterns: [], conventions: [], guidance: [], source: "skipped" };
  if (args.ragQuery) {
    ragContext = await queryRAGContext(args.type, args.feature || "feature", args);
  }

  // RAG-only mode
  if (args.ragOnly) {
    const result = {
      status: "success",
      source: "rag-only",
      type: args.type,
      ragContext: ragContext,
      inputSummary: {
        files: Object.keys(contents).filter((k) => contents[k] && k !== "metadata"),
        contextDir: args.contextDir || null,
      },
      timestamp: new Date().toISOString(),
    };
    outputResult(result, args);
    process.exit(0);
  }

  // Dry-run mode
  if (args.dryRun) {
    const combinedContent = buildCombinedContent(args, contents, ragContext);
    const result = {
      status: "dry-run",
      type: args.type,
      wouldSendToGemini: {
        contentLength: combinedContent.length,
        contentPreview: combinedContent.substring(0, 1000) + "...",
        ragContext: ragContext,
      },
      inputSummary: {
        files: Object.keys(contents).filter((k) => contents[k] && k !== "metadata"),
        contextDir: args.contextDir || null,
      },
      timestamp: new Date().toISOString(),
    };
    outputResult(result, args);
    process.exit(0);
  }

  // Initialize Gemini
  let GeminiIntegrator;
  try {
    GeminiIntegrator = require("./gemini-integrator");
  } catch (err) {
    console.error(`[call-gemini] Failed to load GeminiIntegrator: ${err.message}`);
    process.exit(1);
  }

  const gemini = new GeminiIntegrator();
  const initialized = await gemini.initialize();

  if (!initialized || !gemini.isAvailable) {
    const result = {
      status: "unavailable",
      source: "gemini",
      type: args.type,
      message: "Gemini is not available. Check API key configuration.",
      ragContext: ragContext,
      timestamp: new Date().toISOString(),
    };

    outputResult(result, args);
    process.exit(1);
  }

  // v3.0: Mode routing — refine/final intercepted, generate falls through
  if (args.mode === "refine") {
    await handleRefineMode(args, contents, ragContext, gemini);
    return;
  }

  if (args.mode === "final") {
    await handleFinalMode(args, contents, ragContext, gemini);
    return;
  }

  // args.mode === 'generate' (default) → existing logic below

  // Build combined content
  const combinedContent = buildCombinedContent(args, contents, ragContext);

  // Build context object
  const context = {
    featureName: args.feature || "",
    taskType: args.taskType,
    taskSummary: args.taskSummary,
    userPreferences: args.conversation || "",
    constraints: contents.constraints || "",
  };

  // For DD phase, BD content is used as architecture constraint
  if (args.type === "INNOVATE_DD" && contents.bd) {
    context.constraints = contents.bd + (context.constraints ? "\n" + context.constraints : "");
  }

  // Call Gemini
  try {
    if (args.verbose) {
      console.error(`[call-gemini] Calling Gemini for ${args.type}...`);
      console.error(`[call-gemini] Content length: ${combinedContent.length} chars`);
    }

    const geminiResult = await gemini.generateOptions(combinedContent, args.type, context);

    // Build result with v2.0 metadata
    const result = {
      status: "success",
      source: "gemini",
      type: args.type,
      options: geminiResult.options || [],
      raw: geminiResult.raw || "",
      ragContext: ragContext,
      inputSummary: {
        files: Object.keys(contents).filter((k) => contents[k] && k !== "metadata"),
        characters: Object.values(contents).reduce((sum, c) => sum + (typeof c === "string" ? c.length : 0), 0),
        ragChunks: ragContext.patterns.length + ragContext.conventions.length + ragContext.guidance.length,
        contextDir: args.contextDir || null,
      },
      feature: args.feature,
      taskType: args.taskType,
      timestamp: new Date().toISOString(),
    };

    outputResult(result, args);
    process.exit(0);
  } catch (err) {
    console.error(`[call-gemini] Gemini API error: ${err.message}`);

    const result = {
      status: "error",
      source: "gemini",
      type: args.type,
      error: err.message,
      ragContext: ragContext,
      timestamp: new Date().toISOString(),
    };

    outputResult(result, args);
    process.exit(4);
  }
}

// Run
main().catch((err) => {
  console.error(`[call-gemini] Unexpected error: ${err.message}`);
  process.exit(1);
});
