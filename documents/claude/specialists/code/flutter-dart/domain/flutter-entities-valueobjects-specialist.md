# Flutter Entities & Value Objects Specialist
# Flutterエンティティ＆値オブジェクトスペシャリスト
# Chuyen Gia Entity Va Value Object Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain |
| **Directory Pattern** | `lib/features/{feature}/domain/entities/`, `lib/features/{feature}/domain/repositories/` |
| **Variant** | ALL |
| **Naming Convention** | `{name}.dart` (entity), `{name}_repository.dart` (interface). Classes: `{Name}`, `{Name}Repository` (abstract) |
| **Imports From** | dart:core only (pure Dart — no Flutter, no third-party except equatable) |
| **Cannot Import** | Data (models, datasources, repo impls), Presentation (bloc, pages, widgets), Core (except core/errors/failures.dart), Flutter SDK (`package:flutter/`) |
| **Pattern Numbers** | 30.1–30.5 |
| **Source Paths** | `lib/features/*/domain/entities/*.dart`, `lib/features/*/domain/repositories/*.dart` |
| **File Count** | 5-20 entities + 5-15 repository interfaces per enterprise app |
| **Imported By** | Data (models map to entities, repo impls implement interfaces), Presentation (BLoC uses entities) |
| **Dependencies** | equatable ^2.0 (for value equality) |
| **When To Use** | Defining business entities, value objects, repository contracts for a feature |
| **Source Skeleton** | `lib/features/{f}/domain/entities/{name}.dart`, `lib/features/{f}/domain/repositories/{name}_repository.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate domain entities with Equatable, value objects with validation, and repository interface contracts returning Either<Failure,T> |
| **Activation Trigger** | files: lib/features/*/domain/entities/*.dart, lib/features/*/domain/repositories/*.dart; keywords: entity, valueObject, repositoryInterface, domainModel |

---

## Patterns

### Pattern 30.1: Entity Base Class

Entities represent business objects with identity (ID). Use Equatable for value equality.

```dart
// lib/features/user/domain/entities/user.dart
import 'package:equatable/equatable.dart';

class User extends Equatable {
  final String id;
  final String name;
  final String email;
  final UserRole role;
  final DateTime createdAt;
  final bool isActive;

  const User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.createdAt,
    this.isActive = true,
  });

  @override
  List<Object?> get props => [id, name, email, role, createdAt, isActive];
}

// CRM example: Contact entity
class Contact extends Equatable {
  final String id;
  final String firstName;
  final String lastName;
  final String? company;
  final String? phone;
  final String email;
  final ContactStatus status;
  final DateTime lastContactedAt;

  const Contact({
    required this.id,
    required this.firstName,
    required this.lastName,
    this.company,
    this.phone,
    required this.email,
    required this.status,
    required this.lastContactedAt,
  });

  String get fullName => '$lastName $firstName'; // Japanese name order

  @override
  List<Object?> get props => [id, firstName, lastName, company, phone, email, status, lastContactedAt];
}
```

### Pattern 30.2: Value Objects

Value objects have no identity — defined by their value. Validate in constructor.

```dart
// lib/features/shared/domain/entities/email.dart
class Email {
  final String value;

  Email(this.value) {
    if (!_isValid(value)) {
      throw ArgumentError('Invalid email: $value');
    }
  }

  static bool _isValid(String email) {
    return RegExp(r'^[\w.+-]+@[\w-]+\.[\w.]+$').hasMatch(email);
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) || other is Email && value == other.value;

  @override
  int get hashCode => value.hashCode;

  @override
  String toString() => value;
}

// Money value object — currency-aware
class Money {
  final double amount;
  final String currency;

  const Money({required this.amount, required this.currency});

  Money operator +(Money other) {
    assert(currency == other.currency, 'Cannot add different currencies');
    return Money(amount: amount + other.amount, currency: currency);
  }

  String get formatted {
    switch (currency) {
      case 'JPY':
        return '¥${amount.toInt()}'; // No decimals for Yen
      case 'VND':
        return '${amount.toInt().toString().replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]},')}₫';
      default:
        return '$currency ${amount.toStringAsFixed(2)}';
    }
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) || other is Money && amount == other.amount && currency == other.currency;

  @override
  int get hashCode => Object.hash(amount, currency);
}

// Phone number with country code validation
class PhoneNumber {
  final String value;
  final String countryCode;

  PhoneNumber({required this.value, required this.countryCode}) {
    if (!_isValid()) {
      throw ArgumentError('Invalid phone: $countryCode $value');
    }
  }

  bool _isValid() => switch (countryCode) {
    '+84' => RegExp(r'^(0[3-9]\d{8})$').hasMatch(value),     // Vietnam
    '+81' => RegExp(r'^(0[0-9]{9,10})$').hasMatch(value),     // Japan
    _ => value.length >= 7 && value.length <= 15,
  };

  String get formatted => '$countryCode ${value.substring(1)}';

  @override
  bool operator ==(Object other) =>
      identical(this, other) || other is PhoneNumber && value == other.value && countryCode == other.countryCode;

  @override
  int get hashCode => Object.hash(value, countryCode);
}
```

### Pattern 30.3: Entity Relationships

Express relationships in pure Dart — no ORM annotations.

```dart
// One-to-many: Order has multiple OrderItems
class Order extends Equatable {
  final String id;
  final String customerId;
  final List<OrderItem> items;
  final OrderStatus status;
  final DateTime createdAt;

  const Order({
    required this.id,
    required this.customerId,
    required this.items,
    required this.status,
    required this.createdAt,
  });

  Money get totalAmount => items.fold(
    const Money(amount: 0, currency: 'JPY'),
    (sum, item) => sum + item.subtotal,
  );

  int get itemCount => items.length;

  @override
  List<Object?> get props => [id, customerId, items, status, createdAt];
}

class OrderItem extends Equatable {
  final String productId;
  final String productName;
  final int quantity;
  final Money unitPrice;

  const OrderItem({
    required this.productId,
    required this.productName,
    required this.quantity,
    required this.unitPrice,
  });

  Money get subtotal => Money(
    amount: unitPrice.amount * quantity,
    currency: unitPrice.currency,
  );

  @override
  List<Object?> get props => [productId, productName, quantity, unitPrice];
}
```

### Pattern 30.4: Domain Events

Events for cross-feature communication — pure Dart, no Flutter dependency.

```dart
// lib/core/domain/domain_event.dart
sealed class DomainEvent {
  final DateTime occurredAt;
  const DomainEvent({required this.occurredAt});
}

// lib/features/order/domain/entities/order_events.dart
class OrderCreated extends DomainEvent {
  final String orderId;
  final String customerId;
  const OrderCreated({
    required this.orderId,
    required this.customerId,
    required super.occurredAt,
  });
}

class OrderStatusChanged extends DomainEvent {
  final String orderId;
  final OrderStatus oldStatus;
  final OrderStatus newStatus;
  const OrderStatusChanged({
    required this.orderId,
    required this.oldStatus,
    required this.newStatus,
    required super.occurredAt,
  });
}
```

### Pattern 30.5: Repository Interface Contracts

Abstract interfaces in domain — implemented by data layer.

```dart
// lib/features/user/domain/repositories/user_repository.dart
import 'package:fpdart/fpdart.dart';
import '../../../../core/errors/failures.dart';
import '../entities/user.dart';

abstract class UserRepository {
  /// Get single user by ID
  Future<Either<Failure, User>> getUser(String id);

  /// Get paginated user list
  Future<Either<Failure, List<User>>> getUsers({
    int page = 1,
    int pageSize = 20,
    String? searchQuery,
  });

  /// Create new user — returns created user with server-assigned ID
  Future<Either<Failure, User>> createUser(User user);

  /// Update existing user — returns updated user
  Future<Either<Failure, User>> updateUser(User user);

  /// Delete user by ID
  Future<Either<Failure, void>> deleteUser(String id);

  /// Watch user changes — real-time stream
  Stream<Either<Failure, User>> watchUser(String id);
}

// CRM-specific: Contact repository with search
abstract class ContactRepository {
  Future<Either<Failure, List<Contact>>> searchContacts({
    String? query,
    ContactStatus? status,
    String? company,
    int page = 1,
    int pageSize = 50,
  });

  Future<Either<Failure, Contact>> getContact(String id);
  Future<Either<Failure, Contact>> createContact(Contact contact);
  Future<Either<Failure, Contact>> updateContact(Contact contact);
  Future<Either<Failure, void>> deleteContact(String id);
}
```

---

## MUST DO

- All entities extend Equatable with proper props list
- All repository methods return `Future<Either<Failure, T>>` or `Stream<Either<Failure, T>>`
- Value objects validate in constructor (fail fast)
- ZERO Flutter imports in entire domain layer
- Use const constructors where possible

## MUST NOT DO

- Import `package:flutter/` in domain layer
- Import data layer (models, datasources) from domain
- Use mutable fields in entities (always final)
- Return raw exceptions from repository interface (always Either)
- Use dynamic type in entity fields

---

## References

- [Domain-Driven Design in Dart](https://resocoder.com/flutter-clean-architecture-tdd/)
- [Equatable Package](https://pub.dev/packages/equatable)
- [fpdart Either](https://pub.dev/packages/fpdart)
