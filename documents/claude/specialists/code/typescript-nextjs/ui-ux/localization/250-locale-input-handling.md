# Locale Input Handling Specialist
# ロケール入力処理スペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 250.1–250.5 |
| **Specialist Type** | rule-set |
| **Purpose** | IME composition handling, zenkaku/hankaku conversion, VN input method awareness |
| **Activation Trigger** | Text input fields, IME-aware form controls |
| **Complements** | 251.x name-address, 256.x layout-typography |

---

## Rules

### 250.1 — IME compositionStart/End Event Handling

```tsx
// ✅ IME-aware input handler
const [isComposing, setIsComposing] = useState(false);

<Input
  onCompositionStart={() => setIsComposing(true)}
  onCompositionEnd={(e) => {
    setIsComposing(false);
    handleChange(e.currentTarget.value); // Process final committed value
  }}
  onChange={(e) => {
    if (!isComposing) {
      handleChange(e.target.value); // Only process non-IME input
    }
  }}
/>
```

- ✅ Guard all onChange handlers with `isComposing` check
- ❌ NEVER trigger search/validation during IME composition

### 250.2 — isComposing State Management

```tsx
// ✅ React hook for IME state
function useIMEComposition() {
  const [isComposing, setIsComposing] = useState(false);
  const handlers = useMemo(() => ({
    onCompositionStart: () => setIsComposing(true),
    onCompositionEnd: () => setIsComposing(false),
  }), []);
  return { isComposing, handlers };
}

// Usage
const { isComposing, handlers } = useIMEComposition();
<Input {...handlers} onKeyDown={(e) => {
  if (e.key === 'Enter' && !isComposing) submitForm();
}} />
```

- ✅ Share `isComposing` state with Enter key handlers
- ❌ NEVER submit form on Enter during IME composition

### 250.3 — Blur Timeout Pattern (300ms Delay)

```tsx
// ✅ Delayed blur for IME commit
const blurTimeoutRef = useRef<NodeJS.Timeout>();

const handleBlur = () => {
  blurTimeoutRef.current = setTimeout(() => {
    validateField(value); // Validate after IME has committed
  }, 300);
};

const handleFocus = () => {
  clearTimeout(blurTimeoutRef.current);
};

<Input onBlur={handleBlur} onFocus={handleFocus} />
```

- ✅ 300ms delay allows IME to commit before validation fires
- ✅ Clear timeout on re-focus to prevent stale validation
- ❌ NEVER validate immediately on blur — IME may still be composing

### 250.4 — Zenkaku/Hankaku (全角/半角) Conversion

```tsx
// ✅ Conversion utilities
const toHankaku = (str: string) =>
  str.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) =>
    String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
  );

const toZenkaku = (str: string) =>
  str.replace(/[A-Za-z0-9]/g, (s) =>
    String.fromCharCode(s.charCodeAt(0) + 0xFEE0)
  );

// ✅ Field-type enforcement
// Phone/email/postal: auto-convert to 半角 on blur
// Name (氏名): keep 全角 as entered
<Input onBlur={(e) => {
  if (fieldType === 'phone' || fieldType === 'email') {
    setValue(toHankaku(e.target.value));
  }
}} />
```

- ✅ Auto-convert phone, email, postal code to 半角 on blur
- ✅ Show conversion hint: `className="text-xs text-gray-500"` — "半角で入力"
- ❌ NEVER silently reject 全角 input — auto-convert instead

### 250.5 — Vietnamese Telex/VNI Input Method Awareness

```tsx
// ✅ VN input method considerations
// Telex: aa → â, aw → ă, dd → đ, ee → ê, ow → ơ, uw → ư
// VNI: a1 → á, a2 → à, a3 → ả, a4 → ã, a5 → ạ

// Key rules:
// - Do NOT intercept key sequences used by Telex/VNI
// - Do NOT trigger autocomplete on single-char input (may be mid-diacritical)
// - Debounce search input by 500ms (longer than JP due to multi-key sequences)
```

- ✅ Debounce VN text input by 500ms (Telex needs multi-keystroke)
- ✅ Allow diacritical marks in all text fields by default
- ❌ NEVER restrict input to ASCII in name/address fields
