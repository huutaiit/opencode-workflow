# Flutter DTO + Mapper Specialist
# Flutter DTO＋マッパースペシャリスト
# Chuyen Gia DTO Va Mapper Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Data |
| **Directory Pattern** | `lib/features/{feature}/data/models/` |
| **Variant** | ALL |
| **Naming Convention** | `{name}_model.dart`. Classes: `{Name}Model` with `toEntity()`, `fromEntity()`, `fromJson()`, `toJson()` |
| **Imports From** | Domain (entity classes for mapping target) |
| **Cannot Import** | Presentation (models never know about UI) |
| **Pattern Numbers** | 108.1–108.5 |
| **Source Paths** | `lib/features/*/data/models/*.dart` |
| **File Count** | 1 model file per entity (1:1 mapping) |
| **Imported By** | Data (repositories use models for API/DB), Domain (via entity conversion) |
| **Dependencies** | freezed_annotation ^2.4.0, json_annotation ^4.8.0 |
| **When To Use** | Mapping API responses to domain entities, separating data layer from domain layer |
| **Source Skeleton** | `lib/features/{f}/data/models/{name}_model.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate Data Transfer Objects with Freezed, JSON serialization, entity↔model mapping, nested model handling, and null-safe conversion |
| **Activation Trigger** | files: lib/features/*/data/models/*.dart; keywords: dto, model, mapper, toEntity, fromEntity, fromJson, toJson |

---

## Patterns

### Pattern 108.1: Basic Model with Entity Mapping

```dart
@freezed
class UserModel with _$UserModel {
  const factory UserModel({
    required String id,
    required String name,
    required String email,
    @JsonKey(name: 'phone_number') String? phone,
    @JsonKey(name: 'created_at') required String createdAt,
  }) = _UserModel;

  const UserModel._();

  factory UserModel.fromJson(Map<String, dynamic> json) => _$UserModelFromJson(json);

  User toEntity() => User(
    id: id, name: name, email: email,
    phone: phone, createdAt: DateTime.parse(createdAt),
  );

  factory UserModel.fromEntity(User entity) => UserModel(
    id: entity.id, name: entity.name, email: entity.email,
    phone: entity.phone, createdAt: entity.createdAt.toIso8601String(),
  );
}
```

### Pattern 108.2: Nested Model Mapping

```dart
@freezed
class OrderModel with _$OrderModel {
  const factory OrderModel({
    required String id,
    required CustomerModel customer,
    required List<OrderItemModel> items,
    required String status,
    @JsonKey(name: 'total_amount') required double totalAmount,
  }) = _OrderModel;

  const OrderModel._();
  factory OrderModel.fromJson(Map<String, dynamic> json) => _$OrderModelFromJson(json);

  Order toEntity() => Order(
    id: id,
    customer: customer.toEntity(),
    items: items.map((i) => i.toEntity()).toList(),
    status: OrderStatus.values.byName(status),
    totalAmount: totalAmount,
  );
}
```

### Pattern 108.3: Response Wrapper

```dart
@freezed
class ApiResponse<T> with _$ApiResponse<T> {
  const factory ApiResponse({
    required bool success,
    T? data,
    String? message,
    ApiPagination? pagination,
  }) = _ApiResponse<T>;
}

@freezed
class ApiPagination with _$ApiPagination {
  const factory ApiPagination({
    required int page,
    required int pageSize,
    required int totalItems,
    required int totalPages,
  }) = _ApiPagination;

  factory ApiPagination.fromJson(Map<String, dynamic> json) => _$ApiPaginationFromJson(json);
}
```

### Pattern 108.4: Enum Mapping

```dart
/// Safe enum mapping with fallback
extension EnumMapper on String {
  T toEnum<T extends Enum>(List<T> values, {required T fallback}) {
    try {
      return values.byName(this);
    } catch (_) {
      return fallback;
    }
  }
}

// Usage: model.status.toEnum(OrderStatus.values, fallback: OrderStatus.unknown)
```

### Pattern 108.5: List Extension for Batch Mapping

```dart
extension ModelListMapper<T> on List<T> {
  List<R> mapToEntities<R>(R Function(T) mapper) => map(mapper).toList();
}

// Usage: models.mapToEntities((m) => m.toEntity())
```

---

## MUST DO

- Use `@JsonKey(name: 'snake_case')` for API field mapping
- Implement both `toEntity()` and `fromEntity()` (bidirectional)
- Handle nullable fields with null-safe conversion
- Use Freezed for immutability and generated equality
- Add `const ClassName._()` for custom methods

## MUST NOT DO

- Import Presentation layer in models
- Use dynamic types in model fields (type every field)
- Skip null checks on nullable API fields
- Expose Model classes to Domain layer (convert to Entity first)
- Manually implement fromJson/toJson (use code generation)

---

## References

- [freezed](https://pub.dev/packages/freezed)
- [json_serializable](https://pub.dev/packages/json_serializable)
