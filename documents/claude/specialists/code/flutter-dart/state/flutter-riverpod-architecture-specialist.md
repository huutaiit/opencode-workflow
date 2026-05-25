# Flutter Riverpod Architecture Specialist
# Flutter Riverpodアーキテクチャスペシャリスト
# Chuyen Gia Kien Truc Riverpod Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: clean-riverpod

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — defines how Riverpod replaces DI + state across layers) |
| **Directory Pattern** | `lib/features/{feature}/presentation/providers/`, `lib/core/providers/` |
| **Variant** | clean-riverpod |
| **Naming Convention** | `{name}_provider.dart` for DI providers, `{name}_notifier.dart` for state |
| **Imports From** | Domain (repository interfaces), Data (repo implementations for DI binding) |
| **Cannot Import** | N/A (architecture integration — wires all layers via providers) |
| **Pattern Numbers** | 13.1–13.4 |
| **Source Paths** | `lib/core/providers/*.dart`, `lib/features/*/presentation/providers/*.dart` |
| **File Count** | 5-10 core DI providers + 2-4 per feature |
| **Imported By** | ALL Riverpod features (core providers imported by feature providers) |
| **Dependencies** | flutter_riverpod ^2.5.0, riverpod_annotation ^2.3.0 |
| **When To Use** | Wiring Clean Architecture layers with Riverpod (replaces GetIt DI) |
| **Source Skeleton** | `lib/core/providers/repository_providers.dart`, `lib/core/providers/usecase_providers.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate Riverpod provider bindings for Clean Architecture — repository providers, usecase providers, AsyncNotifier state architecture |
| **Activation Trigger** | files: lib/core/providers/*.dart; keywords: riverpodArchitecture, repositoryProvider, usecaseProvider, asyncNotifier |

---

## Patterns

### Pattern 13.1: Repository Providers

Riverpod replaces GetIt for dependency injection — providers wire interfaces to implementations.

```dart
// lib/core/providers/repository_providers.dart
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../network/api_client.dart';
import '../../features/user/data/datasources/user_remote_data_source.dart';
import '../../features/user/data/datasources/user_local_data_source.dart';
import '../../features/user/data/repositories/user_repository_impl.dart';
import '../../features/user/domain/repositories/user_repository.dart';

part 'repository_providers.g.dart';

// Infrastructure providers
@Riverpod(keepAlive: true)
ApiClient apiClient(ApiClientRef ref) {
  return ApiClient(baseUrl: 'https://api.example.com');
}

// Data source providers
@riverpod
UserRemoteDataSource userRemoteDataSource(UserRemoteDataSourceRef ref) {
  return UserRemoteDataSourceImpl(ref.watch(apiClientProvider));
}

@riverpod
UserLocalDataSource userLocalDataSource(UserLocalDataSourceRef ref) {
  return UserLocalDataSourceImpl(ref.watch(databaseProvider));
}

// Repository provider — binds interface to implementation
@riverpod
UserRepository userRepository(UserRepositoryRef ref) {
  return UserRepositoryImpl(
    remoteDataSource: ref.watch(userRemoteDataSourceProvider),
    localDataSource: ref.watch(userLocalDataSourceProvider),
    networkInfo: ref.watch(networkInfoProvider),
  );
}
```

### Pattern 13.2: UseCase Providers

```dart
// lib/core/providers/usecase_providers.dart
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../features/user/domain/usecases/get_user.dart';
import '../../features/user/domain/usecases/update_user.dart';

part 'usecase_providers.g.dart';

@riverpod
GetUser getUser(GetUserRef ref) {
  return GetUser(ref.watch(userRepositoryProvider));
}

@riverpod
UpdateUser updateUser(UpdateUserRef ref) {
  return UpdateUser(ref.watch(userRepositoryProvider));
}

// Usage in presentation — provider watches usecase provider
@riverpod
class UserDetail extends _$UserDetail {
  @override
  Future<User> build(String userId) async {
    final getUser = ref.watch(getUserProvider);
    final result = await getUser(userId);
    return result.fold((f) => throw f, (user) => user);
  }
}
```

### Pattern 13.3: State Notifier Architecture

AsyncNotifier for complex state — build() is the initial load, methods mutate state.

```dart
// lib/features/order/presentation/providers/order_list_notifier.dart
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'order_list_notifier.g.dart';

@riverpod
class OrderList extends _$OrderList {
  @override
  Future<List<Order>> build() async {
    // Initial load — called automatically when provider first watched
    final getOrders = ref.watch(getOrdersProvider);
    final result = await getOrders(const NoParams());
    return result.fold((f) => throw f, (orders) => orders);
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final getOrders = ref.read(getOrdersProvider);
      final result = await getOrders(const NoParams());
      return result.fold((f) => throw f, (orders) => orders);
    });
  }

  Future<void> createOrder(CreateOrderParams params) async {
    final createOrder = ref.read(createOrderProvider);
    final result = await createOrder(params);
    result.fold(
      (failure) => state = AsyncError(failure, StackTrace.current),
      (order) {
        final currentOrders = state.valueOrNull ?? [];
        state = AsyncData([order, ...currentOrders]);
      },
    );
  }
}
```

### Pattern 13.4: AsyncValue Handling

```dart
// In ConsumerWidget — handle loading/error/data
class OrderListPage extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(orderListProvider);

    return ordersAsync.when(
      data: (orders) => ListView.builder(
        itemCount: orders.length,
        itemBuilder: (context, index) => OrderCard(order: orders[index]),
      ),
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (error, stack) => Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Error: ${error is Failure ? error.message : error.toString()}'),
            ElevatedButton(
              onPressed: () => ref.invalidate(orderListProvider),
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}

// Guard — convert Future to AsyncValue with error catching
Future<void> safeAction(WidgetRef ref) async {
  final result = await AsyncValue.guard(() async {
    return await ref.read(someProvider.future);
  });
  // result is AsyncValue<T> — already handles errors
}
```

---

## MUST DO

- Use `@Riverpod(keepAlive: true)` for singletons (ApiClient, Database)
- Use `@riverpod` (auto-dispose) for feature-scoped providers
- Wire Repository interface → implementation via provider
- Use `ref.watch` for reactive dependencies between providers
- Use `.when()` for AsyncValue in build method

## MUST NOT DO

- Mix GetIt with Riverpod (use one DI system)
- Create repository directly in widget (`UserRepositoryImpl(...)`)
- Use `ref.read` in build method of provider (use `ref.watch`)
- Forget ProviderScope at app root
- Catch errors manually — use `AsyncValue.guard()`

---

## References

- [Riverpod Architecture](https://codewithandrea.com/articles/flutter-app-architecture-riverpod-introduction/)
- [riverpod_annotation](https://pub.dev/packages/riverpod_annotation)
