# Hướng Dẫn Setup Project Mới Với Aurea Code (EPS Framework)

Tài liệu này hướng dẫn developer cách khởi tạo một dự án mới hoàn toàn sử dụng bộ framework `aurea-code` (được phân phối qua npm package `eps-workflow`), lấy từ server Verdaccio nội bộ có IP `10.0.0.66`.

---

## Bước 1: Khởi tạo thư mục dự án

Mở terminal và tạo một thư mục mới cho dự án của bạn, sau đó di chuyển vào thư mục đó:

```bash
mkdir my-new-project
cd my-new-project
```

**📌 Kết quả:** Bạn sẽ có một thư mục rỗng và con trỏ dòng lệnh (terminal) đã được chuyển vào bên trong thư mục này.

## Bước 2: Khởi tạo dự án Node.js

Tạo file `package.json` với cấu hình mặc định:

```bash
npm init -y
```

**📌 Kết quả:** Terminal sẽ in ra một file json, đồng thời một file `package.json` sẽ được tạo ra trực tiếp tại thư mục hiện hành với các thông số mặc định của dự án.

## Bước 3: Cài đặt Framework Aurea Code (eps-workflow)

Tải và cài đặt framework vào dự án. Lệnh này sẽ kết nối thẳng lên `10.0.0.66` để kéo source mới nhất về:

```bash
npm install eps-workflow --registry http://10.0.0.66:4873
```

hoặc update:

```bash
npm update eps-workflow --registry http://10.0.0.66:4873
```

**📌 Kết quả:** Quá trình tải gói (download package) sẽ diễn ra. Sau khi xong, thư mục `node_modules/` và file `package-lock.json` tự động được tạo. Toàn bộ mã nguồn cốt lõi của EPS/Aurea-code đã sẵn sàng trong `node_modules/eps-workflow/`.

*(Lưu ý: `eps-workflow` chính là nội dung của repo `aurea-code` phân phối chuẩn lên registry đóng vai trò cung cấp các luồng AI workflow cho dự án của bạn.)*

## Bước 4: Khởi tạo môi trường tự động

Sau khi cài đặt gói xong, chỉ cần dùng lệnh sau để EPS Framewok tự sinh ra cấu trúc các thư mục, file cấu hình và các luật (rules) cho thư mục `.claude/` của bạn:

```bash
npx eps init --yes
```

**📌 Kết quả:** Bạn sẽ thấy các thông báo hiển thị tạo thành công (✅ Created...). Trong gốc dự án của bạn, công cụ đã tự động tạo ra cấu trúc sau:
- Thư mục `.claude/` (thư mục xử lý trung tâm dành riêng cho Claude AI).
- Sinh ra các lối tắt Symlink (`core`, `specialists`, `guards`, `skills`) trỏ trực tiếp đến `node_modules/eps-workflow/` để tiết kiệm bộ nhớ.
- Sinh ra file cấu hình của dự án tại `.claude/config/project-config.json`.
- Tự động copy hệ thống rules (quy chuẩn) và commands (lệnh) tiêu chuẩn vào dự án của bạn.

## Bước 5: Kiểm tra hệ thống (Verify)

Chạy công cụ chẩn đoán của EPS để chắc chắn rằng bạn đã thiết lập đúng mọi thứ:

```bash
npx eps doctor
```

**📌 Kết quả:** Công cụ khám lỗi sẽ phân tích toàn bộ dự án. Nếu terminal liệt kê trạng thái các thành phần hệ thống với hàng loạt dấu ✅ màu xanh lá (như cấu hình Symlinks ok, Node.js version phù hợp, cấu trúc command hợp lệ,...) kết thúc bằng **`🎉 All checks passed!`**, thì EPS Framework đã cài đặt thành công.

## Bước 6: Cấu hình dự án cơ bản

Tại cửa sổ chat với AI, hãy gõ lệnh sau để thiết lập các thông tin công nghệ cốt lõi cho dự án:

```text
/config-project
```

*(Lưu ý: Nếu thao tác CLI trên terminal, tương đương với lệnh `npx eps config-project`)*

**📌 Kết quả:** AI sẽ hỏi bạn các thông tin cần thiết và hướng dẫn bạn set-up (VD: ngôn ngữ, architecture, stack frontend/backend...). Các cài đặt này sẽ được ghi đè vào file `.claude/config/project-config.json`. Kể từ giờ, toàn bộ các quy trình Code AI sẽ học và bám sát tuyệt đối theo cấu hình rập khuôn này mà không bao giờ bị lạc đề!

## Bước 7: Kiểm tra và đồng bộ cấu hình Rules

Sau khi thiết lập xong ở bước 6, hãy kiểm tra lại file `CLAUDE.md` gốc và nội dung trong thư mục `.claude/rules/`. Nếu bạn thấy các quy tắc này chưa được tự động cập nhật khớp với kiến trúc (Architecture/Stack) mà bạn vừa khai báo, hãy copy chính xác câu lệnh dưới đây và yêu cầu AI thực hiện:

```text
CLAUDE.md và thư mục [ĐƯỜNG_DẪN_TUYỆT_ĐỐI_TỚI_PROJECT]/.claude/rules chưa được cập nhật theo lệnh project-config. Hãy cập nhật.
```

*(Ví dụ thực tế: `CLAUDE.md và thư mục /Volumes/DataHLC/myproject/.claude/rules chưa được cập nhật theo lệnh project-config. Hãy cập nhật.`)*

## Bước 8: Khởi tạo Git và Memory Bank

Memory Bank là bộ nhớ bắt buộc để AI lưu trữ ngữ cảnh dự án (context) một cách liên tục thay vì quên mất sau mỗi cuộc trò chuyện. Tính năng này yêu cầu dự án phải được quản lý bằng Git ở nhánh `master`.

Chạy các lệnh sau trên terminal của dự án:
```bash
git init
git checkout -b master
```

Sau đó, quay lại và gõ lệnh sau vào cửa sổ chat với AI:
```text
Hãy khởi tạo memory-bank cho dự án
```

## Bước 9: Thiết lập API Key và Model

Dự án cần kết nối mượt mà với mô hình Gemini. Hãy tạo một file `.env` ở thư mục gốc của dự án và gắn key của bạn vào:
```env
GEMINI_API_KEY=điền_API_key_của_bạn_vào_đây
```

Đồng thời, bạn **bắt buộc** phải sử dụng đúng định dạng tên model phiên bản mạnh nhất hiện tại là:
`"model": "gemini-3.1-pro-preview"` (khi khai báo trong các file cấu hình liên quan đến LLM client).

## Bước 10: Cập nhật thông tin RAG Server (HippoRAG)

Để AI có khả năng đọc hiểu và tìm kiếm tài liệu chuyên sâu của dự án thông qua hệ thống RAG (Retrieval-Augmented Generation), bạn cần cập nhật file cấu hình kết nối máy chủ:

**File:** `.claude/config/rag-server.json`

Mở file và điền đúng thông tin URL server HippoRAG và Embedding mà team cung cấp. Cấu trúc file gồm 2 khối chính:

```json
{
  "hipporag": {
    "url": "http://<IP_HIPPORAG_SERVER>:8000",
    "project": "<TÊN_DỰ_ÁN>",
    "timeout_ms": 60000,
    "jwt_token": "",
    "poll_interval_ms": 1000,
    "max_poll_attempts": 120,
    "max_retries": 3,
    "retry_delay_ms": 1000
  },
  "embedding": {
    "url": "http://<IP_EMBEDDING_SERVER>:8080",
    "model": "BAAI/bge-m3",
    "dimension": 1024,
    "maxTokens": 8192,
    "maxBatchSize": 64,
    "normalize": true,
    "healthEndpoint": "/health",
    "embedEndpoint": "/embed",
    "timeoutMs": 60000,
    "maxRetries": 3
  }
}
```

**Giải thích các trường quan trọng cần sửa:**

| Trường | Mô tả | Ví dụ |
|--------|--------|-------|
| `hipporag.url` | Địa chỉ máy chủ HippoRAG (hỏi DevOps/Lead) | `http://10.0.0.66:8000` |
| `hipporag.project` | Tên định danh dự án của bạn trên server RAG | `my-new-project` |
| `hipporag.jwt_token` | Token xác thực (nếu server yêu cầu), để trống nếu không có | `""` |
| `embedding.url` | Địa chỉ máy chủ Embedding (tạo vector) | `http://10.0.0.66:8080` |

*(Các trường còn lại giữ nguyên giá trị mặc định, chỉ thay đổi khi có yêu cầu đặc biệt từ team)*

**📌 Kết quả:** Sau khi lưu file, AI sẽ tự động kết nối tới HippoRAG Server để index tài liệu thiết kế và truy vấn tri thức dự án. Bạn có thể kiểm tra kết nối bằng lệnh `npx eps doctor` — mục RAG Server sẽ hiển thị ✅ nếu cấu hình đúng.

## Bước 11: Thiết kế Kiến trúc hệ thống (Architect)

Cuối cùng, sau khi mọi thiết lập môi trường đã xong xuôi, hãy gõ lệnh sau trên cửa sổ chat với AI để bắt đầu chặng đường thiết kế:

```text
/architect
```

**📌 Kết quả:** Trợ lý thiết kế Kiến trúc sư (Architect Specialist) sẽ được kích hoạt để dẫn dắt bạn thiết kế luồng dữ liệu, quy hoạch các cấu trúc thư mục lõi, sơ đồ DB... chuẩn mẫu theo toàn bộ các khai báo ở trên.

Tới đây, xin chúc mừng vì bộ mã nguồn của bạn đã sẵn sàng 100% để bước vào giai đoạn code ứng dụng thực tế cùng AI!

## Bước 12: Chia sẻ cấu hình cho Team (Commit vào Git)

Sau khi hoàn tất tất cả các bước trên, bạn (người setup đầu tiên) cần **commit các file cấu hình đã thiết lập vào Git** để các developer khác trong team chỉ cần clone repo về và chạy `npm install` là có thể làm việc ngay, **không cần config lại từ đầu**.

### 12.1 Cấu hình `.gitignore` đúng chuẩn

Tạo hoặc cập nhật file `.gitignore` ở gốc dự án với nội dung sau để **chỉ commit những gì cần thiết**:

```gitignore
# === Dependencies ===
node_modules/

# === EPS Framework — CÁC THƯ MỤC SYMLINK (tự sinh khi npm install, KHÔNG commit) ===
.claude/core
.claude/specialists
.claude/guards
.claude/skills

# === EPS Framework — DỮ LIỆU TẠM (KHÔNG commit) ===
.claude/cache/
.claude/memory-bank/
.claude/.tmp/

# === Môi trường (chứa API key nhạy cảm, KHÔNG commit) ===
.env
.env.local
.env.*.local

# === Logs & OS ===
*.log
npm-debug.log*
.DS_Store
Thumbs.db
```

### 12.1b Cấu hình `.claudeignore` (Tối ưu cho AI)

File `.claudeignore` hoạt động giống `.gitignore` nhưng dành riêng cho Claude AI. Nó chỉ định những file/thư mục mà AI **không cần đọc**, giúp tiết kiệm context window và tăng độ chính xác khi AI phân tích code.

Tạo file `.claudeignore` ở gốc dự án:

```text
# === Dependencies (rất nặng, AI không cần đọc) ===
node_modules/
package-lock.json

# === Build output ===
dist/
build/
target/
.next/
out/

# === EPS Framework — Nội bộ engine (AI đã load qua symlink) ===
.claude/cache/
.claude/memory-bank/
.claude/.tmp/

# === Logs & dữ liệu tạm ===
*.log
coverage/
.nyc_output/

# === IDE ===
.idea/
.vscode/

# === OS ===
.DS_Store
Thumbs.db
```

> **Nguyên tắc:** Các thư mục symlink (`core`, `specialists`, `guards`, `skills`) sẽ được **tự động tái tạo** khi chạy `npm install eps-workflow`, nên không cần commit. Chỉ commit các file cấu hình đã thiết lập thủ công.

### 12.2 Commit cấu hình dự án

```bash
git add .claude/config/
git add .claude/rules/
git add .claude/commands/
git add .claude/CLAUDE.md
git add .claude/settings.json
git add .gitignore
git add package.json package-lock.json

git commit -m "chore: EPS Framework config cho team"
git push origin master
```

**Danh sách các file/thư mục được commit (chia sẻ cho team):**

| Thư mục / File | Nội dung | Lý do commit |
|----------------|----------|--------------|
| `.claude/config/` | `project-config.json`, `rag-server.json`, `external-apis.json`, `feature-dictionary.json` | Cấu hình kiến trúc, RAG, API — đã thiết lập xong |
| `.claude/rules/` | `backend-java.md`, `frontend-react.md`, `infrastructure.md`... | Quy chuẩn code theo stack — đồng bộ cả team |
| `.claude/commands/` | Các lệnh slash command tùy chỉnh | Lệnh AI dùng chung |
| `.claude/CLAUDE.md` | File chỉ dẫn gốc cho AI | Context chung cho cả team |
| `.claude/settings.json` | Thiết lập framework | Cấu hình EPS chung |

### 12.3 Hướng dẫn cho Developer khác trong Team

Khi một developer mới tham gia dự án, họ **chỉ cần thực hiện đúng 3 lệnh**:

```bash
# 1. Clone repo
git clone <repo-url>
cd <tên-dự-án>

# 2. Cài đặt dependencies + EPS Framework (symlinks tự động được tạo lại)
npm install

# 3. Tạo file .env cá nhân (API key riêng của mỗi người, KHÔNG có trên Git)
echo "GEMINI_API_KEY=điền_key_của_bạn" > .env

# Xong! Kiểm tra lại
npx eps doctor
```

**📌 Kết quả:** Toàn bộ cấu hình (`config/`, `rules/`, `CLAUDE.md`, `settings.json`) đã có sẵn từ Git. Các symlink (`core/`, `specialists/`...) được tự động tạo lại bởi `npm install`. Developer mới chỉ cần tạo file `.env` chứa API key cá nhân là làm việc được ngay!

---

## ⚡ Script Tự Động Toàn Bộ (Fast Track)

Script dưới đây tự động hoá **Bước 1 → 9** (các bước chạy trên terminal). Các bước còn lại (6, 7, 10, 11, 12) cần thao tác trên giao diện chat AI hoặc chỉnh sửa file thủ công.

```bash
#!/bin/bash
PROJECT_NAME="my-awesome-project"

# === Bước 1: Tạo thư mục dự án ===
echo "📁 1. Tạo dự án $PROJECT_NAME..."
mkdir -p "$PROJECT_NAME" && cd "$PROJECT_NAME"

# === Bước 2: Khởi tạo npm ===
echo "📦 2. Khởi tạo npm..."
npm init -y

# === Bước 3: Cài đặt eps-workflow ===
echo "⬇️  3. Cài đặt eps-workflow..."
npm install eps-workflow --registry http://10.0.0.66:4873

# === Bước 4: Khởi tạo EPS Framework ===
echo "⚙️  4. Khởi tạo EPS Framework..."
npx eps init --yes

# === Bước 5: Kiểm tra hệ thống ===
echo "🔍 5. Kiểm tra hệ thống..."
npx eps doctor

# === Bước 8: Khởi tạo Git (master branch cho memory-bank) ===
echo "🌿 8. Khởi tạo Git..."
git init
git checkout -b master

# === Bước 9: Tạo file .env mẫu ===
echo "🔑 9. Tạo file .env..."
cat > .env << 'EOF'
GEMINI_API_KEY=điền_API_key_của_bạn_vào_đây
EOF

# === Tạo .gitignore ===
echo "📝 Tạo .gitignore..."
cat > .gitignore << 'EOF'
# Dependencies
node_modules/

# EPS Framework — Symlinks (tự sinh khi npm install)
.claude/core
.claude/specialists
.claude/guards
.claude/skills

# EPS Framework — Dữ liệu tạm
.claude/cache/
.claude/memory-bank/
.claude/.tmp/

# Môi trường (API key nhạy cảm)
.env
.env.local
.env.*.local

# Logs & OS
*.log
npm-debug.log*
.DS_Store
Thumbs.db
EOF

# === Tạo .claudeignore ===
echo "🤖 Tạo .claudeignore..."
cat > .claudeignore << 'EOF'
# Dependencies (AI không cần đọc)
node_modules/
package-lock.json

# Build output
dist/
build/
target/
.next/
out/

# EPS Framework nội bộ
.claude/cache/
.claude/memory-bank/
.claude/.tmp/

# Logs & IDE & OS
*.log
coverage/
.nyc_output/
.idea/
.vscode/
.DS_Store
Thumbs.db
EOF

echo ""
echo "✅ Xong! Dự án đã sẵn sàng ở vị trí: $(pwd)"
echo ""
echo "👉 Các bước tiếp theo cần thao tác trên giao diện chat AI:"
echo "   Bước 6:  Gõ /config-project         → Cấu hình kiến trúc dự án"
echo "   Bước 7:  Yêu cầu AI cập nhật rules  → Đồng bộ CLAUDE.md và .claude/rules/"
echo "   Bước 10: Sửa .claude/config/rag-server.json → Cấu hình RAG Server"
echo "   Bước 11: Gõ /architect               → Bắt đầu thiết kế kiến trúc"
echo "   Bước 12: git add + commit + push     → Chia sẻ cấu hình cho team"
```

---

## 📎 Thông tin bổ sung

### Auto-approve cho Claude Code (`settings.local.json`)

Mặc định, Claude Code sẽ hỏi xác nhận mỗi khi thực hiện thao tác trên file hoặc chạy lệnh terminal. Để AI chạy tự động mà không cần nhấn "Allow" liên tục, hãy tạo file `.claude/settings.local.json` ở gốc dự án:

```json
{
  "permissions": {
    "allow": [
      "Bash(*)",
      "Edit(*)",
      "Write(*)",
      "Read(*)"
    ]
  }
}
```

**📌 Tác dụng:** Claude Code sẽ được phép tự động đọc, ghi, sửa file và chạy lệnh terminal mà không cần hỏi xác nhận từng bước. Điều này giúp tăng tốc đáng kể khi AI thực hiện các tác vụ phức tạp (thiết kế, generate code, chạy test...).

> ⚠️ **Lưu ý:** File này chỉ dùng cho môi trường **phát triển cá nhân**. Không nên commit lên Git (đã nằm trong `.gitignore` mặc định). Mỗi developer tự tạo trên máy của mình.
