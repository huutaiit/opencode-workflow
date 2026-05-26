# Flutter Freezed + Code Generation Specialist
# Flutter Freezed＋コード生成スペシャリスト
# Chuyen Gia Freezed Va Code Gen Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — used in Domain entities, Data models, Presentation states) |
| **Directory Pattern** | `lib/features/{feature}/domain/entities/`, `lib/features/{feature}/data/models/`, `lib/features/{feature}/presentation/bloc/` |
| **Variant** | ALL |
| **Naming Convention** | `{name}.dart` + `{name}.freezed.dart` (generated) + `{name}.g.dart` (generated). No manual naming for generated files |
| **Imports From** | ALL (freezed annotations applied across every layer) |
| **Cannot Import** | N/A (code generation annotations — no layer-specific import restrictions) |
| **Pattern Numbers** | 70.1–70.5 |
| **Source Paths** | `lib/**/*.dart` (any file using @freezed) |
| **File Count** | Cross-cutting: 10-50 freezed classes per enterprise app (entities + models + states) |
| **Imported By** | ALL layers (Domain entities, Data models, Presentation states all use Freezed) |
| **Dependencies** | freezed_annotation ^2.4.0, json_annotation ^4.8.0, freezed ^2.5.0 (dev), json_serializable ^6.7.0 (dev), build_runner ^2.4.0 (dev) |
| **When To Use** | Creating immutable data classes with copyWith, union types, JSON serialization |
| **Source Skeleton** | `lib/features/{f}/domain/entities/{name}.dart` (with @freezed), `lib/features/{f}/data/models/{name}_model.dart` (with @freezed + @JsonSerializable) |
| **Specialist Type** | code |
| **Purpose** | Generate Freezed immutable classes with union types, copyWith, JSON serialization, and build_runner code generation configuration |
| **Activation Trigger** | files: lib/**/*.dart; keywords: freezed, immutable, unionType, copyWith, jsonSerializable, buildRunner, codeGeneration |

---

## Patterns

### Pattern 70.1: Freezed Immutable Classes

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'user.freezed.dart';

@freezed
class User with _$User {
  const factory User({
    required String id,
    required String name,
    required String email,
    String? phone,
    @Default(true) bool isActive,
    required DateTime createdAt,
  }) = _User;

  // Add custom methods via private constructor
  const User._();

  String get displayName => '$name (${email.split('@').first})';
  bool get hasPhone => phone != null && phone!.isNotEmpty;
}

// Usage
final user = User(id: '1', name: 'John', email: 'john@example.com', createdAt: DateTime.now());
final updated = user.copyWith(name: 'Jane'); // Immutable update
assert(user != updated); // Different instances
assert(user == User(id: '1', name: 'John', email: 'john@example.com', createdAt: user.createdAt)); // Value equality
```

### Pattern 70.2: Union Types (Sealed + Freezed)

```dart
// BLoC State — union type with different data per state
part 'user_state.freezed.dart';

@freezed
sealed class UserState with _$UserState {
  const factory UserState.initial() = UserInitial;
  const factory UserState.loading() = UserLoading;
  const factory UserState.loaded({required User user}) = UserLoaded;
  const factory UserState.error({required Failure failure}) = UserError;
}

// Exhaustive handling with when/map
Widget buildUI(UserState state) {
  return state.when(
    initial: () => const SizedBox.shrink(),
    loading: () => const CircularProgressIndicator(),
    loaded: (user) => UserCard(user: user),
    error: (failure) => Text(failure.message),
  );
}

// maybeWhen — handle some, default for rest
String getTitle(UserState state) {
  return state.maybeWhen(
    loaded: (user) => user.name,
    orElse: () => 'Loading...',
  );
}
```

### Pattern 70.3: json_serializable Integration

```dart
// Data model with JSON serialization
import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:json_annotation/json_annotation.dart';

part 'user_model.freezed.dart';
part 'user_model.g.dart';

@freezed
class UserModel with _$UserModel {
  const factory UserModel({
    required String id,
    required String name,
    required String email,
    @JsonKey(name: 'phone_number') String? phone,
    @JsonKey(name: 'is_active') @Default(true) bool isActive,
    @JsonKey(name: 'created_at') required DateTime createdAt,
  }) = _UserModel;

  const UserModel._();

  factory UserModel.fromJson(Map<String, dynamic> json) => _$UserModelFromJson(json);

  // Mapping to domain entity
  User toEntity() => User(
    id: id, name: name, email: email,
    phone: phone, isActive: isActive, createdAt: createdAt,
  );

  factory UserModel.fromEntity(User entity) => UserModel(
    id: entity.id, name: entity.name, email: entity.email,
    phone: entity.phone, isActive: entity.isActive, createdAt: entity.createdAt,
  );
}

// Custom JsonConverter for complex types
class DateTimeConverter implements JsonConverter<DateTime, String> {
  const DateTimeConverter();

  @override
  DateTime fromJson(String json) => DateTime.parse(json);

  @override
  String toJson(DateTime object) => object.toIso8601String();
}
```

### Pattern 70.4: CopyWith + Default Values

```dart
// Deep copyWith for nested objects
@freezed
class Order with _$Order {
  const factory Order({
    required String id,
    required Customer customer,
    required List<OrderItem> items,
    @Default(OrderStatus.pending) OrderStatus status,
  }) = _Order;
}

// Usage
final order = Order(id: '1', customer: customer, items: items);
final shipped = order.copyWith(status: OrderStatus.shipped); // Shallow copy
final renamed = order.copyWith(
  customer: order.customer.copyWith(name: 'New Name'), // Deep copy via nested copyWith
);

// Nullable field reset
@freezed
class Profile with _$Profile {
  const factory Profile({
    required String name,
    String? bio, // nullable
  }) = _Profile;
}

final withBio = Profile(name: 'John', bio: 'Hello');
final withoutBio = withBio.copyWith(bio: null); // Explicitly set to null
```

### Pattern 70.5: build_runner Configuration

```yaml
# build.yaml — optimize code generation
targets:
  $default:
    builders:
      freezed:
        options:
          # Generate when/map methods
          when: true
          map: true
          # Format output (slower but readable)
          format: true
      json_serializable:
        options:
          # Explicit JSON keys (no implicit)
          explicit_to_json: true
          # Field rename convention
          field_rename: snake

# Run code generation
# dart run build_runner build --delete-conflicting-outputs
# dart run build_runner watch  (auto-rebuild on file change)
```

```yaml
# pubspec.yaml
dependencies:
  freezed_annotation: ^2.4.0
  json_annotation: ^4.8.0

dev_dependencies:
  freezed: ^2.5.0
  json_serializable: ^6.7.0
  build_runner: ^2.4.0
```

---

## MUST DO

- Use @freezed for all state classes (immutable, copyWith, equality)
- Use @freezed union types for BLoC states (when/map for exhaustive handling)
- Add `part '{name}.freezed.dart'` and `part '{name}.g.dart'` (JSON)
- Add private constructor `const ClassName._()` for custom methods
- Run `dart run build_runner build --delete-conflicting-outputs` after changes

## MUST NOT DO

- Manually implement == / hashCode (Freezed generates them)
- Manually write copyWith (Freezed generates it)
- Forget `part` directives (build_runner won't generate)
- Commit .freezed.dart and .g.dart without regenerating (stale)
- Use mutable classes where Freezed immutable is appropriate

---

## References

- [freezed Package](https://pub.dev/packages/freezed)
- [json_serializable](https://pub.dev/packages/json_serializable)
- [build_runner](https://pub.dev/packages/build_runner)
