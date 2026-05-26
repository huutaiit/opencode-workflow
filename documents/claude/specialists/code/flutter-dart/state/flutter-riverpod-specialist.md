# Flutter Riverpod Specialist
# Flutter Riverpodスペシャリスト
# Chuyen Gia Riverpod Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: clean-riverpod

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Directory Pattern** | `lib/features/{feature}/presentation/providers/` |
| **Variant** | clean-riverpod |
| **Naming Convention** | `{name}_provider.dart`, `{name}_notifier.dart`. Classes: `{Name}Notifier`, provider: `{name}Provider` |
| **Imports From** | Domain (entities, usecases via Riverpod providers) |
| **Cannot Import** | Data (direct), other features' providers (unless shared via core/) |
| **Pattern Numbers** | 12.1–12.5 |
| **Source Paths** | `lib/features/*/presentation/providers/*.dart` |
| **File Count** | 2-3 files per feature provider set, 10-30 providers per enterprise app |
| **Imported By** | Presentation (widgets consume via Consumer/ref.watch) |
| **Dependencies** | flutter_riverpod ^2.5.0, riverpod_annotation ^2.3.0, riverpod_generator ^2.4.0 |
| **When To Use** | State management with built-in DI, compile-safe providers, auto-dispose lifecycle |
| **Source Skeleton** | `lib/features/{f}/presentation/providers/{name}_provider.dart`, `{name}_notifier.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate Riverpod providers with typed state, auto-dispose, family parameters, and proper ProviderScope setup |
| **Activation Trigger** | files: lib/features/*/presentation/providers/*.dart; keywords: riverpod, provider, notifier, asyncNotifier, consumerWidget |

---

## Patterns

### Pattern 12.1: Provider Types

```dart
// 1. Provider — computed/derived value (read-only, no state)
final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(baseUrl: 'https://api.example.com');
});

// 2. StateProvider — simple mutable state
final selectedTabProvider = StateProvider<int>((ref) => 0);

// 3. FutureProvider — async data loading
final userProvider = FutureProvider.family<User, String>((ref, userId) async {
  final repository = ref.watch(userRepositoryProvider);
  final result = await repository.getUser(userId);
  return result.fold((f) => throw f, (user) => user);
});

// 4. StreamProvider — real-time data
final notificationsProvider = StreamProvider<List<Notification>>((ref) {
  final repository = ref.watch(notificationRepositoryProvider);
  return repository.watchNotifications();
});

// 5. NotifierProvider — complex state with methods (recommended)
@riverpod
class UserList extends _$UserList {
  @override
  Future<List<User>> build() async {
    final repository = ref.watch(userRepositoryProvider);
    final result = await repository.getUsers();
    return result.fold((f) => throw f, (users) => users);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final result = await ref.read(userRepositoryProvider).getUsers();
      return result.fold((f) => throw f, (users) => users);
    });
  }

  Future<void> deleteUser(String id) async {
    await ref.read(userRepositoryProvider).deleteUser(id);
    ref.invalidateSelf(); // Triggers rebuild
  }
}
```

### Pattern 12.2: Family + AutoDispose

```dart
// Family — parameterized provider (different instance per parameter)
@riverpod
Future<User> userDetail(UserDetailRef ref, String userId) async {
  final repository = ref.watch(userRepositoryProvider);
  final result = await repository.getUser(userId);
  return result.fold((f) => throw f, (user) => user);
}

// AutoDispose — automatically cleaned up when no longer listened
// (default with @riverpod annotation)
@riverpod
class OrderForm extends _$OrderForm {
  @override
  OrderFormState build() => const OrderFormState.initial();

  // State automatically disposed when user navigates away
  void updateField(String field, String value) { /* ... */ }
}

// Keep alive — prevent auto-dispose for specific providers
@Riverpod(keepAlive: true)
class AuthState extends _$AuthState {
  @override
  Future<User?> build() async {
    // Auth state persists for entire app lifecycle
    return _checkStoredToken();
  }
}
```

### Pattern 12.3: Ref.watch vs Ref.read

```dart
class UserProfilePage extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // ✅ watch — reactive, rebuilds when provider changes
    final userAsync = ref.watch(userDetailProvider(userId));

    // ✅ listen — for side effects (navigation, snackbar)
    ref.listen(authStateProvider, (previous, next) {
      if (next is AsyncData && next.value == null) {
        context.go('/login'); // Navigate on logout
      }
    });

    return userAsync.when(
      data: (user) => UserProfileView(user: user),
      loading: () => const CircularProgressIndicator(),
      error: (error, stack) => ErrorDisplay(error: error),
    );
  }

  // ✅ read — one-time access in callbacks (NOT in build)
  void _onDeletePressed(WidgetRef ref) {
    ref.read(userListProvider.notifier).deleteUser(userId);
  }
}

// ❌ DON'T use ref.read in build — won't react to changes
// ❌ DON'T use ref.watch in callbacks — unnecessary rebuild
```

### Pattern 12.4: ProviderScope + Overrides

```dart
// Root ProviderScope — required at app root
void main() {
  runApp(
    const ProviderScope(child: MyApp()),
  );
}

// Testing overrides — replace providers with fakes
testWidgets('shows user name', (tester) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        userRepositoryProvider.overrideWithValue(FakeUserRepository()),
        userDetailProvider(testUserId).overrideWith(
          (ref) => Future.value(testUser),
        ),
      ],
      child: const MaterialApp(home: UserProfilePage()),
    ),
  );

  expect(find.text('John Doe'), findsOneWidget);
});
```

### Pattern 12.5: Riverpod Code Generation

```dart
// pubspec.yaml
// dev_dependencies:
//   riverpod_generator: ^2.4.0
//   build_runner: ^2.4.0

// With @riverpod annotation — generates provider automatically
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'user_providers.g.dart';

@riverpod
Future<User> userDetail(UserDetailRef ref, String userId) async {
  final repo = ref.watch(userRepositoryProvider);
  return (await repo.getUser(userId)).fold((f) => throw f, (u) => u);
}

@riverpod
class UserList extends _$UserList {
  @override
  Future<List<User>> build() async { /* ... */ }
}

// Run code generation:
// dart run build_runner build --delete-conflicting-outputs
```

---

## MUST DO

- Use `@riverpod` annotation for code generation (less boilerplate)
- Use `ref.watch` in build, `ref.read` in callbacks, `ref.listen` for side effects
- Use ProviderScope at app root
- Use overrides for testing

## MUST NOT DO

- Use `ref.read` in build method (won't react to changes)
- Use `ref.watch` in callbacks (unnecessary rebuilds)
- Create providers without ProviderScope ancestor
- Mix Riverpod with GetIt (Riverpod IS the DI)

---

## References

- [Riverpod Documentation](https://riverpod.dev/)
- [riverpod_generator](https://pub.dev/packages/riverpod_generator)
