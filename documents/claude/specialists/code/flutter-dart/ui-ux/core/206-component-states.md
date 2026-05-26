# Component States Specialist
# コンポーネントステートスペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 206.1–206.9 |
| **Specialist Type** | rule-set |
| **Purpose** | MD3 interactive states, MaterialState, InkWell, GestureDetector |
| **Activation Trigger** | (always loaded — core/) |
| **Complements** | — |

---

## Rules

### 206.1 — Default State

```dart
ElevatedButton(onPressed: onAction, child: Text('Action'))
```

### 206.2 — Hover State (MD3: 8% overlay)

```dart
// ✅ MD3 handles hover via Material widget inkwell
// ElevatedButton, TextButton, etc. have built-in hover
// Custom: use InkWell or InkResponse

InkWell(
  onTap: onTap,
  borderRadius: BorderRadius.circular(8),
  child: content,
)
```

### 206.3 — Focus State (MD3: Focus ring)

```dart
// ✅ MD3 Material widgets handle focus automatically
// Custom focus via FocusNode
Focus(
  onFocusChange: (hasFocus) => setState(() => _focused = hasFocus),
  child: Container(
    decoration: BoxDecoration(
      border: _focused ? Border.all(color: colorScheme.primary, width: 2) : null,
    ),
  ),
)
```

### 206.4 — Pressed State (MD3: 10% overlay)

```dart
// ✅ InkWell handles press ripple automatically
// Timing: 200ms ripple expansion
```

### 206.5 — Disabled State (MD3: 38% opacity)

```dart
// ✅ Set onPressed to null for disabled
ElevatedButton(onPressed: null, child: Text('Disabled'))

// ✅ Custom disabled
Opacity(
  opacity: isDisabled ? 0.38 : 1.0,
  child: IgnorePointer(ignoring: isDisabled, child: content),
)

// ❌ WRONG: Visual-only disable without IgnorePointer — still tappable
Opacity(opacity: 0.38, child: button)  // → user can still tap
```

### 206.6 — Loading State

```dart
// ✅ Button with loading
ElevatedButton(
  onPressed: isLoading ? null : onSubmit,
  child: isLoading
    ? const SizedBox(width: 20, height: 20,
        child: CircularProgressIndicator(strokeWidth: 2))
    : const Text('保存'),
)

// ✅ Shimmer loading
Shimmer.fromColors(
  baseColor: Colors.grey[300]!,
  highlightColor: Colors.grey[100]!,
  child: Container(height: 16, width: 200, color: Colors.white),
)
```

### 206.7 — Error State

```dart
// ✅ TextField error
TextField(
  decoration: InputDecoration(
    errorText: 'メールアドレスは必須です',
    errorBorder: OutlineInputBorder(
      borderSide: BorderSide(color: colorScheme.error),
    ),
    prefixIcon: Icon(Icons.error, color: colorScheme.error),
  ),
)
```

### 206.8 — Selected State (MD3: 8-12% primary overlay)

```dart
// ✅ Selected list tile
ListTile(
  selected: isSelected,
  selectedTileColor: colorScheme.primaryContainer,
  selectedColor: colorScheme.onPrimaryContainer,
  leading: Icon(Icons.check),
  title: Text(item.name),
)
```

### 206.9 — Dragged State

```dart
// ✅ Dragging appearance
Draggable<Item>(
  feedback: Material(
    elevation: 6,
    borderRadius: BorderRadius.circular(8),
    child: Opacity(opacity: 0.8, child: content),
  ),
  childWhenDragging: Opacity(opacity: 0.3, child: content),
)
```
