# Flutter Conflict Resolution Specialist
# Flutter コンフリクト解決スペシャリスト
# Chuyen Gia Giai Quyet Xung Dot Du Lieu Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Data |
| **Directory Pattern** | `lib/core/sync/` |
| **Variant** | ALL |
| **Naming Convention** | `conflict_resolver.dart`, `merge_strategy.dart`. Classes: `ConflictResolver`, `MergeStrategy` (abstract) |
| **Imports From** | Data (models for field-level comparison), Core (error types) |
| **Cannot Import** | Presentation (conflict UI is separate — presentation calls resolver) |
| **Pattern Numbers** | 83.1–83.5 |
| **Source Paths** | `lib/core/sync/*conflict*.dart` |
| **File Count** | 2-3 conflict resolution files |
| **Imported By** | Data (sync engine uses conflict resolver), Presentation (conflict UI calls resolver API) |
| **Dependencies** | None (pure Dart conflict logic) |
| **When To Use** | Resolving conflicts when offline changes clash with server changes during sync |
| **Source Skeleton** | `lib/core/sync/conflict_resolver.dart`, `lib/core/sync/merge_strategy.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate conflict resolution strategies — last-write-wins, timestamp merge, CRDT, manual conflict UI, server-side resolution |
| **Activation Trigger** | files: lib/core/sync/*conflict*.dart; keywords: conflictResolution, lastWriteWins, crdt, mergeStrategy, dataConflict |

---

## Strategy Comparison

| Strategy | Complexity | Data Loss Risk | UX Impact | Best For |
|----------|-----------|---------------|-----------|----------|
| Last-Write-Wins | Low | High | None | Logs, non-critical data |
| Timestamp Merge | Medium | Low | None | Field-independent entities |
| CRDT | High | None | None | Collaborative editing, counters |
| Manual Resolution | Low | None | High | Critical business data |
| Server-Side | Medium | Low | Low | Complex business rules |

---

## Patterns

### Pattern 83.1: Last-Write-Wins

```dart
/// Simplest conflict strategy — most recent change wins
abstract class MergeStrategy<T> {
  /// Resolve conflict between local and remote versions
  T resolve(T local, T remote, ConflictContext context);
}

class ConflictContext {
  final DateTime localModifiedAt;
  final DateTime remoteModifiedAt;
  final String? localUserId;
  final String? remoteUserId;

  ConflictContext({
    required this.localModifiedAt,
    required this.remoteModifiedAt,
    this.localUserId,
    this.remoteUserId,
  });
}

/// Last-Write-Wins — server-authoritative (simpler) or timestamp-based
class LastWriteWinsStrategy<T> implements MergeStrategy<T> {
  final bool serverAuthoritative;

  LastWriteWinsStrategy({this.serverAuthoritative = true});

  @override
  T resolve(T local, T remote, ConflictContext context) {
    if (serverAuthoritative) {
      return remote; // Server always wins
    }

    // Timestamp-based: most recent modification wins
    return context.localModifiedAt.isAfter(context.remoteModifiedAt)
        ? local
        : remote;
  }
}

// Usage
// final strategy = LastWriteWinsStrategy<OrderModel>(serverAuthoritative: false);
// final resolved = strategy.resolve(localOrder, remoteOrder, context);
```

### Pattern 83.2: Timestamp-Based Merge

```dart
/// Field-level merge — merge non-conflicting fields automatically
class TimestampMergeStrategy<T extends MergeableEntity> implements MergeStrategy<T> {
  @override
  T resolve(T local, T remote, ConflictContext context) {
    final localFields = local.toFieldMap();
    final remoteFields = remote.toFieldMap();
    final localTimestamps = local.fieldTimestamps;
    final remoteTimestamps = remote.fieldTimestamps;

    final merged = <String, dynamic>{};
    final conflicts = <String>[];

    final allKeys = {...localFields.keys, ...remoteFields.keys};

    for (final key in allKeys) {
      final localTs = localTimestamps[key];
      final remoteTs = remoteTimestamps[key];

      if (localFields[key] == remoteFields[key]) {
        // Same value — no conflict
        merged[key] = localFields[key];
      } else if (localTs != null && remoteTs != null) {
        if (localTs.isAfter(remoteTs)) {
          merged[key] = localFields[key]; // Local is newer
        } else {
          merged[key] = remoteFields[key]; // Remote is newer
        }
      } else {
        // Both changed same field — true conflict
        conflicts.add(key);
        merged[key] = remoteFields[key]; // Default to remote
      }
    }

    if (conflicts.isNotEmpty) {
      // Log conflicts for audit
      debugPrint('Auto-merged with ${conflicts.length} conflicting fields: $conflicts');
    }

    return local.fromFieldMap(merged) as T;
  }
}

/// Interface for entities that support field-level merge
abstract class MergeableEntity {
  Map<String, dynamic> toFieldMap();
  Map<String, DateTime> get fieldTimestamps;
  MergeableEntity fromFieldMap(Map<String, dynamic> fields);
}
```

### Pattern 83.3: CRDT Patterns

```dart
/// Conflict-free Replicated Data Types (CRDTs)
/// Mathematically guaranteed convergence without coordination

/// G-Counter: grow-only counter (e.g., view count, like count)
class GCounter {
  final Map<String, int> _counts; // nodeId → count

  GCounter([Map<String, int>? counts]) : _counts = counts ?? {};

  int get value => _counts.values.fold(0, (a, b) => a + b);

  /// Increment on this node
  GCounter increment(String nodeId) {
    final updated = Map<String, int>.from(_counts);
    updated[nodeId] = (updated[nodeId] ?? 0) + 1;
    return GCounter(updated);
  }

  /// Merge two counters — take max of each node's count
  GCounter merge(GCounter other) {
    final merged = <String, int>{};
    final allKeys = {..._counts.keys, ...other._counts.keys};
    for (final key in allKeys) {
      merged[key] = max(_counts[key] ?? 0, other._counts[key] ?? 0);
    }
    return GCounter(merged);
  }

  Map<String, int> toJson() => Map.from(_counts);
  factory GCounter.fromJson(Map<String, dynamic> json) =>
      GCounter(json.map((k, v) => MapEntry(k, v as int)));
}

/// LWW-Register: last-writer-wins register with timestamp
class LwwRegister<T> {
  final T value;
  final DateTime timestamp;
  final String nodeId;

  LwwRegister(this.value, this.timestamp, this.nodeId);

  /// Update value — only if timestamp is newer
  LwwRegister<T> update(T newValue, DateTime ts, String node) {
    if (ts.isAfter(timestamp)) {
      return LwwRegister(newValue, ts, node);
    }
    return this;
  }

  /// Merge two registers — keep most recent
  LwwRegister<T> merge(LwwRegister<T> other) {
    if (other.timestamp.isAfter(timestamp)) return other;
    if (timestamp.isAfter(other.timestamp)) return this;
    // Tie-break: lexicographic nodeId comparison
    return nodeId.compareTo(other.nodeId) > 0 ? this : other;
  }
}

/// OR-Set: observed-remove set (add-wins semantics)
class OrSet<T> {
  final Map<T, Set<String>> _additions; // element → unique tags
  final Set<String> _removals; // removed tags

  OrSet([Map<T, Set<String>>? additions, Set<String>? removals])
      : _additions = additions ?? {},
        _removals = removals ?? {};

  Set<T> get elements {
    return _additions.entries
        .where((e) => e.value.any((tag) => !_removals.contains(tag)))
        .map((e) => e.key)
        .toSet();
  }

  OrSet<T> add(T element, String uniqueTag) {
    final updated = Map<T, Set<String>>.from(_additions);
    updated[element] = {...(updated[element] ?? {}), uniqueTag};
    return OrSet(updated, Set.from(_removals));
  }

  OrSet<T> remove(T element) {
    final tags = _additions[element] ?? {};
    return OrSet(Map.from(_additions), {..._removals, ...tags});
  }

  OrSet<T> merge(OrSet<T> other) {
    final merged = <T, Set<String>>{};
    for (final key in {..._additions.keys, ...other._additions.keys}) {
      merged[key] = {
        ...(_additions[key] ?? {}),
        ...(other._additions[key] ?? {}),
      };
    }
    return OrSet(merged, {..._removals, ...other._removals});
  }
}
```

### Pattern 83.4: Manual Conflict UI

```dart
/// Present both versions to user for manual resolution
class ConflictResolutionData<T> {
  final T localVersion;
  final T remoteVersion;
  final DateTime localModifiedAt;
  final DateTime remoteModifiedAt;
  final String entityType;
  final String entityId;
  final List<FieldConflict> fieldConflicts;

  ConflictResolutionData({
    required this.localVersion,
    required this.remoteVersion,
    required this.localModifiedAt,
    required this.remoteModifiedAt,
    required this.entityType,
    required this.entityId,
    required this.fieldConflicts,
  });
}

class FieldConflict {
  final String fieldName;
  final dynamic localValue;
  final dynamic remoteValue;

  FieldConflict({
    required this.fieldName,
    required this.localValue,
    required this.remoteValue,
  });
}

/// Conflict resolution dialog data model
class ConflictChoice {
  final String entityId;
  final ConflictAction action;
  final Map<String, dynamic>? mergedFields; // For per-field merge

  ConflictChoice({
    required this.entityId,
    required this.action,
    this.mergedFields,
  });
}

enum ConflictAction {
  keepLocal,    // Discard remote changes
  keepRemote,   // Discard local changes
  mergeManual,  // User picked fields from each version
}

/// Conflict resolver that supports manual resolution
class ManualConflictResolver<T extends MergeableEntity>
    implements MergeStrategy<T> {
  final List<ConflictResolutionData<T>> _pendingConflicts = [];

  List<ConflictResolutionData<T>> get pendingConflicts =>
      List.unmodifiable(_pendingConflicts);

  @override
  T resolve(T local, T remote, ConflictContext context) {
    // Queue for manual resolution — don't auto-resolve
    final localFields = local.toFieldMap();
    final remoteFields = remote.toFieldMap();

    final conflicts = <FieldConflict>[];
    for (final key in localFields.keys) {
      if (localFields[key] != remoteFields[key]) {
        conflicts.add(FieldConflict(
          fieldName: key,
          localValue: localFields[key],
          remoteValue: remoteFields[key],
        ));
      }
    }

    _pendingConflicts.add(ConflictResolutionData(
      localVersion: local,
      remoteVersion: remote,
      localModifiedAt: context.localModifiedAt,
      remoteModifiedAt: context.remoteModifiedAt,
      entityType: local.runtimeType.toString(),
      entityId: localFields['id'] ?? '',
      fieldConflicts: conflicts,
    ));

    return remote; // Temporary — will be resolved by user
  }
}
```

### Pattern 83.5: Server-Side Resolution

```dart
/// Delegate conflict resolution to server (complex business rules)
class ServerSideResolver<T> implements MergeStrategy<T> {
  final Dio _dio;
  final String _entityEndpoint;
  final T Function(Map<String, dynamic>) _fromJson;

  ServerSideResolver(this._dio, this._entityEndpoint, this._fromJson);

  @override
  T resolve(T local, T remote, ConflictContext context) {
    // Synchronous interface — caller should use resolveAsync
    throw UnsupportedError('Use resolveAsync for server-side resolution');
  }

  /// Send both versions to server for resolution
  Future<T> resolveAsync(T local, T remote, ConflictContext context) async {
    final response = await _dio.post(
      '$_entityEndpoint/resolve-conflict',
      data: {
        'local': (local as dynamic).toJson(),
        'remote': (remote as dynamic).toJson(),
        'local_modified_at': context.localModifiedAt.toIso8601String(),
        'remote_modified_at': context.remoteModifiedAt.toIso8601String(),
        'local_user_id': context.localUserId,
        'remote_user_id': context.remoteUserId,
      },
    );

    return _fromJson(response.data['resolved']);
  }
}

/// Composite resolver — try auto strategies first, fallback to manual/server
class CompositeConflictResolver<T extends MergeableEntity>
    implements MergeStrategy<T> {
  final TimestampMergeStrategy<T> _autoMerge;
  final ManualConflictResolver<T> _manualFallback;

  CompositeConflictResolver()
      : _autoMerge = TimestampMergeStrategy(),
        _manualFallback = ManualConflictResolver();

  @override
  T resolve(T local, T remote, ConflictContext context) {
    // Try auto-merge first (non-conflicting fields)
    try {
      return _autoMerge.resolve(local, remote, context);
    } catch (_) {
      // Auto-merge failed — queue for manual resolution
      return _manualFallback.resolve(local, remote, context);
    }
  }

  List<ConflictResolutionData<T>> get pendingManualConflicts =>
      _manualFallback.pendingConflicts;
}
```

---

## MUST DO

- Default to server-authoritative (Last-Write-Wins) for simplicity
- Track field-level timestamps for timestamp merge strategy
- Use CRDTs for collaborative data (counters, sets) — no coordination needed
- Present diff view for manual resolution (show conflicting fields only)
- Log all conflict resolutions for audit trail

## MUST NOT DO

- Auto-resolve critical business data conflicts (require manual review)
- Implement CRDT for simple CRUD entities (overkill — use LWW)
- Silently discard local changes (always inform user of conflict resolution)
- Use wall-clock timestamps without server time sync (clock skew issues)
- Store conflict resolution state in memory only (persist for retry)

---

## References

- [CRDTs and the Quest for Distributed Consistency](https://www.youtube.com/watch?v=B5NULPSiOGw)
- [Operational Transformation vs CRDTs](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type)
