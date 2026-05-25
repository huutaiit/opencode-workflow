# FastAPI Cloud Storage Specialist
# FastAPIクラウドストレージスペシャリスト
# Chuyen Gia Luu Tru Dam May FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Directory Pattern** | `src/{domain}/storage/`, `src/core/storage.py` |
| **Variant** | ALL |
| **Naming Convention** | `storage.py`, `s3_client.py` |
| **Imports From** | Application (services), Domain (schemas) |
| **Cannot Import** | Presentation |
| **Dependencies** | `aioboto3`, `obstore` (optional multi-cloud) |
| **When To Use** | S3/MinIO async operations, presigned URLs, multi-cloud storage |
| **Source Skeleton** | `src/core/storage.py`, `src/{domain}/storage/` |
| **Pattern Numbers** | 33.1–33.5 |
| **Source Paths** | `**/storage/**/*.py`, `**/s3*.py` |
| **File Count** | 1-2 per project |
| **Imported By** | Application (services) |
| **Specialist Type** | code |
| **Purpose** | S3/MinIO async operations via aioboto3, presigned URLs, multi-cloud with obstore, IAM and encryption |
| **Activation Trigger** | s3, minio, boto3, aioboto3, presigned, cloud storage, obstore |

---

## Purpose

Define cloud object storage patterns for FastAPI: async S3 operations via aioboto3, presigned URLs for direct browser upload/download, MinIO S3-compatible local development, Rust-powered multi-cloud with obstore, and IAM least-privilege with server-side encryption.

---

## Pattern 33.1: aioboto3 Async Upload/Download

```python
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

import aioboto3
from botocore.config import Config

from src.core.config import settings


@asynccontextmanager
async def get_s3_client():
    """Yield async S3 client with connection pooling."""
    session = aioboto3.Session()
    async with session.client(
        "s3",
        region_name=settings.AWS_REGION,
        config=Config(
            max_pool_connections=20,
            retries={"max_attempts": 3, "mode": "adaptive"},
        ),
    ) as client:
        yield client


async def upload_file(
    key: str,
    data: bytes,
    content_type: str = "application/octet-stream",
    bucket: str | None = None,
) -> str:
    """Upload file to S3, return object key."""
    bucket = bucket or settings.S3_BUCKET
    async with get_s3_client() as s3:
        await s3.put_object(
            Bucket=bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )
    return key


async def download_file(key: str, bucket: str | None = None) -> bytes:
    """Download file from S3 as bytes."""
    bucket = bucket or settings.S3_BUCKET
    async with get_s3_client() as s3:
        response = await s3.get_object(Bucket=bucket, Key=key)
        return await response["Body"].read()


async def stream_download(key: str, bucket: str | None = None):
    """Stream large file download (constant memory)."""
    bucket = bucket or settings.S3_BUCKET
    async with get_s3_client() as s3:
        response = await s3.get_object(Bucket=bucket, Key=key)
        async for chunk in response["Body"].iter_chunks(chunk_size=64 * 1024):
            yield chunk
```

**Key rules**:
- Always use `aioboto3` (not `boto3`) in async FastAPI — blocking S3 calls freeze event loop
- Set `max_pool_connections` matching expected concurrency
- Use adaptive retry mode for transient failures

---

## Pattern 33.2: Presigned URLs (Upload + Download)

```python
from datetime import timedelta


async def generate_presigned_download(
    key: str,
    expires: timedelta = timedelta(minutes=10),
    bucket: str | None = None,
) -> str:
    """Generate presigned GET URL for browser download."""
    bucket = bucket or settings.S3_BUCKET
    async with get_s3_client() as s3:
        url = await s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=int(expires.total_seconds()),
        )
    return url


async def generate_presigned_upload(
    key: str,
    content_type: str,
    max_size: int = 10 * 1024 * 1024,  # 10MB
    expires: timedelta = timedelta(minutes=5),
    bucket: str | None = None,
) -> dict:
    """Generate presigned POST for direct browser upload."""
    bucket = bucket or settings.S3_BUCKET
    async with get_s3_client() as s3:
        presigned = await s3.generate_presigned_post(
            Bucket=bucket,
            Key=key,
            Fields={"Content-Type": content_type},
            Conditions=[
                {"Content-Type": content_type},
                ["content-length-range", 1, max_size],
            ],
            ExpiresIn=int(expires.total_seconds()),
        )
    return presigned  # {url, fields} — POST to url with fields as form data
```

**Frontend flow**:
1. `GET /api/uploads/presigned?filename=photo.jpg` → returns `{url, fields}`
2. Frontend POSTs directly to S3 with form data (bypasses your server)
3. Frontend calls `POST /api/files` with S3 key to register in DB

**Key rules**:
- Keep TTL short: 5-10 min for upload, 10-60 min for download
- Always set `content-length-range` condition to prevent abuse
- Presigned URLs are credential-free — safe to send to browser

---

## Pattern 33.3: MinIO (S3-Compatible Local Dev)

```python
from pydantic_settings import BaseSettings


class StorageSettings(BaseSettings):
    S3_BUCKET: str = "my-app"
    AWS_REGION: str = "us-east-1"

    # MinIO override for local development
    S3_ENDPOINT_URL: str | None = None  # Set to "http://localhost:9000" for MinIO
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""

    model_config = {"env_file": ".env"}


settings = StorageSettings()


@asynccontextmanager
async def get_s3_client():
    session = aioboto3.Session()
    kwargs = {
        "region_name": settings.AWS_REGION,
        "aws_access_key_id": settings.AWS_ACCESS_KEY_ID,
        "aws_secret_access_key": settings.AWS_SECRET_ACCESS_KEY,
    }
    # MinIO requires endpoint_url override
    if settings.S3_ENDPOINT_URL:
        kwargs["endpoint_url"] = settings.S3_ENDPOINT_URL

    async with session.client("s3", **kwargs) as client:
        yield client
```

**Docker Compose for MinIO**:
```yaml
services:
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"   # S3 API
      - "9001:9001"   # Web Console
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    volumes:
      - minio_data:/data
```

**Key rule**: Same aioboto3 code works for both AWS S3 and MinIO — only `endpoint_url` differs.

---

## Pattern 33.4: obstore Multi-Cloud (Rust-Powered)

```python
import obstore as obs
from obstore.store import S3Store, GCSStore, AzureStore


# S3
s3 = S3Store.from_env(bucket="my-bucket")

# GCS
gcs = GCSStore.from_env(bucket="my-bucket")

# Azure Blob Storage
azure = AzureStore.from_env(container="my-container")


async def upload_multicloud(store, path: str, data: bytes) -> None:
    """Upload to any cloud — same API."""
    await obs.put_async(store, path, data)


async def download_multicloud(store, path: str) -> bytes:
    """Download from any cloud — same API."""
    result = await obs.get_async(store, path)
    return await result.bytes_async()


async def list_objects(store, prefix: str = "") -> list[dict]:
    """List objects with prefix."""
    objects = await obs.list_async(store, prefix=prefix)
    return [{"path": obj.location, "size": obj.size} for obj in objects]
```

**When to use obstore vs aioboto3**:

| Factor | aioboto3 | obstore |
|--------|----------|---------|
| **S3 only** | Best choice | Overkill |
| **Multi-cloud** | Need 3 SDKs | Single API |
| **Performance** | Good | Better (Rust core) |
| **Dependencies** | Heavy (botocore) | Light (single binary) |
| **Presigned URLs** | Built-in | Not supported |
| **Maturity** | Battle-tested | Newer (Apache Arrow project) |

---

## Pattern 33.5: IAM Least Privilege + Server-Side Encryption

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::my-app-uploads/*"
        },
        {
            "Effect": "Allow",
            "Action": "s3:ListBucket",
            "Resource": "arn:aws:s3:::my-app-uploads",
            "Condition": {
                "StringLike": {
                    "s3:prefix": ["uploads/*"]
                }
            }
        }
    ]
}
```

**Server-Side Encryption** (SSE-S3 — simplest):
```python
await s3.put_object(
    Bucket=bucket,
    Key=key,
    Body=data,
    ServerSideEncryption="AES256",  # SSE-S3
)
```

**Bucket Default Encryption** (recommended — no code changes):
```python
await s3.put_bucket_encryption(
    Bucket=bucket,
    ServerSideEncryptionConfiguration={
        "Rules": [
            {"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}
        ]
    },
)
```

**Key rules**:
- Never use `s3:*` actions — list exact actions needed
- Scope Resource to specific bucket + prefix
- Enable default bucket encryption (SSE-S3 minimum, SSE-KMS for compliance)
- Block public access at bucket level unless explicitly needed

---

## MUST DO

- Use `aioboto3` for async S3 operations (never sync `boto3` in async routes)
- Set short TTL on presigned URLs (5-10 min upload, 10-60 min download)
- Use MinIO for local development (identical S3 API)
- Enable server-side encryption on all buckets
- Set `content-length-range` conditions on presigned uploads
- Use IAM policies scoped to specific bucket/prefix

## MUST NOT DO

- Call sync `boto3` in `async def` routes (blocks event loop)
- Generate long-lived presigned URLs (hours/days)
- Grant `s3:*` permissions
- Store AWS credentials in code (use env vars or IAM roles)
- Skip encryption for user-uploaded content
- Use public buckets without explicit business justification

---

## References

- [aioboto3 Documentation](https://aioboto3.readthedocs.io/)
- [AWS S3 Presigned URLs](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html)
- [MinIO Python Client](https://min.io/docs/minio/linux/developers/python/API.html)
- [obstore (Apache Arrow)](https://github.com/apache/arrow-rs/tree/main/object_store)
