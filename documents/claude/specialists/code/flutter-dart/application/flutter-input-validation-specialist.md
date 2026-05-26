# Flutter Input Validation Specialist
# Flutter 入力バリデーションスペシャリスト
# Chuyen Gia Kiem Tra Dau Vao Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain, Presentation |
| **Directory Pattern** | `lib/core/utils/`, `lib/features/{feature}/domain/entities/`, `lib/features/{feature}/presentation/pages/` |
| **Variant** | ALL |
| **Naming Convention** | `validators.dart`, `{name}_validator.dart`. Classes: `Validators`, `{Name}Validator` |
| **Imports From** | Domain (entity value constraints), Presentation (FormField callbacks) |
| **Cannot Import** | Data (validation is independent of data sources) |
| **Pattern Numbers** | 109.1–109.5 |
| **Source Paths** | `lib/core/utils/validators.dart`, `lib/features/*/domain/entities/*.dart` |
| **File Count** | 1 shared validator class + validation in each entity + each form |
| **Imported By** | Domain (value object constructors), Presentation (FormField.validator callbacks) |
| **Dependencies** | None (pure Dart regex + conditional logic) |
| **When To Use** | Email/phone/password validation, domain business rule enforcement, server error→field mapping |
| **Source Skeleton** | `lib/core/utils/validators.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate reusable validation rules for forms and domain value objects — email, phone (+84/+81 formats), password strength, and server-side error→field mapping |
| **Activation Trigger** | files: lib/core/utils/validators.dart, lib/features/*/domain/entities/*.dart; keywords: validation, validator, emailValidator, phoneFormat, passwordStrength, serverError |

---

## Patterns

### Pattern 109.1: Validation Rules

```dart
class Validators {
  static final _emailRegex = RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$');

  static String? email(String? value) {
    if (value == null || value.isEmpty) return 'Email is required';
    if (!_emailRegex.hasMatch(value)) return 'Invalid email format';
    return null;
  }

  /// Phone — supports Vietnamese (+84) and Japanese (+81) formats
  static String? phone(String? value) {
    if (value == null || value.isEmpty) return null; // Optional
    final digits = value.replaceAll(RegExp(r'[\s\-\(\)]'), '');
    // +84 (Vietnam): 10 digits after country code
    if (digits.startsWith('+84') && digits.length == 12) return null;
    // +81 (Japan): 10-11 digits after country code
    if (digits.startsWith('+81') && (digits.length == 12 || digits.length == 13)) return null;
    // Generic: 8-15 digits with optional + prefix
    if (RegExp(r'^\+?[0-9]{8,15}$').hasMatch(digits)) return null;
    return 'Invalid phone number';
  }

  static String? password(String? value, {int minLength = 8}) {
    if (value == null || value.isEmpty) return 'Password is required';
    if (value.length < minLength) return 'Minimum $minLength characters';
    if (!value.contains(RegExp(r'[A-Z]'))) return 'Must contain uppercase';
    if (!value.contains(RegExp(r'[a-z]'))) return 'Must contain lowercase';
    if (!value.contains(RegExp(r'[0-9]'))) return 'Must contain a number';
    return null;
  }

  static String? required(String? value, [String fieldName = 'Field']) {
    if (value == null || value.trim().isEmpty) return '$fieldName is required';
    return null;
  }

  static String? maxLength(String? value, int max) {
    if (value != null && value.length > max) return 'Maximum $max characters';
    return null;
  }
}
```

### Pattern 109.2: Composable Validators

```dart
typedef ValidatorFn = String? Function(String?);

class ComposableValidator {
  static ValidatorFn compose(List<ValidatorFn> validators) {
    return (value) {
      for (final validator in validators) {
        final error = validator(value);
        if (error != null) return error;
      }
      return null;
    };
  }
}

// Usage in form
TextFormField(
  validator: ComposableValidator.compose([
    (v) => Validators.required(v, 'Email'),
    Validators.email,
    (v) => Validators.maxLength(v, 255),
  ]),
)
```

### Pattern 109.3: Domain-Level Validation (Value Objects)

```dart
class Email {
  final String value;

  Email(this.value) {
    final error = Validators.email(value);
    if (error != null) throw ValidationException(error);
  }
}

class PhoneNumber {
  final String value;

  PhoneNumber(this.value) {
    final error = Validators.phone(value);
    if (error != null) throw ValidationException(error);
  }

  String get formatted {
    if (value.startsWith('+84')) return '+84 ${value.substring(3)}';
    if (value.startsWith('+81')) return '+81 ${value.substring(3)}';
    return value;
  }
}

class ValidationException implements Exception {
  final String message;
  ValidationException(this.message);
}
```

### Pattern 109.4: Form-Level Validation

```dart
class LoginForm extends StatefulWidget {
  @override
  State<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends State<LoginForm> {
  final _formKey = GlobalKey<FormState>();

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      autovalidateMode: AutovalidateMode.onUserInteraction,
      child: Column(
        children: [
          TextFormField(
            validator: Validators.email,
            decoration: const InputDecoration(labelText: 'Email'),
          ),
          TextFormField(
            validator: Validators.password,
            obscureText: true,
            decoration: const InputDecoration(labelText: 'Password'),
          ),
          ElevatedButton(
            onPressed: () {
              if (_formKey.currentState!.validate()) {
                // Submit
              }
            },
            child: const Text('Login'),
          ),
        ],
      ),
    );
  }
}
```

### Pattern 109.5: Server-Side Error→Field Mapping

```dart
/// Map API 422 validation errors to form fields
class ServerErrorMapper {
  static Map<String, String> mapToFieldErrors(Map<String, dynamic> apiErrors) {
    final fieldErrors = <String, String>{};

    if (apiErrors.containsKey('errors')) {
      final errors = apiErrors['errors'] as Map<String, dynamic>;
      for (final entry in errors.entries) {
        final messages = entry.value;
        if (messages is List && messages.isNotEmpty) {
          fieldErrors[entry.key] = messages.first.toString();
        } else if (messages is String) {
          fieldErrors[entry.key] = messages;
        }
      }
    }
    return fieldErrors;
  }

  /// Apply server errors to form
  static void applyToForm(
    GlobalKey<FormState> formKey,
    Map<String, String> fieldErrors,
    Map<String, TextEditingController> controllers,
  ) {
    // Re-validate form with server errors injected
    formKey.currentState?.validate();
  }
}

// API response: { "errors": { "email": ["Email already exists"], "phone": ["Invalid format"] } }
// → fieldErrors: { "email": "Email already exists", "phone": "Invalid format" }
```

---

## MUST DO

- Validate at both Domain (value objects) and Presentation (form fields) layers
- Support Vietnamese (+84) and Japanese (+81) phone formats
- Use `AutovalidateMode.onUserInteraction` (validate after first interaction)
- Map server 422 errors to specific form fields
- Compose validators for reusability

## MUST NOT DO

- Skip client-side validation (still need server-side, but UX requires client)
- Hardcode error messages (use localization for multi-language)
- Allow form submission without `_formKey.currentState!.validate()`
- Validate on every keystroke (use onUserInteraction mode)
- Trust client-side validation alone (always validate server-side too)

---

## References

- [Flutter Forms](https://docs.flutter.dev/cookbook/forms/validation)
- [TextFormField](https://api.flutter.dev/flutter/material/TextFormField-class.html)
