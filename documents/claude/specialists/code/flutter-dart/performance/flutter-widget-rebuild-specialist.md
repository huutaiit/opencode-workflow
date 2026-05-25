# Flutter Widget Rebuild Specialist
# Flutter ウィジェット再構築最適化スペシャリスト
# Chuyen Gia Toi Uu Rebuild Widget Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — rebuild optimization applies to all widgets) |
| **Directory Pattern** | `lib/features/{feature}/presentation/widgets/`, `lib/features/{feature}/presentation/pages/` |
| **Variant** | ALL |
| **Naming Convention** | N/A (optimization patterns applied to existing widgets, not new file creation) |
| **Imports From** | N/A (performance rules applied to existing code) |
| **Cannot Import** | N/A (performance rules) |
| **Pattern Numbers** | 86.1–86.5 |
| **Source Paths** | `lib/features/*/presentation/**/*.dart`, `lib/core/widgets/*.dart` |
| **File Count** | Cross-cutting: applies to all widget files in project |
| **Imported By** | N/A (optimization rules, not importable code) |
| **Dependencies** | None (Flutter SDK built-in DevTools) |
| **When To Use** | Diagnosing and fixing unnecessary widget rebuilds — jank, slow frames |
| **Source Skeleton** | N/A (optimization patterns on existing widgets) |
| **Specialist Type** | rule-set |
| **Purpose** | Enforce widget rebuild optimization — const constructors, RepaintBoundary, selective BlocBuilder, DevTools profiling |
| **Activation Trigger** | files: lib/features/*/presentation/**/*.dart; keywords: widgetRebuild, constConstructor, repaintBoundary, buildWhen, devTools, shaderWarmUp |

---

## Patterns

### Pattern 86.1: Const Optimization

```dart
// ❌ BAD — rebuilds child widget every time parent rebuilds
class ParentWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('Dynamic: ${DateTime.now()}'),
        Icon(Icons.home),      // Rebuilt unnecessarily
        SizedBox(height: 16),  // Rebuilt unnecessarily
        Divider(),             // Rebuilt unnecessarily
      ],
    );
  }
}

// ✅ GOOD — const children are cached, never rebuilt
class ParentWidget extends StatelessWidget {
  const ParentWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('Dynamic: ${DateTime.now()}'), // Must rebuild (dynamic)
        const Icon(Icons.home),       // ← Cached — zero rebuild cost
        const SizedBox(height: 16),   // ← Cached
        const Divider(),              // ← Cached
      ],
    );
  }
}

// When const IS possible:
// ✅ All constructor parameters are compile-time constants
// ✅ Widget and all children have const constructors
// ✅ No runtime values (Theme.of, MediaQuery.of, variables)

// When const is NOT possible:
// ❌ Uses Theme.of(context) or MediaQuery.of(context)
// ❌ Uses variables or computed values
// ❌ Uses DateTime.now() or other runtime values

// Lint rule: enable in analysis_options.yaml
// linter:
//   rules:
//     prefer_const_constructors: true
//     prefer_const_declarations: true
//     prefer_const_literals_to_create_immutables: true
```

### Pattern 86.2: RepaintBoundary

```dart
/// Isolate expensive widgets from parent rebuilds
// ❌ BAD — animation causes entire tree to repaint
Column(
  children: [
    ExpensiveChart(data: chartData),  // Repaints on every tick
    AnimatedCounter(value: count),     // Animation triggers repaint
    ExpensiveList(items: items),       // Also repaints!
  ],
)

// ✅ GOOD — RepaintBoundary isolates repaint to animated widget only
Column(
  children: [
    const RepaintBoundary(
      child: ExpensiveChart(data: chartData),  // Only repaints when data changes
    ),
    AnimatedCounter(value: count),              // Animation repaints only this
    const RepaintBoundary(
      child: ExpensiveList(items: items),       // Isolated — not affected
    ),
  ],
)

// When to use RepaintBoundary:
// ✅ Isolating animated widgets from static content
// ✅ Complex widgets (charts, maps) that rarely change
// ✅ Scrollable list items (each item gets its own layer)

// When NOT to use:
// ❌ Simple widgets (overhead > benefit)
// ❌ Every single widget (creates too many layers)
// ❌ Widgets that always rebuild together anyway

// Verify improvement with DevTools:
// 1. Open Performance overlay (showPerformanceOverlay: true)
// 2. Check "Repaint Rainbow" in DevTools
// 3. Colored borders flash when widget repaints
// 4. After adding RepaintBoundary, only isolated widget should flash
```

### Pattern 86.3: Selective Rebuilds

```dart
/// BlocBuilder — buildWhen prevents unnecessary rebuilds
// ❌ BAD — rebuilds on ANY state change
BlocBuilder<OrderBloc, OrderState>(
  builder: (context, state) {
    return OrderCountBadge(count: state.orderCount);
  },
)

// ✅ GOOD — rebuilds ONLY when orderCount changes
BlocBuilder<OrderBloc, OrderState>(
  buildWhen: (previous, current) =>
      previous.orderCount != current.orderCount,
  builder: (context, state) {
    return OrderCountBadge(count: state.orderCount);
  },
)

/// BlocSelector — extract specific value, rebuild only on change
BlocSelector<OrderBloc, OrderState, int>(
  selector: (state) => state.orderCount,
  builder: (context, count) {
    return OrderCountBadge(count: count);
  },
)

/// ValueListenableBuilder — scoped rebuild
class CounterPage extends StatelessWidget {
  final ValueNotifier<int> _counter = ValueNotifier(0);

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        const Text('This never rebuilds'),
        ValueListenableBuilder<int>(
          valueListenable: _counter,
          builder: (context, value, child) {
            return Text('Count: $value'); // Only this rebuilds
          },
        ),
      ],
    );
  }
}

/// Split large widgets into smaller StatelessWidgets
// ❌ BAD — one big build method
class OrderPage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // 50 lines of header UI
        // 30 lines of filter UI
        // 40 lines of list UI
      ],
    );
  }
}

// ✅ GOOD — extract into separate widgets (each manages its own rebuilds)
class OrderPage extends StatelessWidget {
  const OrderPage({super.key});

  @override
  Widget build(BuildContext context) {
    return const Column(
      children: [
        OrderHeader(),   // Separate widget — rebuilds independently
        OrderFilters(),  // Separate widget
        OrderList(),     // Separate widget
      ],
    );
  }
}
```

### Pattern 86.4: DevTools Profiling

```dart
/// Flutter DevTools — Performance profiling workflow
///
/// Step 1: Enable performance overlay
/// ```dart
/// MaterialApp(
///   showPerformanceOverlay: true, // Shows frame timing bars
/// )
/// ```
///
/// Step 2: Open DevTools
/// ```bash
/// flutter run --profile  # Run in profile mode (release + DevTools)
/// # Or from IDE: DevTools button in debug toolbar
/// ```
///
/// Step 3: Performance tab
/// - Record timeline during interaction
/// - Look for frames exceeding 16ms (60fps) or 8ms (120fps)
/// - Flame chart shows which methods take time
///
/// Step 4: Widget rebuild tracker
/// - Inspector tab → "Track widget rebuilds"
/// - Shows rebuild count per widget per frame
/// - High rebuild count = optimization target
///
/// Step 5: Memory tab
/// - Take heap snapshots before/after navigation
/// - Compare → find retained objects (memory leak)
/// - Look for growing object counts of same class

/// Programmatic performance tracking
class PerformanceTracker {
  /// Measure build time of expensive widgets
  static Widget measureBuild(String label, Widget child) {
    return Builder(
      builder: (context) {
        final stopwatch = Stopwatch()..start();
        // Build happens here
        stopwatch.stop();
        if (stopwatch.elapsedMilliseconds > 16) {
          debugPrint('⚠️ Slow build: $label took ${stopwatch.elapsedMilliseconds}ms');
        }
        return child;
      },
    );
  }
}
```

### Pattern 86.5: Shader Warm-Up

```dart
/// Pre-compile shaders to prevent first-frame jank
///
/// Step 1: Capture shader SKP during app testing
/// ```bash
/// flutter run --profile --cache-sksl --purge-persistent-cache
/// # Use the app — navigate through all screens
/// # Press 'M' in terminal to export SkSL shaders
/// # Saves to: flutter_01.sksl.json
/// ```
///
/// Step 2: Build with pre-compiled shaders
/// ```bash
/// flutter build apk --bundle-sksl-path flutter_01.sksl.json
/// flutter build ipa --bundle-sksl-path flutter_01.sksl.json
/// ```
///
/// Step 3: Custom shader warm-up (for complex animations)
/// ```dart
/// class AppShaderWarmUp extends ShaderWarmUp {
///   @override
///   Future<bool> warmUpOnCanvas(Canvas canvas) async {
///     // Draw common shapes to trigger shader compilation
///     final paint = Paint()..color = Colors.blue;
///
///     // Rounded rectangles (buttons, cards)
///     canvas.drawRRect(
///       RRect.fromRectAndRadius(
///         const Rect.fromLTWH(0, 0, 200, 50),
///         const Radius.circular(8),
///       ),
///       paint,
///     );
///
///     // Shadows (elevation)
///     canvas.drawShadow(
///       Path()..addRect(const Rect.fromLTWH(0, 0, 200, 200)),
///       Colors.black,
///       4.0,
///       true,
///     );
///
///     return true;
///   }
/// }
///
/// // In main.dart
/// void main() {
///   debugEnhanceBuildWidgets = true;
///   PaintingBinding.shaderWarmUp = AppShaderWarmUp();
///   runApp(const MyApp());
/// }
/// ```

// Impact measurement:
// Without shader warm-up: First frame 200-500ms (visible jank)
// With shader warm-up: First frame <16ms (smooth)
// Trade-off: Adds 100-200ms to app startup (pre-compilation)
```

---

## MUST DO

- Enable `prefer_const_constructors` lint rule project-wide
- Use `buildWhen` in BlocBuilder to prevent unnecessary rebuilds
- Profile with DevTools in `--profile` mode (not debug — debug is slow)
- Split large build methods into separate StatelessWidgets
- Pre-compile shaders for production builds (SkSL warm-up)

## MUST NOT DO

- Wrap every widget in RepaintBoundary (overhead > benefit for simple widgets)
- Ignore DevTools rebuild tracker warnings (high count = performance issue)
- Profile in debug mode (misleading — debug adds overhead)
- Use setState for global state changes (triggers full subtree rebuild)
- Skip const on widgets that can be const (free performance win)

---

## References

- [Flutter Performance Profiling](https://docs.flutter.dev/perf/ui-performance)
- [Flutter DevTools](https://docs.flutter.dev/tools/devtools)
- [Shader Compilation Jank](https://docs.flutter.dev/perf/shader)
- [RepaintBoundary](https://api.flutter.dev/flutter/widgets/RepaintBoundary-class.html)
