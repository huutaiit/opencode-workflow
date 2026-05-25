# Test Plan Specialist — NextJS Integration Testing (Strategy + Routing)
# テストプランスペシャリスト — NextJS 統合テスト（戦略＋ルーティング）
# Chuyen Gia Test — Integration Test NextJS (Chien Luoc + Routing)

**Version**: 2.0.0
**Technology**: @testing-library/react + MSW + next/test-utils
**Aspect**: Integration Testing — Strategy Hub
**Purpose**: Integration test strategy for NextJS — page rendering, API mocking via MSW, Server Component testing

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | TPS-NEXTJS-INTEGRATION |
| **Specialist Type** | code |
| **Purpose** | Integration test strategy hub — routes to page-rendering and API-mocking test plans |
| **Activation Trigger** | files: **/*.integration.test.tsx; keywords: integration, msw, pageTest, serverComponent |

---

## Concern Routing Table

| Concern | Test Plan | File |
|---------|-----------|------|
| Page Rendering | TPS-NEXTJS-INT-PAGE | `tps-nextjs-integration-page.md` |
| API Mocking (MSW) | TPS-NEXTJS-INT-API | `tps-nextjs-integration-api.md` |
| E2E (Playwright) | TPS-NEXTJS-E2E | `tps-nextjs-e2e.md` |

## MSW Setup for NextJS

```typescript
// tests/mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'
export const server = setupServer(...handlers)

// tests/setup.ts
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

---

*Test Plan Specialist — NextJS Integration Testing (Strategy + Routing) v2.0 | EPS v10.0*
