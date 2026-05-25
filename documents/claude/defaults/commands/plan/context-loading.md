# plan/context-loading.md — Steps 2.5–2.10: RAG, patterns, evidence, DD mode, specialists, architecture

## Step 2.5: RAG Source Code Context (Auto)

Automatically check staleness, re-index if needed, and query RAG for source code context.

```javascript
const path = require('path');
const StalenessChecker = require('./core/feedback/staleness-checker.js');

const branch = require('child_process').execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();

// 1. Check staleness
const checker = new StalenessChecker(branch);
const report = checker.getStalenessReport();

if (report.neverIndexed) {
  console.log('ℹ️  Source code not indexed. RAG context may be limited.');
  console.log('   Continuing with design documents only.\n');
} else if (report.stale) {
  console.log(`⚠️  Source code index is stale:`);
  console.log(`   ${report.filesChanged} files changed, ${report.commitsBehind} commits behind`);
  if (report.changedFiles.length > 0) {
    console.log(`   Changed: ${report.changedFiles.slice(0, 5).join(', ')}${report.changedFiles.length > 5 ? '...' : ''}`);
  }
  console.log('');
} else {
  console.log('✅ Source code index is up-to-date\n');
}

// 2. Mark current commit as indexed
if (report.stale) {
  checker.markIndexed();
}

// 5. Query RAG for source code patterns (available to plan generation)
let ragContext = { codePatterns: [], graphConstraints: [] };

try {
  const HippoRAGService = require('./core/rag/hipporag-service.js');

  // Get feature from context
  const sm = require('./core/state/state-manager.js');
  const ctx = sm.findActiveContext();
  const contextFile = `${ctx}/context.md`;
  const fs = require('fs');
  let feature = 'ALL';
  if (fs.existsSync(contextFile)) {
    const content = fs.readFileSync(contextFile, 'utf8');
    const match = content.match(/Module:\s*(\w+)/);
    if (match) feature = match[1];
  }

  // Query HippoRAG with graph-aware search
  const ragService = HippoRAGService.getInstance(feature, branch);
  const stacks = ragService._getProjectStacks();
  const epsCodeLayers = stacks.map(s => `eps-code-${s}`);
  const ragResult = await ragService.getContext(
    `${feature} service repository controller patterns`,
    { name: 'plan-agent', agent: 'plan' },
    { topK: 10, graphDepth: 2, layers: [...epsCodeLayers, "arch"] }
  );

  // Extract code patterns from RAG chunks
  ragContext.codePatterns = ragResult.chunks.map(c => ({
    content: c.content || '',
    filePath: c.metadata?.filePath || '',
    chunkType: c.metadata?.chunkType || '',
    score: c.score,
  }));

  // Graph constraints from RAG 2.0 pipeline (already traversed)
  ragContext.graphConstraints = (ragResult.graph?.nodes || []).slice(0, 30).map(n => ({
    type: n.attributes?.type || 'NODE',
    source: n.id,
    target: n.attributes?.label || n.id,
  }));

  if (ragContext.codePatterns.length > 0 || ragContext.graphConstraints.length > 0) {
    console.log(`📊 RAG 2.0 Context: ${ragContext.codePatterns.length} code patterns, ${ragContext.graphConstraints.length} graph constraints`);
    console.log(`   Mode: ${ragResult.mode}, Layers: ${layers.join(', ')}`);
  }
} catch (err) {
  // Non-blocking: RAG unavailable doesn't stop planning
  console.log(`ℹ️  RAG context unavailable (${err.message}). Using design documents only.`);
}

console.log('');
```

**Non-blocking**: All errors are caught. Planning continues with design documents alone if RAG is unavailable.

**RAG context is passed to plan generation** as additional input:
```
=== SOURCE CODE CONTEXT (RAG) ===
[ragContext.codePatterns - existing implementation patterns]
[ragContext.graphConstraints - class→component relationships]
```

---

## Step 2.6: Load Pattern Effectiveness (Auto)

Query the feedback system for pattern effectiveness metrics to boost confident patterns.

```javascript
const { EffectivenessQuery } = require('./.claude/utils/feedback');

let patternEffectiveness = { available: false, patterns: [], summary: null };

try {
  const query = EffectivenessQuery.getInstance();

  if (query.hasData()) {
    // Get top active patterns
    const activePatterns = query.getActivePatterns({
      minConfidence: 70,
      limit: 20,
      sortBy: 'currentConfidence',
      sortOrder: 'desc'
    });

    // Get deprecated patterns to avoid
    const deprecatedPatterns = query.getDeprecatedPatterns();

    patternEffectiveness = {
      available: true,
      patterns: activePatterns.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        confidence: p.currentConfidence,
        boostFactor: query.getBoostFactor(p.id),
        usageCount: p.usageCount
      })),
      deprecated: deprecatedPatterns.map(p => p.id),
      summary: query.getSummary(),
      lastAggregatedAt: query.getLastAggregatedAt()
    };

    console.log('📊 Pattern Effectiveness Loaded');
    console.log(`   Active patterns: ${patternEffectiveness.patterns.length}`);
    console.log(`   Deprecated (avoid): ${deprecatedPatterns.length}`);
    if (patternEffectiveness.lastAggregatedAt) {
      console.log(`   Last aggregated: ${patternEffectiveness.lastAggregatedAt.split('T')[0]}`);
    }
  } else {
    console.log('ℹ️  Pattern effectiveness data not available yet');
    console.log('   Will be populated after first /validate cycle');
  }
} catch (err) {
  console.log(`ℹ️  Pattern effectiveness unavailable (${err.message})`);
}

console.log('');
```

**Pattern Effectiveness Context** (passed to plan generation):
```
=== PATTERN EFFECTIVENESS ===
[Recommended patterns with boost factors]
[Deprecated patterns to avoid]
```

**Query-Time Boosting**: Patterns with high effectiveness get priority in plan generation.

---

## Step 2.7: Evidence Context Loading (Auto)

Load evidence.md from the active context directory. Evidence contains research findings AND innovate/design decisions (enriched by Post-Save steps in each phase).

```javascript
const fs = require('fs');
const path = require('path');
const sm = require('./core/state/state-manager.js');
const ctx = sm.findActiveContext();

console.log('📋 Loading evidence context...');

const evidencePath = `${ctx}/evidence.md`;
let evidenceContent = null;

if (fs.existsSync(evidencePath)) {
  evidenceContent = fs.readFileSync(evidencePath, 'utf8');
  console.log(`  ✅ evidence.md (${evidenceContent.split('\n').length} lines)`);
} else {
  console.log('ℹ️  No evidence.md found');
}
console.log('');
```

**Evidence context is passed to plan generation** as additional input:
```
=== EVIDENCE CONTEXT (enriched — contains research + innovate decisions + design summaries) ===
[evidenceContent — if available]
```

**Note**: Evidence.md is a living document enriched by each phase:
- §1: Research findings (from /research)
- §2.1-2.3: Innovate decisions (from /innovate SRS/BD/DD Post-Save)
- §3.1-3.3: Design summaries (from /design Post-Workflow)
- §4: Impact analysis (updated each phase)

**CONTEXT PRIORITY** (instruction for plan generation):
```
CONTEXT PRIORITY (highest to lowest):
1. Approved Design Documents (SRS, BD, DD) — primary when available
2. Evidence — research findings, innovate decisions, design summaries (living document)
3. RAG Source Code Context — existing implementation patterns
4. Pattern Effectiveness — historical pattern confidence

When design docs exist, they are authoritative.
When design docs are absent (lightweight/bugfix), evidence.md
(which contains innovate decisions inline) is the primary source.
```

---

## Step 2.7.5: Evidence Fusion

Invoke the **evidence-fusion** skill:
- Merges evidence from:
  - memory-bank evidence.md (loaded in Step 2.7)
  - RAG query results (from Step 2.5, if available)
  - Innovate decisions (embedded in evidence.md §2)
- Output: Synthesized evidence context for plan generation
- Non-blocking: if skill unavailable, use raw evidence from Step 2.7

---

## Step 2.8: Detect DD Mode & Validate (v5.4)

> **Note**: For lightweight workflows (bugfix/enhancement), set ddConfig defaults below — do NOT skip this step.

Determine optimal document format for token optimization. This step creates `ddConfig` object used by subsequent steps.

### Lightweight DD Config Defaults

If no design documents available (lightweight workflow):

```javascript
// For bugfix/enhancement — no DD docs exist
if (taskType === 'bugfix' || taskType === 'enhancement') {
  const ddConfig = {
    mode: "none",
    available: false,
    splitMode: "single",
    bddSectionMap: new Map(),
    bddSectionFiles: {}
  };
  console.log('ℹ️ DD mode: none (lightweight workflow — no design documents)');
  // Continue to Step 2.9 — do NOT return/skip
}
```

```javascript
const fs = require('fs');
const path = require('path');
const sm = require('./core/state/state-manager.js');
const ctx = sm.findActiveContext();
const context = sm.loadContext(ctx);
const { findDocumentsDir } = require('./guards/gates/quality-gates.js');

const feature = context.featureName;
const docsDir = findDocumentsDir(feature, ctx);

console.log('📄 Detecting DD Mode (v5.4)...');

// Check for pseudo-code files
const fddPseudo = path.join(docsDir, `${feature}-frontend-detail-design.pseudo`);
const bddPseudo = path.join(docsDir, `${feature}-backend-detail-design.pseudo`);
const fddMd = path.join(docsDir, `${feature}-frontend-detail-design.md`);
const bddMd = path.join(docsDir, `${feature}-backend-detail-design.md`);

const hasFddPseudo = fs.existsSync(fddPseudo);
const hasBddPseudo = fs.existsSync(bddPseudo);

// Priority: pseudo-code > hybrid > human
let ddConfig = {
  mode: 'human',
  tokenReduction: 0,
  paths: { fdd: fddMd, bdd: bddMd },
  coverage: null,
  feature: feature,
  docsDir: docsDir
};

if (hasFddPseudo && hasBddPseudo) {
  ddConfig.mode = 'pseudo-code';
  ddConfig.tokenReduction = 70;
  ddConfig.paths = { fdd: fddPseudo, bdd: bddPseudo };
  console.log('  🎯 Mode: pseudo-code (BOTH .pseudo files found)');
} else if (hasFddPseudo || hasBddPseudo) {
  ddConfig.mode = 'hybrid';
  ddConfig.tokenReduction = 35;
  ddConfig.paths = {
    fdd: hasFddPseudo ? fddPseudo : fddMd,
    bdd: hasBddPseudo ? bddPseudo : bddMd
  };
  console.log(`  🔀 Mode: hybrid (${hasFddPseudo ? 'FDD' : 'BDD'} pseudo-code)`);
} else {
  console.log('  📝 Mode: human (no .pseudo files)');
}

// Validate TRACE_MATRIX coverage if pseudo-code
if (ddConfig.mode !== 'human') {
  try {
    const pseudoContent = fs.readFileSync(ddConfig.paths.fdd, 'utf8');
    const coverageMatch = pseudoContent.match(/COVERAGE:\s*(\d+)%/);
    ddConfig.coverage = coverageMatch ? parseInt(coverageMatch[1]) : null;

    if (ddConfig.coverage !== null && ddConfig.coverage < 100) {
      console.log(`  ⚠️ TRACE_MATRIX coverage: ${ddConfig.coverage}% (recommend 100%)`);
    } else if (ddConfig.coverage !== null) {
      console.log(`  ✅ TRACE_MATRIX coverage: ${ddConfig.coverage}%`);
    }
  } catch (e) {
    console.log('  ⚠️ Could not validate TRACE_MATRIX coverage');
  }
}

// Detect multi-file pseudo (SP-1 output: SPLIT_MODE marker)
ddConfig.splitMode = "single";
ddConfig.sectionMap = null;
ddConfig.sectionFiles = {};

if (hasBddPseudo) {
  const bddPseudoContent = fs.readFileSync(bddPseudo, 'utf8');
  if (bddPseudoContent.includes("SPLIT_MODE: multi-file")) {
    const { parsePseudoMeta } = require('./core/plan/auto-split.js');
    const parsed = parsePseudoMeta(bddPseudoContent);
    ddConfig.splitMode = "multi-file";
    ddConfig.sectionMap = parsed.sectionMap;
    for (const [sectionId, info] of parsed.sectionMap) {
      const sectionPath = path.join(docsDir, info.pseudoFile);
      if (fs.existsSync(sectionPath)) {
        ddConfig.sectionFiles[sectionId] = sectionPath;
      }
    }
    console.log(`  📂 Multi-file BDD: ${parsed.sectionMap.size} sections detected`);
  }
}

console.log(`  📊 Token Reduction: ~${ddConfig.tokenReduction}%`);
console.log('');

// Export ddConfig for subsequent steps
// ddConfig = { mode, paths, tokenReduction, coverage, feature, docsDir, splitMode, sectionMap, sectionFiles }
```

**Output**: `ddConfig` object with mode detection results.

---

## Step 2.9: Load Stack Specialists (v7.0 — EXECUTABLE)

> **Note**: Load all matched specialists for ALL workflow types. Specialist patterns are critical for plan quality regardless of task type.

### 2.9.1: Get specialist list for current stack

```bash
# List available code specialists for project stack
node core/cli/ops.js specialist-load --type code --list
SPECIALIST_LIST=$(node -e "
  const r=JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8'));
  const d=r.data||{};
  if(d.error) { console.log('ERROR:'+d.error); process.exit(0); }
  console.log(JSON.stringify({
    stackKey: d.stackKey||'unknown',
    variantId: d.variantId||'default',
    count: d.count||0,
    specialists: (d.specialists||[]).slice(0,10)
  }));
")
echo "📦 Stack specialists: $SPECIALIST_LIST"
```

### 2.9.2: Preload top-3 specialists for plan generation context

Load the top-3 most relevant specialists based on feature keywords, so their patterns are available during plan generation:

```bash
# Parse specialist list from 2.9.1 and load top-3 by relevance
# The specialist names come from SPECIALIST_LIST (2.9.1 output)
LOADED_SPECIALISTS=""

for SPEC_NAME in $(node -e "
  const r=JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8'));
  const specs = (r.data?.specialists || []).slice(0, 3);
  specs.forEach(s => console.log(s.name || s));
"); do
  node core/cli/ops.js specialist-load --type code --name "$SPEC_NAME"
  SPEC_CONTENT=$(node -e "
    const r=JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8'));
    const d=r.data||{};
    if(d.error) { console.log(''); process.exit(0); }
    console.log(d.content||'');
  ")
  if [ -n "$SPEC_CONTENT" ]; then
    LOADED_SPECIALISTS="${LOADED_SPECIALISTS}\n--- Specialist: ${SPEC_NAME} ---\n${SPEC_CONTENT}"
    echo "✅ Loaded specialist: $SPEC_NAME ($(echo "$SPEC_CONTENT" | wc -c) chars)"
  fi
done

echo "📦 Preloaded $(echo "$LOADED_SPECIALISTS" | grep -c '--- Specialist:') specialists for plan context"
```

**IMPORTANT**: The preloaded specialist content (`LOADED_SPECIALISTS`) MUST be included in the plan generation context (Step 4). This ensures the AI generates implementation steps with correct specialist patterns.

### 2.9.3: Per-step specialist loading (during generation)

For each implementation step in the plan, load the most relevant specialist on demand:

```bash
# Load a specific code specialist by name
# (called per-step during plan generation)
SPEC_NAME="java-domain-specialist"  # determined by keyword matching
node core/cli/ops.js specialist-load --type code --name "$SPEC_NAME"
SPEC_CONTENT=$(node -e "
  const r=JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8'));
  const d=r.data||{};
  if(d.error) { console.log(''); process.exit(0); }
  console.log(d.content||'');
")
```

**Instruction to Claude**: When generating plan steps, use the preloaded specialists from 2.9.2 plus on-demand loading via 2.9.3. Match by keywords:
- Step mentions "domain", "entity" → load `java-domain-specialist`
- Step mentions "repository", "R2DBC" → load `java-r2dbc-specialist`
- Step mentions "controller", "API" → load `java-webflux-specialist`
- Step mentions "service" → load `java-service-specialist`
- Step mentions "test" → load `java-testing-specialist`

**Output**: Top-3 specialist content preloaded in `LOADED_SPECIALISTS`, additional specialists loaded on demand via `cache/ops-result.json`.

---

## Step 2.9.5: Pattern Analysis

Invoke the **pattern-analyzer** skill:
- Analyze loaded specialist patterns against project conventions
- Check for conflicts between specialist recommendations and existing codebase
- Output: Pattern alignment report — flag any mismatches for plan consideration
- Non-blocking: informational only

---

## Step 2.10: Load Architecture Context (v5.4) - CRITICAL

> **Note**: Runs for ALL workflow types. Architecture loads from specialist → arch-detect → RAG (none require design documents). Only the Basic Design fallback (Priority 3) is skipped for lightweight workflows.

Load architecture context for plan compliance. Ensures generated code respects layer boundaries and design patterns.

```javascript
const fs = require('fs');
const path = require('path');

console.log('📐 Loading Architecture Context (v5.4)...');

let archContext = {
  source: 'none',
  patterns: [],
  layerBoundaries: [],
  constraints: [],
  sourceStructure: null
};

// ═══════════════════════════════════════════════════════════════
// Priority 0: Architecture Specialist Pattern 0.x (AUTHORITATIVE)
// Loads source code structure from architecture specialist file.
// Same pattern as /architect documents.md v1.1 Step 0.5.
// ═══════════════════════════════════════════════════════════════

try {
  // 0.1: Get specialistDir from stack config
  const stackResult = JSON.parse(fs.readFileSync('cache/ops-result.json', 'utf8'));
  const stackData = stackResult.data?.stackData || {};
  const specialistDir = stackData.specialists?.dir || stackData.stackId || '';

  if (specialistDir) {
    // 0.2: Read _INDEX.md → find "Architecture Master (Pattern 0.x)" entry
    const indexPath = path.join('specialists', 'code', specialistDir, '_INDEX.md');

    if (fs.existsSync(indexPath)) {
      const indexContent = fs.readFileSync(indexPath, 'utf8');

      // 0.3: Find Architecture Master entry
      // Supports 4 _INDEX.md formats:
      //   1. Same-line backtick: | Architecture Master ... | `architecture/file.md` |
      //   2. Heading + table below: ## Architecture Master\n...\n| `architecture/file.md` |
      //   3. Markdown link: **[file.md](./architecture/file.md)**
      //   4. Bare path in table: | ... | architecture/file.md |
      const archMasterMatch = indexContent.match(
        /Architecture Master[^\n]*`([^`\s]+\.md)`/i
      ) || indexContent.match(
        /Architecture Master[\s\S]{0,300}?`([^`\s]+\.md)`/i
      ) || indexContent.match(
        /Architecture Master[\s\S]{0,300}?\[([^\]\s]+\.md)\]/i
      ) || indexContent.match(
        /Architecture Master[^\n]*[\|\s]([a-z][\w\/-]+\.md)/i
      );

      if (archMasterMatch) {
        // Strip path prefix — parser joins with 'architecture/' automatically
        const rawFile = archMasterMatch[1].trim();
        const archSpecFile = rawFile.replace(/^\.?\/?(architecture\/)?/, '');
        const archSpecPath = path.join('specialists', 'code', specialistDir, 'architecture', archSpecFile);

        if (fs.existsSync(archSpecPath)) {
          const archSpecContent = fs.readFileSync(archSpecPath, 'utf8');

          // 0.4: Extract Architecture sections (semantic headings — cross-stack standard)
          const folderTreeMatch = archSpecContent.match(/##\s*Architecture:\s*Folder Tree[^\n]*\n([\s\S]*?)(?=\n##\s*Architecture:|\n##\s*[A-Z]|\n---)/i);
          const fileTypeMappingMatch = archSpecContent.match(/##\s*Architecture:\s*File Type Mapping[^\n]*\n([\s\S]*?)(?=\n##\s*Architecture:|\n##\s*[A-Z]|\n---)/i);
          const dependencyRulesMatch = archSpecContent.match(/##\s*Architecture:\s*Dependency Rules[^\n]*\n([\s\S]*?)(?=\n##\s*Architecture:|\n##\s*[A-Z]|\n---)/i);
          const featureCompletenessMatch = archSpecContent.match(/##\s*Architecture:\s*Feature Completeness[^\n]*\n([\s\S]*?)(?=\n##\s*Architecture:|\n##\s*[A-Z]|\n---)/i);

          archContext.sourceStructure = {
            folderTree: folderTreeMatch ? folderTreeMatch[1].trim() : null,
            fileTypeMapping: fileTypeMappingMatch ? fileTypeMappingMatch[1].trim() : null,
            layerRules: dependencyRulesMatch ? dependencyRulesMatch[1].trim() : null,
            featureCompleteness: featureCompletenessMatch ? featureCompletenessMatch[1].trim() : null,
            source: 'architecture-specialist',
            specialistFile: archSpecPath
          };

          archContext.source = 'architecture-specialist';
          console.log(`  ✅ Architecture Specialist loaded: ${archSpecFile}`);
          console.log(`     sourceStructure: folderTree=${!!archContext.sourceStructure.folderTree}, fileTypeMapping=${!!archContext.sourceStructure.fileTypeMapping}, layerRules=${!!archContext.sourceStructure.layerRules}, featureCompleteness=${!!archContext.sourceStructure.featureCompleteness}`);

          // Warn when specialist loaded but specific sections are missing
          const missing = [];
          if (!archContext.sourceStructure.folderTree) missing.push('Folder Tree');
          if (!archContext.sourceStructure.layerRules) missing.push('Dependency Rules');
          if (!archContext.sourceStructure.fileTypeMapping) missing.push('File Type Mapping');
          if (!archContext.sourceStructure.featureCompleteness) missing.push('Feature Completeness');
          if (missing.length > 0) {
            console.warn(`  ⚠️ Architecture specialist loaded but MISSING sections: ${missing.join(', ')}`);
            console.warn(`     File: ${archSpecPath}`);
            console.warn(`     Expected headings: ## Architecture: {SectionName}`);
            console.warn(`     This will cause plan §0.4 to SKIP import rules!`);
          }
        }
      }
    }
  }
} catch (err) {
  console.warn('  ⚠️ Architecture specialist loading failed (non-blocking):', err.message);
}

// Priority 0 fallback: arch-detect source code scan (when no specialist found)
if (!archContext.sourceStructure) {
  try {
    const archDetectResult = JSON.parse(fs.readFileSync('cache/ops-result.json', 'utf8'));
    const archData = archDetectResult.data || {};

    if (archData.sourceRoots && archData.sourceRoots.length > 0) {
      // Infer structure from detected source roots and layers
      const detectedLayers = archData.sourceRoots
        .flatMap(sr => (sr.detectedLayers || []).map(l => `${sr.path}/${l}`));

      if (detectedLayers.length > 0) {
        archContext.sourceStructure = {
          folderTree: detectedLayers.join('\n'),
          fileTypeMapping: null,
          layerRules: null,
          source: 'arch-detect'
        };
        console.log(`  ✅ Fallback: arch-detect scan found ${detectedLayers.length} detected layers`);
      }
    }
  } catch (err) {
    // Greenfield project or arch-detect unavailable → skip enforcement
    console.log('  ℹ️ No architecture specialist and no source code scan — enforcement skipped');
  }
}

// Priority 1: Query RAG arch layer
try {
  const ragService = require('./core/rag/hipporag-service.js');
  const feature = ddConfig.feature;

  ragService.getContext(
    `${feature} architecture patterns layer boundaries clean architecture`,
    { layers: ['arch'], topK: 5 }
  ).then(ragResult => {
    if (ragResult && ragResult.chunks && ragResult.chunks.length > 0) {
      archContext.source = 'rag';

      // Extract patterns from RAG results
      ragResult.chunks.forEach(chunk => {
        const patternMatches = chunk.content.match(/Pattern:\s*([^\n]+)/gi) || [];
        patternMatches.forEach(match => {
          archContext.patterns.push({
            name: match.replace(/Pattern:\s*/i, '').trim(),
            source: chunk.metadata?.source || 'rag',
            appliedTo: 'From RAG'
          });
        });

        // Extract layer definitions
        const layerMatches = chunk.content.match(/(Presentation|Application|Domain|Infrastructure|UI|API|Service|Repository)/gi) || [];
        archContext.layerBoundaries = [...new Set([
          ...archContext.layerBoundaries,
          ...layerMatches.map(l => l.trim())
        ])];
      });

      console.log(`  ✅ Architecture from RAG: ${archContext.patterns.length} patterns`);
    }
  }).catch(() => {
    console.warn('  ⚠️ RAG arch query failed, trying fallback');
  });
} catch (err) {
  console.warn('  ⚠️ RAG arch query failed, trying fallback');
}

// Priority 2: Basic Design Section 1.1, 1.2 (fallback)
if (archContext.patterns.length === 0) {
  const bdPath = path.join(ddConfig.docsDir, `${ddConfig.feature}-basic-design.md`);

  if (fs.existsSync(bdPath)) {
    const bdContent = fs.readFileSync(bdPath, 'utf8');

    // Extract Section 1.1 (System Architecture)
    const section11Match = bdContent.match(/##\s*1\.1[^\n]*\n([\s\S]*?)(?=\n##\s*1\.[2-9]|\n##\s*2\.)/);
    if (section11Match) {
      // Extract layers from ASCII diagram
      const asciiLayers = section11Match[1].match(/│\s*([A-Za-z\s]+Layer)\s*│/gi) || [];
      archContext.layerBoundaries = asciiLayers.map(l =>
        l.replace(/[│\s]/g, '').replace('Layer', '')
      );
    }

    // Extract Section 1.2 (Design Patterns)
    const section12Match = bdContent.match(/##\s*1\.2[^\n]*\n([\s\S]*?)(?=\n##\s*1\.[3-9]|\n##\s*2\.)/);
    if (section12Match) {
      // Parse pattern table
      const tableRows = section12Match[1].match(/\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/g) || [];
      tableRows.slice(2).forEach(row => { // Skip header rows
        const cells = row.split('|').map(c => c.trim()).filter(Boolean);
        if (cells.length >= 2 && !cells[0].includes('---')) {
          archContext.patterns.push({
            name: cells[0],
            appliedTo: cells[1],
            source: 'basic-design'
          });
        }
      });
    }

    if (archContext.patterns.length > 0) {
      archContext.source = 'basic-design';
      console.log(`  ✅ Architecture from Basic Design: ${archContext.patterns.length} patterns`);
    }
  }
}

// Priority 3: Design Standards Template (last resort)
if (archContext.patterns.length === 0) {
  archContext.source = 'design-standards';
  archContext.patterns = [
    { name: 'Clean Architecture', appliedTo: 'All layers', source: 'template' },
    { name: 'Repository Pattern', appliedTo: 'Data access', source: 'template' },
    { name: 'CQRS', appliedTo: 'Command/Query separation', source: 'template' },
    { name: 'Domain Events', appliedTo: 'Cross-boundary communication', source: 'template' }
  ];
  archContext.layerBoundaries = ['Presentation', 'Application', 'Domain', 'Infrastructure'];
  console.log(`  ⚠️ Using default architecture patterns`);
}

// Add constraints (always)
archContext.constraints = [
  'DO: Follow pattern assignments from Basic Design',
  'DO: Respect layer boundaries (no cross-layer direct calls)',
  'DO: Use dependency injection for cross-layer dependencies',
  "DON'T: Cross layer boundaries without abstraction",
  "DON'T: Add new patterns not in Basic Design without justification",
  "DON'T: Put business logic in Infrastructure layer"
];

console.log(`  📐 Architecture source: ${archContext.source}`);
console.log(`  📐 Layers: ${archContext.layerBoundaries.join(' -> ')}`);
console.log('');

// Export archContext for Step 4
// archContext = { source, patterns[], layerBoundaries[], constraints[] }
```

**Output**: `archContext` object with architecture patterns and constraints.

---

## Step 2.10.5: Architecture Compliance Check

Invoke the **architecture-analyzer** skill:
- Detect potential duplicate components in proposed plan
- Validate plan against project tech stack and layer boundaries
- Output: Architecture compliance report
- Non-blocking: informational, but flag violations prominently
- Runs for ALL workflow types (uses specialist + arch-detect, not Basic Design)

---

## Step 2.11: Architecture Gap Analysis (v1.0)

> **Prerequisite**: archContext.sourceStructure loaded in Step 2.10 (Priority 0).
> **Skip if**: archContext.sourceStructure IS NULL (no specialist, no source code scan).

Analyze existing codebase against architecture specialist completeness checklist to identify what EXISTS vs what is MISSING for this feature.

```pseudo
IF archContext.sourceStructure IS NOT NULL:

  # 1. Extract feature module from SRS/evidence/DD context
  featureModule = extract_module_from_context(evidence, srs, designDocs)
  # e.g., "customer", "shareddata", "cmn020000"

  # 2. Detection Priority Chain:
  #    a) RAG code layer — query "what files exist for {featureModule}"
  #    b) Prompt-directed Read — read specific files from sourceStructure paths
  #    c) Glob verification — verify file existence at expected paths

  # 3. Use Architecture: File Type Mapping as completeness checklist
  # For each file type in the mapping, resolve expected path for this feature module,
  # then check if corresponding file exists in the project.

  DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  DISPLAY "📋 Architecture Gap Analysis"
  DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  DISPLAY ""
  DISPLAY "Cross-referencing existing skeleton against architecture specialist:"
  DISPLAY ""
  DISPLAY "| Artifact | Layer | Package | Status | Notes |"
  DISPLAY "|----------|-------|---------|--------|-------|"

  FOR EACH fileType IN archContext.sourceStructure.fileTypeMapping:
    expectedPath = resolve_path(fileType.packagePath, featureModule)
    exists = check_via_glob_or_read(expectedPath)

    IF exists:
      fileContent = READ(expectedPath)
      methodCount = count_public_methods(fileContent)
      DISPLAY "| {fileType.name} | {fileType.layer} | {fileType.package} | Exists | {methodCount} methods |"
    ELSE:
      DISPLAY "| {fileType.name} | {fileType.layer} | {fileType.package} | **MISSING** | To implement |"

  DISPLAY ""
  existCount = count(status == "Exists")
  missingCount = count(status == "MISSING")
  DISPLAY "Summary: {existCount} existing, {missingCount} MISSING"
  DISPLAY ""

  # 4. Store results in conversation context for Step 4 (generation)
  gapAnalysis = {
    featureModule: featureModule,
    existing: [{ name, layer, package, methods }],
    missing: [{ name, layer, package }]
  }

ELSE:
  DISPLAY "ℹ️ Architecture Gap Analysis skipped (no sourceStructure available)"
  gapAnalysis = NULL
```

**Output**: `gapAnalysis` object — used by generation.md to produce architecture-aligned Section 0.1.

---

## Step 2.12: Contract/Interface Gap Analysis (v1.1 — Stack-Agnostic)

> **Prerequisite**: Step 2.11 (gapAnalysis) completed.
> **Skip if**: gapAnalysis IS NULL OR no existing contract files found.

Analyze existing contracts/interfaces against SRS functional requirements to identify gaps.
This step is **stack-agnostic** — it uses specialist metadata to determine which file types
represent contracts/interfaces for the current stack.

```pseudo
IF gapAnalysis AND gapAnalysis.existing.length > 0:

  # 1. Identify contract/interface files — STACK-AGNOSTIC
  # DO NOT hardcode file type names. Instead, use specialist metadata:
  #   - Files whose layer is "Application" or "Domain" AND whose type contains
  #     keywords: interface, port, contract, schema, service, repository, gateway,
  #     router, provider, action, api, hook
  #   - OR files that define public API surface (exports, route handlers, endpoints)
  #
  # The LLM determines which existing files define contracts based on:
  #   a) Specialist Architecture: File Type Mapping descriptions (if available)
  #   b) File content analysis (interfaces, abstract classes, type definitions, schemas)
  #   c) Layer rules — contract files typically sit at layer boundaries

  contractFiles = gapAnalysis.existing.filter(
    a => is_contract_or_interface(a, archContext.sourceStructure)
    # Stack examples:
    #   Java:    Port, Gateway, Repository Interface, Service Interface
    #   Next.js: Server Actions, API Route, Data Access functions
    #   FastAPI: Router, Schema (Pydantic), Repository protocol
    #   React:   API slice, Feature hook, Shared API module
    #   NestJS:  Provider interface, Guard, Repository
    #   .NET:    IService, IRepository, Controller contract
  )

  IF contractFiles.length > 0:
    DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    DISPLAY "📋 Contract/Interface Gap Analysis"
    DISPLAY "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    FOR EACH contractFile IN contractFiles:
      # 2. Read existing contract file content
      content = READ(contractFile.path)

      # 3. Extract existing signatures/exports
      # Stack-adaptive extraction:
      #   Java/Kotlin:    method signatures (returnType name(params))
      #   TypeScript/JS:  export function/const signatures, type exports
      #   Python:         def signatures, class method signatures, Protocol members
      #   C#:             interface method declarations
      existingSignatures = extract_signatures(content)

      DISPLAY ""
      DISPLAY "**Existing contract: {contractFile.name}**"
      DISPLAY ""
      FOR EACH sig IN existingSignatures:
        DISPLAY "  {sig}"

      # 4. Compare vs SRS functional requirements
      # LLM analyzes: do existing signatures satisfy all SRS requirements?
      # Flag issues (stack-agnostic examples):
      #   - Missing parameters (function lacks required input per SRS)
      #   - Wrong types (parameter type insufficient for SRS requirement)
      #   - Missing functions/methods (SRS requires capability not yet exposed)
      #   - Capacity/constraint mismatch (SRS allows X but contract limits to Y)
      DISPLAY ""
      DISPLAY "**Issues vs SRS**:"
      FOR EACH issue IN identified_issues:
        DISPLAY "  • {issue.description}"

    # 5. Summarize decisions needed
    IF identified_issues.length > 0:
      DISPLAY ""
      DISPLAY "**Decision needed**: Update contract or split into separate concerns"

    # Store in conversation context
    contractAnalysis = { contracts: [...], issues: [...] }

  ELSE:
    DISPLAY "ℹ️ No existing contracts/interfaces found — all new implementation"
    contractAnalysis = NULL

ELSE:
  DISPLAY "ℹ️ Port/Interface Analysis skipped (no existing artifacts)"
  portAnalysis = NULL
```

**Output**: `contractAnalysis` object — informs plan generation decisions.

---

## NEXT: Chain to Document Loading or Generation

**For feature workflows** (coming from `feature-workflow.md`):
→ Use the **Read tool** to load `commands/plan/document-loading.md` and follow its instructions completely.

**For lightweight workflows** (coming from `lightweight.md`):
→ Skip `document-loading.md` (no design docs). Use the **Read tool** to load `commands/plan/generation.md` and follow its instructions completely.

<!-- Next: plan/document-loading.md (feature) OR plan/generation.md (lightweight) -->
