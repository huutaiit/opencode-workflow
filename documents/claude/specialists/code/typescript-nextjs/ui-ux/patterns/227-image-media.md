# Image & Media Specialist
# 画像＆メディアスペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 227.1–227.6 |
| **Specialist Type** | rule-set |
| **Purpose** | Aspect ratios, lazy loading, responsive images, placeholders, dark mode treatment, avatars |
| **Activation Trigger** | image, media, avatar, aspect ratio, lazy loading, placeholder, blur, responsive image |
| **Complements** | 223.x dark-mode, 222.x responsive-layout |

---

## Rules

### 227.1 — Standard Aspect Ratios

| Ratio | Use Case | Tailwind |
|-------|----------|----------|
| 16:9 | Hero banners, video | `aspect-video` |
| 4:3 | Card thumbnails | `aspect-[4/3]` |
| 1:1 | Avatars, icons | `aspect-square` |
| 3:2 | Photo galleries | `aspect-[3/2]` |
| 21:9 | Cinematic hero | `aspect-[21/9]` |

```tsx
// ✅ Maintain aspect ratio with object-fit
<div className="aspect-video overflow-hidden rounded-lg">
  <Image src={hero} alt="" fill className="object-cover" />
</div>

<div className="aspect-square h-12 w-12 overflow-hidden rounded-full">
  <Image src={avatar} alt="" fill className="object-cover" />
</div>

// ❌ WRONG: Fixed width/height without aspect ratio (distortion)
<img width={400} height={200} className="w-full" />  // → stretched
```

### 227.2 — Lazy Loading with next/image

```tsx
// ✅ Above-the-fold: priority loading
<Image src={hero} alt="Hero" priority fill sizes="100vw" />

// ✅ Below-the-fold: lazy (default)
<Image src={card} alt="Card" width={400} height={300} loading="lazy" />

// ✅ List images: lazy + sizes
<Image src={item} alt="" width={200} height={200}
  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px" />

// ❌ WRONG: priority on all images (defeats optimization)
// ❌ WRONG: <img> tag instead of next/image (no optimization)
```

### 227.3 — Responsive Images (sizes prop)

Always provide `sizes` when using `fill` or responsive layouts.

```tsx
// ✅ Responsive sizes prop
<Image src={photo} alt="" fill
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
/>

// ✅ Fixed-size images don't need sizes
<Image src={icon} alt="" width={48} height={48} />

// ❌ WRONG: fill without sizes (browser downloads largest image)
<Image src={photo} alt="" fill />  // → no sizes = wasted bandwidth
```

### 227.4 — Placeholder Patterns (Blur-Up)

```tsx
// ✅ Static import — automatic blurDataURL
import heroImg from '@/assets/hero.jpg';
<Image src={heroImg} alt="" placeholder="blur" />

// ✅ Remote image — manual blurDataURL
<Image src={remoteUrl} alt="" placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQ..." // tiny base64
  width={800} height={600}
/>

// ✅ Tailwind skeleton placeholder (while loading)
<div className="animate-pulse rounded-lg bg-gray-200 aspect-video" />

// ❌ WRONG: No placeholder (content shifts on load)
```

### 227.5 — Dark Mode Image Treatment

```tsx
// ✅ Reduce brightness for photos on dark backgrounds
<Image src={photo} alt="" className="dark:brightness-[0.85]" />

// ✅ Invert diagrams/line art (NOT photos) in dark mode
<Image src={diagram} alt="" className="dark:invert dark:hue-rotate-180" />

// ✅ Separate dark mode asset
<Image src={isDark ? logoDark : logoLight} alt="Logo" />

// ❌ WRONG: No treatment — bright images glare on dark bg
// ❌ WRONG: CSS invert on photos (destroys colors)
```

### 227.6 — Avatar Patterns

| Size | Pixels | Tailwind | Use |
|------|--------|----------|-----|
| xs | 24px | `h-6 w-6` | Inline mentions |
| sm | 32px | `h-8 w-8` | List items, comments |
| md | 40px | `h-10 w-10` | Cards, headers |
| lg | 64px | `h-16 w-16` | Profile pages |
| xl | 96px | `h-24 w-24` | Profile hero |

```tsx
// ✅ AntD Avatar with fallback
<Avatar src={user.avatar} size={40} icon={<UserOutlined />}>
  {user.name?.[0]?.toUpperCase()}  {/* Initials fallback */}
</Avatar>

// ✅ Avatar with status indicator
<Badge dot status="success" offset={[-4, 36]}>
  <Avatar src={user.avatar} size={40} />
</Badge>

// ❌ WRONG: Avatar without fallback (broken image on failure)
<Avatar src={user.avatar} />  // → no icon/initials fallback
```
