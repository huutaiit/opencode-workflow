# Flutter Flavors + Environments Specialist
# Flutter フレーバー＋環境設定スペシャリスト
# Chuyen Gia Flavor Va Moi Truong Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (infrastructure — build/deploy configuration) |
| **Directory Pattern** | `lib/core/config/`, `android/app/`, `ios/Runner/` |
| **Variant** | ALL |
| **Naming Convention** | `app_config.dart`, `env.{flavor}.json`. Class: `AppConfig` |
| **Imports From** | Core (config consumed by network, DI) |
| **Cannot Import** | Domain, Presentation, Features |
| **Pattern Numbers** | 105.1–105.5 |
| **Source Paths** | `lib/core/config/*.dart`, `android/app/build.gradle`, `ios/Runner/*.xcconfig` |
| **File Count** | 1 config class + 3 env files (dev/staging/prod) + platform configs |
| **Imported By** | Core (Dio baseUrl, Firebase config, DI environment) |
| **Dependencies** | None (--dart-define built-in) |
| **When To Use** | Multi-environment setup — dev/staging/prod with different API URLs, Firebase configs |
| **Source Skeleton** | `lib/core/config/app_config.dart`, `env.dev.json`, `env.staging.json`, `env.prod.json` |
| **Specialist Type** | code |
| **Purpose** | Generate flavor/environment configuration with --dart-define, Android productFlavors, iOS xcconfig schemes, per-flavor Firebase config |
| **Activation Trigger** | files: lib/core/config/*.dart, env.*.json; keywords: flavor, environment, dartDefine, productFlavor, xcconfig, buildConfig |

---

## Patterns

### Pattern 105.1: Dart Defines

```dart
/// Read --dart-define values at runtime
class AppConfig {
  static const String flavor = String.fromEnvironment('FLAVOR', defaultValue: 'dev');
  static const String apiBaseUrl = String.fromEnvironment('API_BASE_URL', defaultValue: 'https://api-dev.example.com');
  static const bool enableLogging = bool.fromEnvironment('ENABLE_LOGGING', defaultValue: true);

  static bool get isDev => flavor == 'dev';
  static bool get isStaging => flavor == 'staging';
  static bool get isProd => flavor == 'prod';
}

// Build:
// flutter run --dart-define=FLAVOR=dev --dart-define=API_BASE_URL=https://api-dev.example.com
// flutter build apk --dart-define=FLAVOR=prod --dart-define=API_BASE_URL=https://api.example.com

// With --dart-define-from-file (Flutter 3.7+):
// flutter run --dart-define-from-file=env.dev.json
```

### Pattern 105.2: Flutter Flavors (Android productFlavors + iOS Schemes)

```groovy
// android/app/build.gradle
android {
    flavorDimensions "environment"
    productFlavors {
        dev {
            dimension "environment"
            applicationIdSuffix ".dev"
            versionNameSuffix "-dev"
            resValue "string", "app_name", "MyApp Dev"
        }
        staging {
            dimension "environment"
            applicationIdSuffix ".staging"
            versionNameSuffix "-staging"
            resValue "string", "app_name", "MyApp Staging"
        }
        prod {
            dimension "environment"
            resValue "string", "app_name", "MyApp"
        }
    }
}
```

```
// ios/Runner/Dev.xcconfig
#include "Generated.xcconfig"
FLUTTER_TARGET=lib/main_dev.dart
PRODUCT_BUNDLE_IDENTIFIER=com.example.myapp.dev
DISPLAY_NAME=MyApp Dev

// ios/Runner/Prod.xcconfig
#include "Generated.xcconfig"
FLUTTER_TARGET=lib/main.dart
PRODUCT_BUNDLE_IDENTIFIER=com.example.myapp
DISPLAY_NAME=MyApp
```

```bash
# Build with flavor:
flutter run --flavor dev -t lib/main_dev.dart
flutter build apk --flavor prod -t lib/main.dart
```

### Pattern 105.3: Environment Config Class

```dart
/// Centralized config loaded per flavor
enum Environment { dev, staging, prod }

class EnvironmentConfig {
  final Environment environment;
  final String apiBaseUrl;
  final String wsBaseUrl;
  final bool enableLogging;
  final bool enableCrashlytics;

  const EnvironmentConfig._({
    required this.environment,
    required this.apiBaseUrl,
    required this.wsBaseUrl,
    required this.enableLogging,
    required this.enableCrashlytics,
  });

  static const dev = EnvironmentConfig._(
    environment: Environment.dev,
    apiBaseUrl: 'https://api-dev.example.com',
    wsBaseUrl: 'wss://ws-dev.example.com',
    enableLogging: true,
    enableCrashlytics: false,
  );

  static const staging = EnvironmentConfig._(
    environment: Environment.staging,
    apiBaseUrl: 'https://api-staging.example.com',
    wsBaseUrl: 'wss://ws-staging.example.com',
    enableLogging: true,
    enableCrashlytics: true,
  );

  static const prod = EnvironmentConfig._(
    environment: Environment.prod,
    apiBaseUrl: 'https://api.example.com',
    wsBaseUrl: 'wss://ws.example.com',
    enableLogging: false,
    enableCrashlytics: true,
  );

  static EnvironmentConfig fromFlavor(String flavor) {
    switch (flavor) {
      case 'staging': return staging;
      case 'prod': return prod;
      default: return dev;
    }
  }
}
```

### Pattern 105.4: Firebase Per Flavor

```dart
/// Load different google-services.json / GoogleService-Info.plist per flavor
///
/// Directory structure:
/// android/app/src/dev/google-services.json
/// android/app/src/staging/google-services.json
/// android/app/src/prod/google-services.json
///
/// ios/config/dev/GoogleService-Info.plist
/// ios/config/staging/GoogleService-Info.plist
/// ios/config/prod/GoogleService-Info.plist
///
/// Android: Gradle automatically picks from src/{flavor}/
/// iOS: Add Run Script build phase to copy correct plist
```

### Pattern 105.5: Flavor-Aware App Icon + Splash

```dart
/// Different app icons per flavor (distinguishable on device)
///
/// Use flutter_launcher_icons with flavor support:
/// ```yaml
/// # flutter_launcher_icons-dev.yaml
/// flutter_launcher_icons:
///   android: true
///   ios: true
///   image_path: "assets/icons/icon_dev.png"
///   # Dev icon has debug banner overlay
///
/// # flutter_launcher_icons-prod.yaml
/// flutter_launcher_icons:
///   android: true
///   ios: true
///   image_path: "assets/icons/icon_prod.png"
/// ```
///
/// Generate: flutter pub run flutter_launcher_icons -f flutter_launcher_icons-dev.yaml

/// Visual flavor indicator in app (debug/staging only)
class FlavorBanner extends StatelessWidget {
  final Widget child;

  const FlavorBanner({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    if (AppConfig.isProd) return child;

    return Banner(
      message: AppConfig.flavor.toUpperCase(),
      location: BannerLocation.topStart,
      color: AppConfig.isDev ? Colors.green : Colors.orange,
      child: child,
    );
  }
}
```

---

## MUST DO

- Use `--dart-define-from-file` for clean environment variable management
- Set different applicationId per flavor (allows installing dev+prod simultaneously)
- Use separate Firebase projects per flavor (dev/staging/prod)
- Add visual flavor indicator (Banner) for non-prod builds
- Store env files outside source control (add to .gitignore)

## MUST NOT DO

- Hardcode API URLs or secrets in source code (use --dart-define)
- Share Firebase project across flavors (data pollution)
- Ship dev/staging config in production builds
- Use same applicationId for dev and prod (can't install both)
- Commit google-services.json with prod keys to public repo

---

## References

- [Flutter Flavors](https://docs.flutter.dev/deployment/flavors)
- [--dart-define](https://dart.dev/tools/dart-compile#dart-define)
