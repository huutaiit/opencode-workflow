# Flutter BLoC Test Specialist
# Flutter BLoCテストスペシャリスト
# Chuyen Gia Test BLoC Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: clean-bloc

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (test scope) |
| **Directory Pattern** | `test/features/{feature}/presentation/bloc/` |
| **Variant** | clean-bloc |
| **Naming Convention** | `{name}_bloc_test.dart`, `{name}_cubit_test.dart`. Uses `blocTest<Bloc,State>()` |
| **Imports From** | ALL (test scope) |
| **Cannot Import** | N/A (test scope) |
| **Pattern Numbers** | 81.1–81.5 |
| **Source Paths** | `test/features/*/presentation/bloc/*_bloc_test.dart`, `test/features/*/presentation/bloc/*_cubit_test.dart` |
| **File Count** | 1 test file per BLoC/Cubit, 5-15 BLoC test files per enterprise app |
| **Imported By** | N/A (terminal — test runner only) |
| **Dependencies** | bloc_test ^9.1.0, flutter_test (SDK), mocktail ^1.0.0 |
| **When To Use** | Testing BLoC event→state transitions, Cubit method→state emissions |
| **Source Skeleton** | `test/features/{f}/presentation/bloc/{name}_bloc_test.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate BLoC/Cubit tests using blocTest() with seed, act, expect pattern and mocked repository dependencies |
| **Activation Trigger** | files: test/features/*/presentation/bloc/*_test.dart; keywords: blocTest, cubitTest, stateEmission, eventTest, seedState |

---

## Patterns

### Pattern 81.1: blocTest() Pattern

```dart
// test/features/user/presentation/bloc/user_bloc_test.dart
import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fpdart/fpdart.dart';
import 'package:mocktail/mocktail.dart';

class MockGetUser extends Mock implements GetUser {}
class MockUpdateUser extends Mock implements UpdateUser {}
class MockDeleteUser extends Mock implements DeleteUser {}

void main() {
  late UserBloc bloc;
  late MockGetUser mockGetUser;
  late MockUpdateUser mockUpdateUser;
  late MockDeleteUser mockDeleteUser;

  final testUser = User(id: '1', name: 'John', email: 'john@test.com', createdAt: DateTime(2024));

  setUp(() {
    mockGetUser = MockGetUser();
    mockUpdateUser = MockUpdateUser();
    mockDeleteUser = MockDeleteUser();
    bloc = UserBloc(
      getUser: mockGetUser,
      updateUser: mockUpdateUser,
      deleteUser: mockDeleteUser,
    );
  });

  tearDown(() => bloc.close());

  group('UserBloc', () {
    test('initial state is UserInitial', () {
      expect(bloc.state, const UserState.initial());
    });

    blocTest<UserBloc, UserState>(
      'emits [loading, loaded] when LoadUser succeeds',
      build: () {
        when(() => mockGetUser('1')).thenAnswer((_) async => Right(testUser));
        return bloc;
      },
      act: (bloc) => bloc.add(const LoadUser('1')),
      expect: () => [
        const UserState.loading(),
        UserState.loaded(user: testUser),
      ],
      verify: (_) {
        verify(() => mockGetUser('1')).called(1);
      },
    );

    blocTest<UserBloc, UserState>(
      'emits [loading, error] when LoadUser fails',
      build: () {
        when(() => mockGetUser('1')).thenAnswer(
          (_) async => const Left(ServerFailure('Not found', statusCode: 404)),
        );
        return bloc;
      },
      act: (bloc) => bloc.add(const LoadUser('1')),
      expect: () => [
        const UserState.loading(),
        const UserState.error(failure: ServerFailure('Not found', statusCode: 404)),
      ],
    );
  });
}
```

### Pattern 81.2: Seed + Act + Expect

```dart
blocTest<UserBloc, UserState>(
  'emits [loaded] with updated user when UpdateUserName succeeds from loaded state',
  build: () {
    final updatedUser = testUser.copyWith(name: 'Jane');
    when(() => mockUpdateUser(any())).thenAnswer((_) async => Right(updatedUser));
    return bloc;
  },
  seed: () => UserState.loaded(user: testUser), // Pre-set state
  act: (bloc) => bloc.add(const UpdateUserName('Jane')),
  expect: () => [
    const UserState.loading(),
    UserState.loaded(user: testUser.copyWith(name: 'Jane')),
  ],
);

blocTest<UserBloc, UserState>(
  'does nothing when UpdateUserName called from initial state',
  build: () => bloc,
  seed: () => const UserState.initial(), // Wrong state — handler should skip
  act: (bloc) => bloc.add(const UpdateUserName('Jane')),
  expect: () => [], // No state changes
  verify: (_) {
    verifyNever(() => mockUpdateUser(any())); // UseCase never called
  },
);
```

### Pattern 81.3: Testing BLoC Events

```dart
// Multiple events in sequence
blocTest<ContactSearchBloc, ContactSearchState>(
  'debounces search events — only last query processed',
  build: () {
    when(() => mockSearchContacts(any())).thenAnswer(
      (_) async => Right([testContact]),
    );
    return ContactSearchBloc(mockSearchContacts);
  },
  act: (bloc) async {
    bloc.add(const SearchQueryChanged('J'));
    bloc.add(const SearchQueryChanged('Jo'));
    bloc.add(const SearchQueryChanged('John'));
    await Future.delayed(const Duration(milliseconds: 400)); // Wait for debounce
  },
  expect: () => [
    const ContactSearchState.searching(),
    ContactSearchState.results(contacts: [testContact]),
  ],
  verify: (_) {
    // Only last query sent to use case (debounced)
    verify(() => mockSearchContacts(SearchContactsParams(query: 'John'))).called(1);
  },
);
```

### Pattern 81.4: Testing Cubit Methods

```dart
// test/features/settings/presentation/bloc/settings_cubit_test.dart
blocTest<SettingsCubit, SettingsState>(
  'toggleDarkMode flips darkMode value',
  build: () {
    when(() => mockUpdateSettings(any())).thenAnswer((_) async => const Right(null));
    return SettingsCubit(mockGetSettings, mockUpdateSettings);
  },
  seed: () => const SettingsState.loaded(
    locale: 'en', darkMode: false, notificationsEnabled: true, biometricEnabled: false,
  ),
  act: (bloc) => bloc.toggleDarkMode(),
  expect: () => [
    const SettingsState.loaded(
      locale: 'en', darkMode: true, notificationsEnabled: true, biometricEnabled: false,
    ),
  ],
);
```

### Pattern 81.5: Mocking Repositories in BLoC Tests

```dart
// Setup pattern — mock UseCase (not repository directly)
// BLoC receives UseCase via DI → mock the UseCase

class MockGetUsers extends Mock implements GetUsers {}

void main() {
  late MockGetUsers mockGetUsers;
  late UserListBloc bloc;

  setUp(() {
    mockGetUsers = MockGetUsers();
    // Register fallback values for custom types
    registerFallbackValue(const GetUsersParams(page: 1));
  });

  blocTest<UserListBloc, UserListState>(
    'loads first page of users',
    build: () {
      when(() => mockGetUsers(any())).thenAnswer(
        (_) async => Right(PaginatedResponse(
          items: TestData.contacts(20),
          hasMore: true,
          totalCount: 100,
        )),
      );
      return UserListBloc(mockGetUsers);
    },
    act: (bloc) => bloc.add(const LoadUsers()),
    expect: () => [
      const UserListState.loading(),
      isA<UserListLoaded>()
          .having((s) => s.contacts.length, 'contacts count', 20)
          .having((s) => s.hasReachedMax, 'hasReachedMax', false)
          .having((s) => s.currentPage, 'currentPage', 1),
    ],
  );
}
```

---

## MUST DO

- Use `blocTest<Bloc,State>()` for all BLoC/Cubit tests
- Mock UseCases (not repositories directly) — test BLoC in isolation
- Test all state transitions: initial→loading→loaded, initial→loading→error
- Use `seed` for testing from non-initial states
- Verify UseCase was called with correct params

## MUST NOT DO

- Test repository implementation in BLoC tests (mock it)
- Skip error state testing
- Use real async delays in tests (use `await Future.delayed` only for debounce)
- Forget `tearDown(() => bloc.close())` — prevents memory leaks in tests
- Test private methods — test public behavior via events

---

## References

- [bloc_test Package](https://pub.dev/packages/bloc_test)
- [BLoC Testing Tutorial](https://bloclibrary.dev/testing/)
