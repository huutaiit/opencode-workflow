# Flutter Audit Trail Specialist
# Flutter 監査証跡スペシャリスト
# Chuyen Gia Audit Trail Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Core, Data |
| **Directory Pattern** | `lib/core/security/`, `lib/core/network/` |
| **Variant** | ALL |
| **Naming Convention** | `audit_service.dart`, `audit_event.dart`. Classes: `AuditService`, `AuditEvent` |
| **Imports From** | Core (secure storage, logger), Data (local DB for buffer) |
| **Cannot Import** | Domain, Presentation |
| **Pattern Numbers** | 93.1–93.5 |
| **Source Paths** | `lib/core/security/*.dart` |
| **File Count** | 2-3 audit service files |
| **Imported By** | Core (DI registers service), Data (repo wrappers log access), Presentation (screen tracking) |
| **Dependencies** | drift ^2.14.0 (local log storage) |
| **When To Use** | Banking/gov/healthcare: immutable event logging for regulatory compliance — HIPAA, PCI-DSS |
| **Source Skeleton** | `lib/core/security/audit_service.dart`, `lib/core/security/audit_event.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate audit trail system with structured event logging, data access tracking, user action logging, tamper-proof local storage, and regulatory compliance templates |
| **Activation Trigger** | files: lib/core/security/*audit*.dart; keywords: auditTrail, eventLogging, complianceLog, hipaa, pciDss, dataAccessLog |

---

## Patterns

### Pattern 93.1: Event Logging Architecture

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'audit_event.freezed.dart';
part 'audit_event.g.dart';

/// Structured audit event model
@freezed
class AuditEvent with _$AuditEvent {
  const factory AuditEvent({
    required String eventId,
    required AuditEventType type,
    required AuditSeverity severity,
    required String action,
    required DateTime timestamp,
    required String userId,
    String? resourceType,
    String? resourceId,
    Map<String, dynamic>? metadata,
    String? ipAddress,
    String? deviceId,
    String? sessionId,
  }) = _AuditEvent;

  factory AuditEvent.fromJson(Map<String, dynamic> json) =>
      _$AuditEventFromJson(json);
}

enum AuditEventType {
  authentication,  // Login, logout, MFA
  authorization,   // Permission check, role change
  dataAccess,      // Read/write sensitive data
  dataModification,// Create, update, delete records
  systemEvent,     // App start, crash, config change
  securityEvent,   // Root detection, tamper, threat
  userAction,      // Screen view, button tap on sensitive ops
}

enum AuditSeverity {
  info,     // Routine operations
  warning,  // Suspicious but allowed
  error,    // Failed operations
  critical, // Security violations
}

/// HIPAA-required event types with examples
/// ─────────────────────────────────────────
/// | Event Type         | HIPAA Example                          |
/// |--------------------|----------------------------------------|
/// | authentication     | Nurse logs into patient portal          |
/// | dataAccess         | Doctor views patient medical records    |
/// | dataModification   | Admin updates patient insurance info    |
/// | authorization      | Role elevated to admin                  |
/// | securityEvent      | Unauthorized access attempt             |
```

### Pattern 93.2: Data Access Logging

```dart
/// Wrapper for repository calls that logs data access
class AuditedRepository<T> {
  final String resourceType;
  final AuditService _auditService;

  AuditedRepository({
    required this.resourceType,
    required AuditService auditService,
  }) : _auditService = auditService;

  /// Log read access to sensitive data
  Future<void> logRead({
    required String userId,
    required String resourceId,
    List<String>? fieldsAccessed,
  }) async {
    await _auditService.log(AuditEvent(
      eventId: _generateEventId(),
      type: AuditEventType.dataAccess,
      severity: AuditSeverity.info,
      action: 'READ',
      timestamp: DateTime.now(),
      userId: userId,
      resourceType: resourceType,
      resourceId: resourceId,
      metadata: {
        if (fieldsAccessed != null) 'fields': fieldsAccessed,
      },
    ));
  }

  /// Log write/update to sensitive data
  Future<void> logWrite({
    required String userId,
    required String resourceId,
    required String operation, // CREATE, UPDATE, DELETE
    Map<String, dynamic>? changedFields,
  }) async {
    await _auditService.log(AuditEvent(
      eventId: _generateEventId(),
      type: AuditEventType.dataModification,
      severity: AuditSeverity.info,
      action: operation,
      timestamp: DateTime.now(),
      userId: userId,
      resourceType: resourceType,
      resourceId: resourceId,
      metadata: {
        if (changedFields != null) 'changes': changedFields,
      },
    ));
  }

  String _generateEventId() =>
      '${DateTime.now().millisecondsSinceEpoch}_${resourceType.hashCode}';
}

// Usage in feature repository
class PatientRepository {
  final Dio _dio;
  final AuditedRepository<Patient> _audit;

  PatientRepository(this._dio, AuditService auditService)
      : _audit = AuditedRepository(
          resourceType: 'Patient',
          auditService: auditService,
        );

  Future<Patient> getById(String id, {required String requestedBy}) async {
    await _audit.logRead(userId: requestedBy, resourceId: id);
    final response = await _dio.get('/patients/$id');
    return Patient.fromJson(response.data);
  }
}
```

### Pattern 93.3: User Action Logging

```dart
/// Screen view and sensitive action tracking
class UserActionTracker {
  final AuditService _auditService;
  final String _userId;

  UserActionTracker(this._auditService, this._userId);

  /// Log screen view (for sensitive screens)
  Future<void> trackScreenView(String screenName) async {
    await _auditService.log(AuditEvent(
      eventId: _generateId(),
      type: AuditEventType.userAction,
      severity: AuditSeverity.info,
      action: 'SCREEN_VIEW',
      timestamp: DateTime.now(),
      userId: _userId,
      metadata: {'screen': screenName},
    ));
  }

  /// Log sensitive button tap (transfer, delete, export)
  Future<void> trackSensitiveAction({
    required String action,
    required String screen,
    Map<String, dynamic>? details,
  }) async {
    await _auditService.log(AuditEvent(
      eventId: _generateId(),
      type: AuditEventType.userAction,
      severity: AuditSeverity.warning,
      action: action,
      timestamp: DateTime.now(),
      userId: _userId,
      metadata: {
        'screen': screen,
        if (details != null) ...details,
      },
    ));
  }

  /// Log form submission on sensitive data
  Future<void> trackFormSubmission({
    required String formName,
    required List<String> fieldNames, // Never log field values
  }) async {
    await _auditService.log(AuditEvent(
      eventId: _generateId(),
      type: AuditEventType.userAction,
      severity: AuditSeverity.info,
      action: 'FORM_SUBMIT',
      timestamp: DateTime.now(),
      userId: _userId,
      metadata: {
        'form': formName,
        'fields': fieldNames,
      },
    ));
  }

  String _generateId() =>
      '${DateTime.now().millisecondsSinceEpoch}_${_userId.hashCode}';
}
```

### Pattern 93.4: Immutable Log Storage

```dart
/// Local encrypted audit log buffer with batch upload
class AuditService {
  final AuditLogDatabase _db;
  final Dio _dio;
  final EncryptionHelper _encryption;
  final int _batchSize;
  final Duration _uploadInterval;

  Timer? _uploadTimer;

  AuditService({
    required AuditLogDatabase db,
    required Dio dio,
    required EncryptionHelper encryption,
    int batchSize = 50,
    Duration uploadInterval = const Duration(minutes: 5),
  })  : _db = db,
        _dio = dio,
        _encryption = encryption,
        _batchSize = batchSize,
        _uploadInterval = uploadInterval;

  void startPeriodicUpload() {
    _uploadTimer = Timer.periodic(_uploadInterval, (_) => uploadPending());
  }

  void dispose() => _uploadTimer?.cancel();

  /// Log event — encrypt and store locally
  Future<void> log(AuditEvent event) async {
    final json = event.toJson();
    final encrypted = await _encryption.encrypt(jsonEncode(json));

    await _db.insertLog(AuditLogEntry(
      eventId: event.eventId,
      encryptedPayload: encrypted,
      timestamp: event.timestamp,
      uploaded: false,
    ));
  }

  /// Batch upload pending logs to server
  Future<void> uploadPending() async {
    final pending = await _db.getPendingLogs(limit: _batchSize);
    if (pending.isEmpty) return;

    try {
      // Decrypt for upload (server re-encrypts at rest)
      final events = <Map<String, dynamic>>[];
      for (final entry in pending) {
        final decrypted = await _encryption.decrypt(entry.encryptedPayload);
        events.add(jsonDecode(decrypted));
      }

      await _dio.post('/audit/events/batch', data: {'events': events});

      // Mark as uploaded
      final ids = pending.map((e) => e.eventId).toList();
      await _db.markUploaded(ids);
    } catch (_) {
      // Retry on next interval — logs persist locally
    }
  }

  /// Tamper detection — verify log chain integrity
  Future<bool> verifyIntegrity() async {
    final logs = await _db.getAllLogs();
    // Verify sequential event IDs, no gaps, no modifications
    for (var i = 1; i < logs.length; i++) {
      if (logs[i].timestamp.isBefore(logs[i - 1].timestamp)) {
        return false; // Timestamp anomaly — possible tampering
      }
    }
    return true;
  }
}

/// Drift database table for audit log entries
class AuditLogEntry {
  final String eventId;
  final String encryptedPayload;
  final DateTime timestamp;
  final bool uploaded;

  AuditLogEntry({
    required this.eventId,
    required this.encryptedPayload,
    required this.timestamp,
    required this.uploaded,
  });
}
```

### Pattern 93.5: Regulatory Compliance

```dart
/// Compliance-specific audit configurations
class ComplianceConfig {
  /// HIPAA audit requirements
  static const hipaa = ComplianceConfig(
    requiredEvents: [
      AuditEventType.authentication,
      AuditEventType.dataAccess,
      AuditEventType.dataModification,
      AuditEventType.authorization,
      AuditEventType.securityEvent,
    ],
    retentionDays: 2190, // 6 years per HIPAA
    encryptionRequired: true,
    realTimeAlerts: [AuditSeverity.critical],
  );

  /// PCI-DSS audit requirements
  static const pciDss = ComplianceConfig(
    requiredEvents: [
      AuditEventType.authentication,
      AuditEventType.dataAccess,
      AuditEventType.securityEvent,
      AuditEventType.systemEvent,
    ],
    retentionDays: 365, // 1 year per PCI-DSS
    encryptionRequired: true,
    realTimeAlerts: [AuditSeverity.critical, AuditSeverity.error],
  );

  final List<AuditEventType> requiredEvents;
  final int retentionDays;
  final bool encryptionRequired;
  final List<AuditSeverity> realTimeAlerts;

  const ComplianceConfig({
    required this.requiredEvents,
    required this.retentionDays,
    required this.encryptionRequired,
    required this.realTimeAlerts,
  });

  /// Validate that audit service covers all required event types
  bool isCompliant(List<AuditEventType> configuredEvents) {
    return requiredEvents.every(configuredEvents.contains);
  }
}

/// Retention policy enforcement
class AuditRetentionService {
  final AuditLogDatabase _db;
  final ComplianceConfig _config;

  AuditRetentionService(this._db, this._config);

  /// Clean up logs older than retention period (ONLY after server confirmation)
  Future<int> cleanupExpired() async {
    final cutoff = DateTime.now().subtract(
      Duration(days: _config.retentionDays),
    );
    // Only delete uploaded logs past retention
    return _db.deleteUploadedBefore(cutoff);
  }
}
```

---

## MUST DO

- Encrypt audit logs at rest (local storage)
- Include HIPAA-required event types (auth, data access, modification, authorization, security)
- Buffer logs locally and batch upload (handle offline scenarios)
- Log field names accessed, never field values (privacy)
- Set retention per compliance standard (HIPAA: 6 years, PCI-DSS: 1 year)

## MUST NOT DO

- Log sensitive data values (only resource IDs and field names)
- Delete local logs before server confirms receipt
- Skip audit for data access operations (compliance violation)
- Use plaintext local storage for audit events
- Allow gaps in event ID sequence (enables tampering)

---

## References

- [HIPAA Audit Trail Requirements](https://www.hhs.gov/hipaa/for-professionals/security/guidance/index.html)
- [PCI-DSS Logging Requirements](https://www.pcisecuritystandards.org/)
- [drift (SQLite)](https://pub.dev/packages/drift)
