# Flutter Permissions + Native Services Specialist
# Flutter パーミッション＋ネイティブサービススペシャリスト
# Chuyen Gia Quyen Va Dich Vu Native Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Core |
| **Directory Pattern** | `lib/core/platform/`, `lib/core/services/` |
| **Variant** | ALL |
| **Naming Convention** | `permission_service.dart`, `{name}_service.dart`. Classes: `PermissionService`, `CameraService`, `LocationService` |
| **Imports From** | Core (error types, platform channels) |
| **Cannot Import** | Domain, Presentation |
| **Pattern Numbers** | 104.1–104.5 |
| **Source Paths** | `lib/core/services/*_service.dart`, `lib/core/platform/*.dart` |
| **File Count** | 3-6 service files (permission, camera, location, bluetooth, barcode) |
| **Imported By** | Data (datasources use camera/location), Presentation (pages request permissions) |
| **Dependencies** | permission_handler ^11.3.0, image_picker ^1.0.0, geolocator ^11.0.0, flutter_blue_plus ^1.31.0, mobile_scanner ^4.0.0 |
| **When To Use** | Camera, location, Bluetooth, NFC, barcode scanning — factory/field device integration |
| **Source Skeleton** | `lib/core/services/permission_service.dart`, `lib/core/services/camera_service.dart`, `lib/core/services/location_service.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate permission request flows, camera/location/BLE/NFC service wrappers, and barcode scanner for enterprise device integration |
| **Activation Trigger** | files: lib/core/services/*.dart; keywords: permission, camera, location, bluetooth, nfc, barcodeScanner, deviceIntegration |

---

## Patterns

### Pattern 104.1: permission_handler

```dart
import 'package:permission_handler/permission_handler.dart';

class PermissionService {
  /// Request single permission with full flow
  Future<bool> request(Permission permission) async {
    final status = await permission.status;

    if (status.isGranted) return true;

    if (status.isPermanentlyDenied) {
      // User permanently denied — must go to app settings
      await openAppSettings();
      return false;
    }

    final result = await permission.request();
    return result.isGranted;
  }

  /// Request multiple permissions at once
  Future<Map<Permission, bool>> requestMultiple(List<Permission> permissions) async {
    final statuses = await permissions.request();
    return statuses.map((key, value) => MapEntry(key, value.isGranted));
  }

  /// Check if permission is granted without requesting
  Future<bool> isGranted(Permission permission) async {
    return (await permission.status).isGranted;
  }
}

// AndroidManifest.xml:
//   <uses-permission android:name="android.permission.CAMERA"/>
//   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
//   <uses-permission android:name="android.permission.BLUETOOTH_SCAN"/>
//
// iOS Info.plist:
//   <key>NSCameraUsageDescription</key>
//   <string>We need camera access for barcode scanning</string>
//   <key>NSLocationWhenInUseUsageDescription</key>
//   <string>We need location for delivery tracking</string>
```

### Pattern 104.2: Camera + Photo

```dart
import 'package:image_picker/image_picker.dart';

class CameraService {
  final ImagePicker _picker;
  final PermissionService _permissions;

  CameraService(this._permissions, [ImagePicker? picker])
      : _picker = picker ?? ImagePicker();

  /// Take photo with camera
  Future<XFile?> takePhoto({int quality = 85, double? maxWidth}) async {
    final granted = await _permissions.request(Permission.camera);
    if (!granted) return null;

    return _picker.pickImage(
      source: ImageSource.camera,
      imageQuality: quality,
      maxWidth: maxWidth ?? 1024,
    );
  }

  /// Pick from gallery
  Future<XFile?> pickFromGallery({int quality = 85}) async {
    final granted = await _permissions.request(Permission.photos);
    if (!granted) return null;

    return _picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: quality,
    );
  }

  /// Pick multiple images
  Future<List<XFile>> pickMultiple({int quality = 85, int? limit}) async {
    final granted = await _permissions.request(Permission.photos);
    if (!granted) return [];

    return _picker.pickMultiImage(
      imageQuality: quality,
      limit: limit,
    );
  }
}
```

### Pattern 104.3: Location

```dart
import 'package:geolocator/geolocator.dart';

class LocationService {
  final PermissionService _permissions;

  LocationService(this._permissions);

  /// Get current position
  Future<Position?> getCurrentPosition() async {
    final granted = await _permissions.request(Permission.locationWhenInUse);
    if (!granted) return null;

    final serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return null;

    return Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 10),
      ),
    );
  }

  /// Stream location updates (for tracking)
  Stream<Position> get positionStream {
    return Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10, // meters
      ),
    );
  }

  /// Calculate distance between two points
  double distanceBetween(
    double startLat, double startLng,
    double endLat, double endLng,
  ) {
    return Geolocator.distanceBetween(startLat, startLng, endLat, endLng);
  }
}
```

### Pattern 104.4: Bluetooth + NFC

```dart
/// Bluetooth Low Energy scanning for enterprise device pairing
class BleService {
  /// Scan for nearby BLE devices
  Stream<ScanResult> scan({Duration timeout = const Duration(seconds: 10)}) {
    return FlutterBluePlus.scanResults
        .expand((results) => results)
        .timeout(timeout);
  }

  /// Connect to device by ID
  Future<void> connect(BluetoothDevice device) async {
    await device.connect(autoConnect: false, timeout: const Duration(seconds: 10));
  }

  /// Read characteristic value
  Future<List<int>> readCharacteristic(BluetoothCharacteristic characteristic) async {
    return characteristic.read();
  }
}

/// NFC reading for asset tags and access cards
class NfcService {
  /// Read NFC tag (NDEF format)
  /// Uses nfc_manager package
  /// ```dart
  /// NfcManager.instance.startSession(onDiscovered: (NfcTag tag) async {
  ///   final ndef = Ndef.from(tag);
  ///   if (ndef != null) {
  ///     final message = await ndef.read();
  ///     final payload = message.records.first.payload;
  ///     // Parse payload
  ///   }
  ///   NfcManager.instance.stopSession();
  /// });
  /// ```
}
```

### Pattern 104.5: Barcode/QR Scanner

```dart
import 'package:mobile_scanner/mobile_scanner.dart';

/// Barcode scanner for ERP inventory management
class BarcodeScannerWidget extends StatefulWidget {
  final ValueChanged<String> onScanned;
  final List<BarcodeFormat> formats;

  const BarcodeScannerWidget({
    super.key,
    required this.onScanned,
    this.formats = const [BarcodeFormat.all],
  });

  @override
  State<BarcodeScannerWidget> createState() => _BarcodeScannerWidgetState();
}

class _BarcodeScannerWidgetState extends State<BarcodeScannerWidget> {
  final _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.normal,
    facing: CameraFacing.back,
    torchEnabled: false,
  );
  bool _scanned = false;

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        MobileScanner(
          controller: _controller,
          onDetect: (capture) {
            if (_scanned) return; // Prevent duplicate callbacks
            final barcode = capture.barcodes.firstOrNull;
            if (barcode?.rawValue != null) {
              _scanned = true;
              widget.onScanned(barcode!.rawValue!);
            }
          },
        ),
        // Scan overlay
        Center(
          child: Container(
            width: 250, height: 250,
            decoration: BoxDecoration(
              border: Border.all(color: Colors.white, width: 2),
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
        // Torch toggle
        Positioned(
          bottom: 16, right: 16,
          child: IconButton(
            icon: const Icon(Icons.flash_on, color: Colors.white),
            onPressed: () => _controller.toggleTorch(),
          ),
        ),
      ],
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}

// ERP inventory use case:
// 1. Scan barcode on product → lookup in local DB
// 2. Display product info (name, quantity, location)
// 3. Update quantity → enqueue mutation for offline sync
```

---

## MUST DO

- Handle `isPermanentlyDenied` → openAppSettings() (cannot re-request)
- Add usage description strings in iOS Info.plist for every permission
- Prevent duplicate barcode scan callbacks (use flag)
- Dispose camera/scanner controllers in dispose()
- Check `isLocationServiceEnabled` before requesting location

## MUST NOT DO

- Request permissions without explaining why (show rationale dialog first)
- Keep camera/scanner active when not visible (battery + privacy)
- Request `Permission.locationAlways` upfront (start with `whenInUse`)
- Ignore BLE connection timeouts (set reasonable timeout)
- Scan all barcode formats when only specific ones needed (slower)

---

## References

- [permission_handler](https://pub.dev/packages/permission_handler)
- [image_picker](https://pub.dev/packages/image_picker)
- [geolocator](https://pub.dev/packages/geolocator)
- [mobile_scanner](https://pub.dev/packages/mobile_scanner)
