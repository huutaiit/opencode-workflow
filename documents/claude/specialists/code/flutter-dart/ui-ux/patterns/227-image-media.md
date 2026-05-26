# Image & Media Specialist
# 画像＆メディアスペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 227.1–227.6 |
| **Specialist Type** | rule-set |
| **Purpose** | Aspect ratios, cached images, placeholders, dark mode, avatars |
| **Activation Trigger** | image, media, avatar, aspect ratio, placeholder |
| **Complements** | 223.x dark-mode |

---

## Rules

### 227.1 — Aspect Ratios

```dart
// ✅ Maintain aspect ratio
AspectRatio(
  aspectRatio: 16 / 9,
  child: Image.network(url, fit: BoxFit.cover),
)
```

- ❌ WRONG: Fixed width/height without aspect ratio constraint (distortion)
- ❌ WRONG: Avatar without fallback (broken image on network failure)

### 227.2 — Cached Network Images

```dart
// ✅ cached_network_image package
CachedNetworkImage(
  imageUrl: url,
  placeholder: (_, __) => Shimmer.fromColors(
    baseColor: Colors.grey[300]!, highlightColor: Colors.grey[100]!,
    child: Container(color: Colors.white),
  ),
  errorWidget: (_, __, ___) => Icon(Icons.broken_image, size: 48),
  fit: BoxFit.cover,
)
```

### 227.3 — Placeholder Patterns

```dart
// ✅ Shimmer placeholder
Container(
  decoration: BoxDecoration(color: Colors.grey[200], borderRadius: BorderRadius.circular(8)),
  child: Shimmer.fromColors(
    baseColor: Colors.grey[300]!, highlightColor: Colors.grey[100]!,
    child: Container(color: Colors.white),
  ),
)
```

### 227.4 — Dark Mode Image Treatment

```dart
// ✅ Reduce brightness in dark mode
ColorFiltered(
  colorFilter: isDark
    ? ColorFilter.matrix([0.85, 0, 0, 0, 0, 0, 0.85, 0, 0, 0, 0, 0, 0.85, 0, 0, 0, 0, 0, 1, 0])
    : const ColorFilter.mode(Colors.transparent, BlendMode.multiply),
  child: Image.asset('photo.jpg'),
)
```

### 227.5 — Avatar Patterns

| Size | dp | Use |
|------|-----|-----|
| xs | 24 | Inline mentions |
| sm | 32 | List items |
| md | 40 | Cards, headers |
| lg | 64 | Profile pages |
| xl | 96 | Profile hero |

```dart
// ✅ CircleAvatar with fallback
CircleAvatar(
  radius: 20,
  backgroundImage: user.avatarUrl != null ? NetworkImage(user.avatarUrl!) : null,
  child: user.avatarUrl == null ? Text(user.name[0].toUpperCase()) : null,
)
```

### 227.6 — Hero Animation

```dart
// ✅ Hero transition for image detail
Hero(
  tag: 'image_$id',
  child: Image.network(url, fit: BoxFit.cover),
)
```
