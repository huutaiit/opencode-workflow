# Flutter Sync Engine Specialist
# Flutter 同期エンジンスペシャリスト
# Chuyen Gia Dong Bo Hoa Du Lieu Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Data |
| **Directory Pattern** | `lib/core/sync/`, `lib/features/{feature}/data/` |
| **Variant** | ALL |
| **Naming Convention** | `sync_engine.dart`, `mutation_queue.dart`. Classes: `SyncEngine`, `MutationQueue`, `SyncStatus` |
| **Imports From** | Data (Drift for queue persistence, Dio for upload), Core (connectivity, errors) |
| **Cannot Import** | Domain (entities — sync engine works with raw data), Presentation |
| **Pattern Numbers** | 82.1–82.5 |
| **Source Paths** | `lib/core/sync/*.dart` |
| **File Count** | 3-5 sync engine files |
| **Imported By** | Data (repository impls trigger sync), Core (app lifecycle manages sync) |
| **Dependencies** | connectivity_plus ^6.0.0, drift ^2.16.0 (queue persistence) |
| **When To Use** | Offline-first apps — factory/field environments with intermittent connectivity |
| **Source Skeleton** | `lib/core/sync/sync_engine.dart`, `lib/core/sync/mutation_queue.dart`, `lib/core/sync/sync_status.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate offline mutation queue with sync trigger, batch upload, priority queue, and per-record sync status tracking |
| **Activation Trigger** | files: lib/core/sync/*.dart; keywords: offlineSync, mutationQueue, syncEngine, batchUpload, syncStatus |

---

## Patterns

### Pattern 82.1: Offline Mutation Queue

```dart
import 'package:drift/drift.dart';

/// Mutation types for offline queue
enum MutationType { create, update, delete }
enum MutationStatus { pending, syncing, synced, failed }

/// Drift table for persistent mutation queue
class MutationQueue extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get entityType => text()(); // 'Order', 'Inspection', etc.
  TextColumn get entityId => text()();
  TextColumn get mutationType => text()(); // create, update, delete
  TextColumn get payload => text()(); // JSON serialized data
  IntColumn get priority => integer().withDefault(const Constant(0))();
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
  TextColumn get status => text().withDefault(const Constant('pending'))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().nullable()();
}

/// Repository for mutation queue operations
class MutationQueueRepository {
  final AppDatabase _db;

  MutationQueueRepository(this._db);

  /// Enqueue a new mutation (called by repositories on offline write)
  Future<int> enqueue({
    required String entityType,
    required String entityId,
    required MutationType type,
    required Map<String, dynamic> payload,
    int priority = 0,
  }) async {
    return _db.into(_db.mutationQueue).insert(
      MutationQueueCompanion.insert(
        entityType: entityType,
        entityId: entityId,
        mutationType: type.name,
        payload: jsonEncode(payload),
        priority: Value(priority),
      ),
    );
  }

  /// Get pending mutations ordered by priority (highest first), then creation time
  Future<List<MutationQueueData>> getPending({int limit = 50}) async {
    return (_db.select(_db.mutationQueue)
          ..where((t) => t.status.isIn(['pending', 'failed']))
          ..orderBy([
            (t) => OrderingTerm.desc(t.priority),
            (t) => OrderingTerm.asc(t.createdAt),
          ])
          ..limit(limit))
        .get();
  }

  /// Update mutation status
  Future<void> updateStatus(int id, MutationStatus status) async {
    await (_db.update(_db.mutationQueue)..where((t) => t.id.equals(id)))
        .write(MutationQueueCompanion(
      status: Value(status.name),
      updatedAt: Value(DateTime.now()),
    ));
  }

  /// Increment retry count
  Future<void> incrementRetry(int id) async {
    final mutation = await (_db.select(_db.mutationQueue)
          ..where((t) => t.id.equals(id)))
        .getSingle();
    await (_db.update(_db.mutationQueue)..where((t) => t.id.equals(id)))
        .write(MutationQueueCompanion(
      retryCount: Value(mutation.retryCount + 1),
    ));
  }

  /// Remove synced mutations (cleanup)
  Future<int> removeSynced() async {
    return (_db.delete(_db.mutationQueue)
          ..where((t) => t.status.equals('synced')))
        .go();
  }

  /// Get pending count for UI indicator
  Future<int> get pendingCount async {
    final count = _db.mutationQueue.id.count();
    final query = _db.selectOnly(_db.mutationQueue)
      ..addColumns([count])
      ..where(_db.mutationQueue.status.isIn(['pending', 'failed']));
    final result = await query.getSingle();
    return result.read(count) ?? 0;
  }
}
```

### Pattern 82.2: Sync Trigger

```dart
import 'package:connectivity_plus/connectivity_plus.dart';
import 'dart:async';

/// Sync trigger — reacts to connectivity changes, manual trigger, and periodic
class SyncTrigger {
  final Connectivity _connectivity;
  final SyncEngine _syncEngine;
  StreamSubscription<List<ConnectivityResult>>? _subscription;
  Timer? _periodicTimer;

  SyncTrigger(this._connectivity, this._syncEngine);

  /// Start listening for connectivity changes
  void startListening() {
    _subscription = _connectivity.onConnectivityChanged.listen(
      (results) {
        final hasConnection = results.any(
          (r) => r != ConnectivityResult.none,
        );
        if (hasConnection) {
          _syncEngine.syncPending();
        }
      },
    );
  }

  /// Start periodic sync (e.g., every 5 minutes when connected)
  void startPeriodic({Duration interval = const Duration(minutes: 5)}) {
    _periodicTimer = Timer.periodic(interval, (_) async {
      final results = await _connectivity.checkConnectivity();
      final hasConnection = results.any(
        (r) => r != ConnectivityResult.none,
      );
      if (hasConnection) {
        await _syncEngine.syncPending();
      }
    });
  }

  /// Manual sync trigger (pull-to-refresh, sync button)
  Future<SyncResult> syncNow() => _syncEngine.syncPending();

  void dispose() {
    _subscription?.cancel();
    _periodicTimer?.cancel();
  }
}
```

### Pattern 82.3: Batch Upload

```dart
/// Sync engine — processes mutation queue in batches
class SyncEngine {
  final MutationQueueRepository _queue;
  final Dio _dio;
  final int _batchSize;
  final int _maxRetries;

  bool _isSyncing = false;
  final _statusController = StreamController<SyncProgress>.broadcast();
  Stream<SyncProgress> get statusStream => _statusController.stream;

  SyncEngine({
    required MutationQueueRepository queue,
    required Dio dio,
    int batchSize = 20,
    int maxRetries = 3,
  })  : _queue = queue,
        _dio = dio,
        _batchSize = batchSize,
        _maxRetries = maxRetries;

  /// Process pending mutations in batch
  Future<SyncResult> syncPending() async {
    if (_isSyncing) return SyncResult.alreadySyncing;
    _isSyncing = true;

    int synced = 0;
    int failed = 0;

    try {
      final pending = await _queue.getPending(limit: _batchSize);
      if (pending.isEmpty) {
        _isSyncing = false;
        return SyncResult(synced: 0, failed: 0, remaining: 0);
      }

      _statusController.add(SyncProgress(
        total: pending.length,
        current: 0,
        status: 'Starting sync...',
      ));

      for (final mutation in pending) {
        try {
          await _queue.updateStatus(mutation.id, MutationStatus.syncing);

          await _uploadMutation(mutation);

          await _queue.updateStatus(mutation.id, MutationStatus.synced);
          synced++;
        } catch (e) {
          await _queue.incrementRetry(mutation.id);
          if (mutation.retryCount >= _maxRetries) {
            await _queue.updateStatus(mutation.id, MutationStatus.failed);
          } else {
            await _queue.updateStatus(mutation.id, MutationStatus.pending);
          }
          failed++;
        }

        _statusController.add(SyncProgress(
          total: pending.length,
          current: synced + failed,
          status: 'Syncing... ($synced/$failed)',
        ));
      }

      // Cleanup synced entries
      await _queue.removeSynced();

      final remaining = await _queue.pendingCount;
      return SyncResult(synced: synced, failed: failed, remaining: remaining);
    } finally {
      _isSyncing = false;
    }
  }

  Future<void> _uploadMutation(MutationQueueData mutation) async {
    final endpoint = '/sync/${mutation.entityType.toLowerCase()}';
    final data = jsonDecode(mutation.payload);

    switch (mutation.mutationType) {
      case 'create':
        await _dio.post(endpoint, data: data);
      case 'update':
        await _dio.put('$endpoint/${mutation.entityId}', data: data);
      case 'delete':
        await _dio.delete('$endpoint/${mutation.entityId}');
    }
  }

  void dispose() => _statusController.close();
}

class SyncResult {
  final int synced;
  final int failed;
  final int remaining;

  SyncResult({required this.synced, required this.failed, required this.remaining});

  static SyncResult get alreadySyncing =>
      SyncResult(synced: 0, failed: 0, remaining: -1);
}

class SyncProgress {
  final int total;
  final int current;
  final String status;

  SyncProgress({required this.total, required this.current, required this.status});

  double get progress => total > 0 ? current / total : 0;
}
```

### Pattern 82.4: Priority Queue

```dart
/// Priority levels for sync operations
enum SyncPriority {
  critical(100),  // Healthcare vitals, safety alerts
  high(75),       // Financial transactions, approvals
  normal(50),     // Standard CRUD operations
  low(25),        // Analytics, preferences
  background(0);  // Image uploads, logs

  final int value;
  const SyncPriority(this.value);
}

/// Priority-aware mutation enqueuing
extension PriorityMutationQueue on MutationQueueRepository {
  Future<int> enqueueWithPriority({
    required String entityType,
    required String entityId,
    required MutationType type,
    required Map<String, dynamic> payload,
    required SyncPriority priority,
  }) {
    return enqueue(
      entityType: entityType,
      entityId: entityId,
      type: type,
      payload: payload,
      priority: priority.value,
    );
  }
}

// Usage in healthcare app
// await queue.enqueueWithPriority(
//   entityType: 'VitalSign',
//   entityId: reading.id,
//   type: MutationType.create,
//   payload: reading.toJson(),
//   priority: SyncPriority.critical, // Syncs before inventory counts
// );
```

### Pattern 82.5: Sync Status Tracking

```dart
/// Per-record sync status for UI display
class RecordSyncStatus {
  final String entityType;
  final String entityId;
  final MutationStatus status;
  final DateTime? lastSyncedAt;
  final int pendingChanges;

  RecordSyncStatus({
    required this.entityType,
    required this.entityId,
    required this.status,
    this.lastSyncedAt,
    this.pendingChanges = 0,
  });
}

/// Sync indicator widget
class SyncStatusIndicator extends StatelessWidget {
  final Stream<SyncProgress> syncStream;
  final int pendingCount;

  const SyncStatusIndicator({
    super.key,
    required this.syncStream,
    required this.pendingCount,
  });

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<SyncProgress>(
      stream: syncStream,
      builder: (context, snapshot) {
        if (snapshot.hasData && snapshot.data!.progress < 1.0) {
          return Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(
                width: 16, height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
              const SizedBox(width: 8),
              Text('Syncing ${snapshot.data!.current}/${snapshot.data!.total}'),
            ],
          );
        }

        if (pendingCount > 0) {
          return Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.cloud_upload_outlined, size: 16),
              const SizedBox(width: 4),
              Text('$pendingCount pending'),
            ],
          );
        }

        return const Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.cloud_done, size: 16, color: Colors.green),
            SizedBox(width: 4),
            Text('Synced'),
          ],
        );
      },
    );
  }
}
```

---

## MUST DO

- Persist mutation queue to Drift (not just in-memory — survives app kill)
- Order by priority (desc), then creation time (asc) when dequeuing
- Use connectivity_plus to trigger sync on reconnection
- Implement retry with max count (3) — mark as failed after max retries
- Show sync status in UI (pending count, progress, synced indicator)

## MUST NOT DO

- Queue mutations in memory only (lost on app kill)
- Sync immediately on every write (batch for efficiency)
- Retry failed mutations infinitely (cap at max retries)
- Block UI thread during sync (use isolates for heavy processing)
- Delete failed mutations silently (keep for manual retry or investigation)

---

## References

- [connectivity_plus](https://pub.dev/packages/connectivity_plus)
- [drift (SQLite)](https://pub.dev/packages/drift)
- [Offline-First Architecture](https://developer.android.com/topic/architecture/data-layer/offline-first)
