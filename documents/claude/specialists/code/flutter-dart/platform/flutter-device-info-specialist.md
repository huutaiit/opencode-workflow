# Flutter Device Info Specialist
# Flutter デバイス情報スペシャリスト
# Chuyen Gia Thong Tin Thiet Bi Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Core |
| **Directory Pattern** | `lib/core/services/`, `lib/core/platform/` |
| **Variant** | ALL |
| **Naming Convention** | `device_info_service.dart`, `device_posture_service.dart`. Classes: `DeviceInfoService`, `DevicePostureService` |
| **Imports From** | Core (security for root check, connectivity) |
| **Cannot Import** | Domain, Presentation, Features |
| **Pattern Numbers** | 104.6–104.10 |
| **Source Paths** | `lib/core/services/device_info*.dart`, `lib/core/platform/device*.dart` |
| **File Count** | 2-3 device info files |
| **Imported By** | Core (analytics, crash reporting use device info), Data (API headers include device info) |
| **Dependencies** | device_info_plus ^10.1.0, package_info_plus ^8.0.0, connectivity_plus ^6.0.0 |
| **When To Use** | Device identification, app version display, network status checking, responsive device adaptation |
| **Source Skeleton** | `lib/core/services/device_info_service.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate device information service with platform details, app version, unique device ID, network connectivity status, and screen/posture adaptation |
| **Activation Trigger** | files: lib/core/services/device_info*.dart; keywords: deviceInfo, packageInfo, appVersion, deviceId, connectivity, screenSize |

---

## Patterns

### Pattern 104.6: Device Info Collection

```dart
import 'package:device_info_plus/device_info_plus.dart';

class DeviceInfoService {
  final DeviceInfoPlugin _plugin;

  DeviceInfoService([DeviceInfoPlugin? plugin])
      : _plugin = plugin ?? DeviceInfoPlugin();

  Future<DeviceData> getDeviceData() async {
    if (Platform.isAndroid) {
      final info = await _plugin.androidInfo;
      return DeviceData(
        platform: 'Android',
        model: info.model,
        manufacturer: info.manufacturer,
        osVersion: 'Android ${info.version.release} (SDK ${info.version.sdkInt})',
        isPhysicalDevice: info.isPhysicalDevice,
        deviceId: info.id,
      );
    } else if (Platform.isIOS) {
      final info = await _plugin.iosInfo;
      return DeviceData(
        platform: 'iOS',
        model: info.utsname.machine,
        manufacturer: 'Apple',
        osVersion: 'iOS ${info.systemVersion}',
        isPhysicalDevice: info.isPhysicalDevice,
        deviceId: info.identifierForVendor ?? '',
      );
    }
    throw UnsupportedError('Platform not supported');
  }
}

class DeviceData {
  final String platform;
  final String model;
  final String manufacturer;
  final String osVersion;
  final bool isPhysicalDevice;
  final String deviceId;

  DeviceData({
    required this.platform, required this.model, required this.manufacturer,
    required this.osVersion, required this.isPhysicalDevice, required this.deviceId,
  });

  /// For API request headers
  String get userAgent => '$platform/$osVersion ($manufacturer $model)';
}
```

### Pattern 104.7: App Version Info

```dart
import 'package:package_info_plus/package_info_plus.dart';

class AppInfoService {
  static Future<AppInfo> get() async {
    final info = await PackageInfo.fromPlatform();
    return AppInfo(
      appName: info.appName,
      packageName: info.packageName,
      version: info.version,
      buildNumber: info.buildNumber,
    );
  }
}

class AppInfo {
  final String appName;
  final String packageName;
  final String version;
  final String buildNumber;

  AppInfo({required this.appName, required this.packageName, required this.version, required this.buildNumber});

  String get displayVersion => 'v$version ($buildNumber)';

  /// For API headers
  String get versionHeader => '$version+$buildNumber';
}
```

### Pattern 104.8: Connectivity Monitor

```dart
import 'package:connectivity_plus/connectivity_plus.dart';

class ConnectivityService {
  final Connectivity _connectivity;

  ConnectivityService([Connectivity? connectivity])
      : _connectivity = connectivity ?? Connectivity();

  Future<bool> get isConnected async {
    final results = await _connectivity.checkConnectivity();
    return results.any((r) => r != ConnectivityResult.none);
  }

  Future<ConnectionType> get connectionType async {
    final results = await _connectivity.checkConnectivity();
    if (results.contains(ConnectivityResult.wifi)) return ConnectionType.wifi;
    if (results.contains(ConnectivityResult.mobile)) return ConnectionType.mobile;
    if (results.contains(ConnectivityResult.ethernet)) return ConnectionType.ethernet;
    return ConnectionType.none;
  }

  Stream<bool> get onConnectivityChanged {
    return _connectivity.onConnectivityChanged.map(
      (results) => results.any((r) => r != ConnectivityResult.none),
    );
  }
}

enum ConnectionType { wifi, mobile, ethernet, none }
```

### Pattern 104.9: Responsive Device Adaptation

```dart
class DeviceType {
  static bool isPhone(BuildContext context) =>
      MediaQuery.of(context).size.shortestSide < 600;

  static bool isTablet(BuildContext context) =>
      MediaQuery.of(context).size.shortestSide >= 600;

  static bool isDesktop(BuildContext context) =>
      MediaQuery.of(context).size.shortestSide >= 900;
}
```

### Pattern 104.10: API Headers Builder

```dart
class ApiHeadersBuilder {
  static Future<Map<String, String>> build() async {
    final device = await DeviceInfoService().getDeviceData();
    final app = await AppInfoService.get();

    return {
      'X-Device-Platform': device.platform,
      'X-Device-Model': device.model,
      'X-Device-OS': device.osVersion,
      'X-App-Version': app.versionHeader,
      'X-Device-ID': device.deviceId,
    };
  }
}
```

---

## MUST DO

- Include device info in API headers (debugging, analytics)
- Monitor connectivity changes for offline-first behavior
- Use `identifierForVendor` on iOS (not UDID — privacy)
- Show app version in settings/about screen
- Check `isPhysicalDevice` for emulator detection

## MUST NOT DO

- Use device ID as permanent user identifier (resets on uninstall/iOS)
- Assume WiFi means internet available (captive portals)
- Hardcode device breakpoints (use MediaQuery shortestSide)
- Log device ID in analytics without consent
- Skip platform check before accessing platform-specific info

---

## References

- [device_info_plus](https://pub.dev/packages/device_info_plus)
- [package_info_plus](https://pub.dev/packages/package_info_plus)
- [connectivity_plus](https://pub.dev/packages/connectivity_plus)
