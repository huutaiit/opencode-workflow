# FastAPI YOLO Object Detection Specialist
# FastAPI YOLOオブジェクト検出スペシャリス��
# Chuyen Gia YOLO FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Directory Pattern** | `src/cv/`, `src/detection/` |
| **Variant** | ALL |
| **Naming Convention** | `detector.py`, `yolo_service.py` |
| **Imports From** | Infrastructure (storage), Domain (schemas) |
| **Cannot Import** | Presentation |
| **Dependencies** | `ultralytics>=8.0`, `opencv-python-headless` |
| **When To Use** | Object detection, annotated images, video streaming detection |
| **Source Skeleton** | `src/cv/yolo_service.py`, `src/cv/router.py` |
| **Pattern Numbers** | 54.1–54.6 |
| **Source Paths** | `**/cv/**/*.py`, `**/detection/**/*.py` |
| **File Count** | 1-2 per CV feature |
| **Imported By** | Presentation (routes) |
| **Specialist Type** | code |
| **Purpose** | Ultralytics YOLO v8/v11/v12 object detection, model loading at startup, JSON/image detection endpoints, video streaming, GPU memory management, Docker deployment |
| **Activation Trigger** | yolo, ultralytics, object detection, detect, video, computer vision |

---

## Purpose

Define YOLO object detection patterns for FastAPI: model loading at startup via lifespan, JSON detection endpoint, annotated image response, video frame streaming with OpenCV, GPU memory management for concurrent requests, and Docker deployment with NVIDIA CUDA.

---

## Pattern 54.1: Model Loading at Startup

```python
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from ultralytics import YOLO


models: dict[str, YOLO] = {}


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Load YOLO model ONCE at startup — NEVER per-request."""
    models["detect"] = YOLO("yolov8n.pt")       # Nano (fastest, 3.2M params)
    models["segment"] = YOLO("yolov8n-seg.pt")  # Segmentation
    # models["pose"] = YOLO("yolov8n-pose.pt")  # Pose estimation
    yield
    models.clear()


app = FastAPI(lifespan=lifespan)
```

**Model size guide**:

| Model | Params | Speed (ms) | mAP | Use Case |
|-------|--------|-----------|-----|----------|
| yolov8n | 3.2M | 1.2 | 37.3 | Edge, mobile, high throughput |
| yolov8s | 11.2M | 2.1 | 44.9 | Balanced |
| yolov8m | 25.9M | 5.5 | 50.2 | General purpose |
| yolov8l | 43.7M | 8.5 | 52.9 | High accuracy |
| yolov8x | 68.2M | 12.8 | 53.9 | Maximum accuracy |

**Key rule**: Load model at startup. Loading per-request takes 200-500ms and wastes memory.

---

## Pattern 54.2: JSON Detection Endpoint

```python
from io import BytesIO

from fastapi import APIRouter, UploadFile, HTTPException
from PIL import Image
from pydantic import BaseModel

router = APIRouter(prefix="/detect", tags=["detection"])


class Detection(BaseModel):
    class_name: str
    confidence: float
    bbox: list[float]  # [x1, y1, x2, y2]


class DetectionResponse(BaseModel):
    detections: list[Detection]
    count: int
    inference_ms: float


@router.post("/json", response_model=DetectionResponse)
async def detect_json(
    file: UploadFile,
    confidence: float = 0.5,
):
    """Detect objects, return JSON results."""
    if file.content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(400, "Unsupported image type")

    data = await file.read()
    img = Image.open(BytesIO(data))

    # Run inference
    results = models["detect"](img, conf=confidence, verbose=False)
    result = results[0]

    detections = []
    for box in result.boxes:
        detections.append(Detection(
            class_name=result.names[int(box.cls[0])],
            confidence=float(box.conf[0]),
            bbox=box.xyxy[0].tolist(),
        ))

    return DetectionResponse(
        detections=detections,
        count=len(detections),
        inference_ms=result.speed["inference"],
    )
```

---

## Pattern 54.3: Annotated Image Endpoint

```python
from fastapi.responses import StreamingResponse


@router.post("/image")
async def detect_image(
    file: UploadFile,
    confidence: float = 0.5,
):
    """Detect objects, return annotated image."""
    data = await file.read()
    img = Image.open(BytesIO(data))

    results = models["detect"](img, conf=confidence, verbose=False)

    # results.plot() returns numpy array with bounding boxes drawn
    annotated = results[0].plot()

    # Convert numpy array to JPEG bytes
    annotated_img = Image.fromarray(annotated)
    buffer = BytesIO()
    annotated_img.save(buffer, format="JPEG", quality=90)
    buffer.seek(0)

    return StreamingResponse(buffer, media_type="image/jpeg")
```

---

## Pattern 54.4: Video Streaming

```python
import asyncio
from collections.abc import AsyncGenerator

import cv2
import numpy as np
from fastapi.responses import StreamingResponse


async def process_video_frames(
    video_path: str,
    confidence: float = 0.5,
) -> AsyncGenerator[bytes, None]:
    """Process video frame-by-frame, yield JPEG annotated frames."""
    cap = cv2.VideoCapture(video_path)

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            # Run detection on frame
            results = models["detect"](frame, conf=confidence, verbose=False)
            annotated = results[0].plot()

            # Encode as JPEG
            _, buffer = cv2.imencode(".jpg", annotated)
            frame_bytes = buffer.tobytes()

            # Yield as multipart frame
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n"
                + frame_bytes
                + b"\r\n"
            )

            # Yield control to event loop
            await asyncio.sleep(0)
    finally:
        cap.release()


@router.get("/video/stream")
async def stream_video(video_path: str, confidence: float = 0.5):
    """Stream annotated video as multipart JPEG."""
    return StreamingResponse(
        process_video_frames(video_path, confidence),
        media_type="multipart/x-mixed-replace; boundary=frame",
    )
```

**HTML client**:
```html
<img src="/detect/video/stream?video_path=test.mp4" />
```

---

## Pattern 54.5: GPU Memory Management

```python
import torch
import asyncio
from contextlib import asynccontextmanager


# Semaphore to limit concurrent GPU inference
gpu_semaphore = asyncio.Semaphore(4)  # Max 4 concurrent inferences


@asynccontextmanager
async def gpu_inference():
    """Limit concurrent GPU access to prevent OOM."""
    async with gpu_semaphore:
        yield


@router.post("/detect/safe")
async def detect_safe(file: UploadFile, confidence: float = 0.5):
    """Detection with GPU memory protection."""
    data = await file.read()
    img = Image.open(BytesIO(data))

    async with gpu_inference():
        results = models["detect"](img, conf=confidence, verbose=False)

    # Process results outside semaphore
    return format_results(results[0])


# Monitor GPU memory
def get_gpu_info() -> dict:
    if torch.cuda.is_available():
        return {
            "device": torch.cuda.get_device_name(0),
            "memory_allocated_mb": torch.cuda.memory_allocated(0) / 1024**2,
            "memory_reserved_mb": torch.cuda.memory_reserved(0) / 1024**2,
        }
    return {"device": "cpu"}
```

**Key rules**:
- Use semaphore to limit concurrent GPU inference
- Monitor `torch.cuda.memory_allocated()` to detect leaks
- Use `half=True` for FP16 inference (2x faster, half memory)

---

## Pattern 54.6: Docker Deployment

```dockerfile
# GPU Deployment
FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

RUN apt-get update && apt-get install -y python3.12 python3-pip libgl1 libglib2.0-0
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download model weights (cached in Docker layer)
RUN python3 -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"

COPY . .
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**CPU-only Deployment** (lighter):
```dockerfile
FROM python:3.12-slim

RUN apt-get update && apt-get install -y libgl1 libglib2.0-0
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"

COPY . .
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Docker Compose with GPU**:
```yaml
services:
  detection:
    build: .
    ports: ["8000:8000"]
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

**Key rules**:
- Pre-download model weights in Docker build (not at runtime)
- Use `nvidia/cuda` base image for GPU, `python:slim` for CPU
- Install `libgl1` and `libglib2.0-0` for OpenCV
- Set GPU reservations in Docker Compose deploy section

---

## MUST DO

- Load YOLO model ONCE at startup (lifespan), store in app state
- Use UploadFile for image uploads (streaming, not buffered)
- Limit concurrent GPU inference with semaphore
- Pre-download model weights in Docker build layer
- Set confidence threshold parameter on endpoints
- Use `verbose=False` in inference calls (suppresses console output)

## MUST NOT DO

- Load model per-request (200-500ms overhead + memory waste)
- Use `File` instead of `UploadFile` for large images
- Run unlimited concurrent GPU inference (OOM crash)
- Download model weights at container startup (slow, unreliable)
- Hardcode confidence threshold
- Process video frames synchronously without yielding to event loop

---

## References

- [Ultralytics YOLOv8 Docs](https://docs.ultralytics.com/)
- [Ultralytics Python API](https://docs.ultralytics.com/usage/python/)
- [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/)
