# Flutter Google Maps + GPS Specialist
# Flutter Google Maps＋GPSスペシャリスト
# Chuyen Gia Google Maps Va GPS Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation, Data |
| **Directory Pattern** | `lib/features/{feature}/presentation/widgets/`, `lib/features/{feature}/data/datasources/` |
| **Variant** | ALL |
| **Naming Convention** | `{name}_map_widget.dart`, `location_data_source.dart`. Classes: `{Name}MapWidget`, `LocationDataSource` |
| **Imports From** | Domain (entities for marker data), Data (location API), Presentation (map widget embedding) |
| **Cannot Import** | N/A (maps span Presentation+Data — justified by map being an end-to-end concern) |
| **Pattern Numbers** | 112.1–112.7 |
| **Source Paths** | `lib/features/*/presentation/widgets/*_map*.dart`, `lib/features/*/data/datasources/*_location*.dart` |
| **File Count** | 2-4 map/location files per feature |
| **Imported By** | Presentation (pages embed map widgets), Data (location datasource for tracking) |
| **Dependencies** | google_maps_flutter ^2.6.0, geolocator ^11.0.0, geocoding ^2.2.0 |
| **When To Use** | Map display, marker management, route tracking, geofencing, address geocoding |
| **Source Skeleton** | `lib/features/{f}/presentation/widgets/{f}_map_widget.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate Google Maps integration with markers, polylines, user location tracking, geocoding, geofencing, and cluster management |
| **Activation Trigger** | files: lib/features/*/presentation/widgets/*_map*.dart; keywords: googleMaps, marker, polyline, geolocation, geocoding, geofencing, mapCluster |

---

## Patterns

### Pattern 112.1: Google Maps Setup

```dart
import 'package:google_maps_flutter/google_maps_flutter.dart';

class MapWidget extends StatefulWidget {
  final LatLng initialPosition;
  final Set<Marker> markers;
  final double initialZoom;

  const MapWidget({
    super.key,
    required this.initialPosition,
    this.markers = const {},
    this.initialZoom = 14.0,
  });

  @override
  State<MapWidget> createState() => _MapWidgetState();
}

class _MapWidgetState extends State<MapWidget> {
  GoogleMapController? _controller;

  @override
  Widget build(BuildContext context) {
    return GoogleMap(
      initialCameraPosition: CameraPosition(
        target: widget.initialPosition,
        zoom: widget.initialZoom,
      ),
      markers: widget.markers,
      myLocationEnabled: true,
      myLocationButtonEnabled: true,
      mapToolbarEnabled: false,
      zoomControlsEnabled: false,
      onMapCreated: (controller) => _controller = controller,
    );
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }
}

// Android: add API key in AndroidManifest.xml
// <meta-data android:name="com.google.android.geo.API_KEY" android:value="YOUR_KEY"/>
// iOS: add in AppDelegate.swift
// GMSServices.provideAPIKey("YOUR_KEY")
```

### Pattern 112.2: Marker Management

```dart
Set<Marker> buildMarkers(List<Location> locations) {
  return locations.map((loc) => Marker(
    markerId: MarkerId(loc.id),
    position: LatLng(loc.latitude, loc.longitude),
    infoWindow: InfoWindow(title: loc.name, snippet: loc.address),
    icon: BitmapDescriptor.defaultMarkerWithHue(BitmapDescriptor.hueRed),
    onTap: () => _onMarkerTap(loc),
  )).toSet();
}
```

### Pattern 112.3: Polylines (Route Display)

```dart
Set<Polyline> buildRoute(List<LatLng> points) {
  return {
    Polyline(
      polylineId: const PolylineId('route'),
      points: points,
      color: Colors.blue,
      width: 4,
    ),
  };
}
```

### Pattern 112.4: User Location Tracking

```dart
Stream<Position> trackUserLocation() {
  return Geolocator.getPositionStream(
    locationSettings: const LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10,
    ),
  );
}
```

### Pattern 112.5: Geocoding (Address↔Coordinates)

```dart
import 'package:geocoding/geocoding.dart';

Future<String?> getAddress(double lat, double lng) async {
  final placemarks = await placemarkFromCoordinates(lat, lng);
  if (placemarks.isEmpty) return null;
  final p = placemarks.first;
  return '${p.street}, ${p.locality}, ${p.country}';
}

Future<LatLng?> getCoordinates(String address) async {
  final locations = await locationFromAddress(address);
  if (locations.isEmpty) return null;
  return LatLng(locations.first.latitude, locations.first.longitude);
}
```

### Pattern 112.6: Geofencing

```dart
class GeofenceService {
  bool isInsideCircle(LatLng point, LatLng center, double radiusMeters) {
    final distance = Geolocator.distanceBetween(
      point.latitude, point.longitude,
      center.latitude, center.longitude,
    );
    return distance <= radiusMeters;
  }
}
```

### Pattern 112.7: Map Camera Animation

```dart
Future<void> animateToPosition(GoogleMapController controller, LatLng target) async {
  await controller.animateCamera(CameraUpdate.newLatLngZoom(target, 16));
}

Future<void> fitBounds(GoogleMapController controller, List<LatLng> points) async {
  final bounds = _calculateBounds(points);
  await controller.animateCamera(CameraUpdate.newLatLngBounds(bounds, 50));
}

LatLngBounds _calculateBounds(List<LatLng> points) {
  double minLat = points.first.latitude, maxLat = points.first.latitude;
  double minLng = points.first.longitude, maxLng = points.first.longitude;
  for (final p in points) {
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLng) minLng = p.longitude;
    if (p.longitude > maxLng) maxLng = p.longitude;
  }
  return LatLngBounds(southwest: LatLng(minLat, minLng), northeast: LatLng(maxLat, maxLng));
}
```

---

## MUST DO

- Store Google Maps API key securely (not hardcoded in source)
- Dispose GoogleMapController in dispose()
- Use distanceFilter in location streams (reduce battery drain)
- Handle location permission before showing map
- Test on both Android and iOS (rendering differences)

## MUST NOT DO

- Commit API keys to source control
- Request `locationAlways` without justification (use `whenInUse`)
- Create markers in build() without caching (causes rebuilds)
- Skip bounds check when animating camera (crash on empty list)
- Track location at maximum accuracy continuously (battery drain)

---

## References

- [google_maps_flutter](https://pub.dev/packages/google_maps_flutter)
- [geolocator](https://pub.dev/packages/geolocator)
- [geocoding](https://pub.dev/packages/geocoding)
