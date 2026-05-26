# Flutter Analytics + Firebase Specialist
# Flutter アナリティクス＋Firebaseスペシャリスト
# Chuyen Gia Analytics Va Firebase Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — analytics/firebase spans every layer) |
| **Directory Pattern** | `lib/core/services/`, `lib/core/firebase/` |
| **Variant** | ALL |
| **Naming Convention** | `analytics_service.dart`, `firebase_config.dart`. Classes: `AnalyticsService`, `FirebaseConfig` |
| **Imports From** | ALL (analytics tracks events from every layer) |
| **Cannot Import** | N/A (analytics service is cross-cutting by design) |
| **Pattern Numbers** | 100.1–100.5 |
| **Source Paths** | `lib/core/services/analytics*.dart`, `lib/core/firebase/*.dart` |
| **File Count** | 2-4 analytics/firebase config files |
| **Imported By** | ALL (BLoC observer, route observer, error handler all emit analytics) |
| **Dependencies** | firebase_core ^2.27.0, firebase_analytics ^10.8.0, firebase_crashlytics ^3.4.0, firebase_remote_config ^4.3.0 |
| **When To Use** | Firebase setup, custom analytics events, crash reporting, remote config feature flags |
| **Source Skeleton** | `lib/core/firebase/firebase_config.dart`, `lib/core/services/analytics_service.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate Firebase integration with core setup, custom analytics events, Crashlytics error reporting, Remote Config feature flags, and optional Firebase Auth |
| **Activation Trigger** | files: lib/core/firebase/*.dart, lib/core/services/analytics*.dart; keywords: firebase, analytics, crashlytics, remoteConfig, firebaseAuth |

---

## Patterns

### Pattern 100.1: Firebase Core Setup

```dart
import 'package:firebase_core/firebase_core.dart';

/// Multi-flavor Firebase configuration (dev/staging/prod)
class FirebaseConfig {
  /// Initialize Firebase with flavor-specific options
  static Future<void> initialize({required String flavor}) async {
    await Firebase.initializeApp(
      options: _getOptions(flavor),
    );
  }

  static FirebaseOptions _getOptions(String flavor) {
    switch (flavor) {
      case 'dev':
        return const FirebaseOptions(
          apiKey: 'dev-api-key',
          appId: 'dev-app-id',
          messagingSenderId: 'dev-sender-id',
          projectId: 'myapp-dev',
          storageBucket: 'myapp-dev.appspot.com',
        );
      case 'staging':
        return const FirebaseOptions(
          apiKey: 'staging-api-key',
          appId: 'staging-app-id',
          messagingSenderId: 'staging-sender-id',
          projectId: 'myapp-staging',
          storageBucket: 'myapp-staging.appspot.com',
        );
      case 'prod':
        return const FirebaseOptions(
          apiKey: 'prod-api-key',
          appId: 'prod-app-id',
          messagingSenderId: 'prod-sender-id',
          projectId: 'myapp-prod',
          storageBucket: 'myapp-prod.appspot.com',
        );
      default:
        throw ArgumentError('Unknown flavor: $flavor');
    }
  }
}

// main.dart
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Flavor from --dart-define or environment
  const flavor = String.fromEnvironment('FLAVOR', defaultValue: 'dev');
  await FirebaseConfig.initialize(flavor: flavor);

  runApp(const MyApp());
}

// Build commands:
// flutter run --dart-define=FLAVOR=dev
// flutter build apk --dart-define=FLAVOR=prod
```

### Pattern 100.2: Analytics Events

```dart
import 'package:firebase_analytics/firebase_analytics.dart';

/// Abstracted analytics service (swappable backend)
class AnalyticsService {
  final FirebaseAnalytics _analytics;

  AnalyticsService([FirebaseAnalytics? analytics])
      : _analytics = analytics ?? FirebaseAnalytics.instance;

  /// Screen view tracking
  Future<void> logScreenView(String screenName) async {
    await _analytics.logScreenView(screenName: screenName);
  }

  /// Custom business events
  Future<void> logEvent({
    required String name,
    Map<String, Object>? parameters,
  }) async {
    await _analytics.logEvent(name: name, parameters: parameters);
  }

  /// User properties
  Future<void> setUserProperty({
    required String name,
    required String? value,
  }) async {
    await _analytics.setUserProperty(name: name, value: value);
  }

  /// Set user ID for cross-device tracking
  Future<void> setUserId(String? userId) async {
    await _analytics.setUserId(id: userId);
  }

  // Pre-defined business events
  Future<void> logLogin(String method) =>
      _analytics.logLogin(loginMethod: method);

  Future<void> logSignUp(String method) =>
      _analytics.logSignUp(signUpMethod: method);

  Future<void> logPurchase({
    required double value,
    required String currency,
    List<AnalyticsEventItem>? items,
  }) async {
    await _analytics.logPurchase(
      value: value,
      currency: currency,
      items: items,
    );
  }
}

/// Route observer for automatic screen tracking
class AnalyticsRouteObserver extends RouteObserver<PageRoute<dynamic>> {
  final AnalyticsService _analytics;

  AnalyticsRouteObserver(this._analytics);

  @override
  void didPush(Route route, Route? previousRoute) {
    super.didPush(route, previousRoute);
    if (route is PageRoute) {
      _analytics.logScreenView(route.settings.name ?? 'unknown');
    }
  }
}

// Usage in MaterialApp
// navigatorObservers: [AnalyticsRouteObserver(analyticsService)]
```

### Pattern 100.3: Crashlytics

```dart
import 'package:firebase_crashlytics/firebase_crashlytics.dart';

class CrashlyticsService {
  /// Initialize Crashlytics with global error forwarding
  static Future<void> initialize() async {
    // Enable crash collection
    await FirebaseCrashlytics.instance.setCrashlyticsCollectionEnabled(true);

    // Forward Flutter errors to Crashlytics
    FlutterError.onError = (details) {
      FirebaseCrashlytics.instance.recordFlutterFatalError(details);
    };

    // Forward async errors
    PlatformDispatcher.instance.onError = (error, stack) {
      FirebaseCrashlytics.instance.recordError(error, stack, fatal: true);
      return true;
    };
  }

  /// Set user identifier for crash reports
  static Future<void> setUser(String userId) async {
    await FirebaseCrashlytics.instance.setUserIdentifier(userId);
  }

  /// Add custom key-value for crash context
  static Future<void> setCustomKey(String key, Object value) async {
    await FirebaseCrashlytics.instance.setCustomKey(key, value);
  }

  /// Log non-fatal error
  static Future<void> recordError(
    Object error,
    StackTrace stack, {
    String? reason,
  }) async {
    await FirebaseCrashlytics.instance.recordError(
      error, stack,
      reason: reason,
      fatal: false,
    );
  }

  /// Add breadcrumb log message
  static Future<void> log(String message) async {
    await FirebaseCrashlytics.instance.log(message);
  }
}
```

### Pattern 100.4: Remote Config Feature Flags

```dart
import 'package:firebase_remote_config/firebase_remote_config.dart';

class FeatureFlagService {
  final FirebaseRemoteConfig _remoteConfig;

  FeatureFlagService([FirebaseRemoteConfig? config])
      : _remoteConfig = config ?? FirebaseRemoteConfig.instance;

  /// Initialize with defaults and fetch
  Future<void> initialize() async {
    await _remoteConfig.setConfigSettings(RemoteConfigSettings(
      fetchTimeout: const Duration(minutes: 1),
      minimumFetchInterval: const Duration(hours: 1),
    ));

    // Set defaults (used before first fetch completes)
    await _remoteConfig.setDefaults({
      'feature_new_checkout': false,
      'feature_dark_mode': true,
      'max_upload_size_mb': 10,
      'maintenance_mode': false,
      'api_base_url': 'https://api.example.com',
    });

    // Fetch and activate
    await _remoteConfig.fetchAndActivate();
  }

  /// Check boolean feature flag
  bool isFeatureEnabled(String key) => _remoteConfig.getBool(key);

  /// Get config value
  String getString(String key) => _remoteConfig.getString(key);
  int getInt(String key) => _remoteConfig.getInt(key);

  /// Listen for real-time config updates
  Stream<RemoteConfigUpdate> get onConfigUpdated =>
      _remoteConfig.onConfigUpdated;
}

// Usage
// if (featureFlags.isFeatureEnabled('feature_new_checkout')) {
//   return NewCheckoutPage();
// } else {
//   return OldCheckoutPage();
// }
```

### Pattern 100.5: Firebase Auth

```dart
/// Optional Firebase Authentication integration
class FirebaseAuthService {
  // Note: Firebase Auth is optional — many apps use custom JWT auth instead
  // This pattern shows basic integration for apps that DO use Firebase Auth

  /// Email/password sign in
  Future<UserCredential> signInWithEmail({
    required String email,
    required String password,
  }) async {
    return FirebaseAuth.instance.signInWithEmailAndPassword(
      email: email,
      password: password,
    );
  }

  /// Google sign in
  Future<UserCredential> signInWithGoogle() async {
    final googleUser = await GoogleSignIn().signIn();
    final googleAuth = await googleUser?.authentication;

    final credential = GoogleAuthProvider.credential(
      accessToken: googleAuth?.accessToken,
      idToken: googleAuth?.idToken,
    );

    return FirebaseAuth.instance.signInWithCredential(credential);
  }

  /// Auth state stream
  Stream<User?> get authStateChanges =>
      FirebaseAuth.instance.authStateChanges();

  /// Sign out
  Future<void> signOut() => FirebaseAuth.instance.signOut();
}
```

---

## MUST DO

- Configure Firebase per flavor (dev/staging/prod — separate projects)
- Forward FlutterError AND PlatformDispatcher errors to Crashlytics
- Use AnalyticsRouteObserver for automatic screen tracking
- Set Remote Config defaults for offline-first behavior
- Set user identifier in Crashlytics for crash-to-user correlation

## MUST NOT DO

- Use single Firebase project for all environments (data pollution)
- Log PII (email, phone, SSN) in analytics events
- Enable Crashlytics collection in debug builds (noisy data)
- Fetch Remote Config on every app launch (rate limiting — set minimum interval)
- Hardcode feature flags in code (use Remote Config for runtime control)

---

## References

- [firebase_core](https://pub.dev/packages/firebase_core)
- [firebase_analytics](https://pub.dev/packages/firebase_analytics)
- [firebase_crashlytics](https://pub.dev/packages/firebase_crashlytics)
- [firebase_remote_config](https://pub.dev/packages/firebase_remote_config)
