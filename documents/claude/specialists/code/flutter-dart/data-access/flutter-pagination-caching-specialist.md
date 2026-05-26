# Flutter Pagination & Caching Specialist
# Flutterページネーション＆キャッシングスペシャリスト
# Chuyen Gia Phan Trang Va Cache Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Data, Presentation |
| **Directory Pattern** | `lib/features/{feature}/data/`, `lib/features/{feature}/presentation/bloc/` |
| **Variant** | ALL |
| **Naming Convention** | `paginated_{name}_model.dart` (data), `{name}_list_bloc.dart` (presentation). Classes: `PaginatedResponse<T>`, `{Name}ListBloc` |
| **Imports From** | Domain (entities), Data (datasources for paginated API), Presentation (BLoC for infinite scroll) |
| **Cannot Import** | N/A (cross-layer pattern spanning Data + Presentation — justified by pagination being an end-to-end concern) |
| **Pattern Numbers** | 43.1–43.5 |
| **Source Paths** | `lib/features/*/data/models/paginated_*.dart`, `lib/features/*/presentation/bloc/*_list_bloc.dart` |
| **File Count** | 1 PaginatedResponse model + 3-8 list BLoCs per enterprise app |
| **Imported By** | Presentation (list pages use pagination BLoC) |
| **Dependencies** | None (uses Dio from SP-07 File 1 + BLoC from SP-04) |
| **When To Use** | Loading large datasets — CRM contact lists, ERP inventory, Healthcare patient lists |
| **Source Skeleton** | `lib/core/models/paginated_response.dart`, `lib/features/{f}/presentation/bloc/{name}_list_bloc.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate pagination infrastructure — cursor/offset pagination models, infinite scroll BLoC, in-memory cache, stale-while-revalidate |
| **Activation Trigger** | files: lib/features/*/presentation/bloc/*_list_bloc.dart; keywords: pagination, infiniteScroll, cursor, offset, loadMore, cacheStrategy |

---

## Patterns

### Pattern 43.1: Cursor Pagination

```dart
// lib/core/models/paginated_response.dart
class PaginatedResponse<T> {
  final List<T> items;
  final String? nextCursor;
  final bool hasMore;
  final int totalCount;

  const PaginatedResponse({
    required this.items,
    this.nextCursor,
    required this.hasMore,
    required this.totalCount,
  });

  factory PaginatedResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) fromJsonT,
  ) {
    return PaginatedResponse(
      items: (json['data'] as List).map((e) => fromJsonT(e)).toList(),
      nextCursor: json['next_cursor'] as String?,
      hasMore: json['has_more'] as bool? ?? false,
      totalCount: json['total'] as int? ?? 0,
    );
  }
}

// API call with cursor
Future<PaginatedResponse<ContactModel>> getContacts({String? cursor, int limit = 50}) async {
  final response = await _dio.get('/contacts', queryParameters: {
    if (cursor != null) 'cursor': cursor,
    'limit': limit,
  });
  return PaginatedResponse.fromJson(response.data, ContactModel.fromJson);
}
```

### Pattern 43.2: Offset Pagination

```dart
class OffsetPaginatedResponse<T> {
  final List<T> items;
  final int page;
  final int pageSize;
  final int totalPages;
  final int totalCount;

  const OffsetPaginatedResponse({
    required this.items,
    required this.page,
    required this.pageSize,
    required this.totalPages,
    required this.totalCount,
  });

  bool get hasMore => page < totalPages;

  factory OffsetPaginatedResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Map<String, dynamic>) fromJsonT,
  ) {
    return OffsetPaginatedResponse(
      items: (json['data'] as List).map((e) => fromJsonT(e)).toList(),
      page: json['page'] as int,
      pageSize: json['page_size'] as int,
      totalPages: json['total_pages'] as int,
      totalCount: json['total'] as int,
    );
  }
}
```

### Pattern 43.3: Infinite Scroll with BLoC

```dart
// lib/features/contact/presentation/bloc/contact_list_bloc.dart

// Events
sealed class ContactListEvent {
  const ContactListEvent();
}
class LoadContacts extends ContactListEvent { const LoadContacts(); }
class LoadMoreContacts extends ContactListEvent { const LoadMoreContacts(); }
class RefreshContacts extends ContactListEvent { const RefreshContacts(); }

// State
@freezed
sealed class ContactListState with _$ContactListState {
  const factory ContactListState.initial() = ContactListInitial;
  const factory ContactListState.loading() = ContactListLoading;
  const factory ContactListState.loaded({
    required List<Contact> contacts,
    required bool hasReachedMax,
    required int currentPage,
    @Default(false) bool isLoadingMore,
  }) = ContactListLoaded;
  const factory ContactListState.error({required Failure failure}) = ContactListError;
}

// BLoC
class ContactListBloc extends Bloc<ContactListEvent, ContactListState> {
  final GetContacts _getContacts;

  ContactListBloc(this._getContacts) : super(const ContactListState.initial()) {
    on<LoadContacts>(_onLoad);
    on<LoadMoreContacts>(_onLoadMore, transformer: droppable());
    on<RefreshContacts>(_onRefresh);
  }

  Future<void> _onLoad(LoadContacts event, Emitter<ContactListState> emit) async {
    emit(const ContactListState.loading());
    final result = await _getContacts(const GetContactsParams(page: 1));
    result.fold(
      (failure) => emit(ContactListState.error(failure: failure)),
      (response) => emit(ContactListState.loaded(
        contacts: response.items,
        hasReachedMax: !response.hasMore,
        currentPage: 1,
      )),
    );
  }

  Future<void> _onLoadMore(LoadMoreContacts event, Emitter<ContactListState> emit) async {
    final current = state;
    if (current is! ContactListLoaded || current.hasReachedMax || current.isLoadingMore) return;

    emit(current.copyWith(isLoadingMore: true));
    final nextPage = current.currentPage + 1;
    final result = await _getContacts(GetContactsParams(page: nextPage));
    result.fold(
      (failure) => emit(current.copyWith(isLoadingMore: false)),
      (response) => emit(current.copyWith(
        contacts: [...current.contacts, ...response.items],
        hasReachedMax: !response.hasMore,
        currentPage: nextPage,
        isLoadingMore: false,
      )),
    );
  }

  Future<void> _onRefresh(RefreshContacts event, Emitter<ContactListState> emit) async {
    final result = await _getContacts(const GetContactsParams(page: 1));
    result.fold(
      (failure) => emit(ContactListState.error(failure: failure)),
      (response) => emit(ContactListState.loaded(
        contacts: response.items,
        hasReachedMax: !response.hasMore,
        currentPage: 1,
      )),
    );
  }
}

// Widget — scroll listener for infinite scroll
class ContactListView extends StatefulWidget { /* ... */ }
class _ContactListViewState extends State<ContactListView> {
  final _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  void _onScroll() {
    if (_isBottom) {
      context.read<ContactListBloc>().add(const LoadMoreContacts());
    }
  }

  bool get _isBottom {
    if (!_scrollController.hasClients) return false;
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.offset;
    return currentScroll >= (maxScroll * 0.9); // Load at 90% scroll
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<ContactListBloc, ContactListState>(
      builder: (context, state) => switch (state) {
        ContactListInitial() => const SizedBox.shrink(),
        ContactListLoading() => const Center(child: CircularProgressIndicator()),
        ContactListLoaded(:final contacts, :final hasReachedMax, :final isLoadingMore) =>
          RefreshIndicator(
            onRefresh: () async =>
                context.read<ContactListBloc>().add(const RefreshContacts()),
            child: ListView.builder(
              controller: _scrollController,
              itemCount: hasReachedMax ? contacts.length : contacts.length + 1,
              itemBuilder: (context, index) {
                if (index >= contacts.length) {
                  return const Center(child: CircularProgressIndicator());
                }
                return ContactCard(contact: contacts[index]);
              },
            ),
          ),
        ContactListError(:final failure) => Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Text(failure.message),
            ElevatedButton(
              onPressed: () => context.read<ContactListBloc>().add(const LoadContacts()),
              child: const Text('Retry'),
            ),
          ]),
        ),
      },
    );
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }
}
```

### Pattern 43.4: In-Memory Cache

```dart
class InMemoryCache<K, V> {
  final int maxSize;
  final Duration ttl;
  final _cache = <K, _CacheEntry<V>>{};

  InMemoryCache({this.maxSize = 100, this.ttl = const Duration(minutes: 5)});

  V? get(K key) {
    final entry = _cache[key];
    if (entry == null) return null;
    if (entry.isExpired) {
      _cache.remove(key);
      return null;
    }
    return entry.value;
  }

  void put(K key, V value) {
    if (_cache.length >= maxSize) {
      // Evict oldest entry (LRU)
      _cache.remove(_cache.keys.first);
    }
    _cache[key] = _CacheEntry(value, DateTime.now().add(ttl));
  }

  void invalidate(K key) => _cache.remove(key);
  void invalidateAll() => _cache.clear();
}

class _CacheEntry<V> {
  final V value;
  final DateTime expiresAt;
  _CacheEntry(this.value, this.expiresAt);
  bool get isExpired => DateTime.now().isAfter(expiresAt);
}
```

### Pattern 43.5: Stale-While-Revalidate

```dart
Future<Either<Failure, List<Contact>>> getContacts() async {
  // 1. Return cached data immediately (stale)
  final cached = _cache.get('contacts');
  if (cached != null) {
    // 2. Revalidate in background
    _revalidateContacts();
    return Right(cached);
  }

  // 3. No cache — fetch from network
  return _fetchAndCacheContacts();
}

Future<void> _revalidateContacts() async {
  try {
    final fresh = await _remoteDataSource.getContacts();
    _cache.put('contacts', fresh.map((m) => m.toEntity()).toList());
    // Notify listeners that data was refreshed
    _revalidationController.add(true);
  } catch (_) {
    // Silently fail — stale data is better than no data
  }
}
```

---

## MUST DO

- Use `droppable()` transformer for LoadMore (prevent duplicate requests)
- Load more at 90% scroll (not 100% — smoother UX)
- Show loading indicator at bottom of list during loadMore
- Support pull-to-refresh (RefreshIndicator)
- Use LRU cache with TTL for in-memory caching

## MUST NOT DO

- Load all data at once for large datasets (use pagination)
- Use setState for scroll-based loading (use BLoC)
- Forget ScrollController.dispose()
- Skip hasReachedMax check (infinite loop)

---

## References

- [Infinite List — BLoC](https://bloclibrary.dev/tutorials/flutter-infinite-list/)
- [bloc_concurrency droppable](https://pub.dev/packages/bloc_concurrency)
