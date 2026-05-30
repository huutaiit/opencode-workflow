# OpenCode Framework - Documentation

## Giới thiệu về OpenCode Framework

OpenCode Framework là một hệ thống framework được thiết kế để tự động hóa quy trình phát triển phần mềm bằng AI. Framework này sử dụng các công nghệ AI tiên tiến để hỗ trợ thiết kế, phát triển và triển khai hệ thống phần mềm hiệu quả và nhất quán.

## Kiến trúc hệ thống

Framework bao gồm các thành phần chính:
1. **L1 - Commands Layer**: Các lệnh người dùng có thể sử dụng
2. **L2 - Micro-Commands**: Các quy trình nhỏ được thực thi bên trong commands
3. **L3 - Specialists**: Các chuyên gia trong nhiều lĩnh vực
4. **L4 - Guards**: Các quy tắc kiểm soát
5. **L5 - Skills**: Các kỹ năng có thể tái sử dụng
6. **L6 - Engine**: Các module runtime

## Quy ước đặt tên
- `{branch}` = tên git branch hiện tại
- `{FEATURE_ID}` = ID feature từ file requirement
- `{developer}` = git user.name
- `{feature}` = tên feature

## Cấu trúc thư mục

```
project-root/
│
├── .opencode/                           ← Framework config
│   ├── config/                           ← Project configuration
│   │   └── project-config.json          ← Project configuration file
│   └── memory-bank/                     ← All context per-feature
        └── {branch}/
            └── {FEATURE_ID}-{developer}/  ← Context directory
                ├── context.md            ← Workflow state
                ├── evidence.md             ← Evidence from research
                ├── domain-knowledge.md       ← Domain KB (new features)
                ├── context-state.json     ← Context state file
                └── evidence-state.json      ← Evidence state file
```

## Các lệnh chính

### Lệnh thiết lập dự án
```bash
/config-project    # Cấu hình dự án
/architect         # Tạo tài liệu kiến trúc
```

### Lệnh thiết kế
```bash
/design            # Tạo tài liệu thiết kế
```

### Lệnh nghiên cứu
```bash
/research          # Thu thập bằng chứng
/innovate         # Tạo các lựa chọn thiết kế
```

### Lệnh thực thi
```bash
/plan             # Lập kế hoạch thực hiện
/execute          # Thực thi kế hoạch
```

### Các lệnh kiểm tra
```bash
/validate           # Kiểm tra mã nguồn
/test             # Kiểm tra kiểm thử
```

## Quy trình làm việc
1. Nghiên cứu và thu thập bằng chứng
2. Tạo các lựa chọn thiết kế
3. Tạo tài liệu thiết kế
4. Lập kế hoạch thực hiện
5. Thực thi kế hoạch
6. Kiểm tra thực hiện

## Cấu trúc file output

### Tài liệu thiết kế
- `{feature}-BASE-srs.md`
- `{feature}-BASE-basic-design.md`
- `{feature}-BASE-frontend-detail-design.md`
- `{feature}-BASE-backend-detail-design.md`
- `{feature}-BASE-api-contracts.md`

### File thực thi
- `{feature}-implementation-plan.md`
- `{feature}-master-plan.md`
- `SP-{n}-{title}.md`

### File kiểm tra
- `test-run-report.md`
- `validation-report.md`

## Quy tắc thực thi
1. Chỉ thực hiện những gì có trong kế hoạch
2. Kiểm tra mã nguồn
3. Kiểm tra logic
4. Kiểm tra cú pháp
5. Kiểm tra hiệu suất
6. Kiểm tra bảo mật

## Cấu trúc thư mục
```
.claude/
├── commands/                    # Tất cả slash commands
│   ├── architect.md             # Router: 5-phase architecture docs
│   ├── commands.md              # Dashboard & registry
│   ├── config-project.md        # Auto-detect + configure tech stack
│   ├── design.md                # Router: Design document types
│   ├── execute.md               # Router: Implement approved plan
│   ├── research.md              # Unified KB builder
│   ├── innovate.md             # Router: Decision engine (2 parts)
│   ├── plan.md                  # Router: Multi-model planning
│   ├── validate.md                # 3-pass validation
│   └── design/                 # Sub-commands: Design document types
│       ├── README.md            # Design command structure
│       ├── srs.md               # SRS document workflow
│       ├── basic.md             # Basic Design (BD) workflow
│       ├── detail.md            # Detail Design router (FDD + BDD + API)
│       ├── test.md              # Test Plan document
│       └── detail/              # Detail design micro-commands
│           ├── fdd.md           # Frontend Detail Design
│           ├── fdd-pseudo.md  # FDD → pseudo-code for /plan
│           ├── bdd.md          # Backend Detail Design
│           ├── bdd-pseudo.md    # BDD → pseudo-code for /plan
│           └── api-contract.md  # API contracts từ FDD Section 5
│
└── rules/                       # Coding rules (auto-applied by path glob)
    ├── backend-java.md           # Java/Spring Boot rules
    ├── frontend-nextjs.md        # Next.js/React rules
    └── infrastructure.md         # Infrastructure stack rules
```

## Cấu hình dự án
```
<parameter=description>
Create OpenCode documentation