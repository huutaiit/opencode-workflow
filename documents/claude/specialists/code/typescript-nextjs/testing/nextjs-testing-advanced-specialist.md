# Next.js Testing Advanced Specialist
# Next.jsテスト上級スペシャリスト

**Stack**: Next.js 16 + React 19 + TypeScript 5 | **Variant**: ALL (Generic)

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting) |
| **Directory Pattern** | `__tests__/`, `*.test.ts`, `*.spec.ts`, `e2e/`, `tests/` |
| **Variant** | ALL |
| **Pattern Numbers** | 118.1–118.6 |
| **Source Paths** | `**/*.test.ts`, `**/*.spec.ts`, `e2e/**`, `tests/**` |
| **File Count** | Varies |
| **Naming Convention** | `*.test.ts` (unit/integration), `*.spec.ts` (E2E) |
| **Imports From** | `vitest`, `@playwright/test`, `@testing-library/react` |
| **Imported By** | N/A (test files) |
| **Cannot Import** | N/A |
| **Dependencies** | vitest, @playwright/test, @testing-library/react, msw@2 |
| **When To Use** | E2E + advanced unit testing |
| **Source Skeleton** | `vitest.config.ts`, `playwright.config.ts`, `e2e/`, `mocks/handlers.ts` |
| **Specialist Type** | rule-set |
| **Purpose** | Advanced testing: Vitest unit, Playwright E2E, Testing Library, MSW API mocking, AAA pattern |
| **Activation Trigger** | test, vitest, playwright, testing library, msw, e2e, unit test, integration test |

---

## Rules

### 118.1 — Vitest Unit Testing

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ✅ vi.mock() BEFORE imports
vi.mock('@/lib/prisma', () => ({
  prisma: { user: { findUnique: vi.fn(), create: vi.fn() } },
}))

import { getUser } from '@/app/actions'
import { prisma } from '@/lib/prisma'

describe('getUser', () => {
  beforeEach(() => {
    vi.clearAllMocks() // Reset between tests
  })

  it('returns user when found', async () => {
    // Arrange
    const mockUser = { id: '1', name: 'Alice', email: 'alice@test.com' }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)

    // Act
    const result = await getUser('1')

    // Assert
    expect(result).toEqual(mockUser)
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: '1' } })
  })

  it('throws when user not found', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    await expect(getUser('999')).rejects.toThrow('User not found')
  })
})
```

**Rules**:
- `vi.mock()` at TOP of file (before imports)
- `vi.clearAllMocks()` in `beforeEach`
- AAA pattern: Arrange → Act → Assert
- 3-5 focused tests per file
- Test valid, invalid, and edge cases

### 118.2 — Playwright E2E Testing

```typescript
import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: login
    await page.goto('/login')
    await page.getByTestId('email-input').fill('admin@test.com')
    await page.getByTestId('password-input').fill('password')
    await page.getByTestId('login-button').click()
    await page.waitForURL('/dashboard')
  })

  test('shows user dashboard with data', async ({ page }) => {
    // ✅ Use data-testid (NOT CSS selectors)
    await expect(page.getByTestId('dashboard-title')).toBeVisible()
    await expect(page.getByTestId('user-count')).toContainText(/\d+/)
  })

  test('handles API error gracefully', async ({ page }) => {
    // ✅ Mock API for deterministic testing
    await page.route('/api/dashboard', (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) })
    )
    await page.goto('/dashboard')
    await expect(page.getByTestId('error-message')).toBeVisible()
  })
})
```

**Rules**:
- `data-testid` for selectors (NOT CSS/XPath)
- `toBeVisible()` before content assertions
- Leverage auto-waiting (NO explicit `sleep`)
- `page.route()` for API mocking
- 3-5 focused tests per file
- Test critical user workflows

### 118.3 — Testing Library (Component Testing)

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UserCard } from '@/components/UserCard'

describe('UserCard', () => {
  it('renders user information', () => {
    render(<UserCard user={{ name: 'Alice', email: 'alice@test.com' }} />)

    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('alice@test.com')).toBeInTheDocument()
  })

  it('calls onEdit when edit button clicked', async () => {
    const onEdit = vi.fn()
    render(<UserCard user={mockUser} onEdit={onEdit} />)

    fireEvent.click(screen.getByRole('button', { name: /edit/i }))

    expect(onEdit).toHaveBeenCalledWith(mockUser.id)
  })
})
```

### 118.4 — MSW API Mocking

```typescript
// mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ])
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ id: '3', ...body }, { status: 201 })
  }),

  http.get('/api/users/:id', ({ params }) => {
    if (params.id === '999') {
      return HttpResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return HttpResponse.json({ id: params.id, name: 'Alice' })
  }),
]

// vitest.setup.ts
import { setupServer } from 'msw/node'
import { handlers } from './mocks/handlers'

const server = setupServer(...handlers)
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### 118.5 — Test Organization

```
__tests__/             or co-located
├── unit/              # Business logic, utilities
├── integration/       # Component + API interaction
├── e2e/               # Full user workflows (Playwright)
└── mocks/             # MSW handlers, fixtures
```

### 118.6 — Skip Visual Testing

- Avoid testing CSS/visual styles directly
- Use visual regression tools (Chromatic, Percy) separately
- Focus on behavior: renders content, handles events, shows errors

---

## Anti-Patterns

| # | Anti-Pattern | Why Bad | Fix |
|---|-------------|---------|-----|
| 1 | CSS selectors in E2E | Brittle, breaks on styling changes | data-testid |
| 2 | `sleep()` / explicit waits | Flaky, slow | Playwright auto-waiting |
| 3 | Testing implementation details | Breaks on refactor | Test behavior/output |
| 4 | No mock cleanup | Test pollution | vi.clearAllMocks() in beforeEach |
| 5 | Huge test files | Hard to maintain | 3-5 tests per file |
