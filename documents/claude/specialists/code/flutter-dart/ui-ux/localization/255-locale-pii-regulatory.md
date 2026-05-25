# Locale PII & Regulatory Specialist
# ロケールPII・規制スペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 255.1–255.5 |
| **Specialist Type** | code |
| **Purpose** | PII masking, consent UI, data retention, export restrictions |
| **Activation Trigger** | Personal data display, consent, privacy |
| **Complements** | 251.x name-address, 242.x banking-behavioral |

---

## Rules

### 255.1 — PII Masking

```dart
String maskPhone(String phone) =>
  phone.replaceAllMapped(RegExp(r'(\d{2,4}-)(\d{2,4})(-)(\d{4})'),
    (m) => '${m[1]}****${m[3]}${m[4]}');

String maskEmail(String email) {
  final parts = email.split('@');
  return '${parts[0][0]}${'*' * 3}@${parts[1]}';
}
```

- ✅ Mask by default, reveal on toggle
- ❌ NEVER log unmasked PII

### 255.2 — Consent UI

```dart
// ✅ Consent checkbox
CheckboxListTile(
  value: consented,
  onChanged: (v) => setState(() => consented = v!),
  title: Text('上記に同意する'),
  subtitle: Text.rich(TextSpan(children: [
    TextSpan(text: '個人情報の取扱いについて '),
    TextSpan(text: 'プライバシーポリシー', style: TextStyle(color: colorScheme.primary, decoration: TextDecoration.underline)),
  ])),
)
```

- ✅ Consent must be explicit opt-in (NOT pre-checked)

### 255.3–255.5

Same retention rules, export restrictions, and right-to-deletion patterns as web.
