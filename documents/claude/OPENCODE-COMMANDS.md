# OpenCode Framework - Commands

## Danh sách các lệnh

### Lệnh thiết lập dự án
| Lệnh | Mô tả |
|------|-------|
| `/config-project` | Cấu hình dự án |
| `/architect` | Tạo tài liệu kiến trúc |

### Lệnh thiết kế
| Lệnh | Mô tả |
|------|-------|
| `/design` | Tạo tài liệu thiết kế |
| `/design --srs` | Tạo tài liệu SRS |
| `/design --basic` | Tạo tài liệu thiết kế cơ bản |
| `/design --detail` | Tạo tài liệu thiết kế chi tiết |
| `/design --test` | Tạo tài liệu kiểm thử |

### Lệnh nghiên cứu
| Lệnh | Mô tả |
|------|-------|
| `/research` | Thu thập bằng chứng |
| `/innovate` | Tạo các lựa chọn thiết kế |

### Lệnh thực thi
| Lệnh | Mô tả |
|------|-------|
| `/plan` | Lập kế hoạch thực hiện |
| `/execute` | Thực thi kế hoạch |

### Các lệnh kiểm tra
| Lệnh | Mô tả |
|------|-------|
| `/validate` | Kiểm tra mã nguồn |
| `/test` | Kiểm tra kiểm thử |

## Mô tả chi tiết các lệnh

### /config-project
Cấu hình dự án với các thông tin:
- Ngôn ngữ lập trình
- Framework sử dụng
- Cơ sở dữ liệu
- Các thư viện phụ trợ

### /architect
Tạo các tài liệu kiến trúc:
- Đánh giá tổng thể hệ thống
- Kiến thức về domain
- Bản đồ features
- Ước tính effort

### /design
Tạo các tài liệu thiết kế theo các mức độ:
- SRS (Software Requirements Specification)
- Basic Design (Thiết kế cơ bản)
- Detail Design (Thiết kế chi tiết)
- Test Plan (Kế hoạch kiểm thử)

### /research
Thu thập bằng chứng từ nhiều nguồn:
- Tài liệu nội bộ
- Tài liệu bên ngoài
- Mã nguồn hiện có
- Các nguồn tham khảo khác

### /innovate
Tạo các lựa chọn thiết kế:
- Phân tích các giải pháp
- Đánh giá trade-off
- Chọn lựa chọn tối ưu

### /plan
Lập kế hoạch thực hiện:
- Phân chia công việc
- Ước tính thời gian
- Xác định dependencies

### /execute
Thực thi kế hoạch:
- Tạo mã nguồn
- Viết unit test
- Kiểm tra implementation

### /validate
Kiểm tra mã nguồn:
- Kiểm tra cú pháp
- Kiểm tra logic
- Kiểm tra hiệu suất
- Kiểm tra bảo mật

### /test
Kiểm tra kiểm thử:
- Chạy unit test
- Chạy integration test
- Tạo báo cáo kiểm thử