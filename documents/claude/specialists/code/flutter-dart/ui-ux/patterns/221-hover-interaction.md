# Hover & Interaction States Specialist
# ホバー＆インタラクション状態スペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 221.1–221.8 |
| **Specialist Type** | rule-set |
| **Purpose** | MD3 state layers, touch targets, InkWell, MaterialState |
| **Activation Trigger** | hover, interaction, touch target, focus, pressed |
| **Complements** | 206.x component-states, 224.x focus-accessibility |

---

## Rules

### 221.1 — MD3 State Layer System

| State | Overlay Opacity | Trigger |
|-------|----------------|---------|
| Hover | 8% | Mouse hover |
| Focus | 10% | Keyboard focus |
| Pressed | 10% | Touch/click |
| Dragged | 16% | Drag gesture |

```dart
// ✅ MD3 Material widgets handle state layers automatically
// InkWell, InkResponse, ElevatedButton, TextButton — all built-in

// ✅ Custom state layer
MouseRegion(
  cursor: SystemMouseCursors.click,
  child: AnimatedContainer(
    duration: const Duration(milliseconds: 150),
    color: isHovered ? colorScheme.primary.withOpacity(0.08) : Colors.transparent,
  ),
)
```

### 221.2 — Touch Targets

| Level | Min Size | Use |
|-------|----------|-----|
| MD3 Standard | 48×48dp | All interactive elements |
| Dense | 40×40dp | Admin panels, compact UI |

```dart
// ✅ Adequate touch target
SizedBox(
  width: 48, height: 48,
  child: IconButton(icon: Icon(Icons.close), onPressed: onClose),
)

// ❌ WRONG: No size constraint
IconButton(iconSize: 16, icon: Icon(Icons.close), onPressed: onClose)
```

### 221.3 — InkWell / InkResponse

```dart
// ✅ InkWell for rectangular targets
InkWell(
  onTap: onTap,
  borderRadius: BorderRadius.circular(8),
  child: Padding(padding: EdgeInsets.all(12), child: content),
)

// ✅ InkResponse for circular targets
InkResponse(
  onTap: onTap,
  radius: 24,
  child: Icon(Icons.favorite),
)
```

### 221.4–221.8

Transition timing, focus ring, disabled state, compound priority, built-in states — same principles as web, implemented via Flutter `MaterialState` system.
