# JIS X 8341 Accessibility Specialist
# JIS X 8341アクセシビリティスペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 241.1–241.6 |
| **Specialist Type** | rule-set |
| **Purpose** | JIS X 8341-3:2016, Semantics, TalkBack/VoiceOver, form labels |
| **Activation Trigger** | Accessibility audit, JP government system |
| **Complements** | accessibility-specialist, 200.x color-system |

---

## Rules

### 241.1 — JIS X 8341-3:2016

Target AA minimum. Test with TalkBack (Android) and VoiceOver (iOS).

### 241.2 — Ruby Text (Furigana)

```dart
// ✅ Ruby text widget
Column(mainAxisSize: MainAxisSize.min, children: [
  Text('とりひきさき', style: TextStyle(fontSize: 8, color: colorScheme.onSurfaceVariant)),
  Text('取引先', style: textTheme.bodyLarge),
])
```

### 241.3 — Screen Reader (JP)

```dart
// ✅ Japanese semantic labels
Semantics(
  label: '検索を実行する',
  child: IconButton(icon: Icon(Icons.search), onPressed: onSearch),
)

// ✅ Live announcement
SemanticsService.announce('3件の検索結果があります', TextDirection.ltr);
```

- ✅ All labels in Japanese for JP-facing apps
- ❌ NEVER use English labels on JP apps

### 241.4 — Government Contrast

| Element | Standard AA | JP Government |
|---------|------------|---------------|
| Body text | 4.5:1 | 5.0:1 |
| Large text | 3:1 | 4.0:1 |

### 241.5 — Form Labels (全角/半角)

```dart
// ✅ Input hint for character type
TextFormField(
  decoration: InputDecoration(
    labelText: '電話番号',
    helperText: '半角数字で入力してください',
  ),
  keyboardType: TextInputType.phone,
)
```

### 241.6 — Focus Traversal

```dart
// ✅ Ordered focus traversal
FocusTraversalGroup(
  policy: OrderedTraversalPolicy(),
  child: Column(children: [
    FocusTraversalOrder(order: NumericFocusOrder(1), child: field1),
    FocusTraversalOrder(order: NumericFocusOrder(2), child: field2),
  ]),
)
```
