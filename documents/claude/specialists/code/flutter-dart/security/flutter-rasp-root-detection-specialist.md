# Flutter RASP + Root Detection Specialist
# Flutter RASP＋ルート検知スペシャリスト
# Chuyen Gia RASP Va Phat Hien Root Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Core, Data |
| **Directory Pattern** | `lib/core/security/`, `lib/core/network/` |
| **Variant** | ALL |
| **Naming Convention** | `rasp_service.dart`, `device_security_checker.dart`. Classes: `RaspService`, `DeviceSecurityChecker` |
| **Imports From** | Core (error types, logger) |
| **Cannot Import** | Domain, Presentation, Features |
| **Pattern Numbers** | 91.1–91.5 |
| **Source Paths** | `lib/core/security/*.dart` |
| **File Count** | 2-3 RASP service files |
| **Imported By** | Core (app startup check), Presentation (security gate widget) |
| **Dependencies** | flutter_jailbreak_detection ^1.10.0, safe_device ^1.1.0 |
| **When To Use** | Banking/gov: runtime tamper detection, root/jailbreak/emulator/debugger blocking |
| **Source Skeleton** | `lib/core/security/rasp_service.dart`, `lib/core/security/device_security_checker.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate RASP runtime protection with root/jailbreak detection, debugger detection, emulator detection, and configurable response policy |
| **Activation Trigger** | files: lib/core/security/*rasp*.dart; keywords: rasp, rootDetection, jailbreak, emulatorDetection, debuggerDetection, hookPrevention |

---

## Patterns

### Pattern 91.1: Root/Jailbreak Detection

```dart
import 'package:flutter_jailbreak_detection/flutter_jailbreak_detection.dart';
import 'dart:io';

class DeviceSecurityChecker {
  /// Check if device is rooted (Android) or jailbroken (iOS)
  Future<bool> get isCompromised async {
    try {
      return await FlutterJailbreakDetection.jailbroken;
    } catch (_) {
      // If detection fails, assume compromised (fail-secure)
      return true;
    }
  }

  /// Check if app is running in developer mode
  Future<bool> get isDeveloperMode async {
    try {
      return await FlutterJailbreakDetection.developerMode;
    } catch (_) {
      return false;
    }
  }

  /// Android-specific: Play Integrity API (replaces SafetyNet)
  /// Requires server-side verification of integrity verdict
  Future<IntegrityVerdict> checkPlayIntegrity(String nonce) async {
    // Platform channel call to Android native code
    // Returns: MEETS_DEVICE_INTEGRITY, MEETS_BASIC_INTEGRITY, etc.
    throw UnimplementedError(
      'Implement via MethodChannel to Android Play Integrity API',
    );
  }

  /// iOS-specific: DeviceCheck API
  /// Generates device token for server-side verification
  Future<String> getDeviceCheckToken() async {
    // Platform channel call to iOS DeviceCheck framework
    throw UnimplementedError(
      'Implement via MethodChannel to iOS DCDevice.current.generateToken()',
    );
  }
}

enum IntegrityVerdict {
  meetsDeviceIntegrity,
  meetsBasicIntegrity,
  meetsStrongIntegrity,
  failed,
}
```

### Pattern 91.2: Debugger Detection

```dart
import 'dart:developer' as dev;
import 'package:flutter/foundation.dart';

class DebuggerDetector {
  /// Check if app is running in debug mode
  bool get isDebugMode => kDebugMode;

  /// Check if a debugger is attached at runtime
  bool get isDebuggerAttached {
    bool attached = false;
    // assert is only evaluated in debug mode
    assert(() {
      attached = true;
      return true;
    }());
    return attached;
  }

  /// Check if Dart VM service is active (indicates debugger/profiler)
  Future<bool> get isServiceRunning async {
    try {
      final info = await dev.Service.getInfo();
      return info.serverUri != null;
    } catch (_) {
      return false;
    }
  }

  /// Combined check with response policy
  Future<SecurityThreat?> evaluate() async {
    if (kReleaseMode) {
      // In release mode, debugger attachment is suspicious
      if (await isServiceRunning) {
        return SecurityThreat(
          type: ThreatType.debugger,
          severity: ThreatSeverity.high,
          message: 'Debugger detected in release mode',
        );
      }
    }
    return null; // No threat
  }
}
```

### Pattern 91.3: Emulator Detection

```dart
import 'dart:io';

class EmulatorDetector {
  /// Multi-signal emulator detection
  Future<bool> get isEmulator async {
    if (Platform.isAndroid) {
      return _checkAndroidEmulator();
    } else if (Platform.isIOS) {
      return _checkIOSSimulator();
    }
    return false;
  }

  bool _checkAndroidEmulator() {
    // Check build fingerprint (common emulator indicators)
    // Requires platform channel to read Build.FINGERPRINT, Build.MODEL, etc.
    //
    // Indicators:
    // - Build.FINGERPRINT contains "generic" or "sdk"
    // - Build.MODEL contains "Emulator" or "sdk"
    // - Build.MANUFACTURER contains "Genymotion"
    // - Build.BRAND starts with "generic"
    // - Build.HARDWARE contains "goldfish" or "ranchu"
    // - No accelerometer/gyroscope sensors
    //
    // Implementation via MethodChannel:
    //   final result = await _channel.invokeMethod('checkEmulator');
    //   return result as bool;
    return false; // Placeholder — implement via platform channel
  }

  bool _checkIOSSimulator() {
    // iOS Simulator detection
    // - TARGET_OS_SIMULATOR preprocessor macro (native side)
    // - No camera available
    // - ProcessInfo.processInfo.environment["SIMULATOR_DEVICE_NAME"] != nil
    //
    // Implementation via MethodChannel:
    //   final result = await _channel.invokeMethod('checkSimulator');
    //   return result as bool;
    return false; // Placeholder — implement via platform channel
  }
}
```

### Pattern 91.4: Hooking Prevention

```dart
/// Detect runtime hooking frameworks (Frida, Xposed)
class HookingDetector {
  /// Check for Frida presence
  Future<bool> get isFridaDetected async {
    // Android checks (via platform channel):
    // 1. Check for frida-server process: /proc/self/maps contains "frida"
    // 2. Check default Frida port (27042) — connect attempt
    // 3. Check for frida-gadget.so in loaded libraries
    //
    // iOS checks (via platform channel):
    // 1. Check for FridaGadget.dylib in loaded images
    // 2. Check for frida-server port
    // 3. Verify code signing integrity

    try {
      // TCP port check — Frida default port
      final socket = await Socket.connect(
        'localhost', 27042,
        timeout: const Duration(milliseconds: 500),
      );
      await socket.close();
      return true; // Port open — Frida likely running
    } on SocketException {
      return false; // Port closed — no Frida
    } catch (_) {
      return false;
    }
  }

  /// Check for Xposed framework (Android only)
  Future<bool> get isXposedDetected async {
    // Platform channel checks:
    // 1. Check for de.robv.android.xposed.XposedBridge class
    // 2. Check /proc/self/maps for XposedBridge.jar
    // 3. Check system properties for xposed.version
    return false; // Implement via platform channel
  }

  /// Verify native library integrity
  Future<bool> get isLibraryTampered async {
    // Compare loaded library checksums against known-good values
    // stored in secure storage or fetched from server
    return false; // Implement via platform channel
  }
}
```

### Pattern 91.5: Response Policy

```dart
/// Configurable response to security threats
enum ThreatType { root, jailbreak, debugger, emulator, frida, xposed, tamper }
enum ThreatSeverity { low, medium, high, critical }
enum ResponseAction { allow, warn, report, block }

class SecurityThreat {
  final ThreatType type;
  final ThreatSeverity severity;
  final String message;

  SecurityThreat({
    required this.type,
    required this.severity,
    required this.message,
  });
}

class RaspService {
  final DeviceSecurityChecker _deviceChecker;
  final DebuggerDetector _debuggerDetector;
  final EmulatorDetector _emulatorDetector;
  final HookingDetector _hookingDetector;
  final Map<ThreatType, ResponseAction> _policy;

  RaspService({
    required DeviceSecurityChecker deviceChecker,
    required DebuggerDetector debuggerDetector,
    required EmulatorDetector emulatorDetector,
    required HookingDetector hookingDetector,
    Map<ThreatType, ResponseAction>? policy,
  })  : _deviceChecker = deviceChecker,
        _debuggerDetector = debuggerDetector,
        _emulatorDetector = emulatorDetector,
        _hookingDetector = hookingDetector,
        _policy = policy ?? _defaultPolicy;

  static const _defaultPolicy = {
    ThreatType.root: ResponseAction.block,
    ThreatType.jailbreak: ResponseAction.block,
    ThreatType.debugger: ResponseAction.warn,
    ThreatType.emulator: ResponseAction.report,
    ThreatType.frida: ResponseAction.block,
    ThreatType.xposed: ResponseAction.block,
    ThreatType.tamper: ResponseAction.block,
  };

  /// Run all security checks and return threats
  Future<List<SecurityThreat>> evaluateAll() async {
    final threats = <SecurityThreat>[];

    if (await _deviceChecker.isCompromised) {
      threats.add(SecurityThreat(
        type: Platform.isIOS ? ThreatType.jailbreak : ThreatType.root,
        severity: ThreatSeverity.critical,
        message: 'Device is rooted/jailbroken',
      ));
    }

    final debugThreat = await _debuggerDetector.evaluate();
    if (debugThreat != null) threats.add(debugThreat);

    if (await _emulatorDetector.isEmulator) {
      threats.add(SecurityThreat(
        type: ThreatType.emulator,
        severity: ThreatSeverity.medium,
        message: 'Running on emulator/simulator',
      ));
    }

    if (await _hookingDetector.isFridaDetected) {
      threats.add(SecurityThreat(
        type: ThreatType.frida,
        severity: ThreatSeverity.critical,
        message: 'Frida hooking framework detected',
      ));
    }

    return threats;
  }

  /// Get response action for a threat
  ResponseAction getAction(SecurityThreat threat) =>
      _policy[threat.type] ?? ResponseAction.report;

  /// Check if any blocking threat exists
  Future<bool> get shouldBlockApp async {
    final threats = await evaluateAll();
    return threats.any((t) => getAction(t) == ResponseAction.block);
  }
}
```

---

## MUST DO

- Combine multiple detection signals (no single check is reliable)
- Use `fail-secure` — if detection fails, treat as compromised
- Make response policy configurable (block for banking, warn for general apps)
- Implement native checks via platform channels (Dart-only checks are bypassable)
- Include both Android (Play Integrity) AND iOS (DeviceCheck/App Attest) approaches

## MUST NOT DO

- Rely solely on Dart-level checks (easily bypassed by hooking)
- Block emulators unconditionally (breaks QA testing — use policy)
- Log detailed security check results in release (aids attackers)
- Use synchronous checks on main thread (blocks UI rendering)
- Hardcode threat response — make it server-configurable for flexibility

---

## References

- [flutter_jailbreak_detection](https://pub.dev/packages/flutter_jailbreak_detection)
- [safe_device](https://pub.dev/packages/safe_device)
- [Google Play Integrity API](https://developer.android.com/google/play/integrity)
- [Apple DeviceCheck](https://developer.apple.com/documentation/devicecheck)
