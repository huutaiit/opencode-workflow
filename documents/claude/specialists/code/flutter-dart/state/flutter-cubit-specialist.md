# Flutter Cubit Specialist
# Flutter Cubitスペシャリスト
# Chuyen Gia Cubit Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: clean-bloc

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Directory Pattern** | `lib/features/{feature}/presentation/bloc/` |
| **Variant** | clean-bloc |
| **Naming Convention** | `{name}_cubit.dart`, `{name}_state.dart`. Classes: `{Name}Cubit`, `{Name}State` (Freezed) |
| **Imports From** | Domain (entities, usecases via DI) |
| **Cannot Import** | Data (direct), other features' Cubits |
| **Pattern Numbers** | 11.1–11.4 |
| **Source Paths** | `lib/features/*/presentation/bloc/*_cubit.dart` |
| **File Count** | 2 files per Cubit (cubit + state), 5-20 Cubits per enterprise app |
| **Imported By** | Presentation (pages + widgets consume via BlocBuilder) |
| **Dependencies** | flutter_bloc ^8.1.0, hydrated_bloc ^9.1.0 (optional), freezed_annotation ^2.4.0 |
| **When To Use** | Simple state without complex event streams — CRUD operations, form state, toggle state |
| **Source Skeleton** | `lib/features/{f}/presentation/bloc/{name}_cubit.dart`, `{name}_state.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate Cubit classes with Freezed states, method-based state changes, and HydratedCubit for persistence |
| **Activation Trigger** | files: lib/features/*/presentation/bloc/*_cubit.dart; keywords: cubit, simpleState, methodDriven, hydratedCubit |

---

## Patterns

### Pattern 11.1: Cubit vs BLoC Decision

```
USE CUBIT when:
  ✅ State changes are simple method calls (load, toggle, update)
  ✅ No need to trace events (no audit trail requirement)
  ✅ Single action per state change
  ✅ CRUD screens, settings, preferences, filters

USE BLOC when:
  ✅ Need event traceability (banking, gov — who did what)
  ✅ Complex event processing (debounce, sequential, restartable)
  ✅ Multiple events can trigger same state change
  ✅ Event transformers needed
```

### Pattern 11.2: Cubit with Freezed States

```dart
// lib/features/settings/presentation/bloc/settings_state.dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'settings_state.freezed.dart';

@freezed
sealed class SettingsState with _$SettingsState {
  const factory SettingsState.initial() = SettingsInitial;
  const factory SettingsState.loading() = SettingsLoading;
  const factory SettingsState.loaded({
    required String locale,
    required bool darkMode,
    required bool notificationsEnabled,
    required bool biometricEnabled,
  }) = SettingsLoaded;
  const factory SettingsState.error({required String message}) = SettingsError;
}
```

```dart
// lib/features/settings/presentation/bloc/settings_cubit.dart
import 'package:flutter_bloc/flutter_bloc.dart';
import 'settings_state.dart';

class SettingsCubit extends Cubit<SettingsState> {
  final GetSettings _getSettings;
  final UpdateSettings _updateSettings;

  SettingsCubit(this._getSettings, this._updateSettings)
      : super(const SettingsState.initial());

  Future<void> loadSettings() async {
    emit(const SettingsState.loading());
    final result = await _getSettings(const NoParams());
    result.fold(
      (failure) => emit(SettingsState.error(message: failure.message)),
      (settings) => emit(SettingsState.loaded(
        locale: settings.locale,
        darkMode: settings.darkMode,
        notificationsEnabled: settings.notificationsEnabled,
        biometricEnabled: settings.biometricEnabled,
      )),
    );
  }

  Future<void> toggleDarkMode() async {
    final current = state;
    if (current is SettingsLoaded) {
      final newValue = !current.darkMode;
      emit(current.copyWith(darkMode: newValue));
      await _updateSettings(UpdateSettingsParams(darkMode: newValue));
    }
  }

  Future<void> changeLocale(String locale) async {
    final current = state;
    if (current is SettingsLoaded) {
      emit(current.copyWith(locale: locale));
      await _updateSettings(UpdateSettingsParams(locale: locale));
    }
  }
}
```

### Pattern 11.3: Cubit Composition

Multiple Cubits per page — each manages independent state slice.

```dart
// Order form page — 3 independent Cubits
class OrderFormPage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => getIt<CustomerSelectCubit>()..loadCustomers()),
        BlocProvider(create: (_) => getIt<ProductCatalogCubit>()..loadProducts()),
        BlocProvider(create: (_) => getIt<OrderFormCubit>()),
      ],
      child: const OrderFormView(),
    );
  }
}

// Each Cubit handles its own concern
class CustomerSelectCubit extends Cubit<CustomerSelectState> { /* ... */ }
class ProductCatalogCubit extends Cubit<ProductCatalogState> { /* ... */ }
class OrderFormCubit extends Cubit<OrderFormState> {
  // Receives selected customer and products from UI callbacks — not from other Cubits
  void setCustomer(Customer customer) { /* ... */ }
  void addProduct(Product product, int quantity) { /* ... */ }
  Future<void> submitOrder() async { /* ... */ }
}
```

### Pattern 11.4: HydratedCubit

Persist state across app restarts — useful for preferences, draft forms, filters.

```dart
import 'package:hydrated_bloc/hydrated_bloc.dart';

class FilterCubit extends HydratedCubit<FilterState> {
  FilterCubit() : super(const FilterState.initial());

  void setDateRange(DateTime start, DateTime end) {
    emit(state.copyWith(startDate: start, endDate: end));
  }

  void setStatus(OrderStatus? status) {
    emit(state.copyWith(selectedStatus: status));
  }

  void clearFilters() {
    emit(const FilterState.initial());
  }

  // HydratedCubit requires toJson/fromJson
  @override
  FilterState? fromJson(Map<String, dynamic> json) {
    return FilterState.fromJson(json);
  }

  @override
  Map<String, dynamic>? toJson(FilterState state) {
    return state.toJson();
  }
}

// Setup in main.dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  HydratedBloc.storage = await HydratedStorage.build(
    storageDirectory: await getApplicationDocumentsDirectory(),
  );
  runApp(const MyApp());
}
```

---

## MUST DO

- Use Cubit for simple state (method calls, no event tracing)
- Use Freezed for state classes (immutable, copyWith)
- Inject UseCases via constructor
- Use HydratedCubit for persistent state (filters, preferences)

## MUST NOT DO

- Use Cubit when event traceability is needed (use BLoC)
- Import another Cubit from a Cubit
- Mutate state directly (always emit new state)
- Forget HydratedStorage.build() in main.dart when using HydratedCubit

---

## References

- [BLoC Library — Cubit](https://bloclibrary.dev/bloc-concepts/#cubit)
- [hydrated_bloc](https://pub.dev/packages/hydrated_bloc)
