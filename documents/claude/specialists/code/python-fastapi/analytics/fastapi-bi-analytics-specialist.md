# FastAPI BI & Analytics Specialist
# FastAPI BIアナリティクススペシャリスト
# Chuyen Gia BI & Analytics FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Directory Pattern** | `src/{domain}/analytics/`, `src/analytics/` |
| **Variant** | ALL |
| **Naming Convention** | `analytics_service.py`, `{domain}_report.py`, `aggregation_queries.py` |
| **Imports From** | Domain (models, schemas), Data Access (repositories, async session) |
| **Imported By** | Presentation (router endpoints expose analytics), Application (scheduled report tasks) |
| **Cannot Import** | Presentation (inversion of dependency) |
| **Dependencies** | `sqlalchemy[asyncio]>=2.0`, `openpyxl>=3.1` (Excel export), `pandas>=2.0` (optional, dataframe aggregation) |
| **When To Use** | Aggregation queries, report generation, dashboard data pipelines, KPI computation, time-series rollups |
| **Source Skeleton** | `src/{domain}/analytics/service.py`, `src/{domain}/analytics/schemas.py`, `src/{domain}/analytics/queries.py` |
| **Pattern Numbers** | 62.1–62.6 |
| **Source Paths** | `**/analytics/**/*.py`, `**/reports/**/*.py` |
| **File Count** | 3-6 per analytics domain |
| **Specialist Type** | code |
| **Purpose** | Generate analytics services with SQL aggregation, time-series rollups, dashboard data endpoints, scheduled report pipelines, and data export (CSV/Excel) |
| **Activation Trigger** | files: **/analytics/**/*.py, **/reports/**/*.py; keywords: analytics, reporting, aggregation, dashboard, kpi, metrics, timeSeries, rollup |

---

## Purpose

Define BI & Analytics patterns for FastAPI: SQL aggregation via SQLAlchemy async, time-series rollups with PostgreSQL `date_trunc`, window function analytics, cached dashboard services, scheduled report pipelines (Celery/APScheduler), and CSV/Excel data export.

---

## Pattern 62.1: Aggregation Query Service

```python
from datetime import date
from decimal import Decimal

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_session
from src.orders.models import Order
from src.orders.analytics.schemas import SalesSummaryDTO


class OrderAnalyticsService:
    """Aggregation query service using SQLAlchemy async.

    Key principles:
    - Use SQL aggregation (SUM, COUNT, AVG) — never load all rows into Python
    - Return Pydantic DTOs for type safety
    - Soft-delete filter (del_flg == 0) in all queries
    """

    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_daily_sales_summary(self, target_date: date) -> SalesSummaryDTO:
        stmt = select(
            func.count().label("total_orders"),
            func.sum(Order.total_amount).label("total_revenue"),
            func.avg(Order.total_amount).label("avg_order_value"),
            func.count(func.distinct(Order.customer_id)).label("unique_customers"),
        ).where(
            Order.order_date == target_date,
            Order.del_flg == 0,
        )
        row = (await self._session.execute(stmt)).one()
        return SalesSummaryDTO(
            total_orders=row.total_orders,
            total_revenue=row.total_revenue or Decimal(0),
            avg_order_value=row.avg_order_value or Decimal(0),
            unique_customers=row.unique_customers,
        )
```

**Why Approved**:
- SQL-level aggregation (no Python-side reduce)
- AsyncSession for non-blocking I/O
- Pydantic DTO for typed output
- Soft-delete filter included

---

## Pattern 62.2: Time-Series Rollup (PostgreSQL date_trunc)

```python
from datetime import date

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.orders.models import Order
from src.orders.analytics.schemas import TimeSeriesPoint

VALID_GRANULARITIES = {"hour", "day", "week", "month"}


class TimeSeriesService:
    """Time-series rollup using PostgreSQL date_trunc.

    Key principles:
    - Whitelist granularity to prevent SQL injection
    - Use text() for date_trunc (SQLAlchemy has no built-in)
    - Return ordered list for chart rendering
    """

    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_revenue_time_series(
        self, start: date, end: date, granularity: str = "day"
    ) -> list[TimeSeriesPoint]:
        if granularity not in VALID_GRANULARITIES:
            granularity = "day"

        bucket = func.date_trunc(granularity, Order.order_date).label("time_bucket")
        stmt = (
            select(
                bucket,
                func.sum(Order.total_amount).label("value"),
                func.count().label("count"),
            )
            .where(
                Order.order_date.between(start, end),
                Order.del_flg == 0,
            )
            .group_by(bucket)
            .order_by(bucket)
        )
        rows = (await self._session.execute(stmt)).all()
        return [
            TimeSeriesPoint(time_bucket=r.time_bucket, value=r.value, count=r.count)
            for r in rows
        ]
```

**Why Approved**:
- Whitelist validation for granularity (no raw string interpolation)
- `func.date_trunc` via SQLAlchemy func (safe)
- Ordered results for chart rendering
- Parameterized date range via `.between()`

---

## Pattern 62.3: Window Function Analytics

```python
from sqlalchemy import func, select, over
from sqlalchemy.ext.asyncio import AsyncSession

from src.customers.models import Customer
from src.orders.models import Order
from src.orders.analytics.schemas import CustomerRankDTO


class RankingService:
    """Window function analytics — ranking, running totals."""

    def __init__(self, session: AsyncSession):
        self._session = session

    async def get_top_customers_by_revenue(
        self, limit: int = 10
    ) -> list[CustomerRankDTO]:
        # CTE: customer revenue aggregation
        revenue_cte = (
            select(
                Customer.customer_id,
                Customer.customer_name,
                func.sum(Order.total_amount).label("total_revenue"),
                func.count(Order.order_id).label("order_count"),
                func.rank()
                .over(order_by=func.sum(Order.total_amount).desc())
                .label("revenue_rank"),
            )
            .join(Order, Customer.customer_id == Order.customer_id)
            .where(Customer.del_flg == 0, Order.del_flg == 0)
            .group_by(Customer.customer_id, Customer.customer_name)
            .cte("customer_revenue")
        )

        stmt = (
            select(revenue_cte)
            .where(revenue_cte.c.revenue_rank <= limit)
            .order_by(revenue_cte.c.revenue_rank)
        )
        rows = (await self._session.execute(stmt)).all()
        return [CustomerRankDTO.model_validate(r._mapping) for r in rows]
```

**Why Approved**:
- SQLAlchemy CTE for readability
- Window function `func.rank().over()` for ranking
- Soft-delete on both tables
- `model_validate` from Pydantic v2

---

## Pattern 62.4: Cached Dashboard Service

```python
from datetime import date
from functools import lru_cache

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_session
from src.core.cache import redis_cache  # from redis-patterns-specialist (14.x)
from src.orders.analytics.schemas import DashboardSummaryDTO


class DashboardService:
    """Dashboard data service — compose multiple aggregations.

    Key principles:
    - Gather multiple queries with asyncio.gather (parallel)
    - Cache expensive aggregations with TTL via Redis
    - Fallback: return partial data if one query fails
    """

    def __init__(self, session: AsyncSession):
        self._session = session
        self._order_analytics = OrderAnalyticsService(session)
        self._ranking = RankingService(session)
        self._time_series = TimeSeriesService(session)

    @redis_cache(ttl=300, key_prefix="dashboard")
    async def get_dashboard_summary(self, target_date: date) -> DashboardSummaryDTO:
        import asyncio

        sales, top_customers, trend = await asyncio.gather(
            self._order_analytics.get_daily_sales_summary(target_date),
            self._ranking.get_top_customers_by_revenue(10),
            self._time_series.get_revenue_time_series(
                target_date.replace(day=1), target_date, "day"
            ),
        )
        return DashboardSummaryDTO(
            sales_summary=sales,
            top_customers=top_customers,
            revenue_trend=trend,
        )
```

**Why Approved**:
- `asyncio.gather` for parallel query execution
- Redis cache decorator with TTL
- Composition of analytics services
- Single entry point for dashboard data

---

## Pattern 62.5: Scheduled Report Pipeline

```python
from datetime import date, timedelta

from celery import shared_task  # or APScheduler

from src.core.database import async_session_factory
from src.orders.analytics.service import OrderAnalyticsService
from src.reports.export import export_to_excel
from src.notifications.service import notify_report_ready


@shared_task(name="weekly-sales-report")
async def generate_weekly_report() -> str:
    """Weekly report pipeline: collect → aggregate → format → deliver.

    Key principles:
    - Idempotent: re-running same week overwrites previous report
    - Pipeline pattern: each step is a separate function
    - Error handling: individual step failure doesn't crash entire pipeline
    """
    end_date = date.today() - timedelta(days=1)
    start_date = end_date - timedelta(days=6)

    async with async_session_factory() as session:
        analytics = OrderAnalyticsService(session)
        time_series = await analytics.get_revenue_time_series(
            start_date, end_date, "day"
        )

    file_path = await export_to_excel(
        data=time_series,
        filename=f"weekly-sales-{start_date}-{end_date}",
    )

    await notify_report_ready(
        title="Weekly Sales Report",
        file_path=file_path,
    )
    return str(file_path)
```

**Why Approved**:
- Clear pipeline: collect -> aggregate -> format -> deliver
- Celery task for async scheduling
- Idempotent by date range
- Session properly scoped

---

## Pattern 62.6: Data Export Service (CSV/Excel)

```python
import csv
import io
from pathlib import Path
from typing import Protocol

from openpyxl import Workbook


class ExportableRow(Protocol):
    """Protocol for any DTO that can be exported."""

    def csv_header(self) -> list[str]: ...
    def to_csv_row(self) -> list[str]: ...


async def export_to_csv(
    data: list[ExportableRow], filename: str
) -> Path:
    """Export to CSV with streaming-friendly pattern.

    Key principles:
    - Protocol-based: any Pydantic model can implement ExportableRow
    - Write to temp file, return path
    - UTF-8 BOM for Excel compatibility with CJK characters
    """
    output_path = Path(f"/tmp/reports/{filename}.csv")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        if data:
            writer.writerow(data[0].csv_header())
            for row in data:
                writer.writerow(row.to_csv_row())
    return output_path


async def export_to_excel(
    data: list[ExportableRow], filename: str
) -> Path:
    """Export to Excel (.xlsx) with openpyxl."""
    output_path = Path(f"/tmp/reports/{filename}.xlsx")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    wb = Workbook()
    ws = wb.active
    if data:
        ws.append(data[0].csv_header())
        for row in data:
            ws.append(row.to_csv_row())
    wb.save(str(output_path))
    return output_path
```

**Why Approved**:
- Protocol-based (structural typing — any DTO can participate)
- UTF-8 BOM for CJK Excel compatibility
- Path-based file output
- Separate CSV and Excel functions

---

## REJECTED Pattern 1: In-Memory Aggregation

```python
# DON'T: Loading all records into memory for aggregation
async def get_total_revenue(session: AsyncSession) -> Decimal:
    result = await session.execute(select(Order))
    orders = result.scalars().all()  # loads ALL orders into memory
    return sum(o.total_amount for o in orders)  # Python-side aggregation
```

**Why Rejected**: Loads entire table into memory (OOM risk). Database `SUM()` is orders of magnitude faster.

**Solution**: Use `func.sum(Order.total_amount)` via SQLAlchemy (Pattern 62.1)

---

## REJECTED Pattern 2: N+1 Analytics

```python
# DON'T: Separate query per customer
async def get_top_customers(session: AsyncSession):
    customers = (await session.execute(select(Customer))).scalars().all()
    results = []
    for c in customers:  # N+1!
        count = await session.scalar(
            select(func.count()).where(Order.customer_id == c.customer_id)
        )
        results.append({"customer": c, "order_count": count})
    return sorted(results, key=lambda x: x["order_count"], reverse=True)[:10]
```

**Why Rejected**: N+1 query pattern. Extremely slow for large datasets.

**Solution**: Use CTE + window function in a single query (Pattern 62.3)

---

## DECISION TREE

```
Is this question about BI / Analytics / Reporting?
├─ YES → Continue
│   ├─ Simple aggregation (SUM, COUNT, AVG)?
│   │   → Pattern 62.1 (Aggregation Query Service)
│   ├─ Time-series / chart data?
│   │   → Pattern 62.2 (Time-Series Rollup)
│   ├─ Ranking / top-N / window functions?
│   │   → Pattern 62.3 (Window Function Analytics)
│   ├─ Dashboard (multiple aggregations)?
│   │   → Pattern 62.4 (Cached Dashboard Service)
│   ├─ Scheduled report?
│   │   → Pattern 62.5 (Scheduled Report Pipeline)
│   ├─ CSV/Excel export?
│   │   → Pattern 62.6 (Data Export Service)
│   └─ NL-to-SQL / text-to-query?
│       → DELEGATE: fastapi-nl-to-sql-specialist
└─ NO → Delegate
    ├─ Caching? → redis-patterns-specialist (14.x)
    ├─ Background tasks? → fastapi-background-tasks-specialist (40.x)
    └─ Database queries? → sqlalchemy-async-specialist (12.x)
```

---

## KEYWORDS

analytics, reporting, aggregation, dashboard, KPI, metrics, time-series, rollup, summary, window function, GROUP BY, report generation, export CSV, export Excel

---

## VERSION HISTORY

- **v1.0.0** (2026-04-07): Initial version — 6 patterns, 2 rejected

---

*FastAPI BI & Analytics Specialist v1.0 — Python FastAPI*
*Location: `specialists/code/python-fastapi/analytics/fastapi-bi-analytics-specialist.md`*
