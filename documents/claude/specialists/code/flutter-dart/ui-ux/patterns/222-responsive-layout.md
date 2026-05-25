# Responsive Layout Specialist
# レスポンシブレイアウトスペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 222.1–222.7 |
| **Specialist Type** | rule-set |
| **Purpose** | MD3 adaptive layouts, window size classes, LayoutBuilder |
| **Activation Trigger** | responsive, adaptive, layout, breakpoint, mobile, tablet, desktop |
| **Complements** | 201.x spacing-scale, 228.x navigation-ux |

---

## Rules

### 222.1 — MD3 Window Size Classes

| Class | Width | Nav Pattern | Content |
|-------|-------|------------|---------|
| Compact | <600dp | NavigationBar (bottom) | Single pane |
| Medium | 600–840dp | NavigationRail (side) | List-detail optional |
| Expanded | >840dp | NavigationDrawer (permanent) | Two-pane layout |

```dart
// ✅ Adaptive layout
Widget build(BuildContext context) {
  final width = MediaQuery.sizeOf(context).width;
  if (width >= 840) return _expandedLayout();
  if (width >= 600) return _mediumLayout();
  return _compactLayout();
}
```

### 222.2 — LayoutBuilder

```dart
// ✅ Component-level responsiveness
LayoutBuilder(
  builder: (context, constraints) {
    if (constraints.maxWidth >= 600) {
      return Row(children: [_sidebar(), Expanded(child: _content())]);
    }
    return _content();  // Mobile: content only
  },
)
```

### 222.3 — Adaptive Grid

```dart
// ✅ Responsive grid
GridView.builder(
  gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(
    maxCrossAxisExtent: 300,
    crossAxisSpacing: 16,
    mainAxisSpacing: 16,
    childAspectRatio: 1.2,
  ),
  itemBuilder: (context, index) => CardWidget(item: items[index]),
)
```

### 222.4 — Content Max Width

```dart
// ✅ Constrain content for readability
Center(
  child: ConstrainedBox(
    constraints: const BoxConstraints(maxWidth: 1200),
    child: content,
  ),
)
```

### 222.5 — Responsive Spacing

| Window Class | Padding | Gap |
|-------------|---------|-----|
| Compact | 16dp | 12dp |
| Medium | 24dp | 16dp |
| Expanded | 24dp | 24dp |

### 222.6 — Orientation Handling

```dart
// ✅ Orientation-aware layout
OrientationBuilder(
  builder: (context, orientation) {
    return orientation == Orientation.landscape
      ? _landscapeLayout()
      : _portraitLayout();
  },
)
```

### 222.7 — SafeArea

```dart
// ✅ Always wrap top-level content with SafeArea
SafeArea(child: content)

// ❌ NEVER ignore safe area insets (notch, status bar)
```
