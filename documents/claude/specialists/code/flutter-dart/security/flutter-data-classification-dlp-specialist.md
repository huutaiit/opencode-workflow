# Flutter Data Classification + DLP Specialist
# Flutter データ分類＋DLPスペシャリスト
# Chuyen Gia Phan Loai Du Lieu Va DLP Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Core, Data |
| **Directory Pattern** | `lib/core/security/`, `lib/core/network/` |
| **Variant** | ALL |
| **Naming Convention** | `dlp_service.dart`, `data_classification.dart`. Classes: `DlpService`, `DataClassification` |
| **Imports From** | Core (platform channels) |
| **Cannot Import** | Domain, Presentation, Features |
| **Pattern Numbers** | 94.1–94.5 |
| **Source Paths** | `lib/core/security/*.dart` |
| **File Count** | 2-3 DLP service files |
| **Imported By** | Core (widget wrappers), Presentation (sensitive screen guards) |
| **Dependencies** | Platform channels for FLAG_SECURE |
| **When To Use** | Banking/gov: preventing data leakage — screenshot block, clipboard protection, screen recording prevention, data masking |
| **Source Skeleton** | `lib/core/security/dlp_service.dart`, `lib/core/security/data_classification.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate data loss prevention controls with classification levels, screenshot prevention (FLAG_SECURE), clipboard protection, and sensitive data masking in UI |
| **Activation Trigger** | files: lib/core/security/*dlp*.dart, lib/core/security/*classification*.dart; keywords: dlp, dataClassification, screenshotPrevention, clipboardProtection, dataMasking |

---

## Patterns

### Pattern 94.1: Data Classification Levels

```dart
/// Data classification with field-level tagging
enum DataSensitivity {
  public,       // Press releases, marketing content
  internal,     // Employee directory, project names
  confidential, // Customer PII, financial records
  restricted,   // Passwords, encryption keys, health records
}

class DataClassification {
  /// Classification rules for common field types
  static DataSensitivity classifyField(String fieldName) {
    final lower = fieldName.toLowerCase();

    // Restricted — never display without masking
    if (_restrictedPatterns.any(lower.contains)) {
      return DataSensitivity.restricted;
    }

    // Confidential — mask by default, show on tap
    if (_confidentialPatterns.any(lower.contains)) {
      return DataSensitivity.confidential;
    }

    // Internal — no masking but prevent screenshot
    if (_internalPatterns.any(lower.contains)) {
      return DataSensitivity.internal;
    }

    return DataSensitivity.public;
  }

  static const _restrictedPatterns = [
    'password', 'secret', 'encryption_key', 'private_key',
    'ssn', 'social_security', 'pin_code',
  ];

  static const _confidentialPatterns = [
    'account_number', 'credit_card', 'bank_account',
    'phone', 'email', 'address', 'date_of_birth',
    'salary', 'medical', 'diagnosis',
  ];

  static const _internalPatterns = [
    'employee_id', 'department', 'project_code',
    'internal_note', 'cost_center',
  ];
}

/// Field-level classification annotation for data models
class Classified {
  final DataSensitivity level;
  const Classified(this.level);
}

// Usage in data model
class PatientRecord {
  final String id;

  @Classified(DataSensitivity.confidential)
  final String fullName;

  @Classified(DataSensitivity.restricted)
  final String socialSecurityNumber;

  @Classified(DataSensitivity.confidential)
  final String medicalRecordNumber;

  @Classified(DataSensitivity.public)
  final String appointmentDate;

  PatientRecord({
    required this.id,
    required this.fullName,
    required this.socialSecurityNumber,
    required this.medicalRecordNumber,
    required this.appointmentDate,
  });
}
```

### Pattern 94.2: Screenshot Prevention

```dart
import 'package:flutter/services.dart';

/// Platform channel for screenshot/screen recording prevention
class ScreenshotPreventionService {
  static const _channel = MethodChannel('com.app/screenshot_prevention');

  /// Enable screenshot prevention (FLAG_SECURE on Android, UITextField trick on iOS)
  Future<void> enable() async {
    await _channel.invokeMethod('enableProtection');
  }

  /// Disable screenshot prevention (for non-sensitive screens)
  Future<void> disable() async {
    await _channel.invokeMethod('disableProtection');
  }
}

/// Android native implementation (MainActivity.kt):
///
/// ```kotlin
/// class MainActivity : FlutterActivity() {
///     override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
///         super.configureFlutterEngine(flutterEngine)
///         MethodChannel(flutterEngine.dartExecutor.binaryMessenger,
///             "com.app/screenshot_prevention"
///         ).setMethodCallHandler { call, result ->
///             when (call.method) {
///                 "enableProtection" -> {
///                     window.setFlags(
///                         WindowManager.LayoutParams.FLAG_SECURE,
///                         WindowManager.LayoutParams.FLAG_SECURE
///                     )
///                     result.success(null)
///                 }
///                 "disableProtection" -> {
///                     window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
///                     result.success(null)
///                 }
///                 else -> result.notImplemented()
///             }
///         }
///     }
/// }
/// ```
///
/// iOS native implementation (AppDelegate.swift):
///
/// ```swift
/// // iOS screenshot prevention using secure text field overlay
/// let secureField = UITextField()
/// secureField.isSecureTextEntry = true
/// // Add as subview of the main window to block screenshots/recordings
/// // Note: This blocks the ENTIRE screen content from screenshots
/// ```

/// Widget wrapper for sensitive screens
class SecureScreenWrapper extends StatefulWidget {
  final Widget child;
  final bool enabled;

  const SecureScreenWrapper({
    super.key,
    required this.child,
    this.enabled = true,
  });

  @override
  State<SecureScreenWrapper> createState() => _SecureScreenWrapperState();
}

class _SecureScreenWrapperState extends State<SecureScreenWrapper>
    with RouteAware {
  final _service = ScreenshotPreventionService();

  @override
  void initState() {
    super.initState();
    if (widget.enabled) _service.enable();
  }

  @override
  void dispose() {
    _service.disable();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
```

### Pattern 94.3: Clipboard Protection

```dart
import 'dart:async';
import 'package:flutter/services.dart';

/// Clipboard protection for sensitive data fields
class ClipboardProtection {
  Timer? _clearTimer;

  /// Copy sensitive data with auto-clear after timeout
  Future<void> copyWithAutoClear(
    String text, {
    Duration timeout = const Duration(seconds: 30),
  }) async {
    await Clipboard.setData(ClipboardData(text: text));

    _clearTimer?.cancel();
    _clearTimer = Timer(timeout, () {
      Clipboard.setData(const ClipboardData(text: ''));
    });
  }

  /// Prevent copy on sensitive fields — use as TextField inputFormatters
  static List<TextInputFormatter> get noCopyFormatters => [
        _NoCopyFormatter(),
      ];

  void dispose() => _clearTimer?.cancel();
}

class _NoCopyFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    // Allow normal editing but the field should have
    // enableInteractiveSelection: false to prevent copy
    return newValue;
  }
}

/// Sensitive text field that prevents copy/paste
class ProtectedTextField extends StatelessWidget {
  final TextEditingController controller;
  final String? labelText;
  final bool obscureText;

  const ProtectedTextField({
    super.key,
    required this.controller,
    this.labelText,
    this.obscureText = false,
  });

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      obscureText: obscureText,
      enableInteractiveSelection: false, // Disable copy/paste/select
      decoration: InputDecoration(labelText: labelText),
      toolbarOptions: const ToolbarOptions(
        copy: false,
        cut: false,
        paste: false,
        selectAll: false,
      ),
    );
  }
}
```

### Pattern 94.4: Screen Recording Block

```dart
/// App switcher content redaction + screen recording protection
class ScreenRecordingProtection {
  static const _channel = MethodChannel('com.app/screen_protection');

  /// Show overlay when app is in app switcher (hide content)
  /// Combine with WidgetsBindingObserver for lifecycle events
  static Widget appSwitcherOverlay({
    required Widget child,
    required bool isInBackground,
  }) {
    if (isInBackground) {
      return Container(
        color: Colors.white,
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.lock, size: 64, color: Colors.grey.shade400),
              const SizedBox(height: 16),
              Text(
                'Content hidden for security',
                style: TextStyle(color: Colors.grey.shade600),
              ),
            ],
          ),
        ),
      );
    }
    return child;
  }

  /// Detect screen recording (iOS only — UIScreen.isCaptured)
  Future<bool> get isScreenBeingRecorded async {
    try {
      final result = await _channel.invokeMethod<bool>('isScreenCaptured');
      return result ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Listen for screen capture state changes (iOS)
  Stream<bool> get screenCaptureStream {
    return const EventChannel('com.app/screen_capture_events')
        .receiveBroadcastStream()
        .map((event) => event as bool);
  }
}

/// Lifecycle-aware secure app wrapper
class SecureAppWrapper extends StatefulWidget {
  final Widget child;

  const SecureAppWrapper({super.key, required this.child});

  @override
  State<SecureAppWrapper> createState() => _SecureAppWrapperState();
}

class _SecureAppWrapperState extends State<SecureAppWrapper>
    with WidgetsBindingObserver {
  bool _isInBackground = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    setState(() {
      _isInBackground = state == AppLifecycleState.inactive ||
          state == AppLifecycleState.hidden;
    });
  }

  @override
  Widget build(BuildContext context) {
    return ScreenRecordingProtection.appSwitcherOverlay(
      isInBackground: _isInBackground,
      child: widget.child,
    );
  }
}
```

### Pattern 94.5: Data Masking

```dart
/// Mask sensitive data in UI with reveal-on-tap
class DataMaskingService {
  /// Mask account number: 1234567890 → ••••••7890
  static String maskAccountNumber(String value, {int visibleChars = 4}) {
    if (value.length <= visibleChars) return value;
    final masked = '•' * (value.length - visibleChars);
    return '$masked${value.substring(value.length - visibleChars)}';
  }

  /// Mask SSN: 123-45-6789 → •••-••-6789
  static String maskSsn(String value) {
    final digits = value.replaceAll(RegExp(r'[^0-9]'), '');
    if (digits.length < 4) return '•' * value.length;
    return '•••-••-${digits.substring(digits.length - 4)}';
  }

  /// Mask phone: +81-90-1234-5678 → +81-90-••••-5678
  static String maskPhone(String value) {
    if (value.length < 4) return '•' * value.length;
    final visible = value.substring(0, 6) + '••••' +
        value.substring(value.length - 4);
    return visible;
  }

  /// Mask email: john.doe@example.com → j•••••e@example.com
  static String maskEmail(String value) {
    final parts = value.split('@');
    if (parts.length != 2) return value;
    final name = parts[0];
    if (name.length <= 2) return '••@${parts[1]}';
    return '${name[0]}${'•' * (name.length - 2)}${name[name.length - 1]}@${parts[1]}';
  }
}

/// Widget that masks data and reveals on tap
class MaskedDataWidget extends StatefulWidget {
  final String value;
  final String maskedValue;
  final Duration revealDuration;
  final TextStyle? style;

  const MaskedDataWidget({
    super.key,
    required this.value,
    required this.maskedValue,
    this.revealDuration = const Duration(seconds: 5),
    this.style,
  });

  @override
  State<MaskedDataWidget> createState() => _MaskedDataWidgetState();
}

class _MaskedDataWidgetState extends State<MaskedDataWidget> {
  bool _revealed = false;
  Timer? _hideTimer;

  void _toggleReveal() {
    setState(() => _revealed = !_revealed);
    if (_revealed) {
      _hideTimer?.cancel();
      _hideTimer = Timer(widget.revealDuration, () {
        if (mounted) setState(() => _revealed = false);
      });
    }
  }

  @override
  void dispose() {
    _hideTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _toggleReveal,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            _revealed ? widget.value : widget.maskedValue,
            style: widget.style,
          ),
          const SizedBox(width: 4),
          Icon(
            _revealed ? Icons.visibility_off : Icons.visibility,
            size: 16,
            color: Theme.of(context).colorScheme.primary,
          ),
        ],
      ),
    );
  }
}
```

---

## MUST DO

- Use FLAG_SECURE (Android) for screenshot prevention on sensitive screens
- Implement app switcher overlay to hide content when app is backgrounded
- Auto-clear clipboard after timeout when copying sensitive data
- Mask account numbers, SSN, phone by default — reveal on explicit tap
- Include platform channel code for BOTH Android (FLAG_SECURE) and iOS (UITextField.isSecureTextEntry)

## MUST NOT DO

- Block screenshots on ALL screens (only sensitive ones — poor UX otherwise)
- Allow copy/paste on fields showing passwords, SSN, or encryption keys
- Show full account/card numbers without explicit user action
- Keep sensitive data in clipboard indefinitely
- Log masked data with actual values in debug output

---

## References

- [Android FLAG_SECURE](https://developer.android.com/reference/android/view/WindowManager.LayoutParams#FLAG_SECURE)
- [iOS Screen Capture Detection](https://developer.apple.com/documentation/uikit/uiscreen/2921651-iscaptured)
- [OWASP Mobile — Data Leakage](https://owasp.org/www-project-mobile-top-10/)
