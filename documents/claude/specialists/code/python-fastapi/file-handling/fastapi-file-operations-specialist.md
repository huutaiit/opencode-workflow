# FastAPI File Operations Specialist
# FastAPIファイル操作スペシャリスト
# Chuyen Gia FastAPI File Operations

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Directory Pattern** | `src/core/files.py`, `src/{domain}/uploads.py` |
| **Variant** | ALL |
| **Naming Convention** | `files.py` (core utilities), `uploads.py` (domain upload logic) |
| **Imports From** | Core (config for upload limits, storage paths) |
| **Cannot Import** | Domain, Application |
| **Dependencies** | `python-magic`, `aiofiles` |
| **When To Use** | File upload, validation, CSV streaming, file response |
| **Source Skeleton** | `src/core/file_utils.py`, `src/{domain}/upload.py` |
| **Pattern Numbers** | 32.1–32.6 |
| **Source Paths** | `**/files.py`, `**/uploads.py` |
| **File Count** | 1 core + 1 per domain |
| **Imported By** | Application (services), Presentation (route handlers) |
| **Specialist Type** | code |
| **Purpose** | Chunked file upload with size enforcement, magic number validation, CSV streaming export, FileResponse vs StreamingResponse, Word template generation, file upload security |
| **Activation Trigger** | upload, download, `UploadFile`, `FileResponse`, `StreamingResponse`, csv, docx |

---

## Purpose

Define file operation patterns for FastAPI: chunked upload with strict size enforcement, content validation via magic bytes, CSV streaming for large datasets, file response selection, Word document generation with docxtpl, and upload security hardening.

---

## Pattern 32.1: Chunked File Upload

```python
from fastapi import UploadFile, HTTPException

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
CHUNK_SIZE = 64 * 1024  # 64KB


async def validate_file_size(file: UploadFile, max_size: int = MAX_FILE_SIZE) -> bytes:
    """Read file in chunks to enforce size limit without loading all into memory."""
    total = 0
    chunks = []

    while chunk := await file.read(CHUNK_SIZE):
        total += len(chunk)
        if total > max_size:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size: {max_size // (1024*1024)}MB",
            )
        chunks.append(chunk)

    return b"".join(chunks)


@router.post("/upload")
async def upload_file(file: UploadFile) -> dict:
    content = await validate_file_size(file)
    # Process content...
    return {"filename": file.filename, "size": len(content)}
```

**Key rule**: Read in 64KB chunks. Never use `await file.read()` without size limits — a malicious client can exhaust server memory.

---

## Pattern 32.2: Magic Number Validation

```python
MAGIC_NUMBERS = {
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/gif": [b"GIF87a", b"GIF89a"],
    "image/webp": [b"RIFF"],  # Check bytes 8-12 for "WEBP"
    "application/pdf": [b"%PDF"],
    "application/zip": [b"PK\x03\x04"],
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [b"PK\x03\x04"],  # xlsx is zip
}


def validate_content_type(content: bytes, expected_types: list[str]) -> str | None:
    """Validate file content by magic bytes — more secure than Content-Type header."""
    for mime_type in expected_types:
        signatures = MAGIC_NUMBERS.get(mime_type, [])
        for sig in signatures:
            if content[:len(sig)] == sig:
                return mime_type
    return None


@router.post("/upload/image")
async def upload_image(file: UploadFile) -> dict:
    content = await validate_file_size(file, max_size=5 * 1024 * 1024)

    detected = validate_content_type(content, ["image/jpeg", "image/png", "image/webp"])
    if detected is None:
        raise HTTPException(400, "Invalid file type. Accepted: JPEG, PNG, WebP")

    return {"type": detected, "size": len(content)}
```

**Key rule**: Never trust `Content-Type` header from client. Validate magic bytes from actual file content.

---

## Pattern 32.3: CSV Streaming Export

```python
import csv
import io
from typing import AsyncGenerator

from fastapi.responses import StreamingResponse


async def stream_csv(
    query_func,
    headers: list[str],
    page_size: int = 1000,
) -> AsyncGenerator[str, None]:
    """Stream CSV rows — constant memory for 1M+ rows."""
    # Write header
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(headers)
    yield buffer.getvalue()

    # Stream data in pages
    offset = 0
    while True:
        rows = await query_func(offset=offset, limit=page_size)
        if not rows:
            break

        buffer = io.StringIO()
        writer = csv.writer(buffer)
        for row in rows:
            writer.writerow(row)
        yield buffer.getvalue()

        offset += page_size


@router.get("/export/users.csv")
async def export_users_csv(repo: UserRepository = Depends()):
    return StreamingResponse(
        stream_csv(repo.get_page, headers=["ID", "Name", "Email"]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="users.csv"'},
    )
```

---

## Pattern 32.4: FileResponse vs StreamingResponse

```python
from fastapi.responses import FileResponse, StreamingResponse

# FileResponse: static files on disk (auto Content-Length, range requests)
@router.get("/files/{file_id}")
async def download_file(file_id: str):
    path = f"/uploads/{file_id}"
    return FileResponse(
        path,
        filename="document.pdf",
        media_type="application/pdf",
    )


# StreamingResponse: generated content or large files
@router.get("/reports/{report_id}")
async def download_report(report_id: str):
    async def generate():
        async for chunk in generate_report_chunks(report_id):
            yield chunk

    return StreamingResponse(
        generate(),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="report_{report_id}.pdf"'},
    )
```

| Use Case | Response Type |
|----------|--------------|
| Static file on disk | `FileResponse` |
| Generated content (PDF, Excel, CSV) | `StreamingResponse` with `BytesIO` |
| Large dataset (1M+ rows) | `StreamingResponse` with async generator |
| Proxying from S3/external | `StreamingResponse` |

---

## Pattern 32.5: Word Template Generation (docxtpl)

```python
import io
from docxtpl import DocxTemplate
from fastapi.responses import StreamingResponse


def generate_contract(template_path: str, context: dict) -> io.BytesIO:
    doc = DocxTemplate(template_path)
    doc.render(context)

    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer


@router.post("/contracts/generate")
async def create_contract(data: ContractRequest):
    context = {
        "client_name": data.client_name,
        "start_date": data.start_date.strftime("%B %d, %Y"),
        "items": [{"name": i.name, "price": f"${i.price:.2f}"} for i in data.items],
    }
    buffer = generate_contract("templates/contract.docx", context)
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="contract_{data.client_name}.docx"'},
    )
```

**Install**: `pip install docxtpl`

---

## Pattern 32.6: File Upload Security

```python
import uuid
import os
import aiofiles


UPLOAD_DIR = "/var/uploads"  # Outside web root!
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf", ".xlsx", ".docx"}


async def save_upload_secure(file: UploadFile) -> str:
    """Save with UUID filename, validated extension, outside web root."""
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Extension '{ext}' not allowed")

    # UUID filename prevents path traversal and name collisions
    safe_name = f"{uuid.uuid4()}{ext}"
    path = os.path.join(UPLOAD_DIR, safe_name)

    content = await validate_file_size(file)
    validate_content_type(content, ["image/jpeg", "image/png", "application/pdf"])

    async with aiofiles.open(path, "wb") as f:
        await f.write(content)

    return safe_name
```

**Install**: `pip install aiofiles`

**Key rules**:
- UUID filenames (prevent path traversal, collisions)
- Store outside web root (`/var/uploads`, NOT `static/`)
- Validate extension + magic bytes
- Use `aiofiles` for async I/O (doesn't block event loop)

---

## MUST DO

- Read uploads in chunks (64KB) with size enforcement
- Validate file content by magic bytes, not Content-Type header
- Use UUID filenames for stored uploads
- Store uploads outside web root
- Use `StreamingResponse` for generated content
- Use `FileResponse` for static files on disk

## MUST NOT DO

- Use `await file.read()` without size limits
- Trust `file.filename` from client (path traversal risk)
- Store uploads in `static/` or web-accessible directories
- Use sync file I/O in async handlers (use `aiofiles`)
- Return large files without streaming

---

## References

- [FastAPI: Request Files](https://fastapi.tiangolo.com/tutorial/request-files/)
- [FastAPI: Custom Response](https://fastapi.tiangolo.com/advanced/custom-response/)
- [docxtpl Documentation](https://docxtpl.readthedocs.io/)
- [derekmizak: security-implementation](https://github.com/derekmizak/Copilot-RuleSet-FastApi)
