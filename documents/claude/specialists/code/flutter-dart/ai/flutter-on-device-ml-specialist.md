# Flutter On-Device ML Specialist
# Flutter オンデバイスMLスペシャリスト
# Chuyen Gia ML Tren Thiet Bi Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Core, Presentation |
| **Directory Pattern** | `lib/core/ml/`, `lib/features/{feature}/presentation/widgets/` |
| **Variant** | ALL |
| **Naming Convention** | `ml_service.dart`, `ocr_service.dart`, `{name}_scanner_widget.dart`. Classes: `MlService`, `OcrService`, `{Name}ScannerWidget` |
| **Imports From** | Core (camera, platform channels for native ML), Presentation (camera preview widgets) |
| **Cannot Import** | Domain (ML is infrastructure), Data (ML processing is independent of data layer) |
| **Pattern Numbers** | 114.1–114.6 |
| **Source Paths** | `lib/core/ml/*.dart`, `lib/features/*/presentation/widgets/*_scanner*.dart` |
| **File Count** | 2-4 ML service + scanner widget files |
| **Imported By** | Data (ML results feed into data pipeline), Presentation (camera-based ML screens) |
| **Dependencies** | google_mlkit_text_recognition ^0.11.0, google_mlkit_barcode_scanning ^0.10.0, google_mlkit_face_detection ^0.9.0, tflite_flutter ^0.10.0 |
| **When To Use** | On-device text recognition (OCR), barcode scanning, face detection, custom TFLite model inference |
| **Source Skeleton** | `lib/core/ml/ocr_service.dart`, `lib/features/{f}/presentation/widgets/{f}_scanner_widget.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate on-device ML integration with Google ML Kit (OCR, barcode, face), TFLite custom models, camera preview pipeline, and result processing |
| **Activation Trigger** | files: lib/core/ml/*.dart; keywords: mlKit, ocr, textRecognition, faceDetection, tflite, onDeviceML |

---

## Patterns

### Pattern 114.1: Google ML Kit Setup

```dart
import 'package:google_mlkit_text_recognition/google_mlkit_text_recognition.dart';

class OcrService {
  final TextRecognizer _recognizer;

  OcrService({TextRecognitionScript script = TextRecognitionScript.latin})
      : _recognizer = TextRecognizer(script: script);

  /// Recognize text from camera image
  Future<RecognizedText> processImage(InputImage image) async {
    return _recognizer.processImage(image);
  }

  /// Extract structured text (lines, blocks)
  Future<List<String>> extractLines(InputImage image) async {
    final result = await processImage(image);
    return result.blocks
        .expand((block) => block.lines)
        .map((line) => line.text)
        .toList();
  }

  void dispose() => _recognizer.close();
}

// For Japanese text recognition:
// OcrService(script: TextRecognitionScript.japanese)
```

### Pattern 114.2: Camera → ML Pipeline

```dart
/// Process camera frames through ML model
class CameraMlPipeline {
  final MobileScannerController _camera;
  bool _processing = false;

  CameraMlPipeline() : _camera = MobileScannerController();

  Widget buildPreview({
    required void Function(InputImage) onImage,
  }) {
    return MobileScanner(
      controller: _camera,
      onDetect: (capture) {
        if (_processing) return;
        _processing = true;

        // Convert capture to InputImage
        final image = capture.image;
        if (image != null) {
          final inputImage = InputImage.fromBytes(
            bytes: image.bytes,
            metadata: InputImageMetadata(
              size: Size(image.width.toDouble(), image.height.toDouble()),
              rotation: InputImageRotation.rotation0deg,
              format: InputImageFormat.nv21,
              bytesPerRow: image.width,
            ),
          );
          onImage(inputImage);
        }
        _processing = false;
      },
    );
  }

  void dispose() => _camera.dispose();
}
```

### Pattern 114.3: Document Scanner (OCR)

```dart
/// Scan receipts, invoices, business cards
class DocumentScannerWidget extends StatefulWidget {
  final ValueChanged<List<String>> onTextExtracted;

  const DocumentScannerWidget({super.key, required this.onTextExtracted});

  @override
  State<DocumentScannerWidget> createState() => _DocumentScannerWidgetState();
}

class _DocumentScannerWidgetState extends State<DocumentScannerWidget> {
  final _ocrService = OcrService();
  List<String> _extractedLines = [];

  Future<void> _processImage(InputImage image) async {
    final lines = await _ocrService.extractLines(image);
    if (lines.isNotEmpty) {
      setState(() => _extractedLines = lines);
      widget.onTextExtracted(lines);
    }
  }

  @override
  void dispose() {
    _ocrService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: CameraMlPipeline().buildPreview(onImage: _processImage),
        ),
        if (_extractedLines.isNotEmpty)
          Container(
            padding: const EdgeInsets.all(16),
            child: Text(_extractedLines.join('\n')),
          ),
      ],
    );
  }
}
```

### Pattern 114.4: Face Detection

```dart
import 'package:google_mlkit_face_detection/google_mlkit_face_detection.dart';

class FaceDetectionService {
  final FaceDetector _detector;

  FaceDetectionService()
      : _detector = FaceDetector(
          options: FaceDetectorOptions(
            enableContours: true,
            enableLandmarks: true,
            performanceMode: FaceDetectorMode.accurate,
          ),
        );

  Future<List<Face>> detect(InputImage image) async {
    return _detector.processImage(image);
  }

  void dispose() => _detector.close();
}
```

### Pattern 114.5: TFLite Custom Model

```dart
import 'package:tflite_flutter/tflite_flutter.dart';

class CustomModelService {
  Interpreter? _interpreter;

  Future<void> loadModel(String assetPath) async {
    _interpreter = await Interpreter.fromAsset(assetPath);
  }

  /// Run inference on input data
  List<double> predict(List<double> input) {
    if (_interpreter == null) throw StateError('Model not loaded');

    final output = List.filled(10, 0.0).reshape([1, 10]);
    _interpreter!.run(input.reshape([1, input.length]), output);
    return output[0];
  }

  void dispose() => _interpreter?.close();
}

// Usage:
// final model = CustomModelService();
// await model.loadModel('assets/models/classifier.tflite');
// final prediction = model.predict(inputFeatures);
```

### Pattern 114.6: ML Result Post-Processing

```dart
/// Extract structured data from OCR results
class ReceiptParser {
  static ReceiptData? parse(List<String> ocrLines) {
    String? total;
    String? date;
    final items = <String>[];

    for (final line in ocrLines) {
      if (RegExp(r'合計|total|TOTAL', caseSensitive: false).hasMatch(line)) {
        total = RegExp(r'[\d,]+').firstMatch(line)?.group(0);
      }
      if (RegExp(r'\d{4}[/\-]\d{1,2}[/\-]\d{1,2}').hasMatch(line)) {
        date = RegExp(r'\d{4}[/\-]\d{1,2}[/\-]\d{1,2}').firstMatch(line)?.group(0);
      }
    }

    return ReceiptData(total: total, date: date, rawLines: ocrLines);
  }
}

class ReceiptData {
  final String? total;
  final String? date;
  final List<String> rawLines;
  ReceiptData({this.total, this.date, required this.rawLines});
}
```

---

## MUST DO

- Close ML recognizers/detectors in dispose() (native resource leak)
- Use `_processing` flag to prevent concurrent frame processing
- Choose correct TextRecognitionScript for language (latin, japanese, chinese)
- Run ML inference off main thread for heavy models
- Bundle TFLite models in assets/ (not downloaded at runtime for offline use)

## MUST NOT DO

- Process every camera frame (skip frames while processing)
- Use cloud ML APIs for real-time camera processing (latency)
- Forget to close Interpreter/Recognizer (native memory leak)
- Ship large models (>50MB) in app bundle without user consent
- Use on-device ML for tasks requiring cloud accuracy (use hybrid approach)

---

## References

- [Google ML Kit for Flutter](https://pub.dev/packages/google_mlkit_text_recognition)
- [tflite_flutter](https://pub.dev/packages/tflite_flutter)
- [ML Kit Documentation](https://developers.google.com/ml-kit)
