# Flutter Error Handling Specialist
# Flutter エラーハンドリングスペシャリスト
# Chuyen Gia Xu Ly Loi Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — error handling spans every layer) |
| **Directory Pattern** | `lib/core/errors/`, `lib/core/widgets/` |
| **Variant** | ALL |
| **Naming Convention** | `error_handler.dart`, `error_boundary_widget.dart`. Classes: `ErrorHandler`, `ErrorBoundaryWidget` |
| **Imports From** | ALL (catches errors from every layer) |
| **Cannot Import** | N/A (error handler needs access to all layers by design) |
| **Pattern Numbers** | 99.1–99.4 |
| **Source Paths** | `lib/core/errors/*.dart`, `lib/core/widgets/error_boundary*.dart`, `lib/main.dart` |
| **File Count** | 2-3 error handling files + main.dart setup |
| **Imported By** | ALL (every layer uses error handling infrastructure) |
| **Dependencies** | None (Flutter SDK FlutterError, PlatformDispatcher, Zone built-in) |
| **When To Use** | Global error catching setup, error boundary widgets, failure→user message mapping |
| **Source Skeleton** | `lib/core/errors/error_handler.dart`, `lib/core/widgets/error_boundary_widget.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate global error handling with FlutterError.onError, Zone-based async catching, error boundary widget, and Failure→user message mapping |
| **Activation Trigger** | files: lib/core/errors/*.dart, lib/main.dart; keywords: errorHandler, errorBoundary, flutterError, zonedGuarded, failureMessage |

---

## Patterns

### Pattern 99.1: Global Error Handler

```dart
/// Global error handler — catches BOTH sync and async unhandled errors
class ErrorHandler {
  final void Function(Object error, StackTrace stack)? onError;

  ErrorHandler({this.onError});

  /// Initialize in main.dart — catches ALL unhandled errors
  void initialize() {
    // 1. Flutter framework errors (widget build, layout, rendering)
    FlutterError.onError = (FlutterErrorDetails details) {
      FlutterError.presentError(details); // Default: dump to console
      _handleError(details.exception, details.stack ?? StackTrace.current);
    };

    // 2. Async errors not caught by Flutter framework
    PlatformDispatcher.instance.onError = (error, stack) {
      _handleError(error, stack);
      return true; // Handled — don't crash
    };
  }

  void _handleError(Object error, StackTrace stack) {
    // Log to crash reporting service
    debugPrint('ERROR: $error');
    debugPrint('STACK: $stack');
    onError?.call(error, stack);
  }
}

/// main.dart setup — wrap runApp in Zone for complete coverage
void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final errorHandler = ErrorHandler(
    onError: (error, stack) {
      // Send to Crashlytics, Sentry, etc.
    },
  );
  errorHandler.initialize();

  // Zone catches async errors not caught by Flutter or PlatformDispatcher
  runZonedGuarded(
    () => runApp(const MyApp()),
    (error, stack) {
      errorHandler._handleError(error, stack);
    },
  );
}
```

### Pattern 99.2: Zone-Based Async Error Catching

```dart
/// Zone guard for feature-level error isolation
class ZoneErrorGuard {
  /// Run a function with error isolation
  static Future<T?> run<T>(
    Future<T> Function() action, {
    required void Function(Object error, StackTrace stack) onError,
  }) async {
    try {
      return await action();
    } catch (error, stack) {
      onError(error, stack);
      return null;
    }
  }

  /// Wrap a BLoC event handler with error catching
  static Future<void> guardBlocEvent(
    Future<void> Function() handler, {
    required void Function(Object, StackTrace) onError,
  }) async {
    try {
      await handler();
    } catch (error, stack) {
      onError(error, stack);
    }
  }
}

/// BLoC error observer — catches unhandled errors in all BLoCs
class AppBlocObserver extends BlocObserver {
  @override
  void onError(BlocBase bloc, Object error, StackTrace stackTrace) {
    super.onError(bloc, error, stackTrace);
    debugPrint('BLoC Error [${bloc.runtimeType}]: $error');
    // Report to crash service
  }

  @override
  void onTransition(Bloc bloc, Transition transition) {
    super.onTransition(bloc, transition);
    // Optional: log state transitions for debugging
  }
}

// Register in main.dart
// Bloc.observer = AppBlocObserver();
```

### Pattern 99.3: Error Boundary Widget

```dart
/// Widget-level error boundary — prevents crashes from propagating
class ErrorBoundaryWidget extends StatefulWidget {
  final Widget child;
  final Widget Function(Object error)? errorBuilder;

  const ErrorBoundaryWidget({
    super.key,
    required this.child,
    this.errorBuilder,
  });

  @override
  State<ErrorBoundaryWidget> createState() => _ErrorBoundaryWidgetState();
}

class _ErrorBoundaryWidgetState extends State<ErrorBoundaryWidget> {
  Object? _error;

  @override
  void initState() {
    super.initState();
    // Override ErrorWidget.builder for this subtree
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return widget.errorBuilder?.call(_error!) ??
          _DefaultErrorWidget(error: _error!);
    }

    // Wrap in custom error widget builder
    return Builder(
      builder: (context) {
        ErrorWidget.builder = (FlutterErrorDetails details) {
          // In debug: show red error screen
          // In release: show friendly error widget
          if (kDebugMode) {
            return ErrorWidget(details.exception);
          }
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (mounted) setState(() => _error = details.exception);
          });
          return const SizedBox.shrink();
        };
        return widget.child;
      },
    );
  }
}

class _DefaultErrorWidget extends StatelessWidget {
  final Object error;

  const _DefaultErrorWidget({required this.error});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 48, color: Colors.red.shade300),
          const SizedBox(height: 16),
          Text(
            'Something went wrong',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: () {
              // Retry or navigate back
            },
            child: const Text('Try Again'),
          ),
        ],
      ),
    );
  }
}
```

### Pattern 99.4: Failure→Message Mapping

```dart
/// Typed failure hierarchy
sealed class Failure {
  final String message;
  final Object? originalError;

  const Failure(this.message, [this.originalError]);
}

class NetworkFailure extends Failure {
  final int? statusCode;
  const NetworkFailure(super.message, {this.statusCode, super.originalError});
}

class CacheFailure extends Failure {
  const CacheFailure(super.message, [super.originalError]);
}

class ValidationFailure extends Failure {
  final Map<String, String> fieldErrors;
  const ValidationFailure(super.message, {this.fieldErrors = const {}});
}

class AuthenticationFailure extends Failure {
  const AuthenticationFailure(super.message, [super.originalError]);
}

/// Map failures to user-friendly messages
class FailureMessageMapper {
  static String toUserMessage(Failure failure, {String locale = 'en'}) {
    switch (failure) {
      case NetworkFailure(statusCode: 401):
        return _l(locale, 'Session expired. Please log in again.',
            'Phiên đã hết hạn. Vui lòng đăng nhập lại.',
            'セッションが期限切れです。再ログインしてください。');
      case NetworkFailure(statusCode: 403):
        return _l(locale, 'You do not have permission for this action.',
            'Bạn không có quyền thực hiện thao tác này.',
            'この操作を行う権限がありません。');
      case NetworkFailure(statusCode: 404):
        return _l(locale, 'The requested resource was not found.',
            'Không tìm thấy tài nguyên yêu cầu.',
            'リクエストされたリソースが見つかりません。');
      case NetworkFailure(statusCode: >= 500):
        return _l(locale, 'Server error. Please try again later.',
            'Lỗi máy chủ. Vui lòng thử lại sau.',
            'サーバーエラーです。後でもう一度お試しください。');
      case NetworkFailure():
        return _l(locale, 'Network error. Check your connection.',
            'Lỗi mạng. Kiểm tra kết nối của bạn.',
            'ネットワークエラーです。接続を確認してください。');
      case CacheFailure():
        return _l(locale, 'Failed to load cached data.',
            'Không thể tải dữ liệu đã lưu.',
            'キャッシュデータの読み込みに失敗しました。');
      case ValidationFailure():
        return failure.message; // Already user-friendly
      case AuthenticationFailure():
        return _l(locale, 'Authentication failed. Please try again.',
            'Xác thực thất bại. Vui lòng thử lại.',
            '認証に失敗しました。もう一度お試しください。');
    }
  }

  static String _l(String locale, String en, String vi, String ja) {
    switch (locale) {
      case 'vi': return vi;
      case 'ja': return ja;
      default: return en;
    }
  }
}
```

---

## MUST DO

- Set up BOTH FlutterError.onError AND PlatformDispatcher.onError
- Use runZonedGuarded to catch async errors outside Flutter framework
- Register AppBlocObserver for BLoC error logging
- Map Failure types to user-friendly messages (never show raw errors)
- Show friendly error widget in release mode (not red error screen)

## MUST NOT DO

- Silently swallow errors without logging
- Show raw exception messages to users (security + UX risk)
- Use try/catch everywhere (let global handler catch unexpected errors)
- Forget PlatformDispatcher.onError (catches errors FlutterError misses)
- Crash the app on recoverable errors (show error boundary instead)

---

## References

- [Flutter Error Handling](https://docs.flutter.dev/testing/errors)
- [Zone-Based Error Handling](https://dart.dev/libraries/dart-async#handling-errors)
