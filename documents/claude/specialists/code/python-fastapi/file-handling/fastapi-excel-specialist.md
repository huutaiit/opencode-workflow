# FastAPI Excel Specialist
# FastAPI Excelスペシャリスト
# Chuyen Gia FastAPI Excel

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Directory Pattern** | `src/{domain}/exports/excel.py` |
| **Variant** | ALL |
| **Naming Convention** | `excel.py` (export/import logic per domain) |
| **Imports From** | Domain (schemas), Data Access (repositories) |
| **Cannot Import** | Presentation |
| **Dependencies** | `openpyxl`, `xlsxwriter` (optional streaming) |
| **When To Use** | Excel export/import, styled reports, chunked reading |
| **Source Skeleton** | `src/{domain}/export.py` |
| **Pattern Numbers** | 30.1–30.5 |
| **Source Paths** | `**/exports/excel.py`, `**/imports/excel.py` |
| **File Count** | 1 per domain with Excel features |
| **Imported By** | Presentation (route handlers) |
| **Specialist Type** | code |
| **Purpose** | Excel generation via xlsxwriter with StreamingResponse, styled reports, openpyxl read_only reading, pandas chunked reading, upload + parse endpoints |
| **Activation Trigger** | excel, xlsx, openpyxl, xlsxwriter, spreadsheet, export |

---

## Purpose

Define Excel file handling patterns for FastAPI: write-only export via xlsxwriter with BytesIO streaming, styled report generation with constant_memory mode, fast reading via openpyxl read_only, pandas optimized chunked reading, and file upload/parse endpoints.

---

## Pattern 30.1: Excel Export via StreamingResponse

```python
import io
from datetime import datetime

import xlsxwriter
from fastapi import Depends
from fastapi.responses import StreamingResponse


async def export_users_excel(
    users: list[UserResponse],
) -> StreamingResponse:
    buffer = io.BytesIO()
    workbook = xlsxwriter.Workbook(buffer, {"in_memory": True})
    worksheet = workbook.add_worksheet("Users")

    # Headers
    headers = ["ID", "Name", "Email", "Created At"]
    for col, header in enumerate(headers):
        worksheet.write(0, col, header)

    # Data rows
    for row, user in enumerate(users, start=1):
        worksheet.write(row, 0, user.id)
        worksheet.write(row, 1, user.name)
        worksheet.write(row, 2, user.email)
        worksheet.write(row, 3, user.created_at.isoformat())

    workbook.close()
    buffer.seek(0)

    filename = f"users_{datetime.now():%Y%m%d_%H%M%S}.xlsx"
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
```

**Key rule**: Use `xlsxwriter` for write-only exports (fastest, smallest file size). Use `{"in_memory": True}` to write to BytesIO instead of disk.

---

## Pattern 30.2: Styled Reports (Constant Memory)

```python
def create_styled_report(data: list[dict], buffer: io.BytesIO) -> None:
    workbook = xlsxwriter.Workbook(buffer, {
        "in_memory": True,
        "constant_memory": True,  # Stream rows to disk — O(1) memory for large files
    })
    worksheet = workbook.add_worksheet("Report")

    # Define formats
    header_fmt = workbook.add_format({
        "bold": True,
        "bg_color": "#4472C4",
        "font_color": "#FFFFFF",
        "border": 1,
    })
    currency_fmt = workbook.add_format({"num_format": "$#,##0.00"})
    date_fmt = workbook.add_format({"num_format": "yyyy-mm-dd"})

    headers = ["Date", "Product", "Quantity", "Price", "Total"]
    for col, h in enumerate(headers):
        worksheet.write(0, col, h, header_fmt)

    for row, item in enumerate(data, start=1):
        worksheet.write(row, 0, item["date"], date_fmt)
        worksheet.write(row, 1, item["product"])
        worksheet.write(row, 2, item["quantity"])
        worksheet.write(row, 3, item["price"], currency_fmt)
        worksheet.write(row, 4, item["quantity"] * item["price"], currency_fmt)

    # Auto-fit column widths (approximate)
    worksheet.set_column(0, 0, 12)  # Date
    worksheet.set_column(1, 1, 25)  # Product
    worksheet.set_column(2, 4, 12)  # Numbers

    workbook.close()
```

**Key rule**: Enable `constant_memory` for large exports (10K+ rows). Rows are flushed to disk incrementally, keeping memory usage flat.

---

## Pattern 30.3: Excel Reading (openpyxl read_only)

```python
from openpyxl import load_workbook


def read_excel_file(file_path: str) -> list[dict]:
    """Read Excel with read_only mode — 50-70% faster, lower memory."""
    wb = load_workbook(file_path, read_only=True, data_only=True)
    ws = wb.active

    rows = ws.iter_rows(min_row=1, values_only=True)
    headers = [str(h).strip().lower() for h in next(rows)]

    data = []
    for row in rows:
        record = dict(zip(headers, row))
        if any(v is not None for v in row):  # Skip empty rows
            data.append(record)

    wb.close()
    return data
```

**Key rule**: Always use `read_only=True` for reading. Standard mode loads entire workbook into memory (~50x file size).

---

## Pattern 30.4: Chunked Reading (pandas)

```python
import pandas as pd


def read_large_excel(
    file_path: str,
    columns: list[str] | None = None,
    chunk_size: int = 1000,
) -> list[dict]:
    """Memory-efficient reading with pandas. Specify columns to minimize I/O."""
    df = pd.read_excel(
        file_path,
        usecols=columns,       # Only read needed columns
        dtype=str,             # Prevent type inference overhead
        engine="openpyxl",
    )
    return df.to_dict(orient="records")
```

---

## Pattern 30.5: Upload + Parse Endpoint

```python
from fastapi import UploadFile, HTTPException
import tempfile
import os


@router.post("/import/excel")
async def import_excel(file: UploadFile) -> dict:
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(400, "Only .xlsx/.xls files accepted")

    if file.size and file.size > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(400, "File too large (max 10MB)")

    # Write to temp file (openpyxl needs seekable file)
    with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        records = read_excel_file(tmp_path)
        # Process records...
        return {"imported": len(records)}
    finally:
        os.unlink(tmp_path)
```

---

## MUST DO

- Use `xlsxwriter` for write-only exports (fastest, smallest output)
- Use `openpyxl` with `read_only=True` for reading
- Enable `constant_memory` for exports with 10K+ rows
- Set `Content-Disposition` header with timestamped filename
- Validate file extension and size on upload

## MUST NOT DO

- Use `openpyxl` for write-only exports (slower, larger files)
- Read Excel without `read_only=True` (50x memory overhead)
- Load entire large file into memory without chunking
- Trust `Content-Type` header for file validation (use extension + magic bytes)

---

## References

- [xlsxwriter Documentation](https://xlsxwriter.readthedocs.io/)
- [openpyxl: Optimised Modes](https://openpyxl.readthedocs.io/en/stable/optimized.html)
- [pandas: read_excel](https://pandas.pydata.org/docs/reference/api/pandas.read_excel.html)
