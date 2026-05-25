# Flutter Secure Storage + Biometrics Specialist
# Flutter セキュアストレージ＋生体認証スペシャリスト
# Chuyen Gia Secure Storage Va Sinh Trac Hoc Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Core, Data |
| **Directory Pattern** | `lib/core/security/`, `lib/core/network/` |
| **Variant** | ALL |
| **Naming Convention** | `secure_storage_service.dart`, `biometric_service.dart`. Classes: `SecureStorageService`, `BiometricService` |
| **Imports From** | Core (error types) |
| **Cannot Import** | Domain, Presentation, Features |
| **Pattern Numbers** | 88.1–88.5 |
| **Source Paths** | `lib/core/security/*.dart` |
| **File Count** | 2-3 security service files |
| **Imported By** | Core (DI container registers services), Data (repo impls use secure storage for token) |
| **Dependencies** | flutter_secure_storage ^9.0.0, local_auth ^2.2.0 |
| **When To Use** | Storing sensitive data (tokens, keys), biometric authentication setup |
| **Source Skeleton** | `lib/core/security/secure_storage_service.dart`, `lib/core/security/biometric_service.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate secure storage service for encrypted key-value persistence and biometric authentication with fallback to PIN/pattern |
| **Activation Trigger** | files: lib/core/security/*.dart; keywords: secureStorage, biometric, localAuth, tokenStorage, keychain |

---

## Patterns

### Pattern 88.1: flutter_secure_storage Setup

```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Encrypted key-value storage using Keychain (iOS) / Keystore (Android)
class SecureStorageService {
  final FlutterSecureStorage _storage;

  SecureStorageService({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(
                encryptedSharedPreferences: true,
                // Use EncryptedSharedPreferences (API 23+)
                // Automatically handles key migration
              ),
              iOptions: IOSOptions(
                accessibility: KeychainAccessibility.first_unlock_this_device,
                // Available after first unlock, not synced to iCloud
              ),
            );

  Future<void> write({required String key, required String value}) async {
    await _storage.write(key: key, value: value);
  }

  Future<String?> read({required String key}) async {
    return _storage.read(key: key);
  }

  Future<void> delete({required String key}) async {
    await _storage.delete(key: key);
  }

  Future<void> deleteAll() async {
    await _storage.deleteAll();
  }

  Future<bool> containsKey({required String key}) async {
    return _storage.containsKey(key: key);
  }

  Future<Map<String, String>> readAll() async {
    return _storage.readAll();
  }
}
```

### Pattern 88.2: Token Storage

```dart
/// Secure token persistence with type-safe keys
class TokenStorageService {
  static const _accessTokenKey = 'access_token';
  static const _refreshTokenKey = 'refresh_token';
  static const _tokenExpiryKey = 'token_expiry';

  final SecureStorageService _storage;

  TokenStorageService(this._storage);

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
    required DateTime expiry,
  }) async {
    await Future.wait([
      _storage.write(key: _accessTokenKey, value: accessToken),
      _storage.write(key: _refreshTokenKey, value: refreshToken),
      _storage.write(
        key: _tokenExpiryKey,
        value: expiry.toIso8601String(),
      ),
    ]);
  }

  Future<String?> get accessToken =>
      _storage.read(key: _accessTokenKey);

  Future<String?> get refreshToken =>
      _storage.read(key: _refreshTokenKey);

  Future<DateTime?> get tokenExpiry async {
    final value = await _storage.read(key: _tokenExpiryKey);
    return value != null ? DateTime.tryParse(value) : null;
  }

  Future<bool> get hasValidToken async {
    final token = await accessToken;
    final expiry = await tokenExpiry;
    if (token == null || expiry == null) return false;
    return expiry.isAfter(DateTime.now());
  }

  Future<void> clearTokens() async {
    await Future.wait([
      _storage.delete(key: _accessTokenKey),
      _storage.delete(key: _refreshTokenKey),
      _storage.delete(key: _tokenExpiryKey),
    ]);
  }
}
```

### Pattern 88.3: Biometric Authentication

```dart
import 'package:local_auth/local_auth.dart';
import 'package:local_auth/error_codes.dart' as auth_error;

class BiometricService {
  final LocalAuthentication _localAuth;

  BiometricService({LocalAuthentication? localAuth})
      : _localAuth = localAuth ?? LocalAuthentication();

  /// Check if device supports biometric authentication
  Future<bool> get isAvailable async {
    final canCheck = await _localAuth.canCheckBiometrics;
    final isSupported = await _localAuth.isDeviceSupported();
    return canCheck && isSupported;
  }

  /// Get available biometric types
  Future<List<BiometricType>> get availableBiometrics =>
      _localAuth.getAvailableBiometrics();

  /// Authenticate with biometrics, fallback to PIN/pattern
  Future<bool> authenticate({
    required String reason,
    bool biometricOnly = false,
  }) async {
    try {
      return await _localAuth.authenticate(
        localizedReason: reason,
        options: AuthenticationOptions(
          stickyAuth: true, // Keep auth dialog on app pause
          biometricOnly: biometricOnly,
          useErrorDialogs: true, // System error dialogs
        ),
      );
    } on PlatformException catch (e) {
      switch (e.code) {
        case auth_error.notAvailable:
          // Biometrics not enrolled — fallback to PIN
          return _localAuth.authenticate(
            localizedReason: reason,
            options: const AuthenticationOptions(biometricOnly: false),
          );
        case auth_error.lockedOut:
        case auth_error.permanentlyLockedOut:
          throw BiometricLockedException(e.message ?? 'Biometric locked out');
        default:
          throw BiometricException(e.message ?? 'Authentication failed');
      }
    }
  }
}

class BiometricLockedException implements Exception {
  final String message;
  BiometricLockedException(this.message);
}

class BiometricException implements Exception {
  final String message;
  BiometricException(this.message);
}
```

### Pattern 88.4: Sensitive Data Encryption

```dart
import 'dart:convert';
import 'dart:typed_data';
import 'package:pointycastle/pointycastle.dart';

/// AES-256-GCM encryption for local database fields
class EncryptionHelper {
  final SecureStorageService _storage;
  static const _encKeyAlias = 'data_encryption_key';

  EncryptionHelper(this._storage);

  /// Get or create encryption key (stored in secure storage)
  Future<Uint8List> _getOrCreateKey() async {
    final existing = await _storage.read(key: _encKeyAlias);
    if (existing != null) {
      return base64Decode(existing);
    }

    // Generate 256-bit random key
    final secureRandom = SecureRandom('Fortuna')
      ..seed(KeyParameter(
        Uint8List.fromList(
          List.generate(32, (_) => DateTime.now().microsecond % 256),
        ),
      ));
    final key = secureRandom.nextBytes(32);
    await _storage.write(key: _encKeyAlias, value: base64Encode(key));
    return key;
  }

  /// Encrypt string data → base64 encoded ciphertext
  Future<String> encrypt(String plaintext) async {
    final key = await _getOrCreateKey();
    final iv = Uint8List.fromList(
      List.generate(12, (_) => DateTime.now().microsecond % 256),
    );

    final cipher = GCMBlockCipher(AESEngine())
      ..init(true, AEADParameters(KeyParameter(key), 128, iv, Uint8List(0)));

    final input = Uint8List.fromList(utf8.encode(plaintext));
    final output = cipher.process(input);

    // Prepend IV to ciphertext for decryption
    final result = Uint8List(iv.length + output.length);
    result.setAll(0, iv);
    result.setAll(iv.length, output);
    return base64Encode(result);
  }

  /// Decrypt base64 ciphertext → plaintext string
  Future<String> decrypt(String ciphertext) async {
    final key = await _getOrCreateKey();
    final data = base64Decode(ciphertext);

    final iv = data.sublist(0, 12);
    final encrypted = data.sublist(12);

    final cipher = GCMBlockCipher(AESEngine())
      ..init(false, AEADParameters(KeyParameter(key), 128, iv, Uint8List(0)));

    final output = cipher.process(Uint8List.fromList(encrypted));
    return utf8.decode(output);
  }
}
```

### Pattern 88.5: Secure Data Cleanup

```dart
/// Clear all sensitive data on logout or security event
class SecureCleanupService {
  final SecureStorageService _secureStorage;
  final TokenStorageService _tokenStorage;

  SecureCleanupService(this._secureStorage, this._tokenStorage);

  /// Full cleanup on user logout
  Future<void> onLogout() async {
    await _tokenStorage.clearTokens();
    // Clear session-specific data, keep device-level keys
    await _secureStorage.delete(key: 'session_id');
    await _secureStorage.delete(key: 'user_profile_cache');
  }

  /// Nuclear cleanup — clear everything (uninstall detection, security breach)
  Future<void> onSecurityBreach() async {
    await _secureStorage.deleteAll();
  }

  /// Detect app reinstall (iOS Keychain persists across installs)
  Future<bool> detectReinstall() async {
    const installKey = 'app_installed_marker';
    final hasMarker = await _secureStorage.containsKey(key: installKey);
    if (!hasMarker) {
      // First install OR reinstall — clear stale Keychain data
      await _secureStorage.deleteAll();
      await _secureStorage.write(key: installKey, value: 'true');
      return true;
    }
    return false;
  }

  /// Session invalidation — server-triggered force logout
  Future<void> onRemoteInvalidation() async {
    await _tokenStorage.clearTokens();
    // Notify UI layer via event bus or stream
  }
}
```

---

## MUST DO

- Use `encryptedSharedPreferences: true` on Android (API 23+)
- Set iOS Keychain accessibility to `first_unlock_this_device` (no iCloud sync)
- Handle `PlatformException` codes for biometric lockout
- Store encryption keys in secure storage, never in SharedPreferences
- Clear Keychain on iOS reinstall detection (Keychain persists across installs)

## MUST NOT DO

- Store tokens or keys in SharedPreferences (plaintext)
- Hardcode encryption keys or secrets in source code
- Skip biometric fallback to PIN/pattern (accessibility requirement)
- Commit or log sensitive values (tokens, keys) in debug output
- Use ECB mode for AES (use GCM for authenticated encryption)

---

## References

- [flutter_secure_storage](https://pub.dev/packages/flutter_secure_storage)
- [local_auth](https://pub.dev/packages/local_auth)
- [OWASP Mobile — Insecure Data Storage](https://owasp.org/www-project-mobile-top-10/)
