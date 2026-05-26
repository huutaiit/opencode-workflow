# React Headless Patterns Specialist
# Reactヘッドレスパターンスペシャリスト
# Chuyen Gia Headless Patterns React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Shared (headless components/hooks in shared/lib or shared/ui) |
| **Directory Pattern** | `src/shared/lib/headless/`, `src/shared/ui/headless/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 28.1–28.8 |
| **Source Paths** | `src/shared/lib/headless/**`, `src/shared/ui/headless/**` |
| **File Count** | 3–10 headless components/hooks per project |
| **Naming Convention** | `use{Component}.ts` (headless hook), `{Component}Headless.tsx` (headless component) |
| **Imports From** | Shared (types, utilities) |
| **Cannot Import** | Features, Pages, any UI library directly (headless = behavior only) |
| **Imported By** | Shared/ui (headless + AntD styling), Features (headless + custom styling) |
| **Dependencies** | None (pure behavior, no UI library dependency) |
| **When To Use** | Reusable behavior without UI opinion — combobox, dialog, tooltip, dropdown where AntD doesn't fit exact need |
| **Source Skeleton** | `src/shared/lib/headless/use{Component}.ts`, `src/shared/lib/headless/{Component}.types.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate headless component patterns — behavior-only hooks/components, Radix UI primitives, AntD + headless interop |
| **Activation Trigger** | files: src/shared/lib/headless/**; keywords: headless, behaviorOnly, radixPrimitive, unstyled |

---

## Evidence Sources

- E1: Headless UI pattern — separation of behavior from presentation
- E2: Radix UI primitives documentation
- E3: TanStack Table headless architecture
- E4: React Hook Form as headless form engine

---

## Patterns

### Pattern 28.1: Headless Hook Pattern (CRITICAL)

Return state + handlers + ARIA attributes from a hook. UI is consumer's responsibility.

```typescript
// src/shared/lib/headless/useCombobox.ts
interface UseComboboxOptions<T> {
  items: T[];
  itemToString: (item: T) => string;
  onSelect: (item: T) => void;
  filterFn?: (item: T, query: string) => boolean;
}

interface UseComboboxReturn<T> {
  inputProps: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onFocus: () => void;
    onBlur: () => void;
    role: 'combobox';
    'aria-expanded': boolean;
    'aria-autocomplete': 'list';
    'aria-controls': string;
    'aria-activedescendant': string | undefined;
  };
  listProps: {
    role: 'listbox';
    id: string;
  };
  getItemProps: (item: T, index: number) => {
    role: 'option';
    id: string;
    'aria-selected': boolean;
    onClick: () => void;
    onMouseEnter: () => void;
  };
  isOpen: boolean;
  filteredItems: T[];
  highlightedIndex: number;
}

export function useCombobox<T>({
  items,
  itemToString,
  onSelect,
  filterFn,
}: UseComboboxOptions<T>): UseComboboxReturn<T> {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listId = useId();

  const filteredItems = filterFn
    ? items.filter((item) => filterFn(item, query))
    : items.filter((item) => itemToString(item).toLowerCase().includes(query.toLowerCase()));

  // ... keyboard navigation, selection, ARIA props
  return {
    inputProps: {
      value: query,
      onChange: (e) => { setQuery(e.target.value); setIsOpen(true); },
      onKeyDown: (e) => {
        if (e.key === 'ArrowDown') setHighlightedIndex((i) => Math.min(i + 1, filteredItems.length - 1));
        if (e.key === 'ArrowUp') setHighlightedIndex((i) => Math.max(i - 1, 0));
        if (e.key === 'Enter' && highlightedIndex >= 0) {
          onSelect(filteredItems[highlightedIndex]);
          setIsOpen(false);
        }
        if (e.key === 'Escape') setIsOpen(false);
      },
      onFocus: () => setIsOpen(true),
      onBlur: () => setTimeout(() => setIsOpen(false), 200),
      role: 'combobox',
      'aria-expanded': isOpen,
      'aria-autocomplete': 'list',
      'aria-controls': listId,
      'aria-activedescendant': highlightedIndex >= 0 ? `${listId}-${highlightedIndex}` : undefined,
    },
    listProps: { role: 'listbox', id: listId },
    getItemProps: (item, index) => ({
      role: 'option',
      id: `${listId}-${index}`,
      'aria-selected': index === highlightedIndex,
      onClick: () => { onSelect(item); setIsOpen(false); setQuery(itemToString(item)); },
      onMouseEnter: () => setHighlightedIndex(index),
    }),
    isOpen,
    filteredItems,
    highlightedIndex,
  };
}
```

```typescript
// Consumer — render with AntD styling
function UserSelect({ users, onSelect }: { users: User[]; onSelect: (u: User) => void }) {
  const { inputProps, listProps, getItemProps, isOpen, filteredItems, highlightedIndex } = useCombobox({
    items: users,
    itemToString: (u) => u.displayName,
    onSelect,
  });

  return (
    <div style={{ position: 'relative' }}>
      <Input {...inputProps} placeholder="Search users..." />
      {isOpen && filteredItems.length > 0 && (
        <ul {...listProps} className="dropdown-list">
          {filteredItems.map((user, i) => (
            <li
              key={user.id}
              {...getItemProps(user, i)}
              className={i === highlightedIndex ? 'highlighted' : ''}
            >
              <Avatar size="small" /> {user.displayName}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Pattern 28.2: Headless + AntD Styling (HIGH)

Apply AntD design tokens to headless behavior components.

```typescript
// Headless dialog hook
function useDialog() {
  const [isOpen, setIsOpen] = useState(false);
  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    dialogProps: {
      open: isOpen,
      onClose: () => setIsOpen(false),
      'aria-modal': true as const,
      role: 'dialog' as const,
    },
  };
}

// Render with AntD Modal
function ConfirmDialog() {
  const { isOpen, open, close } = useDialog();

  return (
    <>
      <Button onClick={open}>Open</Button>
      <Modal open={isOpen} onCancel={close} title="Confirm" onOk={() => { handleConfirm(); close(); }}>
        Are you sure?
      </Modal>
    </>
  );
}
```

### Pattern 28.3: Radix UI Primitives (MEDIUM-HIGH)

Using Radix for complex accessibility behavior, AntD for visual styling.

```typescript
// Radix provides behavior + a11y, we add AntD visual styling
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Button } from 'antd';
import { DownOutlined } from '@ant-design/icons';

function ActionsDropdown({ actions }: { actions: Action[] }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button icon={<DownOutlined />}>Actions</Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className="antd-dropdown-content" sideOffset={4}>
          {actions.map((action) => (
            <DropdownMenu.Item
              key={action.key}
              className="antd-dropdown-item"
              onSelect={() => action.onClick()}
              disabled={action.disabled}
            >
              {action.icon} {action.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
```

### Pattern 28.4: Behavior-only Components (MEDIUM-HIGH)

Separate logic completely from presentation.

```typescript
// src/shared/lib/headless/Sortable.tsx — behavior only
interface SortableProps<T> {
  items: T[];
  sortFns: Record<string, (a: T, b: T) => number>;
  defaultSort?: string;
  children: (state: {
    sortedItems: T[];
    sortKey: string;
    sortDirection: 'asc' | 'desc';
    onSort: (key: string) => void;
  }) => React.ReactNode;
}

function Sortable<T>({ items, sortFns, defaultSort, children }: SortableProps<T>) {
  const [sortKey, setSortKey] = useState(defaultSort ?? Object.keys(sortFns)[0]);
  const [direction, setDirection] = useState<'asc' | 'desc'>('asc');

  const sortedItems = useMemo(() => {
    const fn = sortFns[sortKey];
    const sorted = [...items].sort(fn);
    return direction === 'desc' ? sorted.reverse() : sorted;
  }, [items, sortKey, direction, sortFns]);

  const onSort = (key: string) => {
    if (key === sortKey) setDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setDirection('asc'); }
  };

  return <>{children({ sortedItems, sortKey, sortDirection: direction, onSort })}</>;
}
```

### Pattern 28.5: Headless Table (TanStack Table) (HIGH)

```typescript
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table';
import { Table as AntdTable } from 'antd';

// TanStack Table = headless. AntD Table = styled.
// Use TanStack for complex logic, AntD for simple display.

function useUserTable(users: User[]) {
  const table = useReactTable({
    data: users,
    columns: userColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    // Complex: row selection, column visibility, grouping
  });
  return table;
}
```

### Pattern 28.6: Headless Form (React Hook Form) (HIGH)

```typescript
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, Input, Select, Button } from 'antd';

// RHF = headless form logic. AntD = visual form components.
function CreateUserForm() {
  const { control, handleSubmit, formState: { errors } } = useForm<CreateUserDTO>({
    resolver: zodResolver(createUserSchema),
  });

  return (
    <Form layout="vertical" onFinish={handleSubmit(onSubmit)}>
      <Form.Item label="Email" validateStatus={errors.email ? 'error' : ''} help={errors.email?.message}>
        <Controller name="email" control={control} render={({ field }) => <Input {...field} />} />
      </Form.Item>
      <Button type="primary" htmlType="submit">Create</Button>
    </Form>
  );
}
```

### Pattern 28.7: Accessibility Built-in (MEDIUM)

Headless layer handles all ARIA attributes — consumers don't need to think about a11y.

```typescript
// Headless handles: role, aria-expanded, aria-controls, keyboard nav
const { inputProps } = useCombobox({ ... });
// inputProps includes: role="combobox", aria-expanded, aria-autocomplete, aria-controls

// Consumer just spreads props — a11y is automatic
<input {...inputProps} className="my-custom-input" />
```

### Pattern 28.8: Anti-patterns (MEDIUM)

**1. Leaking implementation** — Headless hook exposing internal state management details.
```
// FIX: Return only the public API: props objects, state values, handler functions
```

**2. Missing keyboard support** — Headless dropdown without Arrow/Enter/Escape handling.
```
// FIX: Keyboard nav is core headless responsibility, not consumer's job
```

**3. Coupling behavior to styling** — Headless hook importing AntD or CSS.
```
// FIX: Headless = zero UI imports. Styling is consumer's concern.
```

**4. Using headless when AntD suffices** — Building custom combobox when AntD Select works fine.
```
// FIX: Use AntD first. Headless only when AntD can't meet the exact UX requirement.
```

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (28.1–28.8)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Headless Patterns Specialist | EPS v3.2 | Metadata v2.1*
