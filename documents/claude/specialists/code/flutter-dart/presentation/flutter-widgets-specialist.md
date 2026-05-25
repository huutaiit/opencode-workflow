# Flutter Widgets Specialist
# Flutterウィジェットスペシャリスト
# Chuyen Gia Widget Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Directory Pattern** | `lib/features/{feature}/presentation/widgets/`, `lib/features/{feature}/presentation/pages/` |
| **Variant** | ALL |
| **Naming Convention** | `{name}_widget.dart`, `{name}_page.dart`. Classes: `{Name}Widget` (StatelessWidget/StatefulWidget), `{Name}Page` |
| **Imports From** | Domain (entities for display), Presentation (BLoC for state) |
| **Cannot Import** | Data (datasources, models, repo impls) |
| **Pattern Numbers** | 60.1–60.6 |
| **Source Paths** | `lib/features/*/presentation/widgets/*.dart`, `lib/features/*/presentation/pages/*.dart` |
| **File Count** | 20-80 widget/page files per enterprise app |
| **Imported By** | Presentation (pages compose widgets, router navigates to pages) |
| **Dependencies** | None (Flutter SDK core widgets) |
| **When To Use** | Building UI components — deciding Stateless vs Stateful, composition, key management, lifecycle |
| **Source Skeleton** | `lib/features/{f}/presentation/widgets/{name}_widget.dart`, `lib/features/{f}/presentation/pages/{name}_page.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate Flutter widgets with proper Stateless/Stateful decision, const optimization, key management, composition patterns, and lifecycle handling |
| **Activation Trigger** | files: lib/features/*/presentation/**/*.dart; keywords: widget, stateless, stateful, constConstructor, widgetKey, widgetLifecycle |

---

## Patterns

### Pattern 60.1: Stateless vs Stateful Decision

```
USE StatelessWidget when:
  ✅ Widget only depends on constructor params + inherited widgets (Theme, BLoC)
  ✅ No internal mutable state (no TextEditingController, ScrollController, AnimationController)
  ✅ No initState/dispose needed

USE StatefulWidget when:
  ✅ Has TextEditingController, ScrollController, AnimationController
  ✅ Needs initState for one-time setup (stream subscriptions, timers)
  ✅ Needs dispose for cleanup
  ✅ Uses TickerProviderStateMixin (animations)
  ✅ Needs RestorationMixin (state restoration)
```

```dart
// ✅ StatelessWidget — pure display, state from BLoC
class ContactCard extends StatelessWidget {
  final Contact contact;
  final VoidCallback? onTap;

  const ContactCard({super.key, required this.contact, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: CircleAvatar(child: Text(contact.name[0])),
        title: Text(contact.name),
        subtitle: Text(contact.email),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );
  }
}

// ✅ StatefulWidget — owns controllers
class SearchBar extends StatefulWidget {
  final ValueChanged<String> onSearch;
  const SearchBar({super.key, required this.onSearch});

  @override
  State<SearchBar> createState() => _SearchBarState();
}

class _SearchBarState extends State<SearchBar> {
  final _controller = TextEditingController();
  Timer? _debounce;

  @override
  void dispose() {
    _controller.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _controller,
      decoration: const InputDecoration(
        hintText: 'Search...',
        prefixIcon: Icon(Icons.search),
      ),
      onChanged: (value) {
        _debounce?.cancel();
        _debounce = Timer(const Duration(milliseconds: 300), () {
          widget.onSearch(value);
        });
      },
    );
  }
}
```

### Pattern 60.2: Const Constructors

```dart
// ✅ const — widget never rebuilds unless parent forces it
class AppLogo extends StatelessWidget {
  const AppLogo({super.key}); // const constructor

  @override
  Widget build(BuildContext context) {
    return const FlutterLogo(size: 48); // const child too
  }
}

// ✅ Const in widget tree — prevents unnecessary rebuilds
Column(
  children: const [
    AppLogo(),           // ← never rebuilds
    SizedBox(height: 16), // ← never rebuilds
    Text('Welcome'),      // ← never rebuilds
  ],
)

// ❌ Cannot be const — depends on runtime value
class UserGreeting extends StatelessWidget {
  final String name; // Runtime value → cannot be const
  const UserGreeting({super.key, required this.name});

  @override
  Widget build(BuildContext context) {
    return Text('Hello, $name'); // Rebuilds when name changes
  }
}
```

### Pattern 60.3: Widget Composition

```dart
// Compound widget — slots for header/body/footer
class AppCard extends StatelessWidget {
  final Widget? header;
  final Widget body;
  final Widget? footer;
  final VoidCallback? onTap;

  const AppCard({
    super.key,
    this.header,
    required this.body,
    this.footer,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (header != null) ...[header!, const SizedBox(height: 8)],
              body,
              if (footer != null) ...[const SizedBox(height: 8), footer!],
            ],
          ),
        ),
      ),
    );
  }
}

// Usage — flexible composition
AppCard(
  header: Text('Order #${order.id}', style: Theme.of(context).textTheme.titleMedium),
  body: Column(children: [
    Text('Customer: ${order.customerName}'),
    Text('Total: ${order.totalAmount.formatted}'),
  ]),
  footer: Row(children: [
    Chip(label: Text(order.status.label)),
    const Spacer(),
    Text(DateFormat('yyyy-MM-dd').format(order.createdAt)),
  ]),
  onTap: () => context.pushNamed(RouteNames.orderDetail, pathParameters: {'id': order.id}),
)
```

### Pattern 60.4: Key Management

```dart
// ValueKey — when items have stable IDs (database records)
ListView.builder(
  itemCount: contacts.length,
  itemBuilder: (context, index) => ContactCard(
    key: ValueKey(contacts[index].id), // Stable ID
    contact: contacts[index],
  ),
)

// ObjectKey — when using the object itself as identity
ReorderableListView(
  children: items.map((item) =>
    ListTile(key: ObjectKey(item), title: Text(item.name)),
  ).toList(),
  onReorder: (oldIndex, newIndex) { /* ... */ },
)

// UniqueKey — force rebuild (rare — for animations)
AnimatedSwitcher(
  child: Text(
    counter.toString(),
    key: UniqueKey(), // Force animation on every change
  ),
)
```

### Pattern 60.5: Widget Lifecycle

```dart
class DataPage extends StatefulWidget {
  final String entityId;
  const DataPage({super.key, required this.entityId});

  @override
  State<DataPage> createState() => _DataPageState();
}

class _DataPageState extends State<DataPage> {
  StreamSubscription? _subscription;

  @override
  void initState() {
    super.initState();
    // One-time setup — called once when widget inserted into tree
    _subscription = dataStream.listen(_onDataUpdate);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Called when inherited widget changes (Theme, MediaQuery, BLoC)
    // Safe to use context here (not in initState)
  }

  @override
  void didUpdateWidget(covariant DataPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Called when parent rebuilds with different params
    if (oldWidget.entityId != widget.entityId) {
      _subscription?.cancel();
      _subscription = dataStream.listen(_onDataUpdate);
    }
  }

  @override
  void dispose() {
    // ALWAYS clean up: cancel subscriptions, dispose controllers
    _subscription?.cancel();
    super.dispose();
  }

  void _onDataUpdate(Data data) {
    if (mounted) setState(() { /* update state */ });
  }

  @override
  Widget build(BuildContext context) => /* ... */;
}
```

### Pattern 60.6: Custom RenderObject (Advanced)

```dart
// CustomPainter — for charts, gauges, custom drawings
class CircularProgressPainter extends CustomPainter {
  final double progress; // 0.0 to 1.0
  final Color color;
  final double strokeWidth;

  CircularProgressPainter({
    required this.progress,
    required this.color,
    this.strokeWidth = 8.0,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.shortestSide - strokeWidth) / 2;

    // Background circle
    canvas.drawCircle(center, radius, Paint()
      ..color = color.withOpacity(0.2)
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth);

    // Progress arc
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -pi / 2,
      2 * pi * progress,
      false,
      Paint()
        ..color = color
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.round,
    );
  }

  @override
  bool shouldRepaint(CircularProgressPainter oldDelegate) =>
      progress != oldDelegate.progress || color != oldDelegate.color;
}

// Usage
CustomPaint(
  size: const Size(100, 100),
  painter: CircularProgressPainter(
    progress: 0.75,
    color: Theme.of(context).colorScheme.primary,
  ),
)
```

---

## MUST DO

- Use const constructors where possible
- Prefer StatelessWidget unless mutable state needed
- Always dispose controllers and cancel subscriptions
- Use ValueKey for list items with stable IDs
- Check `mounted` before setState in async callbacks

## MUST NOT DO

- Use StatefulWidget when StatelessWidget + BLoC suffices
- Forget to dispose controllers (memory leak)
- Use UniqueKey for list items (breaks animations/state)
- Call setState after dispose (causes error)
- Put business logic in widgets (use BLoC/Cubit)

---

## References

- [Flutter Widget Catalog](https://docs.flutter.dev/ui/widgets)
- [StatefulWidget Lifecycle](https://api.flutter.dev/flutter/widgets/State-class.html)
