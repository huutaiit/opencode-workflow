# Flutter Dio + Retrofit Specialist
# Flutter Dio + Retrofitスペシャリスト
# Chuyen Gia Dio Va Retrofit Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Data |
| **Directory Pattern** | `lib/core/network/`, `lib/features/{feature}/data/datasources/` |
| **Variant** | ALL |
| **Naming Convention** | `{name}_remote_data_source.dart`, `api_client.dart`. Classes: `{Name}RemoteDataSource`, `ApiClient` |
| **Imports From** | Domain (entity types for response mapping), Core (network config, error types) |
| **Cannot Import** | Presentation (bloc, pages, widgets) |
| **Pattern Numbers** | 40.1–40.6 |
| **Source Paths** | `lib/core/network/*.dart`, `lib/features/*/data/datasources/*_remote_*.dart` |
| **File Count** | 1 core API client + 5-15 remote datasources per enterprise app |
| **Imported By** | Data (repository impls use datasources) |
| **Dependencies** | dio ^5.4.0, retrofit ^4.1.0, retrofit_generator ^8.1.0 (dev), json_annotation ^4.8.0 |
| **When To Use** | REST API communication — GET/POST/PUT/DELETE, auth interceptors, file upload, retry |
| **Source Skeleton** | `lib/core/network/api_client.dart`, `lib/core/network/auth_interceptor.dart`, `lib/features/{f}/data/datasources/{name}_remote_data_source.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate Dio HTTP client with interceptors and Retrofit API interfaces with code generation for type-safe REST calls |
| **Activation Trigger** | files: lib/core/network/*.dart, lib/features/*/data/datasources/*_remote_*.dart; keywords: dio, retrofit, httpClient, interceptor, apiCall, restApi |

---

## Patterns

### Pattern 40.1: Dio Client Setup

```dart
// lib/core/network/api_client.dart
import 'package:dio/dio.dart';

class ApiClient {
  late final Dio _dio;

  ApiClient({required String baseUrl, String? authToken}) {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 30),
      receiveTimeout: const Duration(seconds: 30),
      sendTimeout: const Duration(seconds: 30),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    _dio.interceptors.addAll([
      AuthInterceptor(authToken: authToken),
      LogInterceptor(
        requestBody: true,
        responseBody: true,
        logPrint: (msg) => debugPrint('HTTP: $msg'),
      ),
      RetryInterceptor(dio: _dio, retries: 3),
    ]);
  }

  Dio get dio => _dio;
}
```

### Pattern 40.2: Retrofit Code Generation

```dart
// lib/features/user/data/datasources/user_remote_data_source.dart
import 'package:dio/dio.dart';
import 'package:retrofit/retrofit.dart';
import '../models/user_model.dart';

part 'user_remote_data_source.g.dart';

@RestApi()
abstract class UserRemoteDataSource {
  factory UserRemoteDataSource(Dio dio, {String baseUrl}) = _UserRemoteDataSource;

  @GET('/users')
  Future<List<UserModel>> getUsers(
    @Query('page') int page,
    @Query('limit') int limit,
  );

  @GET('/users/{id}')
  Future<UserModel> getUser(@Path('id') String id);

  @POST('/users')
  Future<UserModel> createUser(@Body() Map<String, dynamic> body);

  @PUT('/users/{id}')
  Future<UserModel> updateUser(@Path('id') String id, @Body() Map<String, dynamic> body);

  @DELETE('/users/{id}')
  Future<void> deleteUser(@Path('id') String id);

  @POST('/users/{id}/avatar')
  @MultiPart()
  Future<UserModel> uploadAvatar(
    @Path('id') String id,
    @Part(name: 'file') File avatar,
  );
}
```

### Pattern 40.3: Interceptors

```dart
// lib/core/network/auth_interceptor.dart
class AuthInterceptor extends Interceptor {
  final TokenService _tokenService;

  AuthInterceptor(this._tokenService);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await _tokenService.getAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // Try refresh token
      final newToken = await _tokenService.refreshToken();
      if (newToken != null) {
        // Retry original request with new token
        err.requestOptions.headers['Authorization'] = 'Bearer $newToken';
        final response = await _tokenService.dio.fetch(err.requestOptions);
        return handler.resolve(response);
      }
      // Refresh failed — force logout
      _tokenService.clearTokens();
    }
    handler.next(err);
  }
}

// Retry interceptor with exponential backoff
class RetryInterceptor extends Interceptor {
  final Dio dio;
  final int retries;

  RetryInterceptor({required this.dio, this.retries = 3});

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (_shouldRetry(err) && err.requestOptions.extra['retryCount'] == null) {
      for (int i = 0; i < retries; i++) {
        await Future.delayed(Duration(seconds: pow(2, i).toInt()));
        try {
          err.requestOptions.extra['retryCount'] = i + 1;
          final response = await dio.fetch(err.requestOptions);
          return handler.resolve(response);
        } catch (_) {
          continue;
        }
      }
    }
    handler.next(err);
  }

  bool _shouldRetry(DioException err) =>
      err.type == DioExceptionType.connectionTimeout ||
      err.type == DioExceptionType.receiveTimeout ||
      (err.response?.statusCode ?? 0) >= 500;
}
```

### Pattern 40.4: Error Handling

```dart
// lib/core/network/network_error_handler.dart
import '../../core/errors/exceptions.dart';
import '../../core/errors/failures.dart';

Either<Failure, T> handleDioError<T>(DioException e) {
  return Left(switch (e.type) {
    DioExceptionType.connectionTimeout ||
    DioExceptionType.sendTimeout ||
    DioExceptionType.receiveTimeout =>
      const NetworkFailure('Connection timeout — check your internet'),
    DioExceptionType.badResponse => _handleStatusCode(e.response),
    DioExceptionType.connectionError =>
      const NetworkFailure('No internet connection'),
    DioExceptionType.cancel =>
      const NetworkFailure('Request cancelled'),
    _ => ServerFailure(e.message ?? 'Unknown network error'),
  });
}

Failure _handleStatusCode(Response? response) {
  final statusCode = response?.statusCode ?? 0;
  final message = response?.data?['message'] ?? 'Server error';

  return switch (statusCode) {
    400 => ValidationFailure(message, field: response?.data?['field'] ?? ''),
    401 => const AuthFailure('Session expired — please login again'),
    403 => PermissionFailure(message, permission: ''),
    404 => ServerFailure('Not found: $message', statusCode: 404),
    422 => ValidationFailure(message, field: response?.data?['field'] ?? ''),
    >= 500 => ServerFailure('Server error: $message', statusCode: statusCode),
    _ => ServerFailure(message, statusCode: statusCode),
  };
}
```

### Pattern 40.5: Multipart Upload

```dart
Future<Either<Failure, String>> uploadDocument(File file, {void Function(int, int)? onProgress}) async {
  try {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        file.path,
        filename: file.path.split('/').last,
      ),
      'type': 'document',
    });

    final response = await _dio.post(
      '/documents/upload',
      data: formData,
      onSendProgress: onProgress,
    );

    return Right(response.data['url'] as String);
  } on DioException catch (e) {
    return handleDioError(e);
  }
}
```

### Pattern 40.6: Cancel Tokens

```dart
class SearchBloc extends Bloc<SearchEvent, SearchState> {
  CancelToken? _cancelToken;

  Future<void> _onSearchQueryChanged(SearchQueryChanged event, Emitter emit) async {
    // Cancel previous request
    _cancelToken?.cancel('New search query');
    _cancelToken = CancelToken();

    emit(const SearchState.searching());
    try {
      final results = await _searchApi.search(
        event.query,
        cancelToken: _cancelToken,
      );
      emit(SearchState.results(results));
    } on DioException catch (e) {
      if (e.type != DioExceptionType.cancel) {
        emit(SearchState.error(e.message ?? 'Search failed'));
      }
    }
  }

  @override
  Future<void> close() {
    _cancelToken?.cancel('BLoC closed');
    return super.close();
  }
}
```

---

## MUST DO

- Use Retrofit for type-safe API definitions
- Implement auth interceptor with 401→refresh→retry flow
- Map DioException to typed Failure (not generic catch)
- Cancel requests on page navigation / BLoC close
- Use exponential backoff for retry

## MUST NOT DO

- Hardcode API URLs (use AppConfig from DI)
- Use raw Dio in presentation layer (always via DataSource)
- Catch DioException as generic Exception
- Forget CancelToken cleanup in BLoC.close()

---

## References

- [dio Package](https://pub.dev/packages/dio)
- [retrofit Package](https://pub.dev/packages/retrofit)
