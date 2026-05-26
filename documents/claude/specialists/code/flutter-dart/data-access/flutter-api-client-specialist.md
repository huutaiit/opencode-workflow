# Flutter API Client + Repository Implementation Specialist
# Flutter APIクライアント＋リポジトリ実装スペシャリスト
# Chuyen Gia API Client Va Repository Impl Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Data |
| **Directory Pattern** | `lib/features/{feature}/data/datasources/`, `lib/features/{feature}/data/repositories/` |
| **Variant** | ALL |
| **Naming Convention** | `{name}_remote_data_source.dart`, `{name}_local_data_source.dart`, `{name}_repository_impl.dart`. Classes: `{Name}RemoteDataSource`, `{Name}RepositoryImpl` |
| **Imports From** | Domain (repository interfaces, entities), Core (network, database, errors) |
| **Cannot Import** | Presentation (bloc, pages, widgets) |
| **Pattern Numbers** | 42.1–42.5 |
| **Source Paths** | `lib/features/*/data/datasources/*.dart`, `lib/features/*/data/repositories/*.dart` |
| **File Count** | 2-3 datasource files + 1 repo impl per feature, 15-45 files per enterprise app |
| **Imported By** | Domain (repo impl registered via DI against interface) |
| **Dependencies** | connectivity_plus ^6.0.0 (for network check) |
| **When To Use** | Implementing repository pattern — combining remote + local datasources with connectivity-aware fallback |
| **Source Skeleton** | `lib/features/{f}/data/datasources/{name}_remote_data_source.dart`, `{name}_local_data_source.dart`, `lib/features/{f}/data/repositories/{name}_repository_impl.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate DataSource interfaces, implementations, and Repository impls combining remote+local with connectivity-aware fallback |
| **Activation Trigger** | files: lib/features/*/data/datasources/*.dart, lib/features/*/data/repositories/*.dart; keywords: dataSource, repositoryImpl, remoteLocal, connectivityAware, cacheStrategy |

---

## Patterns

### Pattern 42.1: Abstract DataSource Interface

```dart
// lib/features/contact/data/datasources/contact_remote_data_source.dart
import '../models/contact_model.dart';

abstract class ContactRemoteDataSource {
  Future<List<ContactModel>> getContacts({int page = 1, int limit = 50});
  Future<ContactModel> getContact(String id);
  Future<ContactModel> createContact(Map<String, dynamic> data);
  Future<ContactModel> updateContact(String id, Map<String, dynamic> data);
  Future<void> deleteContact(String id);
  Future<List<ContactModel>> searchContacts(String query);
}

abstract class ContactLocalDataSource {
  Future<List<ContactModel>> getCachedContacts();
  Future<ContactModel?> getCachedContact(String id);
  Future<void> cacheContacts(List<ContactModel> contacts);
  Future<void> cacheContact(ContactModel contact);
  Future<void> deleteContact(String id);
  Future<DateTime?> getLastCacheTime();
  Future<void> clearCache();
}
```

### Pattern 42.2: Remote DataSource Implementation

```dart
class ContactRemoteDataSourceImpl implements ContactRemoteDataSource {
  final Dio _dio;

  ContactRemoteDataSourceImpl(this._dio);

  @override
  Future<List<ContactModel>> getContacts({int page = 1, int limit = 50}) async {
    try {
      final response = await _dio.get('/contacts', queryParameters: {
        'page': page,
        'limit': limit,
      });
      return (response.data['data'] as List)
          .map((json) => ContactModel.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw ServerException(
        e.response?.data?['message'] ?? 'Failed to fetch contacts',
        statusCode: e.response?.statusCode,
      );
    }
  }

  @override
  Future<ContactModel> createContact(Map<String, dynamic> data) async {
    try {
      final response = await _dio.post('/contacts', data: data);
      return ContactModel.fromJson(response.data);
    } on DioException catch (e) {
      throw ServerException(
        e.response?.data?['message'] ?? 'Failed to create contact',
        statusCode: e.response?.statusCode,
      );
    }
  }

  // ... other methods follow same pattern
}
```

### Pattern 42.3: Local DataSource Implementation

```dart
class ContactLocalDataSourceImpl implements ContactLocalDataSource {
  final ContactDao _contactDao;

  ContactLocalDataSourceImpl(this._contactDao);

  @override
  Future<List<ContactModel>> getCachedContacts() async {
    final rows = await _contactDao.getAllContacts();
    return rows.map((row) => ContactModel.fromDriftRow(row)).toList();
  }

  @override
  Future<void> cacheContacts(List<ContactModel> contacts) async {
    await _contactDao.insertOrUpdateAll(
      contacts.map((c) => c.toCompanion()).toList(),
    );
  }

  @override
  Future<DateTime?> getLastCacheTime() async {
    final latest = await _contactDao.getLatestUpdatedAt();
    return latest;
  }

  @override
  Future<void> clearCache() async {
    await _contactDao.deleteAll();
  }
}
```

### Pattern 42.4: Repository Implementation

```dart
// lib/features/contact/data/repositories/contact_repository_impl.dart
class ContactRepositoryImpl implements ContactRepository {
  final ContactRemoteDataSource _remoteDataSource;
  final ContactLocalDataSource _localDataSource;
  final NetworkInfo _networkInfo;

  ContactRepositoryImpl({
    required ContactRemoteDataSource remoteDataSource,
    required ContactLocalDataSource localDataSource,
    required NetworkInfo networkInfo,
  })  : _remoteDataSource = remoteDataSource,
        _localDataSource = localDataSource,
        _networkInfo = networkInfo;

  @override
  Future<Either<Failure, List<Contact>>> getContacts({int page = 1}) async {
    if (await _networkInfo.isConnected) {
      try {
        final models = await _remoteDataSource.getContacts(page: page);
        // Cache for offline access
        await _localDataSource.cacheContacts(models);
        return Right(models.map((m) => m.toEntity()).toList());
      } on ServerException catch (e) {
        return Left(ServerFailure(e.message, statusCode: e.statusCode));
      }
    } else {
      // Offline — return cached data
      try {
        final cached = await _localDataSource.getCachedContacts();
        if (cached.isEmpty) {
          return const Left(CacheFailure('No cached contacts available'));
        }
        return Right(cached.map((m) => m.toEntity()).toList());
      } on CacheException catch (e) {
        return Left(CacheFailure(e.message));
      }
    }
  }

  @override
  Future<Either<Failure, Contact>> createContact(Contact contact) async {
    if (await _networkInfo.isConnected) {
      try {
        final model = await _remoteDataSource.createContact(
          ContactModel.fromEntity(contact).toJson(),
        );
        await _localDataSource.cacheContact(model);
        return Right(model.toEntity());
      } on ServerException catch (e) {
        return Left(ServerFailure(e.message, statusCode: e.statusCode));
      }
    } else {
      // Offline — queue for sync (see SP-13 sync specialist)
      return const Left(NetworkFailure('Cannot create contact while offline'));
    }
  }
}
```

### Pattern 42.5: Connectivity-Aware Repository

```dart
// lib/core/network/network_info.dart
abstract class NetworkInfo {
  Future<bool> get isConnected;
  Stream<bool> get onConnectivityChanged;
}

class NetworkInfoImpl implements NetworkInfo {
  final Connectivity _connectivity;

  NetworkInfoImpl(this._connectivity);

  @override
  Future<bool> get isConnected async {
    final result = await _connectivity.checkConnectivity();
    return !result.contains(ConnectivityResult.none);
  }

  @override
  Stream<bool> get onConnectivityChanged {
    return _connectivity.onConnectivityChanged.map(
      (results) => !results.contains(ConnectivityResult.none),
    );
  }
}
```

---

## MUST DO

- Separate Remote and Local DataSource interfaces
- Repository impl catches Exception → returns Either<Failure, T>
- Cache remote data locally for offline access
- Use NetworkInfo to check connectivity before remote calls
- DataSource throws exceptions; Repository converts to Failure

## MUST NOT DO

- Return raw exceptions from repository (always Either)
- Import Presentation from Data layer
- Skip caching in online mode (always cache for offline fallback)
- Use connectivity check in presentation layer (repository handles it)

---

## References

- [Repository Pattern](https://resocoder.com/flutter-clean-architecture-tdd/)
- [connectivity_plus](https://pub.dev/packages/connectivity_plus)
