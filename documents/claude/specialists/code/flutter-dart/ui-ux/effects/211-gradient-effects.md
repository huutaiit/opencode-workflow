# Gradient Effects Specialist
# グラデーションエフェクトスペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 211.1–211.4 |
| **Specialist Type** | rule-set |
| **Purpose** | Card gradient, layout gradient, text gradient, dark mode variants |
| **Activation Trigger** | gradient, fade, blend |
| **Complements** | 200.x color-system |

---

## Rules

### 211.1 — Card Gradient

```dart
// ✅ Subtle gradient card
Container(
  decoration: BoxDecoration(
    gradient: LinearGradient(
      begin: Alignment.topLeft, end: Alignment.bottomRight,
      colors: [Colors.white, Colors.grey[50]!],
    ),
    borderRadius: BorderRadius.circular(12),
  ),
)
```

### 211.2 — Layout Gradient (Hero Overlay)

```dart
// ✅ Gradient overlay on image
Stack(
  children: [
    Image.asset('hero.jpg', fit: BoxFit.cover, width: double.infinity),
    Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.bottomCenter, end: Alignment.topCenter,
          colors: [Color(0x99000000), Colors.transparent],
        ),
      ),
    ),
    Positioned(bottom: 16, left: 16, child: Text('Title', style: TextStyle(color: Colors.white))),
  ],
)
```

### 211.3 — Text Gradient

```dart
// ✅ Gradient text (decorative headings only)
ShaderMask(
  shaderCallback: (bounds) => LinearGradient(
    colors: [colorScheme.primary, Colors.blue[300]!],
  ).createShader(bounds),
  child: Text('Dashboard', style: TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: Colors.white)),
)
```

- ❌ NEVER use gradient on body text

### 211.4 — Dark Mode Gradients

```dart
// ✅ Subtle tonal gradient in dark mode
Container(
  decoration: BoxDecoration(
    gradient: LinearGradient(
      colors: isDark
        ? [Colors.grey[850]!, Colors.grey[900]!]  // very subtle
        : [Colors.white, Colors.grey[50]!],
    ),
  ),
)
```
