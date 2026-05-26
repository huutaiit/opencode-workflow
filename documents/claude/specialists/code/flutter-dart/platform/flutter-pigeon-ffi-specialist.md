# Flutter Pigeon + FFI Specialist
# Flutter Pigeon＋FFIスペシャリスト
# Chuyen Gia Pigeon Va FFI Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Core |
| **Directory Pattern** | `lib/core/platform/`, `pigeons/` |
| **Variant** | ALL |
| **Naming Convention** | `{name}.pigeon.dart` (generated), `{name}_ffi.dart`. Classes: `{Name}Api` (Pigeon generated) |
| **Imports From** | Core (platform layer) |
| **Cannot Import** | Domain, Presentation |
| **Pattern Numbers** | 103.1–103.4 |
| **Source Paths** | `pigeons/*.dart`, `lib/core/platform/*_ffi.dart` |
| **File Count** | 1-3 pigeon definitions + generated files |
| **Imported By** | Core (services use pigeon-generated APIs) |
| **Dependencies** | pigeon ^17.0.0 (dev), ffi (SDK) |
| **When To Use** | Type-safe platform channels (Pigeon) or direct native library calls (FFI) |
| **Source Skeleton** | `pigeons/{name}.dart`, `lib/core/platform/{name}_api.g.dart` (generated) |
| **Specialist Type** | code |
| **Purpose** | Generate Pigeon type-safe platform channel definitions and dart:ffi bindings for native library integration |
| **Activation Trigger** | files: pigeons/*.dart, lib/core/platform/*_ffi.dart; keywords: pigeon, ffi, ffigen, nativeLibrary, hostApi, flutterApi |

---

## Patterns

### Pattern 103.1: Pigeon Code Generation

```dart
/// pigeons/device_info.dart — Pigeon definition file
import 'package:pigeon/pigeon.dart';

/// Data class (generated for Dart, Kotlin, Swift)
class DeviceInfoData {
  String? model;
  String? osVersion;
  int? batteryLevel;
  bool? isPhysicalDevice;
}

/// Host API — Dart calls native
@HostApi()
abstract class DeviceInfoHostApi {
  DeviceInfoData getDeviceInfo();
  String getUniqueId();
}

/// Flutter API — native calls Dart
@FlutterApi()
abstract class DeviceInfoFlutterApi {
  void onBatteryChanged(int level);
}

/// Run pigeon to generate code:
/// dart run pigeon --input pigeons/device_info.dart \
///   --dart_out lib/core/platform/device_info_api.g.dart \
///   --kotlin_out android/app/src/main/kotlin/.../DeviceInfoApi.kt \
///   --swift_out ios/Runner/DeviceInfoApi.swift

// Usage in Dart
// final api = DeviceInfoHostApi();
// final info = await api.getDeviceInfo();
// print('Model: ${info.model}, Battery: ${info.batteryLevel}%');
```

### Pattern 103.2: dart:ffi Basics

```dart
import 'dart:ffi';
import 'dart:io';

/// Load native library and call C functions directly
class NativeMathLib {
  late final DynamicLibrary _lib;

  NativeMathLib() {
    if (Platform.isAndroid) {
      _lib = DynamicLibrary.open('libnative_math.so');
    } else if (Platform.isIOS) {
      _lib = DynamicLibrary.process(); // Statically linked
    } else {
      throw UnsupportedError('Platform not supported');
    }
  }

  /// Bind C function: int add(int a, int b)
  late final int Function(int, int) add = _lib
      .lookup<NativeFunction<Int32 Function(Int32, Int32)>>('add')
      .asFunction();

  /// Bind C function: double compute(double* data, int length)
  late final double Function(Pointer<Double>, int) computeAverage = _lib
      .lookup<NativeFunction<Double Function(Pointer<Double>, Int32)>>('compute_average')
      .asFunction();

  /// Call with array data
  double average(List<double> values) {
    final pointer = calloc<Double>(values.length);
    try {
      for (var i = 0; i < values.length; i++) {
        pointer[i] = values[i];
      }
      return computeAverage(pointer, values.length);
    } finally {
      calloc.free(pointer);
    }
  }
}
```

### Pattern 103.3: ffigen (Auto-Generated Bindings)

```yaml
# ffigen.yaml — configuration for auto-generating FFI bindings
name: NativeBindings
description: FFI bindings for native_lib
output: lib/core/platform/native_bindings.g.dart
headers:
  entry-points:
    - 'native/include/native_lib.h'
  include-directives:
    - 'native/include/native_lib.h'
compiler-opts:
  - '-Inative/include'
```

```dart
/// Run: dart run ffigen --config ffigen.yaml
/// Generates type-safe Dart bindings from C headers

// native/include/native_lib.h
// typedef struct { float x; float y; float z; } Vector3;
// Vector3 normalize(Vector3 v);
// float dot_product(Vector3 a, Vector3 b);

// Generated usage:
// final bindings = NativeBindings(DynamicLibrary.open('libnative_lib.so'));
// final v = bindings.normalize(Vector3(x: 1, y: 2, z: 3));
```

### Pattern 103.4: Native Library Integration

```dart
/// Complete native library integration pattern
class ImageProcessingNative {
  static final _instance = ImageProcessingNative._();
  factory ImageProcessingNative() => _instance;

  late final DynamicLibrary _lib;
  bool _initialized = false;

  ImageProcessingNative._();

  Future<void> initialize() async {
    if (_initialized) return;

    try {
      if (Platform.isAndroid) {
        _lib = DynamicLibrary.open('libimage_processor.so');
      } else if (Platform.isIOS) {
        _lib = DynamicLibrary.process();
      }
      _initialized = true;
    } catch (e) {
      throw NativeLibraryException('Failed to load image processor: $e');
    }
  }

  /// Process image using native code (faster than Dart for heavy computation)
  Uint8List processImage(Uint8List input, {required int quality}) {
    if (!_initialized) throw StateError('Call initialize() first');

    final inputPtr = calloc<Uint8>(input.length);
    final outputLengthPtr = calloc<Int32>();

    try {
      inputPtr.asTypedList(input.length).setAll(0, input);

      final outputPtr = _processFunc(
        inputPtr,
        input.length,
        quality,
        outputLengthPtr,
      );

      final outputLength = outputLengthPtr.value;
      final result = Uint8List.fromList(
        outputPtr.asTypedList(outputLength),
      );

      _freeFunc(outputPtr);
      return result;
    } finally {
      calloc.free(inputPtr);
      calloc.free(outputLengthPtr);
    }
  }

  late final _processFunc = _lib.lookupFunction<
      Pointer<Uint8> Function(Pointer<Uint8>, Int32, Int32, Pointer<Int32>),
      Pointer<Uint8> Function(Pointer<Uint8>, int, int, Pointer<Int32>)
  >('process_image');

  late final _freeFunc = _lib.lookupFunction<
      Void Function(Pointer<Uint8>),
      void Function(Pointer<Uint8>)
  >('free_buffer');
}

class NativeLibraryException implements Exception {
  final String message;
  NativeLibraryException(this.message);
}
```

---

## MUST DO

- Use Pigeon for type-safe channel communication (eliminates string-based errors)
- Always free allocated memory in FFI calls (use try/finally)
- Load DynamicLibrary differently per platform (Android: .so, iOS: process())
- Run `dart run pigeon` after modifying pigeon definition files
- Use ffigen for C library bindings (auto-generates type-safe wrappers)

## MUST NOT DO

- Use raw MethodChannel when Pigeon is available (Pigeon is type-safe)
- Forget to free native memory (causes memory leaks)
- Pass Dart objects directly through FFI (only C-compatible types)
- Call FFI functions on the main isolate for heavy computation (use Isolate)
- Hardcode library paths (use Platform checks for cross-platform loading)

---

## References

- [Pigeon](https://pub.dev/packages/pigeon)
- [dart:ffi](https://dart.dev/interop/c-interop)
- [ffigen](https://pub.dev/packages/ffigen)
