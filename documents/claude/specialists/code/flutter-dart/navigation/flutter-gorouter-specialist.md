# Flutter GoRouter Specialist
# Flutter GoRouterスペシャリスト
# Chuyen Gia GoRouter Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Directory Pattern** | `lib/core/routing/`, `lib/features/{feature}/presentation/pages/` |
| **Variant** | ALL |
| **Naming Convention** | `app_router.dart` (config), `{name}_page.dart` (destinations). Classes: `AppRouter`, `{Name}Page` |
| **Imports From** | Domain (entities for route params), Presentation (pages as route destinations) |
| **Cannot Import** | Data (datasources, models, repo impls) |
| **Pattern Numbers** | 20.1–20.7 |
| **Source Paths** | `lib/core/routing/*.dart`, `lib/features/*/presentation/pages/*.dart` |
| **File Count** | 1 router config + 10-30 page destinations per enterprise app |
| **Imported By** | Core (MaterialApp.router uses GoRouter), Presentation (pages register routes) |
| **Dependencies** | go_router ^14.0.0, go_router_builder ^2.7.0 (optional typed routes) |
| **When To Use** | App navigation setup, deep linking, route guards, nested navigation with bottom tabs |
| **Source Skeleton** | `lib/core/routing/app_router.dart`, `lib/core/routing/route_names.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate GoRouter configuration with typed routes, auth guards, nested navigation, and deep linking for enterprise multi-module apps |
| **Activation Trigger** | files: lib/core/routing/*.dart; keywords: goRouter, routing, deepLink, routeGuard, shellRoute, navigation |

---

## Patterns

### Pattern 20.1: Route Configuration

```dart
// lib/core/routing/app_router.dart
import 'package:go_router/go_router.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'route_names.dart';

class AppRouter {
  static final router = GoRouter(
    initialLocation: '/',
    debugLogDiagnostics: true,
    redirect: _globalRedirect,
    errorBuilder: (context, state) => ErrorPage(error: state.error),
    routes: [
      // Auth routes (no shell)
      GoRoute(
        path: '/login',
        name: RouteNames.login,
        builder: (context, state) => const LoginPage(),
      ),

      // Main app with bottom navigation
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            MainShell(navigationShell: navigationShell),
        branches: [
          // Tab 1: Dashboard
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/',
              name: RouteNames.dashboard,
              builder: (context, state) => const DashboardPage(),
            ),
          ]),
          // Tab 2: Contacts (CRM)
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/contacts',
              name: RouteNames.contacts,
              builder: (context, state) => const ContactListPage(),
              routes: [
                GoRoute(
                  path: ':id',
                  name: RouteNames.contactDetail,
                  builder: (context, state) {
                    final id = state.pathParameters['id']!;
                    return BlocProvider(
                      create: (_) => getIt<ContactBloc>()..add(LoadContact(id)),
                      child: const ContactDetailPage(),
                    );
                  },
                ),
              ],
            ),
          ]),
          // Tab 3: Orders (ERP)
          StatefulShellBranch(routes: [
            GoRoute(
              path: '/orders',
              name: RouteNames.orders,
              builder: (context, state) => const OrderListPage(),
            ),
          ]),
        ],
      ),
    ],
  );

  static String? _globalRedirect(BuildContext context, GoRouterState state) {
    final authState = context.read<AuthBloc>().state;
    final isLoggedIn = authState is AuthAuthenticated;
    final isLoginRoute = state.matchedLocation == '/login';

    if (!isLoggedIn && !isLoginRoute) return '/login';
    if (isLoggedIn && isLoginRoute) return '/';
    return null;
  }
}

// lib/core/routing/route_names.dart
class RouteNames {
  static const login = 'login';
  static const dashboard = 'dashboard';
  static const contacts = 'contacts';
  static const contactDetail = 'contactDetail';
  static const orders = 'orders';
}
```

### Pattern 20.2: Deep Linking + Path Parameters

```dart
// Path parameters
GoRoute(
  path: '/patients/:patientId/records/:recordId',
  name: RouteNames.patientRecord,
  builder: (context, state) {
    final patientId = state.pathParameters['patientId']!;
    final recordId = state.pathParameters['recordId']!;
    return PatientRecordPage(patientId: patientId, recordId: recordId);
  },
),

// Query parameters
GoRoute(
  path: '/search',
  name: RouteNames.search,
  builder: (context, state) {
    final query = state.uri.queryParameters['q'] ?? '';
    final category = state.uri.queryParameters['category'];
    return SearchPage(query: query, category: category);
  },
),

// Navigate with parameters
context.goNamed(RouteNames.contactDetail, pathParameters: {'id': contact.id});
context.goNamed(RouteNames.search, queryParameters: {'q': 'flutter', 'category': 'tech'});
```

### Pattern 20.3: Route Guards (redirect)

```dart
// Role-based guard
GoRoute(
  path: '/admin',
  name: RouteNames.admin,
  redirect: (context, state) {
    final user = context.read<AuthBloc>().state;
    if (user is! AuthAuthenticated) return '/login';
    if (user.role != UserRole.admin) return '/unauthorized';
    return null; // Allow access
  },
  builder: (context, state) => const AdminDashboardPage(),
),

// Onboarding guard — redirect if profile incomplete
GoRoute(
  path: '/home',
  redirect: (context, state) {
    final profile = context.read<ProfileCubit>().state;
    if (profile is ProfileLoaded && !profile.isComplete) {
      return '/onboarding';
    }
    return null;
  },
  builder: (context, state) => const HomePage(),
),
```

### Pattern 20.4: Nested Navigation (ShellRoute)

```dart
// Bottom navigation with nested routes — each tab preserves its stack
class MainShell extends StatelessWidget {
  final StatefulNavigationShell navigationShell;

  const MainShell({required this.navigationShell, super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: navigationShell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: navigationShell.currentIndex,
        onDestinationSelected: (index) {
          navigationShell.goBranch(
            index,
            initialLocation: index == navigationShell.currentIndex,
          );
        },
        destinations: const [
          NavigationDestination(icon: Icon(Icons.dashboard), label: 'Dashboard'),
          NavigationDestination(icon: Icon(Icons.contacts), label: 'Contacts'),
          NavigationDestination(icon: Icon(Icons.inventory), label: 'Orders'),
        ],
      ),
    );
  }
}
```

### Pattern 20.5: Navigation with BLoC

```dart
// GoRouterRefreshStream — redirect when auth state changes
class AppRouter {
  static GoRouter router(AuthBloc authBloc) => GoRouter(
    refreshListenable: GoRouterRefreshStream(authBloc.stream),
    redirect: (context, state) {
      final isLoggedIn = authBloc.state is AuthAuthenticated;
      final isLoginRoute = state.matchedLocation == '/login';
      if (!isLoggedIn && !isLoginRoute) return '/login';
      if (isLoggedIn && isLoginRoute) return '/';
      return null;
    },
    routes: [/* ... */],
  );
}

// GoRouterRefreshStream helper
class GoRouterRefreshStream extends ChangeNotifier {
  GoRouterRefreshStream(Stream<dynamic> stream) {
    notifyListeners();
    _subscription = stream.asBroadcastStream().listen((_) => notifyListeners());
  }

  late final StreamSubscription<dynamic> _subscription;

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}
```

### Pattern 20.6: Typed Routes (go_router_builder)

```dart
// Type-safe route definitions — compile-time checked parameters
import 'package:go_router/go_router.dart';

part 'app_routes.g.dart';

@TypedGoRoute<HomeRoute>(path: '/')
class HomeRoute extends GoRouteData {
  const HomeRoute();
  @override
  Widget build(BuildContext context, GoRouterState state) => const HomePage();
}

@TypedGoRoute<ContactDetailRoute>(path: '/contacts/:id')
class ContactDetailRoute extends GoRouteData {
  final String id;
  const ContactDetailRoute({required this.id});

  @override
  Widget build(BuildContext context, GoRouterState state) =>
      ContactDetailPage(contactId: id);
}

// Usage — type-safe, no string parameters
const ContactDetailRoute(id: 'abc-123').go(context);
```

### Pattern 20.7: Modal/Dialog Routes

```dart
// Dialog as route — has URL, supports deep link
GoRoute(
  path: '/contacts/:id/edit',
  name: RouteNames.editContact,
  pageBuilder: (context, state) => DialogPage(
    builder: (_) => EditContactDialog(
      contactId: state.pathParameters['id']!,
    ),
  ),
),

// Custom DialogPage
class DialogPage extends CustomTransitionPage<void> {
  DialogPage({required WidgetBuilder builder})
      : super(
          transitionsBuilder: (context, animation, secondaryAnimation, child) =>
              FadeTransition(opacity: animation, child: child),
          child: Builder(builder: builder),
        );
}
```

---

## MUST DO

- Use GoRouter as the single routing solution
- Define route names as constants (RouteNames class)
- Use StatefulShellRoute for bottom navigation
- Use redirect for auth/role guards
- Provide BLoC via BlocProvider in route builder (not globally for feature BLoCs)

## MUST NOT DO

- Use Navigator.push directly (always go through GoRouter)
- Hardcode route paths as strings (use RouteNames constants)
- Skip redirect guard on protected routes
- Import Data layer in route builders

---

## References

- [go_router Package](https://pub.dev/packages/go_router)
- [go_router_builder](https://pub.dev/packages/go_router_builder)
- [Flutter Navigation](https://docs.flutter.dev/ui/navigation)
