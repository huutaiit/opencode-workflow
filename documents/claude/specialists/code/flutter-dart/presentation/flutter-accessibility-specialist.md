# Flutter Accessibility Specialist
# Flutterアクセシビリティスペシャリスト
# Chuyen Gia Accessibility Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Directory Pattern** | `lib/features/{feature}/presentation/widgets/`, `lib/features/{feature}/presentation/pages/` |
| **Variant** | ALL |
| **Naming Convention** | N/A (enforcement rules applied to existing widgets, not new file creation) |
| **Imports From** | N/A (rule set applied to presentation components, not a code module) |
| **Cannot Import** | N/A (rule set — no import restrictions of its own) |
| **Pattern Numbers** | 64.1–64.6 |
| **Source Paths** | `lib/features/*/presentation/**/*.dart`, `lib/core/widgets/*.dart` |
| **File Count** | Cross-cutting: applies to all widget/page files in project |
| **Imported By** | N/A (enforcement rules, not importable code) |
| **Dependencies** | None (Flutter SDK Semantics widget built-in) |
| **When To Use** | Government app compliance, WCAG 2.1 AA audit, screen reader support, keyboard navigation |
| **Source Skeleton** | N/A (enforcement rules on existing widgets, not new file creation) |
| **Specialist Type** | rule-set |
| **Purpose** | Enforce WCAG 2.1 AA compliance on Flutter widgets — Semantics labels, contrast ratios, focus management, screen reader support, government compliance |
| **Activation Trigger** | files: lib/features/*/presentation/**/*.dart, lib/core/widgets/*.dart; keywords: accessibility, a11y, semantics, wcag, screenReader, focusManagement, contrast |

---

## Patterns

### Pattern 64.1: Semantics Widget

```dart
// ✅ Add Semantics for screen readers
Semantics(
  label: 'Contact card for ${contact.name}',
  hint: 'Double tap to view details',
  child: ContactCard(contact: contact, onTap: () => navigateToDetail(contact)),
)

// ✅ MergeSemantics — combine child semantics into one
MergeSemantics(
  child: ListTile(
    leading: const Icon(Icons.phone),
    title: Text(contact.phone),
    trailing: IconButton(
      icon: const Icon(Icons.call),
      onPressed: () => launchPhone(contact.phone),
      tooltip: 'Call ${contact.name}', // tooltip = Semantics label
    ),
  ),
)

// ✅ ExcludeSemantics — hide decorative elements
ExcludeSemantics(
  child: Image.asset('assets/decorative_border.png'), // Not meaningful content
)

// ✅ Custom semantics for interactive widgets
Semantics(
  label: 'Order status: ${order.status.label}',
  value: '${order.totalAmount.formatted}',
  button: true,
  onTap: () => navigateToOrder(order),
  child: OrderStatusChip(order: order),
)
```

### Pattern 64.2: Screen Reader Support

```dart
// TalkBack (Android) and VoiceOver (iOS) compatibility

// ✅ Announce changes — live regions
Semantics(
  liveRegion: true, // Announce changes automatically
  child: Text('${cartItems.length} items in cart'),
)

// ✅ Navigation order — logical reading order
Semantics(
  sortKey: const OrdinalSortKey(1.0), // Read first
  child: const Text('Welcome'),
)
Semantics(
  sortKey: const OrdinalSortKey(2.0), // Read second
  child: Text('Hello, ${user.name}'),
)

// ✅ Image descriptions
Semantics(
  label: 'Profile photo of ${user.name}',
  image: true,
  child: CircleAvatar(backgroundImage: NetworkImage(user.avatarUrl)),
)

// ❌ DON'T — icon without meaning
IconButton(icon: const Icon(Icons.delete), onPressed: _delete)
// ✅ DO — always add tooltip
IconButton(icon: const Icon(Icons.delete), onPressed: _delete, tooltip: 'Delete contact')
```

### Pattern 64.3: Sufficient Contrast (WCAG 2.1 AA)

```dart
// WCAG 2.1 AA minimum contrast ratios:
//   Normal text (< 18pt): 4.5:1
//   Large text (>= 18pt bold or >= 24pt): 3:1
//   UI components + graphical objects: 3:1

// ✅ Use theme colors — automatically meet contrast
Text('Important', style: Theme.of(context).textTheme.bodyLarge)
// Theme.colorScheme ensures AA compliance for primary/onPrimary pairs

// ⚠️ Custom colors — verify contrast manually
// Tool: https://webaim.org/resources/contrastchecker/
Container(
  color: const Color(0xFF1A73E8), // Background
  child: const Text(
    'Button Label',
    style: TextStyle(color: Colors.white), // White on blue = 4.6:1 ✅
  ),
)

// ❌ Insufficient contrast
Container(
  color: const Color(0xFFE0E0E0), // Light gray background
  child: const Text(
    'Subtle text',
    style: TextStyle(color: Color(0xFFBDBDBD)), // Gray on gray = 1.4:1 ❌
  ),
)
```

### Pattern 64.4: Focus Management

```dart
// ✅ Focus traversal — logical tab order for forms
FocusTraversalGroup(
  policy: OrderedTraversalPolicy(),
  child: Column(
    children: [
      FocusTraversalOrder(
        order: const NumericFocusOrder(1),
        child: TextFormField(decoration: const InputDecoration(labelText: 'First Name')),
      ),
      FocusTraversalOrder(
        order: const NumericFocusOrder(2),
        child: TextFormField(decoration: const InputDecoration(labelText: 'Last Name')),
      ),
      FocusTraversalOrder(
        order: const NumericFocusOrder(3),
        child: TextFormField(decoration: const InputDecoration(labelText: 'Email')),
      ),
    ],
  ),
)

// ✅ Auto-focus first field on page load
TextFormField(
  autofocus: true,
  decoration: const InputDecoration(labelText: 'Search'),
)

// ✅ Move focus after action
void _onSubmitField1() {
  FocusScope.of(context).nextFocus(); // Move to next field
}

// ✅ Dismiss keyboard
void _onDone() {
  FocusScope.of(context).unfocus(); // Dismiss keyboard
}
```

### Pattern 64.5: Large Text / Dynamic Type

```dart
// ✅ Handle text scale factor — prevent overflow
Widget build(BuildContext context) {
  final textScale = MediaQuery.textScaleFactorOf(context);

  return ConstrainedBox(
    constraints: BoxConstraints(minHeight: 48 * textScale), // Scale tap target
    child: Text(
      'Button Label',
      overflow: TextOverflow.ellipsis, // Handle overflow gracefully
      maxLines: 2,
    ),
  );
}

// ✅ Flexible layouts that handle large text
Row(
  children: [
    Flexible(child: Text(label, overflow: TextOverflow.ellipsis)), // Shrinks if needed
    const SizedBox(width: 8),
    Text(value, style: Theme.of(context).textTheme.bodyMedium),
  ],
)

// ✅ Minimum tap target size (WCAG: 44x44 dp)
SizedBox(
  width: 48,
  height: 48,
  child: IconButton(icon: const Icon(Icons.close), onPressed: _close),
)
```

### Pattern 64.6: Government Compliance Checklist

```markdown
## WCAG 2.1 AA Checklist for Flutter Apps

### Perceivable
- [ ] All images have Semantics label or ExcludeSemantics
- [ ] Color is not the only means of conveying information
- [ ] Text contrast ratio >= 4.5:1 (normal) or >= 3:1 (large)
- [ ] Text can be resized up to 200% without loss of content

### Operable
- [ ] All interactive elements are keyboard accessible (focus traversal)
- [ ] Tap targets are minimum 48x48 dp
- [ ] No time-limited content without user control
- [ ] Consistent navigation order

### Understandable
- [ ] Language is set (MaterialApp locale)
- [ ] Input fields have labels and error messages
- [ ] Form validation provides clear error descriptions

### Robust
- [ ] Semantics tree correctly represents UI structure
- [ ] Custom widgets have proper Semantics annotations
- [ ] TalkBack (Android) and VoiceOver (iOS) tested

### Additional (Japanese Gov — JIS X 8341-3)
- [ ] Ruby text (furigana) support for complex kanji
- [ ] Vertical text layout support where applicable
- [ ] Japanese locale date/time formatting
```

---

## MUST DO

- Add `tooltip` to every IconButton
- Add Semantics labels to custom interactive widgets
- Meet WCAG 2.1 AA contrast ratios (4.5:1 normal text, 3:1 large)
- Ensure minimum tap target 48x48 dp
- Handle text scale factor (dynamic type) without overflow

## MUST NOT DO

- Use color alone to convey meaning (add text/icon too)
- Skip Semantics on custom widgets (screen reader can't read them)
- Use fixed-size containers that break with large text
- Ignore focus traversal order in forms

---

## References

- [Flutter Accessibility](https://docs.flutter.dev/accessibility-and-localization/accessibility)
- [WCAG 2.1](https://www.w3.org/TR/WCAG21/)
- [JIS X 8341-3](https://www.jisc.go.jp/app/jis/general/GnrJISNumberNameSearchList?toGnrJISStandardDetailList)
