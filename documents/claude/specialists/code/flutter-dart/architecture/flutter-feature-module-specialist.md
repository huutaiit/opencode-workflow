# Flutter Feature Module Specialist
# Flutterフィーチャーモジュールスペシャリスト
# Chuyen Gia Module Tinh Nang Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — feature module structure applies to all layers) |
| **Directory Pattern** | `lib/features/{feature_name}/` |
| **Variant** | ALL |
| **Naming Convention** | snake_case feature dirs, `{feature}.dart` barrel files |
| **Imports From** | N/A (defines feature module rules, not a code module) |
| **Cannot Import** | N/A (defines the isolation rules themselves) |
| **Pattern Numbers** | 0.6–0.9 |
| **Source Paths** | `lib/features/*/` |
| **File Count** | 5-15 features per enterprise app, 6-12 files per feature |
| **Imported By** | ALL feature specialists |
| **Dependencies** | None (structural conventions) |
| **When To Use** | Creating new feature module, organizing feature boundaries, barrel exports |
| **Source Skeleton** | `lib/features/{f}/domain/`, `lib/features/{f}/data/`, `lib/features/{f}/presentation/`, `lib/features/{f}/{f}.dart` |
| **Specialist Type** | architecture |
| **Purpose** | Define feature module conventions — naming, barrel exports, registration, feature flags, lazy loading |
| **Activation Trigger** | phase: /plan, /execute; keywords: newFeature, featureModule, barrel, featureFlag, deferredImport |

---

## Patterns

### Pattern 0.6: Feature Folder Convention

**When to create a new feature**: A feature is a cohesive business domain that has its own entities, logic, and UI.

```dart
// ✅ Good — each feature = 1 business domain
lib/features/
├── authentication/    # Login, register, forgot password
├── user_profile/      # View/edit profile, settings
├── orders/            # Order list, create, detail, track
├── products/          # Product catalog, search, detail
├── notifications/     # Push notifications, inbox
└── settings/          # App settings, preferences

// ❌ Bad — features too granular or too broad
lib/features/
├── login/             # Too granular — part of authentication
├── register/          # Too granular — part of authentication
├── everything/        # Too broad — split by domain
```

**Naming rules**:
- Feature directory: `snake_case` (e.g., `user_profile/`)
- Feature should map to a navigation section or business domain
- If a feature has >20 files, consider splitting into sub-features

### Pattern 0.7: Barrel Exports

Each feature exposes a public API via a barrel file — only export what other features/core need:

```dart
// lib/features/user_profile/user_profile.dart
// PUBLIC API — only domain entities + presentation pages

// Domain entities (shared types)
export 'domain/entities/user.dart';
export 'domain/entities/user_preferences.dart';

// Presentation (navigation targets)
export 'presentation/pages/user_profile_page.dart';
export 'presentation/pages/edit_profile_page.dart';

// ❌ DO NOT export:
// - data/models/ (internal implementation)
// - data/datasources/ (internal implementation)
// - data/repositories/ (internal implementation — exposed via DI)
// - presentation/bloc/ (internal state — accessed via BlocProvider)
// - presentation/widgets/ (internal UI — used only within this feature)
```

### Pattern 0.8: Feature Registration

When adding a new feature, register in 2 places:

```dart
// 1. DI Registration — core/di/injection_container.dart
@module
abstract class UserProfileModule {
  @lazySingleton
  UserProfileRemoteDataSource get remoteDataSource =>
      UserProfileRemoteDataSourceImpl(getIt<ApiClient>());

  @lazySingleton
  UserProfileRepository get repository =>
      UserProfileRepositoryImpl(
        remoteDataSource: getIt<UserProfileRemoteDataSource>(),
        localDataSource: getIt<UserProfileLocalDataSource>(),
      );

  @factory
  UserProfileBloc get bloc =>
      UserProfileBloc(getUser: getIt<GetUser>());
}
```

```dart
// 2. Route Registration — core/routing/app_router.dart
GoRoute(
  path: '/profile',
  name: RouteNames.userProfile,
  builder: (context, state) => BlocProvider(
    create: (_) => getIt<UserProfileBloc>()..add(const LoadProfile()),
    child: const UserProfilePage(),
  ),
),
```

### Pattern 0.9: Feature Flags + Lazy Loading

Use deferred imports for optional features:

```dart
// lib/features/experimental/experimental.dart
// Feature loaded on demand — not included in initial bundle

import 'package:flutter/material.dart';

// Deferred import — only loaded when feature flag is enabled
import 'presentation/pages/experimental_page.dart' deferred as experimental;

Future<Widget> loadExperimentalPage() async {
  await experimental.loadLibrary();
  return experimental.ExperimentalPage();
}
```

```dart
// Feature flag check — via Firebase Remote Config or local config
if (featureFlags.isEnabled('experimental_feature')) {
  final page = await loadExperimentalPage();
  Navigator.push(context, MaterialPageRoute(builder: (_) => page));
}
```

---

## MUST DO

- Name features by business domain (not by UI element)
- Create barrel export file for every feature
- Export only domain entities + presentation pages
- Register DI + routes for every feature

## MUST NOT DO

- Create features smaller than 1 business domain (e.g., separate "login" and "register")
- Export data layer from barrel file
- Import one feature's internal files from another feature
- Skip DI registration when adding a new feature

---

## References

- [Very Good CLI — folder-by-feature](https://cli.vgv.dev/docs/templates/core)
- [Flutter Architecture Recommendations](https://docs.flutter.dev/app-architecture/recommendations)
