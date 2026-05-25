# React Hook Patterns Specialist
# Reactフックパターンスペシャリスト
# Chuyen Gia Hook Patterns React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Shared (reusable hooks in shared/hooks/) |
| **Directory Pattern** | `src/shared/hooks/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 29.1–29.10 |
| **Source Paths** | `src/shared/hooks/**/*.ts` |
| **File Count** | 10–30 utility hooks per project |
| **Naming Convention** | `use{Name}.ts` |
| **Imports From** | Shared (types, config, lib) |
| **Cannot Import** | Features, Pages |
| **Imported By** | Features, Widgets, Pages |
| **Dependencies** | None (uses React core hooks + browser APIs) |
| **When To Use** | Reusable utility hooks — debounce, throttle, media query, click outside, intersection observer, clipboard, toggle |
| **Source Skeleton** | `src/shared/hooks/use{Name}.ts`, `src/shared/hooks/__tests__/use{Name}.test.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate advanced reusable hook patterns — useDebounce, useThrottle, usePrevious, useInterval, useClickOutside, useIntersectionObserver |
| **Activation Trigger** | files: src/shared/hooks/**; keywords: useDebounce, useThrottle, usePrevious, useInterval, useClickOutside |

---

## Evidence Sources

- E1: React hooks patterns — community best practices
- E2: Browser APIs (IntersectionObserver, Clipboard, ResizeObserver)
- E3: Enterprise utility hook libraries (usehooks-ts, ahooks)
- E4: AntD integration with utility hooks

---

## Patterns

### Pattern 29.1: useDebounce (CRITICAL)

```typescript
// src/shared/hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Callback variant
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  return useCallback((...args: Parameters<T>) => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callbackRef.current(...args), delay);
  }, [delay]);
}

// Usage — search with AntD Input
function SearchInput() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const { data } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchApi(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
  });

  return <Input.Search value={query} onChange={(e) => setQuery(e.target.value)} />;
}
```

### Pattern 29.2: useThrottle (HIGH)

```typescript
// src/shared/hooks/useThrottle.ts
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
): (...args: Parameters<T>) => void {
  const lastCallRef = useRef(0);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCallRef.current >= delay) {
      lastCallRef.current = now;
      callbackRef.current(...args);
    }
  }, [delay]);
}

// Usage — throttled scroll handler
function ScrollTracker() {
  const handleScroll = useThrottledCallback(() => {
    analytics.trackScroll(window.scrollY);
  }, 200);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);
}
```

### Pattern 29.3: usePrevious (HIGH)

```typescript
// src/shared/hooks/usePrevious.ts
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

// Usage — detect value changes
function PriceDisplay({ price }: { price: number }) {
  const prevPrice = usePrevious(price);
  const direction = prevPrice !== undefined && price > prevPrice ? 'up' : 'down';

  return (
    <Statistic
      value={price}
      prefix="$"
      valueStyle={{ color: direction === 'up' ? '#3f8600' : '#cf1322' }}
      suffix={direction === 'up' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
    />
  );
}
```

### Pattern 29.4: useInterval (HIGH)

```typescript
// src/shared/hooks/useInterval.ts
export function useInterval(callback: () => void, delay: number | null) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (delay === null) return; // Pause when null
    const id = setInterval(() => callbackRef.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}

// Usage — auto-refresh dashboard
function DashboardStats() {
  const [isAutoRefresh, setAutoRefresh] = useState(true);
  const { refetch } = useQuery({ queryKey: ['dashboard-stats'], ... });

  useInterval(
    () => refetch(),
    isAutoRefresh ? 30000 : null, // 30s when active, paused when null
  );

  return (
    <Switch checked={isAutoRefresh} onChange={setAutoRefresh} checkedChildren="Auto" />
  );
}
```

### Pattern 29.5: useClickOutside (HIGH)

```typescript
// src/shared/hooks/useClickOutside.ts
export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void,
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) return;
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

// Usage — close dropdown on outside click
function CustomDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  return (
    <div ref={dropdownRef}>
      <Button onClick={() => setIsOpen(!isOpen)}>Menu</Button>
      {isOpen && <div className="dropdown-content">...</div>}
    </div>
  );
}
```

### Pattern 29.6: useIntersectionObserver (HIGH)

```typescript
// src/shared/hooks/useIntersectionObserver.ts
interface UseIntersectionOptions {
  threshold?: number;
  rootMargin?: string;
  root?: Element | null;
}

export function useIntersectionObserver<T extends HTMLElement>(
  options: UseIntersectionOptions = {},
): [RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsIntersecting(entry.isIntersecting),
      { threshold: options.threshold ?? 0, rootMargin: options.rootMargin ?? '0px', root: options.root },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [options.threshold, options.rootMargin, options.root]);

  return [ref, isIntersecting];
}

// Usage — lazy load images
function LazyImage({ src, alt }: { src: string; alt: string }) {
  const [ref, isVisible] = useIntersectionObserver<HTMLDivElement>({ rootMargin: '200px' });

  return (
    <div ref={ref}>
      {isVisible ? <img src={src} alt={alt} /> : <Skeleton.Image />}
    </div>
  );
}

// Usage — infinite scroll trigger
function InfiniteList() {
  const [sentinelRef, isVisible] = useIntersectionObserver<HTMLDivElement>();
  const { fetchNextPage, hasNextPage } = useInfiniteUsers();

  useEffect(() => {
    if (isVisible && hasNextPage) fetchNextPage();
  }, [isVisible, hasNextPage, fetchNextPage]);

  return (
    <>
      {/* ... list items ... */}
      <div ref={sentinelRef} /> {/* Invisible trigger element */}
    </>
  );
}
```

### Pattern 29.7: useEventListener (MEDIUM-HIGH)

```typescript
// src/shared/hooks/useEventListener.ts
export function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element?: undefined,
  options?: boolean | AddEventListenerOptions,
): void;
export function useEventListener<K extends keyof HTMLElementEventMap, T extends HTMLElement>(
  eventName: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  element: RefObject<T>,
  options?: boolean | AddEventListenerOptions,
): void;
export function useEventListener(
  eventName: string,
  handler: (event: Event) => void,
  element?: RefObject<HTMLElement>,
  options?: boolean | AddEventListenerOptions,
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const target = element?.current ?? window;
    const listener = (event: Event) => handlerRef.current(event);

    target.addEventListener(eventName, listener, options);
    return () => target.removeEventListener(eventName, listener, options);
  }, [eventName, element, options]);
}

// Usage
useEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

useEventListener('scroll', handleScroll, containerRef, { passive: true });
```

### Pattern 29.8: useCopyToClipboard (MEDIUM)

```typescript
// src/shared/hooks/useCopyToClipboard.ts
import { App } from 'antd';

export function useCopyToClipboard() {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const { message } = App.useApp();

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      message.success('Copied to clipboard');
      setTimeout(() => setCopiedText(null), 2000);
    } catch {
      message.error('Failed to copy');
    }
  }, [message]);

  return { copiedText, copy, isCopied: copiedText !== null };
}

// Usage
function ApiKeyDisplay({ apiKey }: { apiKey: string }) {
  const { copy, isCopied } = useCopyToClipboard();
  return (
    <Input.Group compact>
      <Input value={apiKey} readOnly style={{ width: 'calc(100% - 40px)' }} />
      <Button icon={isCopied ? <CheckOutlined /> : <CopyOutlined />} onClick={() => copy(apiKey)} />
    </Input.Group>
  );
}
```

### Pattern 29.9: useToggle (MEDIUM)

```typescript
// src/shared/hooks/useToggle.ts
export function useToggle(initialValue = false): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initialValue);
  const toggle = useCallback(() => setValue((v) => !v), []);
  return [value, toggle, setValue];
}

// Usage
const [isExpanded, toggleExpanded] = useToggle(false);
<Button onClick={toggleExpanded}>{isExpanded ? 'Collapse' : 'Expand'}</Button>
{isExpanded && <DetailPanel />}
```

### Pattern 29.10: Anti-patterns (MEDIUM)

**1. Hooks that do too much** — Single hook managing 5 concerns.
```
// FIX: Split into focused hooks, compose if needed
```

**2. Missing cleanup** — Event listeners, observers without cleanup.
```
// FIX: Always return cleanup function from useEffect
```

**3. Over-abstraction** — Custom hook for a single useState call.
```
// FIX: Only extract when logic is reused 2+ times or complex
```

**4. Browser API without SSR check** — Using `window` without typeof check.
```typescript
// FIX: Guard with typeof window !== 'undefined'
const [width, setWidth] = useState(
  typeof window !== 'undefined' ? window.innerWidth : 0,
);
```

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (29.1–29.10)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Hook Patterns Specialist | EPS v3.2 | Metadata v2.1*
