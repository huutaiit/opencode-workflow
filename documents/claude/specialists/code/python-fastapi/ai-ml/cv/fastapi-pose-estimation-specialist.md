# FastAPI Pose Estimation Specialist
# FastAPIポーズ推定スペシャリスト
# Chuyen Gia Uoc Luong Tu The FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Directory Pattern** | `src/cv/`, `src/pose/` |
| **Variant** | ALL |
| **Naming Convention** | `pose_service.py`, `face_service.py`, `hand_service.py` |
| **Imports From** | Infrastructure (storage), Domain (schemas) |
| **Cannot Import** | Presentation |
| **Dependencies** | `mediapipe>=0.10`, `opencv-python-headless` |
| **When To Use** | Face detection, hand tracking, pose estimation |
| **Source Skeleton** | `src/cv/pose_service.py`, `src/cv/router.py` |
| **Pattern Numbers** | 55.1–55.5 |
| **Source Paths** | `**/cv/**/*.py`, `**/pose/**/*.py` |
| **File Count** | 1-2 per CV feature |
| **Imported By** | Presentation (routes) |
| **Specialist Type** | code |
| **Purpose** | MediaPipe Hands/Pose/FaceMesh, image processing pipeline, face detection (MTCNN), hand proximity detection, real-time WebSocket video processing |
| **Activation Trigger** | pose, mediapipe, posenet, skeleton, landmark, face detection, hand tracking |

---

## Purpose

Define pose estimation and body/face/hand detection patterns for FastAPI: MediaPipe solution setup, image upload processing pipeline, face detection with MTCNN, hand-face proximity detection, and real-time WebSocket video processing.

---

## Pattern 55.1: MediaPipe Setup

```python
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

import mediapipe as mp
from fastapi import FastAPI


solutions: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Initialize MediaPipe solutions at startup."""
    # Pose estimation (33 body landmarks)
    solutions["pose"] = mp.solutions.pose.Pose(
        static_image_mode=False,
        model_complexity=1,        # 0=lite, 1=full, 2=heavy
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    # Hand tracking (21 landmarks per hand)
    solutions["hands"] = mp.solutions.hands.Hands(
        static_image_mode=False,
        max_num_hands=2,
        min_detection_confidence=0.5,
    )

    # Face mesh (468 landmarks)
    solutions["face_mesh"] = mp.solutions.face_mesh.FaceMesh(
        static_image_mode=False,
        max_num_faces=1,
        min_detection_confidence=0.5,
    )

    solutions["drawing"] = mp.solutions.drawing_utils

    yield
    for sol in ["pose", "hands", "face_mesh"]:
        solutions[sol].close()


app = FastAPI(lifespan=lifespan)
```

**MediaPipe solutions overview**:

| Solution | Landmarks | Use Case |
|----------|-----------|----------|
| Pose | 33 body points | Fitness, gesture, posture |
| Hands | 21 per hand | Sign language, gesture control |
| FaceMesh | 468 points | AR filters, expression tracking |
| Holistic | All combined | Full body + face + hands |

---

## Pattern 55.2: Image Processing Pipeline

```python
from io import BytesIO

import cv2
import numpy as np
from fastapi import APIRouter, UploadFile, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/pose", tags=["pose"])


class Landmark(BaseModel):
    x: float
    y: float
    z: float
    visibility: float


class PoseResponse(BaseModel):
    landmarks: list[Landmark]
    landmark_count: int


async def image_to_numpy(file: UploadFile) -> np.ndarray:
    """Convert UploadFile to numpy array (RGB)."""
    data = await file.read()
    nparr = np.frombuffer(data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(400, "Invalid image")
    # MediaPipe expects RGB (OpenCV reads BGR)
    return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)


@router.post("/detect", response_model=PoseResponse)
async def detect_pose(file: UploadFile):
    """Detect body pose landmarks from uploaded image."""
    img_rgb = await image_to_numpy(file)

    result = solutions["pose"].process(img_rgb)

    if not result.pose_landmarks:
        return PoseResponse(landmarks=[], landmark_count=0)

    landmarks = [
        Landmark(
            x=lm.x,
            y=lm.y,
            z=lm.z,
            visibility=lm.visibility,
        )
        for lm in result.pose_landmarks.landmark
    ]

    return PoseResponse(landmarks=landmarks, landmark_count=len(landmarks))


@router.post("/detect/image")
async def detect_pose_annotated(file: UploadFile):
    """Return annotated image with pose skeleton."""
    img_rgb = await image_to_numpy(file)
    result = solutions["pose"].process(img_rgb)

    # Draw landmarks on image
    img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
    if result.pose_landmarks:
        solutions["drawing"].draw_landmarks(
            img_bgr,
            result.pose_landmarks,
            mp.solutions.pose.POSE_CONNECTIONS,
        )

    _, buffer = cv2.imencode(".jpg", img_bgr)
    return StreamingResponse(BytesIO(buffer.tobytes()), media_type="image/jpeg")
```

**Key rules**:
- Convert BGR (OpenCV) to RGB (MediaPipe) before processing
- Use `static_image_mode=True` for single images, `False` for video
- Always check if landmarks are detected (can be `None`)

---

## Pattern 55.3: Face Detection (MTCNN)

```python
# pip install mtcnn tensorflow
from mtcnn import MTCNN
import cv2
import numpy as np
from pydantic import BaseModel


class FaceDetection(BaseModel):
    bbox: list[int]  # [x, y, width, height]
    confidence: float
    keypoints: dict[str, list[int]]  # left_eye, right_eye, nose, mouth_left, mouth_right


# Initialize once
face_detector = MTCNN()


@router.post("/face/detect")
async def detect_faces(file: UploadFile) -> list[FaceDetection]:
    """Detect faces with MTCNN (more accurate than Haar cascades)."""
    img_rgb = await image_to_numpy(file)
    faces = face_detector.detect_faces(img_rgb)

    return [
        FaceDetection(
            bbox=face["box"],
            confidence=face["confidence"],
            keypoints={
                k: list(v) for k, v in face["keypoints"].items()
            },
        )
        for face in faces
        if face["confidence"] > 0.9
    ]
```

**Face detection comparison**:

| Method | Speed | Accuracy | Best For |
|--------|-------|----------|----------|
| Haar Cascade | Very Fast | Low | Real-time, resource-constrained |
| MTCNN | Medium | High | Accuracy-first applications |
| MediaPipe FaceDetection | Fast | Good | Mobile, web |
| RetinaFace | Slow | Very High | Research, security |

---

## Pattern 55.4: Hand Proximity Detection

```python
import math


class ProximityResult(BaseModel):
    hand_detected: bool
    face_detected: bool
    distance: float | None  # Normalized distance
    is_touching: bool


def calculate_hand_face_distance(
    hand_landmarks,
    face_bbox: list[int],  # [x, y, w, h]
    image_shape: tuple[int, int],
) -> float:
    """Calculate minimum distance from hand to face bounding box."""
    h, w = image_shape

    # Get hand centroid (wrist = landmark 0)
    wrist = hand_landmarks.landmark[0]
    hand_x = wrist.x * w
    hand_y = wrist.y * h

    # Face center
    fx, fy, fw, fh = face_bbox
    face_cx = fx + fw / 2
    face_cy = fy + fh / 2

    # Normalized distance
    distance = math.sqrt((hand_x - face_cx) ** 2 + (hand_y - face_cy) ** 2)
    max_dist = math.sqrt(w ** 2 + h ** 2)

    return distance / max_dist


@router.post("/proximity")
async def check_hand_face_proximity(
    file: UploadFile,
    threshold: float = 0.15,
) -> ProximityResult:
    """Check if hand is near face (e.g., face touching detection)."""
    img_rgb = await image_to_numpy(file)
    h, w = img_rgb.shape[:2]

    # Detect hands
    hand_result = solutions["hands"].process(img_rgb)

    # Detect faces
    faces = face_detector.detect_faces(img_rgb)

    if not hand_result.multi_hand_landmarks or not faces:
        return ProximityResult(
            hand_detected=bool(hand_result.multi_hand_landmarks),
            face_detected=bool(faces),
            distance=None,
            is_touching=False,
        )

    # Calculate distance for first hand and first face
    distance = calculate_hand_face_distance(
        hand_result.multi_hand_landmarks[0],
        faces[0]["box"],
        (h, w),
    )

    return ProximityResult(
        hand_detected=True,
        face_detected=True,
        distance=round(distance, 4),
        is_touching=distance < threshold,
    )
```

---

## Pattern 55.5: Real-Time Video (WebSocket)

```python
import asyncio
import base64
import json

from fastapi import WebSocket, WebSocketDisconnect


@app.websocket("/ws/pose")
async def pose_websocket(ws: WebSocket):
    """Real-time pose detection via WebSocket.

    Client sends: base64-encoded JPEG frames
    Server sends: JSON with landmarks
    """
    await ws.accept()

    try:
        async for message in ws.iter_text():
            data = json.loads(message)

            # Decode base64 image
            img_bytes = base64.b64decode(data["frame"])
            nparr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

            # Process with MediaPipe
            result = solutions["pose"].process(img_rgb)

            if result.pose_landmarks:
                landmarks = [
                    {"x": lm.x, "y": lm.y, "z": lm.z, "v": lm.visibility}
                    for lm in result.pose_landmarks.landmark
                ]
                await ws.send_json({"landmarks": landmarks})
            else:
                await ws.send_json({"landmarks": []})

    except WebSocketDisconnect:
        pass
```

**Client (JavaScript)**:
```javascript
const ws = new WebSocket("ws://localhost:8000/ws/pose");
const video = document.getElementById("video");
const canvas = document.createElement("canvas");

setInterval(() => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(",")[1];
            ws.send(JSON.stringify({frame: base64}));
        };
        reader.readAsDataURL(blob);
    }, "image/jpeg", 0.7);
}, 100); // 10 FPS
```

**Key rules**:
- Use `static_image_mode=False` for video (enables tracking between frames)
- Limit FPS on client side (10-15 FPS sufficient for most use cases)
- Use JPEG quality 0.7 for smaller frame payloads

---

## MUST DO

- Initialize MediaPipe solutions at startup (lifespan)
- Convert BGR to RGB before MediaPipe processing
- Check if landmarks are detected before accessing
- Close MediaPipe solutions on shutdown
- Use `static_image_mode=False` for video streams
- Limit concurrent inference for GPU-bound processing

## MUST NOT DO

- Create MediaPipe solutions per request
- Forget BGR→RGB conversion (wrong results, no error)
- Access landmarks without null check
- Process every frame in high-FPS video (skip frames)
- Send raw numpy arrays over WebSocket (use base64 JPEG)
- Use FaceMesh for simple face detection (overkill — use FaceDetection)

---

## References

- [MediaPipe Solutions](https://developers.google.com/mediapipe/solutions)
- [MediaPipe Python API](https://google.github.io/mediapipe/)
- [MTCNN Face Detection](https://github.com/ipazc/mtcnn)
- [OpenCV Python](https://docs.opencv.org/4.x/d6/d00/tutorial_py_root.html)
