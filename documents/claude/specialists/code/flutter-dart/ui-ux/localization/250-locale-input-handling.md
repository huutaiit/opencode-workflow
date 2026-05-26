# Locale Input Handling Specialist
# ロケール入力処理スペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 250.1–250.5 |
| **Specialist Type** | rule-set |
| **Purpose** | IME composition, zenkaku/hankaku, VN input awareness |
| **Activation Trigger** | Text input, IME, form controls |
| **Complements** | 251.x name-address, 256.x layout-typography |

---

## Rules

### 250.1 — IME Composition Handling

Flutter handles IME composition at platform level. Key considerations:

```dart
// ✅ Debounce search during IME input
final _debounce = Debouncer(milliseconds: 300);

TextField(
  onChanged: (value) {
    _debounce.run(() => performSearch(value));
  },
)
```

- ✅ Debounce text changes by 300ms for JP input
- ❌ NEVER trigger search on every keystroke during IME composition

### 250.2 — Form Submission Guard

```dart
// ✅ Prevent submit during composition
// Flutter TextField handles Enter key — no compositionEnd event needed
// Use onFieldSubmitted callback which fires after composition commit
TextFormField(
  onFieldSubmitted: (value) => submitForm(),
)
```

### 250.3 — Zenkaku/Hankaku Conversion

```dart
// ✅ Conversion utilities
String toHankaku(String str) {
  return str.replaceAllMapped(RegExp('[Ａ-Ｚａ-ｚ０-９]'), (m) {
    return String.fromCharCode(m.group(0)!.codeUnitAt(0) - 0xFEE0);
  });
}

// ✅ Auto-convert on focus lost
TextFormField(
  onFieldSubmitted: (value) {
    if (fieldType == 'phone' || fieldType == 'email') {
      controller.text = toHankaku(value);
    }
  },
)
```

### 250.4 — Input Hints

```dart
// ✅ Character type hint
TextFormField(
  decoration: InputDecoration(
    helperText: '半角で入力してください',
  ),
  keyboardType: TextInputType.phone,
)
```

### 250.5 — VN Input Awareness

- ✅ Debounce VN text input by 500ms (Telex multi-keystroke)
- ✅ Allow diacritical marks in all text fields
- ❌ NEVER restrict input to ASCII
