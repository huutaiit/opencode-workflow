# React Accessibility Specialist
# Reactアクセシビリティスペシャリスト
# Chuyen Gia Accessibility React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — a11y rules apply to every UI component) |
| **Directory Pattern** | Applies to all `**/*.tsx` rendering UI |
| **Variant** | enterprise |
| **Pattern Numbers** | 36.1–36.10 |
| **Source Paths** | `**/*.tsx`, `src/shared/ui/**` |
| **File Count** | Cross-cutting |
| **Naming Convention** | N/A (rule-set) |
| **Imports From** | N/A (rule-set) |
| **Cannot Import** | N/A (rule-set) |
| **Imported By** | N/A (rule-set) |
| **Dependencies** | `eslint-plugin-jsx-a11y:6.x`, `@axe-core/react:4.x` |
| **When To Use** | WCAG 2.1 AA compliance, AntD a11y audit, focus management, keyboard navigation |
| **Source Skeleton** | N/A (rule-set specialist) |
| **Specialist Type** | rule-set |
| **Purpose** | Enforce WCAG 2.1 AA — ARIA labels, keyboard navigation, focus management, color contrast, AntD a11y audit |
| **Activation Trigger** | files: **/*.tsx; keywords: a11y, aria, keyboard, focusManagement, wcag, accessibility |

---

## Evidence Sources

- E1: WCAG 2.1 AA guidelines
- E2: WAI-ARIA Authoring Practices
- E3: AntD component accessibility documentation
- E4: eslint-plugin-jsx-a11y rules

---

## Patterns

### Pattern 36.1: ARIA Labels and Roles (CRITICAL)

```typescript
// Interactive elements MUST have accessible names
<Button aria-label="Close dialog" icon={<CloseOutlined />} />
<Input aria-label="Search users" placeholder="Search..." />

// Custom components need roles
<div role="tablist"><button role="tab" aria-selected={active}>Tab 1</button></div>
<div role="alert" aria-live="assertive">{errorMessage}</div>

// Images need alt text
<img src={avatar} alt={`${user.name}'s avatar`} />
<img src={decorative} alt="" role="presentation" />  // Decorative: empty alt

// AntD components — most have built-in ARIA, but verify:
<Select aria-label="Select role" />  // AntD Select needs explicit label when no visible label
<Table aria-label="User list" />      // Tables benefit from aria-label
```

### Pattern 36.2: Keyboard Navigation (CRITICAL)

```typescript
// All interactive elements must be keyboard-accessible
// Tab: move between elements
// Enter/Space: activate buttons/links
// Arrow keys: navigate within composite widgets (tabs, menus, lists)
// Escape: close modals/dropdowns

// Custom keyboard handler
function CustomDropdown() {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown': focusNext(); e.preventDefault(); break;
      case 'ArrowUp': focusPrev(); e.preventDefault(); break;
      case 'Escape': close(); break;
      case 'Enter': case ' ': selectCurrent(); e.preventDefault(); break;
    }
  };

  return <div role="listbox" onKeyDown={handleKeyDown} tabIndex={0}>...</div>;
}

// AntD: Menu, Select, DatePicker, Tabs have built-in keyboard support
// Verify custom components match AntD keyboard patterns
```

### Pattern 36.3: Focus Management (CRITICAL)

```typescript
// Focus trap in modals (AntD Modal handles this automatically)
// Manual focus trap for custom dialogs:
import { useRef, useEffect } from 'react';

function useFocusTrap(isOpen: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const focusableElements = containerRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0] as HTMLElement;
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;
    firstFocusable?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === firstFocusable) { lastFocusable?.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === lastFocusable) { firstFocusable?.focus(); e.preventDefault(); }
    };

    containerRef.current.addEventListener('keydown', handleTab);
    return () => containerRef.current?.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  return containerRef;
}

// Return focus after modal closes
function ModalWithFocusReturn() {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button ref={triggerRef} onClick={() => setOpen(true)}>Open</Button>
      <Modal open={open} onCancel={() => { setOpen(false); triggerRef.current?.focus(); }}>
        {/* Modal content */}
      </Modal>
    </>
  );
}
```

### Pattern 36.4: Screen Reader Announcements (HIGH)

```typescript
// Live regions for dynamic content
<div role="status" aria-live="polite" aria-atomic="true">
  {isLoading ? 'Loading users...' : `${users.length} users loaded`}
</div>

// Visually hidden but readable by screen readers
const srOnly: React.CSSProperties = {
  position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
  overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0, whiteSpace: 'nowrap',
};

<span style={srOnly}>Table sorted by name ascending</span>
```

### Pattern 36.5: Color Contrast (HIGH)

```typescript
// WCAG AA requirements:
// Normal text (< 18pt): contrast ratio ≥ 4.5:1
// Large text (≥ 18pt): contrast ratio ≥ 3:1
// UI components: contrast ratio ≥ 3:1

// AntD default tokens meet WCAG AA
// Custom colors MUST be verified:
// Tool: https://webaim.org/resources/contrastchecker/

// Don't rely on color alone to convey information
// BAD: <Tag color="red">Error</Tag> (color only)
// GOOD: <Tag color="red" icon={<CloseCircleOutlined />}>Error</Tag> (color + icon + text)
```

### Pattern 36.6: Skip Navigation (HIGH)

```typescript
// Skip link — jump to main content (first focusable element on page)
function SkipNavigation() {
  return (
    <a href="#main-content" className="skip-nav"
      style={{ position: 'absolute', left: -10000, top: 'auto', width: 1, height: 1, overflow: 'hidden',
        // Visible on focus:
        ':focus': { position: 'static', width: 'auto', height: 'auto' } }}>
      Skip to main content
    </a>
  );
}

// Target
<Content id="main-content" tabIndex={-1}>
  <Outlet />
</Content>
```

### Pattern 36.7: AntD Accessibility Audit (HIGH)

```typescript
// AntD components with good a11y (use as-is):
// ✅ Modal (focus trap, Escape to close, aria-modal)
// ✅ Menu (keyboard nav, aria-expanded)
// ✅ Select (keyboard nav, aria-activedescendant)
// ✅ Tabs (role=tablist, aria-selected)
// ✅ Alert (role=alert)

// AntD components needing attention:
// ⚠️ Table — add aria-label for screen reader context
// ⚠️ Tooltip — ensure trigger is keyboard-focusable
// ⚠️ Popconfirm — verify focus management
// ⚠️ Drawer — needs aria-label
// ⚠️ Icon-only buttons — need aria-label

// Runtime a11y checking in dev
import React from 'react';
if (import.meta.env.DEV) {
  import('@axe-core/react').then((axe) => {
    axe.default(React, ReactDOM, 1000);
    // Console warnings for a11y violations
  });
}
```

### Pattern 36.8: ESLint a11y Rules (HIGH)

```javascript
// eslint.config.js
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  {
    plugins: { 'jsx-a11y': jsxA11y },
    rules: {
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-has-content': 'error',
      'jsx-a11y/click-events-have-key-events': 'error',
      'jsx-a11y/no-static-element-interactions': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
    },
  },
];
```

### Pattern 36.9: Testing Accessibility (MEDIUM-HIGH)

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

it('has no accessibility violations', async () => {
  const { container } = render(<UserForm />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});

// Playwright a11y testing
test('page is accessible', async ({ page }) => {
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  expect(accessibilityScanResults.violations).toEqual([]);
});
```

### Pattern 36.10: Anti-patterns (MEDIUM)

**1. Missing alt text** — `<img src={url} />` without alt.
**2. Click handler on div** — `<div onClick={...}>` without role/tabIndex/keyboard handler.
**3. Color-only indicators** — Red for error, green for success without text/icon.
**4. Auto-focus abuse** — Focusing inputs on page load unexpectedly.
**5. Missing form labels** — AntD Form.Item without label prop.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (36.1–36.10)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Accessibility Specialist | EPS v3.2 | Metadata v2.1*
