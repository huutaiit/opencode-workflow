# Flutter Either/Result Error Handling Specialist
# Flutter Either/Resultエラーハンドリングスペシャリスト
# Chuyen Gia Xu Ly Loi Either/Result Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — error handling pattern used in Domain returns, Presentation folds, Data catches) |
| **Directory Pattern** | `lib/core/errors/`, `lib/features/{feature}/domain/usecases/`, `lib/features/{feature}/presentation/bloc/` |
| **Variant** | ALL |
| **Naming Convention** | `failures.dart` (core), `exceptions.dart` (core). Classes: `Failure` (sealed), `ServerFailure`, `CacheFailure`, `NetworkFailure` |
| **Imports From** | ALL (error types defined in core, used in domain returns, folded in presentation) |
| **Cannot Import** | N/A (error handling is cross-cutting by nature) |
| **Pattern Numbers** | 71.1–71.5 |
| **Source Paths** | `lib/core/errors/*.dart`, `lib/features/*/domain/usecases/*.dart`, `lib/features/*/presentation/bloc/*.dart` |
| **File Count** | 1-2 core error files + used in every usecase + every BLoC handler |
| **Imported By** | Domain (usecases return Either), Data (repo impls catch → Left), Presentation (BLoCs fold Either) |
| **Dependencies** | fpdart ^1.1.0 (recommended) or dartz ^0.10.1 (legacy) |
| **When To Use** | Functional error handling — replacing try-catch with typed Either<Failure,T> returns |
| **Source Skeleton** | `lib/core/errors/failures.dart`, `lib/core/errors/exceptions.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate Either<Failure,T> error handling with Failure sealed class hierarchy, fold() in BLoC handlers, and composable Either operations |
| **Activation Trigger** | files: lib/core/errors/*.dart, lib/features/*/domain/usecases/*.dart; keywords: either, failure, fpdart, dartz, fold, leftRight, functionalError |

---

## Patterns

### Pattern 71.1: Either<Failure,T> Pattern

```dart
import 'package:fpdart/fpdart.dart';

// Domain layer — return Either instead of throwing
abstract class UserRepository {
  Future<Either<Failure, User>> getUser(String id);
  Future<Either<Failure, List<User>>> getUsers();
  Future<Either<Failure, User>> createUser(User user);
  Future<Either<Failure, void>> deleteUser(String id);
}

// Left = failure, Right = success
// By convention: Left is error, Right is "right" (correct)
final Either<Failure, User> result = await repository.getUser('123');

// Pattern match
final user = result.fold(
  (failure) => throw failure, // or handle error
  (user) => user,             // success path
);

// Check without folding
if (result.isRight()) {
  final user = result.getOrElse((f) => throw f);
}
```

### Pattern 71.2: Failure Class Hierarchy

```dart
// lib/core/errors/failures.dart
sealed class Failure {
  final String message;
  const Failure(this.message);

  // User-facing message — localized
  String toUserMessage() => switch (this) {
    ServerFailure(:final statusCode) when statusCode == 404 => 'Not found',
    ServerFailure() => 'Server error. Please try again.',
    NetworkFailure() => 'No internet connection.',
    CacheFailure() => 'Unable to load cached data.',
    AuthFailure() => 'Session expired. Please login again.',
    ValidationFailure(:final field) => 'Invalid $field.',
    PermissionFailure(:final permission) => 'Permission denied: $permission.',
  };
}

class ServerFailure extends Failure {
  final int? statusCode;
  const ServerFailure(super.message, {this.statusCode});
}

class NetworkFailure extends Failure {
  const NetworkFailure([super.message = 'No internet connection']);
}

class CacheFailure extends Failure {
  const CacheFailure([super.message = 'Cache error']);
}

class AuthFailure extends Failure {
  const AuthFailure([super.message = 'Authentication required']);
}

class ValidationFailure extends Failure {
  final String field;
  const ValidationFailure(super.message, {required this.field});
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
```

### Pattern 71.3: fold() in Presentation Layer

```dart
// BLoC handler — fold Either into state emission
class UserBloc extends Bloc<UserEvent, UserState> {
  final GetUser _getUser;

  UserBloc(this._getUser) : super(const UserState.initial()) {
    on<LoadUser>((event, emit) async {
      emit(const UserState.loading());

      final result = await _getUser(event.userId);

      // fold — LEFT = error state, RIGHT = loaded state
      result.fold(
        (failure) => emit(UserState.error(failure: failure)),
        (user) => emit(UserState.loaded(user: user)),
      );
    });
  }
}

// In widget — show user-facing message
BlocListener<UserBloc, UserState>(
  listener: (context, state) {
    if (state is UserError) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(state.failure.toUserMessage())),
      );
    }
  },
)
```

### Pattern 71.4: Chaining Either Operations

```dart
// Sequential operations — each can fail
Future<Either<Failure, Order>> checkout(CheckoutParams params) async {
  // Step 1: Validate cart
  final cartResult = await _validateCart(params.cartId);

  // Step 2: If cart valid → create order
  return cartResult.flatMap((validCart) async {
    final orderResult = await _createOrder(CreateOrderParams(
      customerId: params.customerId,
      items: validCart.items,
    ));

    // Step 3: If order created → process payment
    return orderResult.flatMap((order) async {
      final paymentResult = await _processPayment(
        ProcessPaymentParams(orderId: order.id, amount: order.totalAmount),
      );

      return paymentResult.map((_) => order); // Return order on success
    });
  });
}

// getOrElse — provide fallback
final userName = (await _getUser(id))
    .map((user) => user.name)
    .getOrElse((failure) => 'Unknown User');

// fold with async
final result = await either.fold(
  (failure) async => emit(ErrorState(failure)),
  (data) async {
    await _saveToCache(data);
    emit(LoadedState(data));
  },
);
```

### Pattern 71.5: Result vs Either Decision

```dart
// Option 1: fpdart Either (RECOMMENDED for Flutter Clean Architecture)
// Pros: functional, composable, flatMap/map chains, mature ecosystem
// Cons: learning curve, verbose for simple cases
import 'package:fpdart/fpdart.dart';

Future<Either<Failure, User>> getUser(String id) async {
  try {
    final model = await _remoteDataSource.getUser(id);
    return Right(model.toEntity());
  } on ServerException catch (e) {
    return Left(ServerFailure(e.message, statusCode: e.statusCode));
  }
}

// Option 2: Dart 3 sealed Result (simpler, no dependency)
// Pros: no third-party package, Dart-native, pattern matching
// Cons: less composable, no flatMap/map built-in
sealed class Result<T> {
  const Result();
}
class Success<T> extends Result<T> {
  final T value;
  const Success(this.value);
}
class Error<T> extends Result<T> {
  final Failure failure;
  const Error(this.failure);
}

// RECOMMENDATION: Use fpdart Either for enterprise apps
// - Better composability (flatMap chains for multi-step operations)
// - Mature ecosystem (well-tested, documented)
// - Community standard for Flutter Clean Architecture
```

---

## MUST DO

- Use Either<Failure, T> for ALL repository and usecase returns
- Define Failure as sealed class with specific subtypes
- Use fold() in BLoC handlers to convert Either → state
- Map Failure to user-facing messages (localized)
- Data layer catches Exception → returns Left(Failure)

## MUST NOT DO

- Throw exceptions from domain layer (return Left instead)
- Use generic `catch (e)` in data layer (catch specific types)
- Return Either from presentation layer (fold in BLoC, emit state)
- Mix try-catch and Either in same layer (choose one per layer)
- Use raw String errors (always typed Failure subclass)

---

## References

- [fpdart Package](https://pub.dev/packages/fpdart)
- [Functional Error Handling](https://codewithandrea.com/articles/flutter-exception-handling-either/)
