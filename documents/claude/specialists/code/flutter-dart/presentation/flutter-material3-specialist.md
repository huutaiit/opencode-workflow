# Flutter Material 3 Specialist
# Flutter Material 3スペシャリスト
# Chuyen Gia Material 3 Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation, Core |
| **Directory Pattern** | `lib/core/theme/`, `lib/features/{feature}/presentation/pages/` |
| **Variant** | ALL |
| **Naming Convention** | `app_theme.dart`, `app_colors.dart`. Classes: `AppTheme`, `AppColorScheme` |
| **Imports From** | Core (theme tokens), Presentation (applies theme to widgets) |
| **Cannot Import** | Data, Domain |
| **Pattern Numbers** | 61.1–61.5 |
| **Source Paths** | `lib/core/theme/*.dart`, `lib/features/*/presentation/**/*.dart` |
| **File Count** | 3-5 theme files + applied across all pages/widgets |
| **Imported By** | ALL presentation widgets (Theme.of(context) used everywhere) |
| **Dependencies** | None (Flutter SDK Material 3 built-in) |
| **When To Use** | Setting up Material 3 theme, color scheme, typography, adaptive/responsive layouts |
| **Source Skeleton** | `lib/core/theme/app_theme.dart`, `lib/core/theme/app_colors.dart`, `lib/core/theme/app_text_styles.dart` |
| **Specialist Type** | code |
| **Purpose** | Generate Material 3 theme configuration with ColorScheme.fromSeed, light/dark modes, responsive breakpoints, and adaptive layouts |
| **Activation Trigger** | files: lib/core/theme/*.dart; keywords: material3, themeData, colorScheme, typography, responsive, adaptive, breakpoint |

---

## Patterns

### Pattern 61.1: MaterialApp + ThemeData Setup

```dart
// lib/core/theme/app_theme.dart
import 'package:flutter/material.dart';
import 'app_colors.dart';
import 'app_text_styles.dart';

class AppTheme {
  static ThemeData get light => ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.primarySeed,
      brightness: Brightness.light,
    ),
    textTheme: AppTextStyles.textTheme,
    appBarTheme: const AppBarTheme(centerTitle: true, elevation: 0),
    cardTheme: CardTheme(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
      filled: true,
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(double.infinity, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
    ),
  );

  static ThemeData get dark => ThemeData(
    useMaterial3: true,
    colorScheme: ColorScheme.fromSeed(
      seedColor: AppColors.primarySeed,
      brightness: Brightness.dark,
    ),
    textTheme: AppTextStyles.textTheme,
    appBarTheme: const AppBarTheme(centerTitle: true, elevation: 0),
    cardTheme: CardTheme(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
      filled: true,
    ),
  );
}

// main.dart
MaterialApp.router(
  theme: AppTheme.light,
  darkTheme: AppTheme.dark,
  themeMode: ThemeMode.system, // Follow device setting
  // ...
)
```

### Pattern 61.2: ColorScheme + Typography

```dart
// lib/core/theme/app_colors.dart
class AppColors {
  static const primarySeed = Color(0xFF1A73E8); // Brand primary

  // Semantic status colors (use in chips, badges, indicators)
  static const success = Color(0xFF2E7D32);
  static const warning = Color(0xFFED6C02);
  static const error = Color(0xFFD32F2F);
  static const info = Color(0xFF0288D1);
}

// lib/core/theme/app_text_styles.dart
class AppTextStyles {
  static TextTheme get textTheme => TextTheme(
    displayLarge: GoogleFonts.notoSansJP(fontSize: 57, fontWeight: FontWeight.w400),
    headlineLarge: GoogleFonts.notoSansJP(fontSize: 32, fontWeight: FontWeight.w600),
    headlineMedium: GoogleFonts.notoSansJP(fontSize: 28, fontWeight: FontWeight.w500),
    titleLarge: GoogleFonts.notoSansJP(fontSize: 22, fontWeight: FontWeight.w500),
    titleMedium: GoogleFonts.notoSansJP(fontSize: 16, fontWeight: FontWeight.w500),
    bodyLarge: GoogleFonts.notoSansJP(fontSize: 16, fontWeight: FontWeight.w400),
    bodyMedium: GoogleFonts.notoSansJP(fontSize: 14, fontWeight: FontWeight.w400),
    labelLarge: GoogleFonts.notoSansJP(fontSize: 14, fontWeight: FontWeight.w500),
  );
}

// Usage — always use semantic names, never hardcode
Text('Title', style: Theme.of(context).textTheme.titleLarge)
Container(color: Theme.of(context).colorScheme.primaryContainer)
```

### Pattern 61.3: Material 3 Components

```dart
// Bottom Navigation — M3 NavigationBar
NavigationBar(
  selectedIndex: currentIndex,
  onDestinationSelected: onTabChanged,
  destinations: const [
    NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard), label: 'Dashboard'),
    NavigationDestination(icon: Icon(Icons.contacts_outlined), selectedIcon: Icon(Icons.contacts), label: 'Contacts'),
    NavigationDestination(icon: Icon(Icons.inventory_2_outlined), selectedIcon: Icon(Icons.inventory_2), label: 'Orders'),
    NavigationDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings), label: 'Settings'),
  ],
)

// Tablet — NavigationRail (side navigation)
NavigationRail(
  selectedIndex: currentIndex,
  onDestinationSelected: onTabChanged,
  labelType: NavigationRailLabelType.all,
  destinations: const [
    NavigationRailDestination(icon: Icon(Icons.dashboard), label: Text('Dashboard')),
    NavigationRailDestination(icon: Icon(Icons.contacts), label: Text('Contacts')),
  ],
)

// Segmented Button — filter/tab selection
SegmentedButton<OrderStatus>(
  segments: const [
    ButtonSegment(value: OrderStatus.pending, label: Text('Pending')),
    ButtonSegment(value: OrderStatus.processing, label: Text('Processing')),
    ButtonSegment(value: OrderStatus.shipped, label: Text('Shipped')),
  ],
  selected: {selectedStatus},
  onSelectionChanged: (Set<OrderStatus> newSelection) {
    setState(() => selectedStatus = newSelection.first);
  },
)

// SearchBar — M3 search
SearchAnchor(
  builder: (context, controller) => SearchBar(
    controller: controller,
    hintText: 'Search contacts...',
    leading: const Icon(Icons.search),
    onTap: () => controller.openView(),
  ),
  suggestionsBuilder: (context, controller) async {
    final results = await searchContacts(controller.text);
    return results.map((c) => ListTile(
      title: Text(c.name),
      onTap: () { controller.closeView(c.name); navigateToContact(c); },
    ));
  },
)
```

### Pattern 61.4: Adaptive Layouts

```dart
// Platform-adaptive: Material on Android, Cupertino on iOS
Widget buildAdaptiveDialog(BuildContext context) {
  final isIOS = Theme.of(context).platform == TargetPlatform.iOS;

  if (isIOS) {
    return CupertinoAlertDialog(
      title: const Text('Confirm'),
      content: const Text('Delete this contact?'),
      actions: [
        CupertinoDialogAction(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
        CupertinoDialogAction(onPressed: () { /* delete */ }, isDestructiveAction: true, child: const Text('Delete')),
      ],
    );
  }

  return AlertDialog(
    title: const Text('Confirm'),
    content: const Text('Delete this contact?'),
    actions: [
      TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
      FilledButton(onPressed: () { /* delete */ }, child: const Text('Delete')),
    ],
  );
}
```

### Pattern 61.5: Responsive Breakpoints

```dart
// Enterprise dashboard — responsive layout
class DashboardPage extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth >= 1200) return _DesktopDashboard();   // Expanded
        if (constraints.maxWidth >= 600) return _TabletDashboard();     // Medium
        return _MobileDashboard();                                      // Compact
      },
    );
  }
}

// Responsive grid — adapts columns
class ResponsiveGrid extends StatelessWidget {
  final List<Widget> children;
  const ResponsiveGrid({super.key, required this.children});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final crossAxisCount = switch (constraints.maxWidth) {
          >= 1200 => 4,
          >= 900 => 3,
          >= 600 => 2,
          _ => 1,
        };
        return GridView.count(
          crossAxisCount: crossAxisCount,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
          children: children,
        );
      },
    );
  }
}

// Breakpoint constants
class Breakpoints {
  static const compact = 600.0;   // Phone
  static const medium = 840.0;    // Tablet portrait
  static const expanded = 1200.0; // Tablet landscape / Desktop
}
```

---

## MUST DO

- Use `useMaterial3: true` in ThemeData
- Use `ColorScheme.fromSeed()` for consistent color generation
- Use semantic text styles from Theme.of(context).textTheme
- Support light + dark mode via ThemeMode
- Use LayoutBuilder for responsive breakpoints

## MUST NOT DO

- Hardcode colors (always use Theme.of(context).colorScheme.*)
- Hardcode font sizes (use textTheme.*)
- Use Material 2 components (use NavigationBar not BottomNavigationBar)
- Skip dark mode support
- Use fixed widths for layouts (use responsive breakpoints)

---

## References

- [Material 3 Design](https://m3.material.io/)
- [Flutter Material 3](https://docs.flutter.dev/ui/design/material)
