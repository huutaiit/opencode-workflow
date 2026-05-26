# Typography Scale Specialist
# タイポグラフィスケールスペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 202.1–202.8 |
| **Specialist Type** | rule-set |
| **Purpose** | MD3 type scale, line height, font families, CJK adjustments |
| **Activation Trigger** | (always loaded — core/) |
| **Complements** | material3-design-system |

---

## Rules

### 202.1 — MD3 Type Scale (15 Roles)

| Category | Role | Size | Weight | Line Height |
|----------|------|------|--------|-------------|
| Display | Large | 57sp | 400 | 64sp |
| Display | Medium | 45sp | 400 | 52sp |
| Display | Small | 36sp | 400 | 44sp |
| Headline | Large | 32sp | 400 | 40sp |
| Headline | Medium | 28sp | 400 | 36sp |
| Headline | Small | 24sp | 400 | 32sp |
| Title | Large | 22sp | 400 | 28sp |
| Title | Medium | 16sp | 500 | 24sp |
| Title | Small | 14sp | 500 | 20sp |
| Body | Large | 16sp | 400 | 24sp |
| Body | Medium | 14sp | 400 | 20sp |
| Body | Small | 12sp | 400 | 16sp |
| Label | Large | 14sp | 500 | 20sp |
| Label | Medium | 12sp | 500 | 16sp |
| Label | Small | 11sp | 500 | 16sp |

```dart
// ✅ Use TextTheme roles
Text('Page Title', style: Theme.of(context).textTheme.headlineMedium)
Text('Body text', style: Theme.of(context).textTheme.bodyLarge)
Text('Caption', style: Theme.of(context).textTheme.labelSmall)

// ❌ WRONG: Hardcoded TextStyle
Text('Title', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold))
```

### 202.2 — Line Height Rules

| Context | Height Factor | Implementation |
|---------|-------------|---------------|
| Headings | 1.2–1.3× | Built into TextTheme |
| Body text | 1.5× | Built into TextTheme |
| JP text | 1.5–1.7× | Override `height: 1.6` |
| VN text | ≥1.5× | Override `height: 1.5` |

### 202.3 — Font Family

```dart
// ✅ Theme-level font configuration
ThemeData(
  textTheme: GoogleFonts.notoSansJpTextTheme().copyWith(
    // Customize specific roles if needed
  ),
)

// Priority: Noto Sans JP → system CJK → Roboto (fallback)
```

### 202.4 — Weight Scale

| Weight | Flutter | Use |
|--------|---------|-----|
| 400 | FontWeight.w400 | Body text |
| 500 | FontWeight.w500 | Labels, titles |
| 600 | FontWeight.w600 | Section headings |
| 700 | FontWeight.w700 | Page titles |

- ❌ WRONG: FontWeight.w100–w300 — too light for CJK
- ❌ WRONG: FontWeight.w900 — too heavy, strokes merge

### 202.5 — Responsive Typography

```dart
// ✅ Scale text based on window class
double titleSize = MediaQuery.sizeOf(context).width > 600 ? 28 : 22;
Text('Title', style: TextStyle(fontSize: titleSize))
```

### 202.6 — Paragraph Rules

- Max width: ~65 characters per line
- `ConstrainedBox(constraints: BoxConstraints(maxWidth: 600))`

### 202.7 — Code Font

```dart
// ✅ Monospace for code
Text(code, style: TextStyle(fontFamily: 'JetBrains Mono', fontSize: 14))
```

### 202.8 — CJK Adjustments

```dart
// ✅ JP text settings
Text(
  jpText,
  style: TextStyle(
    letterSpacing: -0.3,  // Tighter for JP headings
    height: 1.6,          // More line height for CJK
  ),
)

// ✅ VN text settings
Text(vnText, style: TextStyle(height: 1.5))  // Diacritics need space
```
