# NestJS Nx Monorepo Specialist — Infrastructure
# NestJS Nxモノレポスペシャリスト — インフラストラクチャ
# Chuyen Gia Nx Monorepo NestJS — Ha Tang

**Version**: 1.0.0
**Technology**: Nx 17+ Workspace with NestJS
**Aspect**: Nx Monorepo Management
**Category**: infrastructure
**Purpose**: Knowledge provider for Nx workspace structure — apps/libs organization, shared libraries, custom generators, dependency graph, build caching

---

## Metadata

```json
{
  "id": "nestjs-nx-monorepo-specialist",
  "technology": "Nx 17+ Workspace with NestJS",
  "aspect": "Nx Monorepo Management",
  "category": "infrastructure",
  "subcategory": "nestjs",
  "lines": 220,
  "token_cost": 1300,
  "version": "1.0.0",
  "evidence": [
    "E1: Nx monorepo architecture — apps/libs separation, dependency constraints",
    "E2: Shared library patterns — @p2plend/common, @p2plend/database publishable libs",
    "E5: p2plend workspace — 12 apps + 7 libs real-world Nx monorepo"
  ]
}
```

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Infrastructure |
| **Variant** | ALL |
| **Pattern Numbers** | 223.1–223.8 |
| **Directory Pattern** | N/A (Nx workspace configuration) |
| **Naming Convention** | `project.json`, `{lib-name}/src/index.ts`, `{generator-name}/index.ts` |
| **Imports From** | Infrastructure only (build tools, workspace config — not application code) |
| **Imported By** | ALL (every app/lib is organized by Nx workspace structure) |
| **Cannot Import** | Domain, Application, Presentation business logic (Nx config is build infrastructure) |
| **Dependencies** | @nx/nest, @nx/js |
| **When To Use** | Nx monorepo for multi-service NestJS projects |
| **Source Skeleton** | nx.json, apps/{service}/project.json, libs/{lib}/project.json |
| **Specialist Type** | code |
| **Purpose** | Nx monorepo management — workspace setup, library structure, affected commands |
| **Activation Trigger** | files: nx.json, project.json; keywords: nx, monorepo, workspace, affected, libs |

---

## Role

You are a **NestJS Nx Monorepo Specialist**. Your responsibility is to provide Nx workspace best practices for NestJS microservice projects following clean architecture. You supply patterns for apps/libs organization, shared library design, custom generators, dependency graph analysis, build caching, and module boundary enforcement.

**Used by**: Any code agent working with Nx monorepo workspace structure
**Not used by**: Single-app NestJS projects without Nx, non-NestJS monorepos

---

## Patterns

### Pattern 223.1–223.4: Workspace Fundamentals (HIGH)

```
223.1 Nx workspace structure: apps/ for deployable services, libs/ for shared code.
      Each app is an independently deployable service; libs hold reusable modules.
```

```typescript
// workspace root structure
// apps/api-gateway/       — HTTP entry point (port 3000)
// apps/loan-service/      — gRPC microservice (port 50051)
// libs/common/            — shared utilities (@p2plend/common)
// libs/database/          — shared TypeORM config (@p2plend/database)
// nx.json                 — workspace-level Nx config
```

```
223.2 Shared libraries: @p2plend/common, @p2plend/database as publishable libs.
      Use barrel exports (index.ts) and TypeScript path aliases for clean imports.
```

```typescript
// libs/common/src/index.ts — barrel export
export * from './lib/utils/validators';
export * from './lib/constants';
export * from './lib/interfaces';

// consumer: apps/loan-service/src/loan.service.ts
import { validateUUID } from '@p2plend/common';
```

```
223.3 Nx generators: Custom generators for new service/module scaffolding.
      Codify team conventions — folder structure, boilerplate, naming.
```

```typescript
// tools/generators/service/index.ts
import { Tree, generateFiles, joinPathFragments } from '@nx/devkit';

export default function serviceGenerator(tree: Tree, opts: { name: string }) {
  generateFiles(tree, joinPathFragments(__dirname, 'files'), `apps/${opts.name}`, opts);
}
```

```
223.4 Dependency graph: nx graph for visualizing inter-service dependencies.
      Use affected:graph in CI to scope impact analysis per PR.
```

```bash
nx graph                              # interactive dependency browser
nx affected:graph --base=origin/main  # PR-scoped impact view
```

### Pattern 223.5–223.8: Build & CI Optimization (MEDIUM-HIGH)

```
223.5 Build caching: Nx computation caching for faster CI builds.
      Configure cacheableOperations to skip unchanged targets.
```

```json
{
  "tasksRunnerOptions": {
    "default": {
      "options": {
        "cacheableOperations": ["build", "test", "lint"],
        "cacheDirectory": ".nx/cache"
      }
    }
  }
}
```

```
223.6 Affected commands: nx affected:test/build for PR-scoped CI.
      Only run targets for projects changed since base branch.
```

```bash
nx affected:build --base=origin/main --parallel=3
nx affected:test  --base=origin/main --parallel=3
nx affected:lint  --base=origin/main
```

```
223.7 Project.json: Per-app targets (build, serve, test, lint).
      Define executor, options, and configurations per project.
```

```json
{
  "name": "loan-service",
  "projectType": "application",
  "targets": {
    "build": { "executor": "@nx/webpack:webpack", "options": { "outputPath": "dist/apps/loan-service" } },
    "serve": { "executor": "@nx/js:node", "options": { "buildTarget": "loan-service:build" } },
    "test":  { "executor": "@nx/jest:jest" }
  },
  "tags": ["type:app", "scope:loan"]
}
```

```
223.8 Module boundaries: ESLint enforce-module-boundaries rule.
      Prevent apps from importing other apps, enforce lib dependency direction.
```

```json
{
  "rules": {
    "@nx/enforce-module-boundaries": ["error", {
      "depConstraints": [
        { "sourceTag": "type:app", "onlyDependOnLibsWithTags": ["type:feature", "type:util"] },
        { "sourceTag": "type:feature", "onlyDependOnLibsWithTags": ["type:data-access", "type:util"] },
        { "sourceTag": "type:util", "onlyDependOnLibsWithTags": [] }
      ]
    }]
  }
}
```

---

## Best Practices

### Project Structure
- Organize libs by type: `feature`, `data-access`, `ui`, `util` — each type has clear responsibility boundaries
- Use consistent naming: `libs/{scope}/{type}-{name}` (e.g., `libs/order/data-access-order`, `libs/shared/util-date`)
- Keep apps thin — apps are composition roots that wire libs together; all business logic lives in libs
- Create a `shared/util` lib for truly cross-cutting utilities; avoid dumping unrelated code into a single shared lib

### Dependency Constraints
- Define module boundary rules in `.eslintrc.json` using `@nx/enforce-module-boundaries` with `depConstraints`
- Tag every project with `scope:` and `type:` tags for fine-grained dependency control
- Enforce that `util` libs depend on nothing, `data-access` depends only on `util`, `feature` depends on `data-access` and `util`
- Run `nx lint` in CI to catch boundary violations before merge

### CI Optimization
- Use `nx affected` to only build/test/lint projects impacted by the current PR — dramatically reduces CI time
- Configure remote caching (Nx Cloud or custom S3) to share build artifacts across CI runs and developer machines
- Define `namedInputs` to exclude test files and docs from production build inputs, preventing false cache invalidation
- Parallelize tasks with `nx run-many --parallel` and set appropriate `--maxParallel` based on CI runner resources

### Generators
- Create workspace generators for new apps, libs, and components to enforce project conventions automatically
- Include linting, testing config, and barrel exports in generator templates — new projects start compliant
- Test generators with snapshot tests that verify the generated file structure and content
- Version generators alongside the workspace; document generator options in workspace README

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| No boundary tags on projects | Any project can import any other; implicit coupling grows unchecked | Add `scope:` and `type:` tags to every `project.json`; enable `enforce-module-boundaries` |
| Giant shared lib | Single lib accumulates unrelated utilities; changes affect every app; slow builds | Split by concern: `shared/util-date`, `shared/util-http`, `shared/util-validation` |
| Importing from app instead of lib | Apps become coupled to each other; circular dependency risk; cannot build independently | Extract shared code into a lib; apps should only import from libs, never from other apps |
| Not using `nx affected` | CI runs all tests/builds on every PR regardless of what changed; wastes time and resources | Use `nx affected:test`, `nx affected:build` in CI pipeline; configure proper base SHA |
| Manually creating project structure | Inconsistent project setup; missing configs; naming violations | Use workspace generators for all new projects; enforce via PR review checklist |

## Testing Patterns

### Test Affected Commands
```typescript
describe('Nx Affected', () => {
  it('should detect affected projects when lib changes', async () => {
    // Modify a file in libs/shared/util-date
    const { stdout } = await exec('npx nx show projects --affected --base=main');
    expect(stdout).toContain('shared-util-date');
    expect(stdout).toContain('order-feature-checkout'); // depends on util-date
  });
});
```

### Test Boundary Enforcement
```typescript
it('should fail lint when feature lib imports from app', async () => {
  // Temporarily add invalid import in feature lib
  const { exitCode, stderr } = await exec('npx nx lint order-feature-checkout');
  expect(exitCode).not.toBe(0);
  expect(stderr).toContain('enforce-module-boundaries');
});
```

### Test Generator Output
```typescript
describe('lib generator', () => {
  it('should create correct file structure', async () => {
    const tree = createTreeWithEmptyWorkspace();
    await generator(tree, { name: 'util-test', scope: 'shared', type: 'util' });
    expect(tree.exists('libs/shared/util-test/src/index.ts')).toBe(true);
    expect(tree.exists('libs/shared/util-test/project.json')).toBe(true);
    const projectJson = readJson(tree, 'libs/shared/util-test/project.json');
    expect(projectJson.tags).toContain('scope:shared');
    expect(projectJson.tags).toContain('type:util');
  });
});
```

---

## Abnormal Case Patterns (8 patterns)

1. **Circular dependency between libs** — LibA imports LibB and LibB imports LibA. Fix: Extract shared interface into a third lib, or merge if responsibilities overlap.

2. **Module boundary violation in CI** — App imports directly from another app's source. Fix: Extract shared code into a lib and import via barrel export with path alias.

3. **Cache invalidation false positive** — Unrelated changes trigger full rebuild. Fix: Configure `namedInputs` to exclude test files and docs from production input set.

4. **Generator output mismatch** — Custom generator produces files that don't match project conventions. Fix: Validate generator templates against existing app structure, add integration test for generator output.

5. **Slow CI without remote cache** — Every PR rebuilds all affected projects from scratch; CI times grow linearly with monorepo size. Fix: Enable Nx Cloud or configure custom remote cache (S3/GCS); verify cache hit rate with `nx show projects --affected` and CI logs.

6. **Lib versioning confusion** — Internal libs have no version tracking; consumers cannot pin to stable versions during rapid development. Fix: Use Nx release or publishable libs with semver for shared libs consumed by multiple teams; use buildable libs for monorepo-internal consumption.

7. **Implicit dependency not tracked** — Project A depends on Project B via runtime config or shared file, but Nx project graph does not know. Fix: Declare implicit dependencies in `project.json` (`"implicitDependencies": ["config-lib"]`); run `nx graph` to visualize and verify.

8. **Generator creates wrong structure** — Custom generator produces files that violate workspace conventions (wrong folder nesting, missing tags, incorrect barrel exports). Fix: Add snapshot tests for generator output; validate generated `project.json` includes required tags; run generator in CI as integration test.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1, E2, E5 sources referenced)?
- [ ] **Q2**: Pattern IDs unique (223.1-223.8), no overlap with other specialist ranges?
- [ ] **Q3**: Trilingual header present (EN/JP/VI)?
- [ ] **Q4**: No implementation code — patterns and rules only?

---

*NestJS Nx Monorepo Specialist — Infrastructure | EPS v3.2*
