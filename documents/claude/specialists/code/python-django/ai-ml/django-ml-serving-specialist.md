# Django ML Serving Specialist
# Django ML サービングスペシャリスト
# Chuyen Gia ML Serving Django

**Stack**: Python 3.12+ / Django 5.x / ONNX / scikit-learn | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Directory Pattern** | `apps/{domain}/apps.py`, `apps/{domain}/services/predict.py` |
| **Variant** | ALL |
| **Naming Convention** | `predict.py` service, model loading in `apps.py` |
| **Imports From** | onnxruntime, sklearn, Domain (models) |
| **Cannot Import** | Views (services layer) |
| **Framework** | python-django |
| **Architecture** | ANY |
| **Implementation Patterns** | model-loading-appconfig, drf-prediction, ninja-prediction, batch-prediction, onnx-runtime, model-versioning |
| **Pattern Numbers** | 52.7–52.12 |
| **Source Paths** | `**/apps.py`, `**/services/predict.py`, `**/views.py` |
| **File Count** | Service + views |
| **Imported By** | Views, Tasks |
| **Specialist Type** | code |
| **Purpose** | Model loading in AppConfig.ready, DRF prediction endpoint, django-ninja async prediction, batch prediction with Celery, ONNX Runtime inference, model versioning |
| **Activation Trigger** | model, predict, inference, onnx, sklearn, pytorch, ml serving |

---

## Purpose

Define Django ML serving patterns: loading trained models once via AppConfig.ready(), DRF prediction endpoints with input validation, django-ninja async prediction, Celery for batch inference, ONNX Runtime for fast cross-framework inference, and model versioning for multiple concurrent model versions.

---

## Pattern 52.7: Model Loading (AppConfig.ready)

```python
# apps/ml/apps.py
import os
import logging
from django.apps import AppConfig

logger = logging.getLogger(__name__)

# Module-level storage for loaded models
_models = {}


def get_model(name: str = "default"):
    """Get loaded ML model by name."""
    return _models.get(name)


class MlConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.ml"

    def ready(self):
        model_path = os.getenv("ML_MODEL_PATH", "models/model.pkl")
        if os.path.exists(model_path):
            import joblib
            _models["default"] = joblib.load(model_path)
            logger.info("ML model loaded from %s", model_path)
        else:
            logger.warning("ML model not found at %s", model_path)
```

---

## Pattern 52.8: DRF Prediction Endpoint

```python
# apps/ml/serializers.py
from rest_framework import serializers


class PredictionInputSerializer(serializers.Serializer):
    features = serializers.ListField(
        child=serializers.FloatField(),
        min_length=1,
        help_text="Feature vector for prediction",
    )


class PredictionOutputSerializer(serializers.Serializer):
    prediction = serializers.FloatField()
    confidence = serializers.FloatField()
    model_version = serializers.CharField()
```

```python
# apps/ml/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from apps.ml.apps import get_model
import numpy as np


class PredictView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PredictionInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        model = get_model("default")
        if model is None:
            return Response({"error": "Model not loaded"}, status=503)

        features = np.array([serializer.validated_data["features"]])
        prediction = model.predict(features)[0]

        # Get confidence if available
        confidence = 1.0
        if hasattr(model, "predict_proba"):
            proba = model.predict_proba(features)[0]
            confidence = float(max(proba))

        return Response({
            "prediction": float(prediction),
            "confidence": confidence,
            "model_version": "v1",
        })
```

---

## Pattern 52.9: django-ninja Async Prediction

```python
# apps/ml/schemas.py
from ninja import Schema


class PredictionInput(Schema):
    features: list[float]


class PredictionOutput(Schema):
    prediction: float
    confidence: float
    model_version: str
```

```python
# apps/ml/api.py
from ninja import Router
from apps.ml.schemas import PredictionInput, PredictionOutput
from apps.ml.apps import get_model
from asgiref.sync import sync_to_async
import numpy as np

router = Router()


@router.post("/predict/", response=PredictionOutput)
async def predict(request, payload: PredictionInput):
    """Async prediction endpoint."""
    model = get_model("default")
    if model is None:
        return {"error": "Model not loaded"}, 503

    # Run CPU-bound prediction in thread pool
    result = await sync_to_async(_predict)(model, payload.features)
    return result


def _predict(model, features: list[float]) -> dict:
    """Sync prediction logic — runs in thread pool."""
    X = np.array([features])
    prediction = model.predict(X)[0]

    confidence = 1.0
    if hasattr(model, "predict_proba"):
        confidence = float(max(model.predict_proba(X)[0]))

    return PredictionOutput(
        prediction=float(prediction),
        confidence=confidence,
        model_version="v1",
    )
```

---

## Pattern 52.10: Batch Prediction (Celery)

```python
# apps/ml/tasks.py
from celery import shared_task
import numpy as np


@shared_task(bind=True, max_retries=2)
def batch_predict(self, input_file_id):
    """Batch prediction from uploaded CSV."""
    from apps.ml.apps import get_model
    from apps.documents.models import Document
    import csv
    from io import StringIO

    try:
        document = Document.objects.get(pk=input_file_id)
        model = get_model("default")

        # Read CSV
        content = document.file.read().decode("utf-8")
        reader = csv.DictReader(StringIO(content))

        results = []
        batch = []
        batch_rows = []

        for row in reader:
            features = [float(v) for k, v in row.items() if k.startswith("feature_")]
            batch.append(features)
            batch_rows.append(row)

            if len(batch) >= 100:
                predictions = model.predict(np.array(batch))
                for r, pred in zip(batch_rows, predictions):
                    results.append({**r, "prediction": float(pred)})
                batch = []
                batch_rows = []

        # Remaining batch
        if batch:
            predictions = model.predict(np.array(batch))
            for r, pred in zip(batch_rows, predictions):
                results.append({**r, "prediction": float(pred)})

        # Save results
        document.metadata["predictions"] = results
        document.metadata["status"] = "completed"
        document.save(update_fields=["metadata"])

    except Exception as exc:
        document.metadata["status"] = "failed"
        document.save(update_fields=["metadata"])
        raise self.retry(exc=exc, countdown=60)
```

---

## Pattern 52.11: ONNX Runtime

```python
# apps/ml/apps.py — ONNX loading
import onnxruntime as ort

_sessions = {}


def get_onnx_session(name: str = "default"):
    return _sessions.get(name)


class MlConfig(AppConfig):
    name = "apps.ml"

    def ready(self):
        import os
        model_path = os.getenv("ONNX_MODEL_PATH", "models/model.onnx")
        if os.path.exists(model_path):
            _sessions["default"] = ort.InferenceSession(
                model_path,
                providers=["CPUExecutionProvider"],
            )
            logger.info("ONNX model loaded from %s", model_path)
```

```python
# apps/ml/services/predict.py
import numpy as np
from apps.ml.apps import get_onnx_session


def predict_onnx(features: list[float]) -> dict:
    """Run inference with ONNX Runtime."""
    session = get_onnx_session("default")
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name

    input_data = np.array([features], dtype=np.float32)
    result = session.run([output_name], {input_name: input_data})

    prediction = result[0][0]
    return {
        "prediction": float(prediction) if np.isscalar(prediction) else prediction.tolist(),
        "model_version": "onnx-v1",
    }
```

---

## Pattern 52.12: Model Versioning

```python
# apps/ml/apps.py — Multiple model versions
class MlConfig(AppConfig):
    name = "apps.ml"

    def ready(self):
        import os
        import joblib

        models_dir = os.getenv("ML_MODELS_DIR", "models/")
        for version_dir in sorted(os.listdir(models_dir)):
            model_path = os.path.join(models_dir, version_dir, "model.pkl")
            if os.path.exists(model_path):
                _models[version_dir] = joblib.load(model_path)
                logger.info("Loaded model version: %s", version_dir)
```

```python
# apps/ml/views.py — Version-specific endpoint
class PredictVersionView(APIView):
    def post(self, request, version):
        model = get_model(version)
        if model is None:
            return Response({"error": f"Model version '{version}' not found"}, status=404)

        serializer = PredictionInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        features = np.array([serializer.validated_data["features"]])
        prediction = model.predict(features)[0]

        return Response({
            "prediction": float(prediction),
            "model_version": version,
        })
```

```python
# urls.py
urlpatterns = [
    path("api/predict/", PredictView.as_view()),
    path("api/predict/<str:version>/", PredictVersionView.as_view()),
    # /api/predict/v1/, /api/predict/v2/
]
```

---

## MUST DO

- Load models in `AppConfig.ready()` (once, at startup)
- Use `sync_to_async` for CPU-bound inference in async views
- Use Celery for batch predictions
- Validate input features before prediction
- Support multiple model versions concurrently

## MUST NOT DO

- Load models per-request (extremely slow)
- Use `async def` for CPU-bound inference (blocks event loop)
- Skip input validation (bad input = cryptic model errors)
- Deploy without model file existence check
- Serve models from Django in high-throughput scenarios (use dedicated serving)

---

## References

- [ONNX Runtime](https://onnxruntime.ai/)
- [scikit-learn: Model persistence](https://scikit-learn.org/stable/model_persistence.html)
- [django-ninja: Async](https://django-ninja.dev/guides/async-support/)
