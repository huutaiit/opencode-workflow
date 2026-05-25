# Icon System Specialist
# アイコンシステムスペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 205.1–205.6 |
| **Specialist Type** | rule-set |
| **Purpose** | Icon sizing, Material Symbols, naming conventions |
| **Activation Trigger** | (always loaded — core/) |
| **Complements** | — |

---

## Rules

### 205.1 — Sizing Scale

| Size | dp | Use |
|------|-----|-----|
| xs | 16 | Inline badges, tags |
| sm | 20 | Inline with text |
| md | 24 | Buttons, default (MD3 standard) |
| lg | 32 | Navigation, standalone |
| xl | 40 | Empty states, feature icons |
| 2xl | 48 | Hero sections |

```dart
// ✅ Consistent sizing
Icon(Icons.check_circle, size: 20, color: successColor)  // inline
Icon(Icons.search, size: 24)                               // button
Icon(Icons.inbox, size: 40, color: colorScheme.onSurfaceVariant)  // empty state
```

### 205.2 — Outlined vs Filled Convention

- **Outlined**: Default — lighter, modern feel
- **Filled**: Active/selected states only
- ❌ NEVER mix outlined and filled in same context

```dart
// ✅ Outlined by default, filled when active
Icon(isActive ? Icons.favorite : Icons.favorite_border)
Icon(isSelected ? Icons.star : Icons.star_border)
```

### 205.3 — Custom SVG Icons

```dart
// ✅ SvgPicture for custom icons
SvgPicture.asset(
  'assets/icons/custom.svg',
  width: 24, height: 24,
  colorFilter: ColorFilter.mode(colorScheme.primary, BlendMode.srcIn),
)
```

- ✅ Use `colorFilter` to inherit theme color
- ❌ NEVER hardcode colors in SVG assets

### 205.4 — Icon + Text Alignment

```dart
// ✅ Row with icon and text
Row(
  mainAxisSize: MainAxisSize.min,
  children: [
    Icon(Icons.calendar_today, size: 16),
    const SizedBox(width: 6),
    Text('2026年4月5日', style: textTheme.bodySmall),
  ],
)
```

### 205.5 — Naming Conventions (Material Icons)

| Category | Pattern | Example |
|----------|---------|---------|
| Action | `Icons.{action}` | `Icons.edit`, `Icons.delete` |
| Status | `Icons.{status}_circle` | `Icons.check_circle`, `Icons.cancel` |
| Navigation | `Icons.{direction}` | `Icons.chevron_left`, `Icons.menu` |
| Content | `Icons.{object}` | `Icons.file_copy`, `Icons.person` |

### 205.6 — Accessibility

```dart
// ✅ Decorative icon (has text label)
Icon(Icons.edit, semanticLabel: null)  // or excludeFromSemantics: true

// ✅ Meaningful icon (icon-only button)
IconButton(
  icon: Icon(Icons.delete),
  tooltip: 'Delete record',  // Acts as semantic label
  onPressed: onDelete,
)
```

- ✅ Always provide `tooltip` for icon-only buttons
- ❌ NEVER omit semantic label for meaningful icons
