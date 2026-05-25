# Locale Enterprise UX Specialist
# ロケールエンタープライズUXスペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 258.1–258.6 |
| **Specialist Type** | code |
| **Purpose** | JP enterprise UX: confirmation patterns, batch ops, approval UI |
| **Activation Trigger** | Enterprise workflow, batch operations, approval |
| **Complements** | 242.x banking-behavioral, 220.x status-color |

---

## Rules

### 258.1 — Undo vs Confirmation (JP Pattern)

JP enterprise: confirmation BEFORE action, not undo AFTER.

```dart
// ✅ Confirm before delete
showDialog(
  context: context,
  builder: (_) => AlertDialog(
    title: Text('削除の確認'),
    content: Text('${item.name}を削除してもよろしいですか？'),
    actions: [
      TextButton(onPressed: () => Navigator.pop(context), child: Text('キャンセル')),
      FilledButton(
        style: FilledButton.styleFrom(backgroundColor: colorScheme.error),
        onPressed: () { Navigator.pop(context); deleteItem(item.id); },
        child: Text('削除する'),
      ),
    ],
  ),
)
```

### 258.2 — Batch Operations

```dart
// ✅ Batch action bar
if (selectedCount > 0)
  Container(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    decoration: BoxDecoration(color: colorScheme.primaryContainer),
    child: Row(children: [
      Text('${selectedCount}件選択中', style: textTheme.labelLarge),
      const Spacer(),
      TextButton(onPressed: clearSelection, child: Text('選択解除')),
      const SizedBox(width: 8),
      FilledButton.tonal(onPressed: handleBatchExport, child: Text('エクスポート')),
      const SizedBox(width: 8),
      FilledButton(
        style: FilledButton.styleFrom(backgroundColor: colorScheme.error),
        onPressed: handleBatchDelete, child: Text('一括削除'),
      ),
    ]),
  )
```

### 258.3 — Workflow Status (Stepper)

```dart
// ✅ MD3 Stepper for workflow
Stepper(
  currentStep: currentStep,
  steps: [
    Step(title: Text('下書き'), content: SizedBox.shrink(), isActive: currentStep >= 0),
    Step(title: Text('申請中'), content: SizedBox.shrink(), isActive: currentStep >= 1),
    Step(title: Text('承認待ち'), content: SizedBox.shrink(), isActive: currentStep >= 2),
    Step(title: Text('完了'), content: SizedBox.shrink(), isActive: currentStep >= 3),
  ],
)
```

### 258.4 — Approval Chain

Display approver list with status dots (success/warning/error) and timestamps.

### 258.5 — Comment Trail

Threaded comments with timestamps, distinguishing user vs system entries.

### 258.6 — JP Counter Patterns (助数詞)

```dart
// ✅ Correct Japanese counters
String formatCount(int count, String counter) => '$count$counter';

Text('${formatCount(results.length, '件')}の検索結果')   // 件 = items
Text('${formatCount(participants.length, '名')}が参加中') // 名 = people
```

- ✅ Use correct counter for object type
- ❌ NEVER use generic `個` for everything
