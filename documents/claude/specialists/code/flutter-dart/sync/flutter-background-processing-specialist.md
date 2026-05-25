# Flutter Background Processing Specialist
# Flutter バックグラウンド処理スペシャリスト
# Chuyen Gia Xu Ly Nen Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Data |
| **Directory Pattern** | `lib/core/sync/`, `lib/core/services/` |
| **Variant** | ALL |
| **Naming Convention** | `background_sync_service.dart`, `isolate_worker.dart`. Classes: `BackgroundSyncService`, `IsolateWorker` |
| **Imports From** | Data (sync engine for background sync), Core (battery, connectivity) |
| **Cannot Import** | Presentation (background processing has no UI access) |
| **Pattern Numbers** | 84.1–84.5 |
| **Source Paths** | `lib/core/sync/*background*.dart`, `lib/core/services/*isolate*.dart` |
| **File Count** | 2-3 background processing files |
| **Imported By** | Core (app lifecycle registers background tasks) |
| **Dependencies** | workmanager ^0.5.0, battery_plus ^6.0.0 |
| **When To Use** | Background data sync, heavy computation off main thread, silent push-triggered sync |
| **Source Skeleton** | `lib/core/sync/background_sync_service.dart`, `lib/core/services/isolate_worker.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate background processing with WorkManager integration, Isolates for heavy computation, background fetch, and battery-aware scheduling |
| **Activation Trigger** | files: lib/core/sync/*background*.dart, lib/core/services/*isolate*.dart; keywords: backgroundSync, workManager, isolate, backgroundFetch, silentPush, batteryAware |

---

## Platform Differences

| Feature | Android (WorkManager) | iOS (BGTaskScheduler) |
|---------|----------------------|----------------------|
| Min interval | 15 minutes | OS-determined (no guarantee) |
| Execution time | 10 minutes max | 30 seconds (BGAppRefreshTask) / 7 min (BGProcessingTask) |
| Network constraint | Yes (requiresNetworkConnectivity) | No direct constraint |
| Charging constraint | Yes (requiresCharging) | Yes (requiresExternalPower) |
| Exact timing | No (best-effort) | No (best-effort, frequency learned) |
| Reliability | High (survives reboot) | Medium (OS throttles infrequent apps) |

---

## Patterns

### Pattern 84.1: WorkManager Integration

```dart
import 'package:workmanager/workmanager.dart';

/// Background task registration and configuration
class BackgroundSyncService {
  static const _syncTaskName = 'com.app.backgroundSync';
  static const _uploadTaskName = 'com.app.backgroundUpload';

  /// Initialize WorkManager (call in main.dart, outside runApp)
  static Future<void> initialize() async {
    await Workmanager().initialize(
      _callbackDispatcher,
      isInDebugMode: kDebugMode,
    );
  }

  /// Register periodic background sync
  static Future<void> registerPeriodicSync({
    Duration frequency = const Duration(hours: 1),
    bool requiresNetwork = true,
    bool requiresCharging = false,
  }) async {
    await Workmanager().registerPeriodicTask(
      _syncTaskName,
      _syncTaskName,
      frequency: frequency,
      constraints: Constraints(
        networkType: requiresNetwork
            ? NetworkType.connected
            : NetworkType.not_required,
        requiresBatteryNotLow: true,
        requiresCharging: requiresCharging,
      ),
      existingWorkPolicy: ExistingWorkPolicy.keep,
      backoffPolicy: BackoffPolicy.exponential,
      initialDelay: const Duration(minutes: 5),
    );
  }

  /// Register one-time background task (e.g., large file upload)
  static Future<void> scheduleOneTimeTask({
    required String taskId,
    required String taskName,
    Map<String, dynamic>? inputData,
    Duration delay = Duration.zero,
  }) async {
    await Workmanager().registerOneOffTask(
      taskId,
      taskName,
      inputData: inputData,
      initialDelay: delay,
      constraints: Constraints(
        networkType: NetworkType.connected,
        requiresBatteryNotLow: true,
      ),
    );
  }

  /// Cancel all background tasks
  static Future<void> cancelAll() async {
    await Workmanager().cancelAll();
  }
}

/// Top-level callback — MUST be a top-level function (not a method)
@pragma('vm:entry-point')
void _callbackDispatcher() {
  Workmanager().executeTask((taskName, inputData) async {
    try {
      switch (taskName) {
        case BackgroundSyncService._syncTaskName:
          // Initialize DI, DB, network in headless context
          // No Flutter widgets available here
          final db = await _initDatabase();
          final dio = _initDio();
          final queue = MutationQueueRepository(db);
          final engine = SyncEngine(queue: queue, dio: dio);
          final result = await engine.syncPending();
          return result.failed == 0;

        case BackgroundSyncService._uploadTaskName:
          final filePath = inputData?['filePath'] as String?;
          if (filePath == null) return false;
          // Upload file in background
          return true;

        default:
          return false;
      }
    } catch (e) {
      debugPrint('Background task failed: $e');
      return false; // Will be retried per backoff policy
    }
  });
}

// Headless initialization helpers (no Flutter context)
Future<AppDatabase> _initDatabase() async {
  // Initialize Drift DB without Flutter widgets
  return AppDatabase();
}

Dio _initDio() {
  return Dio(BaseOptions(baseUrl: 'https://api.example.com'));
}
```

### Pattern 84.2: Isolates for Heavy Computation

```dart
import 'dart:isolate';

/// Run heavy computation off the main thread using Isolates
class IsolateWorker {
  /// Simple compute — for pure functions (no state)
  static Future<R> compute<T, R>(R Function(T) callback, T input) async {
    return await Isolate.run(() => callback(input));
  }

  /// Parse large JSON response off main thread
  static Future<List<T>> parseJsonList<T>(
    String rawJson,
    T Function(Map<String, dynamic>) fromJson,
  ) async {
    return Isolate.run(() {
      final List<dynamic> decoded = jsonDecode(rawJson);
      return decoded
          .cast<Map<String, dynamic>>()
          .map(fromJson)
          .toList();
    });
  }

  /// Image processing off main thread
  static Future<Uint8List> processImage(
    Uint8List imageBytes,
    ImageProcessingConfig config,
  ) async {
    return Isolate.run(() {
      // Heavy image manipulation (resize, compress, filter)
      // Can use dart:ui's decodeImageFromList in isolate
      return imageBytes; // Placeholder — actual processing here
    });
  }

  /// Long-running worker with bidirectional communication
  static Future<IsolateChannel> spawnWorker() async {
    final receivePort = ReceivePort();
    final isolate = await Isolate.spawn(
      _workerEntryPoint,
      receivePort.sendPort,
    );

    final sendPort = await receivePort.first as SendPort;
    return IsolateChannel(isolate, sendPort, receivePort);
  }

  static void _workerEntryPoint(SendPort mainSendPort) {
    final receivePort = ReceivePort();
    mainSendPort.send(receivePort.sendPort);

    receivePort.listen((message) {
      if (message is WorkerTask) {
        // Process task
        final result = _processTask(message);
        mainSendPort.send(result);
      }
    });
  }

  static dynamic _processTask(WorkerTask task) {
    // Heavy processing based on task type
    return null;
  }
}

class IsolateChannel {
  final Isolate isolate;
  final SendPort sendPort;
  final ReceivePort receivePort;

  IsolateChannel(this.isolate, this.sendPort, this.receivePort);

  void send(dynamic message) => sendPort.send(message);

  void dispose() {
    receivePort.close();
    isolate.kill();
  }
}

class WorkerTask {
  final String type;
  final dynamic data;

  WorkerTask(this.type, this.data);
}

class ImageProcessingConfig {
  final int maxWidth;
  final int maxHeight;
  final int quality;

  ImageProcessingConfig({
    this.maxWidth = 1024,
    this.maxHeight = 1024,
    this.quality = 85,
  });
}
```

### Pattern 84.3: Background Fetch

```dart
/// iOS BGAppRefreshTask equivalent via workmanager
/// Note: iOS has strict limits — 30 seconds for refresh, 7 minutes for processing
class BackgroundFetchService {
  static const _fetchTaskName = 'com.app.backgroundFetch';

  /// Register background fetch (iOS-optimized)
  static Future<void> register() async {
    await Workmanager().registerPeriodicTask(
      _fetchTaskName,
      _fetchTaskName,
      // iOS: minimum 15 min, actual interval determined by OS
      // based on app usage patterns
      frequency: const Duration(minutes: 15),
      constraints: Constraints(
        networkType: NetworkType.connected,
      ),
    );
  }

  /// iOS Info.plist requirements:
  /// ```xml
  /// <key>UIBackgroundModes</key>
  /// <array>
  ///   <string>fetch</string>
  ///   <string>processing</string>
  /// </array>
  ///
  /// <!-- For BGTaskScheduler (iOS 13+) -->
  /// <key>BGTaskSchedulerPermittedIdentifiers</key>
  /// <array>
  ///   <string>com.app.backgroundFetch</string>
  ///   <string>com.app.backgroundSync</string>
  /// </array>
  /// ```

  /// Android AndroidManifest.xml:
  /// ```xml
  /// <!-- WorkManager already handles permissions -->
  /// <!-- Optional: RECEIVE_BOOT_COMPLETED for surviving reboots -->
  /// <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>
  /// ```
}

/// Headless Dart execution for background tasks
/// The callback runs WITHOUT Flutter engine — no widgets, no BuildContext
///
/// Available in background:
/// ✅ Dart core libraries (dart:io, dart:convert, dart:async)
/// ✅ Pure Dart packages (dio, drift, shared_preferences)
/// ✅ Platform channels (limited)
/// ❌ Flutter widgets (no MaterialApp, no BuildContext)
/// ❌ Flutter plugins that require Activity/ViewController
/// ❌ dart:ui image decoding (requires Flutter engine)
```

### Pattern 84.4: Silent Push + Sync

```dart
/// FCM data message triggers background sync without user notification
class SilentPushSyncService {
  /// Handle FCM data message in background
  /// Register this as FCM background message handler
  @pragma('vm:entry-point')
  static Future<void> handleBackgroundMessage(RemoteMessage message) async {
    // This runs in a separate isolate — no access to app state
    final data = message.data;
    final syncType = data['sync_type'];

    switch (syncType) {
      case 'full_sync':
        // Trigger full sync
        final db = await _initDatabase();
        final dio = _initDio();
        final queue = MutationQueueRepository(db);
        final engine = SyncEngine(queue: queue, dio: dio);
        await engine.syncPending();

      case 'invalidate_cache':
        // Clear specific cache
        final cacheKey = data['cache_key'];
        if (cacheKey != null) {
          final prefs = await SharedPreferences.getInstance();
          await prefs.remove(cacheKey);
        }

      case 'force_logout':
        // Security: remote session invalidation
        final storage = SecureStorageService();
        await storage.deleteAll();
    }
  }

  /// FCM setup for silent push
  /// ```dart
  /// // In main.dart
  /// FirebaseMessaging.onBackgroundMessage(
  ///   SilentPushSyncService.handleBackgroundMessage,
  /// );
  /// ```
  ///
  /// Server sends data-only message (no notification):
  /// ```json
  /// {
  ///   "to": "device_token",
  ///   "data": {
  ///     "sync_type": "full_sync"
  ///   }
  /// }
  /// ```
}
```

### Pattern 84.5: Battery-Aware Scheduling

```dart
import 'package:battery_plus/battery_plus.dart';

/// Defer heavy operations based on battery level and charging state
class BatteryAwareScheduler {
  final Battery _battery;

  BatteryAwareScheduler([Battery? battery]) : _battery = battery ?? Battery();

  /// Check if heavy sync is allowed based on battery
  Future<bool> canPerformHeavySync() async {
    final level = await _battery.batteryLevel;
    final state = await _battery.batteryState;

    // Always allow if charging
    if (state == BatteryState.charging || state == BatteryState.full) {
      return true;
    }

    // Defer if battery low (< 20%)
    return level >= 20;
  }

  /// Get recommended sync strategy based on battery
  Future<SyncStrategy> recommendStrategy() async {
    final level = await _battery.batteryLevel;
    final state = await _battery.batteryState;

    if (state == BatteryState.charging || state == BatteryState.full) {
      return SyncStrategy.full; // Sync everything
    }

    if (level >= 50) {
      return SyncStrategy.normal; // Standard batch sync
    }

    if (level >= 20) {
      return SyncStrategy.minimal; // Critical items only
    }

    return SyncStrategy.defer; // Too low — defer until charging
  }

  /// Schedule sync respecting battery constraints
  Future<void> scheduleSmartSync({
    required SyncEngine engine,
    required MutationQueueRepository queue,
  }) async {
    final strategy = await recommendStrategy();

    switch (strategy) {
      case SyncStrategy.full:
        await engine.syncPending();

      case SyncStrategy.normal:
        await engine.syncPending(); // Standard batch

      case SyncStrategy.minimal:
        // Only sync critical priority items
        final critical = await queue.getPending(limit: 10);
        final filtered = critical.where((m) => m.priority >= 75).toList();
        // Sync only filtered high-priority items
        for (final mutation in filtered) {
          // Process individually
        }

      case SyncStrategy.defer:
        // Schedule for when device starts charging
        _battery.onBatteryStateChanged.firstWhere(
          (state) => state == BatteryState.charging,
        ).then((_) => engine.syncPending());
    }
  }
}

enum SyncStrategy { full, normal, minimal, defer }
```

---

## MUST DO

- Use top-level function for WorkManager callback (not a class method)
- Initialize DB and network independently in background tasks (no Flutter context)
- Respect iOS 30-second BGAppRefreshTask limit (keep operations fast)
- Add UIBackgroundModes (fetch, processing) to iOS Info.plist
- Check battery level before heavy sync operations

## MUST NOT DO

- Access Flutter widgets or BuildContext in background tasks
- Assume exact scheduling intervals (OS determines actual timing)
- Run heavy computation on main thread (use Isolates)
- Ignore iOS background execution limits (app will be killed)
- Drain battery with aggressive sync intervals (respect battery-aware scheduling)

---

## References

- [workmanager](https://pub.dev/packages/workmanager)
- [battery_plus](https://pub.dev/packages/battery_plus)
- [Dart Isolates](https://dart.dev/language/concurrency)
- [iOS Background Execution](https://developer.apple.com/documentation/backgroundtasks)
