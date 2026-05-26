# FastAPI Image Processing Specialist
# FastAPI画像処理スペシャリスト
# Chuyen Gia Xu Ly Hinh Anh FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Directory Pattern** | `src/{domain}/images/`, `src/core/image_utils.py` |
| **Variant** | ALL |
| **Naming Convention** | `image_utils.py`, `image_processor.py` |
| **Imports From** | Domain (schemas), Infrastructure (storage) |
| **Cannot Import** | Presentation |
| **Dependencies** | `Pillow>=10.0` |
| **When To Use** | Image upload processing, format conversion, EXIF stripping |
| **Source Skeleton** | `src/core/image_utils.py` |
| **Pattern Numbers** | 34.1–34.4 |
| **Source Paths** | `**/images/**/*.py`, `**/image_utils.py` |
| **File Count** | 1-2 per project |
| **Imported By** | Application (services), Presentation (routes) |
| **Specialist Type** | code |
| **Purpose** | Pillow image processing, thumbnail generation, WebP conversion, EXIF stripping, production upload pipeline |
| **Activation Trigger** | image, pillow, thumbnail, webp, resize, exif, photo |

---

## Purpose

Define image processing patterns for FastAPI: upload and process with Pillow, thumbnail generation, format conversion (WebP = 25-35% smaller), EXIF metadata stripping for privacy, and production architecture with async task pipelines.

---

## Pattern 34.1: Upload + Process (Pillow)

```python
from io import BytesIO

from fastapi import APIRouter, UploadFile, HTTPException, status
from PIL import Image

router = APIRouter(prefix="/images", tags=["images"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_DIMENSION = 4096


async def validate_image(file: UploadFile) -> Image.Image:
    """Validate and open uploaded image."""
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported type: {file.content_type}",
        )

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {MAX_FILE_SIZE // (1024*1024)}MB limit",
        )

    try:
        img = Image.open(BytesIO(data))
        img.verify()  # Check for corruption
        img = Image.open(BytesIO(data))  # Re-open after verify
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or corrupted image",
        )

    if max(img.size) > MAX_DIMENSION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image exceeds {MAX_DIMENSION}px max dimension",
        )

    return img


def generate_thumbnail(
    img: Image.Image,
    size: tuple[int, int] = (200, 200),
) -> bytes:
    """Generate thumbnail preserving aspect ratio."""
    thumb = img.copy()
    thumb.thumbnail(size, Image.Resampling.LANCZOS)

    buffer = BytesIO()
    thumb.save(buffer, format="WebP", quality=80)
    buffer.seek(0)
    return buffer.getvalue()


@router.post("/upload")
async def upload_image(file: UploadFile):
    img = await validate_image(file)

    # Strip EXIF before saving (privacy)
    clean_img = strip_exif(img)

    # Generate variants
    thumbnail = generate_thumbnail(clean_img, size=(200, 200))
    medium = generate_thumbnail(clean_img, size=(800, 800))

    # Save to storage (S3/local)
    # ...

    return {"thumbnail_size": len(thumbnail), "medium_size": len(medium)}
```

**Key rules**:
- Always call `verify()` then re-open — `verify()` consumes the stream
- Use `Image.Resampling.LANCZOS` for best quality downscaling
- Validate content type AND dimensions (prevent decompression bombs)

---

## Pattern 34.2: Format Conversion (WebP)

```python
def convert_to_webp(
    img: Image.Image,
    quality: int = 85,
    max_size: tuple[int, int] | None = None,
) -> bytes:
    """Convert image to WebP format (25-35% smaller than JPEG)."""
    if max_size:
        img = img.copy()
        img.thumbnail(max_size, Image.Resampling.LANCZOS)

    # Handle RGBA (PNG with transparency)
    if img.mode == "RGBA":
        buffer = BytesIO()
        img.save(buffer, format="WebP", quality=quality, lossless=False)
    else:
        # Convert to RGB for non-alpha images
        rgb_img = img.convert("RGB")
        buffer = BytesIO()
        rgb_img.save(buffer, format="WebP", quality=quality)

    buffer.seek(0)
    return buffer.getvalue()


def convert_to_jpeg(img: Image.Image, quality: int = 85) -> bytes:
    """Convert to JPEG (universal compatibility)."""
    rgb_img = img.convert("RGB")  # Strip alpha channel
    buffer = BytesIO()
    rgb_img.save(buffer, format="JPEG", quality=quality, optimize=True)
    buffer.seek(0)
    return buffer.getvalue()
```

**Format comparison**:

| Format | Size | Transparency | Animation | Browser Support |
|--------|------|-------------|-----------|----------------|
| JPEG | Baseline | No | No | Universal |
| WebP | 25-35% smaller | Yes | Yes | Modern browsers |
| PNG | Larger | Yes | No | Universal |
| AVIF | 50% smaller | Yes | Yes | Growing |

**Key rule**: Default to WebP for web. Serve JPEG fallback via `Accept` header check.

---

## Pattern 34.3: EXIF Stripping (Privacy)

```python
from PIL import Image
from PIL.ExifTags import Base as ExifBase


def strip_exif(img: Image.Image) -> Image.Image:
    """Remove all EXIF metadata (GPS, camera info, timestamps).

    Critical for privacy — user photos contain GPS coordinates,
    device info, and timestamps in EXIF data.
    """
    data = list(img.getdata())
    clean = Image.new(img.mode, img.size)
    clean.putdata(data)
    return clean


def strip_exif_keep_orientation(img: Image.Image) -> Image.Image:
    """Strip EXIF but apply orientation first (prevents rotated images)."""
    from PIL import ImageOps

    # Apply EXIF orientation tag before stripping
    img = ImageOps.exif_transpose(img)

    # Now strip all EXIF
    data = list(img.getdata())
    clean = Image.new(img.mode, img.size)
    clean.putdata(data)
    return clean


def extract_exif_safe(img: Image.Image) -> dict:
    """Extract safe EXIF fields (no GPS, no device IDs)."""
    exif = img.getexif()
    safe_tags = {
        ExifBase.ImageWidth,
        ExifBase.ImageLength,
        ExifBase.BitsPerSample,
        ExifBase.Orientation,
    }
    return {
        ExifBase(k).name: v
        for k, v in exif.items()
        if k in safe_tags
    }
```

**EXIF data that MUST be stripped**:
- GPS coordinates (latitude, longitude, altitude)
- Camera make/model/serial number
- Creation timestamps
- Software version
- Owner name

**Key rule**: Always strip EXIF before saving user-uploaded images. Apply orientation FIRST, then strip.

---

## Pattern 34.4: Production Architecture

```
Upload Flow:
  Client → POST /api/images/upload
         → Validate (type, size, dimension)
         → Strip EXIF
         → Save original to S3 (temp/)
         → Dispatch Celery task
         → Return {id, status: "processing"}

Celery Worker:
  → Download original from S3
  → Generate variants:
      - thumbnail: 200x200 WebP
      - small: 400x400 WebP
      - medium: 800x800 WebP
      - large: 1600x1600 WebP
  → Upload variants to S3 (images/{id}/)
  → Delete temp original
  → Update DB record (status: "ready", urls: {...})

Serving:
  → CDN (CloudFront/CloudFlare) fronts S3
  → Cache-Control: public, max-age=31536000, immutable
  → Content-Type: image/webp
```

```python
from celery import shared_task


@shared_task(bind=True, max_retries=3)
def process_image_variants(self, image_id: str, s3_key: str):
    """Generate all image variants in background."""
    from src.core.storage import download_file_sync, upload_file_sync

    try:
        data = download_file_sync(s3_key)
        img = Image.open(BytesIO(data))
        img = strip_exif_keep_orientation(img)

        variants = {
            "thumbnail": (200, 200),
            "small": (400, 400),
            "medium": (800, 800),
            "large": (1600, 1600),
        }

        urls = {}
        for name, size in variants.items():
            webp_data = convert_to_webp(img, max_size=size)
            variant_key = f"images/{image_id}/{name}.webp"
            upload_file_sync(variant_key, webp_data, "image/webp")
            urls[name] = variant_key

        # Update DB
        update_image_status(image_id, status="ready", urls=urls)

    except Exception as exc:
        self.retry(exc=exc, countdown=60 * self.request.retries)
```

**Key rules**:
- Never process variants synchronously in the request handler
- Use Celery (or ARQ) for image processing — can take 1-10s per image
- Store originals in temp/ prefix, delete after variants generated
- Set immutable cache headers — variant URLs are content-addressed

---

## MUST DO

- Validate image type, size, AND dimensions before processing
- Strip EXIF metadata from user-uploaded images (privacy)
- Apply EXIF orientation before stripping (prevents rotation bugs)
- Use WebP as default output format (25-35% smaller)
- Process image variants in background tasks (Celery/ARQ)
- Set CDN cache headers on served images

## MUST NOT DO

- Process images synchronously in request handlers
- Skip EXIF stripping on user uploads (privacy violation)
- Trust Content-Type header alone (use `Image.verify()`)
- Save uploaded images with original filenames (use UUID)
- Skip dimension validation (decompression bombs can OOM)
- Serve images directly from application server in production

---

## References

- [Pillow Documentation](https://pillow.readthedocs.io/)
- [WebP Compression Study](https://developers.google.com/speed/webp/docs/compression)
- [EXIF Privacy Risks](https://www.eff.org/deeplinks/2012/04/picture-worth-thousand-words-including-your-location)
