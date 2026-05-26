# Flutter Use Cases Specialist
# Flutterユースケーススペシャリスト
# Chuyen Gia Use Case Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain |
| **Directory Pattern** | `lib/features/{feature}/domain/usecases/` |
| **Variant** | ALL |
| **Naming Convention** | `{action}_{entity}.dart`. Class: `{ActionEntity}` (e.g., `GetUser`, `CreateOrder`, `SearchContacts`) |
| **Imports From** | Domain (entities, repository interfaces) — same layer only |
| **Cannot Import** | Data, Presentation, Core, Flutter SDK |
| **Pattern Numbers** | 31.1–31.5 |
| **Source Paths** | `lib/features/*/domain/usecases/*.dart` |
| **File Count** | 10-40 use cases per enterprise app (1-4 per feature) |
| **Imported By** | Presentation (BLoC/Cubit calls use cases via DI) |
| **Dependencies** | fpdart ^1.1 (for Either type) |
| **When To Use** | Business logic orchestration — single action per use case |
| **Source Skeleton** | `lib/features/{f}/domain/usecases/{action}_{entity}.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate use case classes with typed input params, Either<Failure,T> return, and single-responsibility business logic |
| **Activation Trigger** | files: lib/features/*/domain/usecases/*.dart; keywords: useCase, businessLogic, domainAction, callMethod |

---

## Patterns

### Pattern 31.1: UseCase Base Class

Abstract base class with generic types — every use case follows this contract:

```dart
// lib/core/domain/usecase.dart
import 'package:fpdart/fpdart.dart';
import '../errors/failures.dart';

/// Base class for all use cases.
/// [Type] = return type on success
/// [Params] = input parameters
abstract class UseCase<Type, Params> {
  Future<Either<Failure, Type>> call(Params params);
}

/// For use cases that don't need parameters
class NoParams {
  const NoParams();
}
```

```dart
// Simple use case — GetUser
// lib/features/user/domain/usecases/get_user.dart
import '../../../../core/domain/usecase.dart';
import '../../../../core/errors/failures.dart';
import 'package:fpdart/fpdart.dart';
import '../entities/user.dart';
import '../repositories/user_repository.dart';

class GetUser extends UseCase<User, String> {
  final UserRepository _repository;

  const GetUser(this._repository);

  @override
  Future<Either<Failure, User>> call(String userId) {
    return _repository.getUser(userId);
  }
}

// No-params use case — GetCurrentUser
class GetCurrentUser extends UseCase<User, NoParams> {
  final UserRepository _repository;
  final AuthService _authService;

  const GetCurrentUser(this._repository, this._authService);

  @override
  Future<Either<Failure, User>> call(NoParams params) async {
    final userId = await _authService.currentUserId;
    if (userId == null) return const Left(AuthFailure('Not authenticated'));
    return _repository.getUser(userId);
  }
}
```

### Pattern 31.2: Parameterized UseCases

When use cases need multiple parameters, create an Equatable Params class:

```dart
// lib/features/order/domain/usecases/create_order.dart
import 'package:equatable/equatable.dart';
import 'package:fpdart/fpdart.dart';
import '../../../../core/domain/usecase.dart';
import '../../../../core/errors/failures.dart';
import '../entities/order.dart';
import '../repositories/order_repository.dart';

class CreateOrder extends UseCase<Order, CreateOrderParams> {
  final OrderRepository _repository;

  const CreateOrder(this._repository);

  @override
  Future<Either<Failure, Order>> call(CreateOrderParams params) {
    return _repository.createOrder(
      customerId: params.customerId,
      items: params.items,
      shippingAddress: params.shippingAddress,
      notes: params.notes,
    );
  }
}

class CreateOrderParams extends Equatable {
  final String customerId;
  final List<OrderItem> items;
  final String shippingAddress;
  final String? notes;

  const CreateOrderParams({
    required this.customerId,
    required this.items,
    required this.shippingAddress,
    this.notes,
  });

  @override
  List<Object?> get props => [customerId, items, shippingAddress, notes];
}

// Search with pagination — CRM contact search
class SearchContacts extends UseCase<List<Contact>, SearchContactsParams> {
  final ContactRepository _repository;

  const SearchContacts(this._repository);

  @override
  Future<Either<Failure, List<Contact>>> call(SearchContactsParams params) {
    return _repository.searchContacts(
      query: params.query,
      status: params.status,
      company: params.company,
      page: params.page,
      pageSize: params.pageSize,
    );
  }
}

class SearchContactsParams extends Equatable {
  final String? query;
  final ContactStatus? status;
  final String? company;
  final int page;
  final int pageSize;

  const SearchContactsParams({
    this.query,
    this.status,
    this.company,
    this.page = 1,
    this.pageSize = 50,
  });

  @override
  List<Object?> get props => [query, status, company, page, pageSize];
}
```

### Pattern 31.3: Stream UseCases

For real-time data — WebSocket, database watch, sensor streams:

```dart
// lib/core/domain/stream_usecase.dart
abstract class StreamUseCase<Type, Params> {
  Stream<Type> call(Params params);
}

// Watch user changes — real-time
// lib/features/user/domain/usecases/watch_user.dart
class WatchUser extends StreamUseCase<Either<Failure, User>, String> {
  final UserRepository _repository;

  const WatchUser(this._repository);

  @override
  Stream<Either<Failure, User>> call(String userId) {
    return _repository.watchUser(userId);
  }
}

// Watch notifications — real-time
class WatchNotifications extends StreamUseCase<List<Notification>, NoParams> {
  final NotificationRepository _repository;

  const WatchNotifications(this._repository);

  @override
  Stream<List<Notification>> call(NoParams params) {
    return _repository.watchNotifications();
  }
}
```

### Pattern 31.4: Composite UseCases

Use case calling other use cases for multi-step business logic:

```dart
// lib/features/order/domain/usecases/checkout.dart
class Checkout extends UseCase<Order, CheckoutParams> {
  final ValidateCart _validateCart;
  final CreateOrder _createOrder;
  final ProcessPayment _processPayment;
  final SendConfirmation _sendConfirmation;

  const Checkout(
    this._validateCart,
    this._createOrder,
    this._processPayment,
    this._sendConfirmation,
  );

  @override
  Future<Either<Failure, Order>> call(CheckoutParams params) async {
    // Step 1: Validate cart
    final validationResult = await _validateCart(params.cartId);
    return validationResult.fold(
      (failure) => Left(failure),
      (validCart) async {
        // Step 2: Create order
        final orderResult = await _createOrder(CreateOrderParams(
          customerId: params.customerId,
          items: validCart.items,
          shippingAddress: params.shippingAddress,
        ));

        return orderResult.fold(
          (failure) => Left(failure),
          (order) async {
            // Step 3: Process payment
            final paymentResult = await _processPayment(
              ProcessPaymentParams(orderId: order.id, amount: order.totalAmount),
            );

            return paymentResult.fold(
              (failure) => Left(failure),
              (_) async {
                // Step 4: Send confirmation (fire-and-forget)
                _sendConfirmation(order.id); // Don't await — non-blocking
                return Right(order);
              },
            );
          },
        );
      },
    );
  }
}
```

### Pattern 31.5: UseCase Error Handling

Failure hierarchy with typed errors — each layer knows its failures:

```dart
// lib/core/errors/failures.dart
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
  const NetworkFailure([super.message = 'No internet connection']);
}

class ValidationFailure extends Failure {
  final String field;
  const ValidationFailure(super.message, {required this.field});
}

class AuthFailure extends Failure {
  const AuthFailure([super.message = 'Authentication required']);
}

class PermissionFailure extends Failure {
  final String permission;
  const PermissionFailure(super.message, {required this.permission});
}

// lib/core/errors/exceptions.dart
class ServerException implements Exception {
  final String message;
  final int? statusCode;
  const ServerException(this.message, {this.statusCode});
}

class CacheException implements Exception {
  final String message;
  const CacheException(this.message);
}

// Data layer catches Exception → returns Failure via Either
// Domain layer never sees exceptions — only Either<Failure, T>
// Presentation layer folds Either into UI state
```

---

## MUST DO

- Every use case extends `UseCase<Type, Params>` or `StreamUseCase<Type, Params>`
- UseCase has exactly ONE public method: `call()`
- Params class extends Equatable (for testability)
- Return `Either<Failure, T>` — never throw
- Use `NoParams` sentinel for parameterless use cases
- ZERO Flutter imports

## MUST NOT DO

- Put multiple actions in one use case (split into separate classes)
- Import data layer from use case
- Throw exceptions from use case (return Left(Failure))
- Use `dynamic` return type
- Access repository implementation directly (only via abstract interface)

---

## References

- [Clean Architecture Use Cases](https://resocoder.com/flutter-clean-architecture-tdd/)
- [fpdart Either](https://pub.dev/packages/fpdart)
