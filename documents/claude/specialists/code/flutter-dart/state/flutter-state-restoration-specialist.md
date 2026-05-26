# Flutter State Restoration Specialist
# Flutter状態復元スペシャリスト
# Chuyen Gia Khoi Phuc Trang Thai Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Directory Pattern** | `lib/features/{feature}/presentation/pages/`, `lib/features/{feature}/presentation/widgets/` |
| **Variant** | ALL |
| **Naming Convention** | N/A (mixin applied to existing StatefulWidgets, not new files) |
| **Imports From** | Presentation (applies to existing pages/widgets) |
| **Cannot Import** | N/A (mixin — no independent import concerns) |
| **Pattern Numbers** | 14.1–14.3 |
| **Source Paths** | `lib/features/*/presentation/pages/*.dart`, `lib/features/*/presentation/widgets/*.dart` |
| **File Count** | Cross-cutting: applies to StatefulWidgets needing state restoration |
| **Imported By** | N/A (mixin applied to existing widgets) |
| **Dependencies** | None (Flutter SDK built-in RestorationMixin) |
| **When To Use** | Preserving UI state across process death — form data, scroll position, tab selection |
| **Source Skeleton** | N/A (mixin applied to existing StatefulWidget files) |
| **Specialist Type** | code |
| **Purpose** | Generate RestorationMixin implementations for StatefulWidgets to preserve state across process death |
| **Activation Trigger** | files: lib/features/*/presentation/**/*.dart; keywords: stateRestoration, restorationMixin, restorableProperty, processKill |

---

## Patterns

### Pattern 14.1: RestorationMixin

Restore UI state when Android/iOS kills and restarts the app.

```dart
class OrderFormPage extends StatefulWidget {
  const OrderFormPage({super.key});

  @override
  State<OrderFormPage> createState() => _OrderFormPageState();
}

class _OrderFormPageState extends State<OrderFormPage> with RestorationMixin {
  // Restorable properties — survive process death
  final RestorableTextEditingController _nameController =
      RestorableTextEditingController();
  final RestorableTextEditingController _emailController =
      RestorableTextEditingController();
  final RestorableInt _selectedStep = RestorableInt(0);
  final RestorableBool _agreedToTerms = RestorableBool(false);

  @override
  String? get restorationId => 'order_form_page';

  @override
  void restoreState(RestorationBucket? oldBucket, bool initialRestore) {
    registerForRestoration(_nameController, 'name');
    registerForRestoration(_emailController, 'email');
    registerForRestoration(_selectedStep, 'step');
    registerForRestoration(_agreedToTerms, 'terms');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _selectedStep.dispose();
    _agreedToTerms.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stepper(
      currentStep: _selectedStep.value,
      onStepContinue: () => setState(() => _selectedStep.value++),
      steps: [
        Step(
          title: const Text('Contact'),
          content: Column(children: [
            TextField(controller: _nameController.value),
            TextField(controller: _emailController.value),
          ]),
        ),
        Step(
          title: const Text('Terms'),
          content: CheckboxListTile(
            value: _agreedToTerms.value,
            onChanged: (v) => setState(() => _agreedToTerms.value = v ?? false),
            title: const Text('I agree to terms'),
          ),
        ),
      ],
    );
  }
}
```

### Pattern 14.2: Custom RestorableProperty

For complex types not covered by built-in Restorable* classes.

```dart
// Custom restorable for enum
class RestorableOrderStatus extends RestorableValue<OrderStatus> {
  @override
  OrderStatus createDefaultValue() => OrderStatus.pending;

  @override
  void didUpdateValue(OrderStatus? oldValue) {
    notifyListeners();
  }

  @override
  OrderStatus fromPrimitives(Object? data) {
    return OrderStatus.values.firstWhere(
      (s) => s.name == data as String,
      orElse: () => OrderStatus.pending,
    );
  }

  @override
  Object? toPrimitives() => value.name;
}

// Custom restorable for DateTime
class RestorableDateTime extends RestorableValue<DateTime?> {
  @override
  DateTime? createDefaultValue() => null;

  @override
  void didUpdateValue(DateTime? oldValue) => notifyListeners();

  @override
  DateTime? fromPrimitives(Object? data) {
    if (data == null) return null;
    return DateTime.tryParse(data as String);
  }

  @override
  Object? toPrimitives() => value?.toIso8601String();
}
```

### Pattern 14.3: State Restoration + BLoC/Riverpod

BLoC state is in-memory — use HydratedCubit (Pattern 11.4) for BLoC state persistence. RestorationMixin is for UI-only state (scroll position, text input, selected tab).

```dart
// Combine: HydratedCubit for business state + RestorationMixin for UI state
class _FilterPageState extends State<FilterPage> with RestorationMixin {
  // UI state — scroll position, expanded sections
  final RestorableDouble _scrollOffset = RestorableDouble(0);
  final RestorableBool _advancedExpanded = RestorableBool(false);

  @override
  String? get restorationId => 'filter_page';

  @override
  void restoreState(RestorationBucket? oldBucket, bool initialRestore) {
    registerForRestoration(_scrollOffset, 'scroll');
    registerForRestoration(_advancedExpanded, 'advanced');
  }

  @override
  Widget build(BuildContext context) {
    // Business state from HydratedCubit (Pattern 11.4) — persists via JSON
    return BlocBuilder<FilterCubit, FilterState>(
      builder: (context, filterState) {
        return CustomScrollView(
          controller: ScrollController(initialScrollOffset: _scrollOffset.value),
          slivers: [
            // Filter chips from Cubit state
            // Scroll position from RestorationMixin
          ],
        );
      },
    );
  }
}
```

---

## MUST DO

- Use restorationId unique per page/widget instance
- Dispose all RestorableProperties in dispose()
- Register properties in restoreState(), not initState()
- Use HydratedCubit for business state, RestorationMixin for UI-only state

## MUST NOT DO

- Use RestorationMixin for complex business state (use HydratedCubit)
- Forget restorationId (restoration won't work without it)
- Use same restorationId for different pages

---

## References

- [State Restoration](https://docs.flutter.dev/development/data-and-backend/state-mgmt/simple#state-restoration)
- [RestorationMixin API](https://api.flutter.dev/flutter/widgets/RestorationMixin-mixin.html)
