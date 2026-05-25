# React XSS Prevention Specialist
# React XSS防止スペシャリスト
# Chuyen Gia XSS Prevention React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — XSS rules apply to every component rendering user content) |
| **Directory Pattern** | `src/shared/lib/security/`, applies to all `**/*.tsx` |
| **Variant** | enterprise |
| **Pattern Numbers** | 49.1–49.10 |
| **Source Paths** | `**/*.tsx`, `src/shared/lib/security/**` |
| **File Count** | 2–4 security utility files + cross-cutting enforcement |
| **Naming Convention** | `sanitize.ts`, `csp.ts`, `security.types.ts` |
| **Imports From** | Shared (DOMPurify config) |
| **Cannot Import** | N/A (rule-set) |
| **Imported By** | N/A (rule-set — DOMPurify utility imported by components needing sanitization) |
| **Dependencies** | `dompurify:3.x`, `@types/dompurify:3.x` |
| **When To Use** | Rendering user-generated content, rich text display, URL handling, SVG rendering, CSP configuration |
| **Source Skeleton** | `src/shared/lib/security/sanitize.ts`, `src/shared/lib/security/csp.ts` |
| **Specialist Type** | rule-set |
| **Purpose** | Enforce XSS prevention rules — DOMPurify sanitization, CSP headers, input validation, AntD component XSS safety |
| **Activation Trigger** | files: **/*.tsx; keywords: xss, sanitize, dompurify, csp, dangerouslySetInnerHTML, userContent |

---

## Evidence Sources

- E1: OWASP XSS Prevention Cheat Sheet
- E2: DOMPurify documentation and configuration
- E3: Content Security Policy (CSP) specification
- E4: React's built-in XSS protection (JSX auto-escaping)

---

## Patterns

### Pattern 49.1: React Built-in Protection (CRITICAL)

React auto-escapes JSX expressions. Most XSS is prevented by default.

```typescript
// SAFE: React escapes this automatically
const userInput = '<script>alert("xss")</script>';
return <div>{userInput}</div>;
// Renders as text: &lt;script&gt;alert("xss")&lt;/script&gt;

// DANGEROUS: Bypasses React's protection
return <div dangerouslySetInnerHTML={{ __html: userInput }} />;
// This WILL execute the script — NEVER use with untrusted input
```

### Pattern 49.2: DOMPurify Sanitization (CRITICAL)

```typescript
// src/shared/lib/security/sanitize.ts
import DOMPurify from 'dompurify';

// Default config — allows basic HTML, strips scripts/events
const DEFAULT_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target'],
  FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'object', 'embed'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
};

export function sanitizeHTML(dirty: string, config?: DOMPurify.Config): string {
  return DOMPurify.sanitize(dirty, config ?? DEFAULT_CONFIG);
}

// Strict — text only, all HTML stripped
export function sanitizeText(dirty: string): string {
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

// Rich — for CMS/blog content (more tags allowed)
export function sanitizeRichHTML(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ...DEFAULT_CONFIG,
    ALLOWED_TAGS: [...DEFAULT_CONFIG.ALLOWED_TAGS!, 'img', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'span', 'div'],
    ALLOWED_ATTR: [...DEFAULT_CONFIG.ALLOWED_ATTR!, 'src', 'alt', 'width', 'height', 'style'],
  });
}

// Usage — safe rendering of user HTML content
function RichTextDisplay({ content }: { content: string }) {
  return <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(content) }} />;
}
```

### Pattern 49.3: CSP Configuration (CRITICAL)

```html
<!-- index.html — Content Security Policy meta tag -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.example.com wss://api.example.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
">
```

```typescript
// Vite: CSP headers via server config or nginx
// vite.config.ts — dev server headers
server: {
  headers: {
    'Content-Security-Policy': "default-src 'self'; script-src 'self'",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '0', // Disabled — CSP is the modern replacement
  },
}
```

### Pattern 49.4: Input Sanitization (HIGH)

```typescript
// Sanitize BEFORE storing/sending to API
function handleSubmit(values: FormValues) {
  const sanitizedValues = {
    ...values,
    name: sanitizeText(values.name),         // Strip all HTML
    bio: sanitizeHTML(values.bio),            // Allow safe HTML
    website: sanitizeURL(values.website),     // Validate URL
  };
  await apiClient.post('/users', sanitizedValues);
}

// AntD Form + sanitization
<Form.Item name="bio" label="Bio">
  <Input.TextArea
    onBlur={(e) => {
      const sanitized = sanitizeText(e.target.value);
      form.setFieldValue('bio', sanitized);
    }}
  />
</Form.Item>
```

### Pattern 49.5: URL Sanitization (HIGH)

```typescript
// src/shared/lib/security/sanitize.ts
const ALLOWED_PROTOCOLS = ['http:', 'https:', 'mailto:'];

export function sanitizeURL(url: string): string {
  try {
    const parsed = new URL(url);
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      return ''; // Block javascript:, data:, vbscript: etc.
    }
    return parsed.href;
  } catch {
    return ''; // Invalid URL
  }
}

// Usage — safe link rendering
function ExternalLink({ url, children }: { url: string; children: React.ReactNode }) {
  const safeUrl = sanitizeURL(url);
  if (!safeUrl) return <span>{children}</span>; // Fallback to plain text

  return (
    <a href={safeUrl} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
```

### Pattern 49.6: AntD XSS Safety (HIGH)

```typescript
// AntD components that accept HTML/JSX — review for XSS:

// SAFE: AntD auto-escapes string props
<Tooltip title={userInput}>...</Tooltip>  // Escaped
<Tag>{userInput}</Tag>                     // Escaped

// CAUTION: AntD components accepting ReactNode
<Alert message={<span dangerouslySetInnerHTML={{ __html: userInput }} />} /> // XSS!
// FIX: Sanitize before rendering
<Alert message={<span dangerouslySetInnerHTML={{ __html: sanitizeHTML(userInput) }} />} />

// AntD Table render — user data is auto-escaped
columns: [{ title: 'Name', dataIndex: 'name' }]  // Safe — AntD escapes
columns: [{ title: 'Bio', render: (bio) => <div dangerouslySetInnerHTML={{ __html: bio }} /> }]  // XSS!
// FIX: columns: [{ render: (bio) => <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(bio) }} /> }]
```

### Pattern 49.7: SVG Sanitization (MEDIUM-HIGH)

```typescript
// SVGs can contain scripts — always sanitize
export function sanitizeSVG(svgString: string): string {
  return DOMPurify.sanitize(svgString, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g', 'defs', 'use'],
    FORBID_TAGS: ['script', 'foreignObject'],
    FORBID_ATTR: ['onload', 'onerror', 'onclick'],
  });
}
```

### Pattern 49.8: Markdown Safety (MEDIUM-HIGH)

```typescript
// When rendering user markdown (blog, comments)
import { marked } from 'marked';

export function renderMarkdown(markdown: string): string {
  const rawHTML = marked(markdown);
  return sanitizeRichHTML(rawHTML); // Always sanitize after markdown parsing
}

function MarkdownDisplay({ content }: { content: string }) {
  const safeHTML = useMemo(() => renderMarkdown(content), [content]);
  return <div dangerouslySetInnerHTML={{ __html: safeHTML }} />;
}
```

### Pattern 49.9: Trusted Types (MEDIUM)

```typescript
// Trusted Types API — browser-level XSS prevention
// Requires CSP header: Content-Security-Policy: require-trusted-types-for 'script'
if (window.trustedTypes) {
  const policy = window.trustedTypes.createPolicy('dompurify', {
    createHTML: (input: string) => DOMPurify.sanitize(input),
  });
}
```

### Pattern 49.10: Anti-patterns (MEDIUM)

**1. dangerouslySetInnerHTML without sanitization** — Direct XSS vulnerability.
**2. eval() / new Function()** — Code injection vector. Never use with user input.
**3. innerHTML in useRef** — Bypasses React's protection. Use sanitizeHTML.
**4. Template literals in HTML** — ``const html = `<div>${userInput}</div>` `` — same as innerHTML.
**5. User-controlled `href`** — `<a href={userInput}>` allows `javascript:` protocol.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (49.1–49.10)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React XSS Prevention Specialist | EPS v3.2 | Metadata v2.1*
