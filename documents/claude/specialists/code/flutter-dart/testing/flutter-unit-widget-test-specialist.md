# Flutter Unit & Widget Test Specialist
# Flutterユニット＆ウィジェットテストスペシャリスト
# Chuyen Gia Unit Va Widget Test Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (test scope — imports whatever it tests) |
| **Directory Pattern** | `test/features/{feature}/`, `test/core/` |
| **Variant** | ALL |
| **Naming Convention** | `{name}_test.dart`. Test structure: `main()` with `group()` + `test()`/`testWidgets()` |
| **Imports From** | ALL (test files import whatever they test — domain, data, presentation) |
| **Cannot Import** | N/A (test scope — no import restrictions) |
| **Pattern Numbers** | 80.1–80.6 |
| **Source Paths** | `test/**/*_test.dart` |
| **File Count** | ~1:1 with source files, 50-200 test files per enterprise app |
| **Imported By** | N/A (terminal — test runner only) |
| **Dependencies** | flutter_test (SDK), mockito ^5.4.0, mocktail ^1.0.0, build_runner ^2.4.0 (for @GenerateMocks) |
| **When To Use** | Writing unit tests for UseCases/Repositories, widget tests for pages/widgets, golden tests |
| **Source Skeleton** | `test/features/{f}/domain/usecases/{name}_test.dart`, `test/features/{f}/presentation/pages/{name}_page_test.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate unit tests with Arrange-Act-Assert, widget tests with pumpWidget+finder, golden tests, and proper mock/fake setup |
| **Activation Trigger** | files: test/**/*_test.dart; keywords: unitTest, widgetTest, goldenTest, mockito, mocktail, testFixture, integrationTest |

---

## Patterns

### Pattern 80.1: Unit Test Structure

```dart
// test/features/user/domain/usecases/get_user_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:fpdart/fpdart.dart';

class MockUserRepository extends Mock implements UserRepository {}

void main() {
  late GetUser useCase;
  late MockUserRepository mockRepository;

  setUp(() {
    mockRepository = MockUserRepository();
    useCase = GetUser(mockRepository);
  });

  group('GetUser', () {
    const testUserId = 'user-123';
    final testUser = User(id: testUserId, name: 'John', email: 'john@test.com', createdAt: DateTime(2024));

    test('should return User when repository succeeds', () async {
      // Arrange
      when(() => mockRepository.getUser(testUserId))
          .thenAnswer((_) async => Right(testUser));

      // Act
      final result = await useCase(testUserId);

      // Assert
      expect(result, Right(testUser));
      verify(() => mockRepository.getUser(testUserId)).called(1);
      verifyNoMoreInteractions(mockRepository);
    });

    test('should return ServerFailure when repository fails', () async {
      // Arrange
      const failure = ServerFailure('Server error', statusCode: 500);
      when(() => mockRepository.getUser(testUserId))
          .thenAnswer((_) async => const Left(failure));

      // Act
      final result = await useCase(testUserId);

      // Assert
      expect(result, const Left(failure));
    });
  });
}
```

### Pattern 80.2: Mockito + Mocktail

```dart
// Mocktail (RECOMMENDED — no code generation needed)
class MockUserRepository extends Mock implements UserRepository {}
class MockGetUser extends Mock implements GetUser {}

// Register fallback values for custom types
void main() {
  setUpAll(() {
    registerFallbackValue(User(id: '', name: '', email: '', createdAt: DateTime(2024)));
    registerFallbackValue(const CreateUserParams(name: '', email: ''));
  });
}

// Mockito (alternative — requires code generation)
// test/helpers/mocks.dart
import 'package:mockito/annotations.dart';

@GenerateMocks([UserRepository, GetUser, UpdateUser])
void main() {}
// Run: dart run build_runner build
// Generates: mocks.mocks.dart

// Stub with mocktail
when(() => mockRepo.getUser(any())).thenAnswer((_) async => Right(testUser));
when(() => mockRepo.getUsers()).thenAnswer((_) async => Right([testUser]));

// Verify
verify(() => mockRepo.getUser('user-123')).called(1);
verifyNever(() => mockRepo.deleteUser(any()));
```

### Pattern 80.3: Widget Test

```dart
// test/features/user/presentation/pages/user_detail_page_test.dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:mocktail/mocktail.dart';

class MockUserBloc extends MockBloc<UserEvent, UserState> implements UserBloc {}

void main() {
  late MockUserBloc mockBloc;

  setUp(() {
    mockBloc = MockUserBloc();
  });

  Widget buildTestWidget() {
    return MaterialApp(
      home: BlocProvider<UserBloc>.value(
        value: mockBloc,
        child: const UserDetailPage(),
      ),
    );
  }

  group('UserDetailPage', () {
    testWidgets('shows loading indicator when state is loading', (tester) async {
      when(() => mockBloc.state).thenReturn(const UserState.loading());

      await tester.pumpWidget(buildTestWidget());

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('shows user name when state is loaded', (tester) async {
      final testUser = User(id: '1', name: 'John Doe', email: 'john@test.com', createdAt: DateTime(2024));
      when(() => mockBloc.state).thenReturn(UserState.loaded(user: testUser));

      await tester.pumpWidget(buildTestWidget());

      expect(find.text('John Doe'), findsOneWidget);
      expect(find.text('john@test.com'), findsOneWidget);
    });

    testWidgets('shows error message and retry button', (tester) async {
      when(() => mockBloc.state).thenReturn(
        const UserState.error(failure: ServerFailure('Server error')),
      );

      await tester.pumpWidget(buildTestWidget());

      expect(find.text('Server error'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);

      // Tap retry
      await tester.tap(find.text('Retry'));
      verify(() => mockBloc.add(const LoadUser('1'))).called(1);
    });

    testWidgets('navigates to edit page on edit button tap', (tester) async {
      // ... test navigation
    });
  });
}
```

### Pattern 80.4: Golden Tests

```dart
testWidgets('ContactCard matches golden', (tester) async {
  final contact = Contact(
    id: '1', firstName: 'John', lastName: 'Doe',
    email: 'john@test.com', status: ContactStatus.active,
    lastContactedAt: DateTime(2024, 1, 15),
  );

  await tester.pumpWidget(MaterialApp(
    theme: AppTheme.light,
    home: Scaffold(body: ContactCard(contact: contact)),
  ));

  await expectLater(
    find.byType(ContactCard),
    matchesGoldenFile('goldens/contact_card_active.png'),
  );
});

// Update goldens: flutter test --update-goldens
// CI: flutter test (compares against committed goldens)
```

### Pattern 80.5: Test Fixtures + Factories

```dart
// test/helpers/test_data.dart
class TestData {
  static final user = User(
    id: 'user-1', name: 'Test User', email: 'test@example.com',
    createdAt: DateTime(2024, 1, 1),
  );

  static final contact = Contact(
    id: 'contact-1', firstName: 'John', lastName: 'Doe',
    email: 'john@test.com', status: ContactStatus.active,
    lastContactedAt: DateTime(2024, 6, 15),
  );

  static List<Contact> contacts(int count) => List.generate(
    count,
    (i) => Contact(
      id: 'contact-$i', firstName: 'User $i', lastName: 'Test',
      email: 'user$i@test.com', status: ContactStatus.active,
      lastContactedAt: DateTime(2024, 1, i + 1),
    ),
  );

  static final order = Order(
    id: 'order-1', customerId: 'user-1',
    items: [OrderItem(productId: 'p1', productName: 'Widget', quantity: 2, unitPrice: const Money(amount: 1000, currency: 'JPY'))],
    status: OrderStatus.pending, createdAt: DateTime(2024, 3, 1),
  );
}
```

### Pattern 80.6: Integration Test

```dart
// integration_test/app_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:my_app/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  group('Login Flow', () {
    testWidgets('user can login and see dashboard', (tester) async {
      app.main();
      await tester.pumpAndSettle();

      // Login screen
      await tester.enterText(find.byKey(const Key('email_field')), 'admin@test.com');
      await tester.enterText(find.byKey(const Key('password_field')), 'password123');
      await tester.tap(find.byKey(const Key('login_button')));
      await tester.pumpAndSettle();

      // Dashboard should appear
      expect(find.text('Dashboard'), findsOneWidget);
    });
  });
}

// Run: flutter test integration_test/
```

---

## MUST DO

- Use Arrange-Act-Assert structure for all tests
- Mock external dependencies (repository, API, database)
- Test all BLoC states (initial, loading, loaded, error)
- Use TestData factory for consistent test fixtures
- Add golden tests for critical UI components

## MUST NOT DO

- Test implementation details (test behavior, not internals)
- Use real network/database in unit tests (always mock)
- Skip error state testing (it's where bugs hide)
- Hardcode test data inline (use TestData factory)

---

## References

- [Flutter Testing](https://docs.flutter.dev/testing)
- [mocktail Package](https://pub.dev/packages/mocktail)
- [Golden Tests](https://api.flutter.dev/flutter/flutter_test/matchesGoldenFile.html)
