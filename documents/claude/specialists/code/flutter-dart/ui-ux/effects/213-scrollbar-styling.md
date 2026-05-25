# Scrollbar Styling Specialist
# スクロールバースタイリングスペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 213.1–213.4 |
| **Specialist Type** | rule-set |
| **Purpose** | Scrollbar widget, thumb styling, visibility control |
| **Activation Trigger** | scrollbar, scroll, overflow |
| **Complements** | — |

---

## Rules

### 213.1 — Scrollbar Widget

```dart
// ✅ Scrollbar wrapper
Scrollbar(
  thumbVisibility: true,  // Always show on desktop
  child: ListView.builder(
    itemCount: items.length,
    itemBuilder: (context, index) => ListTile(title: Text(items[index])),
  ),
)
```

### 213.2 — Scrollbar Theme

```dart
// ✅ Global scrollbar styling
ThemeData(
  scrollbarTheme: ScrollbarThemeData(
    thumbColor: WidgetStateProperty.all(Colors.grey[400]),
    thickness: WidgetStateProperty.all(6),
    radius: const Radius.circular(3),
    thumbVisibility: WidgetStateProperty.all(true),
  ),
)
```

### 213.3 — Hidden Scrollbar (Horizontal Scroll)

```dart
// ✅ Hide scrollbar for horizontal scroll
ScrollConfiguration(
  behavior: ScrollConfiguration.of(context).copyWith(scrollbars: false),
  child: SingleChildScrollView(
    scrollDirection: Axis.horizontal,
    child: Row(children: tabs),
  ),
)
```

### 213.4 — Platform-Adaptive

```dart
// ✅ Flutter handles platform scrollbar differences automatically
// - Mobile: thin overlay scrollbar, fades when not scrolling
// - Desktop: persistent scrollbar with track
// - Web: native browser scrollbar

// ❌ NEVER hide vertical scrollbar on data tables
```
