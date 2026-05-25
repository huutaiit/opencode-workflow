# React Compound Component Specialist
# React複合コンポーネントスペシャリスト
# Chuyen Gia Compound Component React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Shared, Widgets (generic compounds in shared/ui, composed in widgets) |
| **Directory Pattern** | `src/shared/ui/{Component}/`, `src/widgets/{name}/ui/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 25.1–25.10 |
| **Source Paths** | `src/shared/ui/**/*.tsx`, `src/widgets/**/*.tsx` |
| **File Count** | 5–15 compound component groups per project |
| **Naming Convention** | `{Component}.tsx` (root), `{Component}{Part}.tsx` (parts), `{Component}Context.tsx` |
| **Imports From** | Shared (types, hooks), Entities (entity types for data-driven compounds) |
| **Cannot Import** | Features, Pages |
| **Imported By** | Features (use compound UI), Widgets, Pages |
| **Dependencies** | None (uses React core Context + children) |
| **When To Use** | Multi-part UI with implicit shared state — tabs, accordion, select, dropdown, stepper |
| **Source Skeleton** | `src/shared/ui/{Component}/{Component}.tsx`, `src/shared/ui/{Component}/{Component}Context.tsx`, `src/shared/ui/{Component}/index.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate compound component patterns — Context-based state sharing, dot-notation API, typed compound with generics, AntD compound analysis |
| **Activation Trigger** | files: src/shared/ui/**/*.tsx; keywords: compoundComponent, contextSharing, dotNotation, tabsPanel |

---

## Evidence Sources

- E1: Kent C. Dodds — Advanced React Patterns (compound components)
- E2: AntD source code compound patterns (Menu, Tabs, Steps, Collapse)
- E3: WAI-ARIA compound widget patterns
- E4: React children API and Context composition

---

## Patterns

### Pattern 25.1: Context-based Compound (CRITICAL)

Parent provides shared state via Context, children consume implicitly.

```typescript
// src/shared/ui/Tabs/TabsContext.tsx
import { createContext, useContext } from 'react';

interface TabsContextValue {
  activeKey: string;
  onChange: (key: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export function useTabsContext(): TabsContextValue {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error('Tabs compound components must be used within <Tabs>');
  return ctx;
}

export const TabsProvider = TabsContext.Provider;
```

```typescript
// src/shared/ui/Tabs/Tabs.tsx
import { useState, type PropsWithChildren } from 'react';
import { TabsProvider } from './TabsContext';

interface TabsProps extends PropsWithChildren {
  defaultActiveKey?: string;
  activeKey?: string;
  onChange?: (key: string) => void;
}

export function Tabs({ defaultActiveKey = '', activeKey, onChange, children }: TabsProps) {
  const [internalKey, setInternalKey] = useState(defaultActiveKey);
  const currentKey = activeKey ?? internalKey;

  const handleChange = (key: string) => {
    if (!activeKey) setInternalKey(key);
    onChange?.(key);
  };

  return (
    <TabsProvider value={{ activeKey: currentKey, onChange: handleChange }}>
      <div className="tabs" role="tablist">{children}</div>
    </TabsProvider>
  );
}
```

### Pattern 25.2: Dot Notation API (CRITICAL)

Static property assignment for clean compound API.

```typescript
// src/shared/ui/Tabs/TabButton.tsx
import { useTabsContext } from './TabsContext';

interface TabButtonProps {
  tabKey: string;
  children: React.ReactNode;
  disabled?: boolean;
}

export function TabButton({ tabKey, children, disabled }: TabButtonProps) {
  const { activeKey, onChange } = useTabsContext();
  const isActive = activeKey === tabKey;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-disabled={disabled}
      className={isActive ? 'tab-active' : ''}
      onClick={() => !disabled && onChange(tabKey)}
    >
      {children}
    </button>
  );
}

// src/shared/ui/Tabs/TabPanel.tsx
export function TabPanel({ tabKey, children }: { tabKey: string; children: React.ReactNode }) {
  const { activeKey } = useTabsContext();
  if (activeKey !== tabKey) return null;
  return <div role="tabpanel">{children}</div>;
}

// src/shared/ui/Tabs/index.ts — Dot notation assembly
import { Tabs as TabsRoot } from './Tabs';
import { TabButton } from './TabButton';
import { TabPanel } from './TabPanel';

export const Tabs = Object.assign(TabsRoot, {
  Button: TabButton,
  Panel: TabPanel,
});

// Usage
<Tabs defaultActiveKey="1">
  <Tabs.Button tabKey="1">General</Tabs.Button>
  <Tabs.Button tabKey="2">Security</Tabs.Button>
  <Tabs.Panel tabKey="1"><GeneralSettings /></Tabs.Panel>
  <Tabs.Panel tabKey="2"><SecuritySettings /></Tabs.Panel>
</Tabs>
```

### Pattern 25.3: Typed Compound with Generics (HIGH)

Generic data type flowing through compound parts.

```typescript
// src/shared/ui/DataList/DataList.tsx
interface DataListContextValue<T> {
  items: T[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function createDataListContext<T>() {
  const Context = createContext<DataListContextValue<T> | null>(null);
  const useDataListContext = () => {
    const ctx = useContext(Context);
    if (!ctx) throw new Error('Must be used within DataList');
    return ctx;
  };
  return { Provider: Context.Provider, useContext: useDataListContext };
}

// Factory for typed compound
export function createDataList<T extends { id: string }>() {
  const { Provider, useContext: useCtx } = createDataListContext<T>();

  function Root({ items, children }: { items: T[]; children: React.ReactNode }) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    return (
      <Provider value={{ items, selectedId, onSelect: setSelectedId }}>
        {children}
      </Provider>
    );
  }

  function Item({ renderItem }: { renderItem: (item: T, isSelected: boolean) => React.ReactNode }) {
    const { items, selectedId, onSelect } = useCtx();
    return <>{items.map((item) => (
      <div key={item.id} onClick={() => onSelect(item.id)}>
        {renderItem(item, item.id === selectedId)}
      </div>
    ))}</>;
  }

  return Object.assign(Root, { Item });
}

// Usage
const UserList = createDataList<User>();
<UserList items={users}>
  <UserList.Item renderItem={(user, selected) => (
    <Card style={{ border: selected ? '2px solid blue' : undefined }}>
      {user.displayName}
    </Card>
  )} />
</UserList>
```

### Pattern 25.4: forwardRef in Compound (HIGH)

Expose DOM refs for focus management and imperative APIs.

```typescript
import { forwardRef, useImperativeHandle, useRef } from 'react';

interface InputGroupRef {
  focus: () => void;
  getValue: () => string;
}

const InputGroupInput = forwardRef<HTMLInputElement, { name: string }>(
  ({ name, ...props }, ref) => {
    return <input ref={ref} name={name} {...props} />;
  },
);
InputGroupInput.displayName = 'InputGroup.Input';
```

### Pattern 25.5: Controlled vs Uncontrolled (HIGH)

```typescript
interface AccordionProps {
  // Controlled mode
  activeKeys?: string[];
  onChange?: (keys: string[]) => void;
  // Uncontrolled mode
  defaultActiveKeys?: string[];
  children: React.ReactNode;
}

function Accordion({ activeKeys, onChange, defaultActiveKeys = [], children }: AccordionProps) {
  const [internalKeys, setInternalKeys] = useState(defaultActiveKeys);
  const isControlled = activeKeys !== undefined;
  const currentKeys = isControlled ? activeKeys : internalKeys;

  const handleToggle = (key: string) => {
    const newKeys = currentKeys.includes(key)
      ? currentKeys.filter((k) => k !== key)
      : [...currentKeys, key];
    if (!isControlled) setInternalKeys(newKeys);
    onChange?.(newKeys);
  };

  return (
    <AccordionProvider value={{ activeKeys: currentKeys, toggle: handleToggle }}>
      {children}
    </AccordionProvider>
  );
}
```

### Pattern 25.6: AntD Compound Analysis (MEDIUM-HIGH)

How AntD implements compound patterns — learn from their approach.

```typescript
// AntD Menu — compound with context
<Menu mode="inline" selectedKeys={[currentKey]} onSelect={({ key }) => navigate(key)}>
  <Menu.SubMenu key="users" title="Users" icon={<UserOutlined />}>
    <Menu.Item key="/users/list">User List</Menu.Item>
    <Menu.Item key="/users/create">Create User</Menu.Item>
  </Menu.SubMenu>
  <Menu.Item key="/settings">Settings</Menu.Item>
</Menu>

// AntD Steps — state-driven compound
<Steps current={currentStep} items={[
  { title: 'Personal', status: currentStep > 0 ? 'finish' : 'process' },
  { title: 'Address', status: currentStep > 1 ? 'finish' : currentStep === 1 ? 'process' : 'wait' },
  { title: 'Confirm', status: currentStep === 2 ? 'process' : 'wait' },
]} />

// AntD Descriptions — data compound
<Descriptions title="User Info" bordered>
  <Descriptions.Item label="Name">{user.displayName}</Descriptions.Item>
  <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
  <Descriptions.Item label="Role"><Tag>{user.role}</Tag></Descriptions.Item>
</Descriptions>
```

### Pattern 25.7: Accessibility in Compound (MEDIUM-HIGH)

```typescript
// Roving tabindex for tab list
function TabButton({ tabKey, children }: TabButtonProps) {
  const { activeKey, onChange } = useTabsContext();
  const isActive = activeKey === tabKey;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      tabIndex={isActive ? 0 : -1}  // Roving tabindex
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') focusNextTab();
        if (e.key === 'ArrowLeft') focusPrevTab();
      }}
      onClick={() => onChange(tabKey)}
    >
      {children}
    </button>
  );
}

// Panel linked to tab
function TabPanel({ tabKey, children }: { tabKey: string; children: React.ReactNode }) {
  const { activeKey } = useTabsContext();
  return (
    <div
      role="tabpanel"
      aria-labelledby={`tab-${tabKey}`}
      hidden={activeKey !== tabKey}
    >
      {activeKey === tabKey && children}
    </div>
  );
}
```

### Pattern 25.8: Testing Compound Components (MEDIUM)

```typescript
describe('Tabs compound', () => {
  it('renders active panel based on selection', async () => {
    const { user } = render(
      <Tabs defaultActiveKey="1">
        <Tabs.Button tabKey="1">Tab 1</Tabs.Button>
        <Tabs.Button tabKey="2">Tab 2</Tabs.Button>
        <Tabs.Panel tabKey="1">Content 1</Tabs.Panel>
        <Tabs.Panel tabKey="2">Content 2</Tabs.Panel>
      </Tabs>,
    );

    expect(screen.getByText('Content 1')).toBeVisible();
    expect(screen.queryByText('Content 2')).not.toBeInTheDocument();

    await user.click(screen.getByText('Tab 2'));
    expect(screen.getByText('Content 2')).toBeVisible();
    expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
  });

  it('throws when parts used outside parent', () => {
    expect(() => render(<Tabs.Button tabKey="1">Tab</Tabs.Button>))
      .toThrow('must be used within');
  });
});
```

### Pattern 25.9: FSD Placement (MEDIUM)

```
src/shared/ui/
├── Tabs/
│   ├── Tabs.tsx          # Root compound
│   ├── TabButton.tsx     # Part
│   ├── TabPanel.tsx      # Part
│   ├── TabsContext.tsx   # Shared state
│   └── index.ts          # Dot notation assembly + exports
├── Accordion/
│   └── ...
└── DataList/
    └── ...

src/widgets/settings-tabs/
├── ui/SettingsTabs.tsx   # Composes shared Tabs with feature content
└── index.ts
```

### Pattern 25.10: Anti-patterns (MEDIUM)

**1. Prop drilling instead of context** — Passing state through every child prop.
```typescript
// BAD: Props to every child
<Tab active={activeKey === '1'} onClick={() => setActive('1')}>
// FIX: Context-based compound — children auto-connect
```

**2. Breaking compound contract** — Using compound parts outside their parent.
```typescript
// BAD: TabPanel without Tabs → crash
<TabPanel tabKey="1">Content</TabPanel>
// FIX: Error boundary in useContext + clear error message
```

**3. Over-engineering** — Compound for a component with only 1 part.
```
// FIX: Compound when 3+ cooperating parts share state. Simple = props.
```

**4. Implicit ordering dependency** — Parts that must be in specific order without enforcement.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (25.1–25.10)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Compound Component Specialist | EPS v3.2 | Metadata v2.1*
