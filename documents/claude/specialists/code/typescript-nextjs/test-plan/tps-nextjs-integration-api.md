# Test Plan Specialist — NextJS Integration Testing: API Mocking
# テストプランスペシャリスト — NextJS Integration Testing: API Mocking
# Chuyen Gia Test — NextJS Integration Testing: API Mocking

**Version**: 1.0.0
**Technology**: Vitest/Jest + @testing-library/react + Playwright
**Purpose**: API integration testing - MSW handlers for REST/GraphQL, error simulation, loading states, optimistic updates

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | INT-A |
| **Specialist Type** | code |
| **Purpose** | API integration testing - MSW handlers for REST/GraphQL, error simulation, loading states, optimistic updates |

---

## Patterns

### Pattern INT-A.1: MSW REST Handler

server.use(rest.get("/api/users", (req, res, ctx) => res(ctx.json(mockUsers)))). render(<UserList />). await waitFor(() => screen.getByText("John")). Verify: component fetches + renders API data.

---

### Pattern INT-A.2: MSW Error Simulation

server.use(rest.get("/api/users", (req, res, ctx) => res(ctx.status(500)))). render(<UserList />). await waitFor(() => screen.getByText("Something went wrong")). Verify: error handling UI.

---

### Pattern INT-A.3: MSW Network Delay

server.use(rest.get("/api/users", (req, res, ctx) => res(ctx.delay(2000), ctx.json([])))). render(<UserList />). expect(screen.getByRole("progressbar")).toBeInTheDocument(). Verify: loading state.

---

### Pattern INT-A.4: Optimistic Update

render(<TodoList />). userEvent.click(addButton). expect(screen.getByText("New Todo")).toBeInTheDocument(). // immediate. await waitFor(() => expect(server requests).toHaveLength(1)). // API call follows.

---

## ❌ Negative Example

BAD: Mock fetch() globally (jest.spyOn(global, "fetch")). Fragile, misses URL/header issues. GOOD: MSW intercepts at network level - tests real fetch call.

---

## Quality Checklist

- [ ] **Q1**: Testing Library queries used (getByRole > getByTestId)?
- [ ] **Q2**: User interaction via userEvent (not fireEvent)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: axe-core accessibility check on every component?

---

*Test Plan Specialist — NextJS Integration Testing: API Mocking | EPS v10.0*
