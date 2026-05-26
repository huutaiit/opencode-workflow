---
description: Hướng dẫn sử dụng EPS Framework
---

You are helping users understand and navigate the EPS Framework v10.0 (Auto-Chain Enforcement).

Parse the user's argument: `$ARGUMENTS`

## Handle Options:

### If `$ARGUMENTS` is empty or `--help`:
Display the following table in Vietnamese:

```
EPS Framework v10.0 — Hướng dẫn sử dụng

/guide                    # Hiện danh sách options
/guide --workflow         # Quy trình workflow (3 modes, auto-chain)
/guide --arch-ready       # Workflow rút gọn cho project có architecture docs
/guide --commands         # Danh sách commands
/guide --specialist-unify # Hướng dẫn specialist-unify (5 phases)
/guide --status           # Trạng thái hiện tại
/guide --next             # Bước tiếp theo + gợi ý
/guide --quick            # Quick start cho người mới
```

---

### If `$ARGUMENTS` is `--workflow`:
Explain in Vietnamese:

**EPS Workflow v10.0 — 3 Modes, Auto-Chain**

EPS workflow có 3 mode. User chỉ cần gõ ít command, tất cả còn lại tự động chạy qua auto-chain (PostToolUse hook).

**SETUP (một lần cho project mới):**

```
npx eps init          # Scaffold config
/config-project       # Auto-detect tech stack
/architect            # Tạo architecture docs (5 phases)
```

---

**MODE 1: Full Workflow** (project chưa có architecture docs)

User gõ: `/research` → `/plan` → confirm `/test`

```
/research
  ├── Thu thập evidence (adaptive theo task type)
  │     new:         3 phases (domain KB + codebase + external refs)
  │     enhancement: 2 phases (codebase + impact analysis)
  │     bugfix:      2 phases (root cause + targeted scan)
  │
  ├── auto → /innovate (bỏ qua cho bugfix)
  │     Part 1: SRS decisions [user duyệt]
  │     Part 2: Technical decisions [user duyệt]
  │
  └── auto → /design (bỏ qua cho bugfix)
        /design --srs     → Tài liệu SRS
        /design --basic   → Basic Design
        /design --detail  → Detail Design (FDD + BDD + API)
          └── auto → /design-review (kiểm tra chất lượng)

/plan
  ├── auto → /plan-review → /plan-optimize (nếu <95%) → /execute → /validate
  └── confirm → /test
```

**User commands: 2** (+ 1 confirm cho /test)

---

**MODE 2: Arch-Ready Workflow** (project đã có architecture docs đầy đủ)

User gõ: `/design --init` → `/plan` → confirm `/test`

```
/design --init --feature CMN015 --type new
  ├── Verify 3 prerequisites:
  │     P1: project-config.json (sourceRoots, conventions)
  │     P2: feature-dictionary.json (modules populated)
  │     P3: ADR files (technology decisions)
  │
  ├── Tạo context + set workflowMode=arch-ready
  │
  ├── auto → /design --basic (trích từ architecture docs)
  │     C0-C6 micro-agents dùng architecture docs thay vì innovate-selection
  │
  ├── auto → /design --detail (pseudo-code + test cases)
  │     └── auto → /design-review
  │
  └── State: DD_REVIEWED

/plan
  ├── auto → /plan-review → /plan-optimize (nếu <95%) → /execute → /validate
  └── confirm → /test
```

**User commands: 2** (+ 1 confirm cho /test)
**Bỏ qua**: /research, /innovate, /design --srs (đã có trong architecture docs)

---

**MODE 3: Bugfix Workflow** (sửa lỗi, workflow tối giản)

User gõ: `/research` → `/plan` → confirm `/test`

```
/research → /plan → auto-chain (plan-review → execute → validate) → confirm /test
```

**User commands: 2** (+ 1 confirm cho /test)
**Bỏ qua**: /innovate, /design (straight to implementation)

---

**Tổng kết:**

| Mode | User gõ | Auto-chain | Khi nào dùng |
|------|---------|-----------|-------------|
| Full | `/research` → `/plan` | innovate → design (SRS+BD+DD) → review → execute → validate | Project mới, chưa có architecture |
| Arch-Ready | `/design --init` → `/plan` | design (BD+DD) → review → execute → validate | Project đã /architect xong |
| Bugfix | `/research` → `/plan` | execute → validate | Sửa lỗi |

Xem chi tiết: `docs/workflow-state-transitions.md`

---

### If `$ARGUMENTS` is `--arch-ready`:
Display in Vietnamese:

**Arch-Ready Workflow — Workflow rút gọn (v10.0)**

Dành cho project đã hoàn thành `/architect` đầy đủ (architecture docs, ADRs, feature dictionary).
Bỏ qua `/research`, `/innovate`, `/design --srs` — bắt đầu trực tiếp từ `/design --init`.

**Điều kiện sử dụng (3 prerequisites):**

| Check | Yêu cầu | Kiểm tra |
|-------|---------|----------|
| P1 | `project-config.json` có sourceRoots + conventions | `node guards/gates/arch-ready-gate.js` |
| P2 | `feature-dictionary.json` có modules populated | (tự động) |
| P3 | ADR files tồn tại trong architecture docs | (tự động) |

**Cách sử dụng:**

```bash
# Bước 1: Khởi tạo arch-ready workflow
/design --init --feature CMN015 --type new

# Bước 2 (tự động): /design --basic → /design --detail → /design-review

# Bước 3: Implement
/plan

# Bước 4 (tự động): plan-review → execute → validate → confirm /test
```

**So sánh với Full Workflow:**

```
Full:       /research → /innovate → /design --srs → --basic → --detail → /plan → /execute
Arch-Ready: /design --init →                        --basic → --detail → /plan → /execute
            (bỏ 3 bước)
```

**Tại sao bỏ được 3 bước?**
- `/research`: Evidence đã nằm trong architecture docs + ADRs
- `/innovate`: Decisions đã chốt (stack, patterns, variants) trong ADRs
- `/design --srs`: Architecture docs đã cover FR/NFR ở mức hệ thống

**Kiểm tra prerequisites:**
```bash
node guards/gates/arch-ready-gate.js
```

Nếu fail → dùng Full Workflow (`/research`) hoặc hoàn thiện architecture docs trước (`/architect`).

---

### If `$ARGUMENTS` is `--commands`:
List all commands in Vietnamese:

**Commands EPS Framework v10.0:**

**Setup (chạy 1 lần cho project mới):**
- `/config-project` — Auto-detect tech stack, cấu hình project
- `/architect` — Tạo architecture docs (5 phases: Interview → ADRs → Feature Map → Documents → Estimation)

**Feature Workflow — Full Mode (2 user commands):**
- `/research` — Bắt đầu feature. Thu thập evidence, auto-chain toàn bộ Stage 1
  - Flags: `--type new|enhancement|bugfix`, `--input <file>`, `--module <id>`
- `/plan` — Bắt đầu implementation. Auto-chain toàn bộ Stage 2

**Feature Workflow — Arch-Ready Mode (2 user commands):**
- `/design --init` — Khởi tạo arch-ready workflow (verify architecture prerequisites, tạo context)
  - Flags: `--feature <ID>`, `--type new|enhancement`, `--module <id>`
- `/plan` — Bắt đầu implementation (giống Full Mode)

**Auto-Chain Commands (tự động chạy, không cần gõ):**
- `/innovate` — Brainstorm SRS + Technical decisions (Part 1 + Part 2) *(chỉ Full Mode)*
- `/design --srs` — Tạo Software Requirements Specification *(chỉ Full Mode)*
- `/design --basic` — Tạo Basic Design (Architecture)
- `/design --detail` — Tạo Detail Design (FDD + BDD + API Contracts)
- `/design --test` — Tạo Test Plan
- `/design-review` — Kiểm tra chất lượng Detail Design
- `/plan-review` — Đánh giá chất lượng plan (5 dimensions, threshold 95%)
- `/plan-optimize` — Tối ưu plan khi score < 95%
- `/execute` — Implement từng bước theo plan
- `/validate` — Kiểm tra implementation so với design
- `/test` — Chạy tests (cần user confirm)

**Memory:**
- `/save` — Lưu context vào memory bank (branch-aware)
- `/recall` — Nạp context từ memory bank
- `/list` — Liệt kê tất cả memories

**Specialist Management:**
- `/specialist-unify --stack <name>` — Scan, analyze, merge, validate specialists cho 1 stack
  - `--phase scan|analyze|execute` — Chạy 1 phase cụ thể (optional)
  - Stacks: `java-springboot`, `typescript-nextjs`, `react`, `nestjs`, `csharp-dotnet`

**Utility:**
- `/guide [--option]` — Hướng dẫn framework (tài liệu này)
- `/commands` — Dashboard tất cả commands
- `/plan-version` — Quản lý phiên bản plan
- `/reverse-dd` — Tạo Detail Design từ code có sẵn (reverse engineering)
- `/validate:code-review` — Code review logic theo design docs + specialist patterns

---

### If `$ARGUMENTS` is `--specialist-unify`:
Display in Vietnamese:

**`/specialist-unify` — Hướng dẫn chi tiết**

Dùng để hợp nhất (unify) các specialist files trong 1 stack khi:
- Stack có nhiều thế hệ specialist (V1 project-specific + V2 generic)
- Specialist thiếu Architecture Metadata (v2.0, 16 fields)
- Thư mục phẳng chưa tổ chức subfolder
- Có specialist trùng lặp/chồng chéo
- Know-how từ project thực chưa tích hợp vào specialist generic

**Cú pháp:**

```bash
# Bắt buộc: chỉ định stack
/specialist-unify --stack <stack-name>

# Chạy 1 phase cụ thể (optional)
/specialist-unify --stack <stack-name> --phase <phase>
```

**Params:**

| Param | Bắt buộc | Giá trị | Mô tả |
|-------|----------|---------|-------|
| `--stack` | Có | `react`, `typescript-nextjs`, `nestjs`, `java-springboot`, `csharp-dotnet` | Stack cần unify |
| `--phase` | Không | `scan`, `analyze`, `execute` | Chạy 1 phase cụ thể. Bỏ qua = chạy tuần tự tất cả |

**5 Phases:**

```
/specialist-unify --stack react
  ├── Phase 1: SCAN — Inventory & Validate
  │     Quét tất cả .md files, kiểm tra metadata compliance
  │
  ├── Phase 2: ANALYZE — Pattern Mapping & Overlap Detection
  │     Phát hiện trùng lặp, mapping patterns, thiết kế folder structure
  │
  ├── Phase 3: DESIGN — Metadata Registry
  │     Tạo metadata registry và specialist index
  │
  ├── Phase 4: EXECUTE — Generate Unified Files
  │     Tạo specialist files hợp nhất với metadata đầy đủ
  │
  └── Phase 5: VALIDATE — Verification & Report
        Kiểm tra cuối cùng, tạo unification report
```

**Ví dụ:**

```bash
# Unify toàn bộ stack React (chạy cả 5 phases)
/specialist-unify --stack react

# Chỉ scan để xem tình trạng hiện tại
/specialist-unify --stack react --phase scan

# Chỉ analyze (cần scan trước)
/specialist-unify --stack react --phase analyze

# Chỉ execute (cần merge-spec từ analyze)
/specialist-unify --stack react --phase execute
```

**Lưu ý:**
- `--phase execute` yêu cầu merge-spec đã được tạo từ phase analyze
- Nếu không truyền `--phase`, tất cả phases chạy tuần tự
- Kết quả lưu tại `specialists/code/{stack}/`

---

### If `$ARGUMENTS` is `--status`:

Run the following command to get current state:
```bash
node core/state/state-manager.js get
```

Then read the active context file (found by `findActiveContext()`).

Display in Vietnamese:

**Trạng thái hiện tại:**
- Feature: [feature name from context]
- State: [current state]
- Task Type: [new/enhancement/bugfix]
- Branch: [current git branch]
- Next Command: [based on state → auto-route mapping]

**State → Next mapping:**
- `INITIAL` → Chạy `/research` (full mode) hoặc `/design --init` (arch-ready mode)
- `RESEARCHED` → Auto-chain đang chạy `/innovate`
- `ARCH_VERIFIED` → Auto-chain đang chạy `/design --basic` (arch-ready mode)
- `BD_DD_CREATED` / `DD_REVIEWED` → Chạy `/plan`
- `PLAN_CREATED` → Auto-chain đang chạy `/plan-review`
- `PLAN_REVIEWED` → Auto-chain đang chạy `/execute`
- `EXECUTED` → Auto-chain đang chạy `/validate`
- `VALIDATED` → Confirm `/test`
- `TESTED` → Workflow hoàn tất

If no active context found, say: "Chưa có workflow nào. Chạy `/research` (full) hoặc `/design --init` (arch-ready) để bắt đầu feature mới."

---

### If `$ARGUMENTS` is `--next`:

First, determine current state by running:
```bash
node core/state/state-manager.js get
```

Then based on state, display in Vietnamese:

**If INITIAL or no context:**
- Bước tiếp: `/research` (full mode) hoặc `/design --init` (arch-ready mode)
- Mô tả: Bắt đầu feature mới.
- Ví dụ full: `/research --type new --input docs/requirements/REQ-001.md`
- Ví dụ arch-ready: `/design --init --feature CMN015 --type new`
- Chọn arch-ready nếu project đã có architecture docs (ADRs, feature dictionary, project config)

**If ARCH_VERIFIED:**
- Đang trong auto-chain (arch-ready mode)
- Mô tả: Architecture prerequisites verified. `/design --basic` sẽ tự chạy.
- Auto-chain: design --basic → design --detail → design-review

**If RESEARCHED / INNOVATE_SRS / INNOVATE_TECHNICAL:**
- Đang trong auto-chain Stage 1 (full mode)
- Mô tả: Innovate và Design đang chạy tự động. Chờ user duyệt tại các checkpoint.
- Checkpoint: Interview questions, SRS decisions, Technical decisions

**If BD_DD_CREATED / DOCS_UPDATED / DD_REVIEWED:**
- Bước tiếp: `/plan`
- Mô tả: Design docs đã xong. Gõ `/plan` để bắt đầu Stage 2.
- Auto-chain: plan → plan-review → execute → validate → test

**If PLAN_CREATED:**
- Đang trong auto-chain: `/plan-review` sẽ tự chạy
- Nếu score < 95%: auto `/plan-optimize` → re-review (tối đa 3 lần)

**If PLAN_REVIEWED:**
- Đang trong auto-chain: `/execute` sẽ tự chạy

**If EXECUTED:**
- Đang trong auto-chain: `/validate` sẽ tự chạy

**If VALIDATED:**
- Bước tiếp: Confirm chạy `/test`
- Mô tả: Validate xong. Chọn Y để chạy test tự động.

**If TESTED:**
- Workflow hoàn tất! Feature đã implement và test xong.

---

### If `$ARGUMENTS` is `--quick`:
Display quick start in Vietnamese:

**Quick Start — EPS Framework v10.0**

**Bước 1: Cài đặt**
```bash
# Cách 1: Chỉ định registry trực tiếp
npm install eps-workflow --registry http://192.168.9.60:4873

# Cách 2: Cấu hình .npmrc rồi install bình thường
echo "registry=http://192.168.9.60:4873" > .npmrc
npm install eps-workflow

# Sau khi install:
npx eps init
```

**Bước 2: Cấu hình project (một lần)**
```bash
/config-project                    # Auto-detect tech stack
/architect                         # Tạo architecture docs (nếu project mới)
```

**Bước 3: Bắt đầu feature**

*Cách A — Full Workflow (chưa có architecture docs):*
```bash
/research                          # Stage 1: Design documents
```
- Chọn task type: `new` (feature mới), `enhancement` (thay đổi), `bugfix` (sửa lỗi)
- Provide input: file path hoặc paste mô tả trực tiếp
- Duyệt decisions tại các checkpoint (innovate Part 1 + Part 2)
- Design docs tự động generate

*Cách B — Arch-Ready Workflow (đã có architecture docs):*
```bash
/design --init --feature CMN015 --type new    # Verify prerequisites + tạo context
```
- Tự động verify architecture prerequisites (P1+P2+P3)
- Auto-chain: design --basic → design --detail → design-review
- Nhanh hơn 3 bước so với Full Workflow

**Bước 4: Implement**
```bash
/plan                              # Stage 2: Plan + Execute + Validate
```
- Plan tự generate, review, optimize
- Code tự implement theo plan
- Validate tự kiểm tra
- Confirm chạy test

**Chọn workflow nào?**
```
Project đã có /architect xong?    → /design --init (arch-ready, nhanh hơn)
Project mới, chưa có arch docs?  → /research (full workflow)
Sửa lỗi?                         → /research --type bugfix
```

**Kiểm tra trạng thái:**
```bash
node core/state/state-manager.js get
/guide --status
/guide --next
/guide --arch-ready               # Xem hướng dẫn arch-ready workflow
```

Xem tài liệu đầy đủ: `docs/workflow-state-transitions.md`

---

### If `$ARGUMENTS` is something else:
Say: "Option không hợp lệ. Chạy `/guide` để xem danh sách options."

---

**IMPORTANT:** All output must be in Vietnamese.
