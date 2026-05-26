# Flutter Map Clustering Specialist
# Flutter マップクラスタリングスペシャリスト
# Chuyen Gia Gom Cum Ban Do Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Directory Pattern** | `lib/features/{feature}/presentation/widgets/` |
| **Variant** | ALL |
| **Naming Convention** | `{name}_cluster_widget.dart`. Classes: `{Name}ClusterWidget`, `ClusterManager` |
| **Imports From** | Presentation (map widget), Domain (location entities) |
| **Cannot Import** | Data |
| **Pattern Numbers** | 113.1–113.4 |
| **Source Paths** | `lib/features/*/presentation/widgets/*_cluster*.dart` |
| **File Count** | 1-2 cluster management files |
| **Imported By** | Presentation (map pages use cluster widget) |
| **Dependencies** | google_maps_cluster_manager ^3.0.0 (or flutter_map_marker_cluster) |
| **When To Use** | Displaying 100+ map markers efficiently — delivery fleet, store locator, asset tracking |
| **Source Skeleton** | `lib/features/{f}/presentation/widgets/{f}_cluster_widget.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate marker clustering for Google Maps with custom cluster icons, tap handling, and performance optimization for large datasets |
| **Activation Trigger** | files: lib/features/*/presentation/widgets/*_cluster*.dart; keywords: markerCluster, clusterManager, mapClustering, largeDatasetMap |

---

## Patterns

### Pattern 113.1: Basic Clustering

```dart
/// Cluster manager for 1000+ markers
class MapClusterManager {
  late ClusterManager<MapItem> _clusterManager;
  Set<Marker> _markers = {};

  void initialize({
    required List<MapItem> items,
    required Function(Set<Marker>) onMarkersUpdated,
  }) {
    _clusterManager = ClusterManager<MapItem>(
      items,
      (markers) {
        _markers = markers;
        onMarkersUpdated(markers);
      },
      markerBuilder: _buildMarker,
      levels: const [1, 4.25, 6.75, 8.25, 11.5, 14.5, 16, 16.5, 20],
    );
  }

  Future<Marker> _buildMarker(Cluster<MapItem> cluster) async {
    return Marker(
      markerId: MarkerId(cluster.getId()),
      position: cluster.location,
      icon: await _getClusterIcon(cluster),
      infoWindow: cluster.isMultiple
          ? InfoWindow(title: '${cluster.count} items')
          : InfoWindow(title: cluster.items.first.name),
    );
  }

  Future<BitmapDescriptor> _getClusterIcon(Cluster<MapItem> cluster) async {
    if (!cluster.isMultiple) return BitmapDescriptor.defaultMarker;
    // Custom cluster icon with count
    final size = cluster.count < 10 ? 80.0 : cluster.count < 100 ? 100.0 : 120.0;
    return BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueAzure);
  }

  void onCameraMove(CameraPosition position) => _clusterManager.onCameraMove(position);
  void updateMap() => _clusterManager.updateMap();
}

class MapItem with ClusterItem {
  final String id;
  final String name;
  final LatLng position;

  MapItem({required this.id, required this.name, required this.position});

  @override
  LatLng get location => position;
}
```

### Pattern 113.2: Custom Cluster Rendering

```dart
/// Paint custom cluster markers with count badge
Future<BitmapDescriptor> createClusterBitmap(int count, {double size = 100}) async {
  final pictureRecorder = PictureRecorder();
  final canvas = Canvas(pictureRecorder);
  final paint = Paint()..color = Colors.blue;

  canvas.drawCircle(Offset(size / 2, size / 2), size / 2, paint);

  final textPainter = TextPainter(
    text: TextSpan(
      text: count.toString(),
      style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold),
    ),
    textDirection: TextDirection.ltr,
  )..layout();

  textPainter.paint(canvas, Offset((size - textPainter.width) / 2, (size - textPainter.height) / 2));

  final image = await pictureRecorder.endRecording().toImage(size.toInt(), size.toInt());
  final data = await image.toByteData(format: ImageByteFormat.png);

  return BitmapDescriptor.bytes(data!.buffer.asUint8List());
}
```

### Pattern 113.3: Cluster Tap Handling

```dart
void onClusterTap(Cluster<MapItem> cluster, GoogleMapController controller) {
  if (cluster.isMultiple) {
    // Zoom in to expand cluster
    controller.animateCamera(CameraUpdate.newLatLngZoom(cluster.location, 16));
  } else {
    // Single item — show detail
    _showItemDetail(cluster.items.first);
  }
}
```

### Pattern 113.4: Performance for Large Datasets

```dart
/// Load markers in viewport only (10,000+ items)
class ViewportAwareLoader {
  final List<MapItem> _allItems;

  ViewportAwareLoader(this._allItems);

  List<MapItem> getItemsInBounds(LatLngBounds bounds) {
    return _allItems.where((item) =>
      item.position.latitude >= bounds.southwest.latitude &&
      item.position.latitude <= bounds.northeast.latitude &&
      item.position.longitude >= bounds.southwest.longitude &&
      item.position.longitude <= bounds.northeast.longitude
    ).toList();
  }
}
```

---

## MUST DO

- Use clustering for 50+ markers (rendering performance)
- Load markers for visible viewport only (10,000+ datasets)
- Cache cluster icons to avoid re-rendering on every zoom
- Handle cluster tap → zoom in to expand
- Test with realistic data volumes (1000+ items)

## MUST NOT DO

- Render all markers without clustering (crashes on 500+)
- Recreate cluster manager on every build
- Use complex cluster icons without caching (slow rendering)
- Ignore zoom level in cluster configuration (wrong grouping)
- Block main thread with marker data processing (use Isolate)

---

## References

- [google_maps_cluster_manager](https://pub.dev/packages/google_maps_cluster_manager)
