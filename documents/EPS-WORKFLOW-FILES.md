# EPS Framework — Workflow Chi tiết & File Output

> Tài liệu này mô tả đầy đủ workflow từng lệnh: tạo file gì, lưu ở đâu, ý nghĩa mỗi file.
> Cập nhật: 2026-03-30 | EPS v10.0

---

## Mục lục

1. [Sơ đồ thư mục tổng thể](#1-sơ-đồ-thư-mục-tổng-thể)
2. [/config-project](#2-config-project)
3. [/architect](#3-architect)
4. [/research](#4-research)
5. [/innovate](#5-innovate)
6. [/design --srs](#6-design---srs)
7. [/design --basic](#7-design---basic)
8. [/design --detail](#8-design---detail)
9. [/design --test](#9-design---test)
10. [/plan](#10-plan)
11. [/execute](#11-execute)
12. [/validate](#12-validate)
13. [/test](#13-test)
14. [/save · /recall · /list](#14-save--recall--list)
15. [Bảng tổng hợp toàn bộ file output](#15-bảng-tổng-hợp-toàn-bộ-file-output)

---

## 1. Sơ đồ thư mục tổng thể

```
project-root/
│
├── .claude/                           ← Framework config
│   ├── config/
│   │   └── project-config.json        ← /config-project output
│   └── memory-bank/                   ← Tất cả context per-feature
│       └── {branch}/
│           └── {FEATURE_ID}-{developer}/    ← Context directory
│               ├── context.md               ← Trạng thái workflow
│               ├── evidence.md              ← Evidence từ research
│               ├── domain-knowledge.md      ← Domain KB (new features)
│               ├── innovate-srs-selection.md     ← Decisions Part 1
│               ├── innovate-technical-selection.md ← Decisions Part 2
│               ├── plans/
│               │   ├── {feature}-implementation-plan.md  ← Monolithic plan
│               │   ├── {feature}-master-plan.md          ← Master index (auto-split)
│               │   └── SP-{n}-{title}.md                 ← Sub-plans (auto-split)
│               ├── execution-checkpoints/
│               │   └── execution-state.json   ← Checkpoint resume data
│               ├── validation-report.md       ← /validate output
│               └── test-run-report.md         ← /test run output
│
├── documents/                         ← Design documents (persistent)
│   ├── architecture/                  ← /architect output
│   │   ├── assessment.md
│   │   ├── domain-knowledge.md
│   │   ├── feature-map.md
│   │   └── decisions/
│   │       └── ADR-NNN-*.md
│   └── features/
│       └── {FEATURE_ID}-{name}/       ← Design docs per-feature
│           ├── .subfeatures.json      ← Sub-feature registry
│           ├── reasoning.json         ← BD reasoning (internal)
│           ├── {feature}-BASE-srs.md
│           ├── {feature}-BASE-basic-design.md
│           ├── {feature}-BASE-frontend-detail-design.md
│           ├── {feature}-BASE-backend-detail-design.md
│           ├── {feature}-BASE-api-contracts.md
│           └── {feature}-BASE-test-plan.md
│
├── cache/
│   └── ops-result.json                ← Temp CLI output (auto-overwrite)
│
└── .checkpoints/                      ← Design checkpoint locks
    ├── srs-s0.lock … srs-s6.lock
    ├── basic-s0.lock … basic-s6.lock
    └── detail-*.lock
```

**Quy ước đặt tên**:
- `{branch}` = tên git branch hiện tại (vd: `feature/cmn001-customer`)
- `{FEATURE_ID}` = ID feature từ file requirement (vd: `REQ-001`)
- `{developer}` = git user.name lowercase, dấu cách → gạch ngang (vd: `nguyen-van-a`)
- `{feature}` = tên feature lowercase-kebab (vd: `customer-management`)
- `BASE` = placeholder — cho monolithic feature; replaced bởi sub-feature code khi split

---

## 2. /config-project

### Mục đích
Auto-detect tech stack và tạo cấu hình EPS cho project. Chỉ cần chạy **một lần** khi setup project mới.

### Workflow

```
/config-project
  ├── Scan: pom.xml → detect backend (Spring Boot version, Java version)
  ├── Scan: package.json → detect frontend (Next.js, React, libs)
  ├── Scan: docker-compose.yml → detect infrastructure
  ├── Scan: hippo-config.json (nếu có) → merge existing config
  ├── Interactive confirm (nếu không chắc chắn)
  └── Write: .claude/config/project-config.json
```

### Files tạo ra

| File | Vị trí | Ý nghĩa |
|------|--------|---------|
| `project-config.json` | `.claude/config/project-config.json` | Cấu hình tech stack cho toàn project. Được đọc bởi tất cả commands để load stack context. |

### Cấu trúc `project-config.json`

```json
{
  "stackKey": "java-springboot-nextjs",
  "backend": {
    "framework": "spring-boot",
    "version": "3.4.4",
    "language": "java",
    "javaVersion": "21",
    "orm": "R2DBC",
    "webStack": "WebFlux"
  },
  "frontend": {
    "framework": "nextjs",
    "version": "16.0.7",
    "uiLibrary": "antd",
    "stateManagement": "redux-toolkit"
  },
  "infrastructure": {
    "database": "postgresql:17",
    "cache": "redis:7.4",
    "search": "elasticsearch:8.17",
    "queue": "kafka:3.9",
    "auth": "keycloak:26.x"
  }
}
```

---

## 3. /architect

### Mục đích
Tạo toàn bộ architecture documentation cho project. 5 phases, chạy tuần tự, có state tracking riêng.

### Workflow

```
/architect [--phase N]
  │
  ├── Phase 1: architect/interview.md
  │     ├── Smart interview (greenfield hoặc reverse-engineer)
  │     ├── Domain research (inline + web search)
  │     └── Write: documents/architecture/assessment.md
  │               documents/architecture/domain-knowledge.md
  │
  ├── Phase 2: architect/adr.md
  │     ├── Propose architecture alternatives
  │     ├── Trade-off analysis
  │     └── Write: documents/architecture/decisions/ADR-NNN-*.md
  │
  ├── Phase 3: architect/feature-map.md
  │     ├── Phân tích feature dependencies
  │     ├── Classify: core / important / nice-to-have
  │     └── Write: documents/architecture/feature-map.md
  │
  ├── Phase 4: architect/documents.md
  │     └── Write: documents/architecture/*.md (các tài liệu kiến trúc)
  │
  └── Phase 5: architect/estimation.md
        └── Write: documents/architecture/estimation.md
```

### Files tạo ra

| File | Vị trí | Ý nghĩa |
|------|--------|---------|
| `assessment.md` | `documents/architecture/` | Đánh giá tổng thể domain, hiện trạng hệ thống, công nghệ phù hợp. Input cho Phase 2+. |
| `domain-knowledge.md` | `documents/architecture/` | Knowledge base về domain: workflows, entities, regulations, patterns. Tái sử dụng nhiều lần. |
| `ADR-NNN-*.md` | `documents/architecture/decisions/` | Architecture Decision Records. Mỗi file = 1 quyết định kiến trúc với: context, alternatives, decision, consequences. Format: `ADR-001-reactive-stack.md`. |
| `feature-map.md` | `documents/architecture/` | Bản đồ features: dependency graph, classification, priority. |
| `estimation.md` | `documents/architecture/` | Ước tính effort, complexity, timeline. |

---

## 4. /research

### Mục đích
Build comprehensive knowledge base trong **một lần duy nhất** cho tất cả phases (SRS + BD + DD). Thay thế pattern cũ phải chạy research 3 lần.

### Workflow

```
/research [--type new|enhancement|bugfix] [--input <path>] [--module <code>]
  │
  ├── Step 0: Smart Onboarding
  │     ├── 0.1: Kiểm tra context hiện tại (auto-resume nếu đã research)
  │     ├── 0.2: Parse flags (--type, --input, --module)
  │     └── 0.3: Interactive interview nếu không có flags
  │           Q1: Input file hoặc mô tả yêu cầu?
  │           Q2: Task type? (auto-detect + confirm)
  │           Q3: Module? (auto-detect + confirm)
  │
  ├── Step 0.4: Create Context
  │     └── Write: .claude/memory-bank/{branch}/{FEATURE}-{dev}/context.md
  │
  ├── Step 1: Route by Task Type
  │     ├── new        → Step 2A (3 phases)
  │     ├── enhancement → Step 2B (2 phases)
  │     └── bugfix      → Step 2C (2 phases)
  │
  ├── Step 2A (new — 3 phases):
  │     ├── Phase 1: Domain Knowledge Base
  │     │     └── Append: domain-knowledge.md
  │     ├── Phase 2: Codebase Analysis
  │     │     └── Append: evidence.md [SCOPE:BD]
  │     └── Phase 3: External References
  │           └── Append: evidence.md [SCOPE:SRS], [SCOPE:DD]
  │
  ├── Step 2B (enhancement — 2 phases):
  │     ├── Phase 1: Deep Codebase Scan → evidence.md [SCOPE:BD]
  │     └── Phase 2: Impact Analysis → evidence.md [SCOPE:DD]
  │
  ├── Step 2C (bugfix — 2 phases):
  │     ├── Phase 1: Root Cause Analysis → evidence.md [SCOPE:FIX]
  │     └── Phase 2: Targeted Codebase Scan → evidence.md [SCOPE:FIX]
  │
  ├── Step 3: Synthesize & Save Evidence
  │     ├── Validate: mỗi section ≥ 2 evidence pieces có source citation
  │     ├── Write: evidence.md
  │     └── Write: domain-knowledge.md (chỉ new)
  │
  └── Step 4: Update State → RESEARCHED
```

### Files tạo ra

| File | Vị trí | Ý nghĩa |
|------|--------|---------|
| `context.md` | `.claude/memory-bank/{branch}/{FEATURE}-{dev}/` | **File trung tâm** của mỗi feature. Chứa: Feature ID, Developer, Task Type, Module, Current State, Requirement file path, Decisions Log. Được đọc/cập nhật bởi mọi command sau. |
| `evidence.md` | `.claude/memory-bank/{branch}/{FEATURE}-{dev}/` | Evidence research có cấu trúc theo sections với scope tags. Mỗi section chứa findings + source citations. Dùng làm input cho innovate + design. |
| `domain-knowledge.md` | `.claude/memory-bank/{branch}/{FEATURE}-{dev}/` | *(chỉ task type = new)* Knowledge base domain: standard workflows, core entities, regulatory requirements, reference architectures, edge cases. Được tái sử dụng cho SRS generation. |

### Cấu trúc `context.md`

```markdown
# Feature Context: REQ-001

| Field | Value |
|-------|-------|
| Feature ID | REQ-001 |
| Developer | nguyen-van-a |
| Task Type | new |
| Module | cmn001000 |
| Branch | feature/cmn001-customer |
| Requirement File | docs/requirements/REQ-001.md |
| Current State | **RESEARCHED** |
| Created | 2026-03-30T10:00:00Z |

## Decisions Log

| # | Phase | Decision | Choice | Rationale | Corrects |
|---|-------|----------|--------|-----------|----------|
| 1 | RESEARCH | Task type | new | No existing feature | — |
```

### Cấu trúc `evidence.md`

```markdown
# Evidence Report: REQ-001

## Metadata
- Feature: REQ-001
- Task Type: new
- Module: cmn001000
- Generated: 2026-03-30

## Section 1: Business Context [SCOPE:SRS]
[Evidence pieces về business requirements, regulations, workflows]
Source: [citation]

## Section 2: Architecture Patterns [SCOPE:BD]
[Evidence pieces về architecture patterns, existing codebase]
Source: [citation]

## Section 3: Implementation References [SCOPE:DD]
[Evidence pieces về implementation patterns, API designs]
Source: [citation]
```

---

## 5. /innovate

### Mục đích
Decision engine — brainstorm và quyết định approach cho SRS + Technical design trước khi tạo documents. User phải approve tại 2 checkpoint.

### Workflow

```
/innovate
  │
  ├── Step 0: Detect State & Route
  │     RESEARCHED        → Full flow (Part 1 → Part 2 → Auto-chain)
  │     SRS_CREATED       → Resume từ Part 2
  │     INNOVATE_TECHNICAL → Skip to Auto-chain only
  │     BD_DD_CREATED     → Done
  │     bugfix            → Skip innovate → chuyển thẳng sang /plan
  │
  ├── Step 1: Part 1 — SRS Decisions (inline)
  │     Loads: innovate/srs.md → srs/interview.md
  │                             → srs/evidence-synthesis.md
  │                             → srs/decision-loop.md
  │                             → srs/function-list.md
  │                             → srs/save.md
  │     [APPROVAL GATE: user duyệt SRS decisions]
  │     Write: innovate-srs-selection.md
  │     Update: evidence.md (section 2.1)
  │     Update: context.md (decisions log)
  │     State: → INNOVATE_SRS → SRS_CREATED
  │
  ├── Step 1.5: Auto-Split Check
  │     Nếu có .subfeatures.json với ≥2 sub-features:
  │     Write: {sub-code}-srs.md cho từng sub-feature
  │     → RETURN (user chạy /research cho từng sub-feature)
  │
  ├── Step 2: Part 2 — Technical Decisions (inline)
  │     Loads: innovate/technical.md → technical/common.md
  │                                  → technical/architecture.md
  │                                  → technical/implementation.md
  │                                  → technical/save.md
  │     [APPROVAL GATE: user duyệt Technical decisions]
  │     Write: innovate-technical-selection.md
  │     Update: evidence.md (section 2.2)
  │     Update: context.md (decisions log)
  │     State: → INNOVATE_TECHNICAL
  │
  └── Step 3: Auto-chain Design Generation
        ├── Tạo v1-compatible adapter files (temp)
        ├── /design --srs → Write: {feature}-BASE-srs.md
        ├── /design --basic → Write: {feature}-BASE-basic-design.md
        └── /design --detail → Write: FDD + BDD + API contracts
              State: → BD_DD_CREATED
```

### Files tạo ra

| File | Vị trí | Ý nghĩa |
|------|--------|---------|
| `innovate-srs-selection.md` | `.claude/memory-bank/{branch}/{FEATURE}-{dev}/` | Kết quả Part 1: Business approach đã được user approve, justification, alternatives considered, functional scope + function list. Input bắt buộc cho `/design --srs`. |
| `innovate-technical-selection.md` | `.claude/memory-bank/{branch}/{FEATURE}-{dev}/` | Kết quả Part 2: Tất cả technical decisions đã approve — BD decisions (architecture) + DD decisions (implementation). Input cho `/design --basic` và `/design --detail`. |
| `{sub-code}-srs.md` | `documents/features/{FEATURE}-{name}/` | *(chỉ khi auto-split)* SRS riêng cho từng sub-feature. Trích xuất từ BASE SRS theo functional requirements của sub-feature. |

### Cấu trúc `innovate-srs-selection.md`

```markdown
# Innovate SRS Selection: REQ-001

## Business Approach (APPROVED)
**Approach**: [tên approach đã chọn]
**Justification**: [lý do chọn]
**Alternatives Considered**: [list alternatives và tại sao không chọn]

## Functional Scope
**Included**: [list functions]
**Excluded**: [out of scope]

## Function List (APPROVED)
| # | Function | Priority | Complexity |
|---|----------|----------|------------|
| 1 | [function name] | HIGH | M |
```

### Cấu trúc `innovate-technical-selection.md`

```markdown
# Innovate Technical Selection: REQ-001

## Inherited from SRS (LOCKED)
[Reference đến SRS decisions]

## BD Decisions (Architecture) [FROM-BD]
| # | Item | Selected | Source |
|---|------|----------|--------|
| 1 | Database pattern | Repository pattern | Innovation |
| 2 | API style | REST with WebFlux | Architecture rules |

## DD Decisions (Implementation) [FROM-DD]
| # | Item | Selected | Source |
|---|------|----------|--------|
| 1 | Caching strategy | Redis L2 cache | Evidence |

## Summary
| Category | Count |
|----------|-------|
| Architecture | 5 |
| Implementation | 3 |

**Status**: APPROVED
```

---

## 6. /design --srs

### Mục đích
Tạo Software Requirements Specification document. Tập trung vào **WHAT/WHY**, không phải HOW (implementation).

### Workflow

```
/design --srs
  │
  ├── Pre-checks
  │     ├── State validation (INNOVATE_SRS)
  │     ├── Quality Gate D1: evidence ≥3 sources, quality ≥80%
  │     └── Stack context loading (RAG + architecture patterns)
  │
  ├── Section Loop (7 sections, sequential với checkpoint enforcement)
  │     ├── S0: Document Info      ← Read: specialists/document/srs/00-document-info.md
  │     ├── S1: Overview           ← Read: specialists/document/srs/01-overview.md
  │     ├── S2: Functional Req.    ← Read: specialists/document/srs/02-functional-requirements.md
  │     ├── S3: Non-Functional Req.← Read: specialists/document/srs/03-non-functional-requirements.md
  │     ├── S4: User Stories       ← Read: specialists/document/srs/04-user-stories.md
  │     ├── S5: Acceptance Criteria← Read: specialists/document/srs/05-acceptance-criteria.md
  │     └── S6: Constraints        ← Read: specialists/document/srs/06-constraints.md
  │
  │     Mỗi section: Verify checkpoint → Load graph context → Generate → Write → Checkpoint → Design-validate
  │
  ├── Final validation: language-validator + prohibited-content + consistency + evidence validators
  ├── Update: evidence.md (section 3.1 SRS Summary)
  ├── Update: context.md (decisions log)
  └── State: → SRS_CREATED
```

### Files tạo ra

| File | Vị trí | Ý nghĩa |
|------|--------|---------|
| `{feature}-BASE-srs.md` | `documents/features/{FEATURE}-{name}/` | **SRS document hoàn chỉnh**. 7 sections, tiếng Việt ≥60%. Chứa: FR-XXX, NFR-XXX, US-[ROLE]-XXX, business rules. Phải đọc được bởi stakeholders không có technical background. |
| `srs-s{N}.lock` | `.checkpoints/` | Lock files xác nhận từng section đã được tạo và pass validation. 7 files (s0-s6). Cho phép resume sau khi bị interrupt. |

### Cấu trúc `{feature}-BASE-srs.md`

```markdown
# SRS: Customer Management (REQ-001)

## 00 — Document Information
| Field | Value |
|-------|-------|
| Feature | Customer Management |
| Version | 1.0 |
| Status | DRAFT |

## 01 — Tổng quan / Overview
[Mô tả feature, phạm vi, stakeholders]

## 02 — Functional Requirements
| ID | Requirement | Priority | Evidence |
|----|-------------|----------|---------|
| FR-001 | Hệ thống phải cho phép tạo mới khách hàng | HIGH | evidence.md#S1 |

## 03 — Non-Functional Requirements
| ID | Category | Requirement |
|----|----------|-------------|
| NFR-001 | Performance | Response time < 2s cho 95th percentile |

## 04 — User Stories
| ID | As a... | I want to... | So that... |
|----|---------|-------------|-----------|
| US-ADMIN-001 | System admin | create customer | manage accounts |

## 05 — Acceptance Criteria
[Gắn với từng US/FR]

## 06 — Constraints
[Technical, business, regulatory constraints]
```

**Quality Rules**:
- ✅ Vietnamese ≥60%
- ✅ FR/NFR/US IDs phải unique
- ❌ Không có source code, SQL, API paths, architecture patterns

---

## 7. /design --basic

### Mục đích
Tạo Basic Design (Architecture Design) document. Tập trung vào **WHAT components** và cách chúng tương tác, không phải implementation chi tiết.

### Workflow

```
/design --basic
  │
  ├── Step 0: Task Type Check
  │     enhancement Level 1 → BD baseline (không chạy C0-C6)
  │     enhancement Level 2 → Chỉ chạy sections bị ảnh hưởng
  │     new → Full workflow C0-C6
  │
  ├── Pre-checks: State validation + Quality Gate D2 + Stack context
  │
  ├── Section Loop (7 sections, sequential)
  │     ├── C0: Reasoning     ← Tạo reasoning.json (JSON, không phải markdown)
  │     ├── C1: Architecture  ← patterns, layers, technologies
  │     ├── C2: Component     ← component list + responsibilities
  │     ├── C3: Dataflow      ← request/response flows
  │     ├── C4: Datamodel     ← entity relationships (high-level)
  │     ├── C5: State         ← state diagrams
  │     └── C6: NFR           ← NFR implementation approach
  │
  ├── Final validation: language + prohibited-content-bd + consistency-bd + evidence-bd
  ├── Update: evidence.md (section 3.2 BD Summary)
  ├── Update: context.md (decisions log)
  └── State: → BD_CREATED
```

### Files tạo ra

| File | Vị trí | Ý nghĩa |
|------|--------|---------|
| `reasoning.json` | `documents/features/{FEATURE}-{name}/` | **Internal reasoning file** (JSON). Chứa: component list, pattern choices, technology selections. Được validate bởi `reasoning-validator-bd.js`. Dùng làm ground truth cho C1-C6 để đảm bảo consistency. |
| `{feature}-BASE-basic-design.md` | `documents/features/{FEATURE}-{name}/` | **BD document hoàn chỉnh**. 7 sections: Architecture pattern → Components → Dataflow → Datamodel → State → NFR. Input bắt buộc cho DD và Plan. |
| `basic-s{N}.lock` | `.checkpoints/` | Lock files cho 7 sections BD (C0-C6). |

### Cấu trúc `reasoning.json`

```json
{
  "feature": "customer-management",
  "components": [
    {"name": "CustomerHandler", "layer": "application", "responsibility": "HTTP request handling"},
    {"name": "CustomerService", "layer": "domain", "responsibility": "Business logic"}
  ],
  "patterns": ["Repository", "CQRS", "Reactive"],
  "technologies": {"orm": "R2DBC", "framework": "WebFlux"}
}
```

### Cấu trúc `{feature}-BASE-basic-design.md`

```markdown
# Basic Design: Customer Management

## 1. Architecture Overview
### 1.1 Architecture Pattern
[Hexagonal + Clean Architecture]

### 1.2 Technology Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| API | Spring WebFlux | 3.4.4 |
| ORM | R2DBC | - |

## 2. Component Design
| Component | Layer | Responsibility |
|-----------|-------|----------------|
| CustomerRouter | Infrastructure | Route HTTP requests |
| CustomerHandler | Application | Handle requests |
| CustomerService | Domain | Business logic |

## 3. Data Flow
[Sequence diagrams / flow descriptions]

## 4. Data Model (High-level)
[Entity relationships — không có SQL DDL]

## 5. State Diagram
[State transitions]

## 6. NFR Design
[How NFRs are implemented architecturally]
```

**Prohibited** (phải ở DD, không ở BD):
- ❌ Sequence diagrams chi tiết
- ❌ API specs, method signatures
- ❌ Database schemas chi tiết, SQL

---

## 8. /design --detail

### Mục đích
Tạo Detail Design — bộ tài liệu implementation-ready: Frontend Detail Design (FDD), Backend Detail Design (BDD), API Contracts. Đây là documents chi tiết nhất, là input trực tiếp cho `/plan`.

### Workflow

```
/design --detail
  │
  ├── Router: design/detail.md
  │
  ├── detail/fdd.md → Tạo Frontend Detail Design
  │     ├── 10 sections: Screens, Components, State, API calls, Forms, ...
  │     └── Write: {feature}-BASE-frontend-detail-design.md
  │
  ├── detail/fdd-pseudo.md → Transform FDD → pseudo-code
  │     └── Write: {feature}-BASE-frontend-detail-design.pseudo
  │
  ├── detail/bdd.md → Tạo Backend Detail Design
  │     ├── 10 sections bắt buộc (enforced bởi ops.js):
  │     │   §1 Entity & DAO  §2 Repository  §3 Service  §4 Handler
  │     │   §5 Router        §6 Unit Tests  §7 Integration Tests
  │     │   §8 Error Handling §9 Security   §10 Performance
  │     └── Write: {feature}-BASE-backend-detail-design.md
  │
  ├── detail/bdd-pseudo.md → Transform BDD → pseudo-code
  │     └── Write: {feature}-BASE-backend-detail-design.pseudo
  │
  ├── detail/api-contract.md → Extract API từ FDD Section 5
  │     └── Write: {feature}-BASE-api-contracts.md
  │
  └── /design-review → Quality check toàn bộ DD
        State: → BD_DD_CREATED
```

### Files tạo ra

| File | Vị trí | Ý nghĩa |
|------|--------|---------|
| `{feature}-BASE-frontend-detail-design.md` | `documents/features/{FEATURE}-{name}/` | **FDD**: Thiết kế chi tiết frontend — screen layouts, component hierarchy, state management, API integration points, form validations. |
| `{feature}-BASE-frontend-detail-design.pseudo` | `documents/features/{FEATURE}-{name}/` | **FDD Pseudo-code**: FDD đã được transform sang LLM-optimized pseudo-code format. Giảm token consumption ~74% khi load vào `/plan`. |
| `{feature}-BASE-backend-detail-design.md` | `documents/features/{FEATURE}-{name}/` | **BDD**: Thiết kế chi tiết backend — 10 sections bắt buộc từ Entity đến Performance. Input trực tiếp cho implementation. |
| `{feature}-BASE-backend-detail-design.pseudo` | `documents/features/{FEATURE}-{name}/` | **BDD Pseudo-code**: BDD đã transform, với META headers, TRACE_MATRIX, COMPONENTS sections. Tối ưu cho `/plan` consumption. |
| `{feature}-BASE-api-contracts.md` | `documents/features/{FEATURE}-{name}/` | **API Contracts**: Spec đầy đủ cho mọi API endpoint — method, path, request/response schemas, error codes, auth requirements. Extract từ FDD Section 5. |

### Cấu trúc `{feature}-BASE-backend-detail-design.md`

```markdown
# Backend Detail Design: Customer Management

## §1 Entity & DAO
### CmnMCustomer (Entity)
[Fields, types, constraints]

### CmnMCustomerDao (DAO)
[Data access methods]

## §2 Repository
### CustomerRepository
[R2DBC reactive queries]

## §3 Service
### CustomerService
[Business logic methods, reactive streams]

## §4 Handler
### CustomerHandler
[HTTP request handling methods]

## §5 Router
[Endpoint routing configuration]

## §6 Unit Tests
[JUnit5 + StepVerifier test cases]

## §7 Integration Tests
[TestContainers integration tests]

## §8 Error Handling
[Error codes, exception hierarchy, HTTP status mapping]

## §9 Security
[Authentication, authorization, data validation]

## §10 Performance
[Caching strategy, query optimization, reactive patterns]
```

### Cấu trúc `{feature}-BASE-api-contracts.md`

```markdown
# API Contracts: Customer Management

## POST /api/customers
**Description**: Tạo mới khách hàng
**Auth**: Bearer token, role: ADMIN
**Request**:
```json
{
  "name": "string (required, max:100)",
  "email": "string (required, email format)"
}
```
**Response 201**:
```json
{"id": "uuid", "name": "string", "email": "string", "createdAt": "datetime"}
```
**Errors**: 400 (validation), 409 (duplicate email), 401, 403
```

---

## 9. /design --test

### Mục đích
Tạo Test Plan document — chiến lược test toàn diện cho feature.

### Workflow

```
/design --test
  ├── Load: BDD + FDD documents
  ├── Generate: Test strategy, Test cases, Coverage targets
  └── Write: {feature}-BASE-test-plan.md
```

### Files tạo ra

| File | Vị trí | Ý nghĩa |
|------|--------|---------|
| `{feature}-BASE-test-plan.md` | `documents/features/{FEATURE}-{name}/` | Test Plan: strategy, test levels (unit/integration/e2e), test cases outline, coverage targets, test data requirements. |

---

## 10. /plan

### Mục đích
Tạo implementation plan chi tiết từ design documents. Router phân phối cho micro-commands theo task type.

### Workflow

```
/plan [--persona <name>]
  │
  ├── Step 0: Parse persona flags
  ├── Step 0.5: Detect task type từ context.md
  ├── Step 0.6: Workflow State Validation
  ├── Step 0.7: Quality Gate D4 (design docs exist + validated)
  │
  ├── Route → Micro-command chain:
  │     bugfix     → bugfix.md → save-and-display.md
  │     enhancement → enhancement.md → context-loading.md → generation.md → save-and-display.md
  │     new/feature → feature-workflow.md → context-loading.md → document-loading.md → generation.md → save-and-display.md
  │
  ├── [context-loading.md]: Load RAG patterns + evidence + DD mode + specialists + arch
  ├── [document-loading.md]: Load design docs (SRS + BD + FDD + BDD)
  │
  ├── [generation.md]: Tạo plan INLINE
  │     ├── Step 4: Generate monolithic plan
  │     ├── Step 4.5: Auto-split nếu >600 lines
  │     │     ├── Pass 1: Tạo master plan index
  │     │     └── Pass 2: Tạo từng sub-plan SEQUENTIAL
  │     └── Step 4.6: Confidence check (≥90%)
  │
  ├── [save-and-display.md]:
  │     ├── Write: {feature}-implementation-plan.md
  │     └── State: → PLAN_CREATED
  │
  └── Auto-chain (router controls):
        → /plan-review (score ≥95%: continue; <95%: /plan-optimize, max 3 lần)
        → /execute
```

### Files tạo ra

| File | Vị trí | Ý nghĩa |
|------|--------|---------|
| `{feature}-implementation-plan.md` | `.claude/memory-bank/{branch}/{FEATURE}-{dev}/plans/` | **Implementation Plan** (monolithic). Chứa: Plan Boundaries (files + methods), Implementation Steps với specialist patterns, Test Plan (Section 3). Confidence ≥90%. |
| `{feature}-master-plan.md` | `.claude/memory-bank/{branch}/{FEATURE}-{dev}/plans/` | *(chỉ khi auto-split)* Master index cho multi-sub-plan. Chứa overview, SP list, shared context, definitions. Dưới 5% context window. |
| `SP-{n}-{title}.md` | `.claude/memory-bank/{branch}/{FEATURE}-{dev}/plans/` | *(chỉ khi auto-split)* Từng sub-plan (SP-01, SP-02, ...). Mỗi SP bao gồm các BDD sections liên quan. Dưới 15% context window. |

### Cấu trúc `{feature}-implementation-plan.md`

```markdown
# Implementation Plan: Customer Management

> **Confidence**: 94%
> **Status**: APPROVED
> **DD Mode**: pseudo-code
> **Stack**: java-springboot-nextjs

## 0. Plan Boundaries

### 0.1 Files to Modify
| # | File | Lines | Action | Layer |
|---|------|-------|--------|-------|
| 1 | `backend/src/main/java/.../CustomerService.java` | NEW | CREATE | Domain |

### 0.2 Methods to Change
| # | File | Method | Action | Pattern |
|---|------|--------|--------|---------|
| 1 | CustomerService.java | `createCustomer()` | ADD | Repository |

### 0.3 Dependencies Between Steps
| Step | Depends On | Reason |
|------|-----------|--------|
| 2 | 1 | Requires CustomerService |

## 1. Implementation Steps

### Step 1: Create CustomerService
**Architecture Reference**:
- Pattern: Repository + Service
- Layer: Domain
**Files**: `backend/.../CustomerService.java`
**Methods**: `createCustomer()` - ADD
**Implementation**: [pseudo-code]
**Acceptance Criteria**:
- [ ] Customer created with valid data
- [ ] Duplicate email throws exception

## 2. Validation Checklist
[...]

## 3. Test Plan

### 3.1 Per-Step Test Cases
#### Step 1 Tests
| # | Test Case | Type | Expected Behavior | Test File |
|---|-----------|------|-------------------|-----------|
| T1.1 | Create with valid data | NORMAL | Return CustomerDTO | CustomerServiceTest.java |
| T1.2 | Create with duplicate email | ABNORMAL | DuplicateEmailException | CustomerServiceTest.java |

### 3.2 Test Summary
| Metric | Target |
|--------|--------|
| Total test cases | 8 |
| Abnormal ratio | ≥40% |

### 3.3 Test File Listing
| # | Test File | Steps | Level |
|---|-----------|-------|-------|
| 1 | CustomerServiceTest.java | Step 1, 2 | unit |
```

---

## 11. /execute

### Mục đích
Implement code theo plan đã approve. Strict mode — chỉ làm đúng những gì trong plan.

### Workflow

```
/execute
  │
  ├── Phase 1: Micro-command chain
  │     │
  │     ├── [pre-gates.md]:
  │     │     ├── Stack context loading
  │     │     ├── State validation (PLAN_REVIEWED)
  │     │     ├── Quality Gate G0 (confidence check)
  │     │     └── Confidence pre-assessment
  │     │
  │     ├── [plan-loading.md]:
  │     │     ├── Load plan file
  │     │     ├── Extract boundaries (allowedFiles + allowedMethods)
  │     │     ├── Multi-sub-plan: resolve current SP
  │     │     └── Checkpoint restore (nếu đã chạy trước đó)
  │     │
  │     ├── [step-runner.md]: Per-step execution loop
  │     │     Mỗi step:
  │     │     ├── 3.A: Verify checkpoint (không chạy lại nếu đã done)
  │     │     ├── 3.B: Load graph context
  │     │     ├── 3.C: Load specialist cho file đó
  │     │     ├── 3.D: Mark in-progress (TodoWrite)
  │     │     ├── 3.E: Generate code (INLINE)
  │     │     ├── 3.F: Write/Edit file (boundary check trước)
  │     │     ├── 3.F2-F4: Generate + Write test code (nếu có test cases trong plan)
  │     │     ├── 3.G: Complete checkpoint (dual-layer)
  │     │     ├── 3.G.5: Pattern-analyzer skill gate
  │     │     ├── 3.H: Mark complete (TodoWrite)
  │     │     └── 3.I: Save execution-state.json (checkpoint resume)
  │     │
  │     └── [finalize.md]:
  │           ├── Emit feedback events
  │           ├── Verify all checkpoints
  │           ├── Update evidence.md (execution summary)
  │           └── State: → EXECUTED
  │
  ├── Phase 2: Auto-chain /validate (hook-enforced)
  │     score ≥90% → VALIDATED
  │     score <90% → show violations, user chọn fix strategy
  │
  └── Phase 3: Auto-chain /test (human-in-loop, confirm)
```

### Files tạo ra

| File | Vị trí | Ý nghĩa |
|------|--------|---------|
| **Source code files** | Theo plan Section 0.1 | Tất cả files được CREATE hoặc MODIFY theo đúng plan boundaries. Ví dụ: `CustomerService.java`, `CustomerServiceTest.java`, `customer-list.tsx`, v.v. |
| `execution-state.json` | `.claude/memory-bank/{branch}/{FEATURE}-{dev}/execution-checkpoints/` | **Checkpoint resume data**. Chứa: steps completed, files modified, methods implemented, current sub-plan (nếu multi). Cho phép resume sau interrupt. |

### Cấu trúc `execution-state.json`

```json
{
  "feature": "customer-management",
  "plan": "plans/customer-management-implementation-plan.md",
  "planStructure": "monolithic",
  "lastCompletedStep": 3,
  "totalSteps": 8,
  "steps": [
    {
      "index": 0,
      "status": "completed",
      "files": ["backend/.../CustomerEntity.java"],
      "methods": ["CustomerEntity (class)"],
      "summary": "Created CustomerEntity with R2DBC annotations"
    },
    {
      "index": 1,
      "status": "completed",
      "files": ["backend/.../CustomerService.java", "backend/.../CustomerServiceTest.java"],
      "methods": ["createCustomer()", "updateCustomer()"],
      "testRun": null
    }
  ],
  "subPlanProgress": null,
  "executionComplete": false,
  "testRun": null
}
```

**Boundary Enforcement**: Execute chỉ được tạo/sửa files có trong `plan Section 0.1`. Nếu cần file ngoài plan → DEVIATION_DETECTED → STOP và hỏi user.

---

## 12. /validate

### Mục đích
3-pass validation kiểm tra quality của implementation so với design documents.

### Workflow

```
/validate
  │
  ├── Pre-checks: State validation (EXECUTED) + Quality Gate G3 (run tests)
  │
  ├── Load: plan file + changed files (từ execution-state.json hoặc git diff)
  │
  ├── PASS 1: Per-File Validation (weight: 40%)
  │     Mỗi file đã thay đổi:
  │     ├── Load specialist cho file đó
  │     ├── Load graph context
  │     ├── Score 4 dimensions:
  │     │   - Naming (20%): theo specialist metadata
  │     │   - Patterns (30%): theo specialist patterns
  │     │   - Architecture (25%): import rules, layer violations
  │     │   - Plan Compliance (25%): file trong allowedFiles?
  │     └── Checkpoint per file
  │
  ├── PASS 2: Per-Dimension Gates (weight: 20%)
  │     ├── Architecture Analyzer: cross-file deps, circular deps
  │     └── Plan Compliance: files(40%) + methods(40%) + test files(20%)
  │
  ├── PASS 3: Code Review (weight: 40%)
  │     ├── Phase A (per-file): Specialist depth review (R5)
  │     └── Phase B (per-feature): Logic review vs design docs
  │           R1: Business Logic vs BD/evidence
  │           R2: API Contract vs api-contracts.md
  │           R3: Edge Cases vs DD pseudo/evidence
  │           R4: Abnormal Cases vs Plan Section 3.1
  │
  ├── Aggregate: 40% P1 + 20% P2 + 40% P3 (≥90% → PASS)
  │     Fallback: 60% P1 + 40% P2 (khi P3 không available)
  │
  ├── Write: validation-report.md
  └── State: ≥90% → VALIDATED | <90% → stays EXECUTED
```

### Files tạo ra

| File | Vị trí | Ý nghĩa |
|------|--------|---------|
| `validation-report.md` | `.claude/memory-bank/{branch}/{FEATURE}-{dev}/` | **Validation Report**. Chứa: per-file scores (Pass 1), dimension scores (Pass 2), code review findings (Pass 3), aggregate score, PASS/FAIL result. Cần review khi fail để biết fix gì. |

### Cấu trúc `validation-report.md`

```markdown
# Validation Report

| Property | Value |
|----------|-------|
| Feature | customer-management |
| Date | 2026-03-30T12:00:00Z |
| Aggregate Score | 92% |
| Result | PASS ✅ |

## Pass 1: Per-File Validation (weight: 40%)
| File | Score | Naming | Patterns | Architecture | Plan |
|------|-------|--------|----------|-------------|------|
| CustomerService.java | 95% | 100 | 90 | 100 | 100 |

**Average**: 92%

## Pass 2: Dimension Quality Gates (weight: 20%)
| Dimension | Score |
|-----------|-------|
| Architecture | 95% |
| Plan Compliance | 88% |

## Pass 3: Code Review (weight: 40%)
| Dimension | Score | Findings | Status |
|-----------|-------|----------|--------|
| R1 Business Logic | 90% | 0 | PASS |
| R2 API Contract | 95% | 0 | PASS |
| R5 Specialist | 88% | 1 | PASS |

### Findings
#### [R5] WARNING — Naming Convention
**File**: CustomerService.java
**Issue**: Method `getAll()` should be `findAll()` per Repository pattern
**Fix**: Rename to `findAll()`

## Aggregate
Formula: 40% Pass1 + 20% Pass2 + 40% Pass3
**Score**: 92%
```

---

## 13. /test

### Mục đích
Chạy tests, map results với plan test cases, tạo coverage + quality report.

### Workflow

**Standalone mode** (module-based):
```
/test scan --module cmn001000    → Phân tích source code
/test generate --module cmn001000 → Tạo test plan + test code
/test validate --module cmn001000 → Compile + run + coverage
```

**Workflow mode** (plan-aware):
```
/test run
  │
  ├── Phase 1: Load Plan + Test Context
  │     ├── Load plan Section 3 (Test Plan)
  │     └── Verify test files exist
  │
  ├── Phase 2: Compile + Run Tests
  │     ├── Java: mvn test (parse JUnit XML từ target/surefire-reports/*.xml)
  │     └── TypeScript: npm test (parse Vitest JSON từ coverage/test-results.json)
  │
  ├── Phase 3: Per-Case Mapping
  │     Map test results → Plan test cases bằng Test ID (T1.1, T1.2, ...)
  │     Java: @DisplayName("T1.2: ...") → parse XML
  │     TypeScript: it('T1.2: ...') → parse JSON
  │
  ├── Phase 4: T-COV + T-QUAL
  │     ├── coverage-reporter skill: line/branch/method coverage
  │     └── test-analyzer skill: quality scores, test smells
  │
  ├── Phase 5: Generate Report
  │     └── Write: test-run-report.md
  │
  └── Phase 6: State Update
        Update: execution-state.json (testRun field)
        State: → TESTED
```

### Files tạo ra

| File | Vị trí | Ý nghĩa |
|------|--------|---------|
| `test-run-report.md` | `.claude/memory-bank/{branch}/{FEATURE}-{dev}/` | **Test Run Report**. Per-case mapping (planCase vs actual result), coverage report, quality analysis. PASS/FAIL per case + overall. |

### Cấu trúc `test-run-report.md`

```markdown
# Test Run Report: customer-management

## Per-Case Results
| # | Step | Test Case | Type | Status | Duration |
|---|------|-----------|------|--------|----------|
| T1.1 | 1 | Create with valid data | NORMAL | ✅ PASSED | 45ms |
| T1.2 | 1 | Create with duplicate email | ABNORMAL | ✅ PASSED | 23ms |
| T1.3 | 1 | Create with null required fields | ABNORMAL | ❌ FAILED | 12ms |

## Summary
| Metric | Value |
|--------|-------|
| Total | 8 |
| Passed | 7 |
| Failed | 1 |
| Missing | 0 |

## Coverage
| Metric | Actual | Target |
|--------|--------|--------|
| Line | 82% | 80% |
| Branch | 71% | 70% |

## Quality Analysis
| Metric | Score |
|--------|-------|
| Quality Score | 88% |
| Naming Compliance | 95% |
| Test Smells | 1 (empty test body) |

### Overall: ❌ FAIL (1 test failed)
```

---

## 14. /save · /recall · /list

### /save

Lưu conversation context vào branch-aware memory bank.

**Files tạo ra**:
| File | Vị trí | Ý nghĩa |
|------|--------|---------|
| `{timestamp}-save.md` | `.claude/memory-bank/{branch}/saves/` | Snapshot conversation context, decisions, notes tại thời điểm save. |

### /recall

Load memory từ branch hiện tại vào context.

### /list

Liệt kê tất cả memories (save files) theo branch.

---

## 15. Bảng tổng hợp toàn bộ file output

### Files theo thư mục

#### `.claude/config/`

| File | Tạo bởi | Ý nghĩa |
|------|---------|---------|
| `project-config.json` | `/config-project` | Tech stack configuration toàn project |

#### `.claude/memory-bank/{branch}/{FEATURE}-{dev}/`

| File | Tạo bởi | Ý nghĩa |
|------|---------|---------|
| `context.md` | `/research` | Trạng thái workflow, metadata feature |
| `evidence.md` | `/research` | Research evidence có cấu trúc (scope-tagged) |
| `domain-knowledge.md` | `/research` (new only) | Domain knowledge base |
| `innovate-srs-selection.md` | `/innovate` Part 1 | SRS decisions đã approve |
| `innovate-technical-selection.md` | `/innovate` Part 2 | Technical decisions đã approve |
| `plans/{feature}-implementation-plan.md` | `/plan` | Implementation plan (monolithic) |
| `plans/{feature}-master-plan.md` | `/plan` (auto-split) | Master index cho multi-SP plan |
| `plans/SP-{n}-{title}.md` | `/plan` (auto-split) | Sub-plan từng phần |
| `execution-checkpoints/execution-state.json` | `/execute` | Checkpoint resume data |
| `validation-report.md` | `/validate` | 3-pass validation results |
| `test-run-report.md` | `/test run` | Test results + coverage |

#### `documents/architecture/`

| File | Tạo bởi | Ý nghĩa |
|------|---------|---------|
| `assessment.md` | `/architect` Phase 1 | Domain + system assessment |
| `domain-knowledge.md` | `/architect` Phase 1 | Project-level domain KB |
| `decisions/ADR-NNN-*.md` | `/architect` Phase 2 | Architecture Decision Records |
| `feature-map.md` | `/architect` Phase 3 | Feature dependency graph |
| `estimation.md` | `/architect` Phase 5 | Effort estimation |

#### `documents/features/{FEATURE}-{name}/`

| File | Tạo bởi | Ý nghĩa |
|------|---------|---------|
| `.subfeatures.json` | `/innovate` (khi split) | Sub-feature registry + convention codes |
| `reasoning.json` | `/design --basic` | BD reasoning (internal, không đọc trực tiếp) |
| `{feature}-BASE-srs.md` | `/design --srs` | Software Requirements Specification |
| `{feature}-BASE-basic-design.md` | `/design --basic` | Basic Design (Architecture) |
| `{feature}-BASE-frontend-detail-design.md` | `/design --detail` | Frontend Detail Design |
| `{feature}-BASE-frontend-detail-design.pseudo` | `/design --detail` | FDD pseudo-code (LLM-optimized) |
| `{feature}-BASE-backend-detail-design.md` | `/design --detail` | Backend Detail Design |
| `{feature}-BASE-backend-detail-design.pseudo` | `/design --detail` | BDD pseudo-code (LLM-optimized) |
| `{feature}-BASE-api-contracts.md` | `/design --detail` | API endpoint specifications |
| `{feature}-BASE-test-plan.md` | `/design --test` | Test strategy document |

#### `.checkpoints/`

| File | Tạo bởi | Ý nghĩa |
|------|---------|---------|
| `srs-s{0-6}.lock` | `/design --srs` | 7 lock files, mỗi lock = 1 section hoàn thành |
| `basic-s{0-6}.lock` | `/design --basic` | 7 lock files cho BD |
| `detail-*.lock` | `/design --detail` | Lock files cho DD sections |

#### `cache/`

| File | Tạo bởi | Ý nghĩa |
|------|---------|---------|
| `ops-result.json` | Mọi lệnh dùng `ops.js` | **Temporary**, bị ghi đè liên tục. Output từ CLI ops. Không được đọc sau 1 lần dùng. |

### Files được tạo bởi /execute (source code)

Mọi source code files được `/execute` tạo/sửa đều theo **Plan Section 0.1** — không có file nào ngoài danh sách plan. Ví dụ điển hình:

| Loại file | Pattern đường dẫn | Ví dụ |
|-----------|-------------------|-------|
| Java entity | `backend/src/main/java/.../entity/CmnM*.java` | `CmnMCustomer.java` |
| Java service | `backend/src/main/java/.../service/*Service.java` | `CustomerService.java` |
| Java handler | `backend/src/main/java/.../handler/*Handler.java` | `CustomerHandler.java` |
| Java router | `backend/src/main/java/.../router/*Router.java` | `CustomerRouter.java` |
| Java test | `backend/src/test/java/.../*Test.java` | `CustomerServiceTest.java` |
| TS component | `frontend/src/presentation/ui/modules/{code}/*.tsx` | `CustomerList.tsx` |
| TS API client | `frontend/src/infrastructure/api/*.ts` | `customer-api.ts` |
| TS test | `frontend/src/**/__tests__/*.test.ts` | `customer-api.test.ts` |

---

## Phụ lục: Lifecycle của một Feature

```
Step 1: /research
  Creates:  context.md, evidence.md, domain-knowledge.md (new only)
  State:    INITIAL → RESEARCHED

Step 2: /innovate
  Creates:  innovate-srs-selection.md, innovate-technical-selection.md
  Updates:  evidence.md (sections 2.1, 2.2), context.md (decisions log)
  State:    RESEARCHED → SRS_CREATED → INNOVATE_TECHNICAL

Step 3: /design --srs (auto-chain from innovate)
  Creates:  {feature}-BASE-srs.md, .checkpoints/srs-s*.lock
  Updates:  evidence.md (3.1), context.md
  State:    → SRS_CREATED

Step 4: /design --basic (auto-chain)
  Creates:  {feature}-BASE-basic-design.md, reasoning.json, basic-s*.lock
  Updates:  evidence.md (3.2), context.md
  State:    → BD_CREATED

Step 5: /design --detail (auto-chain)
  Creates:  FDD.md, FDD.pseudo, BDD.md, BDD.pseudo, api-contracts.md
  State:    → BD_DD_CREATED

Step 6: /plan (user command)
  Creates:  {feature}-implementation-plan.md (hoặc master + sub-plans)
  State:    → PLAN_CREATED → PLAN_REVIEWED

Step 7: /execute (auto-chain)
  Creates:  [Source code files theo plan], execution-state.json
  Updates:  evidence.md (execution summary)
  State:    → EXECUTED

Step 8: /validate (auto-chain)
  Creates:  validation-report.md
  State:    ≥90%: → VALIDATED | <90%: stays EXECUTED

Step 9: /test run (confirm)
  Creates:  test-run-report.md
  Updates:  execution-state.json (testRun)
  State:    → TESTED ✅
```
