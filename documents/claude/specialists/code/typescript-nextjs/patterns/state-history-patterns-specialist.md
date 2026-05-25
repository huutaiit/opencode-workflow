# State History Patterns Specialist
# 状態履歴パターンスペシャリスト

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation / Application |
| **Directory Pattern** | Custom hooks, state management |
| **Variant** | ALL |
| **Pattern Numbers** | 121.1–121.5 |
| **Source Paths** | `hooks/useUndoRedo.ts`, `hooks/useAutoSave.ts` |
| **File Count** | 2-3 |
| **Naming Convention** | `useUndoRedo`, `useAutoSave`, `useDirtyTracking` |
| **Imports From** | React: useState, useCallback, useRef, useEffect |
| **Imported By** | Complex editors, workflow designers, form builders |
| **Cannot Import** | N/A |
| **Dependencies** | N/A (React built-in) |
| **When To Use** | Complex editors with undo/redo, auto-save |
| **Source Skeleton** | `hooks/useUndoRedo.ts`, `hooks/useAutoSave.ts` |
| **Specialist Type** | pattern |
| **Purpose** | State history patterns: undo/redo state machine, auto-save with debounce, dirty tracking, keyboard shortcuts |
| **Activation Trigger** | undo, redo, auto-save, history, dirty, unsaved changes, Ctrl+Z |

---

## Description

Generic state history patterns extracted from StarX4CRM workflow designer. Applicable to any complex editor: form builders, diagram editors, dashboard configurators, rich content editors.

---

## Rules

### 121.1 — Undo/Redo State Machine

```typescript
'use client'
import { useState, useCallback } from 'react'

interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
}

const MAX_HISTORY_SIZE = 50

export function useUndoRedo<T>(initialState: T) {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  })

  const setState = useCallback((newState: T | ((prev: T) => T)) => {
    setHistory((prev) => {
      const nextState = typeof newState === 'function'
        ? (newState as (prev: T) => T)(prev.present)
        : newState

      // Skip if no actual change
      if (JSON.stringify(nextState) === JSON.stringify(prev.present)) return prev

      return {
        past: [...prev.past.slice(-MAX_HISTORY_SIZE + 1), prev.present],
        present: nextState,
        future: [], // Clear future on new action
      }
    })
  }, [])

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev
      const newPast = [...prev.past]
      const previous = newPast.pop()!
      return { past: newPast, present: previous, future: [prev.present, ...prev.future] }
    })
  }, [])

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev
      const newFuture = [...prev.future]
      const next = newFuture.shift()!
      return { past: [...prev.past, prev.present], present: next, future: newFuture }
    })
  }, [])

  return {
    state: history.present,
    setState,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    historySize: history.past.length,
  }
}
```

### 121.2 — Keyboard Shortcuts

```typescript
'use client'
import { useEffect } from 'react'

export function useHistoryKeyboard(
  undo: () => void,
  redo: () => void,
  canUndo: boolean,
  canRedo: boolean
) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          if (canRedo) redo()
        } else {
          if (canUndo) undo()
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault()
        if (canRedo) redo()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo, canUndo, canRedo])
}
```

### 121.3 — Auto-Save with Debounce

```typescript
'use client'
import { useEffect, useRef, useCallback } from 'react'

export function useAutoSave<T>(
  data: T,
  saveFn: (data: T) => Promise<void>,
  options: { intervalMs?: number; enabled?: boolean } = {}
) {
  const { intervalMs = 30_000, enabled = true } = options
  const isDirtyRef = useRef(false)
  const isSavingRef = useRef(false)
  const previousDataRef = useRef<T>(data)

  // Track changes
  useEffect(() => {
    if (JSON.stringify(data) !== JSON.stringify(previousDataRef.current)) {
      isDirtyRef.current = true
      previousDataRef.current = data
    }
  }, [data])

  // Auto-save on interval
  useEffect(() => {
    if (!enabled) return

    const interval = setInterval(async () => {
      if (!isDirtyRef.current || isSavingRef.current) return

      isSavingRef.current = true
      try {
        await saveFn(data)
        isDirtyRef.current = false
      } catch (error) {
        console.error('Auto-save failed:', error)
      } finally {
        isSavingRef.current = false
      }
    }, intervalMs)

    return () => clearInterval(interval)
  }, [data, saveFn, intervalMs, enabled])

  // Manual save
  const save = useCallback(async () => {
    if (isSavingRef.current) return
    isSavingRef.current = true
    try {
      await saveFn(data)
      isDirtyRef.current = false
    } finally {
      isSavingRef.current = false
    }
  }, [data, saveFn])

  return {
    isDirty: isDirtyRef.current,
    isSaving: isSavingRef.current,
    save,
  }
}
```

### 121.4 — Dirty Tracking & Navigation Guard

```typescript
'use client'
import { useEffect } from 'react'

export function useUnsavedChangesGuard(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return

    // Browser close/refresh warning
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = '' // Required for Chrome
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])
}
```

### 121.5 — Significant Change Filter

```typescript
// ✅ Filter out insignificant changes (e.g., position-only changes in diagrams)
function isSignificantChange<T>(prev: T, next: T, ignoreKeys: string[] = []): boolean {
  const prevCopy = { ...prev }
  const nextCopy = { ...next }

  for (const key of ignoreKeys) {
    delete (prevCopy as Record<string, unknown>)[key]
    delete (nextCopy as Record<string, unknown>)[key]
  }

  return JSON.stringify(prevCopy) !== JSON.stringify(nextCopy)
}

// Usage in workflow designer:
// Only record undo when node data changes, not just position drag
if (isSignificantChange(prevNodes, nextNodes, ['position', 'dragging'])) {
  recordHistory(nextNodes)
}
```

---

## Anti-Patterns

| # | Anti-Pattern | Why Bad | Fix |
|---|-------------|---------|-----|
| 1 | Unlimited history | Memory leak | MAX_HISTORY_SIZE cap |
| 2 | No concurrent save guard | Double save, race conditions | isSavingRef flag |
| 3 | Record every change in undo | Position drags flood history | Significant change filter |
| 4 | No beforeunload guard | User loses unsaved work | useUnsavedChangesGuard |
| 5 | Sync deep comparison | Expensive on large state | Debounce + shallow keys |
