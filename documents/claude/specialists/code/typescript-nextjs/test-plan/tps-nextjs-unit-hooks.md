# Test Plan Specialist — NextJS Unit Testing: Custom Hooks
# テストプランスペシャリスト — NextJS Unit Testing: Custom Hooks
# Chuyen Gia Test — NextJS Unit Testing: Custom Hooks

**Version**: 1.0.0
**Technology**: Vitest/Jest + @testing-library/react + Playwright
**Purpose**: Hook testing - renderHook for custom hooks, state changes, async effects, cleanup, dependency changes

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | UT-H |
| **Specialist Type** | code |
| **Purpose** | Hook testing - renderHook for custom hooks, state changes, async effects, cleanup, dependency changes |

---

## Patterns

### Pattern UT-H.1: Stateful Hook Testing

const { result } = renderHook(() => useCounter()). act(() => result.current.increment()). expect(result.current.count).toBe(1). Test initial state, state transitions.

---

### Pattern UT-H.2: Async Hook (Data Fetching)

Mock API via MSW: server.use(rest.get("/api/users", (req, res, ctx) => res(ctx.json(mockUsers)))). const { result } = renderHook(() => useUsers()). await waitFor(() => expect(result.current.data).toHaveLength(2)).

---

### Pattern UT-H.3: Hook with Dependencies

const { result, rerender } = renderHook(({ id }) => useUser(id), { initialProps: { id: 1 } }). rerender({ id: 2 }). await waitFor(() => expect(result.current.user.id).toBe(2)). Verify refetch on dep change.

---

### Pattern UT-H.4: Cleanup Testing

const { unmount } = renderHook(() => useWebSocket(url)). unmount(). Verify: WebSocket.close() called, no memory leak, no state update after unmount.

---

## ❌ Negative Example

BAD: Call hook outside React component (hooks rules violation). BAD: Test hook by testing component that uses it (indirect). GOOD: renderHook() for isolated hook testing.

---

## Quality Checklist

- [ ] **Q1**: Testing Library queries used (getByRole > getByTestId)?
- [ ] **Q2**: User interaction via userEvent (not fireEvent)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: axe-core accessibility check on every component?

---

*Test Plan Specialist — NextJS Unit Testing: Custom Hooks | EPS v10.0*
