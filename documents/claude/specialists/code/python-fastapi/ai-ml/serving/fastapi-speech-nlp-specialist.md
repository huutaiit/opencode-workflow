# FastAPI Speech & NLP Specialist
# FastAPI 音声・NLPスペシャリスト
# Chuyen Gia Giong Noi va NLP FastAPI

**Stack**: Python 3.12+ / FastAPI 0.115+ | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Application |
| **Directory Pattern** | `src/speech/`, `src/nlp/`, `src/ai/` |
| **Variant** | ALL |
| **Naming Convention** | `transcriber.py`, `tts_service.py`, `ner_service.py` |
| **Imports From** | Infrastructure (storage), Domain (schemas) |
| **Cannot Import** | Presentation |
| **Dependencies** | `faster-whisper` (STT), `spacy>=3.7`, `transformers` (HuggingFace) |
| **When To Use** | Speech-to-text, NER, text classification, HF transformers serving |
| **Source Skeleton** | `src/nlp/stt_service.py`, `src/nlp/ner_service.py`, `src/nlp/router.py` |
| **Pattern Numbers** | 61.1–61.7 |
| **Source Paths** | `**/speech/**/*.py`, `**/nlp/**/*.py` |
| **File Count** | 2-4 per speech/NLP feature |
| **Imported By** | Presentation (routes, WebSocket) |
| **Specialist Type** | code |
| **Purpose** | faster-whisper STT, transcription endpoints, real-time WebSocket transcription, TTS, spaCy NER, Hugging Face transformers, spaCy+HF pipelines |
| **Activation Trigger** | whisper, speech, transcribe, tts, spacy, ner, sentiment, nlp, voice |

---

## Purpose

Define speech and NLP patterns for FastAPI: speech-to-text with faster-whisper (4x faster than OpenAI Whisper), transcription endpoints, real-time WebSocket audio transcription, text-to-speech with Coqui TTS, named entity recognition with spaCy, Hugging Face transformer pipelines, and spaCy+HF integration.

---

## Pattern 61.1: Speech-to-Text (faster-whisper)

```python
# pip install faster-whisper
from faster_whisper import WhisperModel
from contextlib import asynccontextmanager

models: dict = {}


@asynccontextmanager
async def lifespan(app):
    # CTranslate2 backend — 4x faster than original Whisper
    models["whisper"] = WhisperModel(
        "large-v3",           # or "medium", "small", "base", "tiny"
        device="cuda",         # or "cpu"
        compute_type="float16", # "int8" for CPU, "float16" for GPU
    )
    yield
    models.clear()


# Model size guide
# tiny:   ~1GB VRAM, fastest, lower accuracy
# base:   ~1GB VRAM, fast
# small:  ~2GB VRAM, good balance
# medium: ~5GB VRAM, high accuracy
# large-v3: ~10GB VRAM, best accuracy
```

**Key rule**: Pre-download models in Docker build (not at runtime):
```dockerfile
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('large-v3')"
```

---

## Pattern 61.2: Transcription Endpoint

```python
from io import BytesIO
from pydantic import BaseModel
from fastapi import APIRouter, UploadFile, HTTPException

router = APIRouter(prefix="/speech", tags=["speech"])


class TranscriptionResponse(BaseModel):
    text: str
    language: str
    duration: float
    segments: list[dict]


@router.post("/transcribe", response_model=TranscriptionResponse)
def transcribe(
    file: UploadFile,
    language: str | None = None,
    task: str = "transcribe",  # or "translate" (to English)
):
    """Transcribe audio file.

    Using `def` — CPU/GPU-bound inference runs in threadpool.
    Supports: mp3, wav, flac, ogg, m4a, webm.
    """
    if not file.content_type or not file.content_type.startswith("audio/"):
        raise HTTPException(400, "File must be audio")

    # Read file
    audio_data = file.file.read()

    # Transcribe
    segments, info = models["whisper"].transcribe(
        BytesIO(audio_data),
        language=language,
        task=task,
        beam_size=5,
        word_timestamps=True,
    )

    # Collect segments
    segment_list = []
    full_text = ""
    for segment in segments:
        segment_list.append({
            "start": round(segment.start, 2),
            "end": round(segment.end, 2),
            "text": segment.text.strip(),
        })
        full_text += segment.text

    return TranscriptionResponse(
        text=full_text.strip(),
        language=info.language,
        duration=info.duration,
        segments=segment_list,
    )
```

---

## Pattern 61.3: Real-Time Transcription (WebSocket)

```python
import asyncio
import numpy as np
from fastapi import WebSocket, WebSocketDisconnect


@app.websocket("/ws/transcribe")
async def realtime_transcribe(ws: WebSocket):
    """Real-time audio transcription via WebSocket.

    Client sends: raw audio chunks (16kHz, 16-bit PCM)
    Server sends: transcribed text segments
    """
    await ws.accept()
    audio_buffer = bytearray()
    CHUNK_DURATION = 3  # seconds
    SAMPLE_RATE = 16000
    CHUNK_SIZE = SAMPLE_RATE * CHUNK_DURATION * 2  # 16-bit = 2 bytes

    try:
        async for chunk in ws.iter_bytes():
            audio_buffer.extend(chunk)

            # Process when we have enough audio
            if len(audio_buffer) >= CHUNK_SIZE:
                # Convert to numpy
                audio_np = np.frombuffer(
                    bytes(audio_buffer[:CHUNK_SIZE]),
                    dtype=np.int16,
                ).astype(np.float32) / 32768.0

                # Transcribe in threadpool (CPU-bound)
                segments, _ = await asyncio.to_thread(
                    models["whisper"].transcribe,
                    audio_np,
                    language="en",
                    beam_size=1,  # Faster for real-time
                )

                text = " ".join(s.text.strip() for s in segments)
                if text:
                    await ws.send_json({"text": text, "final": False})

                # Keep overlap for continuity
                audio_buffer = audio_buffer[CHUNK_SIZE:]

    except WebSocketDisconnect:
        pass
```

---

## Pattern 61.4: Text-to-Speech (Coqui TTS)

```python
# pip install TTS
from TTS.api import TTS
from io import BytesIO
from fastapi.responses import StreamingResponse


@asynccontextmanager
async def lifespan(app):
    # Multi-speaker, multi-lingual
    models["tts"] = TTS("tts_models/multilingual/multi-dataset/xtts_v2")
    yield


class TTSRequest(BaseModel):
    text: str
    language: str = "en"
    speaker_wav: str | None = None  # Path for voice cloning


@router.post("/synthesize")
def synthesize_speech(request: TTSRequest):
    """Generate speech from text."""
    tts = models["tts"]
    buffer = BytesIO()

    tts.tts_to_file(
        text=request.text,
        language=request.language,
        speaker_wav=request.speaker_wav,  # For voice cloning
        file_path=buffer,
    )

    buffer.seek(0)
    return StreamingResponse(buffer, media_type="audio/wav")
```

**TTS options**:

| Library | Quality | Speed | Voice Cloning | License |
|---------|---------|-------|--------------|---------|
| Coqui TTS (XTTS) | High | Medium | Yes | MPL-2.0 |
| pyttsx3 | Low | Fast | No | MPL-2.0 |
| gTTS (Google) | Medium | API | No | MIT |
| OpenAI TTS | High | API | No | Paid |

---

## Pattern 61.5: NER with spaCy

```python
# pip install spacy
# python -m spacy download en_core_web_trf  (transformer-based, best accuracy)
# python -m spacy download en_core_web_sm   (small, fast)
import spacy
from pydantic import BaseModel

nlp = spacy.load("en_core_web_trf")  # Load at startup


class Entity(BaseModel):
    text: str
    label: str
    start: int
    end: int


class NERResponse(BaseModel):
    entities: list[Entity]
    text: str


@router.post("/ner", response_model=NERResponse)
def extract_entities(text: str):
    """Extract named entities from text."""
    doc = nlp(text)

    entities = [
        Entity(
            text=ent.text,
            label=ent.label_,  # PERSON, ORG, GPE, DATE, MONEY, etc.
            start=ent.start_char,
            end=ent.end_char,
        )
        for ent in doc.ents
    ]

    return NERResponse(entities=entities, text=text)
```

**spaCy model comparison**:

| Model | Size | Speed | Accuracy | Use Case |
|-------|------|-------|----------|----------|
| en_core_web_sm | 12MB | Very Fast | Good | Production, high throughput |
| en_core_web_md | 40MB | Fast | Better | General purpose |
| en_core_web_lg | 560MB | Medium | Good+ | Need word vectors |
| en_core_web_trf | 440MB | Slow | Best | Accuracy-critical |

---

## Pattern 61.6: Hugging Face Transformers Pipeline

```python
# pip install transformers torch
from transformers import pipeline


# Load pipelines at startup
@asynccontextmanager
async def lifespan(app):
    models["sentiment"] = pipeline(
        "sentiment-analysis",
        model="distilbert-base-uncased-finetuned-sst-2-english",
        device=0 if torch.cuda.is_available() else -1,
    )
    models["qa"] = pipeline(
        "question-answering",
        model="distilbert-base-cased-distilled-squad",
    )
    models["summarizer"] = pipeline(
        "summarization",
        model="facebook/bart-large-cnn",
    )
    yield


class SentimentResponse(BaseModel):
    label: str  # POSITIVE or NEGATIVE
    score: float


@router.post("/sentiment", response_model=SentimentResponse)
def analyze_sentiment(text: str):
    result = models["sentiment"](text)[0]
    return SentimentResponse(label=result["label"], score=result["score"])


class QARequest(BaseModel):
    question: str
    context: str


@router.post("/qa")
def question_answering(request: QARequest):
    result = models["qa"](question=request.question, context=request.context)
    return {
        "answer": result["answer"],
        "score": result["score"],
        "start": result["start"],
        "end": result["end"],
    }
```

**Available pipeline tasks**:
- `text-classification` / `sentiment-analysis`
- `question-answering`
- `summarization`
- `translation_en_to_fr` (etc.)
- `text-generation`
- `fill-mask`
- `token-classification` (NER)
- `zero-shot-classification`

---

## Pattern 61.7: spaCy + Hugging Face Pipeline

```python
# pip install spacy-huggingface-pipelines
import spacy

# Use HF model within spaCy pipeline
nlp = spacy.blank("en")
nlp.add_pipe(
    "hf_text_classification",
    config={
        "model": "distilbert-base-uncased-finetuned-sst-2-english",
        "device": 0,  # GPU
    },
)


@router.post("/analyze")
def analyze_text(text: str):
    doc = nlp(text)

    return {
        "text": text,
        "classification": {
            "label": doc.cats,  # {"POSITIVE": 0.99, "NEGATIVE": 0.01}
        },
    }
```

**Key rule**: Pre-download ALL models in Docker build:
```dockerfile
RUN python -m spacy download en_core_web_trf
RUN python -c "from transformers import pipeline; pipeline('sentiment-analysis')"
RUN python -c "from faster_whisper import WhisperModel; WhisperModel('base')"
```

---

## MUST DO

- Pre-download models in Docker build (not at runtime)
- Use `def` (not `async def`) for CPU-bound NLP/speech inference
- Use faster-whisper instead of openai-whisper (4x faster)
- Load spaCy/HF models at startup, never per-request
- Use `asyncio.to_thread()` for CPU-bound work in async handlers
- Choose model size based on accuracy vs speed tradeoff

## MUST NOT DO

- Download models at runtime (slow startup, network dependency)
- Use `async def` for CPU-bound inference (blocks event loop)
- Load spaCy/transformer models per-request
- Use transformer models (en_core_web_trf) when speed matters more than accuracy
- Skip audio format validation on transcription endpoints
- Forget to set `device` parameter for GPU acceleration

---

## References

- [faster-whisper](https://github.com/SYSTRAN/faster-whisper)
- [spaCy](https://spacy.io/)
- [Hugging Face Transformers](https://huggingface.co/docs/transformers/)
- [Coqui TTS](https://github.com/coqui-ai/TTS)
