# FastAPI PDF Specialist
# FastAPI PDFスペシャリスト
# Chuyen Gia FastAPI PDF

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Directory Pattern** | `src/{domain}/exports/pdf.py` |
| **Variant** | ALL |
| **Naming Convention** | `pdf.py` (generation/parsing per domain) |
| **Imports From** | Domain (schemas), Application (services for data) |
| **Cannot Import** | Presentation |
| **Dependencies** | `fpdf2` (generation), `weasyprint` (HTML→PDF), `pypdf`/`pdfplumber` (extraction) |
| **When To Use** | PDF generation, HTML-to-PDF, PDF extraction, OCR |
| **Source Skeleton** | `src/{domain}/pdf_generator.py`, `templates/pdf/` |
| **Pattern Numbers** | 31.1–31.6 |
| **Source Paths** | `**/exports/pdf.py`, `**/parsers/pdf.py` |
| **File Count** | 1 per domain with PDF features |
| **Imported By** | Presentation (route handlers) |
| **Specialist Type** | code |
| **Purpose** | PDF generation (fpdf2, WeasyPrint, ReportLab), text extraction (pypdf), table extraction (pdfplumber), scanned PDF OCR |
| **Activation Trigger** | pdf, fpdf2, weasyprint, reportlab, pypdf, pdfplumber |

---

## Purpose

Define PDF handling patterns for FastAPI: fast generation with fpdf2, HTML-to-PDF with WeasyPrint + Jinja2, complex layouts with ReportLab, text extraction with pypdf, table parsing with pdfplumber, and OCR for scanned documents.

---

## Library Comparison

| Library | Speed | Approach | Best For | Docker Deps |
|---------|-------|----------|----------|-------------|
| **fpdf2** | 0.05s | Code-based | Simple docs, invoices | None (pure Python) |
| **WeasyPrint** | 0.5-2s | HTML/CSS → PDF | Web-styled reports | libpango, libcairo |
| **ReportLab** | 0.2s | Code-based (low-level) | Complex layouts, charts | None (pure Python) |

---

## Pattern 31.1: PDF Generation — fpdf2 (Fastest)

```python
import io
from fpdf import FPDF
from fastapi.responses import StreamingResponse


def generate_invoice_pdf(invoice: InvoiceData) -> io.BytesIO:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    # Header
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, f"Invoice #{invoice.number}", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("Helvetica", "", 10)
    pdf.cell(0, 6, f"Date: {invoice.date}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 6, f"Client: {invoice.client_name}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(10)

    # Table header
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(80, 8, "Item", border=1)
    pdf.cell(30, 8, "Qty", border=1, align="C")
    pdf.cell(40, 8, "Price", border=1, align="R")
    pdf.cell(40, 8, "Total", border=1, align="R")
    pdf.ln()

    # Table rows
    pdf.set_font("Helvetica", "", 10)
    for item in invoice.items:
        pdf.cell(80, 8, item.name, border=1)
        pdf.cell(30, 8, str(item.quantity), border=1, align="C")
        pdf.cell(40, 8, f"${item.price:.2f}", border=1, align="R")
        pdf.cell(40, 8, f"${item.total:.2f}", border=1, align="R")
        pdf.ln()

    buffer = io.BytesIO(pdf.output())
    buffer.seek(0)
    return buffer


@router.get("/invoices/{invoice_id}/pdf")
async def download_invoice(invoice_id: int, service: InvoiceService = Depends()):
    invoice = await service.get_invoice(invoice_id)
    buffer = generate_invoice_pdf(invoice)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="invoice_{invoice_id}.pdf"'},
    )
```

**Install**: `pip install fpdf2`

---

## Pattern 31.2: HTML-to-PDF — WeasyPrint + Jinja2

```python
import io
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
from fastapi.responses import StreamingResponse

templates = Environment(loader=FileSystemLoader("templates/pdf"))


def generate_report_pdf(report: ReportData) -> io.BytesIO:
    template = templates.get_template("report.html")
    html_content = template.render(report=report)

    buffer = io.BytesIO()
    HTML(string=html_content).write_pdf(buffer)
    buffer.seek(0)
    return buffer
```

```html
<!-- templates/pdf/report.html -->
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: sans-serif; margin: 2cm; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4472C4; color: white; }
        @page { size: A4; margin: 2cm; }
    </style>
</head>
<body>
    <h1>{{ report.title }}</h1>
    <p>Generated: {{ report.date }}</p>
    <table>
        <tr>{% for h in report.headers %}<th>{{ h }}</th>{% endfor %}</tr>
        {% for row in report.rows %}
        <tr>{% for cell in row %}<td>{{ cell }}</td>{% endfor %}</tr>
        {% endfor %}
    </table>
</body>
</html>
```

**Install**: `pip install weasyprint` (requires system deps: `apt install libpango-1.0-0 libcairo2`)

---

## Pattern 31.3: Complex Reports — ReportLab

```python
import io
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet


def generate_complex_report(data: list[dict]) -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph("Sales Report", styles["Heading1"]))

    table_data = [["Product", "Sales", "Revenue"]]
    for row in data:
        table_data.append([row["product"], str(row["sales"]), f"${row['revenue']:.2f}"])

    table = Table(table_data)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4472C4")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 1, colors.grey),
        ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
    ]))
    elements.append(table)

    doc.build(elements)
    buffer.seek(0)
    return buffer
```

**Install**: `pip install reportlab`

---

## Pattern 31.4: PDF Text Extraction — pypdf

```python
from pypdf import PdfReader


def extract_text(file_path: str) -> str:
    """Fast text extraction — 0.024s for typical documents."""
    reader = PdfReader(file_path)
    text_parts = []
    for page in reader.pages:
        text_parts.append(page.extract_text())
    return "\n".join(text_parts)
```

**Install**: `pip install pypdf`

---

## Pattern 31.5: PDF Table Extraction — pdfplumber

```python
import pdfplumber


def extract_tables(file_path: str) -> list[list[list[str]]]:
    """Extract structured tables from PDF — 0.10s per page."""
    tables = []
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_tables = page.extract_tables()
            tables.extend(page_tables)
    return tables
```

**Install**: `pip install pdfplumber`

---

## Pattern 31.6: Scanned PDF OCR

```python
from pdf2image import convert_from_path
import pytesseract


def ocr_scanned_pdf(file_path: str, language: str = "eng") -> str:
    """OCR for scanned PDFs — requires Tesseract system package."""
    images = convert_from_path(file_path, dpi=300)
    text_parts = []
    for image in images:
        text = pytesseract.image_to_string(image, lang=language)
        text_parts.append(text)
    return "\n".join(text_parts)
```

**Install**: `pip install pdf2image pytesseract` + `apt install tesseract-ocr poppler-utils`

---

## MUST DO

- Use fpdf2 for simple docs (fastest, no system deps)
- Use WeasyPrint for web-styled reports (reuse CSS skills)
- Use `read_only` or streaming for large PDFs
- Return `StreamingResponse` with correct MIME type and Content-Disposition
- Run OCR in background tasks (slow, CPU-bound)

## MUST NOT DO

- Use ReportLab for simple documents (overkill)
- Load entire large PDF into memory for extraction
- Run OCR synchronously in request handlers (blocks event loop)
- Use `fpdf` (legacy) instead of `fpdf2` (actively maintained fork)

---

## References

- [fpdf2 Documentation](https://py-pdf.github.io/fpdf2/)
- [WeasyPrint Documentation](https://doc.courtbouillon.org/weasyprint/)
- [pypdf Documentation](https://pypdf.readthedocs.io/)
- [pdfplumber GitHub](https://github.com/jsvine/pdfplumber)
