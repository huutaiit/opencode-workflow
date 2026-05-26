# Flutter Sensors Specialist
# Flutter センサースペシャリスト
# Chuyen Gia Cam Bien Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Core |
| **Directory Pattern** | `lib/core/platform/`, `lib/core/services/` |
| **Variant** | ALL |
| **Naming Convention** | `sensor_service.dart`, `haptic_service.dart`. Classes: `SensorService`, `HapticService` |
| **Imports From** | Core (platform channels for native sensor APIs) |
| **Cannot Import** | Domain, Presentation, Features |
| **Pattern Numbers** | 104.11–104.15 |
| **Source Paths** | `lib/core/services/sensor*.dart`, `lib/core/platform/sensor*.dart` |
| **File Count** | 2-3 sensor service files |
| **Imported By** | Data (sensor data for analytics), Presentation (motion-reactive UI) |
| **Dependencies** | sensors_plus ^4.0.0, vibration ^1.8.0 |
| **When To Use** | Accelerometer, gyroscope, magnetometer data for motion detection, step counting, shake gestures, haptic feedback |
| **Source Skeleton** | `lib/core/services/sensor_service.dart`, `lib/core/services/haptic_service.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate sensor integration with accelerometer/gyroscope streams, shake detection, step counting, compass heading, and haptic feedback patterns |
| **Activation Trigger** | files: lib/core/services/sensor*.dart; keywords: accelerometer, gyroscope, magnetometer, shakeDetection, stepCounter, hapticFeedback |

---

## Patterns

### Pattern 104.11: Accelerometer + Gyroscope

```dart
import 'package:sensors_plus/sensors_plus.dart';

class SensorService {
  /// Accelerometer stream (gravity-inclusive)
  Stream<AccelerometerEvent> get accelerometer =>
      accelerometerEventStream(samplingPeriod: SensorInterval.uiInterval);

  /// User accelerometer (gravity removed)
  Stream<UserAccelerometerEvent> get userAccelerometer =>
      userAccelerometerEventStream(samplingPeriod: SensorInterval.uiInterval);

  /// Gyroscope (rotation rate)
  Stream<GyroscopeEvent> get gyroscope =>
      gyroscopeEventStream(samplingPeriod: SensorInterval.uiInterval);

  /// Magnetometer (compass heading)
  Stream<MagnetometerEvent> get magnetometer =>
      magnetometerEventStream(samplingPeriod: SensorInterval.uiInterval);
}
```

### Pattern 104.12: Shake Detection

```dart
class ShakeDetector {
  final double shakeThreshold;
  final Duration cooldown;
  final VoidCallback onShake;

  DateTime _lastShake = DateTime.fromMillisecondsSinceEpoch(0);
  StreamSubscription? _subscription;

  ShakeDetector({
    required this.onShake,
    this.shakeThreshold = 15.0,
    this.cooldown = const Duration(seconds: 1),
  });

  void start() {
    _subscription = accelerometerEventStream().listen((event) {
      final magnitude = sqrt(event.x * event.x + event.y * event.y + event.z * event.z);
      if (magnitude > shakeThreshold) {
        final now = DateTime.now();
        if (now.difference(_lastShake) > cooldown) {
          _lastShake = now;
          onShake();
        }
      }
    });
  }

  void stop() => _subscription?.cancel();
}

// Usage: shake to report bug, shake to refresh, shake to undo
```

### Pattern 104.13: Step Counter

```dart
class StepCounterService {
  StreamSubscription? _subscription;
  int _initialSteps = 0;

  /// Start counting steps from current point
  Stream<int> get stepStream {
    return userAccelerometerEventStream().map((event) {
      final magnitude = sqrt(event.x * event.x + event.y * event.y + event.z * event.z);
      // Simple peak detection — production apps should use platform step counter
      return magnitude > 1.2 ? 1 : 0;
    }).where((step) => step > 0);
  }

  // For production: use platform-specific step counter APIs
  // Android: TYPE_STEP_COUNTER sensor
  // iOS: CMPedometer
  // Access via platform channels for hardware step counting
}
```

### Pattern 104.14: Compass Heading

```dart
class CompassService {
  /// Get compass heading (0-360 degrees, 0 = North)
  Stream<double> get heading {
    return magnetometerEventStream().map((event) {
      var heading = atan2(event.y, event.x) * (180 / pi);
      if (heading < 0) heading += 360;
      return heading;
    });
  }
}
```

### Pattern 104.15: Haptic Feedback

```dart
import 'package:flutter/services.dart';

class HapticService {
  /// Light impact (button tap)
  static Future<void> lightImpact() =>
      HapticFeedback.lightImpact();

  /// Medium impact (toggle switch)
  static Future<void> mediumImpact() =>
      HapticFeedback.mediumImpact();

  /// Heavy impact (error, alert)
  static Future<void> heavyImpact() =>
      HapticFeedback.heavyImpact();

  /// Selection tick (picker scroll)
  static Future<void> selectionClick() =>
      HapticFeedback.selectionClick();

  /// Vibrate for duration (Android only via vibration package)
  static Future<void> vibrate({int durationMs = 200}) async {
    await HapticFeedback.vibrate();
  }

  /// Pattern vibrate (Android only)
  /// [wait, vibrate, wait, vibrate, ...]
  static Future<void> vibratePattern(List<int> pattern) async {
    for (var i = 0; i < pattern.length; i++) {
      if (i.isOdd) {
        await HapticFeedback.vibrate();
      }
      await Future.delayed(Duration(milliseconds: pattern[i]));
    }
  }
}

// Usage:
// HapticService.lightImpact();    // On button tap
// HapticService.heavyImpact();    // On error
// HapticService.selectionClick(); // On picker change
```

---

## MUST DO

- Cancel sensor subscriptions in dispose() (battery + CPU)
- Use SensorInterval.uiInterval for UI updates (not gameInterval — too fast)
- Add cooldown to shake detection (prevent rapid-fire triggers)
- Use platform step counter for accurate counting (not accelerometer)
- Provide haptic feedback on important interactions (UX enhancement)

## MUST NOT DO

- Listen to all sensors simultaneously (battery drain)
- Use gameInterval sampling rate for non-game apps
- Assume all devices have all sensors (check availability)
- Process sensor data on main thread (use Isolate for heavy computation)
- Rely on accelerometer for precise step counting (use platform API)

---

## References

- [sensors_plus](https://pub.dev/packages/sensors_plus)
- [HapticFeedback](https://api.flutter.dev/flutter/services/HapticFeedback-class.html)
