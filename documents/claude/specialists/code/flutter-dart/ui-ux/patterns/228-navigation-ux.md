# Navigation UX Specialist
# ナビゲーションUXスペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 228.1–228.6 |
| **Specialist Type** | rule-set |
| **Purpose** | MD3 NavigationBar/Rail/Drawer, breadcrumb, tabs, back button |
| **Activation Trigger** | navigation, breadcrumb, sidebar, tabs, menu, drawer, back |
| **Complements** | 222.x responsive-layout, navigation-specialist |

---

## Rules

### 228.1 — MD3 Adaptive Navigation

| Window Class | Component | Widget |
|-------------|-----------|--------|
| Compact (<600dp) | Bottom nav | `NavigationBar` |
| Medium (600–840dp) | Side rail | `NavigationRail` |
| Expanded (>840dp) | Permanent drawer | `NavigationDrawer` |

```dart
// ✅ Adaptive navigation
final width = MediaQuery.sizeOf(context).width;
if (width >= 840) return _navigationDrawerLayout();
if (width >= 600) return _navigationRailLayout();
return _navigationBarLayout();
```

### 228.2 — NavigationBar (Bottom)

```dart
// ✅ MD3 NavigationBar — max 5 destinations
NavigationBar(
  selectedIndex: currentIndex,
  onDestinationSelected: (index) => setState(() => currentIndex = index),
  destinations: const [
    NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
    NavigationDestination(icon: Icon(Icons.search), label: 'Search'),
    NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Profile'),
  ],
)
```

### 228.3 — NavigationRail (Side)

```dart
// ✅ MD3 NavigationRail
NavigationRail(
  selectedIndex: currentIndex,
  onDestinationSelected: (index) => setState(() => currentIndex = index),
  labelType: NavigationRailLabelType.all,
  destinations: [...],
)
```

### 228.4 — Tabs

```dart
// ✅ MD3 TabBar
TabBar(
  controller: tabController,
  tabs: const [Tab(text: 'Overview'), Tab(text: 'Settings')],
)
```

- ✅ Max 7 tabs; overflow with scrollable TabBar
- ❌ NEVER use tabs that trigger full page navigation

### 228.5 — Back & Unsaved Changes

```dart
// ✅ WillPopScope / PopScope for unsaved changes
PopScope(
  canPop: !hasUnsavedChanges,
  onPopInvokedWithResult: (didPop, result) {
    if (!didPop) showDiscardDialog(context);
  },
  child: content,
)
```

### 228.6 — Active State

```dart
// ✅ NavigationBar/Rail handle active state automatically via selectedIndex
// ❌ NEVER manually style active state for MD3 nav components
```
