# Effective Dart Specialist
# Effective Dartスペシャリスト
# Chuyen Gia Effective Dart

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — coding standards apply everywhere) |
| **Directory Pattern** | `lib/` (applies to all Dart files) |
| **Variant** | ALL |
| **Naming Convention** | PascalCase (classes, enums, typedefs), camelCase (vars, functions, params), snake_case (files, libraries, packages), lowerCamelCase (constants — NOT UPPER_CASE) |
| **Imports From** | N/A (rule set applied to all code, not a code module) |
| **Cannot Import** | N/A (rule set — no import restrictions of its own) |
| **Pattern Numbers** | 2.1–2.5 |
| **Source Paths** | `lib/**/*.dart`, `test/**/*.dart` |
| **File Count** | Cross-cutting: applies to all Dart files in project |
| **Imported By** | N/A (enforcement rules, not importable code) |
| **Dependencies** | None (Dart SDK conventions) |
| **When To Use** | Code review, style enforcement, null safety patterns, async best practices |
| **Source Skeleton** | N/A (enforcement rules on existing code, not new file creation) |
| **Specialist Type** | rule-set |
| **Purpose** | Enforce Dart coding standards — naming conventions, null safety patterns, async/await best practices, collection idioms, error handling philosophy |
| **Activation Trigger** | files: lib/**/*.dart, test/**/*.dart; keywords: naming, nullSafety, asyncAwait, dartStyle, effectiveDart, codeStyle |

---

## Patterns

### Pattern 2.1: Naming Conventions

Official Dart naming rules — follow exactly:

| Element | Style | Example | Anti-pattern |
|---------|-------|---------|-------------|
| Class | PascalCase | `UserRepository` | `userRepository`, `user_repository` |
| Enum | PascalCase | `OrderStatus` | `ORDER_STATUS` |
| Enum value | camelCase | `OrderStatus.pending` | `OrderStatus.PENDING` |
| Typedef | PascalCase | `JsonMap` | `json_map` |
| Extension | PascalCase | `StringExtension` | `stringExtension` |
| Variable | camelCase | `userName` | `user_name`, `UserName` |
| Function | camelCase | `getUserById` | `get_user_by_id` |
| Parameter | camelCase | `String firstName` | `String first_name` |
| Constant | lowerCamelCase | `const maxRetries = 3` | `const MAX_RETRIES = 3` ❌ |
| Private | underscore prefix | `_privateField` | `__doubleUnderscore` |
| File | snake_case | `user_repository.dart` | `UserRepository.dart` |
| Library | snake_case | `package:my_app/utils` | `package:myApp/utils` |
| Directory | snake_case | `data_access/` | `dataAccess/` |

```dart
// ✅ Correct Dart naming
class UserProfileRepository {
  static const maxCacheAge = Duration(minutes: 30); // NOT MAX_CACHE_AGE
  
  final ApiClient _apiClient;
  
  const UserProfileRepository(this._apiClient);
  
  Future<User> getUserById(String userId) async {
    // ...
  }
}

// ❌ Wrong — Java/C# style in Dart
class User_Profile_Repository {
  static const MAX_CACHE_AGE = Duration(minutes: 30); // WRONG
  
  Future<User> GetUserById(String user_id) async { // WRONG
    // ...
  }
}
```

### Pattern 2.2: Null Safety

Dart 3.x null safety patterns — use the type system, not runtime checks:

```dart
// ✅ Required parameters — no null check needed
class User {
  final String name;
  final String email;
  final String? phone; // Nullable — may not have phone
  
  const User({required this.name, required this.email, this.phone});
}

// ✅ Null-aware operators
String getDisplayName(User? user) {
  return user?.name ?? 'Anonymous';
}

// ✅ Null assertion (!) — ONLY when you are 100% certain
void processVerifiedUser(User? user) {
  assert(user != null, 'User must be verified before processing');
  final name = user!.name; // Safe — assert guarantees non-null in debug
}

// ✅ Late initialization — when value is guaranteed before first read
class SettingsBloc extends Cubit<SettingsState> {
  late final SharedPreferences _prefs;
  
  SettingsBloc() : super(const SettingsInitial()) {
    _initPrefs();
  }
  
  Future<void> _initPrefs() async {
    _prefs = await SharedPreferences.getInstance();
    // _prefs is guaranteed initialized before any read
  }
}

// ❌ DON'T — unnecessary null check on non-nullable
void bad(String name) {
  if (name != null) { /* name is already non-nullable! */ }
}

// ❌ DON'T — using `as` for nullable cast
void alsoBad(Object? obj) {
  final user = obj as User; // Throws if null — use `as User?` + null check
}
```

### Pattern 2.3: Async/Await Best Practices

```dart
// ✅ Use async/await — not .then() chains
Future<User> getUser(String id) async {
  try {
    final response = await apiClient.get('/users/$id');
    return UserModel.fromJson(response.data).toEntity();
  } on DioException catch (e) {
    throw ServerException(e.message ?? 'Unknown error', statusCode: e.response?.statusCode);
  }
}

// ✅ Stream — use async* generator
Stream<List<User>> watchUsers() async* {
  while (true) {
    final users = await getUsers();
    yield users;
    await Future.delayed(const Duration(seconds: 30));
  }
}

// ✅ Parallel execution — use Future.wait
Future<(User, List<Order>)> getUserWithOrders(String userId) async {
  final results = await Future.wait([
    getUser(userId),
    getOrders(userId),
  ]);
  return (results[0] as User, results[1] as List<Order>);
}

// ✅ Cancel subscriptions in dispose
class UserPage extends StatefulWidget { /* ... */ }
class _UserPageState extends State<UserPage> {
  StreamSubscription<User>? _subscription;
  
  @override
  void initState() {
    super.initState();
    _subscription = userStream.listen((user) { /* ... */ });
  }
  
  @override
  void dispose() {
    _subscription?.cancel(); // Always cancel!
    super.dispose();
  }
}

// ❌ DON'T — forget to cancel subscriptions
// ❌ DON'T — use .then().catchError() (use async/await + try/catch)
// ❌ DON'T — await in loops when Future.wait is possible
```

### Pattern 2.4: Collection Patterns

Dart collection idioms — concise, readable:

```dart
// ✅ Spread operator
final allItems = [
  ...localItems,
  ...remoteItems,
];

// ✅ If-collection — conditional items
Widget build(BuildContext context) {
  return Column(
    children: [
      const Header(),
      if (isLoggedIn) const UserProfile(),
      if (hasNotifications) const NotificationBadge(),
      ...items.map((item) => ItemCard(item: item)),
      const Footer(),
    ],
  );
}

// ✅ For-collection — generate items inline
final options = [
  for (final role in UserRole.values)
    DropdownMenuItem(value: role, child: Text(role.displayName)),
];

// ✅ Collection literals — prefer over constructors
final names = <String>[];         // NOT List<String>()
final lookup = <String, User>{};  // NOT Map<String, User>()
final uniqueIds = <String>{};     // NOT Set<String>()

// ✅ where/map/any/every — functional style
final activeUsers = users.where((u) => u.isActive).toList();
final userNames = users.map((u) => u.name).toList();
final hasAdmin = users.any((u) => u.role == UserRole.admin);
```

### Pattern 2.5: Error Handling Philosophy

Three error strategies — use the right one for the right layer:

```dart
// DOMAIN LAYER: Either<Failure, T> — typed, composable
// Use in UseCases and Repository interfaces
abstract class UserRepository {
  Future<Either<Failure, User>> getUser(String id);
}

class GetUser {
  final UserRepository _repo;
  const GetUser(this._repo);
  
  Future<Either<Failure, User>> call(String id) => _repo.getUser(id);
}

// DATA LAYER: try-catch → convert to Either
// Catch specific exceptions, wrap in Failure
class UserRepositoryImpl implements UserRepository {
  @override
  Future<Either<Failure, User>> getUser(String id) async {
    try {
      final model = await remoteDataSource.getUser(id);
      return Right(model.toEntity());
    } on ServerException catch (e) {
      return Left(ServerFailure(e.message, statusCode: e.statusCode));
    } on CacheException catch (e) {
      return Left(CacheFailure(e.message));
    }
  }
}

// PRESENTATION LAYER: fold() — convert Either to state
// In BLoC handler — fold Either into emit
class UserBloc extends Bloc<UserEvent, UserState> {
  final GetUser _getUser;
  
  UserBloc(this._getUser) : super(const UserInitial()) {
    on<LoadUser>((event, emit) async {
      emit(const UserLoading());
      final result = await _getUser(event.userId);
      result.fold(
        (failure) => emit(UserError(failure)),
        (user) => emit(UserLoaded(user)),
      );
    });
  }
}

// ❌ DON'T — catch-all without type
// try { ... } catch (e) { print(e); } // Swallows ALL errors including bugs

// ❌ DON'T — throw in domain layer (use Either)
// throw Exception('User not found'); // Untyped, unchecked
```

---

## MUST DO

- Follow Dart naming conventions exactly (lowerCamelCase constants, NOT UPPER_CASE)
- Use `required` for non-nullable constructor params
- Cancel all StreamSubscriptions in dispose()
- Use collection literals, not constructors
- Use Either<Failure, T> in domain/data, fold() in presentation

## MUST NOT DO

- Use UPPER_CASE_CONSTANTS (Dart uses lowerCamelCase)
- Use `.then().catchError()` chains (use async/await + try/catch)
- Forget to cancel subscriptions (causes memory leaks)
- Use bare `catch (e)` without typed exception
- Use `dynamic` when specific type is known

---

## References

- [Effective Dart: Style](https://dart.dev/effective-dart/style)
- [Effective Dart: Usage](https://dart.dev/effective-dart/usage)
- [Effective Dart: Design](https://dart.dev/effective-dart/design)
- [Effective Dart: Documentation](https://dart.dev/effective-dart/documentation)
