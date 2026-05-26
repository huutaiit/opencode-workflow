---
description: Enter RESEARCH mode for information gathering (State-Aware)
---

# RESEARCH Command - Enhanced Workflow

## Step 1: Check or Create Context

First, check if a context exists:

```bash
node core/state/state-manager.js get
```

**If no context exists** (first time running /research):
- Prompt user for feature name (e.g., "banking", "lending")
- **Auto-detect developer name** with fallback:
  ```bash
  # Try to get from git config
  DEVELOPER_NAME=$(git config user.name 2>/dev/null | tr '[:upper:]' '[:lower:]' | tr ' ' '-')

  # If git config fails or empty, prompt user
  if [ -z "$DEVELOPER_NAME" ]; then
    echo "⚠️  Could not auto-detect developer name from git config"
    echo ""
    read -p "Enter your developer name (e.g., john, cuong): " DEVELOPER_NAME
    DEVELOPER_NAME=$(echo "$DEVELOPER_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
    echo "✅ Using developer name: $DEVELOPER_NAME"
  else
    echo "ℹ️  Auto-detected developer from git: $DEVELOPER_NAME"
  fi
  ```
- Create context:

```bash
node core/state/state-manager.js init <feature-name> $DEVELOPER_NAME
```

Example (auto-detected):
```
Feature name: banking
ℹ️  Auto-detected developer from git: cuong
Context: .claude/memory-bank/$(git branch --show-current)/banking-cuong/
```

Example (manual input):
```
Feature name: banking
⚠️  Could not auto-detect developer name from git config
Enter your developer name: John Doe
✅ Using developer name: john-doe
Context: .claude/memory-bank/$(git branch --show-current)/banking-john-doe/
```

**Note**: Developer name is automatically extracted from `git config user.name`. If not available, user will be prompted to enter their name.

---

## Step 2: Validate State Transition

Run state validation:

```bash
node core/state/state-manager.js validate research
```

**If validation fails**: Display error message and stop.

**If validation passes**: Continue to Step 3.

---

## Step 3: Determine Research Focus

Based on current state, determine what to research:

- **INITIAL → RESEARCH_SRS**: Focus on **Business Requirements**
  - Functional requirements (what system should do)
  - Non-functional requirements (performance, security)
  - Regulatory requirements (SBV compliance for banking)
  - User stories and use cases

- **SRS_CREATED → RESEARCH_BD**: Focus on **Architecture Patterns**
  - Microservices architecture patterns
  - Database design (PostgreSQL, MongoDB, Redis)
  - API design patterns (REST)
  - Security architecture (JWT, OAuth)
  - Integration patterns (RabbitMQ, event-driven)

- **BD_CREATED → RESEARCH_DD**: Focus on **API/UI/Test Strategies**
  - API specifications (endpoints, DTOs, validation)
  - UI design patterns (React components, state management)
  - Database schemas (tables, indexes, migrations)
  - Test strategies (unit, integration, E2E)

---

## Step 4: Auto-Read Context Documents

Before starting research, automatically read relevant context documents:

**For ALL RESEARCH PHASES - System Context Loading**:
```bash
# Smart context loading based on feature name
FEATURE_NAME=$(echo "$CONTEXT" | jq -r '.feature')

# Determine what system architecture to load
case "$FEATURE_NAME" in
  *"test"* | *"aut"* | *"qa"*)
    # Testing features need broad context
    SYSTEM_CONTEXTS=("01-system-architecture" "05-api-specifications" "02-service-architecture")
    ;;
  *"lend"* | *"loan"* | *"borrow"* | *"invest"*)
    # Lending domain features
    SYSTEM_CONTEXTS=("01-system-architecture" "02-service-architecture:lending,risk,banking")
    ;;
  *"insur"* | *"policy"* | *"claim"*)
    # Insurance domain features
    SYSTEM_CONTEXTS=("01-system-architecture" "02-service-architecture:insurance" "06-blockchain-design")
    ;;
  *"bank"* | *"payment"* | *"transfer"*)
    # Banking domain features
    SYSTEM_CONTEXTS=("01-system-architecture" "02-service-architecture:banking" "04-database-design:banking_db")
    ;;
  *"auth"* | *"user"* | *"role"* | *"permission"*)
    # Authentication/Authorization features
    SYSTEM_CONTEXTS=("01-system-architecture" "02-service-architecture:auth" "07-security-architecture")
    ;;
  *)
    # Default: load system overview only
    SYSTEM_CONTEXTS=("01-system-architecture")
    ;;
esac

# Load selected system contexts
echo "📚 Loading system architecture context for: $FEATURE_NAME"
```

**For RESEARCH_BD (Architecture Research)**:
- Read system architecture (selective based on feature)
- Read SRS document: `[CONTEXT_DIR]/documents/[FEATURE]-BASE-srs.md`
- Display: `📄 Auto-read SRS + system context ([X] files)`

**For RESEARCH_DD (Detail Design Research)**:
- Read system architecture (selective based on feature)
- Read Basic Design document: `[CONTEXT_DIR]/documents/[FEATURE]-BASE-basic-design.md`
- Display: `📄 Auto-read Basic Design + system context ([X] files)`

**For RESEARCH_SRS (Initial Research)**:
- Read system architecture (selective based on feature)
- Display: `📚 Auto-read system architecture ([X] files)`

**Implementation**:
```bash
# Get current context
CONTEXT=$(node core/state/state-manager.js get)
STATE=$(echo "$CONTEXT" | jq -r '.state')
FEATURE_NAME=$(echo "$CONTEXT" | jq -r '.feature')

# Find active context directory (includes feature folder)
node core/cli/ops.js context-detect
CONTEXT_DIR=$(node -e "console.log(JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8')).data.contextPath||'')" 2>/dev/null || echo "")

# Step 1: Load system architecture based on feature
echo "🔍 Analyzing feature: $FEATURE_NAME"

# Smart context selection
case "$FEATURE_NAME" in
  *"test"* | *"aut"* | *"qa"*)
    LOAD_FILES=(
      "/documents/architecture/01-system-architecture.md"
      "/documents/architecture/05-api-specifications.md"
      "/documents/architecture/02-service-architecture.md"
    )
    echo "📚 Testing feature detected - loading full API and service context"
    ;;
  *"lend"* | *"loan"* | *"borrow"* | *"invest"*)
    LOAD_FILES=(
      "/documents/architecture/01-system-architecture.md"
    )
    # Selective loading from service architecture
    LOAD_SECTIONS=("lending-service" "risk-service" "banking-service")
    echo "💰 Lending feature detected - loading lending domain context"
    ;;
  *"insur"* | *"policy"* | *"claim"*)
    LOAD_FILES=(
      "/documents/architecture/01-system-architecture.md"
      "/documents/architecture/06-blockchain-design.md"
    )
    LOAD_SECTIONS=("insurance-service")
    echo "🛡️ Insurance feature detected - loading insurance and blockchain context"
    ;;
  *)
    LOAD_FILES=("/documents/architecture/01-system-architecture.md")
    echo "📄 Loading system overview only"
    ;;
esac

# Step 2: Auto-read feature documents based on state
if [ "$STATE" = "SRS_CREATED" ]; then
  # Try to find SRS with new naming convention
  SRS_PATH=$(ls "$CONTEXT_DIR/documents/"*-BASE-srs.md 2>/dev/null | head -1)
  # Fallback to old naming if exists
  [ -z "$SRS_PATH" ] && SRS_PATH="$CONTEXT_DIR/documents/01-requirements.md"
  if [ -f "$SRS_PATH" ]; then
    echo "📄 Auto-reading SRS document for context"
    LOAD_FILES+=("$SRS_PATH")
  fi
elif [ "$STATE" = "BD_CREATED" ]; then
  # Try to find Basic Design with new naming convention
  BD_PATH=$(ls "$CONTEXT_DIR/documents/"*-BASE-basic-design.md 2>/dev/null | head -1)
  # Fallback to old naming if exists
  [ -z "$BD_PATH" ] && BD_PATH="$CONTEXT_DIR/documents/02-basic-design.md"
  if [ -f "$BD_PATH" ]; then
    echo "📄 Auto-reading Basic Design document for context"
    LOAD_FILES+=("$BD_PATH")
  fi
fi

# Display loaded context summary
echo "✅ Loaded ${#LOAD_FILES[@]} context files for $FEATURE_NAME research"
```

---

## Step 5: Execute Research Agent

Activate the research-innovate agent in RESEARCH sub-mode with focused task:

**Task Description**: $ARGUMENTS

**Research Focus**: [Business Requirements | Architecture Patterns | API/UI/Test Strategies]

**System Architecture Context**:
- Loaded files: ${LOAD_FILES[@]}
- Feature domain: $FEATURE_NAME
- Selective sections: ${LOAD_SECTIONS[@]} (if applicable)

**Previous Document Context** (if applicable):
- For BD research: Include SRS content + system architecture
- For DD research: Include Basic Design content + system architecture
- For SRS research: Include system architecture only

**Evidence Collection Requirements**:
- **Minimum**: 3+ pieces of evidence
- **Quality**: 80%+ (official docs, working OSS examples, academic sources)
- **Sources**: Primary sources preferred (official documentation, regulations)

**The agent will**:
- Gather information only (read-only mode)
- Use tools: Read, Grep, Glob, WebSearch, WebFetch
- Review previous documents automatically (if provided)
- Save findings to evidence file in active context directory

**Evidence Location**:
```bash
# Evidence is saved to:
node core/cli/ops.js context-detect
CONTEXT_DIR=$(node -e "console.log(JSON.parse(require('fs').readFileSync('cache/ops-result.json','utf8')).data.contextPath||'')" 2>/dev/null || echo "")
EVIDENCE_FILE="$CONTEXT_DIR/evidence.md"
```

**Evidence Format**:
```markdown
### Evidence N: [Title]
- **Source**: [URL or reference]
- **Quality**: [0-100]%
- **Type**: [Primary/Secondary/Tertiary]
- **Summary**:
  [content]
```

---

## Step 6: Update State

After research completes, update state:

```bash
node core/state/state-manager.js update [RESEARCH_SRS | RESEARCH_BD | RESEARCH_DD]
```

Display completion message:
```
✅ Research complete for [Business Requirements | Architecture | Detail Design]

Evidence collected: X pieces
Previous document context: [SRS | Basic Design | None] ([X] lines read)
Next command: /innovate
```

---

## Quality Gate D1 (Will be checked by /innovate)

The evidence collected here will be validated when running `/innovate`:
- Evidence count ≥ 3 pieces
- Evidence quality ≥ 80%

If insufficient, `/innovate` will fail and require more research.

---

**Notes**:
- State is automatically tracked
- Context is per-feature/developer (no conflicts)
- Evidence accumulates for quality gate checking
