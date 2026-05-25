# Flutter Certificate Pinning Specialist
# Flutter 証明書ピンニングスペシャリスト
# Chuyen Gia Certificate Pinning Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Core, Data |
| **Directory Pattern** | `lib/core/security/`, `lib/core/network/` |
| **Variant** | ALL |
| **Naming Convention** | `ssl_pinning_service.dart`. Class: `SslPinningService` |
| **Imports From** | Core (Dio client for interceptor) |
| **Cannot Import** | Domain, Presentation, Features |
| **Pattern Numbers** | 90.1–90.4 |
| **Source Paths** | `lib/core/network/*.dart` |
| **File Count** | 1-2 pinning config files |
| **Imported By** | Core (Dio client setup uses pinning) |
| **Dependencies** | dio ^5.4.0 (HttpClientAdapter) |
| **When To Use** | MITM attack prevention, enforcing trusted server certificates |
| **Source Skeleton** | `lib/core/network/ssl_pinning_service.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate SSL certificate pinning with SHA-256 pin management, rotation support, and Dart code obfuscation |
| **Activation Trigger** | files: lib/core/network/*ssl*.dart, lib/core/network/*pinning*.dart; keywords: certificatePinning, sslPinning, obfuscation, mitm |

---

## Patterns

### Pattern 90.1: SSL Pinning Setup

```dart
import 'dart:io';
import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:dio/dio.dart';
import 'package:dio/io.dart';

class SslPinningService {
  /// SHA-256 pins of server certificate public keys
  /// Generate with: openssl s_client -connect api.example.com:443 | \
  ///   openssl x509 -pubkey -noout | openssl pkey -pubin -outform der | \
  ///   openssl dgst -sha256 -binary | openssl enc -base64
  final List<String> _trustedPins;

  SslPinningService(this._trustedPins);

  /// Apply certificate pinning to Dio instance
  void apply(Dio dio) {
    final adapter = dio.httpClientAdapter as IOHttpClientAdapter;
    adapter.createHttpClient = () {
      final client = HttpClient();
      client.badCertificateCallback = _validateCertificate;
      return client;
    };
  }

  bool _validateCertificate(X509Certificate cert, String host, int port) {
    // Extract DER-encoded certificate and compute SHA-256 hash
    final certBytes = cert.der;
    final hash = sha256.convert(certBytes);
    final pin = base64Encode(hash.bytes);

    // Check against trusted pins (current + backup)
    return _trustedPins.contains(pin);
  }
}

// Usage in DI setup
Dio createPinnedDio(List<String> pins) {
  final dio = Dio(BaseOptions(baseUrl: 'https://api.example.com'));
  SslPinningService(pins).apply(dio);
  return dio;
}
```

### Pattern 90.2: Certificate Rotation

```dart
/// Multiple pins support for graceful certificate rotation
class RotatablePinConfig {
  /// Current production certificate pin
  final String primaryPin;

  /// Backup pin — next certificate (pre-deployed before rotation)
  final String backupPin;

  /// Optional: remote pin update URL (for emergency rotation without app update)
  final String? remotePinUrl;

  const RotatablePinConfig({
    required this.primaryPin,
    required this.backupPin,
    this.remotePinUrl,
  });

  List<String> get allPins => [primaryPin, backupPin];
}

/// Pin rotation manager with remote update support
class PinRotationManager {
  final RotatablePinConfig _config;
  final Dio _unpinnedDio; // Separate Dio without pinning for pin updates
  List<String> _activePins;

  PinRotationManager(this._config, this._unpinnedDio)
      : _activePins = _config.allPins;

  /// Check for updated pins from server (emergency rotation)
  Future<void> checkForPinUpdate() async {
    if (_config.remotePinUrl == null) return;

    try {
      final response = await _unpinnedDio.get(_config.remotePinUrl!);
      final remotePins = List<String>.from(response.data['pins']);
      if (remotePins.isNotEmpty) {
        _activePins = remotePins;
      }
    } catch (_) {
      // Fail silently — use existing pins
    }
  }

  List<String> get currentPins => List.unmodifiable(_activePins);
}
```

### Pattern 90.3: Debug vs Release Config

```dart
import 'package:flutter/foundation.dart';

/// Environment-aware SSL pinning configuration
class SslPinningConfig {
  /// Apply pinning ONLY in release mode
  static void configure(Dio dio, List<String> pins) {
    if (kReleaseMode) {
      // Production: strict certificate pinning
      SslPinningService(pins).apply(dio);
    } else if (kProfileMode) {
      // Profile: pinning enabled but with logging
      SslPinningService(pins).apply(dio);
      debugPrint('[SSL] Profile mode — pinning active with logging');
    } else {
      // Debug: no pinning — allow proxy tools (Charles, mitmproxy)
      final adapter = dio.httpClientAdapter as IOHttpClientAdapter;
      adapter.createHttpClient = () {
        final client = HttpClient();
        // Accept all certificates in debug mode
        client.badCertificateCallback = (cert, host, port) => true;
        return client;
      };
      debugPrint('[SSL] Debug mode — pinning DISABLED for proxy support');
    }
  }

  /// QA environment: allow specific proxy certificate
  static void configureForQA(Dio dio, List<String> pins, String proxyCertPin) {
    final allPins = [...pins, proxyCertPin];
    SslPinningService(allPins).apply(dio);
  }
}
```

### Pattern 90.4: Obfuscation

```dart
/// Dart code obfuscation build configuration
///
/// Build with obfuscation:
///   flutter build apk --obfuscate --split-debug-info=debug-info/
///   flutter build ipa --obfuscate --split-debug-info=debug-info/
///
/// Store symbol map for crash reporting:
///   debug-info/ → upload to Firebase Crashlytics or Sentry
///
/// ProGuard rules for Android (android/app/proguard-rules.pro):
///   -keep class io.flutter.** { *; }
///   -keep class io.flutter.plugins.** { *; }
///   -dontwarn io.flutter.embedding.**
///
/// android/app/build.gradle:
///   buildTypes {
///     release {
///       minifyEnabled true
///       shrinkResources true
///       proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'),
///                     'proguard-rules.pro'
///     }
///   }

// Pin storage obfuscation — don't store pins as plain string literals
class ObfuscatedPins {
  /// Store pins as split byte arrays to resist static analysis
  static String get primaryPin {
    // Split across multiple variables to resist string search
    const p1 = 'sha256/AAAA';
    const p2 = 'BBBB';
    const p3 = 'CCCCCCCC=';
    return '$p1$p2$p3';
  }

  /// Alternative: compute at runtime from embedded cert
  static String computePin(List<int> certDerBytes) {
    final hash = sha256.convert(certDerBytes);
    return 'sha256/${base64Encode(hash.bytes)}';
  }
}
```

---

## MUST DO

- Pin certificate public key hash (not full certificate — survives renewal)
- Include at least 2 pins (primary + backup) for rotation without app update
- Disable pinning in debug mode to allow proxy tools for QA
- Store debug-info symbols for crash report deobfuscation
- Enable ProGuard minification + shrinkResources for Android release

## MUST NOT DO

- Pin against full certificate (breaks on routine renewal)
- Use only one pin (rotation = broken app until forced update)
- Enable pinning in debug mode (blocks Charles/mitmproxy)
- Store pins as single string literal (easy to find via static analysis)
- Skip `--split-debug-info` when using `--obfuscate` (unreadable crash reports)

---

## References

- [Dio SSL Pinning](https://pub.dev/packages/dio)
- [OWASP Certificate Pinning Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Pinning_Cheat_Sheet.html)
- [Flutter Obfuscation](https://docs.flutter.dev/deployment/obfuscate)
