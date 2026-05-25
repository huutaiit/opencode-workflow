# plan/bugfix.md — Step 1B: Bugfix Plan Workflow

## Step 1B: Bugfix Plan Workflow

**ONLY for bugfix tasks** (when Step 0.5 detected taskType === 'bugfix').

This step loads evidence and bugfix constraints, then chains to context-loading → generation → save.

### 1B.1: Load Evidence (Required)

```javascript
const fs = require('fs');
const sm = require('./core/state/state-manager.js');

const ctx = sm.findActiveContext();
const evidenceFile = `${ctx}/evidence.md`;

if (!fs.existsSync(evidenceFile)) {
  console.error('❌ ERROR: No evidence.md found');
  console.error('   Run /research --type bugfix first');
  process.exit(1);
}

const evidence = fs.readFileSync(evidenceFile, 'utf8');
console.log('✅ Evidence loaded');
console.log(`   - ${evidence.split('\n').length} lines`);

// Extract key sections
const rootCause = evidence.match(/Root Cause[^#]*?([\s\S]*?)(?=##|$)/i);
const proposedFix = evidence.match(/Proposed Fix[^#]*?([\s\S]*?)(?=##|$)/i);
const filesAffected = evidence.match(/Files to Modify[^#]*?([\s\S]*?)(?=##|$)/i);

console.log('');
console.log('Key sections found:');
console.log(`   - Root Cause: ${rootCause ? 'YES' : 'NO'}`);
console.log(`   - Proposed Fix: ${proposedFix ? 'YES' : 'NO'}`);
console.log(`   - Files Affected: ${filesAffected ? 'YES' : 'NO'}`);
```

### 1B.2: Load Specialist Context for Bugfix

Load code specialists relevant to the bug area:

```bash
# Load specialist list
node core/cli/ops.js specialist-load --type code --list
BUGFIX_SPECS=$(node -e "
  const r=JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8'));
  const d=r.data||{};
  console.log(JSON.stringify({ count: d.count||0, stackKey: d.stackKey||'unknown' }));
")
echo "📦 Bugfix specialist context: $BUGFIX_SPECS"
```

**Note**: During plan generation, load the specific specialist matching the bug area (e.g., java-r2dbc-specialist for database bugs, java-webflux-specialist for API bugs).

### 1B.2.5: Load Innovate Selection (Optional)

```javascript
const innovateFile = `${ctx}/innovate-selection.md`;

let innovateContent = '';
if (fs.existsSync(innovateFile)) {
  innovateContent = fs.readFileSync(innovateFile, 'utf8');
  console.log('✅ Innovate selection loaded');
} else {
  console.log('ℹ️  No innovate-selection.md - will use evidence only');
}
```

### 1B.3: Bugfix Constraints

The following constraints MUST be enforced during plan generation:

- ✅ Base ALL steps directly on evidence.md analysis
- ✅ Include ONLY files identified in evidence
- ✅ Reference root cause analysis in Section 0.5
- ✅ Include Rollback Plan (Section 4) and Side Effects (Section 5)
- ✅ Self-debate 5 rounds before generating (Step 4.0a in generation.md)
- ❌ NO new features or improvements
- ❌ NO files not in evidence
- ❌ NO assumptions - only what's proven in evidence

### 1B.4: Continue to Context Loading

Skip Steps 1 (state validation) and 2 (quality gate D4) — bugfix uses evidence as input.

The plan receives evidence as PRIMARY context (no design docs). Architecture context loads from specialist → arch-detect → RAG (Steps 2.8-2.10 in context-loading.md now run for ALL types).

---

**NEXT**: Use the **Read tool** to load `commands/plan/context-loading.md` and follow its instructions completely.

After context-loading completes, skip `document-loading.md` (no design docs for bugfix) and proceed directly to `commands/plan/generation.md`.

<!-- Next: plan/context-loading.md → (skip document-loading.md) → plan/generation.md → plan/save-and-display.md → RETURN to plan.md -->
