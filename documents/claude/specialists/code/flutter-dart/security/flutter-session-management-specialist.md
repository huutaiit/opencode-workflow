# Flutter Session Management Specialist
# Flutter セッション管理スペシャリスト
# Chuyen Gia Quan Ly Session Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Core, Data |
| **Directory Pattern** | `lib/core/security/`, `lib/core/network/` |
| **Variant** | ALL |
| **Naming Convention** | `session_manager.dart`, `token_service.dart`. Classes: `SessionManager`, `TokenService` |
| **Imports From** | Core (secure storage, network), Data (auth API for refresh) |
| **Cannot Import** | Presentation, Domain |
| **Pattern Numbers** | 89.1–89.5 |
| **Source Paths** | `lib/core/security/*.dart`, `lib/core/network/auth_interceptor.dart` |
| **File Count** | 2-3 session management files |
| **Imported By** | Core (Dio interceptor uses token service), Presentation (auth BLoC checks session) |
| **Dependencies** | jwt_decoder ^2.0.0, flutter_secure_storage ^9.0.0 |
| **When To Use** | Token lifecycle management, auto-refresh, session timeout, concurrent session control |
| **Source Skeleton** | `lib/core/security/session_manager.dart`, `lib/core/security/token_service.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate session management with JWT token lifecycle, auto-refresh on 401, idle timeout, and concurrent session control |
| **Activation Trigger** | files: lib/core/security/*session*.dart, lib/core/network/*auth*.dart; keywords: session, tokenRefresh, jwt, idleTimeout, oauth2, pkce |

---

## Patterns

### Pattern 89.1: Token Lifecycle

```dart
import 'package:jwt_decoder/jwt_decoder.dart';

class TokenService {
  final SecureStorageService _storage;

  static const _accessKey = 'access_token';
  static const _refreshKey = 'refresh_token';

  TokenService(this._storage);

  Future<String?> get accessToken => _storage.read(key: _accessKey);
  Future<String?> get refreshToken => _storage.read(key: _refreshKey);

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await Future.wait([
      _storage.write(key: _accessKey, value: accessToken),
      _storage.write(key: _refreshKey, value: refreshToken),
    ]);
  }

  Future<void> clearTokens() async {
    await Future.wait([
      _storage.delete(key: _accessKey),
      _storage.delete(key: _refreshKey),
    ]);
  }

  /// Check if access token is expired or will expire within buffer
  Future<bool> isAccessTokenExpired({
    Duration buffer = const Duration(minutes: 1),
  }) async {
    final token = await accessToken;
    if (token == null) return true;

    try {
      final expiry = JwtDecoder.getExpirationDate(token);
      return DateTime.now().add(buffer).isAfter(expiry);
    } catch (_) {
      return true; // Treat invalid JWT as expired
    }
  }

  /// Extract claims from access token (non-sensitive fields only)
  Future<Map<String, dynamic>?> get claims async {
    final token = await accessToken;
    if (token == null) return null;
    try {
      return JwtDecoder.decode(token);
    } catch (_) {
      return null;
    }
  }
}
```

### Pattern 89.2: Refresh Token Flow (Dio Interceptor)

```dart
import 'package:dio/dio.dart';

class AuthInterceptor extends QueuedInterceptor {
  final TokenService _tokenService;
  final Dio _refreshDio; // Separate Dio instance to avoid interceptor loop

  AuthInterceptor(this._tokenService, this._refreshDio);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await _tokenService.accessToken;
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode != 401) {
      return handler.next(err);
    }

    // Attempt token refresh
    try {
      final refreshToken = await _tokenService.refreshToken;
      if (refreshToken == null) {
        return handler.reject(err);
      }

      final response = await _refreshDio.post(
        '/auth/refresh',
        data: {'refresh_token': refreshToken},
      );

      final newAccess = response.data['access_token'] as String;
      final newRefresh = response.data['refresh_token'] as String;
      await _tokenService.saveTokens(
        accessToken: newAccess,
        refreshToken: newRefresh,
      );

      // Retry original request with new token
      final retryOptions = err.requestOptions;
      retryOptions.headers['Authorization'] = 'Bearer $newAccess';
      final retryResponse = await _refreshDio.fetch(retryOptions);
      return handler.resolve(retryResponse);
    } on DioException {
      // Refresh failed — force logout
      await _tokenService.clearTokens();
      return handler.reject(err);
    }
  }
}

// QueuedInterceptor ensures concurrent 401s wait for first refresh
// to complete, preventing multiple refresh calls
```

### Pattern 89.3: Session Timeout

```dart
import 'dart:async';
import 'package:flutter/widgets.dart';

class SessionManager with WidgetsBindingObserver {
  final TokenService _tokenService;
  final Duration idleTimeout;
  final Duration backgroundTimeout;
  final VoidCallback onSessionExpired;

  Timer? _idleTimer;
  DateTime? _backgroundedAt;

  SessionManager({
    required this.onSessionExpired,
    required TokenService tokenService,
    this.idleTimeout = const Duration(minutes: 15),
    this.backgroundTimeout = const Duration(minutes: 5),
  }) : _tokenService = tokenService;

  void start() {
    WidgetsBinding.instance.addObserver(this);
    _resetIdleTimer();
  }

  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _idleTimer?.cancel();
  }

  /// Call on any user interaction (tap, scroll, keyboard)
  void onUserActivity() => _resetIdleTimer();

  void _resetIdleTimer() {
    _idleTimer?.cancel();
    _idleTimer = Timer(idleTimeout, _onIdleTimeout);
  }

  void _onIdleTimeout() {
    _tokenService.clearTokens();
    onSessionExpired();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.paused:
      case AppLifecycleState.hidden:
        _backgroundedAt = DateTime.now();
        _idleTimer?.cancel();
      case AppLifecycleState.resumed:
        if (_backgroundedAt != null) {
          final elapsed = DateTime.now().difference(_backgroundedAt!);
          if (elapsed > backgroundTimeout) {
            _onIdleTimeout(); // Session expired in background
          } else {
            _resetIdleTimer(); // Resume idle timer
          }
          _backgroundedAt = null;
        }
      default:
        break;
    }
  }
}
```

### Pattern 89.4: Concurrent Session Control

```dart
/// Server-driven single-device session enforcement
class ConcurrentSessionService {
  final Dio _dio;
  final TokenService _tokenService;
  final String _deviceId;

  ConcurrentSessionService(this._dio, this._tokenService, this._deviceId);

  /// Register device session with server
  Future<void> registerSession() async {
    await _dio.post('/auth/sessions', data: {
      'device_id': _deviceId,
      'platform': defaultTargetPlatform.name,
      'registered_at': DateTime.now().toIso8601String(),
    });
  }

  /// Handle push notification: new login on another device
  Future<void> onNewLoginDetected(Map<String, dynamic> payload) async {
    final otherDeviceId = payload['device_id'] as String?;
    if (otherDeviceId != null && otherDeviceId != _deviceId) {
      // Force logout on this device
      await _tokenService.clearTokens();
      // Show notification to user: "Logged in on another device"
    }
  }

  /// Fetch active sessions for user profile screen
  Future<List<Map<String, dynamic>>> getActiveSessions() async {
    final response = await _dio.get('/auth/sessions');
    return List<Map<String, dynamic>>.from(response.data['sessions']);
  }

  /// Revoke specific session (from user profile)
  Future<void> revokeSession(String sessionId) async {
    await _dio.delete('/auth/sessions/$sessionId');
  }
}
```

### Pattern 89.5: OAuth2/OIDC Integration

```dart
/// OAuth2 Authorization Code + PKCE flow for third-party identity providers
class OAuth2Service {
  final String clientId;
  final String redirectUri;
  final String authorizationEndpoint;
  final String tokenEndpoint;
  final TokenService _tokenService;

  OAuth2Service({
    required this.clientId,
    required this.redirectUri,
    required this.authorizationEndpoint,
    required this.tokenEndpoint,
    required TokenService tokenService,
  }) : _tokenService = tokenService;

  /// Generate PKCE code verifier + challenge
  ({String verifier, String challenge}) _generatePkce() {
    final random = Random.secure();
    final verifier = base64UrlEncode(
      List.generate(32, (_) => random.nextInt(256)),
    ).replaceAll('=', '');

    final challenge = base64UrlEncode(
      sha256.convert(utf8.encode(verifier)).bytes,
    ).replaceAll('=', '');

    return (verifier: verifier, challenge: challenge);
  }

  /// Build authorization URL with PKCE
  Uri buildAuthorizationUrl({List<String> scopes = const ['openid', 'profile']}) {
    final pkce = _generatePkce();
    // Store verifier for token exchange
    _codeVerifier = pkce.verifier;

    return Uri.parse(authorizationEndpoint).replace(queryParameters: {
      'response_type': 'code',
      'client_id': clientId,
      'redirect_uri': redirectUri,
      'scope': scopes.join(' '),
      'code_challenge': pkce.challenge,
      'code_challenge_method': 'S256',
      'state': _generateState(),
    });
  }

  String? _codeVerifier;

  /// Exchange authorization code for tokens
  Future<void> exchangeCode(String code) async {
    final response = await Dio().post(
      tokenEndpoint,
      data: {
        'grant_type': 'authorization_code',
        'code': code,
        'redirect_uri': redirectUri,
        'client_id': clientId,
        'code_verifier': _codeVerifier,
      },
      options: Options(contentType: Headers.formUrlEncodedContentType),
    );

    await _tokenService.saveTokens(
      accessToken: response.data['access_token'],
      refreshToken: response.data['refresh_token'],
    );
    _codeVerifier = null;
  }

  String _generateState() =>
      base64UrlEncode(List.generate(16, (_) => Random.secure().nextInt(256)))
          .replaceAll('=', '');
}
```

---

## MUST DO

- Use `QueuedInterceptor` (not `Interceptor`) for thread-safe token refresh
- Use separate Dio instance for refresh requests to avoid interceptor loop
- Cancel idle timer when app goes to background, check elapsed on resume
- Store PKCE code verifier only in memory (not persistent storage)
- Handle concurrent 401s — only one refresh call, others wait for result

## MUST NOT DO

- Store refresh tokens in SharedPreferences (use secure storage)
- Retry refresh infinitely (one attempt, then force logout)
- Use implicit grant flow (deprecated — use authorization code + PKCE)
- Log JWT tokens or sensitive claims in debug output
- Skip idle timeout on sensitive screens (banking, healthcare)

---

## References

- [jwt_decoder](https://pub.dev/packages/jwt_decoder)
- [dio Interceptors](https://pub.dev/packages/dio#interceptors)
- [OAuth 2.0 for Mobile Apps (RFC 8252)](https://datatracker.ietf.org/doc/html/rfc8252)
