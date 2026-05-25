# FastAPI ML Model Serving Specialist
# FastAPI ML モデルサービングスペシャリスト
# Chuyen Gia ML Serving FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Directory Pattern** | `src/ml/`, `src/inference/` |
| **Variant** | ALL |
| **Naming Convention** | `predictor.py`, `model_service.py`, `inference.py` |
| **Imports From** | Infrastructure (storage), Domain (schemas) |
| **Cannot Import** | Presentation |
| **Dependencies** | `scikit-learn`, `torch` (PyTorch), `onnxruntime` (ONNX) |
| **When To Use** | ML model serving, batch prediction, model versioning, A/B testing |
| **Source Skeleton** | `src/ml/model_service.py`, `src/ml/router.py`, `models/` (model artifacts) |
| **Pattern Numbers** | 60.1–60.8 |
| **Source Paths** | `**/ml/**/*.py`, `**/inference/**/*.py` |
| **File Count** | 1-3 per ML feature |
| **Imported By** | Presentation (routes) |
| **Specialist Type** | code |
| **Purpose** | Model loading at startup, scikit-learn/PyTorch/ONNX serving, batch prediction, model versioning, A/B testing, sync vs async inference |
| **Activation Trigger** | model, predict, inference, onnx, pytorch, sklearn, serving, ml |

---

## Purpose

Define ML model serving patterns for FastAPI: model loading at startup via lifespan, scikit-learn serving with joblib, PyTorch inference with eval mode, ONNX Runtime for cross-framework optimization, batch prediction endpoints, model versioning with path params, A/B testing, and sync vs async decision for CPU-bound inference.

---

## Pattern 60.1: Model Loading at Startup

```python
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator
from pathlib import Path

from fastapi import FastAPI


models: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Load ML models ONCE at startup."""
    model_dir = Path("models")

    # Load all models into memory
    models["classifier"] = load_sklearn_model(model_dir / "classifier.joblib")
    models["regressor"] = load_sklearn_model(model_dir / "regressor.joblib")
    # models["detector"] = load_pytorch_model(model_dir / "detector.pt")

    yield
    models.clear()


app = FastAPI(lifespan=lifespan)
```

**Key rule**: NEVER load models per-request. Model loading takes 100ms-10s and wastes memory.

---

## Pattern 60.2: scikit-learn + joblib

```python
import joblib
import numpy as np
from pydantic import BaseModel
from fastapi import APIRouter

router = APIRouter(prefix="/predict", tags=["predictions"])


def load_sklearn_model(path: str):
    """Load scikit-learn model from joblib file."""
    return joblib.load(path)


class PredictionRequest(BaseModel):
    features: list[float]


class PredictionResponse(BaseModel):
    prediction: float
    probability: list[float] | None = None


@router.post("/classify", response_model=PredictionResponse)
def classify(request: PredictionRequest):
    """Classify input features.

    NOTE: Using `def` (not `async def`) because sklearn inference
    is CPU-bound. FastAPI runs `def` in threadpool automatically.
    """
    model = models["classifier"]
    features = np.array([request.features])

    prediction = model.predict(features)[0]

    # Probability if classifier supports it
    probability = None
    if hasattr(model, "predict_proba"):
        probability = model.predict_proba(features)[0].tolist()

    return PredictionResponse(
        prediction=float(prediction),
        probability=probability,
    )
```

---

## Pattern 60.3: PyTorch Serving

```python
import torch
from torch import nn


def load_pytorch_model(path: str, model_class: type[nn.Module], **kwargs) -> nn.Module:
    """Load PyTorch model in evaluation mode."""
    model = model_class(**kwargs)
    model.load_state_dict(torch.load(path, map_location="cpu", weights_only=True))
    model.eval()  # CRITICAL: set to eval mode (disables dropout, batchnorm)
    return model


@router.post("/pytorch/predict")
def predict_pytorch(request: PredictionRequest):
    """PyTorch inference — sync def for CPU-bound work."""
    model = models["pytorch_model"]
    tensor = torch.tensor([request.features], dtype=torch.float32)

    with torch.no_grad():  # CRITICAL: disable gradient computation
        output = model(tensor)
        prediction = output.numpy().tolist()

    return {"prediction": prediction}
```

**GPU inference**:
```python
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

def load_pytorch_model_gpu(path: str, model_class, **kwargs):
    model = model_class(**kwargs)
    model.load_state_dict(torch.load(path, weights_only=True))
    model.eval()
    model.to(device)
    return model


@router.post("/pytorch/predict-gpu")
def predict_gpu(request: PredictionRequest):
    model = models["gpu_model"]
    tensor = torch.tensor([request.features], dtype=torch.float32).to(device)

    with torch.no_grad():
        output = model(tensor)
        prediction = output.cpu().numpy().tolist()  # Move back to CPU for serialization

    return {"prediction": prediction}
```

**Key rules**:
- Always call `model.eval()` before inference
- Always wrap inference in `torch.no_grad()` (saves memory, faster)
- Use `weights_only=True` in `torch.load()` (security)
- Move tensor to device, move result back to CPU for serialization

---

## Pattern 60.4: ONNX Runtime (2-10x Speedup)

```python
# pip install onnxruntime  # CPU
# pip install onnxruntime-gpu  # GPU
import onnxruntime as ort
import numpy as np


def load_onnx_model(path: str) -> ort.InferenceSession:
    """Load ONNX model with optimizations."""
    opts = ort.SessionOptions()
    opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    opts.intra_op_num_threads = 4

    providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
    return ort.InferenceSession(path, opts, providers=providers)


@router.post("/onnx/predict")
def predict_onnx(request: PredictionRequest):
    """ONNX inference — fastest option for production."""
    session = models["onnx_classifier"]

    input_name = session.get_inputs()[0].name
    input_data = np.array([request.features], dtype=np.float32)

    outputs = session.run(None, {input_name: input_data})

    return {
        "prediction": outputs[0].tolist(),
        "probabilities": outputs[1].tolist() if len(outputs) > 1 else None,
    }
```

**Convert models to ONNX**:
```python
# From scikit-learn
# pip install skl2onnx
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

onnx_model = convert_sklearn(
    sklearn_model,
    initial_types=[("input", FloatTensorType([None, n_features]))],
)

# From PyTorch
torch.onnx.export(
    pytorch_model,
    dummy_input,
    "model.onnx",
    input_names=["input"],
    output_names=["output"],
    dynamic_axes={"input": {0: "batch_size"}},
)
```

**When to use ONNX**:
- Production serving (2-10x faster than native PyTorch/sklearn)
- Multi-framework (convert from PyTorch, TensorFlow, sklearn)
- Edge deployment (mobile, embedded)
- Quantization support (INT8 for even faster)

---

## Pattern 60.5: Batch Prediction

```python
class BatchPredictionRequest(BaseModel):
    instances: list[list[float]]


class BatchPredictionResponse(BaseModel):
    predictions: list[float]
    count: int


@router.post("/batch", response_model=BatchPredictionResponse)
def batch_predict(request: BatchPredictionRequest):
    """Batch prediction — vectorized for performance."""
    model = models["classifier"]

    # Vectorized numpy operations (much faster than per-instance)
    features = np.array(request.instances)
    predictions = model.predict(features)

    return BatchPredictionResponse(
        predictions=predictions.tolist(),
        count=len(predictions),
    )
```

**Key rule**: Batch > individual requests. NumPy vectorized operations are 10-100x faster than Python loops.

---

## Pattern 60.6: Model Versioning

```python
from pathlib import Path


# Load multiple versions
@asynccontextmanager
async def lifespan(app: FastAPI):
    model_dir = Path("models")

    for version_dir in sorted(model_dir.glob("v*")):
        version = version_dir.name  # "v1", "v2"
        models[f"classifier_{version}"] = load_sklearn_model(
            version_dir / "classifier.joblib"
        )

    yield
    models.clear()


@router.post("/{version}/predict")
def predict_versioned(version: str, request: PredictionRequest):
    """Serve specific model version."""
    model_key = f"classifier_{version}"
    if model_key not in models:
        raise HTTPException(404, f"Model version {version} not found")

    model = models[model_key]
    features = np.array([request.features])
    prediction = model.predict(features)[0]

    return {"version": version, "prediction": float(prediction)}
```

---

## Pattern 60.7: A/B Testing

```python
import random


class ABConfig(BaseModel):
    model_a: str = "classifier_v1"
    model_b: str = "classifier_v2"
    traffic_split: float = 0.5  # 50% to each


@router.post("/ab/predict")
def predict_ab(request: PredictionRequest, config: ABConfig = ABConfig()):
    """A/B test between two model versions."""
    # Random traffic split
    use_b = random.random() < config.traffic_split
    model_key = config.model_b if use_b else config.model_a

    model = models[model_key]
    features = np.array([request.features])
    prediction = model.predict(features)[0]

    return {
        "prediction": float(prediction),
        "model_version": model_key,
        "variant": "B" if use_b else "A",
    }
```

---

## Pattern 60.8: def vs async def for Inference

```python
# �� Use `def` for CPU-bound inference
# FastAPI automatically runs `def` endpoints in a threadpool
# This prevents blocking the event loop

@router.post("/predict")
def predict(request: PredictionRequest):  # def, not async def
    model = models["classifier"]
    return model.predict(np.array([request.features]))[0]


# ❌ DON'T use `async def` for CPU-bound work
@router.post("/predict-bad")
async def predict_bad(request: PredictionRequest):  # BLOCKS event loop!
    model = models["classifier"]
    return model.predict(np.array([request.features]))[0]


# ✅ Use `async def` when you need async I/O BEFORE/AFTER inference
@router.post("/predict-with-io")
async def predict_with_io(request: PredictionRequest):
    # Async I/O: fetch features from DB
    extra_features = await feature_store.get(request.user_id)

    # CPU-bound: run in threadpool explicitly
    import asyncio
    result = await asyncio.to_thread(
        model_predict, request.features + extra_features
    )

    # Async I/O: log prediction
    await prediction_logger.log(request.user_id, result)

    return result
```

**Decision guide**:

| Endpoint Type | Use | Why |
|-------------|-----|-----|
| Pure inference | `def` | Auto threadpool, doesn't block |
| Inference + async I/O | `async def` + `asyncio.to_thread()` | Best of both |
| Async model (GPU) | `async def` | GPU ops can be async |

---

## MUST DO

- Load models at startup (lifespan), never per-request
- Use `model.eval()` + `torch.no_grad()` for PyTorch inference
- Use `def` (not `async def`) for CPU-bound inference
- Use ONNX Runtime for production (2-10x faster)
- Batch predictions when possible (vectorized numpy)
- Use `weights_only=True` in `torch.load()`

## MUST NOT DO

- Load models per-request (200ms-10s overhead)
- Use `async def` for CPU-bound inference (blocks event loop)
- Forget `model.eval()` in PyTorch (wrong results due to dropout/batchnorm)
- Forget `torch.no_grad()` (wastes memory on gradient tracking)
- Serve models without version tracking
- Skip input validation on prediction endpoints

---

## References

- [FastAPI ML Serving](https://fastapi.tiangolo.com/advanced/behind-a-proxy/)
- [ONNX Runtime](https://onnxruntime.ai/)
- [PyTorch: Saving and Loading](https://pytorch.org/tutorials/beginner/saving_loading_models.html)
- [scikit-learn: Model Persistence](https://scikit-learn.org/stable/model_persistence.html)
