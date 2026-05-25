# Empty, Error & Loading States Specialist
# 空状態・エラー・ローディングスペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 225.1–225.7 |
| **Specialist Type** | rule-set |
| **Purpose** | Empty state, error UI, shimmer loading, progress, optimistic UI |
| **Activation Trigger** | empty state, error, loading, skeleton, shimmer, progress |
| **Complements** | 206.x component-states, 220.x status-color |

---

## Rules

### 225.1 — Empty State

Every data container MUST have an empty state with: illustration + message + CTA.

- ❌ WRONG: Blank white space when data is empty
- ❌ WRONG: Empty state without actionable CTA

```dart
// ✅ Empty state with illustration + message + CTA
Center(
  child: Column(mainAxisSize: MainAxisSize.min, children: [
    Icon(Icons.inbox, size: 48, color: colorScheme.onSurfaceVariant),
    const SizedBox(height: 16),
    Text('No results found', style: textTheme.titleMedium),
    const SizedBox(height: 8),
    Text('Try adjusting your filters', style: textTheme.bodyMedium?.copyWith(color: colorScheme.onSurfaceVariant)),
    const SizedBox(height: 24),
    FilledButton(onPressed: onClearFilters, child: Text('Clear Filters')),
  ]),
)
```

### 225.2 — Error State

```dart
// ✅ Error with retry
Center(
  child: Column(mainAxisSize: MainAxisSize.min, children: [
    Icon(Icons.error_outline, size: 48, color: colorScheme.error),
    const SizedBox(height: 16),
    Text('Something went wrong', style: textTheme.titleMedium),
    const SizedBox(height: 24),
    FilledButton(onPressed: onRetry, child: Text('Try Again')),
  ]),
)
```

### 225.3 — Shimmer Loading

```dart
// ✅ Shimmer placeholder (package: shimmer)
Shimmer.fromColors(
  baseColor: Colors.grey[300]!,
  highlightColor: Colors.grey[100]!,
  child: Column(children: [
    Container(height: 16, width: double.infinity, color: Colors.white),
    const SizedBox(height: 8),
    Container(height: 16, width: 200, color: Colors.white),
  ]),
)
```

### 225.4 — Loading Indicators

| Context | Widget |
|---------|--------|
| Full page | `CircularProgressIndicator()` centered |
| Button | `SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))` |
| Pull-to-refresh | `RefreshIndicator()` |
| List loading | `LinearProgressIndicator()` at top |

### 225.5 — Progress

```dart
// ✅ Determinate progress
LinearProgressIndicator(value: 0.6)
CircularProgressIndicator(value: 0.6)
```

### 225.6 — Optimistic UI

```dart
// ✅ Update state immediately, rollback on error
void handleLike() {
  setState(() => isLiked = true);
  api.like(id).catchError((_) => setState(() => isLiked = false));
}
```

### 225.7 — Offline Indicator

```dart
// ✅ Connectivity banner
if (!isOnline)
  MaterialBanner(
    content: Text('You are offline. Changes will sync when reconnected.'),
    actions: [TextButton(onPressed: onDismiss, child: Text('Dismiss'))],
  )
```
