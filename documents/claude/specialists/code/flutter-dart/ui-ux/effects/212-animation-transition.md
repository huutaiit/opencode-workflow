# Animation & Transition Specialist
# アニメーション＆トランジションスペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 212.1–212.6 |
| **Specialist Type** | rule-set |
| **Purpose** | MD3 motion, duration tokens, easing curves, spring physics |
| **Activation Trigger** | animation, transition, motion, fade, slide |
| **Complements** | — |

---

## Rules

### 212.1 — MD3 Duration Tokens

| Interaction | Duration | Use |
|-------------|---------|-----|
| Short 1 | 50ms | Ripple, press feedback |
| Short 2 | 100ms | Selection, toggle |
| Short 3 | 150ms | Hover, icon change |
| Short 4 | 200ms | Tooltip, menu open |
| Medium 1 | 250ms | FAB expand |
| Medium 2 | 300ms | Dialog enter |
| Medium 3 | 350ms | Navigation transition |
| Medium 4 | 400ms | Page transition |
| Long 1 | 450ms | Bottom sheet |
| Long 2 | 500ms | Complex animation |

### 212.2 — MD3 Easing Curves

| Name | Flutter | Use |
|------|---------|-----|
| Emphasized | `Curves.easeInOutCubicEmphasized` | Standard transitions |
| Emphasized Decelerate | `Curves.easeOutCubic` | Elements entering |
| Emphasized Accelerate | `Curves.easeInCubic` | Elements leaving |
| Standard | `Curves.easeInOut` | Simple state changes |
| Spring | `SpringSimulation` | Natural motion, pull-to-refresh |

```dart
// ✅ Enter animation
AnimatedContainer(
  duration: const Duration(milliseconds: 300),
  curve: Curves.easeOutCubic,
)

// ✅ Page transition
MaterialPageRoute(builder: (_) => NextPage())  // MD3 default transition
```

### 212.3 — Implicit Animations

```dart
// ✅ Use implicit animations for simple state changes
AnimatedContainer(duration: Duration(milliseconds: 200), color: isActive ? primary : surface)
AnimatedOpacity(duration: Duration(milliseconds: 150), opacity: isVisible ? 1.0 : 0.0)
AnimatedSwitcher(duration: Duration(milliseconds: 200), child: currentWidget)
```

### 212.4 — Explicit Animations (AnimationController)

```dart
// ✅ Complex animations with controller
late final _controller = AnimationController(
  duration: const Duration(milliseconds: 300),
  vsync: this,
);
late final _animation = CurvedAnimation(
  parent: _controller, curve: Curves.easeOutCubic,
);
```

### 212.5 — Accessibility: Reduced Motion

```dart
// ✅ Respect reduced motion preference
final reduceMotion = MediaQuery.of(context).disableAnimations;

AnimatedContainer(
  duration: reduceMotion ? Duration.zero : const Duration(milliseconds: 300),
)
```

- ❌ NEVER ignore `disableAnimations` — accessibility requirement

### 212.6 — When NOT to Animate

- `MediaQuery.disableAnimations` is true
- List item updates (data-heavy)
- >5 seconds without pause control
