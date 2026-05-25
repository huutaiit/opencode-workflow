# Flutter Observability Specialist
# Flutter オブザーバビリティスペシャリスト
# Chuyen Gia Quan Sat Ung Dung Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — logging/tracing spans every layer) |
| **Directory Pattern** | `lib/core/services/` |
| **Variant** | ALL |
| **Naming Convention** | `logger_service.dart`, `performance_tracer.dart`. Classes: `LoggerService`, `PerformanceTracer` |
| **Imports From** | ALL (logging captures events from every layer) |
| **Cannot Import** | N/A (logging is cross-cutting by design) |
| **Pattern Numbers** | 101.1–101.5 |
| **Source Paths** | `lib/core/services/logger*.dart`, `lib/core/services/performance*.dart` |
| **File Count** | 2-3 logging/tracing files |
| **Imported By** | ALL (every service, repository, BLoC uses LoggerService) |
| **Dependencies** | logger ^2.2.0 |
| **When To Use** | Structured logging, performance tracing, network request logging for enterprise debugging |
| **Source Skeleton** | `lib/core/services/logger_service.dart`, `lib/core/services/performance_tracer.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate structured logging service with levels, filtering, performance tracing, network request logging, and crash report with sanitized stack trace |
| **Activation Trigger** | files: lib/core/services/logger*.dart; keywords: logging, structuredLog, performanceTrace, networkLogging, crashReport |

---

## Patterns

### Pattern 101.1: Structured Logging

```dart
import 'package:logger/logger.dart';

/// Enterprise-grade structured logging service
class LoggerService {
  late final Logger _logger;
  final String _module;

  LoggerService(this._module, {LogLevel minimumLevel = LogLevel.debug}) {
    _logger = Logger(
      printer: _StructuredPrinter(module: _module),
      level: _mapLevel(minimumLevel),
      filter: ProductionFilter(), // Only log in debug, or use custom
    );
  }

  void debug(String message, [dynamic data]) =>
      _logger.d(message, error: data);

  void info(String message, [dynamic data]) =>
      _logger.i(message, error: data);

  void warning(String message, [dynamic data]) =>
      _logger.w(message, error: data);

  void error(String message, [Object? error, StackTrace? stack]) =>
      _logger.e(message, error: error, stackTrace: stack);

  void fatal(String message, [Object? error, StackTrace? stack]) =>
      _logger.f(message, error: error, stackTrace: stack);

  Level _mapLevel(LogLevel level) {
    switch (level) {
      case LogLevel.debug: return Level.debug;
      case LogLevel.info: return Level.info;
      case LogLevel.warning: return Level.warning;
      case LogLevel.error: return Level.error;
    }
  }
}

enum LogLevel { debug, info, warning, error }

/// Structured JSON-compatible printer for enterprise log aggregation
class _StructuredPrinter extends LogPrinter {
  final String module;

  _StructuredPrinter({required this.module});

  @override
  List<String> log(LogEvent event) {
    final timestamp = DateTime.now().toIso8601String();
    final level = event.level.name.toUpperCase();
    final message = event.message;

    // JSON-compatible format for log aggregation (ELK, Datadog, CloudWatch)
    final structured = {
      'timestamp': timestamp,
      'level': level,
      'module': module,
      'message': message,
      if (event.error != null) 'error': event.error.toString(),
      if (event.stackTrace != null) 'stack': _sanitizeStack(event.stackTrace!),
    };

    return ['${jsonEncode(structured)}'];
  }

  String _sanitizeStack(StackTrace stack) {
    // Limit stack trace depth and remove framework internals
    return stack.toString()
        .split('\n')
        .where((line) => !line.contains('package:flutter/'))
        .take(10)
        .join('\n');
  }
}

// Usage
// final logger = LoggerService('OrderBloc');
// logger.info('Order created', {'orderId': '123', 'total': 50.0});
// logger.error('Failed to submit order', error, stackTrace);
```

### Pattern 101.2: Log Filtering

```dart
/// Environment-aware log filtering
class AppLogFilter extends LogFilter {
  final LogLevel minimumLevel;

  AppLogFilter({this.minimumLevel = LogLevel.debug});

  @override
  bool shouldLog(LogEvent event) {
    if (kReleaseMode) {
      // Release: only warnings and errors
      return event.level.index >= Level.warning.index;
    }
    if (kProfileMode) {
      // Profile: info and above
      return event.level.index >= Level.info.index;
    }
    // Debug: everything
    return event.level.index >= _mapLevel(minimumLevel).index;
  }

  Level _mapLevel(LogLevel level) {
    switch (level) {
      case LogLevel.debug: return Level.debug;
      case LogLevel.info: return Level.info;
      case LogLevel.warning: return Level.warning;
      case LogLevel.error: return Level.error;
    }
  }
}

/// Module-specific log level overrides
class LogConfig {
  static final _moduleLevels = <String, LogLevel>{
    'NetworkClient': LogLevel.warning, // Reduce network noise
    'SyncEngine': LogLevel.info,       // Monitor sync operations
    'AuthBloc': LogLevel.debug,        // Debug auth issues
  };

  static LogLevel levelFor(String module) =>
      _moduleLevels[module] ?? LogLevel.debug;
}
```

### Pattern 101.3: Performance Tracing

```dart
/// Measure and report operation durations
class PerformanceTracer {
  final LoggerService _logger;

  PerformanceTracer(this._logger);

  /// Trace a synchronous operation
  T trace<T>(String operationName, T Function() action) {
    final stopwatch = Stopwatch()..start();
    try {
      final result = action();
      stopwatch.stop();
      _report(operationName, stopwatch.elapsedMilliseconds);
      return result;
    } catch (e) {
      stopwatch.stop();
      _report(operationName, stopwatch.elapsedMilliseconds, error: e);
      rethrow;
    }
  }

  /// Trace an async operation
  Future<T> traceAsync<T>(
    String operationName,
    Future<T> Function() action,
  ) async {
    final stopwatch = Stopwatch()..start();
    try {
      final result = await action();
      stopwatch.stop();
      _report(operationName, stopwatch.elapsedMilliseconds);
      return result;
    } catch (e) {
      stopwatch.stop();
      _report(operationName, stopwatch.elapsedMilliseconds, error: e);
      rethrow;
    }
  }

  void _report(String operation, int durationMs, {Object? error}) {
    final data = {
      'operation': operation,
      'duration_ms': durationMs,
      if (error != null) 'error': error.toString(),
    };

    if (durationMs > 1000) {
      _logger.warning('Slow operation: $operation (${durationMs}ms)', data);
    } else {
      _logger.debug('$operation completed (${durationMs}ms)', data);
    }
  }
}

// Usage
// final result = await tracer.traceAsync('fetchOrders', () => repo.getOrders());
```

### Pattern 101.4: Network Request Logging

```dart
/// Dio interceptor for structured network request logging
class NetworkLogInterceptor extends Interceptor {
  final LoggerService _logger;

  NetworkLogInterceptor(this._logger);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    _logger.debug('→ ${options.method} ${options.uri}', {
      'headers': _sanitizeHeaders(options.headers),
      'body_size': options.data?.toString().length ?? 0,
    });
    handler.next(options);
  }

  @override
  void onResponse(Response response, ResponseInterceptorHandler handler) {
    final duration = DateTime.now()
        .difference(response.requestOptions.extra['_startTime'] ?? DateTime.now())
        .inMilliseconds;

    _logger.info(
      '← ${response.statusCode} ${response.requestOptions.method} ${response.requestOptions.uri}',
      {
        'status': response.statusCode,
        'duration_ms': duration,
        'body_size': response.data?.toString().length ?? 0,
      },
    );
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    _logger.error(
      '✗ ${err.requestOptions.method} ${err.requestOptions.uri}',
      err,
      err.stackTrace,
    );
    handler.next(err);
  }

  /// Remove sensitive headers (Authorization, cookies)
  Map<String, dynamic> _sanitizeHeaders(Map<String, dynamic> headers) {
    final sanitized = Map<String, dynamic>.from(headers);
    sanitized.remove('Authorization');
    sanitized.remove('Cookie');
    sanitized.remove('Set-Cookie');
    return sanitized;
  }
}
```

### Pattern 101.5: Crash Report with Sanitized Stack

```dart
/// Generate crash report for manual submission or log upload
class CrashReportService {
  final LoggerService _logger;

  CrashReportService(this._logger);

  /// Generate structured crash report
  Map<String, dynamic> generateReport({
    required Object error,
    required StackTrace stack,
    Map<String, dynamic>? context,
  }) {
    return {
      'timestamp': DateTime.now().toIso8601String(),
      'error_type': error.runtimeType.toString(),
      'error_message': error.toString(),
      'stack_trace': _sanitizeStackTrace(stack),
      'device_info': _getDeviceInfo(),
      'app_info': _getAppInfo(),
      if (context != null) 'context': _sanitizeContext(context),
    };
  }

  /// Sanitize stack trace — remove framework internals, limit depth
  List<String> _sanitizeStackTrace(StackTrace stack) {
    return stack.toString()
        .split('\n')
        .where((line) => line.isNotEmpty)
        .where((line) => !line.contains('package:flutter/'))
        .where((line) => !line.contains('dart:'))
        .take(20)
        .toList();
  }

  /// Remove sensitive data from context
  Map<String, dynamic> _sanitizeContext(Map<String, dynamic> context) {
    final sanitized = Map<String, dynamic>.from(context);
    // Remove PII and secrets
    for (final key in ['password', 'token', 'secret', 'ssn', 'credit_card']) {
      sanitized.remove(key);
    }
    return sanitized;
  }

  Map<String, String> _getDeviceInfo() => {
        'platform': Platform.operatingSystem,
        'version': Platform.operatingSystemVersion,
        'locale': Platform.localeName,
      };

  Map<String, String> _getAppInfo() => {
        'name': 'MyApp',
        'build': 'determined at runtime',
      };
}
```

---

## MUST DO

- Use structured JSON-compatible log format for enterprise aggregation
- Filter logs by environment (debug: all, release: warning+error only)
- Sanitize headers in network logs (remove Authorization, Cookie)
- Limit stack trace depth and remove framework internals
- Trace slow operations (> 1s) with warning level

## MUST NOT DO

- Log PII (email, phone, tokens) in any log level
- Leave debug-level logging enabled in release builds
- Log full request/response bodies (size + security risk)
- Use print() directly (use LoggerService for consistent format)
- Skip sanitization in crash reports (may contain sensitive context)

---

## References

- [logger](https://pub.dev/packages/logger)
- [Flutter DevTools Performance](https://docs.flutter.dev/tools/devtools/performance)
