# Flutter Lint Rules Specialist
# Flutter リントルールスペシャリスト
# Chuyen Gia Quy Tac Lint Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — lint rules apply to every file) |
| **Directory Pattern** | project root (`analysis_options.yaml`) |
| **Variant** | ALL |
| **Naming Convention** | N/A (enforcement rules on existing code, not new file creation) |
| **Imports From** | N/A (rule set — configuration files, not Dart code modules) |
| **Cannot Import** | N/A (rule set) |
| **Pattern Numbers** | 110.1–110.5 |
| **Source Paths** | `analysis_options.yaml`, `lib/**/*.dart` |
| **File Count** | 1 analysis_options.yaml (project root) |
| **Imported By** | N/A (IDE + CI analyzer consumes these rules) |
| **Dependencies** | flutter_lints ^3.0.0 (or very_good_analysis ^5.1.0) |
| **When To Use** | Project lint configuration, code style enforcement, custom lint rules |
| **Source Skeleton** | `analysis_options.yaml` |
| **Specialist Type** | rule-set |
| **Purpose** | Configure analysis_options.yaml with strict type checking, naming conventions, import rules, and enterprise-grade lint configuration |
| **Activation Trigger** | files: analysis_options.yaml; keywords: lintRules, analysisOptions, veryGoodAnalysis, strictMode, customLint |

---

## Patterns

### Pattern 110.1: Recommended analysis_options.yaml

```yaml
include: package:flutter_lints/flutter.yaml

analyzer:
  errors:
    missing_return: error
    missing_required_param: error
    dead_code: warning
  exclude:
    - "**/*.g.dart"
    - "**/*.freezed.dart"
    - "lib/generated/**"

linter:
  rules:
    # Style
    prefer_const_constructors: true
    prefer_const_declarations: true
    prefer_const_literals_to_create_immutables: true
    prefer_single_quotes: true
    require_trailing_commas: true
    sort_constructors_first: true
    sort_unnamed_constructors_first: true

    # Type safety
    avoid_dynamic_calls: true
    strict_raw_type: true
    prefer_typing_uninitialized_variables: true

    # Import hygiene
    directives_ordering: true
    always_use_package_imports: true

    # Error prevention
    cancel_subscriptions: true
    close_sinks: true
    unawaited_futures: true
    no_adjacent_strings_in_list: true
```

### Pattern 110.2: very_good_analysis (Stricter)

```yaml
include: package:very_good_analysis/analysis_options.yaml

analyzer:
  exclude:
    - "**/*.g.dart"
    - "**/*.freezed.dart"

linter:
  rules:
    public_member_api_docs: false  # Override — too strict for app code
    lines_longer_than_80_chars: false  # Override — modern screens
```

### Pattern 110.3: Per-File Overrides

```dart
// Suppress lint for specific line
// ignore: avoid_dynamic_calls
final result = dynamicValue.someMethod();

// Suppress for entire file
// ignore_for_file: prefer_const_constructors

// Suppress with reason (documentation)
// ignore: avoid_print, reason: debug-only code guarded by kDebugMode
if (kDebugMode) print('Debug: $value');
```

### Pattern 110.4: CI Integration

```bash
# Run analyzer in CI (fail on any issues)
flutter analyze --fatal-infos --fatal-warnings

# Format check (fail if unformatted)
dart format --set-exit-if-changed .
```

### Pattern 110.5: Custom Lint Rules

```yaml
# custom_lint.yaml (with custom_lint package)
# analyzer:
#   plugins:
#     - custom_lint

# Create custom rules in tools/custom_lint/
# Example: enforce feature-first folder structure
# Example: prevent cross-feature imports
```

---

## MUST DO

- Exclude generated files (`*.g.dart`, `*.freezed.dart`) from analysis
- Enable `cancel_subscriptions` and `close_sinks` (memory leak prevention)
- Run `flutter analyze --fatal-infos` in CI pipeline
- Use `require_trailing_commas` for consistent formatting
- Enable `prefer_const_constructors` (free performance optimization)

## MUST NOT DO

- Ignore analyzer warnings in CI (treat as errors)
- Suppress lints project-wide without justification
- Skip `dart format` in CI (inconsistent code style)
- Use `dynamic` without explicit `// ignore` with reason
- Disable `unawaited_futures` (missing await = silent failure)

---

## References

- [flutter_lints](https://pub.dev/packages/flutter_lints)
- [very_good_analysis](https://pub.dev/packages/very_good_analysis)
- [Dart Analysis Options](https://dart.dev/guides/language/analysis-options)
