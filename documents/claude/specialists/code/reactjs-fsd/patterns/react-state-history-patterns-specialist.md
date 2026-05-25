# React State History Patterns Specialist
# React状態履歴パターンスペシャリスト
# Chuyen Gia State History Patterns React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Features (history state in feature model layer) |
| **Directory Pattern** | `src/features/{name}/model/history.ts`, `src/shared/lib/history/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 31.1–31.8 |
| **Source Paths** | `**/model/history.ts`, `src/shared/lib/history/**` |
| **File Count** | 1–4 history utility files |
| **Naming Convention** | `useUndo.ts`, `useHistory.ts`, `commandStack.ts` |
| **Imports From** | Shared (types, zustand) |
| **Cannot Import** | Presentation/UI |
| **Imported By** | Features (undo/redo in editors, form wizards) |
| **Dependencies** | `zustand:5.x` (temporal middleware option), or None (custom) |
| **When To Use** | Undo/redo, form wizard step navigation, canvas/editor history, multi-step workflows |
| **Source Skeleton** | `src/shared/lib/history/useUndo.ts`, `src/shared/lib/history/commandStack.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate state history patterns — undo/redo hook, command pattern, Zustand temporal middleware, wizard history |
| **Activation Trigger** | files: **/model/history.ts, src/shared/lib/history/**; keywords: undoRedo, stateHistory, commandPattern, wizardHistory |

---

## Evidence Sources

- E1: Command pattern (GoF) adapted for React state
- E2: Zustand temporal middleware (zundo)
- E3: Canvas/editor undo patterns
- E4: Multi-step form wizard navigation

---

## Patterns

### Pattern 31.1: useUndo Hook (CRITICAL)

Generic undo/redo hook for any state type.

```typescript
// src/shared/lib/history/useUndo.ts
interface UndoState<T> {
  past: T[];
  present: T;
  future: T[];
}

interface UndoActions<T> {
  set: (newPresent: T | ((prev: T) => T)) => void;
  undo: () => void;
  redo: () => void;
  reset: (newPresent: T) => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useUndo<T>(initialPresent: T, maxHistory = 50): [T, UndoActions<T>] {
  const [state, setState] = useState<UndoState<T>>({
    past: [],
    present: initialPresent,
    future: [],
  });

  const set = useCallback((newPresent: T | ((prev: T) => T)) => {
    setState((s) => {
      const resolved = typeof newPresent === 'function'
        ? (newPresent as (prev: T) => T)(s.present)
        : newPresent;
      return {
        past: [...s.past, s.present].slice(-maxHistory),
        present: resolved,
        future: [],
      };
    });
  }, [maxHistory]);

  const undo = useCallback(() => {
    setState((s) => {
      if (s.past.length === 0) return s;
      const previous = s.past[s.past.length - 1];
      return {
        past: s.past.slice(0, -1),
        present: previous,
        future: [s.present, ...s.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((s) => {
      if (s.future.length === 0) return s;
      const next = s.future[0];
      return {
        past: [...s.past, s.present],
        present: next,
        future: s.future.slice(1),
      };
    });
  }, []);

  const reset = useCallback((newPresent: T) => {
    setState({ past: [], present: newPresent, future: [] });
  }, []);

  return [state.present, {
    set, undo, redo, reset,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  }];
}

// Usage — text editor
function TextEditor() {
  const [content, { set, undo, redo, canUndo, canRedo }] = useUndo('');

  useEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      e.shiftKey ? redo() : undo();
    }
  });

  return (
    <div>
      <Space>
        <Button onClick={undo} disabled={!canUndo} icon={<UndoOutlined />} />
        <Button onClick={redo} disabled={!canRedo} icon={<RedoOutlined />} />
      </Space>
      <Input.TextArea value={content} onChange={(e) => set(e.target.value)} />
    </div>
  );
}
```

### Pattern 31.2: Command Pattern (HIGH)

Typed commands for complex undo/redo with metadata.

```typescript
// src/shared/lib/history/commandStack.ts
interface Command<TState> {
  execute: (state: TState) => TState;
  undo: (state: TState) => TState;
  description: string;
}

export class CommandStack<TState> {
  private history: Command<TState>[] = [];
  private position = -1;
  private maxHistory: number;

  constructor(maxHistory = 100) { this.maxHistory = maxHistory; }

  execute(command: Command<TState>, state: TState): TState {
    this.history = this.history.slice(0, this.position + 1);
    this.history.push(command);
    if (this.history.length > this.maxHistory) this.history.shift();
    else this.position++;
    return command.execute(state);
  }

  undo(state: TState): TState | null {
    if (this.position < 0) return null;
    return this.history[this.position--].undo(state);
  }

  redo(state: TState): TState | null {
    if (this.position >= this.history.length - 1) return null;
    return this.history[++this.position].execute(state);
  }

  get canUndo() { return this.position >= 0; }
  get canRedo() { return this.position < this.history.length - 1; }
  get historyList() { return this.history.map((c, i) => ({ description: c.description, isCurrent: i === this.position })); }
}

// Commands
const addItemCommand = (item: Item): Command<CanvasState> => ({
  execute: (s) => ({ ...s, items: [...s.items, item] }),
  undo: (s) => ({ ...s, items: s.items.filter((i) => i.id !== item.id) }),
  description: `Add ${item.name}`,
});

const moveItemCommand = (id: string, from: Position, to: Position): Command<CanvasState> => ({
  execute: (s) => ({ ...s, items: s.items.map((i) => i.id === id ? { ...i, position: to } : i) }),
  undo: (s) => ({ ...s, items: s.items.map((i) => i.id === id ? { ...i, position: from } : i) }),
  description: `Move item to (${to.x}, ${to.y})`,
});
```

### Pattern 31.3: History Stack with Max Length (HIGH)

```typescript
// Prevent memory leak — cap history at N entries
const [content, actions] = useUndo(initialValue, 50); // Max 50 undo steps

// For large objects: store diffs instead of full snapshots
interface DiffCommand<T> {
  forward: Partial<T>;  // Changes to apply
  backward: Partial<T>; // Changes to revert
  description: string;
}
```

### Pattern 31.4: Zustand Temporal Middleware (HIGH)

```typescript
// Using zundo for Zustand undo/redo
import { create } from 'zustand';
import { temporal } from 'zundo';

interface EditorState {
  content: string;
  fontSize: number;
  setContent: (content: string) => void;
  setFontSize: (size: number) => void;
}

export const useEditorStore = create<EditorState>()(
  temporal(
    (set) => ({
      content: '',
      fontSize: 14,
      setContent: (content) => set({ content }),
      setFontSize: (size) => set({ fontSize: size }),
    }),
    {
      limit: 100,
      equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
      partialize: (state) => ({
        content: state.content,
        fontSize: state.fontSize,
      }),
    },
  ),
);

// Usage
const { undo, redo, pastStates, futureStates } = useEditorStore.temporal.getState();
```

### Pattern 31.5: AntD Steps + History (MEDIUM-HIGH)

```typescript
// Wizard with step history — can go back to any previous step
function WizardWithHistory() {
  const [currentStep, { set: goToStep, undo: goBack, canUndo }] = useUndo(0);
  const [formData, setFormData] = useState<Record<number, any>>({});

  const steps = [
    { title: 'Personal', content: <PersonalForm data={formData[0]} /> },
    { title: 'Address', content: <AddressForm data={formData[1]} /> },
    { title: 'Confirm', content: <ConfirmStep data={formData} /> },
  ];

  return (
    <>
      <Steps current={currentStep} items={steps.map((s) => ({ title: s.title }))} />
      <div className="step-content">{steps[currentStep].content}</div>
      <Space>
        <Button onClick={goBack} disabled={!canUndo}>Back</Button>
        <Button type="primary" onClick={() => {
          setFormData((d) => ({ ...d, [currentStep]: getCurrentValues() }));
          goToStep(currentStep + 1);
        }}>
          {currentStep === steps.length - 1 ? 'Submit' : 'Next'}
        </Button>
      </Space>
    </>
  );
}
```

### Pattern 31.6: Optimistic History (MEDIUM)

Revert on server error after optimistic update.

```typescript
function useOptimisticUndo<T>(initialState: T) {
  const [state, { set, undo }] = useUndo(initialState);

  const optimisticUpdate = useCallback(async (
    newState: T,
    serverAction: () => Promise<void>,
  ) => {
    set(newState);       // Optimistic: update immediately
    try {
      await serverAction(); // Confirm with server
    } catch (error) {
      undo();             // Revert on failure
      throw error;
    }
  }, [set, undo]);

  return { state, optimisticUpdate, undo };
}
```

### Pattern 31.7: Keyboard Shortcuts (MEDIUM)

```typescript
// Ctrl+Z / Cmd+Z for undo, Ctrl+Shift+Z / Cmd+Shift+Z for redo
function useUndoKeyboard(undo: () => void, redo: () => void) {
  useEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    if (e.key === 'z') {
      e.preventDefault();
      e.shiftKey ? redo() : undo();
    }
    if (e.key === 'y') {
      e.preventDefault();
      redo();
    }
  });
}
```

### Pattern 31.8: Anti-patterns (MEDIUM)

**1. Storing full state snapshots** — Memory-heavy for large objects. Use diffs.
**2. No max history** — Unbounded history array → memory leak.
**3. Undo crossing transaction boundary** — Undoing part of a multi-step atomic operation.
**4. Missing keyboard shortcuts** — Users expect Ctrl+Z to work.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (31.1–31.8)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React State History Patterns Specialist | EPS v3.2 | Metadata v2.1*
