# Test Plan Specialist — NextJS Unit Testing: Store/State Management
# テストプランスペシャリスト — NextJS Unit Testing: Store/State Management
# Chuyen Gia Test — NextJS Unit Testing: Store/State Management

**Version**: 1.0.0
**Technology**: Vitest/Jest + @testing-library/react + Playwright
**Purpose**: State management testing - Redux Toolkit/Zustand slices, async thunks, selectors, middleware

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | UT-ST |
| **Specialist Type** | code |
| **Purpose** | State management testing - Redux Toolkit/Zustand slices, async thunks, selectors, middleware |

---

## Patterns

### Pattern UT-ST.1: Redux Slice Testing

const state = counterSlice.reducer(initialState, increment()). expect(state.count).toBe(1). Test every action: initial state, each reducer, edge cases.

---

### Pattern UT-ST.2: Async Thunk Testing

Mock API via MSW. const result = await store.dispatch(fetchUsers()). expect(result.type).toBe("users/fetchUsers/fulfilled"). expect(store.getState().users.list).toHaveLength(3).

---

### Pattern UT-ST.3: Selector Testing

const state = { users: { list: [user1, user2], filter: "active" } }. expect(selectActiveUsers(state)).toEqual([user1]). Test memoization: same input -> same reference.

---

### Pattern UT-ST.4: Zustand Store Testing

const store = useStore.getState(). store.addItem(item). expect(useStore.getState().items).toContainEqual(item). Reset between tests: useStore.setState(initialState).

---

## ❌ Negative Example

BAD: Test store by rendering full app. GOOD: Test reducer/slice in isolation with direct dispatch + getState(). Zustand: useStore.getState() without React.

---

## Quality Checklist

- [ ] **Q1**: Testing Library queries used (getByRole > getByTestId)?
- [ ] **Q2**: User interaction via userEvent (not fireEvent)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: axe-core accessibility check on every component?

---

*Test Plan Specialist — NextJS Unit Testing: Store/State Management | EPS v10.0*
