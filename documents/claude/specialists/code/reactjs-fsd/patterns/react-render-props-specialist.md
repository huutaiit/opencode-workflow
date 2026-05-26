# React Render Props Specialist
# Reactレンダープロップスペシャリスト
# Chuyen Gia Render Props React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Shared (render prop components in shared/ui or shared/lib) |
| **Directory Pattern** | `src/shared/ui/{Component}/`, `src/shared/lib/{pattern}/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 26.1–26.8 |
| **Source Paths** | `src/shared/ui/**/*.tsx`, `src/shared/lib/**/*.tsx` |
| **File Count** | 2–8 render prop components per project |
| **Naming Convention** | `{Behavior}Renderer.tsx`, `{Name}RenderProp.tsx` |
| **Imports From** | Shared (types, hooks) |
| **Cannot Import** | Features, Pages |
| **Imported By** | Features, Widgets |
| **Dependencies** | None (uses React core) |
| **When To Use** | Sharing behavior with flexible rendering — DOM measurement, intersection observer, complex animation state |
| **Source Skeleton** | `src/shared/ui/{Name}/{Name}Renderer.tsx`, `src/shared/ui/{Name}/index.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate render prop patterns — children-as-function, typed render props with generics, migration path to hooks |
| **Activation Trigger** | files: src/shared/ui/**/*.tsx; keywords: renderProp, childrenAsFunction, behaviorSharing |

---

## Evidence Sources

- E1: React documentation — render props pattern
- E2: Michael Jackson original render props proposal
- E3: Downshift library as render prop exemplar
- E4: React Hook migration patterns from render props

---

## Patterns

### Pattern 26.1: Classic Render Prop (CRITICAL)

```typescript
// src/shared/ui/Mouse/MouseTracker.tsx
interface MousePosition { x: number; y: number; }

interface MouseTrackerProps {
  render: (position: MousePosition) => React.ReactNode;
}

export function MouseTracker({ render }: MouseTrackerProps) {
  const [position, setPosition] = useState<MousePosition>({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => setPosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  return <>{render(position)}</>;
}

// Usage
<MouseTracker render={({ x, y }) => (
  <Tooltip title={`${x}, ${y}`}>
    <div style={{ position: 'absolute', left: x, top: y }} />
  </Tooltip>
)} />
```

### Pattern 26.2: Children as Function (CRITICAL)

```typescript
// src/shared/ui/Toggle/Toggle.tsx
interface ToggleProps {
  initial?: boolean;
  children: (state: { on: boolean; toggle: () => void; setOn: (v: boolean) => void }) => React.ReactNode;
}

export function Toggle({ initial = false, children }: ToggleProps) {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn((v) => !v), []);
  return <>{children({ on, toggle, setOn })}</>;
}

// Usage — clean destructuring
<Toggle initial={false}>
  {({ on, toggle }) => (
    <div>
      <Switch checked={on} onChange={toggle} />
      {on && <Panel>Visible when on</Panel>}
    </div>
  )}
</Toggle>
```

### Pattern 26.3: Typed Render Props with Generics (HIGH)

```typescript
// src/shared/ui/AsyncRenderer/AsyncRenderer.tsx
interface AsyncRendererProps<T> {
  promise: () => Promise<T>;
  children: (state: { data: T | null; loading: boolean; error: Error | null; retry: () => void }) => React.ReactNode;
}

export function AsyncRenderer<T>({ promise, children }: AsyncRendererProps<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await promise();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [promise]);

  useEffect(() => { execute(); }, [execute]);

  return <>{children({ data, loading, error, retry: execute })}</>;
}

// Usage — T inferred from promise return
<AsyncRenderer promise={() => fetchUsers()}>
  {({ data, loading, error, retry }) => {
    if (loading) return <Spin />;
    if (error) return <Alert message={error.message} action={<Button onClick={retry}>Retry</Button>} />;
    return <UserTable users={data!} />;
  }}
</AsyncRenderer>
```

### Pattern 26.4: Render Prop → Hook Migration (HIGH)

When and how to convert render props to hooks.

```typescript
// BEFORE: Render prop
<WindowSize>
  {({ width, height }) => (
    <div>Window: {width}x{height}</div>
  )}
</WindowSize>

// AFTER: Hook (preferred for most cases)
function MyComponent() {
  const { width, height } = useWindowSize();
  return <div>Window: {width}x{height}</div>;
}

// The hook implementation
function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handler = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return size;
}
```

**Migration criteria:**
| Aspect | Keep Render Prop | Convert to Hook |
|--------|:----------------:|:---------------:|
| Needs DOM node access | ✅ | |
| Multiple render targets | ✅ | |
| Third-party lib wrapper | ✅ | |
| Simple state sharing | | ✅ |
| Used in many places | | ✅ |

### Pattern 26.5: When Render Props > Hooks (MEDIUM-HIGH)

Scenarios where render props remain superior to hooks.

```typescript
// 1. DOM measurement requiring ref — render prop provides the ref
function MeasuredBox({ children }: { children: (ref: RefObject<HTMLDivElement>, rect: DOMRect | null) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (ref.current) setRect(ref.current.getBoundingClientRect());
  }, []);

  return <>{children(ref, rect)}</>;
}

<MeasuredBox>
  {(ref, rect) => (
    <div ref={ref}>
      {rect && <span>Width: {rect.width}px</span>}
    </div>
  )}
</MeasuredBox>

// 2. Render delegation — parent decides HOW to render, child provides WHAT
// 3. Animation state — Framer Motion's render prop for complex gesture state
```

### Pattern 26.6: Performance (MEDIUM)

```typescript
// BAD: Inline function creates new reference every render
<DataProvider render={(data) => <ExpensiveList data={data} />} />

// GOOD: Memoize the render function
const renderList = useCallback(
  (data: Item[]) => <ExpensiveList data={data} />,
  [],
);
<DataProvider render={renderList} />

// GOOD: Children-as-function with React.memo on child
const MemoizedChild = React.memo(function Child({ data }: { data: Item[] }) {
  return <ExpensiveList data={data} />;
});
```

### Pattern 26.7: Composition (MEDIUM)

```typescript
// Combining multiple render props — can get nested
<AuthProvider>
  {({ user }) => (
    <ThemeProvider>
      {({ theme }) => (
        <LocaleProvider>
          {({ locale }) => (
            <App user={user} theme={theme} locale={locale} />
          )}
        </LocaleProvider>
      )}
    </ThemeProvider>
  )}
</AuthProvider>

// FIX: Use hooks for composition instead
function App() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { locale } = useLocale();
  return <Layout user={user} theme={theme} locale={locale} />;
}
```

### Pattern 26.8: Anti-patterns (MEDIUM)

**1. Callback hell** — 3+ nested render props → unreadable. Convert inner ones to hooks.

**2. Missing memoization** — Render function recreated on every parent render.

**3. Over-nesting** — Render prop for simple boolean toggle (use useState).

**4. Render prop returning non-JSX** — Must return ReactNode, not void or string.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (26.1–26.8)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Render Props Specialist | EPS v3.2 | Metadata v2.1*
