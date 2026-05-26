# Flutter BLoC Specialist
# Flutter BLoCスペシャリスト
# Chuyen Gia BLoC Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: clean-bloc

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Directory Pattern** | `lib/features/{feature}/presentation/bloc/` |
| **Variant** | clean-bloc |
| **Naming Convention** | `{name}_bloc.dart`, `{name}_event.dart`, `{name}_state.dart`. Classes: `{Name}Bloc`, `{Name}Event` (sealed), `{Name}State` (sealed/Freezed) |
| **Imports From** | Domain (entities, usecases via DI) |
| **Cannot Import** | Data (datasources, models, repo impls — only via Domain interfaces), other features' BLoCs |
| **Pattern Numbers** | 10.1–10.5 |
| **Source Paths** | `lib/features/*/presentation/bloc/*_bloc.dart`, `lib/features/*/presentation/bloc/*_event.dart` |
| **File Count** | 3 files per BLoC (bloc + event + state), 5-15 BLoCs per enterprise app |
| **Imported By** | Presentation (pages + widgets consume BLoC via BlocBuilder/BlocListener) |
| **Dependencies** | flutter_bloc ^8.1.0, equatable ^2.0, freezed_annotation ^2.4.0 |
| **When To Use** | Complex state with event-driven logic, audit-traceable state changes, banking/gov apps |
| **Source Skeleton** | `lib/features/{f}/presentation/bloc/{name}_bloc.dart`, `{name}_event.dart`, `{name}_state.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate BLoC classes with sealed events, Freezed states, event transformers, and proper UseCase integration |
| **Activation Trigger** | files: lib/features/*/presentation/bloc/*_bloc.dart; keywords: bloc, event, stateManagement, eventTransformer |

---

## Patterns

### Pattern 10.1: BLoC with Events

Event-driven state management — every state change traced to an event.

```dart
// lib/features/user/presentation/bloc/user_event.dart
sealed class UserEvent {
  const UserEvent();
}

class LoadUser extends UserEvent {
  final String userId;
  const LoadUser(this.userId);
}

class RefreshUser extends UserEvent {
  const RefreshUser();
}

class UpdateUserName extends UserEvent {
  final String name;
  const UpdateUserName(this.name);
}

class DeleteUser extends UserEvent {
  final String userId;
  const DeleteUser(this.userId);
}
```

```dart
// lib/features/user/presentation/bloc/user_state.dart
import 'package:freezed_annotation/freezed_annotation.dart';
import '../../../domain/entities/user.dart';
import '../../../../core/errors/failures.dart';

part 'user_state.freezed.dart';

@freezed
sealed class UserState with _$UserState {
  const factory UserState.initial() = UserInitial;
  const factory UserState.loading() = UserLoading;
  const factory UserState.loaded({required User user}) = UserLoaded;
  const factory UserState.error({required Failure failure}) = UserError;
}
```

```dart
// lib/features/user/presentation/bloc/user_bloc.dart
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../../domain/usecases/get_user.dart';
import '../../../domain/usecases/update_user.dart';
import '../../../domain/usecases/delete_user.dart';
import 'user_event.dart';
import 'user_state.dart';

class UserBloc extends Bloc<UserEvent, UserState> {
  final GetUser _getUser;
  final UpdateUser _updateUser;
  final DeleteUser _deleteUser;

  UserBloc({
    required GetUser getUser,
    required UpdateUser updateUser,
    required DeleteUser deleteUser,
  })  : _getUser = getUser,
        _updateUser = updateUser,
        _deleteUser = deleteUser,
        super(const UserState.initial()) {
    on<LoadUser>(_onLoadUser);
    on<RefreshUser>(_onRefreshUser);
    on<UpdateUserName>(_onUpdateUserName);
    on<DeleteUser>(_onDeleteUser);
  }

  Future<void> _onLoadUser(LoadUser event, Emitter<UserState> emit) async {
    emit(const UserState.loading());
    final result = await _getUser(event.userId);
    result.fold(
      (failure) => emit(UserState.error(failure: failure)),
      (user) => emit(UserState.loaded(user: user)),
    );
  }

  Future<void> _onRefreshUser(RefreshUser event, Emitter<UserState> emit) async {
    final currentState = state;
    if (currentState is UserLoaded) {
      final result = await _getUser(currentState.user.id);
      result.fold(
        (failure) => emit(UserState.error(failure: failure)),
        (user) => emit(UserState.loaded(user: user)),
      );
    }
  }

  Future<void> _onUpdateUserName(UpdateUserName event, Emitter<UserState> emit) async {
    final currentState = state;
    if (currentState is UserLoaded) {
      emit(const UserState.loading());
      final result = await _updateUser(
        UpdateUserParams(userId: currentState.user.id, name: event.name),
      );
      result.fold(
        (failure) => emit(UserState.error(failure: failure)),
        (user) => emit(UserState.loaded(user: user)),
      );
    }
  }

  Future<void> _onDeleteUser(DeleteUser event, Emitter<UserState> emit) async {
    emit(const UserState.loading());
    final result = await _deleteUser(event.userId);
    result.fold(
      (failure) => emit(UserState.error(failure: failure)),
      (_) => emit(const UserState.initial()),
    );
  }
}
```

### Pattern 10.2: Event Transformers

Control how events are processed — debounce for search, sequential for form submit.

```dart
import 'package:bloc_concurrency/bloc_concurrency.dart';
import 'package:stream_transform/stream_transform.dart';

class ContactSearchBloc extends Bloc<ContactSearchEvent, ContactSearchState> {
  final SearchContacts _searchContacts;

  ContactSearchBloc(this._searchContacts)
      : super(const ContactSearchState.initial()) {

    // Debounce search — wait 300ms after user stops typing
    on<SearchQueryChanged>(
      _onSearchQueryChanged,
      transformer: debounce(const Duration(milliseconds: 300)),
    );

    // Sequential — ensure form submissions process in order
    on<SubmitContactForm>(
      _onSubmitContactForm,
      transformer: sequential(),
    );

    // Restartable — cancel previous load when new one starts
    on<LoadNextPage>(
      _onLoadNextPage,
      transformer: restartable(),
    );
  }

  Future<void> _onSearchQueryChanged(
    SearchQueryChanged event,
    Emitter<ContactSearchState> emit,
  ) async {
    if (event.query.isEmpty) {
      emit(const ContactSearchState.initial());
      return;
    }
    emit(const ContactSearchState.searching());
    final result = await _searchContacts(
      SearchContactsParams(query: event.query),
    );
    result.fold(
      (failure) => emit(ContactSearchState.error(failure: failure)),
      (contacts) => emit(ContactSearchState.results(contacts: contacts)),
    );
  }

  // ... other handlers
}

// Custom debounce transformer
EventTransformer<T> debounce<T>(Duration duration) {
  return (events, mapper) => events.debounce(duration).switchMap(mapper);
}
```

### Pattern 10.3: BLoC-to-BLoC Communication

BLoCs don't import each other — communicate via shared UseCases or BlocListener in widget tree.

```dart
// ❌ WRONG — BLoC importing another BLoC
class OrderBloc extends Bloc<OrderEvent, OrderState> {
  final UserBloc userBloc; // DON'T DO THIS
}

// ✅ CORRECT — share via UseCase (both BLoCs use same repository)
class OrderBloc extends Bloc<OrderEvent, OrderState> {
  final GetOrders _getOrders;
  final AuthService _authService; // Shared core service

  OrderBloc(this._getOrders, this._authService) : super(const OrderInitial());
}

// ✅ CORRECT — BlocListener in widget tree for cross-BLoC reactions
class OrderPage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, authState) {
        if (authState is AuthAuthenticated) {
          // When auth changes, reload orders
          context.read<OrderBloc>().add(LoadOrders(authState.userId));
        }
      },
      child: BlocBuilder<OrderBloc, OrderState>(
        builder: (context, state) => switch (state) {
          OrderInitial() => const SizedBox.shrink(),
          OrderLoading() => const CircularProgressIndicator(),
          OrderLoaded(:final orders) => OrderList(orders: orders),
          OrderError(:final failure) => ErrorDisplay(failure: failure),
        },
      ),
    );
  }
}
```

### Pattern 10.4: MultiBlocProvider

Provide multiple BLoCs at app-level or feature-level.

```dart
// App-level — global BLoCs (auth, theme, locale)
class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => getIt<AuthBloc>()..add(const CheckAuth())),
        BlocProvider(create: (_) => getIt<ThemeBloc>()),
        BlocProvider(create: (_) => getIt<LocaleBloc>()),
      ],
      child: MaterialApp.router(/* ... */),
    );
  }
}

// Feature-level — provide BLoC only for this route
GoRoute(
  path: '/users/:id',
  builder: (context, state) {
    final userId = state.pathParameters['id']!;
    return BlocProvider(
      create: (_) => getIt<UserBloc>()..add(LoadUser(userId)),
      child: const UserDetailPage(),
    );
  },
),

// ❌ DON'T create BLoC without DI
// BlocProvider(create: (_) => UserBloc(UserRepositoryImpl(ApiClient()))) // WRONG

// ✅ DO use GetIt for injection
// BlocProvider(create: (_) => getIt<UserBloc>())
```

### Pattern 10.5: BlocObserver

Global observer for logging, analytics, error tracking.

```dart
// lib/core/bloc/app_bloc_observer.dart
import 'package:flutter_bloc/flutter_bloc.dart';
import '../services/logger_service.dart';

class AppBlocObserver extends BlocObserver {
  final LoggerService _logger;

  AppBlocObserver(this._logger);

  @override
  void onEvent(Bloc bloc, Object? event) {
    super.onEvent(bloc, event);
    _logger.debug('${bloc.runtimeType} | Event: $event');
  }

  @override
  void onTransition(Bloc bloc, Transition transition) {
    super.onTransition(bloc, transition);
    _logger.info(
      '${bloc.runtimeType} | ${transition.currentState.runtimeType} → ${transition.nextState.runtimeType}',
    );
  }

  @override
  void onError(BlocBase bloc, Object error, StackTrace stackTrace) {
    super.onError(bloc, error, stackTrace);
    _logger.error('${bloc.runtimeType} | Error: $error', stackTrace: stackTrace);
    // Report to Crashlytics
  }
}

// Register in main.dart
void main() {
  Bloc.observer = AppBlocObserver(getIt<LoggerService>());
  runApp(const MyApp());
}
```

---

## MUST DO

- Use sealed class for events (exhaustive, type-safe)
- Use Freezed for states (immutable, copyWith, union types)
- Inject UseCases via constructor (not repository directly)
- Use event transformers for search (debounce) and form submit (sequential)
- Register BlocObserver in main.dart for production logging

## MUST NOT DO

- Import another BLoC from a BLoC (use shared UseCase or BlocListener)
- Import Data layer from BLoC (only Domain via DI)
- Create BLoC without DI (`getIt<XxxBloc>()`, not `XxxBloc(...)`)
- Use `emit` outside of event handler
- Forget to close subscriptions in BLoC's `close()` method

---

## References

- [BLoC Library](https://bloclibrary.dev/)
- [flutter_bloc Package](https://pub.dev/packages/flutter_bloc)
- [bloc_concurrency](https://pub.dev/packages/bloc_concurrency)
