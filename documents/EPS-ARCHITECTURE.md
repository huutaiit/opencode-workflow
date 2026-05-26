# EPS Framework v10.0 — Tài liệu Kiến trúc

> Phiên bản: v10.0 (Auto-Chain Enforcement)
> Cập nhật: 2026-03-30
> Phạm vi: Toàn bộ `.claude/` — commands, skills, workflows, rules

---

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Cấu trúc thư mục](#2-cấu-trúc-thư-mục)
3. [State Machine — Workflow States](#3-state-machine--workflow-states)
4. [Stage 1: Design Pipeline](#4-stage-1-design-pipeline)
5. [Stage 2: Implementation Pipeline](#5-stage-2-implementation-pipeline)
6. [Commands — Danh mục đầy đủ](#6-commands--danh-mục-đầy-đủ)
7. [Micro-Command Architecture](#7-micro-command-architecture)
8. [Rules — Ràng buộc kỹ thuật](#8-rules--ràng-buộc-kỹ-thuật)
9. [Setup Commands](#9-setup-commands)
10. [Memory & Utility Commands](#10-memory--utility-commands)
11. [Skills — Tiện ích nội bộ](#11-skills--tiện-ích-nội-bộ)
12. [Auto-Chain Enforcement](#12-auto-chain-enforcement)
13. [Quality Gates](#13-quality-gates)

---

## 1. Tổng quan kiến trúc

EPS (Engineering Process System) Framework v10.0 là một hệ thống tự động hóa workflow phát triển phần mềm dựa trên Claude AI. Framework hoạt động theo nguyên tắc **2-command, auto-chain** — người dùng chỉ cần gõ 2 lệnh, toàn bộ quy trình từ nghiên cứu đến implement đều tự động chạy.

### Triết lý thiết kế

```
Human Input (minimal) ──→ Auto-Chain (maximal)
                           ↕
                   Approval Gates (checkpoints)
```

- **Người dùng**: Cung cấp yêu cầu, duyệt quyết định tại các checkpoint
- **Framework**: Tự động nghiên cứu, thiết kế, review, implement, validate
- **Gates**: Đảm bảo quality trước khi chuyển sang phase tiếp theo

### Hai Stage chính

| Stage | User Command | Auto-chain |
|-------|-------------|------------|
| **Stage 1** — Design | `/research` | → `/innovate` → `/design --srs` → `--basic` → `--detail` → `/design-review` |
| **Stage 2** — Implement | `/plan` | → `/plan-review` → `/plan-optimize` (nếu <95%) → `/execute` → `/validate` → confirm `/test` |

---

## 2. Cấu trúc thư mục

```
.claude/
├── commands/                    # Tất cả slash commands
│   ├── architect.md             # Router: 5-phase architecture docs
│   ├── commands.md              # Dashboard & registry
│   ├── config-project.md        # Auto-detect + configure tech stack
│   ├── design-review.md         # Quality review for Detail Design
│   ├── design.md                # Router: SRS/Basic/Detail/Test
│   ├── execute.md               # Router: Implement approved plan
│   ├── guide.md                 # User guide (Vietnamese)
│   ├── innovate.md              # Router: Decision engine (2 parts)
│   ├── list.md                  # List all memories
│   ├── plan-optimize.md         # Optimize plan < 95%
│   ├── plan-review.md           # Review plan quality (5 dimensions)
│   ├── plan-version.md          # Plan version management
│   ├── plan.md                  # Router: Multi-model planning
│   ├── recall.md                # Load memory from bank
│   ├── research.md              # Unified KB builder
│   ├── reverse-dd.md            # Reverse engineering → Detail Design
│   ├── save.md                  # Save context to memory
│   ├── specialist-unify.md      # Unify specialist files (5 phases)
│   ├── strict.md                # Enable strict workflow enforcement
│   ├── test.md                  # Run tests
│   ├── validate.md              # 3-pass validation
│   ├── workflow.md              # Full workflow guide
│   │
│   ├── architect/               # Sub-commands: 5 phases
│   │   ├── interview.md         # Phase 1: Smart interview + domain research
│   │   ├── adr.md               # Phase 2: Architecture Decision Records
│   │   ├── feature-map.md       # Phase 3: Feature mapping & dependencies
│   │   ├── documents.md         # Phase 4: Architecture documents
│   │   └── estimation.md        # Phase 5: Effort estimation
│   │
│   ├── design/                  # Sub-commands: Design document types
│   │   ├── README.md            # Design command structure
│   │   ├── srs.md               # SRS document workflow
│   │   ├── basic.md             # Basic Design (BD) workflow
│   │   ├── detail.md            # Detail Design router (FDD + BDD + API)
│   │   ├── detail-flow.md       # Detail design flow visualization
│   │   ├── test.md              # Test Plan document
│   │   ├── test-flow.md         # Test flow visualization
│   │   └── detail/              # Detail design micro-commands
│   │       ├── fdd.md           # Frontend Detail Design
│   │       ├── fdd-pseudo.md    # FDD → pseudo-code for /plan
│   │       ├── bdd.md           # Backend Detail Design
│   │       ├── bdd-pseudo.md    # BDD → pseudo-code for /plan
│   │       └── api-contract.md  # API contracts từ FDD Section 5
│   │
│   ├── innovate/                # Sub-commands: Decision engine
│   │   ├── README.md            # Innovate command structure
│   │   ├── srs.md               # Part 1 router: SRS decisions
│   │   ├── technical.md         # Part 2 router: BD+DD decisions
│   │   ├── bd.md                # Basic Design decisions
│   │   ├── dd.md                # Detail Design decisions
│   │   └── srs/                 # SRS micro-commands
│   │       ├── interview.md     # Lightweight interview
│   │       ├── evidence-synthesis.md  # Claude + Gemini synthesis
│   │       ├── decision-loop.md # Per-item decision + synthesis
│   │       ├── function-list.md # Draft + review + iterate
│   │       └── save.md          # Finalize + convention codes + save
│   │   └── technical/           # Technical micro-commands
│   │       ├── common.md        # Loading + Gemini setup
│   │       ├── architecture.md  # Architecture decisions
│   │       ├── implementation.md # Implementation decisions
│   │       └── save.md          # Merge BD+DD decisions + save
│   │
│   ├── plan/                    # Sub-commands: Planning
│   │   ├── feature-workflow.md  # Feature: state validation + D4 gate
│   │   ├── bugfix.md            # Bugfix plan workflow
│   │   ├── enhancement.md       # Enhancement delta workflow
│   │   ├── lightweight.md       # Lightweight plan
│   │   ├── context-loading.md   # RAG + patterns + evidence + specialists
│   │   ├── document-loading.md  # Mode-aware design doc loading
│   │   ├── generation.md        # Plan generation + auto-split
│   │   ├── save-and-display.md  # Save + state update + auto plan-review
│   │   └── reference-v25.md     # Plan v2.5 reference (không auto-load)
│   │
│   ├── execute/                 # Sub-commands: Execution
│   │   ├── pre-gates.md         # Stack load + state validation + G0 + confidence
│   │   ├── plan-loading.md      # Load plan + boundaries + checkpoint restore
│   │   ├── step-runner.md       # Per-step execution loop
│   │   └── finalize.md          # Feedback + verify-all + state EXECUTED
│   │
│   └── validate/                # Sub-commands: Validation
│       └── code-review.md       # Pass 3: Logic review (R1-R5)
│
└── rules/                       # Coding rules (auto-applied by path glob)
    ├── backend-java.md           # Java/Spring Boot rules
    ├── frontend-nextjs.md        # Next.js/React rules
    └── infrastructure.md         # Infrastructure stack rules
```

---

## 3. State Machine — Workflow States

EPS theo dõi tiến trình qua state machine. Mỗi feature có một context file riêng.

```
INITIAL
  │
  ▼ /research
RESEARCHED
  │
  ▼ /innovate (Part 1)
INNOVATE_SRS
  │
  ▼
SRS_CREATED
  │
  ▼ /innovate (Part 2)
INNOVATE_TECHNICAL
  │
  ▼ /design (auto-chain)
BD_DD_CREATED
  │
  ▼ /plan
PLAN_CREATED
  │
  ▼ /plan-review (auto)
PLAN_REVIEWED  ←──── /plan-optimize (nếu score < 95%)
  │
  ▼ /execute (auto)
EXECUTED
  │
  ▼ /validate (auto)
VALIDATED
  │
  ▼ /test (confirm)
TESTED ✅
```

### State → Next Command Mapping

| State | Hành động tiếp theo |
|-------|---------------------|
| `INITIAL` | `/research` |
| `RESEARCHED` | Auto: `/innovate` |
| `SRS_CREATED` | Auto: `/innovate` (Part 2) |
| `INNOVATE_TECHNICAL` | Auto: `/design` |
| `BD_DD_CREATED` | `/plan` (user gõ) |
| `PLAN_CREATED` | Auto: `/plan-review` |
| `PLAN_REVIEWED` | Auto: `/execute` |
| `EXECUTED` | Auto: `/validate` |
| `VALIDATED` | Confirm: `/test` |
| `TESTED` | Hoàn tất |

---

## 4. Stage 1: Design Pipeline

### 4.1. `/research` — Unified Knowledge Base Builder

**Mục đích**: Build comprehensive domain knowledge base trong 1 lần chạy duy nhất.

**Flags**:
- `--type new|enhancement|bugfix` — Task type
- `--input <path>` — File yêu cầu
- `--module <code>` — Module code

**Adaptive depth theo task type**:

| Task Type | Phases | Mô tả |
|-----------|--------|-------|
| `new` | 3 phases | Domain KB + Codebase survey + External refs |
| `enhancement` | 2 phases | Deep codebase scan + Impact analysis |
| `bugfix` | 2 phases | Root cause analysis + Targeted scan |

**Output**:
- `evidence.md` — với section tags `[SCOPE:SRS]`, `[SCOPE:BD]`, `[SCOPE:DD]`
- `domain-knowledge.md` (chỉ với `new`)
- State: `RESEARCHED`

**Multi-model**: Claude (primary) + Gemini (parallel, nếu có) cho `new` tasks.

**Enforcement Rules**:

| Rule | Mô tả |
|------|-------|
| R01 | Kiểm tra state, auto-resume nếu đã research |
| R04 | Mỗi section ≥2 evidence pieces có source citation |
| R06 | Gemini parallel research cho `new` tasks |
| R08 | Update state → RESEARCHED sau khi xong |

---

### 4.2. `/innovate` — Unified Decision Engine

**Mục đích**: Brainstorm và quyết định approach cho SRS + Technical design.

**2 Parts**:

```
Part 1: SRS Decisions
  srs.md → srs/interview.md → srs/evidence-synthesis.md
         → srs/decision-loop.md → srs/function-list.md → srs/save.md

Part 2: Technical Decisions
  technical.md → technical/common.md → technical/architecture.md
               → technical/implementation.md → technical/save.md
```

**Approval Gates**:
- User phải approve quyết định SRS (Part 1) trước khi chạy Part 2
- User phải approve quyết định Technical (Part 2) trước khi auto-chain design

**Auto-chain sau khi approve**:
```
/design --srs → /design --basic → /design --detail (FDD + BDD + API) → /design-review
```

**Auto-Split**: Nếu feature có sub-features (`subfeatures.json`), tạo per-sub SRS cho từng sub-feature.

**Output**:
- `innovate-srs-selection.md`
- `innovate-technical-selection.md`
- State: `BD_DD_CREATED`

---

### 4.3. `/design` — Design Document Generator

**Router** — phân phối theo flag:

| Flag | Document | Output File |
|------|----------|-------------|
| `--srs` | Software Requirements Specification | `{feature}-BASE-srs.md` |
| `--basic` | Basic Design (Architecture) | `{feature}-BASE-basic-design.md` |
| `--detail` | Detail Design (FDD + BDD + API) | `{feature}-BASE-frontend-detail-design.md` + `{feature}-BASE-backend-detail-design.md` + `{feature}-BASE-api-contracts.md` |
| `--test` | Test Plan | `{feature}-BASE-test-plan.md` |

**Detail Design Pipeline** (`--detail`):
```
detail.md (router)
  → design/detail/fdd.md          # Frontend Detail Design
  → design/detail/fdd-pseudo.md   # FDD → pseudo-code
  → design/detail/bdd.md          # Backend Detail Design
  → design/detail/bdd-pseudo.md   # BDD → pseudo-code
  → design/detail/api-contract.md # API contracts (từ FDD Section 5)
```

**BDD Sections** (10 bắt buộc, enforced bởi `ops.js`):
1. Entity & DAO
2. Repository
3. Service
4. Handler/Controller
5. Router/Endpoint
6. Unit Tests
7. Integration Tests
8. Error Handling
9. Security
10. Performance

---

### 4.4. `/design-review` — Quality Review

**Mục đích**: Multi-layer automated quality review cho Detail Design.

**Scoring**:
- **Hard Gates** (Binary PASS/FAIL): Nếu FAIL → block tiến trình
- **Soft Scores** (0-100): Ngưỡng tối thiểu để pass

**Output**: Quality report với scoring chi tiết.

---

## 5. Stage 2: Implementation Pipeline

### 5.1. `/plan` — Multi-Model Planning System

**Architecture**: Thin router + micro-commands.

**Execution Constraints**:
- INLINE only — NO Agent/Task tool
- SEQUENTIAL — NO parallel execution
- Mỗi sub-plan generate xong, WRITE xong mới tiếp

**Routing theo task type**:

| Task Type | Micro-command chain | Context loaded |
|-----------|--------------------|----|
| `new/feature` | feature-workflow → context-loading → document-loading → generation → save-and-display | ~1,470 lines |
| `bugfix` | bugfix → save-and-display | ~430 lines |
| `enhancement` | enhancement → context-loading → generation → save-and-display | ~1,190 lines |

**Persona flags** (optional): `--persona architect|security|frontend|backend|...`
- Điều chỉnh confidence thresholds và KB loading

**Auto-chain sau plan**:
```
/plan → /plan-review (auto) → /plan-optimize (nếu <95%, tối đa 3 lần) → /execute (auto)
```

**Micro-command File Index**:

| File | Steps | Mục đích |
|------|-------|---------|
| `plan/feature-workflow.md` | 1-2 | State validation + Quality Gate D4 |
| `plan/bugfix.md` | 1B | Evidence-based bugfix plan |
| `plan/enhancement.md` | 1C | Enhancement delta workflow |
| `plan/context-loading.md` | 2.5-2.10 | RAG + patterns + evidence + specialists + arch |
| `plan/document-loading.md` | 3 | Mode-aware design doc loading |
| `plan/generation.md` | 4+4.5 | Plan generation INLINE + auto-split |
| `plan/save-and-display.md` | 5-7 | Save + state update + AUTO plan-review |

---

### 5.2. `/execute` — Implementation Engine

**Architecture**: Thin router + micro-commands.

**Execution Constraints**:
- SEQUENTIAL ONE step at a time — NO parallel agents
- CHECKPOINT required sau mỗi step (dual-layer: design-checkpoint + execution-state.json)
- BOUNDARY ENFORCEMENT — chỉ modify files trong `allowedFiles` của plan

**Micro-command chain**:
```
execute.md
  → execute/pre-gates.md     # Stack load + state validation + G0 + confidence check
  → execute/plan-loading.md  # Load plan + boundaries + checkpoint restore
  → execute/step-runner.md   # Per-step execution loop
  → execute/finalize.md      # Feedback + verify-all + state → EXECUTED
```

**Auto-chain sau execute**:
```
/execute → /validate (auto, mandatory) → confirm /test (human-in-loop)
```

**Strict Mode Rules**:
- Execute ONLY những gì trong plan
- Validate mỗi file trước khi edit
- Stop và hỏi user nếu deviation detected
- NO improvisation, NO bonus improvements
- NO new methods trừ khi trong plan

---

### 5.3. `/validate` — Three-Pass Validation

**Mục đích**: Kiểm tra implementation chất lượng so với design.

**3 Passes**:

#### Pass 1: Per-File Validation (weight: 40%)
Validate mỗi file đã thay đổi với 4 tiêu chí:

| Tiêu chí | Weight | Mô tả |
|---------|--------|-------|
| Naming Convention | 20% | Theo specialist metadata |
| Pattern Compliance | 30% | Theo specialist patterns |
| Architecture Rules | 25% | Import rules từ metadata |
| Plan Compliance | 25% | File có trong allowedFiles |

#### Pass 2: Per-Dimension Quality Gates (weight: 20%)
- **Architecture Analyzer**: Cross-file dependency, layer violations, circular deps
- **Plan Compliance Gate**: Files (40%) + Methods (40%) + Test files (20%)

#### Pass 3: Code Review — Logic Review (weight: 40%)
Dimensions R1-R5:

| Dim | Mô tả | Task types |
|-----|-------|-----------|
| R1 | Business Logic vs BD/evidence.md | feature |
| R2 | API Contract vs DD api-contracts | feature |
| R3 | Edge Cases vs DD pseudo/evidence | feature, enhancement, bugfix |
| R4 | Abnormal Cases vs Plan Section 3.1 | feature, enhancement, bugfix |
| R5 | Specialist pattern depth review | all |

**Threshold**: ≥90% → VALIDATED, <90% → stays EXECUTED

**Fallback** (khi Pass 3 không available): 60% Pass1 + 40% Pass2

---

### 5.4. `/test` — Test Runner

**Trigger**: Chỉ chạy sau khi user confirm (human-in-loop).

**Prerequisite**: State = VALIDATED

**Actions**:
- Backend: `mvn test` (nếu có `pom.xml`)
- Frontend: `npm test` (nếu có `package.json`)

---

## 6. Commands — Danh mục đầy đủ

### 6.1. User Commands (2 commands chính)

| Command | Mô tả | Auto-chains to |
|---------|-------|---------------|
| `/research` | Bắt đầu Stage 1 — Build knowledge base | `/innovate` → `/design` → `/design-review` |
| `/plan` | Bắt đầu Stage 2 — Tạo + implement plan | `/plan-review` → `/execute` → `/validate` → `/test` |

### 6.2. Setup Commands (chạy 1 lần)

| Command | Mô tả |
|---------|-------|
| `/config-project` | Auto-detect tech stack, tạo `project-config.json` |
| `/architect` | Tạo architecture docs (5 phases) |

### 6.3. Auto-Chain Commands (tự động, không cần gõ)

| Command | Trigger | Mô tả |
|---------|---------|-------|
| `/innovate` | Sau RESEARCHED | SRS + Technical decisions (2 parts) |
| `/design --srs` | Sau INNOVATE_TECHNICAL | Tạo SRS document |
| `/design --basic` | Sau SRS_CREATED | Tạo Basic Design |
| `/design --detail` | Sau BD_CREATED | Tạo FDD + BDD + API contracts |
| `/design-review` | Sau DD_CREATED | Quality review |
| `/plan-review` | Sau PLAN_CREATED | Review plan (threshold: 95%) |
| `/plan-optimize` | Khi score <95% | Optimize plan (max 3 lần) |
| `/execute` | Sau PLAN_REVIEWED | Implement từng bước |
| `/validate` | Sau EXECUTED | 3-pass validation |

### 6.4. Memory Commands

| Command | Mô tả |
|---------|-------|
| `/save` | Lưu context vào branch-aware memory bank |
| `/recall` | Nạp context từ memory bank |
| `/list` | Liệt kê tất cả memories |

### 6.5. Utility Commands

| Command | Mô tả |
|---------|-------|
| `/guide [--option]` | Hướng dẫn framework (Vietnamese) |
| `/commands` | Dashboard tất cả commands |
| `/plan-version` | Quản lý phiên bản plan |
| `/reverse-dd` | Reverse engineering code → Detail Design |
| `/validate:code-review` | Code review logic vs design docs |
| `/specialist-unify --stack <name>` | Unify specialist files (5 phases) |
| `/strict` | Enable strict workflow enforcement |

---

## 7. Micro-Command Architecture

EPS sử dụng kiến trúc **Thin Router + Micro-Commands** để:
1. Giảm context window overhead
2. Load on-demand qua Read tool
3. Tái sử dụng micro-commands giữa các routers

### Pattern

```
router.md (thin ~200 lines)
  ├── Step 0: Parse flags + detect state
  ├── Step 0.5: Route decision
  └── Dispatch → Read micro-command file → follow instructions
                  ↓
              micro-command.md executes → RETURN to router
                  ↓
              router auto-chains next step
```

### Architect Sub-Commands (5 phases)

```
/architect
  Phase 1: architect/interview.md     # Smart interview + domain research
  Phase 2: architect/adr.md           # Architecture Decision Records
  Phase 3: architect/feature-map.md   # Feature dependency mapping
  Phase 4: architect/documents.md     # Architecture documents
  Phase 5: architect/estimation.md    # Effort estimation
```

**Outputs**:
- `documents/architecture/assessment.md`
- `documents/architecture/domain-knowledge.md`
- `documents/architecture/decisions/ADR-NNN-*.md`
- `documents/architecture/feature-map.md`

---

## 8. Rules — Ràng buộc kỹ thuật

Rules được apply tự động khi Claude làm việc với files khớp path glob.

### 8.1. Backend Java Rules

**Paths**: `backend/**/*.java`, `backend/**/*.xml`, `backend/**/pom.xml`

| Category | Rules |
|----------|-------|
| Architecture | Clean Architecture + Hexagonal pattern |
| Stack | Spring Boot 3.4.4, Java 21, WebFlux + R2DBC |
| Prohibited | JPA, Servlet stack |
| Naming | `CmnM*`, `CmnT*`, `SfaM*`, `SfaT*`, `CtmM*`, `TntM*` |
| Code gen | EPS framework only (NOT JHipster) |
| Layer order | Entity → DAO → Repository → Service → Handler → Router |

**Module structure**:
- `common/` — 87 entities, shared library
- `core-manager/` — 59 controllers, core business
- `sfa-manager/` — 22 controllers, SFA
- `gateway/` — API routing, auth

### 8.2. Frontend Next.js Rules

**Paths**: `frontend/**/*.tsx`, `frontend/**/*.ts`, `frontend/**/*.css`

| Category | Rules |
|----------|-------|
| Stack | Next.js 16.0.7 + App Router, React 19.0.1 |
| UI | Ant Design 5.25.1 |
| State | Redux Toolkit 2.6.1 |
| Routes | `src/app/` |
| Modules | `presentation/ui/modules/` (16 modules) |
| API clients | `infrastructure/api/` (55+) |

**Module codes**:
- `cmn001000`: Customer
- `cmn002000`: Category
- `cmn005000`: User/Permission
- `cmn007000`: Schedule
- `cmn015000`: Workflow Designer
- `ctm001000`: Page Builder
- `sfa001000-006000`: Sales force modules

### 8.3. Infrastructure Rules

**Paths**: `docker-compose*.yml`, `k8s/**`, `*.Dockerfile`, `.github/**`

| Component | Version |
|-----------|---------|
| PostgreSQL | 17 |
| Redis | 7.4 |
| Elasticsearch | 8.17 |
| Kafka | 3.9 |
| Keycloak | 26.x |
| Consul | 1.20 |
| Docker | 27.x |
| Kubernetes | 1.32 |

**Multi-tenant**: Isolation tại DB schema level.

---

## 9. Setup Commands

### `/config-project`

**Mục đích**: Auto-detect tech stack và tạo cấu hình EPS cho project.

**Actions**:
1. Scan `pom.xml`, `package.json`, `docker-compose.yml`
2. Detect: backend stack, frontend stack, database, infrastructure
3. Interactive confirmation nếu không chắc chắn
4. Output: `.claude/config/project-config.json`

**Reads**: `hippo-config.json` nếu có.

---

### `/architect`

**Mục đích**: Tạo toàn bộ architecture documentation cho project.

**5 Phases** (sequential, state-tracked):

| Phase | File | Output |
|-------|------|--------|
| 1. Interview | `architect/interview.md` | `assessment.md`, `domain-knowledge.md` |
| 2. ADRs | `architect/adr.md` | `decisions/ADR-NNN-*.md` |
| 3. Feature Map | `architect/feature-map.md` | `feature-map.md` |
| 4. Documents | `architect/documents.md` | Architecture docs |
| 5. Estimation | `architect/estimation.md` | Estimation report |

**Modes**:
- **Greenfield**: Thiết kế từ đầu
- **Reverse-engineer**: Phân tích từ code có sẵn

---

## 10. Memory & Utility Commands

### `/save`

Lưu context vào branch-aware memory bank.

```
/save [--tag <tag>] [--note <note>]
```

### `/recall`

Nạp context từ memory bank cho branch hiện tại.

### `/list`

Liệt kê tất cả memories theo branch.

---

### `/specialist-unify`

**Mục đích**: Hợp nhất specialist files khi stack có nhiều thế hệ hoặc cấu trúc lộn xộn.

**5 Phases**:

| Phase | Mô tả |
|-------|-------|
| 1. SCAN | Inventory + validate metadata compliance |
| 2. ANALYZE | Pattern mapping + overlap detection |
| 3. DESIGN | Metadata registry + specialist index |
| 4. EXECUTE | Generate unified files |
| 5. VALIDATE | Verification + unification report |

**Stacks**: `java-springboot`, `typescript-nextjs`, `react`, `nestjs`, `csharp-dotnet`

```bash
/specialist-unify --stack react           # Chạy cả 5 phases
/specialist-unify --stack react --phase scan  # Chỉ phase cụ thể
```

---

### `/reverse-dd`

**Mục đích**: Reverse engineering từ code có sẵn → tạo Detail Design document.

Hữu ích khi:
- Code đã có nhưng chưa có documentation
- Cần regenerate design docs từ implementation

---

### `/guide`

**Mục đích**: Hướng dẫn sử dụng framework (toàn bộ bằng tiếng Việt).

**Options**:

| Option | Mô tả |
|--------|-------|
| (không có) | Hiển thị danh sách options |
| `--workflow` | Giải thích 2-stage auto-chain workflow |
| `--commands` | Danh sách tất cả commands |
| `--specialist-unify` | Hướng dẫn specialist-unify (5 phases) |
| `--status` | Trạng thái workflow hiện tại |
| `--next` | Bước tiếp theo + gợi ý |
| `--quick` | Quick start guide |

---

## 11. Skills — Tiện ích nội bộ

Skills là các tiện ích được invoke từ bên trong commands, không phải user-facing commands.

### Core Skills

| Skill | Mục đích | Invoke từ |
|-------|---------|-----------|
| `workflow-state-validator` | Validate state transition trước khi chạy phase | plan.md, execute.md, validate.md |
| `quality-gate-check` | Kiểm tra quality gates D1-D4, G0 | plan.md, execute.md |
| `architecture-analyzer` | Cross-file dependency + layer violation check | validate.md Pass 2 |
| `confidence-check` | Pre-implementation confidence (≥90% required) | execute/pre-gates.md |
| `design-validator` | Validate design doc vs Q1-Q4 criteria | design-review.md |
| `pattern-analyzer` | Phân tích code patterns, conflict detection | validate.md |
| `evidence-fusion` | Merge evidence từ multiple sources | innovate SRS workflow |
| `multi-model-executor` | Generate alternatives dùng Gemini + Claude | innovate technical workflow |
| `test-analyzer` | Analyze test quality + coverage + patterns | test.md |
| `coverage-reporter` | Generate coverage reports (JaCoCo/Istanbul) | test.md |

---

## 12. Auto-Chain Enforcement

### PostToolUse Hook

File: `guards/hooks/auto-chain.js`

**Cơ chế**: Sau khi một Skill hoàn thành, hook tự động inject `additionalContext` vào conversation, yêu cầu Claude chạy command tiếp theo ngay lập tức.

**Các chains được enforce**:
- Sau `/execute` → inject instruction chạy `/validate`
- Workflow gate: block `/validate` nếu state ≠ `EXECUTED`
- Workflow gate: block `/test` nếu state ≠ `VALIDATED`

### State Manager

File: `core/state/state-manager.js`

**Commands**:
```bash
node core/state/state-manager.js init <featureId> <developer> --task-type <type>
node core/state/state-manager.js update <STATE>
node core/state/state-manager.js get
```

### Design Checkpoint

**Dual-layer checkpoint system**:
1. `design-checkpoint` — Track completion của từng bước
2. `execution-state.json` — Track files + methods đã implement

**Tác dụng**: Cho phép resume sau khi bị interrupt.

---

## 13. Quality Gates

### Design Quality Gates

| Gate | Trigger | Criteria |
|------|---------|---------|
| D1 | Sau research | Evidence completeness (≥2 pieces/section) |
| D2 | Sau innovate | Decision coverage (SRS + Technical) |
| D3 | Sau design | Document completeness (SRS + BD required) |
| D4 | Trước plan | All required design docs exist + validated |

### Implementation Quality Gates

| Gate | Threshold | Action nếu fail |
|------|-----------|----------------|
| G0 | Confidence ≥90% | Stop execute, request clarification |
| Plan Review | 95% | Auto-optimize (max 3 lần), sau đó stop |
| Validation | 90% | Stay EXECUTED, display violations |

### Validation Scoring

| Pass | Weight (với P3) | Weight (không P3) |
|------|----------------|------------------|
| Pass 1: Per-file | 40% | 60% |
| Pass 2: Dimensions | 20% | 40% |
| Pass 3: Code Review | 40% | N/A |

---

## Phụ lục: Quick Reference

### Installation

```bash
npm install eps-workflow --registry http://192.168.9.60:4873
npx eps init
```

### First-time Setup

```bash
/config-project    # Auto-detect tech stack
/architect         # Tạo architecture docs (nếu project mới)
```

### Feature mới

```bash
/research --type new --input docs/requirements/REQ-001.md
# → auto-chain: innovate → design → design-review

/plan
# → auto-chain: plan-review → execute → validate → test
```

### Bugfix

```bash
/research --type bugfix --input <bug-description>
# → skip innovate/design

/plan
# → bugfix plan → execute → validate → test
```

### Kiểm tra trạng thái

```bash
node core/state/state-manager.js get
/guide --status
/guide --next
```
