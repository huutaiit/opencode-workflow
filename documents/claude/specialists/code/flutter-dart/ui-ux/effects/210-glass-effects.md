# Glass Effects Specialist
# ガラスエフェクトスペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 210.1–210.4 |
| **Specialist Type** | rule-set |
| **Purpose** | BackdropFilter blur, frosted glass, dark mode fallback |
| **Activation Trigger** | glass, glassmorphism, frosted, backdrop, blur |
| **Complements** | 203.x elevation-shadow |

---

## Rules

### 210.1 — Glassmorphism Recipe

```dart
// ✅ Frosted glass card
ClipRRect(
  borderRadius: BorderRadius.circular(16),
  child: BackdropFilter(
    filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
    child: Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.6),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.2)),
      ),
      padding: const EdgeInsets.all(16),
      child: content,
    ),
  ),
)
```

### 210.2 — Calibrated Defaults

| Property | Value |
|----------|-------|
| Blur sigma | 8–12 |
| Background opacity | 55–75% |
| Border | 1px white/20% |

- ❌ Too much blur (sigma > 20): content behind unreadable
- ❌ Too transparent (<40%): text contrast fails

### 210.3 — Dark Mode Glass

```dart
// ✅ Dark glass variant
Container(
  decoration: BoxDecoration(
    color: (isDark ? Colors.grey[900]! : Colors.white).withOpacity(isDark ? 0.7 : 0.6),
    border: Border.all(color: Colors.white.withOpacity(isDark ? 0.1 : 0.2)),
  ),
)
```

### 210.4 — Performance

- `BackdropFilter` is GPU-intensive — limit to 2–3 per screen
- MD3 alternative: use tonal elevation (`surfaceContainerHighest`) instead of glass
- ❌ NEVER use BackdropFilter in scrolling lists (causes jank)
