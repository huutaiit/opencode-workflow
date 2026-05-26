# Flutter MFA Flows Specialist
# Flutter 多要素認証フロースペシャリスト
# Chuyen Gia Luong MFA Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Core, Data |
| **Directory Pattern** | `lib/core/security/`, `lib/core/network/` |
| **Variant** | ALL |
| **Naming Convention** | `mfa_service.dart`, `otp_input_widget.dart`. Classes: `MfaService`, `OtpInputWidget` |
| **Imports From** | Core (secure storage, network), Data (auth API for verification) |
| **Cannot Import** | Domain |
| **Pattern Numbers** | 92.1–92.5 |
| **Source Paths** | `lib/features/*/presentation/**/*mfa*.dart`, `lib/features/*/presentation/**/*otp*.dart` |
| **File Count** | 3-5 MFA flow files |
| **Imported By** | Presentation (auth screens), Core (step-up auth interceptor) |
| **Dependencies** | pin_code_fields ^8.0.0, mobile_scanner ^4.0.0, firebase_messaging (push auth) |
| **When To Use** | Banking/gov: multi-factor authentication — OTP, TOTP, push auth, step-up auth, FIDO2 |
| **Source Skeleton** | `lib/core/security/mfa_service.dart`, `lib/features/auth/presentation/widgets/otp_input_widget.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate MFA flows with OTP input widget, TOTP authenticator QR setup, push authentication, and step-up re-auth for sensitive operations |
| **Activation Trigger** | files: lib/features/*/presentation/**/*mfa*.dart, lib/features/*/presentation/**/*otp*.dart; keywords: mfa, otp, totp, pushAuth, stepUpAuth, fido2, twoFactor |

---

## Patterns

### Pattern 92.1: OTP (SMS/Email)

```dart
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:pin_code_fields/pin_code_fields.dart';

/// OTP input widget with auto-fill from SMS
class OtpInputWidget extends StatefulWidget {
  final int length;
  final ValueChanged<String> onCompleted;
  final VoidCallback? onResend;
  final Duration resendCooldown;

  const OtpInputWidget({
    super.key,
    this.length = 6,
    required this.onCompleted,
    this.onResend,
    this.resendCooldown = const Duration(seconds: 60),
  });

  @override
  State<OtpInputWidget> createState() => _OtpInputWidgetState();
}

class _OtpInputWidgetState extends State<OtpInputWidget> {
  final _controller = TextEditingController();
  late int _remainingSeconds;
  Timer? _resendTimer;

  @override
  void initState() {
    super.initState();
    _remainingSeconds = widget.resendCooldown.inSeconds;
    _startResendTimer();
  }

  void _startResendTimer() {
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        if (_remainingSeconds > 0) {
          _remainingSeconds--;
        } else {
          timer.cancel();
        }
      });
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _resendTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        PinCodeTextField(
          appContext: context,
          length: widget.length,
          controller: _controller,
          autoFocus: true,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          animationType: AnimationType.fade,
          pinTheme: PinTheme(
            shape: PinCodeFieldShape.box,
            borderRadius: BorderRadius.circular(8),
            fieldHeight: 50,
            fieldWidth: 45,
            activeFillColor: Theme.of(context).colorScheme.surface,
            selectedFillColor: Theme.of(context).colorScheme.primaryContainer,
            inactiveFillColor: Theme.of(context).colorScheme.surfaceContainerHighest,
          ),
          enableActiveFill: true,
          onCompleted: widget.onCompleted,
          onChanged: (_) {},
          // Auto-fill from SMS (Android)
          autovalidateMode: AutovalidateMode.disabled,
        ),
        const SizedBox(height: 16),
        TextButton(
          onPressed: _remainingSeconds == 0
              ? () {
                  widget.onResend?.call();
                  setState(() => _remainingSeconds = widget.resendCooldown.inSeconds);
                  _startResendTimer();
                }
              : null,
          child: Text(
            _remainingSeconds > 0
                ? 'Resend in ${_remainingSeconds}s'
                : 'Resend OTP',
          ),
        ),
      ],
    );
  }
}

/// OTP verification service
class OtpVerificationService {
  final Dio _dio;

  OtpVerificationService(this._dio);

  /// Request OTP via SMS or email
  Future<void> requestOtp({
    required String userId,
    required OtpChannel channel, // sms or email
  }) async {
    await _dio.post('/auth/mfa/otp/request', data: {
      'user_id': userId,
      'channel': channel.name,
    });
  }

  /// Verify OTP code
  Future<MfaResult> verifyOtp({
    required String userId,
    required String code,
  }) async {
    final response = await _dio.post('/auth/mfa/otp/verify', data: {
      'user_id': userId,
      'code': code,
    });
    return MfaResult.fromJson(response.data);
  }
}

enum OtpChannel { sms, email }
```

### Pattern 92.2: TOTP (Authenticator App)

```dart
import 'package:mobile_scanner/mobile_scanner.dart';

/// TOTP setup flow — QR code scanning for authenticator app registration
class TotpSetupService {
  final Dio _dio;

  TotpSetupService(this._dio);

  /// Request TOTP secret from server (returns provisioning URI)
  Future<TotpSetupData> requestSetup(String userId) async {
    final response = await _dio.post('/auth/mfa/totp/setup', data: {
      'user_id': userId,
    });
    return TotpSetupData(
      provisioningUri: response.data['provisioning_uri'],
      secret: response.data['secret'],
      backupCodes: List<String>.from(response.data['backup_codes']),
    );
  }

  /// Verify TOTP code to complete setup
  Future<bool> verifySetup({
    required String userId,
    required String code,
  }) async {
    final response = await _dio.post('/auth/mfa/totp/verify-setup', data: {
      'user_id': userId,
      'code': code,
    });
    return response.data['verified'] == true;
  }
}

class TotpSetupData {
  final String provisioningUri; // otpauth://totp/...
  final String secret; // Base32 encoded secret
  final List<String> backupCodes;

  TotpSetupData({
    required this.provisioningUri,
    required this.secret,
    required this.backupCodes,
  });
}

/// QR Scanner widget for TOTP authenticator setup
class TotpQrScannerWidget extends StatelessWidget {
  final ValueChanged<String> onScanned;

  const TotpQrScannerWidget({super.key, required this.onScanned});

  @override
  Widget build(BuildContext context) {
    return MobileScanner(
      onDetect: (capture) {
        final barcode = capture.barcodes.firstOrNull;
        if (barcode?.rawValue != null &&
            barcode!.rawValue!.startsWith('otpauth://')) {
          onScanned(barcode.rawValue!);
        }
      },
    );
  }
}
```

### Pattern 92.3: Push Authentication

```dart
/// Push-based authentication (approve/deny on device)
class PushAuthService {
  final Dio _dio;
  final TokenService _tokenService;

  PushAuthService(this._dio, this._tokenService);

  /// Register device for push authentication
  Future<void> registerDevice({
    required String userId,
    required String fcmToken,
  }) async {
    await _dio.post('/auth/mfa/push/register', data: {
      'user_id': userId,
      'fcm_token': fcmToken,
      'platform': Platform.operatingSystem,
    });
  }

  /// Handle incoming push auth request
  Future<void> handlePushAuthRequest(Map<String, dynamic> payload) async {
    final requestId = payload['request_id'] as String;
    final action = payload['action'] as String; // 'login', 'transaction'
    final details = payload['details'] as String?;

    // Show approval dialog to user
    // This would typically be triggered via a notification handler
    // and show a full-screen approval UI
  }

  /// Approve push authentication request
  Future<void> approve(String requestId) async {
    await _dio.post('/auth/mfa/push/respond', data: {
      'request_id': requestId,
      'response': 'approve',
      'timestamp': DateTime.now().toIso8601String(),
    });
  }

  /// Deny push authentication request
  Future<void> deny(String requestId) async {
    await _dio.post('/auth/mfa/push/respond', data: {
      'request_id': requestId,
      'response': 'deny',
      'timestamp': DateTime.now().toIso8601String(),
    });
  }
}
```

### Pattern 92.4: Step-Up Authentication

```dart
/// Step-up re-auth for sensitive operations
class StepUpAuthService {
  final BiometricService _biometricService;
  final TokenService _tokenService;
  final Dio _dio;

  StepUpAuthService(this._biometricService, this._tokenService, this._dio);

  /// Check if operation requires step-up auth
  Future<bool> requiresStepUp(String operation) async {
    // Server determines risk level based on operation type
    final response = await _dio.get('/auth/mfa/step-up/check', queryParameters: {
      'operation': operation,
    });
    return response.data['required'] == true;
  }

  /// Perform step-up authentication
  Future<StepUpResult> authenticate({
    required String operation,
    StepUpMethod method = StepUpMethod.biometric,
  }) async {
    switch (method) {
      case StepUpMethod.biometric:
        final success = await _biometricService.authenticate(
          reason: 'Verify identity for $operation',
        );
        if (!success) return StepUpResult.failed;

        // Get step-up token from server
        final response = await _dio.post('/auth/mfa/step-up/verify', data: {
          'operation': operation,
          'method': 'biometric',
        });
        return StepUpResult(
          success: true,
          stepUpToken: response.data['step_up_token'],
          expiresIn: Duration(minutes: response.data['expires_in_minutes']),
        );

      case StepUpMethod.pin:
        // Show PIN input dialog, then verify with server
        return StepUpResult.failed;

      case StepUpMethod.otp:
        // Trigger OTP flow, then verify
        return StepUpResult.failed;
    }
  }
}

enum StepUpMethod { biometric, pin, otp }

class StepUpResult {
  final bool success;
  final String? stepUpToken;
  final Duration? expiresIn;

  StepUpResult({
    required this.success,
    this.stepUpToken,
    this.expiresIn,
  });

  static StepUpResult get failed => StepUpResult(success: false);
}
```

### Pattern 92.5: Hardware Token (FIDO2/WebAuthn)

```dart
/// FIDO2/WebAuthn integration for hardware security key authentication
class Fido2Service {
  final Dio _dio;

  Fido2Service(this._dio);

  /// Start registration ceremony
  Future<Fido2RegistrationOptions> startRegistration(String userId) async {
    final response = await _dio.post('/auth/fido2/register/begin', data: {
      'user_id': userId,
    });
    return Fido2RegistrationOptions.fromJson(response.data);
  }

  /// Complete registration with authenticator response
  Future<bool> completeRegistration({
    required String userId,
    required Map<String, dynamic> authenticatorResponse,
  }) async {
    final response = await _dio.post('/auth/fido2/register/complete', data: {
      'user_id': userId,
      'response': authenticatorResponse,
    });
    return response.data['registered'] == true;
  }

  /// Start authentication ceremony
  Future<Fido2AuthOptions> startAuthentication(String userId) async {
    final response = await _dio.post('/auth/fido2/authenticate/begin', data: {
      'user_id': userId,
    });
    return Fido2AuthOptions.fromJson(response.data);
  }

  /// Complete authentication with authenticator assertion
  Future<MfaResult> completeAuthentication({
    required String userId,
    required Map<String, dynamic> authenticatorAssertion,
  }) async {
    final response = await _dio.post('/auth/fido2/authenticate/complete', data: {
      'user_id': userId,
      'assertion': authenticatorAssertion,
    });
    return MfaResult.fromJson(response.data);
  }
}

class Fido2RegistrationOptions {
  final String challenge;
  final Map<String, dynamic> rp;
  final Map<String, dynamic> user;
  final List<Map<String, dynamic>> pubKeyCredParams;

  Fido2RegistrationOptions.fromJson(Map<String, dynamic> json)
      : challenge = json['challenge'],
        rp = json['rp'],
        user = json['user'],
        pubKeyCredParams = List<Map<String, dynamic>>.from(json['pubKeyCredParams']);
}

class Fido2AuthOptions {
  final String challenge;
  final List<Map<String, dynamic>> allowCredentials;

  Fido2AuthOptions.fromJson(Map<String, dynamic> json)
      : challenge = json['challenge'],
        allowCredentials = List<Map<String, dynamic>>.from(json['allowCredentials']);
}

class MfaResult {
  final bool success;
  final String? token;
  final String? error;

  MfaResult({required this.success, this.token, this.error});

  factory MfaResult.fromJson(Map<String, dynamic> json) => MfaResult(
        success: json['success'] == true,
        token: json['token'],
        error: json['error'],
      );
}
```

---

## MUST DO

- Auto-fill OTP from SMS on Android (SMS Retriever API)
- Include resend timer with cooldown (prevent abuse)
- Store TOTP backup codes securely (show once, never again)
- Use biometric as default step-up method (fastest UX)
- Implement FIDO2 via platform channels (no pure-Dart WebAuthn)

## MUST NOT DO

- Store OTP codes locally (verify server-side only)
- Allow unlimited OTP resend (rate limit + cooldown)
- Show TOTP secret after initial setup (one-time display)
- Skip step-up auth for financial transactions (regulatory requirement)
- Implement TOTP validation client-side (server-side only)

---

## References

- [pin_code_fields](https://pub.dev/packages/pin_code_fields)
- [mobile_scanner](https://pub.dev/packages/mobile_scanner)
- [FIDO2 WebAuthn Spec](https://www.w3.org/TR/webauthn-2/)
- [OWASP MFA Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
