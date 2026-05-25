# Flutter Privacy + Consent Specialist
# Flutter プライバシー＋同意管理スペシャリスト
# Chuyen Gia Quyen Rieng Tu Va Dong Y Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Core, Data |
| **Directory Pattern** | `lib/core/security/`, `lib/core/network/` |
| **Variant** | ALL |
| **Naming Convention** | `privacy_service.dart`, `consent_manager.dart`. Classes: `PrivacyService`, `ConsentManager` |
| **Imports From** | Core (secure storage, network) |
| **Cannot Import** | Domain, Presentation, Features |
| **Pattern Numbers** | 97.1–97.5 |
| **Source Paths** | `lib/core/security/*.dart` |
| **File Count** | 2-3 privacy/consent files |
| **Imported By** | Core (analytics checks consent), Presentation (consent UI, privacy dashboard) |
| **Dependencies** | shared_preferences ^2.2.0 (consent persistence) |
| **When To Use** | Banking/gov/healthcare: GDPR/PDPA consent management, data minimization, right to erasure |
| **Source Skeleton** | `lib/core/security/privacy_service.dart`, `lib/core/security/consent_manager.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate privacy consent management with granular consent flows, data minimization enforcement, right to access/erasure, data residency routing, and privacy dashboard |
| **Activation Trigger** | files: lib/core/security/*privacy*.dart, lib/core/security/*consent*.dart; keywords: privacy, consent, gdpr, pdpa, dataMinimization, rightToErasure, dataResidency |

---

## Patterns

### Pattern 97.1: Consent Management

```dart
import 'package:shared_preferences/shared_preferences.dart';

/// Granular consent categories per GDPR/PDPA
enum ConsentCategory {
  necessary,   // Always enabled — cannot be declined
  analytics,   // Usage tracking, crash reporting
  marketing,   // Push notifications, email campaigns
  personalization, // Recommendation engine, UI preferences
  thirdParty,  // Third-party SDKs (Facebook, Google Analytics)
}

class ConsentManager {
  final SharedPreferences _prefs;

  static const _consentPrefix = 'consent_';
  static const _consentTimestampPrefix = 'consent_ts_';
  static const _consentVersionKey = 'consent_policy_version';

  ConsentManager(this._prefs);

  /// Check if consent is granted for a category
  bool isGranted(ConsentCategory category) {
    if (category == ConsentCategory.necessary) return true; // Always granted
    return _prefs.getBool('$_consentPrefix${category.name}') ?? false;
  }

  /// Grant consent for a category
  Future<void> grant(ConsentCategory category) async {
    await _prefs.setBool('$_consentPrefix${category.name}', true);
    await _prefs.setString(
      '$_consentTimestampPrefix${category.name}',
      DateTime.now().toIso8601String(),
    );
  }

  /// Revoke consent for a category
  Future<void> revoke(ConsentCategory category) async {
    if (category == ConsentCategory.necessary) return; // Cannot revoke
    await _prefs.setBool('$_consentPrefix${category.name}', false);
    await _prefs.setString(
      '$_consentTimestampPrefix${category.name}',
      DateTime.now().toIso8601String(),
    );
  }

  /// Save all consent choices at once (from consent dialog)
  Future<void> saveAll(Map<ConsentCategory, bool> choices) async {
    for (final entry in choices.entries) {
      if (entry.value) {
        await grant(entry.key);
      } else {
        await revoke(entry.key);
      }
    }
  }

  /// Get consent status for all categories
  Map<ConsentCategory, bool> getAll() {
    return {
      for (final category in ConsentCategory.values)
        category: isGranted(category),
    };
  }

  /// Get consent timestamp (when was consent given/revoked)
  DateTime? getConsentTimestamp(ConsentCategory category) {
    final ts = _prefs.getString('$_consentTimestampPrefix${category.name}');
    return ts != null ? DateTime.tryParse(ts) : null;
  }

  /// Check if consent needs re-collection (policy version changed)
  Future<bool> needsReConsent(String currentPolicyVersion) async {
    final storedVersion = _prefs.getString(_consentVersionKey);
    return storedVersion != currentPolicyVersion;
  }

  /// Update policy version after re-consent
  Future<void> updatePolicyVersion(String version) async {
    await _prefs.setString(_consentVersionKey, version);
  }
}

/// Guard for consent-gated features
class ConsentGuard {
  final ConsentManager _consentManager;

  ConsentGuard(this._consentManager);

  /// Execute action only if consent is granted
  Future<T?> withConsent<T>(
    ConsentCategory category,
    Future<T> Function() action,
  ) async {
    if (_consentManager.isGranted(category)) {
      return action();
    }
    return null; // Consent not granted — skip action silently
  }
}
```

### Pattern 97.2: Data Minimization

```dart
/// Enforce data collection minimization per GDPR Article 5(1)(c)
class DataMinimizationService {
  final Dio _dio;

  DataMinimizationService(this._dio);

  /// Filter request data to only include necessary fields
  /// Based on purpose limitation
  Map<String, dynamic> minimizeForPurpose({
    required Map<String, dynamic> data,
    required DataPurpose purpose,
  }) {
    final allowedFields = _purposeFieldMap[purpose] ?? {};
    return Map.fromEntries(
      data.entries.where((e) => allowedFields.contains(e.key)),
    );
  }

  static const _purposeFieldMap = {
    DataPurpose.registration: {'name', 'email', 'password'},
    DataPurpose.orderProcessing: {'name', 'address', 'phone', 'email'},
    DataPurpose.analytics: {'user_id', 'event_type', 'timestamp'},
    DataPurpose.marketing: {'email', 'preferences'},
  };

  /// Auto-delete expired data based on retention policy
  Future<void> cleanupExpiredData() async {
    await _dio.post('/privacy/cleanup', data: {
      'timestamp': DateTime.now().toIso8601String(),
    });
  }

  /// Check if field is required for given purpose
  bool isFieldRequired(String field, DataPurpose purpose) {
    return _purposeFieldMap[purpose]?.contains(field) ?? false;
  }
}

enum DataPurpose {
  registration,
  orderProcessing,
  analytics,
  marketing,
  support,
}
```

### Pattern 97.3: Right to Access/Erasure

```dart
/// GDPR Article 15 (Right to Access) + Article 17 (Right to Erasure)
class DataSubjectRightsService {
  final Dio _dio;
  final SecureStorageService _storage;

  DataSubjectRightsService(this._dio, this._storage);

  /// Request data export (Article 15 — Right of Access)
  Future<DataExportResult> requestDataExport({
    required String userId,
    DataExportFormat format = DataExportFormat.json,
  }) async {
    final response = await _dio.post('/privacy/data-export', data: {
      'user_id': userId,
      'format': format.name,
    });

    return DataExportResult(
      requestId: response.data['request_id'],
      status: ExportStatus.processing,
      estimatedCompletionMinutes: response.data['eta_minutes'],
    );
  }

  /// Check export status
  Future<DataExportResult> checkExportStatus(String requestId) async {
    final response = await _dio.get('/privacy/data-export/$requestId');
    return DataExportResult.fromJson(response.data);
  }

  /// Request account deletion (Article 17 — Right to Erasure)
  Future<DeletionResult> requestAccountDeletion({
    required String userId,
    required String reason,
  }) async {
    final response = await _dio.post('/privacy/delete-account', data: {
      'user_id': userId,
      'reason': reason,
      'requested_at': DateTime.now().toIso8601String(),
    });

    return DeletionResult(
      requestId: response.data['request_id'],
      gracePeriodDays: response.data['grace_period_days'] ?? 30,
      scheduledDeletion: DateTime.parse(response.data['scheduled_at']),
    );
  }

  /// Cancel deletion during grace period
  Future<bool> cancelDeletion(String requestId) async {
    final response = await _dio.post('/privacy/delete-account/$requestId/cancel');
    return response.data['cancelled'] == true;
  }

  /// Cascade local data cleanup on account deletion
  Future<void> cleanupLocalData() async {
    await _storage.deleteAll();
    // Clear databases, caches, downloaded files
  }
}

enum DataExportFormat { json, csv, pdf }
enum ExportStatus { processing, ready, expired, failed }

class DataExportResult {
  final String requestId;
  final ExportStatus status;
  final int? estimatedCompletionMinutes;
  final String? downloadUrl;

  DataExportResult({
    required this.requestId,
    required this.status,
    this.estimatedCompletionMinutes,
    this.downloadUrl,
  });

  factory DataExportResult.fromJson(Map<String, dynamic> json) =>
      DataExportResult(
        requestId: json['request_id'],
        status: ExportStatus.values.byName(json['status']),
        downloadUrl: json['download_url'],
      );
}

class DeletionResult {
  final String requestId;
  final int gracePeriodDays;
  final DateTime scheduledDeletion;

  DeletionResult({
    required this.requestId,
    required this.gracePeriodDays,
    required this.scheduledDeletion,
  });
}
```

### Pattern 97.4: Data Residency

```dart
/// Region-based API routing for data residency compliance
class DataResidencyService {
  final Map<String, String> _regionEndpoints;
  String _currentRegion;

  DataResidencyService({
    required Map<String, String> regionEndpoints,
    required String defaultRegion,
  })  : _regionEndpoints = regionEndpoints,
        _currentRegion = defaultRegion;

  /// Get API base URL for current data residency region
  String get baseUrl =>
      _regionEndpoints[_currentRegion] ?? _regionEndpoints.values.first;

  /// Set data residency region (user preference or auto-detected)
  void setRegion(String region) {
    if (_regionEndpoints.containsKey(region)) {
      _currentRegion = region;
    }
  }

  /// Auto-detect region from device locale
  String detectRegion() {
    final locale = PlatformDispatcher.instance.locale;
    return _localeToRegion[locale.countryCode] ?? 'us';
  }

  static const _localeToRegion = {
    'JP': 'ap-northeast-1', // Japan → Tokyo
    'DE': 'eu-central-1',   // Germany → Frankfurt
    'FR': 'eu-west-1',      // France → Ireland
    'SG': 'ap-southeast-1', // Singapore
    'US': 'us-east-1',      // USA → Virginia
    'AU': 'ap-southeast-2', // Australia → Sydney
  };

  /// Configure Dio with region-specific base URL
  void configureDio(Dio dio) {
    dio.options.baseUrl = baseUrl;
  }

  /// Check if cross-border data transfer is allowed
  bool isCrossBorderAllowed({
    required String sourceRegion,
    required String targetRegion,
  }) {
    // EU → EU: always allowed (GDPR adequacy)
    // EU → non-EU: requires adequacy decision or SCCs
    // Japan → Japan: APPI compliance
    final euRegions = {'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-north-1'};
    if (euRegions.contains(sourceRegion) && !euRegions.contains(targetRegion)) {
      return false; // Requires explicit user consent for cross-border
    }
    return true;
  }
}
```

### Pattern 97.5: Privacy Dashboard

```dart
/// User-facing privacy settings and consent history
class PrivacyDashboardData {
  final ConsentManager _consentManager;
  final DataSubjectRightsService _rightsService;

  PrivacyDashboardData(this._consentManager, this._rightsService);

  /// Get complete privacy status for dashboard UI
  Future<PrivacyStatus> getStatus(String userId) async {
    return PrivacyStatus(
      consents: _consentManager.getAll(),
      consentTimestamps: {
        for (final cat in ConsentCategory.values)
          cat: _consentManager.getConsentTimestamp(cat),
      },
      dataExportAvailable: true,
      accountDeletionAvailable: true,
    );
  }
}

class PrivacyStatus {
  final Map<ConsentCategory, bool> consents;
  final Map<ConsentCategory, DateTime?> consentTimestamps;
  final bool dataExportAvailable;
  final bool accountDeletionAvailable;

  PrivacyStatus({
    required this.consents,
    required this.consentTimestamps,
    required this.dataExportAvailable,
    required this.accountDeletionAvailable,
  });
}

/// Privacy dashboard screen sections
/// ─────────────────────────────────
/// | Section              | Content                                    |
/// |----------------------|--------------------------------------------|
/// | Consent Preferences  | Toggle switches per ConsentCategory         |
/// | Data Usage Summary   | What data we collect and why                |
/// | Consent History      | Timestamps of consent changes               |
/// | Data Export           | Request personal data download (JSON/CSV)  |
/// | Account Deletion     | Request account + data deletion            |
/// | Privacy Policy       | Link to current privacy policy             |
/// | Contact DPO          | Contact data protection officer             |
```

---

## MUST DO

- Make consent granular per category (necessary, analytics, marketing, etc.)
- Mark "necessary" consent as always-on (cannot be declined)
- Include consent timestamps for audit trail (GDPR requirement)
- Provide data export in machine-readable format (JSON/CSV)
- Include grace period for account deletion (30 days standard)

## MUST NOT DO

- Bundle all consent into single "accept all" without granular options
- Collect data without consent for non-necessary purposes
- Make deletion irreversible without grace period
- Store consent status without timestamps (non-compliant)
- Skip re-consent when privacy policy version changes

---

## References

- [GDPR Articles 6, 7, 15, 17](https://gdpr-info.eu/)
- [PDPA Thailand](https://thainetizen.org/docs/thai-pdpa-2019-en/)
- [shared_preferences](https://pub.dev/packages/shared_preferences)
- [OWASP Privacy Risks](https://owasp.org/www-project-top-10-privacy-risks/)
