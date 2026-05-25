# Dart 3 Language Specialist
# Dart 3言語スペシャリスト
# Chuyen Gia Ngon Ngu Dart 3

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — language features used in every layer) |
| **Directory Pattern** | `lib/` (applies to all Dart files) |
| **Variant** | ALL |
| **Naming Convention** | snake_case files, PascalCase classes, camelCase vars/methods, lowerCamelCase constants |
| **Imports From** | ALL (language patterns apply everywhere) |
| **Cannot Import** | N/A (language features, not a code module — no import restrictions) |
| **Pattern Numbers** | 1.1–1.6 |
| **Source Paths** | `lib/**/*.dart` |
| **File Count** | Cross-cutting: applies to all Dart files in project |
| **Imported By** | N/A (language patterns, not importable code) |
| **Dependencies** | None (Dart 3.x SDK built-in features) |
| **When To Use** | Using Dart 3 language features: records, patterns, sealed classes, extension types |
| **Source Skeleton** | N/A (language patterns applied within existing files, not new files) |
| **Specialist Type** | code |
| **Purpose** | Generate Dart 3.x code using records, pattern matching, sealed classes, extension types, and enhanced enums correctly |
| **Activation Trigger** | files: lib/**/*.dart; keywords: record, sealed, patternMatching, extensionType, enhancedEnum, switchExpression |

---

## Patterns

### Pattern 1.1: Records

Multi-value returns without creating a class. Dart 3 records are structural types with positional and named fields.

```dart
// Positional record — return multiple values
(String, int) getUserInfo(String id) {
  return ('John Doe', 30);
}

// Named fields record — self-documenting
({String name, int age, String email}) getUserProfile(String id) {
  return (name: 'John Doe', age: 30, email: 'john@example.com');
}

// Destructuring in caller
void displayUser() {
  final (name, age) = getUserInfo('123');
  print('$name is $age years old');

  final (:name, :age, :email) = getUserProfile('123');
  print('$name ($email)');
}

// Record as Map key (structural equality)
final cache = <(String, int), UserData>{};
cache[('user', 123)] = userData;
```

**Why This Pattern**:
- ✅ Avoid creating one-off classes for multi-value returns
- ✅ Structural equality built-in (no Equatable needed for records)
- ✅ Type-safe — compiler enforces field types

### Pattern 1.2: Patterns + Destructuring

Switch expressions with pattern matching — exhaustive, concise, type-safe.

```dart
// Switch expression (not statement) — returns a value
String describeStatus(OrderStatus status) => switch (status) {
  OrderStatus.pending => 'Waiting for confirmation',
  OrderStatus.processing => 'Being prepared',
  OrderStatus.shipped => 'On the way',
  OrderStatus.delivered => 'Delivered successfully',
  OrderStatus.cancelled => 'Order cancelled',
};

// Object pattern — destructure in switch
String formatUser(Object obj) => switch (obj) {
  User(name: final name, age: final age) when age >= 18 => '$name (adult)',
  User(name: final name) => '$name (minor)',
  String s => 'Raw string: $s',
  _ => 'Unknown type',
};

// List pattern
String describeList(List<int> items) => switch (items) {
  [] => 'Empty list',
  [final single] => 'Single item: $single',
  [final first, final second] => 'Pair: $first, $second',
  [final first, ...final rest] => 'First: $first, rest: ${rest.length} items',
};

// Guard clause with `when`
String classify(int value) => switch (value) {
  final v when v < 0 => 'Negative',
  0 => 'Zero',
  final v when v <= 100 => 'Normal',
  _ => 'High',
};
```

**Why This Pattern**:
- ✅ Compiler enforces exhaustive matching — no missing cases
- ✅ Replaces if-else chains with type-safe switch expressions
- ✅ Guard clauses (`when`) add conditional logic within patterns

### Pattern 1.3: Sealed Classes

Algebraic data types — the compiler knows all subtypes, enabling exhaustive switching.

```dart
// BLoC State — sealed class (recommended over @freezed for simple states)
sealed class UserState {
  const UserState();
}

class UserInitial extends UserState {
  const UserInitial();
}

class UserLoading extends UserState {
  const UserLoading();
}

class UserLoaded extends UserState {
  final User user;
  const UserLoaded(this.user);
}

class UserError extends UserState {
  final Failure failure;
  const UserError(this.failure);
}

// Exhaustive switch — compiler error if case missing
Widget buildContent(UserState state) => switch (state) {
  UserInitial() => const SizedBox.shrink(),
  UserLoading() => const CircularProgressIndicator(),
  UserLoaded(:final user) => UserCard(user: user),
  UserError(:final failure) => ErrorWidget(message: failure.message),
};

// Failure hierarchy — sealed class
sealed class Failure {
  final String message;
  const Failure(this.message);
}

class ServerFailure extends Failure {
  final int? statusCode;
  const ServerFailure(super.message, {this.statusCode});
}

class CacheFailure extends Failure {
  const CacheFailure(super.message);
}

class NetworkFailure extends Failure {
  const NetworkFailure(super.message);
}
```

**Why This Pattern**:
- ✅ Compiler-enforced exhaustiveness — no forgotten states
- ✅ Each subclass can have different fields (unlike enum)
- ✅ Works naturally with BLoC states, error types, result types

### Pattern 1.4: Extension Types

Zero-cost wrapper types — type safety without runtime overhead.

```dart
// Typed IDs — prevent mixing user ID with order ID
extension type UserId(String value) {
  factory UserId.fromInt(int id) => UserId(id.toString());
}

extension type OrderId(String value) {
  factory OrderId.generate() => OrderId(const Uuid().v4());
}

// Compile-time type safety — no runtime cost
void getUser(UserId id) { /* ... */ }
void getOrder(OrderId id) { /* ... */ }

final userId = UserId('usr-123');
final orderId = OrderId('ord-456');

getUser(userId);    // ✅ Compiles
// getUser(orderId); // ❌ Compile error — OrderId is not UserId

// Extension type with methods
extension type Email(String value) {
  bool get isValid => RegExp(r'^[\w.+-]+@[\w-]+\.[\w.]+$').hasMatch(value);
  String get domain => value.split('@').last;
}
```

**Why This Pattern**:
- ✅ Zero runtime overhead (compiled away — just a String at runtime)
- ✅ Prevents accidental type confusion (UserId vs OrderId)
- ✅ Add domain-specific methods without inheritance

### Pattern 1.5: Enhanced Enums

Enums with fields, constructors, and methods.

```dart
// User role with permissions
enum UserRole {
  admin('Admin', {Permission.read, Permission.write, Permission.delete}),
  editor('Editor', {Permission.read, Permission.write}),
  viewer('Viewer', {Permission.read});

  final String displayName;
  final Set<Permission> permissions;
  
  const UserRole(this.displayName, this.permissions);
  
  bool hasPermission(Permission p) => permissions.contains(p);
}

// Order status with UI properties
enum OrderStatus {
  pending('Pending', Colors.orange, Icons.hourglass_empty),
  processing('Processing', Colors.blue, Icons.autorenew),
  shipped('Shipped', Colors.indigo, Icons.local_shipping),
  delivered('Delivered', Colors.green, Icons.check_circle),
  cancelled('Cancelled', Colors.red, Icons.cancel);

  final String label;
  final Color color;
  final IconData icon;

  const OrderStatus(this.label, this.color, this.icon);
  
  // JSON serialization
  static OrderStatus fromString(String value) =>
      OrderStatus.values.firstWhere(
        (e) => e.name == value,
        orElse: () => OrderStatus.pending,
      );
}
```

**Why This Pattern**:
- ✅ Encapsulate display logic with the enum itself
- ✅ No separate mapping classes needed
- ✅ Type-safe — compiler ensures all cases handled in switch

### Pattern 1.6: Late + Lazy Initialization

Deferred initialization for expensive operations.

```dart
// Late final — initialized once, read many
class UserRepository {
  late final Database _database = Database.open('users.db');
  
  // _database is created only on first access
  Future<User> getUser(String id) async {
    return _database.query('users', id);
  }
}

// Late with initializer function
class AppConfig {
  late final String apiUrl;
  late final String environment;
  
  AppConfig() {
    final env = Platform.environment;
    apiUrl = env['API_URL'] ?? 'https://api.example.com';
    environment = env['ENV'] ?? 'production';
  }
}

// ❌ DON'T — late without guarantee of initialization
class BadExample {
  late String name; // Dangerous — throws LateInitializationError if read before set
}

// ✅ DO — use nullable + null check instead when init is uncertain
class GoodExample {
  String? name;
  
  String get displayName => name ?? 'Unknown';
}
```

**Why This Pattern**:
- ✅ `late final` = lazy singleton — created on first access, never recreated
- ✅ Avoids null checks for definitely-initialized fields
- ✅ Beware: `late` without `final` can throw LateInitializationError

---

## MUST DO

- Use sealed classes for BLoC states and error types
- Use records for multi-value returns (not Tuple or List)
- Use switch expressions (not switch statements) for exhaustive matching
- Use extension types for typed IDs (UserId, OrderId)
- Use enhanced enums for domain constants with properties

## MUST NOT DO

- Use `dynamic` when a specific type is known
- Use `late` without `final` unless absolutely necessary
- Use string constants for IDs — use extension types
- Use if-else chains when switch expression is clearer
- Ignore exhaustiveness warnings — they prevent missing cases

---

## References

- [Dart Language: Records](https://dart.dev/language/records)
- [Dart Language: Patterns](https://dart.dev/language/patterns)
- [Dart Language: Class Modifiers](https://dart.dev/language/class-modifiers)
