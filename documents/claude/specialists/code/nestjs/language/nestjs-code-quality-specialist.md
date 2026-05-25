# NestJS Code Quality Specialist — Language
# NestJSコード品質スペシャリスト — 言語
# Chuyen Gia Chat Luong Code NestJS — Ngon Ngu

**Version**: 1.0.0
**Technology**: ESLint, Prettier, SonarQube for NestJS
**Aspect**: Code Quality & Linting
**Category**: language
**Purpose**: Knowledge provider for NestJS code quality — ESLint configuration, Prettier setup, naming conventions, code review checklist, SonarQube integration, Husky pre-commit hooks

---

## Metadata

```json
{
  "id": "nestjs-code-quality-specialist",
  "technology": "ESLint + Prettier + SonarQube for NestJS",
  "aspect": "Code Quality & Linting",
  "category": "language",
  "subcategory": "nestjs",
  "lines": 300,
  "token_cost": 1800,
  "version": "1.0.0",
  "evidence": [
    "E1: ESLint + @typescript-eslint — TypeScript-aware linting rules",
    "E2: Prettier — opinionated code formatter for consistent style",
    "E3: Husky + lint-staged — pre-commit quality enforcement"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL |
| **Variant** | ALL |
| **Pattern Numbers** | 247.1–247.6 |
| **Directory Pattern** | N/A (cross-cutting quality patterns) |
| **Dependencies** | typescript (built-in) |
| **When To Use** | TypeScript language patterns applicable to all NestJS code |
| **Source Skeleton** | src/**/*.ts |
| **Specialist Type** | code |
| **Purpose** | Code quality — ESLint rules, Prettier, naming conventions, code review guidelines |
| **Activation Trigger** | files: .eslintrc*, .prettierrc*; keywords: eslint, prettier, codeQuality, naming |

---

## Role

You are a **NestJS Code Quality Specialist**. You supply patterns for code quality enforcement in NestJS projects — ESLint configuration, Prettier formatting, naming conventions, Husky pre-commit hooks, and SonarQube integration.

---

## Patterns

### Pattern 247.1: ESLint Configuration

**Category**: Linting
**Description**: TypeScript-aware ESLint for NestJS projects.

```javascript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: { project: 'tsconfig.json', sourceType: 'module' },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: { node: true, jest: true },
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-empty-interface': 'off', // NestJS uses empty interfaces
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.js'],
};
```

**Key Points**:
- `no-floating-promises: error` — prevents unawaited async calls (common NestJS bug)
- `no-explicit-any: warn` — gradual migration away from `any`
- `no-empty-interface: off` — NestJS modules use empty interfaces

---

### Pattern 247.2: Prettier Configuration

**Category**: Formatting
**Description**: Opinionated formatting — zero debates about style.

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

---

### Pattern 247.3: Husky + lint-staged

**Category**: Enforcement
**Description**: Run lint + format on staged files before commit.

```json
// package.json
{
  "lint-staged": {
    "*.ts": ["eslint --fix", "prettier --write"],
    "*.{json,md,yaml,yml}": ["prettier --write"]
  }
}
```

```bash
# Setup
npx husky init
echo "npx lint-staged" > .husky/pre-commit
```

---

### Pattern 247.4: Naming Conventions

**Category**: Standards
**Description**: Consistent naming across NestJS codebase.

| Element | Convention | Example |
|---------|-----------|---------|
| File (class) | kebab-case | `order-service.ts` |
| File (DTO) | kebab-case with suffix | `create-order.dto.ts` |
| File (entity) | kebab-case with suffix | `order.entity.ts` |
| File (module) | kebab-case with suffix | `order.module.ts` |
| Class | PascalCase | `OrderService` |
| Interface | PascalCase (no I prefix) | `OrderRepository` |
| Constant | UPPER_SNAKE_CASE | `ORDER_REPOSITORY` |
| Variable/Function | camelCase | `findOrderById` |
| Enum | PascalCase (members UPPER_SNAKE) | `OrderStatus.PENDING` |
| Type | PascalCase | `CreateOrderInput` |

---

### Pattern 247.5: Import Organization

**Category**: Standards
**Description**: Consistent import ordering for readability.

```typescript
// 1. Node.js built-ins
import { randomUUID } from 'crypto';

// 2. NestJS framework
import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

// 3. Third-party libraries
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

// 4. Internal — shared/libs
import { ORDER_REPOSITORY } from '@libs/shared/tokens';

// 5. Internal — same feature
import { Order } from '../domain/order.entity';
import { CreateOrderDto } from './dto/create-order.dto';
```

**Key Points**:
- Enforce with ESLint `import/order` rule or `@trivago/prettier-plugin-sort-imports`
- Blank line between groups for visual separation
- Never use relative imports across feature boundaries — use path aliases

---

### Pattern 247.6: Code Review Checklist

**Category**: Process
**Description**: Quick checklist for NestJS code reviews.

| Category | Check |
|----------|-------|
| **DI** | All providers registered in module? |
| **DI** | Using Symbol tokens for ports? |
| **Validation** | DTOs have class-validator decorators? |
| **Error** | Domain exceptions, not HttpException in services? |
| **Testing** | New code has matching unit test? |
| **Async** | All promises awaited (no floating promises)? |
| **Security** | No secrets hardcoded? |
| **Naming** | Files follow kebab-case convention? |

---

## Best Practices

### Enforcement
- ESLint + Prettier in CI — block merge on lint errors
- Husky pre-commit — catch issues before push
- SonarQube for deep analysis — code smells, duplication, complexity

### tsconfig Strict Mode
- `strict: true` — enables all strict checks
- `noUncheckedIndexedAccess: true` — catches undefined array access
- `forceConsistentCasingInFileNames: true` — prevents case-sensitivity bugs

---

## Abnormal Case Patterns

1. **ESLint conflicts with Prettier** — formatting errors from ESLint. Fix: use `eslint-config-prettier` to disable conflicting rules.
2. **lint-staged too slow** — runs on entire codebase. Fix: ensure only staged files are linted (default behavior).
3. **Import path alias not resolved** — ESLint can't find `@libs/*`. Fix: configure `eslint-import-resolver-typescript`.
4. **SonarQube false positive** — flags NestJS decorators as unused. Fix: configure SonarQube to ignore decorator patterns.
5. **Husky not running** — hooks not executable. Fix: `chmod +x .husky/pre-commit`.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E3)?
- [ ] **Q2**: Pattern IDs unique (247.1-247.6)?
- [ ] **Q3**: Trilingual header?
- [ ] **Q4**: No implementation code?

---

*NestJS Code Quality Specialist — Language | EPS v3.2*
