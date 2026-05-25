# Flutter List Performance Specialist
# Flutter リストパフォーマンススペシャリスト
# Chuyen Gia Hieu Suat Danh Sach Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — optimization applies to Presentation rendering + Data loading) |
| **Directory Pattern** | `lib/features/{feature}/presentation/widgets/`, `lib/features/{feature}/presentation/pages/` |
| **Variant** | ALL |
| **Naming Convention** | N/A (optimization patterns applied to existing list widgets, not new file creation) |
| **Imports From** | N/A (performance rules applied to existing code) |
| **Cannot Import** | N/A (performance rules — no import restrictions of their own) |
| **Pattern Numbers** | 85.1–85.5 |
| **Source Paths** | `lib/features/*/presentation/**/*.dart` |
| **File Count** | Cross-cutting: applies to all list/scroll widgets in project |
| **Imported By** | N/A (optimization rules, not importable code) |
| **Dependencies** | cached_network_image ^3.3.0 (for image caching) |
| **When To Use** | Optimizing list/scroll performance — ERP inventory (1000+ items), CRM contact lists |
| **Source Skeleton** | N/A (optimization patterns on existing list widgets) |
| **Specialist Type** | rule-set |
| **Purpose** | Enforce list rendering performance best practices — ListView.builder, SliverList, image caching, memory management, lazy loading |
| **Activation Trigger** | files: lib/features/*/presentation/**/*.dart; keywords: listView, sliverList, scrollPerformance, imageCaching, lazyLoading, memoryLeak |

---

## Patterns

### Pattern 85.1: ListView.builder vs ListView

```dart
// ❌ BAD — builds ALL items upfront (1000+ items = OOM risk)
ListView(
  children: items.map((item) => ItemTile(item: item)).toList(),
)

// ✅ GOOD — builds items lazily as they scroll into view
ListView.builder(
  itemCount: items.length,
  itemBuilder: (context, index) => ItemTile(item: items[index]),
)

// ✅ BEST — fixed height items: set itemExtent for O(1) scroll calculations
ListView.builder(
  itemCount: items.length,
  itemExtent: 72.0, // Fixed height → Flutter skips layout for offscreen items
  itemBuilder: (context, index) => ItemTile(item: items[index]),
)

// ✅ ALTERNATIVE — prototypeItem (Flutter measures ONE item, assumes all same)
ListView.builder(
  itemCount: items.length,
  prototypeItem: ItemTile(item: items.first),
  itemBuilder: (context, index) => ItemTile(item: items[index]),
)

// Memory impact comparison (1000 items):
// ListView:         ~1000 widgets built immediately (~200MB for complex items)
// ListView.builder: ~15-20 widgets built (viewport only, ~3MB)
// itemExtent:       ~15-20 widgets + O(1) scroll offset calculation

/// Paginated list for server-backed data (10,000+ records)
class PaginatedListView extends StatefulWidget {
  final Future<List<dynamic>> Function(int page, int pageSize) fetchPage;
  final Widget Function(BuildContext, dynamic) itemBuilder;
  final int pageSize;

  const PaginatedListView({
    super.key,
    required this.fetchPage,
    required this.itemBuilder,
    this.pageSize = 20,
  });

  @override
  State<PaginatedListView> createState() => _PaginatedListViewState();
}

class _PaginatedListViewState extends State<PaginatedListView> {
  final _items = <dynamic>[];
  int _currentPage = 0;
  bool _hasMore = true;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadMore();
  }

  Future<void> _loadMore() async {
    if (_isLoading || !_hasMore) return;
    _isLoading = true;

    final newItems = await widget.fetchPage(_currentPage, widget.pageSize);
    setState(() {
      _items.addAll(newItems);
      _currentPage++;
      _hasMore = newItems.length == widget.pageSize;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      itemCount: _items.length + (_hasMore ? 1 : 0),
      itemBuilder: (context, index) {
        if (index >= _items.length) {
          _loadMore();
          return const Center(child: CircularProgressIndicator());
        }
        return widget.itemBuilder(context, _items[index]);
      },
    );
  }
}
```

### Pattern 85.2: SliverList + CustomScrollView

```dart
/// Mixed sliver layouts — complex scroll views
CustomScrollView(
  slivers: [
    // Collapsing app bar
    SliverAppBar(
      expandedHeight: 200,
      pinned: true,
      flexibleSpace: FlexibleSpaceBar(title: Text('Inventory')),
    ),

    // Search/filter bar (pinned)
    SliverPersistentHeader(
      pinned: true,
      delegate: _SearchBarDelegate(height: 56),
    ),

    // Grid section (categories)
    SliverGrid(
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        mainAxisSpacing: 8,
        crossAxisSpacing: 8,
      ),
      delegate: SliverChildBuilderDelegate(
        (context, index) => CategoryCard(category: categories[index]),
        childCount: categories.length,
      ),
    ),

    // List section (items — potentially 1000+)
    SliverList.builder(
      itemCount: items.length,
      itemBuilder: (context, index) => ItemTile(item: items[index]),
    ),
  ],
)

// SliverPersistentHeader delegate
class _SearchBarDelegate extends SliverPersistentHeaderDelegate {
  final double height;
  _SearchBarDelegate({required this.height});

  @override double get minExtent => height;
  @override double get maxExtent => height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: Theme.of(context).colorScheme.surface,
      child: const SearchBar(),
    );
  }

  @override
  bool shouldRebuild(covariant SliverPersistentHeaderDelegate oldDelegate) => false;
}
```

### Pattern 85.3: Image Caching

```dart
import 'package:cached_network_image/cached_network_image.dart';

/// Cached network images with placeholder and error handling
CachedNetworkImage(
  imageUrl: item.imageUrl,
  width: 56,
  height: 56,
  fit: BoxFit.cover,
  // Placeholder while loading
  placeholder: (context, url) => Container(
    color: Colors.grey.shade200,
    child: const Icon(Icons.image, color: Colors.grey),
  ),
  // Error widget
  errorWidget: (context, url, error) => Container(
    color: Colors.grey.shade200,
    child: const Icon(Icons.broken_image, color: Colors.grey),
  ),
  // Memory cache limit (default: 1000 images)
  memCacheHeight: 112, // 2x display size for retina
  memCacheWidth: 112,
)

/// Configure global cache settings
class ImageCacheConfig {
  static void configure() {
    // Limit memory cache (default: 1000 images, 100MB)
    PaintingBinding.instance.imageCache.maximumSize = 500;
    PaintingBinding.instance.imageCache.maximumSizeBytes = 50 * 1024 * 1024; // 50MB
  }

  /// Pre-cache critical images (app logo, common icons)
  static Future<void> precacheImages(BuildContext context) async {
    await Future.wait([
      precacheImage(const AssetImage('assets/logo.png'), context),
      // Add other critical images
    ]);
  }
}
```

### Pattern 85.4: Memory Management

```dart
/// Proper disposal pattern for StatefulWidget
class DataListPage extends StatefulWidget {
  const DataListPage({super.key});

  @override
  State<DataListPage> createState() => _DataListPageState();
}

class _DataListPageState extends State<DataListPage> {
  late final StreamSubscription _subscription;
  late final ScrollController _scrollController;
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();
    _subscription = dataStream.listen(_onData);
  }

  @override
  void dispose() {
    _subscription.cancel();    // Cancel stream subscriptions
    _scrollController.dispose(); // Dispose controllers
    _debounceTimer?.cancel();   // Cancel timers
    super.dispose();
  }

  void _onData(dynamic data) {
    if (!mounted) return; // Check mounted before setState
    setState(() { /* update state */ });
  }

  @override
  Widget build(BuildContext context) => const Placeholder();
}

// ❌ Common memory leak: not canceling subscriptions
// ❌ Common memory leak: setState after dispose
// ❌ Common memory leak: holding references to BuildContext in callbacks
```

### Pattern 85.5: Lazy Loading

```dart
/// Deferred widget loading — load heavy widgets only when needed
class LazyLoadedWidget extends StatelessWidget {
  const LazyLoadedWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: Future.delayed(Duration.zero), // Defer to next frame
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const SizedBox.shrink(); // Placeholder
        }
        return const HeavyChartWidget(); // Load after frame
      },
    );
  }
}

/// Route-level lazy loading with deferred imports
/// Split large features into separate deferred libraries
///
/// ```dart
/// import 'package:app/features/reports/report_page.dart' deferred as reports;
///
/// GoRoute(
///   path: '/reports',
///   builder: (context, state) {
///     return FutureBuilder(
///       future: reports.loadLibrary(),
///       builder: (context, snapshot) {
///         if (snapshot.connectionState == ConnectionState.done) {
///           return reports.ReportPage();
///         }
///         return const LoadingPage();
///       },
///     );
///   },
/// )
/// ```
```

---

## MUST DO

- Use ListView.builder for lists with 20+ items (lazy building)
- Set itemExtent for fixed-height items (O(1) scroll performance)
- Dispose all controllers, subscriptions, timers in StatefulWidget.dispose()
- Set image memCacheHeight/Width to 2x display size (retina)
- Check `mounted` before calling setState in async callbacks

## MUST NOT DO

- Use ListView with children array for large datasets (builds all upfront)
- Hold references to BuildContext across async gaps
- Forget to cancel stream subscriptions (memory leak)
- Load all images at full resolution (set cache dimensions)
- Use setState in initState (use addPostFrameCallback instead)

---

## References

- [Flutter Performance Best Practices](https://docs.flutter.dev/perf/best-practices)
- [cached_network_image](https://pub.dev/packages/cached_network_image)
- [ListView.builder](https://api.flutter.dev/flutter/widgets/ListView/ListView.builder.html)
