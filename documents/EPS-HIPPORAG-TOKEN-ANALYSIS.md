# EPS HippoRAG — Token Impact Analysis

*Ngày phân tích: 2026-04-01*

---

## Tóm tắt

HippoRAG được tích hợp vào nhiều workflow của EPS, nhưng **hiện tại chỉ hoạt động ở mức supplementary** (bổ sung context), không phải replacement cho việc load full design documents. Token input cao chủ yếu đến từ nguồn khác.

---

## Các workflow có gọi HippoRAG

| Workflow | File | Khi nào gọi | Blocking? |
|----------|------|-------------|-----------|
| `/plan` | `plan/context-loading.md` Step 2.5 | Source code patterns | Non-blocking |
| `/plan` | `plan/context-loading.md` Step 2.10 | Architecture context | Non-blocking |
| `/execute` | `execute/plan-loading.md` Step 1.5 | Graph context for execution | Non-blocking |
| `/validate` | `validate.md` Pass 3 | Code review | Non-blocking |
| `/design --detail` | `design/detail.md`, `bdd-pseudo.md`, `fdd-pseudo.md` | BDD/FDD generation | Non-blocking |
| `/design --test` | `design/test.md` | Test generation (Phase 1, 2, 3) | Non-blocking |
| `/design --srs` | `design/srs.md` | SRS generation | Non-blocking |
| `/config-project` | `config-project.md` | Health check | N/A |

Tất cả đều dùng qua adapter `core/rag/hipporag-service.js` — server thay đổi thì chỉ cần update adapter, workflow không đổi.

---

## Tác động thực tế đến Input Tokens

### Bước RAG THỰC SỰ tiết kiệm token

| Bước | Không có RAG | Có RAG | Mức tiết kiệm |
|------|-------------|--------|---------------|
| Step 2.10 Architecture context | Load toàn bộ `basic-design.md`, parse section 1.1 + 1.2 | Query `arch` layer, `topK: 5` chunks | **Cao** |
| Step 2.5 Source code patterns | Không có context (hoặc load thủ công) | `topK: 10` chunks liên quan | **Cao** |
| execute Step 1.5 | Không có code context | Graph report (node/edge counts) | **Trung bình** |

### Bước RAG KHÔNG giúp được nhiều

- **Step 2.8 DD Mode**: Token reduction đến từ `.pseudo` files (70% nếu cả 2 file, 35% hybrid), **không phải RAG**
- **Step 2.9 Specialists**: Load cả file specialist content, RAG không tham gia vào bước này
- **Step 2.7 Evidence**: Đọc trực tiếp `evidence.md` toàn bộ, không qua RAG
- **Design docs (SRS, BD, DD)**: Vẫn load **toàn bộ file** vào context — đây là nguồn token lớn nhất

---

## Nguồn gốc thực sự của High Input Tokens

```
Thứ tự đóng góp token (ước tính cao → thấp):

1. Design documents (SRS + BD + DD)    → 3,000–8,000 tokens mỗi file
2. System prompt + command files       → ~5,000–10,000 tokens (cố định)
3. Specialists (top-3 preloaded)       → ~1,000–2,000 tokens mỗi specialist
4. Evidence.md (living document)       → tích lũy theo thời gian
5. Architecture context (nếu không RAG) → ~500–1,500 tokens
6. RAG chunks (khi hoạt động)          → ~200–500 tokens (kiểm soát được)
```

---

## Cơ hội tối ưu — Để RAG thực sự giảm tokens

Hiện tại workflow load **toàn bộ design docs** rồi đưa vào context. Muốn giảm mạnh cần thay đổi strategy:

### 1. Thay full-doc loading bằng RAG-targeted retrieval
Thay vì load toàn bộ DD (3,000–8,000 tokens), query RAG lấy đúng sections liên quan đến step hiện tại (`topK: 5–10`).

```
Trước: load full DD → ~6,000 tokens
Sau:   RAG query → ~500–800 tokens relevant chunks
Tiết kiệm: ~85%
```

### 2. Lazy specialist loading
Hiện load top-3 upfront vào mọi step. Nếu RAG biết step cần gì, chỉ load 1 specialist đúng lúc.

```
Trước: 3 specialists × 1,500 tokens = ~4,500 tokens
Sau:   1 specialist per step × 1,500 = ~1,500 tokens
Tiết kiệm: ~67%
```

### 3. Evidence compression qua RAG
Thay vì đọc toàn bộ `evidence.md`, query RAG `design` layer lấy phần liên quan.

```
Trước: evidence.md full (~2,000–5,000 tokens)
Sau:   RAG query → relevant decisions (~300–500 tokens)
Tiết kiệm: ~80%
```

### Ước tính tổng nếu làm đủ 3 điều trên
**~40–60% giảm input tokens** cho workflow `/plan`

---

## Layer Priority của HippoRAG theo workflow

```javascript
// Từ hipporag-service.js LAYER_PRIORITY
{
  "design-srs":    { primary: ["docs", "eps", "arch"], secondary: ["code"] },
  "design-basic":  { primary: ["arch", "docs", "eps"], secondary: ["code"] },
  "design-detail": { primary: ["code", "arch", "docs"], secondary: ["eps"] },
  "design-test":   { primary: ["code", "arch", "docs"], secondary: ["eps"] },
  "plan":          { primary: ["code", "arch"],          secondary: ["docs", "eps"] },
  "execute":       { primary: ["code"],                  secondary: ["arch"] },
  "validate":      { primary: ["code", "docs"],          secondary: ["eps", "arch"] }
}
```

---

## Kết luận

HippoRAG trong EPS đang hoạt động đúng thiết kế nhưng chưa khai thác hết tiềm năng token optimization. Để giảm chi phí Anthropic API một cách đáng kể, cần chuyển từ **"RAG bổ sung context"** sang **"RAG thay thế full-doc loading"** — đặc biệt ở bước load Design Documents và Specialists trong `/plan`.
