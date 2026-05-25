# EPS Framework — Git Integration

> Tài liệu này mô tả cách EPS Framework tương tác với git ở từng bước workflow.
> Cập nhật: 2026-03-30 | EPS v10.0

---

## Kết luận nhanh

**EPS Framework không có bước nào tự động commit hoặc yêu cầu git commit.**

Git chỉ được dùng ở chế độ **read-only** (đọc metadata). Toàn bộ source code do `/execute` tạo ra đều là **uncommitted changes** — developer tự quyết định khi nào commit.

---

## Git được dùng như thế nào (Read-only, chạy ngầm)

| Lệnh git | Dùng trong command | Mục đích |
|-----------|-------------------|---------|
| `git config user.name` | `/research`, `/save` | Lấy tên developer → đặt tên context directory (`{FEATURE}-{developer}/`) |
| `git branch --show-current` | `/save`, `/recall`, `/list` | Xác định branch hiện tại → đường dẫn memory-bank (`memory-bank/{branch}/`) |
| `git rev-parse --show-toplevel` | `/save`, `/recall`, `/list` | Tìm repo root → đặt đúng absolute path cho memory-bank |
| `git rev-parse --abbrev-ref HEAD` | `/innovate` (bd.md, dd.md), `/plan` | Lấy branch name cho RAG service instance |
| `git diff --name-only` | `/validate` | **Fallback only** — chỉ dùng khi `execution-state.json` không có danh sách files đã thay đổi |
| `git log -1 --oneline` | `/save` | Ghi latest commit hash vào memory snapshot (thông tin, không thay đổi gì) |

---

## Những gì KHÔNG tồn tại

Sau khi tìm kiếm toàn bộ `.claude/commands/**/*.md`:

| Lệnh | Có trong framework? |
|------|---------------------|
| `git add` | ❌ Không |
| `git commit` | ❌ Không |
| `git push` | ❌ Không |
| `git checkout -b` | ❌ Không |
| Auto branch creation | ❌ Không |

---

## 2 mentions về "commit" — không phải auto-trigger

### 1. `/plan-review` — Advisory note

```
✅ Before committing plan to version control
```

Đây chỉ là **gợi ý** trong danh sách use cases của `/plan-review`. Không phải lệnh tự động chạy.

### 2. `/plan/bugfix.md` — Hướng dẫn rollback thủ công

```
## 6. Rollback Plan
If fix causes issues:
1. Revert commit: git revert [commit-hash]
2. Re-analyze root cause
```

Đây là nội dung trong **tài liệu plan** — hướng dẫn developer nếu cần rollback. Developer tự chạy, không phải EPS tự động.

---

## Flow thực tế sau khi /execute xong

```
/execute  →  Source code files tạo/sửa trên disk
              Trạng thái: UNTRACKED hoặc MODIFIED (chưa staged)
                ↓
/validate  →  Kiểm tra quality (không động đến git)
                ↓
/test run  →  Chạy tests (không động đến git)
                ↓
              State = TESTED ✅
                ↓
         Developer tự quyết định:
           git add <files>
           git commit -m "feat: ..."
           git push
           → Tạo PR
```

---

## Tại sao EPS không tự commit?

Framework giữ nguyên trách nhiệm git cho developer vì:

1. **Developer phải review code** trước khi commit — EPS tạo code nhưng developer là người chịu trách nhiệm
2. **Commit message** cần context mà developer mới biết (ticket number, PR link, convention)
3. **Granularity** — developer có thể muốn tách thành nhiều commits nhỏ từ một feature lớn
4. **Safety** — không auto-push lên remote tránh rủi ro với shared branches

---

## Git được dùng để định vị memory-bank

Đây là cách dùng git quan trọng nhất trong EPS — **xác định đường dẫn lưu trữ context**:

```
memory-bank path = {git repo root}/.claude/memory-bank/{branch}/{FEATURE}-{developer}/
                         ↑                                    ↑           ↑
                git rev-parse --show-toplevel    git branch --show-current  git config user.name
```

Ví dụ:
```
/project/.claude/memory-bank/feature/cmn001-customer/REQ-001-nguyen-van-a/
```

Mỗi developer trên mỗi branch có context directory riêng biệt — không conflict khi nhiều người làm cùng lúc.
