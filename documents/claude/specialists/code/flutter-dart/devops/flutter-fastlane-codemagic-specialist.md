# Flutter Fastlane + Codemagic CI/CD Specialist
# Flutter Fastlane＋Codemagic CI/CDスペシャリスト
# Chuyen Gia Fastlane Va Codemagic Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (infrastructure — CI/CD pipeline) |
| **Directory Pattern** | `fastlane/`, `.github/workflows/`, `codemagic.yaml` |
| **Variant** | ALL |
| **Naming Convention** | `Fastfile`, `codemagic.yaml`, `flutter-ci.yml`. No Dart classes |
| **Imports From** | N/A (CI/CD config files, not Dart code) |
| **Cannot Import** | N/A (not Dart code) |
| **Pattern Numbers** | 106.1–106.5 |
| **Source Paths** | `fastlane/*`, `.github/workflows/*.yml`, `codemagic.yaml` |
| **File Count** | 2-4 CI/CD config files |
| **Imported By** | N/A (terminal — CI/CD runner only) |
| **Dependencies** | fastlane (Ruby gem), codemagic CLI |
| **When To Use** | Automating build, test, deploy pipeline — Play Store, App Store, Firebase App Distribution |
| **Source Skeleton** | `fastlane/Fastfile`, `.github/workflows/flutter-ci.yml` |
| **Specialist Type** | code |
| **Purpose** | Generate CI/CD pipeline configuration with Fastlane, Codemagic, GitHub Actions for automated build→test→deploy workflow |
| **Activation Trigger** | files: fastlane/*, .github/workflows/*.yml, codemagic.yaml; keywords: fastlane, codemagic, githubActions, cicd, appDistribution, playStore, appStore |

---

## Patterns

### Pattern 106.1: Fastlane Setup

```ruby
# fastlane/Fastfile
default_platform(:android)

platform :android do
  desc "Deploy to Firebase App Distribution"
  lane :distribute do
    sh("flutter build apk --flavor staging --dart-define-from-file=env.staging.json")
    firebase_app_distribution(
      app: ENV["FIREBASE_APP_ID_ANDROID"],
      groups: "qa-testers",
      apk_path: "../build/app/outputs/flutter-apk/app-staging-release.apk",
      release_notes: changelog_from_git_commits
    )
  end

  desc "Deploy to Play Store (internal track)"
  lane :deploy do
    sh("flutter build appbundle --flavor prod --dart-define-from-file=env.prod.json")
    upload_to_play_store(
      track: "internal",
      aab: "../build/app/outputs/bundle/prodRelease/app-prod-release.aab",
      json_key: ENV["PLAY_STORE_JSON_KEY"]
    )
  end
end

platform :ios do
  desc "Deploy to TestFlight"
  lane :beta do
    sh("flutter build ipa --flavor staging --dart-define-from-file=env.staging.json --export-options-plist=ios/ExportOptions.plist")
    upload_to_testflight(
      ipa: "../build/ios/ipa/MyApp.ipa",
      skip_waiting_for_build_processing: true
    )
  end
end
```

### Pattern 106.2: Codemagic YAML

```yaml
# codemagic.yaml
workflows:
  flutter-staging:
    name: Flutter Staging
    max_build_duration: 30
    environment:
      flutter: stable
      vars:
        FLAVOR: staging
    triggering:
      events: [push]
      branch_patterns:
        - pattern: 'develop'
    scripts:
      - name: Get dependencies
        script: flutter pub get
      - name: Analyze
        script: flutter analyze --fatal-infos
      - name: Test
        script: flutter test --coverage
      - name: Build APK
        script: flutter build apk --flavor staging --dart-define-from-file=env.staging.json
      - name: Build IPA
        script: flutter build ipa --flavor staging --dart-define-from-file=env.staging.json
    artifacts:
      - build/**/outputs/**/*.apk
      - build/ios/ipa/*.ipa
    publishing:
      firebase:
        firebase_service_account: $FIREBASE_SERVICE_ACCOUNT
        android:
          app_id: $FIREBASE_APP_ID_ANDROID
          groups: [qa-testers]
```

### Pattern 106.3: GitHub Actions

```yaml
# .github/workflows/flutter-ci.yml
name: Flutter CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  analyze-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with: { flutter-version: '3.x', channel: 'stable' }
      - run: flutter pub get
      - run: flutter analyze --fatal-infos
      - run: flutter test --coverage
      - uses: codecov/codecov-action@v4
        with: { files: coverage/lcov.info }

  build-android:
    needs: analyze-and-test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with: { flutter-version: '3.x' }
      - run: flutter build apk --flavor prod --dart-define-from-file=env.prod.json
      - uses: actions/upload-artifact@v4
        with: { name: apk, path: build/app/outputs/flutter-apk/*.apk }

  build-ios:
    needs: analyze-and-test
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with: { flutter-version: '3.x' }
      - run: flutter build ipa --flavor prod --dart-define-from-file=env.prod.json --no-codesign
```

### Pattern 106.4: Firebase App Distribution

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Deploy APK to testers
firebase appdistribution:distribute build/app/outputs/flutter-apk/app-staging-release.apk \
  --app $FIREBASE_APP_ID \
  --groups "qa-testers" \
  --release-notes "Build from $(git rev-parse --short HEAD)"
```

### Pattern 106.5: Play Store + App Store Deploy

```ruby
# Production release checklist:
# 1. Bump version in pubspec.yaml
# 2. Update CHANGELOG.md
# 3. Build with prod flavor
# 4. Upload to Play Store (internal → beta → production)
# 5. Upload to App Store Connect (TestFlight → App Review → Release)
```

---

## MUST DO

- Run `flutter analyze` before test/build in CI (catch lint errors early)
- Use `--dart-define-from-file` for environment-specific builds
- Cache Flutter SDK and pub dependencies in CI (faster builds)
- Upload coverage reports (codecov, lcov)
- Use internal/beta tracks before production release

## MUST NOT DO

- Store signing keys or credentials in source code
- Skip analyze step in CI (catches type errors, unused imports)
- Build without flavor specification (wrong config in binary)
- Deploy to production from local machine (always use CI)
- Use `flutter build` without `--release` for store uploads

---

## References

- [Fastlane for Flutter](https://docs.flutter.dev/deployment/cd)
- [Codemagic](https://docs.codemagic.io/yaml/building-a-flutter-app/)
- [GitHub Actions for Flutter](https://github.com/subosito/flutter-action)
