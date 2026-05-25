# Django Excel & PDF Specialist
# Django Excel・PDFスペシャリスト
# Chuyen Gia Excel va PDF Django

**Stack**: Python 3.12+ / Django 5.x | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Directory Pattern** | `apps/{domain}/views.py`, `apps/{domain}/services/export.py` |
| **Variant** | ALL |
| **Naming Convention** | Views with `export_` prefix, services in `export.py` |
| **Imports From** | csv, openpyxl, xlsxwriter, fpdf2, weasyprint |
| **Cannot Import** | — |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | csv-export, excel-export, excel-import, import-export-admin, pdf-fpdf2, pdf-weasyprint |
| **Pattern Numbers** | 32.1–32.6 |
| **Source Paths** | `**/views.py`, `**/admin.py` |
| **File Count** | Export views + admin integration |
| **Imported By** | — |
| **Specialist Type** | code |
| **Purpose** | CSV export (built-in), Excel export (xlsxwriter), Excel import (openpyxl), django-import-export admin integration, PDF generation (fpdf2), PDF from HTML (WeasyPrint) |
| **Activation Trigger** | excel, pdf, csv, openpyxl, xlsxwriter, fpdf2, weasyprint, export, import |

---

## Purpose

Define Django file export/import patterns: CSV export using built-in csv module, styled Excel export with xlsxwriter, Excel import with openpyxl validation, django-import-export admin integration for data management, PDF generation with fpdf2 for invoices/reports, and PDF from HTML templates with WeasyPrint.

---

## Pattern 32.1: CSV Export (Built-in)

```python
# apps/articles/views.py
import csv
from django.http import HttpResponse
from django.contrib.auth.decorators import permission_required


@permission_required("articles.view_article")
def export_articles_csv(request):
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="articles.csv"'

    writer = csv.writer(response)
    writer.writerow(["ID", "Title", "Author", "Status", "Created"])

    articles = Article.objects.select_related("author").order_by("-created_at")
    for article in articles.iterator():  # iterator() for memory efficiency
        writer.writerow([
            article.id,
            article.title,
            article.author.email,
            article.get_status_display(),
            article.created_at.strftime("%Y-%m-%d %H:%M"),
        ])

    return response
```

```python
# Streaming CSV for large datasets
from django.http import StreamingHttpResponse


def export_large_csv(request):
    def csv_generator():
        yield "ID,Title,Author,Status,Created\n"
        for article in Article.objects.select_related("author").iterator(chunk_size=1000):
            yield f"{article.id},{article.title},{article.author.email},{article.status},{article.created_at}\n"

    response = StreamingHttpResponse(csv_generator(), content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="articles_large.csv"'
    return response
```

---

## Pattern 32.2: Excel Export (xlsxwriter)

```python
# pip install xlsxwriter
from io import BytesIO
import xlsxwriter
from django.http import HttpResponse


def export_orders_excel(request):
    output = BytesIO()
    workbook = xlsxwriter.Workbook(output, {"in_memory": True})
    worksheet = workbook.add_worksheet("Orders")

    # Styles
    header_fmt = workbook.add_format({
        "bold": True,
        "bg_color": "#4472C4",
        "font_color": "white",
        "border": 1,
    })
    money_fmt = workbook.add_format({"num_format": "#,##0.00"})
    date_fmt = workbook.add_format({"num_format": "yyyy-mm-dd"})

    # Headers
    headers = ["Order ID", "Customer", "Total", "Status", "Date"]
    for col, header in enumerate(headers):
        worksheet.write(0, col, header, header_fmt)

    # Data
    orders = Order.objects.select_related("customer").order_by("-created_at")
    for row, order in enumerate(orders.iterator(), start=1):
        worksheet.write(row, 0, order.id)
        worksheet.write(row, 1, order.customer.email)
        worksheet.write(row, 2, float(order.total), money_fmt)
        worksheet.write(row, 3, order.get_status_display())
        worksheet.write(row, 4, order.created_at.replace(tzinfo=None), date_fmt)

    # Auto-fit columns
    worksheet.set_column("A:A", 12)
    worksheet.set_column("B:B", 30)
    worksheet.set_column("C:C", 15)
    worksheet.set_column("D:D", 15)
    worksheet.set_column("E:E", 15)

    workbook.close()
    output.seek(0)

    response = HttpResponse(
        output.read(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = 'attachment; filename="orders.xlsx"'
    return response
```

---

## Pattern 32.3: Excel Import (openpyxl)

```python
# pip install openpyxl
import openpyxl
from django.shortcuts import render, redirect
from django.contrib import messages


def import_products_excel(request):
    if request.method == "POST":
        file = request.FILES.get("file")
        if not file or not file.name.endswith((".xlsx", ".xls")):
            messages.error(request, "Please upload an Excel file (.xlsx).")
            return redirect("products:import")

        wb = openpyxl.load_workbook(file, read_only=True)
        ws = wb.active

        created = 0
        errors = []

        for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            name, sku, price, category_name = row[:4]

            if not name or not sku:
                errors.append(f"Row {row_num}: name and SKU are required.")
                continue

            try:
                category, _ = Category.objects.get_or_create(name=category_name)
                Product.objects.update_or_create(
                    sku=sku,
                    defaults={
                        "name": name,
                        "price": price or 0,
                        "category": category,
                    },
                )
                created += 1
            except Exception as e:
                errors.append(f"Row {row_num}: {e}")

        wb.close()

        if errors:
            messages.warning(request, f"Imported {created} products with {len(errors)} errors.")
        else:
            messages.success(request, f"Imported {created} products successfully.")

        return redirect("products:list")

    return render(request, "products/import.html")
```

---

## Pattern 32.4: django-import-export Admin Integration

```python
# pip install django-import-export
from import_export import resources, fields
from import_export.admin import ImportExportModelAdmin
from import_export.widgets import ForeignKeyWidget


class ProductResource(resources.ModelResource):
    category = fields.Field(
        column_name="category",
        attribute="category",
        widget=ForeignKeyWidget(Category, field="name"),
    )

    class Meta:
        model = Product
        fields = ["id", "name", "sku", "price", "category", "stock", "is_active"]
        import_id_fields = ["sku"]
        skip_unchanged = True
        report_skipped = True
        export_order = ["id", "name", "sku", "price", "category", "stock", "is_active"]


@admin.register(Product)
class ProductAdmin(ImportExportModelAdmin):
    resource_classes = [ProductResource]
    list_display = ["name", "sku", "price", "category", "stock"]
    list_filter = ["category", "is_active"]
    search_fields = ["name", "sku"]
```

---

## Pattern 32.5: PDF Generation (fpdf2)

```python
# pip install fpdf2
from fpdf import FPDF
from io import BytesIO
from django.http import HttpResponse


def generate_invoice_pdf(request, order_id):
    order = Order.objects.select_related("customer").prefetch_related("items__product").get(pk=order_id)

    pdf = FPDF()
    pdf.add_page()

    # Header
    pdf.set_font("Helvetica", "B", 20)
    pdf.cell(0, 10, f"Invoice #{order.id}", ln=True, align="C")
    pdf.ln(10)

    # Customer info
    pdf.set_font("Helvetica", "", 12)
    pdf.cell(0, 8, f"Customer: {order.customer.get_full_name()}", ln=True)
    pdf.cell(0, 8, f"Email: {order.customer.email}", ln=True)
    pdf.cell(0, 8, f"Date: {order.created_at.strftime('%Y-%m-%d')}", ln=True)
    pdf.ln(10)

    # Table header
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(80, 8, "Product", border=1)
    pdf.cell(30, 8, "Qty", border=1, align="C")
    pdf.cell(40, 8, "Price", border=1, align="R")
    pdf.cell(40, 8, "Subtotal", border=1, align="R")
    pdf.ln()

    # Table rows
    pdf.set_font("Helvetica", "", 10)
    for item in order.items.all():
        subtotal = item.quantity * item.unit_price
        pdf.cell(80, 8, item.product.name[:40], border=1)
        pdf.cell(30, 8, str(item.quantity), border=1, align="C")
        pdf.cell(40, 8, f"${item.unit_price:,.2f}", border=1, align="R")
        pdf.cell(40, 8, f"${subtotal:,.2f}", border=1, align="R")
        pdf.ln()

    # Total
    pdf.set_font("Helvetica", "B", 12)
    pdf.cell(150, 10, "Total:", align="R")
    pdf.cell(40, 10, f"${order.total:,.2f}", align="R")

    # Output
    output = BytesIO()
    pdf.output(output)
    output.seek(0)

    response = HttpResponse(output.read(), content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="invoice_{order.id}.pdf"'
    return response
```

---

## Pattern 32.6: PDF from HTML (WeasyPrint)

```bash
pip install weasyprint
```

```python
# apps/orders/views.py
from django.template.loader import render_to_string
from django.http import HttpResponse
from weasyprint import HTML


def export_order_pdf(request, order_id):
    order = Order.objects.select_related("customer").prefetch_related("items__product").get(pk=order_id)

    html_string = render_to_string("orders/invoice_pdf.html", {
        "order": order,
        "items": order.items.all(),
    })

    html = HTML(string=html_string, base_url=request.build_absolute_uri("/"))
    pdf = html.write_pdf()

    response = HttpResponse(pdf, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="order_{order.id}.pdf"'
    return response
```

```html
<!-- templates/orders/invoice_pdf.html -->
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: sans-serif; margin: 40px; }
        h1 { color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #4472C4; color: white; }
        .total { font-size: 1.2em; font-weight: bold; text-align: right; margin-top: 20px; }
    </style>
</head>
<body>
    <h1>Invoice #{{ order.id }}</h1>
    <p>Customer: {{ order.customer.get_full_name }}</p>
    <p>Date: {{ order.created_at|date:"Y-m-d" }}</p>

    <table>
        <thead>
            <tr><th>Product</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr>
        </thead>
        <tbody>
            {% for item in items %}
            <tr>
                <td>{{ item.product.name }}</td>
                <td>{{ item.quantity }}</td>
                <td>${{ item.unit_price|floatformat:2 }}</td>
                <td>${{ item.subtotal|floatformat:2 }}</td>
            </tr>
            {% endfor %}
        </tbody>
    </table>

    <p class="total">Total: ${{ order.total|floatformat:2 }}</p>
</body>
</html>
```

---

## MUST DO

- Use `StreamingHttpResponse` for large CSV exports
- Use `iterator()` with `chunk_size` for memory-efficient queries
- Validate imported data before saving (row-by-row with error collection)
- Use django-import-export for admin data management
- Generate PDFs asynchronously with Celery for large reports

## MUST NOT DO

- Load entire file into memory for large imports (use `read_only=True`)
- Skip validation on imported Excel/CSV data
- Generate complex PDFs synchronously on user request
- Hardcode styles in PDF generation (use CSS with WeasyPrint)
- Return raw file content without proper `Content-Disposition` header

---

## References

- [xlsxwriter](https://xlsxwriter.readthedocs.io/)
- [openpyxl](https://openpyxl.readthedocs.io/)
- [fpdf2](https://py-pdf.github.io/fpdf2/)
- [WeasyPrint](https://weasyprint.org/)
- [django-import-export](https://django-import-export.readthedocs.io/)
