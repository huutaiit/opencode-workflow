# Flutter Network Hardening Specialist
# Flutter ネットワーク堅牢化スペシャリスト
# Chuyen Gia Gia Co Mang Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Core, Data |
| **Directory Pattern** | `lib/core/network/`, `android/app/src/main/res/xml/`, `ios/Runner/` |
| **Variant** | ALL |
| **Naming Convention** | `network_security_config.dart`, `network_security_config.xml` (Android). Class: `NetworkSecurityConfig` |
| **Imports From** | Core (Dio client for enforcement) |
| **Cannot Import** | Domain, Presentation, Features |
| **Pattern Numbers** | 98.1–98.4 |
| **Source Paths** | `lib/core/network/*security*.dart`, `android/app/src/main/res/xml/network_security_config.xml` |
| **File Count** | 1-2 network security files + platform configs |
| **Imported By** | Core (Dio client uses security config) |
| **Dependencies** | dio ^5.4.0 |
| **When To Use** | HTTPS enforcement, cleartext traffic blocking, Android Network Security Config, request sanitization |
| **Source Skeleton** | `lib/core/network/network_security_config.dart`, `android/app/src/main/res/xml/network_security_config.xml` |
| **Specialist Type** | code |
| **Purpose** | Generate network security hardening with HTTPS enforcement, Android Network Security Config, request/response sanitization, and rate limiting |
| **Activation Trigger** | files: lib/core/network/*security*.dart; keywords: networkSecurity, httpsOnly, cleartextTraffic, requestSanitization, rateLimiting |

---

## Patterns

### Pattern 98.1: HTTPS Enforcement

```dart
/// Enforce HTTPS-only connections in Dio
class HttpsEnforcer extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (options.uri.scheme != 'https') {
      handler.reject(DioException(
        requestOptions: options,
        message: 'HTTP not allowed — use HTTPS only',
        type: DioExceptionType.cancel,
      ));
      return;
    }
    handler.next(options);
  }
}
```

### Pattern 98.2: Android Network Security Config

```xml
<!-- android/app/src/main/res/xml/network_security_config.xml -->
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Block all cleartext (HTTP) traffic -->
    <base-config cleartextTrafficPermitted="false">
        <trust-anchors>
            <certificates src="system"/>
        </trust-anchors>
    </base-config>

    <!-- Exception for local development only -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">localhost</domain>
    </domain-config>
</network-security-config>
```

```xml
<!-- AndroidManifest.xml -->
<application android:networkSecurityConfig="@xml/network_security_config" />
```

### Pattern 98.3: Request Sanitization

```dart
/// Sanitize outgoing requests — remove sensitive data from logs
class RequestSanitizer extends Interceptor {
  static const _sensitiveHeaders = ['Authorization', 'Cookie', 'X-API-Key'];
  static const _sensitiveFields = ['password', 'token', 'secret', 'credit_card'];

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    // Add security headers
    options.headers['X-Content-Type-Options'] = 'nosniff';
    options.headers['X-Frame-Options'] = 'DENY';
    handler.next(options);
  }

  /// Sanitize request data for logging (remove sensitive fields)
  static Map<String, dynamic> sanitizeForLog(Map<String, dynamic> data) {
    final sanitized = Map<String, dynamic>.from(data);
    for (final key in _sensitiveFields) {
      if (sanitized.containsKey(key)) {
        sanitized[key] = '***REDACTED***';
      }
    }
    return sanitized;
  }
}
```

### Pattern 98.4: Client-Side Rate Limiting

```dart
/// Prevent excessive API calls from client side
class RateLimiter {
  final Map<String, DateTime> _lastRequests = {};
  final Duration minimumInterval;

  RateLimiter({this.minimumInterval = const Duration(seconds: 1)});

  bool shouldAllow(String endpoint) {
    final now = DateTime.now();
    final last = _lastRequests[endpoint];
    if (last != null && now.difference(last) < minimumInterval) {
      return false;
    }
    _lastRequests[endpoint] = now;
    return true;
  }
}

class RateLimitInterceptor extends Interceptor {
  final RateLimiter _limiter;

  RateLimitInterceptor(this._limiter);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (!_limiter.shouldAllow(options.path)) {
      handler.reject(DioException(
        requestOptions: options,
        message: 'Rate limited — too many requests',
        type: DioExceptionType.cancel,
      ));
      return;
    }
    handler.next(options);
  }
}
```

---

## MUST DO

- Block cleartext (HTTP) traffic via Android Network Security Config
- Add iOS App Transport Security exceptions only for development
- Sanitize sensitive fields before logging requests
- Enforce HTTPS at Dio interceptor level (defense in depth)
- Set security headers on outgoing requests

## MUST NOT DO

- Allow HTTP in production builds
- Log Authorization headers or API keys
- Skip Android Network Security Config (cleartext allowed by default on older APIs)
- Disable App Transport Security in iOS production builds
- Trust all certificates in release mode

---

## References

- [Android Network Security Config](https://developer.android.com/training/articles/security-config)
- [iOS App Transport Security](https://developer.apple.com/documentation/bundleresources/information_property_list/nsapptransportsecurity)
