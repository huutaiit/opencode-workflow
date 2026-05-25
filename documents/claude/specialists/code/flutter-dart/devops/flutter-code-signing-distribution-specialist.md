# Flutter Code Signing + Distribution Specialist
# Flutter コード署名＋配布スペシャリスト
# Chuyen Gia Ky Ma Va Phan Phoi Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (infrastructure — signing and release) |
| **Directory Pattern** | `android/app/`, `ios/Runner/`, `fastlane/` |
| **Variant** | ALL |
| **Naming Convention** | `key.properties`, `ExportOptions.plist`. No Dart classes |
| **Imports From** | N/A (config files) |
| **Cannot Import** | N/A (not Dart code) |
| **Pattern Numbers** | 107.1–107.4 |
| **Source Paths** | `android/app/build.gradle`, `ios/Runner/*.xcodeproj`, `fastlane/Matchfile` |
| **File Count** | 2-4 signing config files |
| **Imported By** | N/A (terminal — build system only) |
| **Dependencies** | Fastlane match (iOS team signing) |
| **When To Use** | Android keystore setup, iOS provisioning profiles, CI secret management, OTA updates |
| **Source Skeleton** | `android/key.properties`, `fastlane/Matchfile` |
| **Specialist Type** | code |
| **Purpose** | Generate code signing configuration for Android (keystore) and iOS (provisioning), CI/CD secret management, and OTA update setup (Shorebird) |
| **Activation Trigger** | files: android/key.properties, fastlane/Matchfile; keywords: codeSigning, keystore, provisioningProfile, fastlaneMatch, shorebird, otaUpdate |

---

## Patterns

### Pattern 107.1: Android Signing

```properties
# android/key.properties (NEVER commit to git — add to .gitignore)
storePassword=<from-ci-secrets>
keyPassword=<from-ci-secrets>
keyAlias=release
storeFile=../keystore/release.jks
```

```groovy
// android/app/build.gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
        }
    }
}
```

```bash
# Generate keystore (one time)
keytool -genkey -v -keystore release.jks -keyalg RSA -keysize 2048 \
  -validity 10000 -alias release
# Store securely — loss = cannot update app on Play Store
```

### Pattern 107.2: iOS Signing (Fastlane Match)

```ruby
# fastlane/Matchfile
git_url("https://github.com/org/ios-certificates.git")
storage_mode("git")
type("appstore") # or "development", "adhoc"
app_identifier(["com.example.myapp", "com.example.myapp.dev"])
team_id("TEAM_ID")

# Usage:
# fastlane match appstore  — download/create App Store certificates
# fastlane match development — download/create dev certificates
```

```ruby
# fastlane/Fastfile
platform :ios do
  lane :setup_signing do
    match(type: "appstore", readonly: true)
    # match auto-sets PROVISIONING_PROFILE and CODE_SIGN_IDENTITY
  end
end
```

### Pattern 107.3: CI/CD Secret Management

```yaml
# GitHub Actions secrets
# Settings → Secrets and variables → Actions
#
# Required secrets:
#   ANDROID_KEYSTORE_BASE64    — base64 encoded .jks file
#   ANDROID_KEY_PROPERTIES     — key.properties content
#   APPLE_CERTIFICATE_BASE64   — base64 encoded .p12 certificate
#   APPLE_PROVISIONING_PROFILE — base64 encoded .mobileprovision
#   MATCH_PASSWORD             — Fastlane match encryption password
#   PLAY_STORE_JSON_KEY        — Google Play service account JSON
#   APP_STORE_CONNECT_API_KEY  — App Store Connect API key

# Decode secrets in CI:
# echo "$ANDROID_KEYSTORE_BASE64" | base64 --decode > android/keystore/release.jks
# echo "$ANDROID_KEY_PROPERTIES" > android/key.properties
```

### Pattern 107.4: OTA Updates (Shorebird)

```bash
# Shorebird — push Dart code updates without app store review
# Only updates Dart code, NOT native code or assets

# Initialize Shorebird in project
shorebird init

# Create a release (first time)
shorebird release android --flavor prod
shorebird release ios --flavor prod

# Push a patch (subsequent updates)
shorebird patch android --flavor prod
shorebird patch ios --flavor prod

# Rollback a patch
shorebird patch rollback android --flavor prod
```

```dart
/// Check for Shorebird updates on app start
/// ```dart
/// import 'package:shorebird_code_push/shorebird_code_push.dart';
///
/// final updater = ShorebirdUpdater();
/// final status = await updater.checkForUpdate();
/// if (status == UpdateStatus.outdated) {
///   await updater.update(); // Download and apply patch
///   // Restart app to use new code
/// }
/// ```
```

---

## MUST DO

- Add `key.properties` and `*.jks` to `.gitignore`
- Use Fastlane match for team iOS signing (shared certificates)
- Store all signing secrets in CI secret manager (never in code)
- Back up Android keystore securely (loss = can't update app)
- Use Shorebird for urgent Dart-only fixes (bypasses store review)

## MUST NOT DO

- Commit signing keys, keystores, or certificates to git
- Share signing credentials via email or chat
- Use debug signing for production builds
- Lose the Android upload keystore (Play Store requires same key forever)
- Use OTA updates for native code changes (only Dart code)

---

## References

- [Android App Signing](https://developer.android.com/studio/publish/app-signing)
- [Fastlane Match](https://docs.fastlane.tools/actions/match/)
- [Shorebird](https://shorebird.dev/)
