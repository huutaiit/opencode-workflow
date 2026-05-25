# Flutter Code Metrics Specialist
# Flutter コードメトリクススペシャリスト
# Chuyen Gia Do Luong Code Flutter

**Stack**: Flutter 3.x + Dart 3.x | **Variant**: ALL

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — metrics apply to all code) |
| **Directory Pattern** | project root |
| **Variant** | ALL |
| **Naming Convention** | N/A (metrics configuration, not file creation) |
| **Imports From** | N/A (analysis tool configuration) |
| **Cannot Import** | N/A (analysis tool) |
| **Pattern Numbers** | 111.1–111.5 |
| **Source Paths** | `analysis_options.yaml`, `lib/**/*.dart`, `test/**/*.dart` |
| **File Count** | Configuration in analysis_options.yaml |
| **Imported By** | N/A (IDE + CI tool consumes configuration) |
| **Dependencies** | dart_code_metrics ^5.7.0 (or dart_code_linter) |
| **When To Use** | Measuring code complexity, test coverage, method length, enforcing quality thresholds |
| **Source Skeleton** | `analysis_options.yaml` metrics section |
| **Specialist Type** | rule-set |
| **Purpose** | Configure code metrics thresholds for cyclomatic complexity, method length, class coupling, test coverage targets, and quality reporting |
| **Activation Trigger** | files: analysis_options.yaml; keywords: codeMetrics, cyclomaticComplexity, testCoverage, methodLength, classCoupling |

---

## Patterns

### Pattern 111.1: dart_code_metrics Configuration

```yaml
# analysis_options.yaml
dart_code_metrics:
  metrics:
    cyclomatic-complexity: 20
    number-of-parameters: 5
    maximum-nesting-level: 5
    source-lines-of-code: 50
    lines-of-code: 100
  metrics-exclude:
    - test/**
    - "**/*.g.dart"
  rules:
    - no-boolean-literal-compare
    - no-empty-block
    - prefer-trailing-comma
    - avoid-unnecessary-setstate
    - avoid-wrapping-in-padding
```

### Pattern 111.2: Test Coverage

```bash
# Generate coverage report
flutter test --coverage

# Generate HTML report
genhtml coverage/lcov.info -o coverage/html

# Coverage thresholds per layer
# Domain:       ≥90% (pure business logic)
# Data:         ≥80% (network/DB — mock externals)
# Presentation: ≥70% (widget tests — visual behavior)
# Core:         ≥85% (shared utilities)
```

### Pattern 111.3: Method Length Rules

```dart
// ✅ GOOD — under 50 source lines of code
Future<OrderResult> submitOrder(Order order) async {
  final validated = _validateOrder(order);   // Extract validation
  final priced = _calculatePricing(validated); // Extract pricing
  final response = await _submitToApi(priced); // Extract API call
  return _mapResponse(response);              // Extract mapping
}

// ❌ BAD — 100+ lines in single method
// Break into smaller focused methods
```

### Pattern 111.4: Complexity Thresholds

```dart
// Cyclomatic complexity ≤ 20
// If a method has complexity > 20:
// 1. Extract switch/case into strategy pattern
// 2. Replace nested if/else with early returns
// 3. Use pattern matching (Dart 3 switch expressions)

// ✅ GOOD — early returns reduce complexity
String? validate(String value) {
  if (value.isEmpty) return 'Required';
  if (value.length < 3) return 'Too short';
  if (!_pattern.hasMatch(value)) return 'Invalid format';
  return null;
}
```

### Pattern 111.5: CI Quality Gate

```yaml
# GitHub Actions quality gate
- name: Check code metrics
  run: |
    dart run dart_code_metrics:metrics analyze lib \
      --reporter=json \
      --set-exit-on-violation-level=warning
- name: Check test coverage
  run: |
    flutter test --coverage
    COVERAGE=$(lcov --summary coverage/lcov.info | grep "lines" | awk '{print $2}' | sed 's/%//')
    if (( $(echo "$COVERAGE < 80" | bc -l) )); then
      echo "Coverage $COVERAGE% is below 80% threshold"
      exit 1
    fi
```

---

## MUST DO

- Set cyclomatic complexity threshold ≤ 20 per method
- Enforce maximum 5 parameters per function/method
- Measure test coverage per layer (Domain ≥ 90%, Data ≥ 80%)
- Run metrics in CI with exit-on-violation
- Exclude generated files from metrics

## MUST NOT DO

- Ignore high complexity warnings (refactor or justify)
- Set coverage threshold at 100% (diminishing returns past 90%)
- Measure metrics on generated code (freezed, json_serializable)
- Count test coverage without checking test quality
- Skip complexity check for BLoC event handlers (common violation area)

---

## References

- [dart_code_metrics](https://pub.dev/packages/dart_code_metrics)
- [Flutter Test Coverage](https://docs.flutter.dev/testing)
