# Flutter Platform Channels Specialist
# Flutter プラットフォームチャネルスペシャリスト
# Chuyen Gia Platform Channel Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Core |
| **Directory Pattern** | `lib/core/platform/` |
| **Variant** | ALL |
| **Naming Convention** | `{name}_channel.dart`. Classes: `{Name}Channel` |
| **Imports From** | Core (error types) |
| **Cannot Import** | Domain, Presentation, Features |
| **Pattern Numbers** | 102.1–102.5 |
| **Source Paths** | `lib/core/platform/*.dart` |
| **File Count** | 2-5 platform channel files |
| **Imported By** | Core (services use channels), Data (datasources may use native APIs) |
| **Dependencies** | None (Flutter SDK MethodChannel, EventChannel built-in) |
| **When To Use** | Calling native platform APIs (Android/iOS) from Dart — sensors, device features |
| **Source Skeleton** | `lib/core/platform/{name}_channel.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate MethodChannel/EventChannel/BasicMessageChannel wrappers for native platform communication with proper error mapping |
| **Activation Trigger** | files: lib/core/platform/*.dart; keywords: methodChannel, eventChannel, platformChannel, nativeApi, pluginDevelopment |

---

## Patterns

### Pattern 102.1: MethodChannel (Request-Response)

```dart
import 'package:flutter/services.dart';

/// MethodChannel wrapper for native battery info
class BatteryChannel {
  static const _channel = MethodChannel('com.app/battery');

  /// Get current battery level (0-100)
  Future<int> getBatteryLevel() async {
    try {
      final level = await _channel.invokeMethod<int>('getBatteryLevel');
      return level ?? -1;
    } on PlatformException catch (e) {
      throw NativeApiException('Battery: ${e.message}', e.code);
    } on MissingPluginException {
      throw NativeApiException('Battery plugin not available on this platform');
    }
  }

  /// Set method call handler (Dart receives calls FROM native)
  void setHandler() {
    _channel.setMethodCallHandler((call) async {
      switch (call.method) {
        case 'onBatteryLow':
          final level = call.arguments as int;
          // Handle low battery from native
          return null;
        default:
          throw MissingPluginException('Unknown method: ${call.method}');
      }
    });
  }
}

class NativeApiException implements Exception {
  final String message;
  final String? code;
  NativeApiException(this.message, [this.code]);
  @override
  String toString() => 'NativeApiException($code): $message';
}

/// Android (Kotlin):
/// ```kotlin
/// MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "com.app/battery")
///   .setMethodCallHandler { call, result ->
///     when (call.method) {
///       "getBatteryLevel" -> {
///         val level = getBatteryLevel() // native implementation
///         if (level != -1) result.success(level)
///         else result.error("UNAVAILABLE", "Battery level not available", null)
///       }
///       else -> result.notImplemented()
///     }
///   }
/// ```
///
/// iOS (Swift):
/// ```swift
/// let channel = FlutterMethodChannel(name: "com.app/battery", binaryMessenger: controller.binaryMessenger)
/// channel.setMethodCallHandler { (call, result) in
///   switch call.method {
///     case "getBatteryLevel":
///       let level = UIDevice.current.batteryLevel
///       result(Int(level * 100))
///     default:
///       result(FlutterMethodNotImplemented)
///   }
/// }
/// ```
```

### Pattern 102.2: EventChannel (Streaming)

```dart
/// EventChannel for continuous native data streams
class SensorChannel {
  static const _channel = EventChannel('com.app/accelerometer');

  /// Listen to accelerometer data stream
  Stream<AccelerometerData> get stream {
    return _channel.receiveBroadcastStream().map((event) {
      final data = Map<String, double>.from(event);
      return AccelerometerData(
        x: data['x'] ?? 0,
        y: data['y'] ?? 0,
        z: data['z'] ?? 0,
      );
    });
  }
}

class AccelerometerData {
  final double x, y, z;
  AccelerometerData({required this.x, required this.y, required this.z});
}

/// Android EventChannel setup (Kotlin):
/// ```kotlin
/// EventChannel(messenger, "com.app/accelerometer")
///   .setStreamHandler(object : EventChannel.StreamHandler {
///     override fun onListen(arguments: Any?, events: EventChannel.EventSink) {
///       sensorManager.registerListener(object : SensorEventListener {
///         override fun onSensorChanged(event: SensorEvent) {
///           events.success(mapOf("x" to event.values[0], "y" to event.values[1], "z" to event.values[2]))
///         }
///       }, accelerometer, SensorManager.SENSOR_DELAY_UI)
///     }
///     override fun onCancel(arguments: Any?) { sensorManager.unregisterListener(listener) }
///   })
/// ```
```

### Pattern 102.3: BasicMessageChannel (Binary/JSON)

```dart
/// BasicMessageChannel for structured data exchange
class ConfigChannel {
  static final _channel = BasicMessageChannel<Map<dynamic, dynamic>>(
    'com.app/config',
    StandardMessageCodec(),
  );

  /// Send config to native side
  Future<void> setConfig(Map<String, dynamic> config) async {
    await _channel.send(config);
  }

  /// Receive config updates from native
  void listen(void Function(Map<String, dynamic>) onData) {
    _channel.setMessageHandler((message) async {
      if (message != null) {
        onData(Map<String, dynamic>.from(message));
      }
      return null;
    });
  }
}
```

### Pattern 102.4: Platform-Specific UI

```dart
import 'dart:io';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

/// Adaptive widgets — Material on Android, Cupertino on iOS
class AdaptiveDialog {
  static Future<bool?> show(
    BuildContext context, {
    required String title,
    required String content,
    String confirmText = 'OK',
    String cancelText = 'Cancel',
  }) {
    if (Platform.isIOS) {
      return showCupertinoDialog<bool>(
        context: context,
        builder: (ctx) => CupertinoAlertDialog(
          title: Text(title),
          content: Text(content),
          actions: [
            CupertinoDialogAction(
              isDestructiveAction: true,
              onPressed: () => Navigator.pop(ctx, false),
              child: Text(cancelText),
            ),
            CupertinoDialogAction(
              onPressed: () => Navigator.pop(ctx, true),
              child: Text(confirmText),
            ),
          ],
        ),
      );
    }
    return showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(title),
        content: Text(content),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text(cancelText)),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: Text(confirmText)),
        ],
      ),
    );
  }
}
```

### Pattern 102.5: Plugin Development

```dart
/// Federated plugin structure (multi-platform)
///
/// Package structure:
/// my_plugin/                  (app-facing package)
///   lib/my_plugin.dart        (platform interface import)
/// my_plugin_platform_interface/  (platform interface)
///   lib/my_plugin_platform_interface.dart
/// my_plugin_android/          (Android implementation)
///   lib/my_plugin_android.dart
///   android/src/main/kotlin/  (native code)
/// my_plugin_ios/              (iOS implementation)
///   lib/my_plugin_ios.dart
///   ios/Classes/              (native code)

/// Platform interface (abstract)
abstract class MyPluginPlatform {
  static MyPluginPlatform _instance = _DefaultMyPlugin();
  static MyPluginPlatform get instance => _instance;
  static set instance(MyPluginPlatform instance) => _instance = instance;

  Future<String?> getPlatformVersion();
}

class _DefaultMyPlugin extends MyPluginPlatform {
  @override
  Future<String?> getPlatformVersion() =>
      throw UnimplementedError('getPlatformVersion() not implemented');
}

/// App-facing API
class MyPlugin {
  Future<String?> getPlatformVersion() =>
      MyPluginPlatform.instance.getPlatformVersion();
}
```

---

## MUST DO

- Always handle PlatformException and MissingPluginException
- Use const channel names matching between Dart and native code
- Implement setMethodCallHandler for native→Dart calls
- Cancel EventChannel subscriptions in dispose() to prevent leaks
- Test on both Android and iOS (channel implementations differ)

## MUST NOT DO

- Pass non-serializable objects through channels (only primitives, maps, lists)
- Forget to call result.notImplemented() for unknown method calls (native side)
- Use MethodChannel for high-frequency data (use EventChannel instead)
- Block the platform thread in native handlers (use background threads)
- Hardcode channel names across Dart and native files (use constants)

---

## References

- [Platform Channels](https://docs.flutter.dev/platform-integration/platform-channels)
- [Writing Custom Platform Plugins](https://docs.flutter.dev/packages-and-plugins/developing-packages)
