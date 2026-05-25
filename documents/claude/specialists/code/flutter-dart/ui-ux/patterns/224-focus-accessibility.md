# Focus & Accessibility Specialist
# フォーカス＆アクセシビリティスペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 224.1–224.7 |
| **Specialist Type** | rule-set |
| **Purpose** | Semantics widget, FocusNode, keyboard navigation, screen reader |
| **Activation Trigger** | accessibility, a11y, focus, keyboard, screen reader, semantics |
| **Complements** | accessibility-specialist |

---

## Rules

### 224.1 — Semantics Widget

```dart
// ✅ Custom semantic labels
Semantics(
  label: '検索を実行する',
  button: true,
  child: IconButton(icon: Icon(Icons.search), onPressed: onSearch),
)

// ✅ Exclude decorative elements
ExcludeSemantics(child: DecorativeIcon())
```

### 224.2 — Focus Traversal

```dart
// ✅ Focus traversal group
FocusTraversalGroup(
  policy: OrderedTraversalPolicy(),
  child: Column(children: [
    FocusTraversalOrder(order: NumericFocusOrder(1), child: nameField),
    FocusTraversalOrder(order: NumericFocusOrder(2), child: emailField),
    FocusTraversalOrder(order: NumericFocusOrder(3), child: submitButton),
  ]),
)
```

### 224.3 — Focus Trap (Modal)

```dart
// ✅ Flutter dialogs auto-trap focus via ModalBarrier
showDialog(context: context, builder: (_) => AlertDialog(...))
// Focus is automatically trapped within the dialog
```

### 224.4 — Touch Targets

- MD3 minimum: 48×48dp for all interactive elements
- ❌ NEVER create touch targets smaller than 48dp

### 224.5 — Reduced Motion

```dart
// ✅ Check disableAnimations
if (MediaQuery.of(context).disableAnimations) {
  // Skip or reduce animation
}
```

### 224.6 — Screen Reader Announcements

```dart
// ✅ Announce state changes
SemanticsService.announce('3件の検索結果があります', TextDirection.ltr);
```

### 224.7 — High Contrast

```dart
// ✅ Check high contrast mode
final highContrast = MediaQuery.of(context).highContrast;
```
