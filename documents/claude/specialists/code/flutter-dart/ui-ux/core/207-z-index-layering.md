# Z-Index Layering Specialist
# Zインデックスレイヤリングスペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 207.1–207.5 |
| **Specialist Type** | rule-set |
| **Purpose** | Overlay system, Stack ordering, Navigator layers |
| **Activation Trigger** | (always loaded — core/) |
| **Complements** | — |

---

## Rules

### 207.1 — Flutter Layering System

Flutter uses widget tree order + Overlay instead of CSS z-index.

| Layer | Widget | Use |
|-------|--------|-----|
| Base | Scaffold body | Normal flow |
| FAB | Scaffold.floatingActionButton | Floating action |
| Drawer | Drawer via Scaffold | Side navigation |
| BottomSheet | showModalBottomSheet | Bottom content |
| Snackbar | ScaffoldMessenger | Notifications |
| Dialog | showDialog | Modal dialogs |
| Overlay | Overlay / OverlayEntry | Custom overlays |

### 207.2 — Stack Widget Ordering

```dart
// ✅ Stack: last child renders on top
Stack(
  children: [
    BackgroundWidget(),    // bottom
    ContentWidget(),       // middle
    FloatingWidget(),      // top
  ],
)

// ✅ Positioned within Stack
Stack(
  children: [
    Positioned.fill(child: backgroundImage),
    Positioned(bottom: 16, right: 16, child: fab),
  ],
)
```

### 207.3 — Overlay System

```dart
// ✅ OverlayEntry for custom floating elements
final entry = OverlayEntry(
  builder: (context) => Positioned(
    top: 100, left: 100,
    child: Material(
      elevation: 8,
      borderRadius: BorderRadius.circular(8),
      child: tooltipContent,
    ),
  ),
);
Overlay.of(context).insert(entry);

// ✅ Clean up
entry.remove();
```

### 207.4 — Navigator Layers

```dart
// ✅ Modals render above Navigator via useRootNavigator
showDialog(
  context: context,
  useRootNavigator: true,  // Renders above all nested navigators
  builder: (context) => AlertDialog(...),
)
```

### 207.5 — Stacking Context Isolation

```dart
// ✅ RepaintBoundary for rendering isolation
RepaintBoundary(
  child: ComplexWidget(),  // Isolated compositing layer
)
```

- ❌ NEVER use `Transform` to fake z-index — use Overlay or Stack ordering
