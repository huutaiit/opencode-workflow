# opencode-workflow Demo

Các bước để chạy thực tế:

## 1. Tạo project demo

```bash
mkdir -p /tmp/owf-demo && cd /tmp/owf-demo
npm init -y
```

## 2. Cài package local

```bash
npm install /media/tai/DATA1/AIThucChien/opencode-workflow
```

## 3. Init framework

```bash
npx opencode-workflow init
```

Kết quả: Tạo `.opencode/` với các thư mục:
```
.opencode/
├── agent/
├── command/          ← commands được copy từ template
├── skill/
├── plugin/           ← plugins được copy từ template
├── config/
└── memory-bank/
```

## 4. Verify

```bash
npx opencode-workflow doctor
```

## 5. Dùng trong OpenCode CLI

Sau đó mở OpenCode CLI trong project demo, chạy:

```bash
# SETUP (chạy 1 lần)
/config-project     # Auto-detect tech stack
/scan --all         # Index source code vào module registry

# STAGE 1 — DESIGN
/research --type new --input docs/requirements/REQ-001.md
# → auto-chain: /innovate → /design --srs → /design --basic → /design --detail

# STAGE 2 — IMPLEMENTATION
/plan
# → auto-chain: /plan-review → /execute → /validate → /test

# UTILITY
/save --tag "checkpoint-1"    # Save context snapshot
/recall --latest              # Resume from latest save
/list                         # List all memories
/guide --workflow             # Show workflow guide
/commands                     # Command dashboard
```

## Workflow Modes

| Mode | Commands | Use Case |
|------|----------|----------|
| **Full** | `/research` → auto-chain → `/plan` → auto-chain | New feature |
| **Bugfix** | `/research --type bugfix` → `/plan` | Bug fix |
| **Arch-Ready** | `/design --init` → `/design --basic` → `/design --detail` → `/plan` | Design only |

## Lưu ý

- Framework chỉ tạo thư mục `.opencode/` trong project — không chỉnh sửa source code
- Tất cả lệnh đều là **read-only trừ execute phase**
- Memory bank lưu trong `.opencode/memory-bank/{branch}/` — tự động theo git branch
- Không tự động commit — developer tự quyết định
