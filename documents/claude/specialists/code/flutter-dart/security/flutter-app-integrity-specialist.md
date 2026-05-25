# Flutter App Integrity Specialist
# Flutter アプリ完全性検証スペシャリスト
# Chuyen Gia Kiem Tra Toan Ven Ung Dung Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Core, Data |
| **Directory Pattern** | `lib/core/security/`, `lib/core/network/` |
| **Variant** | ALL |
| **Naming Convention** | `app_integrity_service.dart`, `integrity_checker.dart`. Classes: `AppIntegrityService`, `IntegrityChecker` |
| **Imports From** | Core (platform channels, network) |
| **Cannot Import** | Domain, Presentation, Features |
| **Pattern Numbers** | 96.1–96.4 |
| **Source Paths** | `lib/core/security/*.dart` |
| **File Count** | 2-3 integrity check files |
| **Imported By** | Core (app startup gate), Data (API requests include attestation token) |
| **Dependencies** | Platform channels for Play Integrity / App Attest APIs |
| **When To Use** | Banking/gov: runtime app integrity verification — anti-repackaging, signature check, attestation |
| **Source Skeleton** | `lib/core/security/app_integrity_service.dart`, `lib/core/security/integrity_checker.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate app integrity verification with runtime checksum validation, Google Play Integrity API, Apple App Attest, and anti-repackaging detection |
| **Activation Trigger** | files: lib/core/security/*integrity*.dart; keywords: appIntegrity, playIntegrity, appAttest, antiRepackaging, signatureVerification |

---

## Patterns

### Pattern 96.1: App Signature Verification

```dart
import 'package:flutter/services.dart';

/// Runtime package signature verification
class AppSignatureChecker {
  static const _channel = MethodChannel('com.app/integrity');

  /// Get current app signature hash
  Future<String?> getSignatureHash() async {
    try {
      return await _channel.invokeMethod<String>('getSignatureHash');
    } catch (_) {
      return null;
    }
  }

  /// Verify app signature matches expected value
  /// Expected hash should be fetched from server, not hardcoded
  Future<bool> verifySignature(String expectedHash) async {
    final currentHash = await getSignatureHash();
    if (currentHash == null) return false;
    return currentHash == expectedHash;
  }

  /// Get package info for server-side verification
  Future<Map<String, String>> getPackageInfo() async {
    final result = await _channel.invokeMapMethod<String, String>('getPackageInfo');
    return result ?? {};
    // Returns: { packageName, versionCode, versionName, installerPackage }
  }
}

/// Android native implementation (Kotlin):
///
/// ```kotlin
/// // Get signing certificate SHA-256
/// val packageInfo = packageManager.getPackageInfo(
///     packageName,
///     PackageManager.GET_SIGNING_CERTIFICATES
/// )
/// val signature = packageInfo.signingInfo.apkContentsSigners[0]
/// val digest = MessageDigest.getInstance("SHA-256")
/// val hash = digest.digest(signature.toByteArray())
/// val hexHash = hash.joinToString("") { "%02x".format(it) }
/// ```
///
/// iOS native implementation (Swift):
///
/// ```swift
/// // Verify code signing identity
/// let task = SecTaskCreateFromSelf(nil)!
/// let signingInfo = SecTaskCopySigningIdentifier(task, nil)
/// ```
```

### Pattern 96.2: Code Integrity

```dart
/// Runtime code integrity verification
class CodeIntegrityChecker {
  static const _channel = MethodChannel('com.app/integrity');

  /// Verify critical native library checksums
  Future<bool> verifyNativeLibraries() async {
    try {
      final result = await _channel.invokeMethod<bool>('verifyLibraries');
      return result ?? false;
    } catch (_) {
      return false; // Fail-secure
    }
  }

  /// Check if app binary has been modified (repackaged)
  Future<IntegrityResult> checkBinaryIntegrity() async {
    try {
      final result = await _channel.invokeMapMethod<String, dynamic>(
        'checkBinaryIntegrity',
      );

      return IntegrityResult(
        isValid: result?['valid'] == true,
        details: result?['details'] as String?,
        checksumMatch: result?['checksum_match'] == true,
      );
    } catch (e) {
      return IntegrityResult(
        isValid: false,
        details: 'Integrity check failed: $e',
        checksumMatch: false,
      );
    }
  }

  /// Tamper response — call when integrity violation detected
  Future<void> onTamperDetected(IntegrityResult result) async {
    // Report to server
    // Clear sensitive local data
    // Show tamper warning UI
    // Optionally: force close app
  }
}

class IntegrityResult {
  final bool isValid;
  final String? details;
  final bool checksumMatch;

  IntegrityResult({
    required this.isValid,
    this.details,
    required this.checksumMatch,
  });
}
```

### Pattern 96.3: Play Integrity / App Attest

```dart
/// Google Play Integrity API (Android) + Apple App Attest (iOS)
class AttestationService {
  static const _channel = MethodChannel('com.app/attestation');
  final Dio _dio;

  AttestationService(this._dio);

  /// Request attestation token from platform
  Future<String?> getAttestationToken(String nonce) async {
    try {
      return await _channel.invokeMethod<String>('getAttestationToken', {
        'nonce': nonce,
      });
    } catch (e) {
      return null;
    }
  }

  /// Full attestation flow: get token → verify on server
  Future<AttestationVerdict> attest() async {
    // Step 1: Get nonce from server
    final nonceResponse = await _dio.get('/attestation/nonce');
    final nonce = nonceResponse.data['nonce'] as String;

    // Step 2: Get platform attestation token
    final token = await getAttestationToken(nonce);
    if (token == null) {
      return AttestationVerdict.unavailable;
    }

    // Step 3: Send token to server for verification
    // Server verifies with Google/Apple APIs — NEVER verify client-side
    final verifyResponse = await _dio.post('/attestation/verify', data: {
      'token': token,
      'nonce': nonce,
    });

    return AttestationVerdict.fromJson(verifyResponse.data);
  }
}

class AttestationVerdict {
  final bool deviceIntegrity;
  final bool appIntegrity;
  final bool accountLicensed;
  final String? rawVerdict;

  AttestationVerdict({
    required this.deviceIntegrity,
    required this.appIntegrity,
    required this.accountLicensed,
    this.rawVerdict,
  });

  static AttestationVerdict get unavailable => AttestationVerdict(
        deviceIntegrity: false,
        appIntegrity: false,
        accountLicensed: false,
        rawVerdict: 'UNAVAILABLE',
      );

  factory AttestationVerdict.fromJson(Map<String, dynamic> json) =>
      AttestationVerdict(
        deviceIntegrity: json['device_integrity'] == true,
        appIntegrity: json['app_integrity'] == true,
        accountLicensed: json['account_licensed'] == true,
        rawVerdict: json['raw_verdict'],
      );

  bool get isFullyTrusted => deviceIntegrity && appIntegrity && accountLicensed;
}

/// Android native implementation (Kotlin):
///
/// ```kotlin
/// // Google Play Integrity API
/// val integrityManager = IntegrityManagerFactory.create(context)
/// val tokenRequest = IntegrityTokenRequest.builder()
///     .setNonce(nonce) // Server-generated nonce
///     .build()
/// val tokenResponse = integrityManager.requestIntegrityToken(tokenRequest).await()
/// val token = tokenResponse.token()
/// // Send token to server — server calls Google API to decrypt and verify
/// ```
///
/// iOS native implementation (Swift):
///
/// ```swift
/// // Apple App Attest
/// let attestService = DCAppAttestService.shared
/// if attestService.isSupported {
///     attestService.generateKey { keyId, error in
///         guard let keyId = keyId else { return }
///         let hash = Data(SHA256.hash(data: Data(nonce.utf8)))
///         attestService.attestKey(keyId, clientDataHash: hash) { attestation, error in
///             // Send attestation to server for verification
///         }
///     }
/// }
/// ```
```

### Pattern 96.4: Anti-Repackaging

```dart
/// Detect modified/repackaged APK or IPA
class AntiRepackagingService {
  static const _channel = MethodChannel('com.app/integrity');

  /// Check installer source (was app installed from official store?)
  Future<InstallerInfo> checkInstaller() async {
    final result = await _channel.invokeMapMethod<String, String>(
      'getInstallerInfo',
    );

    final installer = result?['installer'] ?? 'unknown';
    return InstallerInfo(
      packageName: installer,
      isTrusted: _trustedInstallers.contains(installer),
    );
  }

  static const _trustedInstallers = {
    'com.android.vending',       // Google Play Store
    'com.amazon.venezia',        // Amazon Appstore
    'com.huawei.appmarket',      // Huawei AppGallery
    'com.samsung.android.vending', // Samsung Galaxy Store
    // iOS: App Store is the only installer — verified by OS
  };

  /// Comprehensive anti-repackaging check
  Future<RepackagingResult> detect() async {
    final results = <String, bool>{};

    // Check 1: Installer source
    final installer = await checkInstaller();
    results['trusted_installer'] = installer.isTrusted;

    // Check 2: App signature
    final sigChecker = AppSignatureChecker();
    final expectedHash = await _fetchExpectedHash();
    if (expectedHash != null) {
      results['valid_signature'] = await sigChecker.verifySignature(expectedHash);
    }

    // Check 3: Binary integrity
    final integrityChecker = CodeIntegrityChecker();
    final integrity = await integrityChecker.checkBinaryIntegrity();
    results['binary_intact'] = integrity.isValid;

    // Check 4: Debug flags in release
    results['not_debuggable'] = !_isDebuggable();

    final allPassed = results.values.every((v) => v);
    return RepackagingResult(
      isGenuine: allPassed,
      checks: results,
    );
  }

  bool _isDebuggable() {
    bool debuggable = false;
    assert(() {
      debuggable = true;
      return true;
    }());
    return debuggable;
  }

  Future<String?> _fetchExpectedHash() async {
    // Fetch from server — never hardcode
    return null;
  }
}

class InstallerInfo {
  final String packageName;
  final bool isTrusted;

  InstallerInfo({required this.packageName, required this.isTrusted});
}

class RepackagingResult {
  final bool isGenuine;
  final Map<String, bool> checks;

  RepackagingResult({required this.isGenuine, required this.checks});

  String get summary {
    final failed = checks.entries.where((e) => !e.value).map((e) => e.key);
    if (failed.isEmpty) return 'All integrity checks passed';
    return 'Failed checks: ${failed.join(', ')}';
  }
}
```

---

## MUST DO

- Verify attestation tokens SERVER-SIDE only (never client-side)
- Use server-generated nonce for attestation requests (prevent replay)
- Include both Google Play Integrity API AND Apple App Attest implementations
- Check installer source to detect sideloaded (potentially tampered) apps
- Fail-secure — treat integrity check failures as compromised

## MUST NOT DO

- Verify attestation tokens on the client (trivially bypassable)
- Hardcode expected signature hashes in source code (fetch from server)
- Use SafetyNet (deprecated — use Play Integrity API)
- Block all sideloaded installs (some enterprise deployments use MDM)
- Skip binary integrity check in release builds

---

## References

- [Google Play Integrity API](https://developer.android.com/google/play/integrity)
- [Apple App Attest](https://developer.apple.com/documentation/devicecheck/establishing_your_app_s_integrity)
- [OWASP Mobile — Tampering and Reverse Engineering](https://owasp.org/www-project-mobile-top-10/)
