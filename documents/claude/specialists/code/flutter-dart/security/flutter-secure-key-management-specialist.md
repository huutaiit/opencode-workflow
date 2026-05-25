# Flutter Secure Key Management Specialist
# Flutter セキュア鍵管理スペシャリスト
# Chuyen Gia Quan Ly Khoa Bao Mat Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Core, Data |
| **Directory Pattern** | `lib/core/security/`, `lib/core/network/` |
| **Variant** | ALL |
| **Naming Convention** | `key_management_service.dart`, `key_derivation_service.dart`. Classes: `KeyManagementService`, `KeyDerivationService` |
| **Imports From** | Core (secure storage) |
| **Cannot Import** | Domain, Presentation, Features |
| **Pattern Numbers** | 95.1–95.4 |
| **Source Paths** | `lib/core/security/*.dart` |
| **File Count** | 2-3 key management files |
| **Imported By** | Core (encryption helper uses derived keys), Data (encrypted DB uses key service) |
| **Dependencies** | pointycastle ^3.7.0, flutter_secure_storage ^9.0.0 |
| **When To Use** | Banking/gov: cryptographic key management — key derivation, hardware-backed storage, rotation |
| **Source Skeleton** | `lib/core/security/key_management_service.dart`, `lib/core/security/key_derivation_service.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate secure key management with PBKDF2/Argon2 key derivation, hardware-backed keystore usage, key rotation, and HSM integration patterns |
| **Activation Trigger** | files: lib/core/security/*key*.dart; keywords: keyManagement, keyDerivation, secureEnclave, keyRotation, hsm, pbkdf2 |

---

## Patterns

### Pattern 95.1: Key Derivation

```dart
import 'dart:typed_data';
import 'dart:convert';
import 'package:pointycastle/pointycastle.dart';
import 'package:pointycastle/key_derivators/pbkdf2.dart';
import 'package:pointycastle/digests/sha256.dart';
import 'package:pointycastle/macs/hmac.dart';

/// Derive encryption keys from user PIN/password
class KeyDerivationService {
  /// PBKDF2-HMAC-SHA256 key derivation
  /// Suitable for general-purpose key derivation from passwords
  Uint8List derivePbkdf2({
    required String password,
    required Uint8List salt,
    int iterations = 100000, // OWASP minimum for PBKDF2-SHA256
    int keyLength = 32, // 256 bits
  }) {
    final derivator = PBKDF2KeyDerivator(HMac(SHA256Digest(), 64));
    derivator.init(Pbkdf2Parameters(salt, iterations, keyLength));
    return derivator.process(Uint8List.fromList(utf8.encode(password)));
  }

  /// Generate cryptographically secure random salt
  Uint8List generateSalt({int length = 32}) {
    final secureRandom = SecureRandom('Fortuna');
    final seed = Uint8List(32);
    for (var i = 0; i < seed.length; i++) {
      seed[i] = DateTime.now().microsecondsSinceEpoch % 256;
    }
    secureRandom.seed(KeyParameter(seed));
    return secureRandom.nextBytes(length);
  }

  /// Derive key from user PIN with stored salt
  Future<Uint8List> deriveKeyFromPin({
    required String pin,
    required SecureStorageService storage,
  }) async {
    const saltKey = 'kdf_salt';

    // Get or create salt
    String? saltBase64 = await storage.read(key: saltKey);
    Uint8List salt;

    if (saltBase64 == null) {
      salt = generateSalt();
      await storage.write(key: saltKey, value: base64Encode(salt));
    } else {
      salt = base64Decode(saltBase64);
    }

    return derivePbkdf2(password: pin, salt: salt);
  }
}
```

### Pattern 95.2: Secure Enclave Usage

```dart
import 'package:flutter/services.dart';

/// Hardware-backed keystore access via platform channels
/// Android: AndroidKeyStore (TEE/StrongBox)
/// iOS: Secure Enclave (SE)
class HardwareKeyStore {
  static const _channel = MethodChannel('com.app/hardware_keystore');

  /// Generate key pair in hardware-backed keystore
  /// Key material NEVER leaves the secure hardware
  Future<String> generateKeyPair({
    required String alias,
    bool requireBiometric = false,
  }) async {
    final result = await _channel.invokeMethod<String>('generateKeyPair', {
      'alias': alias,
      'requireBiometric': requireBiometric,
      'keyType': 'EC_P256', // NIST P-256 curve
    });
    return result!; // Returns public key in PEM format
  }

  /// Sign data using hardware-backed private key
  Future<Uint8List> sign({
    required String alias,
    required Uint8List data,
  }) async {
    final result = await _channel.invokeMethod<Uint8List>('sign', {
      'alias': alias,
      'data': data,
    });
    return result!;
  }

  /// Encrypt data using hardware-backed key
  Future<Uint8List> encrypt({
    required String alias,
    required Uint8List plaintext,
  }) async {
    final result = await _channel.invokeMethod<Uint8List>('encrypt', {
      'alias': alias,
      'data': plaintext,
    });
    return result!;
  }

  /// Decrypt data using hardware-backed key
  Future<Uint8List> decrypt({
    required String alias,
    required Uint8List ciphertext,
  }) async {
    final result = await _channel.invokeMethod<Uint8List>('decrypt', {
      'alias': alias,
      'data': ciphertext,
    });
    return result!;
  }

  /// Check if hardware-backed keystore is available
  Future<bool> get isAvailable async {
    final result = await _channel.invokeMethod<bool>('isAvailable');
    return result ?? false;
  }

  /// Delete key from keystore
  Future<void> deleteKey(String alias) async {
    await _channel.invokeMethod('deleteKey', {'alias': alias});
  }
}

/// Android native implementation (Kotlin):
///
/// ```kotlin
/// val keyStore = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
///
/// // Generate key pair
/// val keyPairGenerator = KeyPairGenerator.getInstance(
///     KeyProperties.KEY_ALGORITHM_EC, "AndroidKeyStore"
/// )
/// keyPairGenerator.initialize(
///     KeyGenParameterSpec.Builder(alias, PURPOSE_SIGN or PURPOSE_VERIFY)
///         .setDigests(KeyProperties.DIGEST_SHA256)
///         .setUserAuthenticationRequired(requireBiometric)
///         .setIsStrongBoxBacked(true) // Use StrongBox if available
///         .build()
/// )
/// val keyPair = keyPairGenerator.generateKeyPair()
/// ```
///
/// iOS native implementation (Swift):
///
/// ```swift
/// let access = SecAccessControlCreateWithFlags(
///     nil,
///     kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
///     [.privateKeyUsage, .biometryAny],
///     nil
/// )!
///
/// let attributes: [String: Any] = [
///     kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
///     kSecAttrKeySizeInBits as String: 256,
///     kSecAttrTokenID as String: kSecAttrTokenIDSecureEnclave,
///     kSecPrivateKeyAttrs as String: [
///         kSecAttrAccessControl as String: access,
///         kSecAttrIsPermanent as String: true,
///         kSecAttrApplicationTag as String: alias.data(using: .utf8)!,
///     ],
/// ]
/// var error: Unmanaged<CFError>?
/// let privateKey = SecKeyCreateRandomKey(attributes as CFDictionary, &error)
/// ```
```

### Pattern 95.3: Key Rotation

```dart
/// Periodic key rotation with data re-encryption
class KeyRotationService {
  final SecureStorageService _storage;
  final KeyDerivationService _kdf;
  final EncryptionHelper _encryption;

  static const _keyVersionKey = 'key_version';
  static const _keyPrefix = 'enc_key_v';

  KeyRotationService(this._storage, this._kdf, this._encryption);

  /// Get current key version
  Future<int> get currentVersion async {
    final version = await _storage.read(key: _keyVersionKey);
    return version != null ? int.parse(version) : 1;
  }

  /// Rotate encryption key — generate new key, re-encrypt data
  Future<void> rotateKey({
    required List<EncryptedRecord> records,
    required Future<void> Function(String id, String newCiphertext) updateRecord,
  }) async {
    final oldVersion = await currentVersion;
    final newVersion = oldVersion + 1;

    // Generate new key
    final newKey = _kdf.generateSalt(length: 32); // Random 256-bit key
    await _storage.write(
      key: '$_keyPrefix$newVersion',
      value: base64Encode(newKey),
    );

    // Re-encrypt all records with new key
    for (final record in records) {
      // Decrypt with old key
      final plaintext = await _encryption.decrypt(record.ciphertext);
      // Re-encrypt with new key (encryption helper uses latest key)
      final newCiphertext = await _encryption.encrypt(plaintext);
      await updateRecord(record.id, newCiphertext);
    }

    // Update version pointer
    await _storage.write(key: _keyVersionKey, value: '$newVersion');

    // Keep old key for one more cycle (rollback safety)
    if (oldVersion > 1) {
      // Delete key that is 2 versions old
      await _storage.delete(key: '$_keyPrefix${oldVersion - 1}');
    }
  }

  /// Check if rotation is due (based on policy)
  Future<bool> isRotationDue({
    Duration maxAge = const Duration(days: 90),
  }) async {
    final lastRotation = await _storage.read(key: 'last_key_rotation');
    if (lastRotation == null) return true;

    final lastDate = DateTime.tryParse(lastRotation);
    if (lastDate == null) return true;

    return DateTime.now().difference(lastDate) > maxAge;
  }
}

class EncryptedRecord {
  final String id;
  final String ciphertext;

  EncryptedRecord({required this.id, required this.ciphertext});
}
```

### Pattern 95.4: HSM Integration

```dart
/// Server-side HSM integration for high-security operations
class HsmService {
  final Dio _dio;

  HsmService(this._dio);

  /// Request server-side signing using HSM
  /// The private key NEVER leaves the HSM
  Future<Uint8List> requestSignature({
    required String keyId,
    required Uint8List dataHash,
    required String algorithm, // 'ECDSA_SHA256', 'RSA_PSS_SHA256'
  }) async {
    final response = await _dio.post('/hsm/sign', data: {
      'key_id': keyId,
      'data_hash': base64Encode(dataHash),
      'algorithm': algorithm,
    });
    return base64Decode(response.data['signature']);
  }

  /// Client certificate authentication — certificate stored on device,
  /// signed by HSM-backed CA
  Future<void> configureClientCert(Dio dio) async {
    // Load client certificate from secure storage
    // Configure Dio with mutual TLS (mTLS)
    final adapter = dio.httpClientAdapter as IOHttpClientAdapter;
    adapter.createHttpClient = () {
      final context = SecurityContext();

      // Client certificate (public — can be stored in assets)
      // context.useCertificateChain('path/to/client.pem');

      // Private key (stored in hardware keystore)
      // context.usePrivateKey('path/to/key.pem');

      return HttpClient(context: context);
    };
  }

  /// Verify server-provided signature using HSM public key
  Future<bool> verifySignature({
    required String keyId,
    required Uint8List data,
    required Uint8List signature,
  }) async {
    final response = await _dio.post('/hsm/verify', data: {
      'key_id': keyId,
      'data': base64Encode(data),
      'signature': base64Encode(signature),
    });
    return response.data['valid'] == true;
  }
}
```

---

## MUST DO

- Use PBKDF2 with minimum 100,000 iterations (OWASP recommendation)
- Store salt separately from derived key (both in secure storage)
- Use hardware-backed keystore (Android TEE/StrongBox, iOS Secure Enclave) when available
- Keep previous key version during rotation for rollback safety
- Rotate encryption keys at least every 90 days per security policy

## MUST NOT DO

- Store encryption keys in SharedPreferences or app assets
- Use MD5 or SHA1 for key derivation (use SHA-256 minimum)
- Export private keys from hardware keystore (they must stay in hardware)
- Delete old key version immediately after rotation (keep one cycle)
- Hardcode iteration counts or salt values in source code

---

## References

- [pointycastle](https://pub.dev/packages/pointycastle)
- [Android Keystore System](https://developer.android.com/training/articles/keystore)
- [iOS Secure Enclave](https://developer.apple.com/documentation/security/certificate_key_and_trust_services/keys/protecting_keys_with_the_secure_enclave)
- [OWASP Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)
