# React E2E Testing Specialist
# React E2Eテストスペシャリスト
# Chuyen Gia E2E Testing React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — E2E tests validate entire application across all layers) |
| **Directory Pattern** | `e2e/`, `tests/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 63.1–63.8 |
| **Source Paths** | `e2e/**/*.spec.ts`, `tests/**/*.spec.ts` |
| **File Count** | 10–30 E2E test files |
| **Naming Convention** | `{feature}.spec.ts`, `{page}.spec.ts` |
| **Imports From** | E2E test utilities, page objects |
| **Cannot Import** | N/A (E2E tests run externally — not part of application import graph) |
| **Imported By** | N/A (test files are not imported by application code) |
| **Dependencies** | `@playwright/test:1.x` |
| **When To Use** | Critical user flows, cross-page navigation, form submissions, visual regression |
| **Source Skeleton** | `e2e/{feature}.spec.ts`, `e2e/fixtures/`, `e2e/pages/{Page}Page.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate E2E test patterns — Playwright setup, page objects, visual regression, CI integration |
| **Activation Trigger** | files: e2e/**/*.spec.ts; keywords: playwright, e2eTest, pageObject, visualRegression |

---

## Patterns

### Pattern 63.1: Playwright Setup (CRITICAL)

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', baseURL: 'http://localhost:5173',
  use: { trace: 'on-first-retry', screenshot: 'only-on-failure' },
  webServer: { command: 'pnpm dev', port: 5173, reuseExistingServer: !process.env.CI },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'mobile', use: { ...devices['iPhone 14'] } },
  ],
});
```

### Pattern 63.2: Page Object Model (CRITICAL)

```typescript
// e2e/pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}
  async goto() { await this.page.goto('/login'); }
  async login(email: string, password: string) {
    await this.page.getByLabel('Email').fill(email);
    await this.page.getByLabel('Password').fill(password);
    await this.page.getByRole('button', { name: 'Sign In' }).click();
  }
  async expectError(message: string) { await expect(this.page.getByRole('alert')).toContainText(message); }
}

// e2e/auth.spec.ts
test('successful login', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.login('admin@test.com', 'password');
  await expect(page).toHaveURL('/dashboard');
});
```

### Pattern 63.3: Critical User Flows (HIGH)

```typescript
test.describe('User CRUD Flow', () => {
  test('create → edit → delete user', async ({ page }) => {
    await page.goto('/users');
    await page.getByRole('button', { name: 'Create' }).click();
    await page.getByLabel('Email').fill('new@test.com');
    await page.getByLabel('Name').fill('New User');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('New User')).toBeVisible();
    // Edit...
    // Delete...
  });
});
```

### Pattern 63.4: Auth Fixtures (HIGH)

```typescript
// e2e/fixtures/auth.ts
import { test as base } from '@playwright/test';

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@test.com');
    await page.getByLabel('Password').fill('password');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL('/dashboard');
    await use(page);
  },
});

test('admin can access settings', async ({ authenticatedPage: page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
});
```

### Pattern 63.5: Visual Regression (MEDIUM-HIGH)

```typescript
test('dashboard matches screenshot', async ({ page }) => {
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('dashboard.png', { maxDiffPixels: 100 });
});
```

### Pattern 63.6-63.8: CI integration, API mocking in E2E, mobile testing, anti-patterns.

---

*React E2E Testing Specialist | EPS v3.2 | Metadata v2.1*
