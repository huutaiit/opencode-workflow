# Flutter GetIt + Injectable Specialist
# Flutter GetIt + Injectableスペシャリスト
# Chuyen Gia GetIt Va Injectable Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: clean-bloc

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Core |
| **Directory Pattern** | `lib/core/di/` |
| **Variant** | clean-bloc |
| **Naming Convention** | `injection_container.dart`, `{module}_module.dart`. Functions: `configureDependencies()`, `getIt` instance |
| **Imports From** | Domain (repository interfaces for abstract binding), Data (repository impls + datasources for concrete registration), Presentation (BLoCs for factory registration) |
| **Cannot Import** | N/A (DI container wires all layers — it imports from everywhere by design, but only for registration) |
| **Pattern Numbers** | 50.1–50.5 |
| **Source Paths** | `lib/core/di/*.dart` |
| **File Count** | 1-3 files (injection_container + optional module files) |
| **Imported By** | Core (main.dart calls configureDependencies()), Presentation (BLoC constructors receive injected deps) |
| **Dependencies** | get_it ^7.6.0, injectable ^2.3.0, injectable_generator ^2.6.0 (dev) |
| **When To Use** | Wiring domain interfaces to data implementations, registering services and BLoCs |
| **Source Skeleton** | `lib/core/di/injection_container.dart`, `lib/core/di/injection_container.config.dart` (generated) |
| **Specialist Type** | code |
| **Purpose** | Generate GetIt + Injectable DI configuration wiring domain interfaces to data implementations with environment-based and scoped registration |
| **Activation Trigger** | files: lib/core/di/*.dart; keywords: getIt, injectable, dependencyInjection, serviceLocator, registerSingleton |

---

## Patterns

### Pattern 50.1: GetIt Registration

Full dependency chain: Dio → DataSource → Repository → UseCase → BLoC.

```dart
// lib/core/di/injection_container.dart
import 'package:get_it/get_it.dart';
import 'package:injectable/injectable.dart';
import 'injection_container.config.dart';

final getIt = GetIt.instance;

@InjectableInit(preferRelativeImports: true)
Future<void> configureDependencies({String? environment}) async =>
    getIt.init(environment: environment);
```

```dart
// Manual registration (without Injectable code generation)
void _registerCoreDependencies() {
  // Singletons — one instance for entire app
  getIt.registerLazySingleton<Dio>(() => Dio(BaseOptions(
    baseUrl: AppConfig.apiUrl,
    connectTimeout: const Duration(seconds: 30),
  ))..interceptors.addAll([
    AuthInterceptor(getIt()),
    LoggingInterceptor(),
  ]));

  getIt.registerLazySingleton<NetworkInfo>(
    () => NetworkInfoImpl(Connectivity()),
  );
}

void _registerUserFeature() {
  // DataSources
  getIt.registerLazySingleton<UserRemoteDataSource>(
    () => UserRemoteDataSourceImpl(getIt<Dio>()),
  );
  getIt.registerLazySingleton<UserLocalDataSource>(
    () => UserLocalDataSourceImpl(getIt<AppDatabase>()),
  );

  // Repository — bind interface to implementation
  getIt.registerLazySingleton<UserRepository>(
    () => UserRepositoryImpl(
      remoteDataSource: getIt(),
      localDataSource: getIt(),
      networkInfo: getIt(),
    ),
  );

  // UseCases
  getIt.registerLazySingleton(() => GetUser(getIt()));
  getIt.registerLazySingleton(() => UpdateUser(getIt()));
  getIt.registerLazySingleton(() => DeleteUser(getIt()));

  // BLoC — factory (new instance per screen)
  getIt.registerFactory(() => UserBloc(
    getUser: getIt(),
    updateUser: getIt(),
    deleteUser: getIt(),
  ));
}
```

### Pattern 50.2: Injectable Code Generation

Annotations eliminate manual registration boilerplate.

```dart
// DataSource — singleton (one connection)
@LazySingleton(as: UserRemoteDataSource)
class UserRemoteDataSourceImpl implements UserRemoteDataSource {
  final Dio _dio;

  @factoryMethod
  UserRemoteDataSourceImpl(this._dio);

  @override
  Future<UserModel> getUser(String id) async {
    final response = await _dio.get('/users/$id');
    return UserModel.fromJson(response.data);
  }
}

// Repository — singleton
@LazySingleton(as: UserRepository)
class UserRepositoryImpl implements UserRepository {
  final UserRemoteDataSource _remoteDataSource;
  final UserLocalDataSource _localDataSource;
  final NetworkInfo _networkInfo;

  UserRepositoryImpl({
    required UserRemoteDataSource remoteDataSource,
    required UserLocalDataSource localDataSource,
    required NetworkInfo networkInfo,
  })  : _remoteDataSource = remoteDataSource,
        _localDataSource = localDataSource,
        _networkInfo = networkInfo;

  // ...
}

// UseCase — singleton
@lazySingleton
class GetUser extends UseCase<User, String> {
  final UserRepository _repository;
  const GetUser(this._repository);

  @override
  Future<Either<Failure, User>> call(String userId) =>
      _repository.getUser(userId);
}

// BLoC — factory (new instance per screen)
@injectable
class UserBloc extends Bloc<UserEvent, UserState> {
  UserBloc(
    @factoryParam GetUser getUser,
    @factoryParam UpdateUser updateUser,
  ) : super(const UserInitial());
}

// Third-party module — register external dependencies
@module
abstract class AppModule {
  @lazySingleton
  Dio get dio => Dio(BaseOptions(baseUrl: AppConfig.apiUrl));

  @lazySingleton
  SharedPreferences get prefs => throw UnimplementedError();
  // Async registration handled via @preResolve
}
```

### Pattern 50.3: Environment-based Registration

Different implementations for dev, staging, prod.

```dart
// lib/core/di/injection_container.dart
Future<void> configureDependencies({String? environment}) async =>
    getIt.init(environment: environment ?? Environment.prod);

// main_dev.dart
void main() async {
  await configureDependencies(environment: Environment.dev);
  runApp(const MyApp());
}

// main_prod.dart
void main() async {
  await configureDependencies(environment: Environment.prod);
  runApp(const MyApp());
}

// Environment-specific implementations
@dev
@LazySingleton(as: ApiClient)
class MockApiClient implements ApiClient {
  @override
  Future<Response> get(String path) async {
    // Return mock data — no network calls in dev
    return Response(data: mockData[path], statusCode: 200);
  }
}

@prod
@LazySingleton(as: ApiClient)
class RealApiClient implements ApiClient {
  final Dio _dio;
  RealApiClient(this._dio);

  @override
  Future<Response> get(String path) => _dio.get(path);
}
```

### Pattern 50.4: Scoped Registration

Feature-level DI — register/unregister when feature loads/unloads.

```dart
// Register feature dependencies on demand
void registerOrderFeature() {
  if (!getIt.isRegistered<OrderRepository>()) {
    getIt.registerLazySingleton<OrderRemoteDataSource>(
      () => OrderRemoteDataSourceImpl(getIt()),
    );
    getIt.registerLazySingleton<OrderRepository>(
      () => OrderRepositoryImpl(remoteDataSource: getIt()),
    );
    getIt.registerFactory(() => OrderBloc(getOrders: getIt()));
  }
}

void unregisterOrderFeature() {
  getIt.unregister<OrderBloc>();
  getIt.unregister<OrderRepository>();
  getIt.unregister<OrderRemoteDataSource>();
}
```

### Pattern 50.5: Testing Overrides

Replace real services with fakes in tests.

```dart
// test/helpers/test_injection.dart
void setupTestDependencies() {
  getIt.allowReassignment = true;

  // Replace with fakes
  getIt.registerLazySingleton<UserRepository>(() => FakeUserRepository());
  getIt.registerLazySingleton<AuthService>(() => FakeAuthService());

  // BLoC uses fakes automatically via DI
  getIt.registerFactory(() => UserBloc(
    getUser: GetUser(getIt<UserRepository>()),
  ));
}

void tearDownTestDependencies() {
  getIt.reset();
}

// In test
void main() {
  setUp(() => setupTestDependencies());
  tearDown(() => tearDownTestDependencies());

  testWidgets('shows user name', (tester) async {
    await tester.pumpWidget(
      BlocProvider(
        create: (_) => getIt<UserBloc>()..add(const LoadUser('test-id')),
        child: const MaterialApp(home: UserDetailPage()),
      ),
    );
    expect(find.text('John Doe'), findsOneWidget);
  });
}
```

---

## MUST DO

- Use `@lazySingleton` for services, repositories, datasources
- Use `@injectable` (factory) for BLoCs/Cubits — new instance per screen
- Bind interface to implementation: `@LazySingleton(as: UserRepository)`
- Use environment annotations for dev/prod switching
- Run `dart run build_runner build` after adding annotations

## MUST NOT DO

- Use GetIt with Riverpod variant (Riverpod has built-in DI)
- Register BLoC as singleton (creates shared state between screens)
- Import GetIt in domain layer (DI is core infrastructure)
- Forget `allowReassignment = true` in test setup
- Manually instantiate classes that should be injected

---

## References

- [get_it Package](https://pub.dev/packages/get_it)
- [injectable Package](https://pub.dev/packages/injectable)
