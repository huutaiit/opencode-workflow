# Banking Behavioral Compliance Specialist
# 金融行動コンプライアンススペシャリスト

**Stack**: Flutter 3.x + Material Design 3 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (Material Design 3) |
| **Pattern Numbers** | 242.1–242.6 |
| **Specialist Type** | rule-set |
| **Purpose** | Session timeout, confirmation, double-submit, audit trail |
| **Activation Trigger** | Financial transaction UI, banking application |
| **Complements** | 240.x government-form, 254.x financial-compliance |

---

## Rules

### 242.1 — Session Timeout Warning

```dart
// ✅ Timeout warning dialog
showDialog(
  context: context,
  barrierDismissible: false,
  builder: (_) => AlertDialog(
    title: Text('セッション期限のお知らせ'),
    content: Text.rich(TextSpan(children: [
      TextSpan(text: 'あと'),
      TextSpan(text: '$remainingMinutes分', style: TextStyle(fontWeight: FontWeight.bold, color: colorScheme.error)),
      TextSpan(text: 'でセッションが切れます。'),
    ])),
    actions: [
      TextButton(onPressed: handleLogout, child: Text('ログアウト')),
      FilledButton(onPressed: handleExtend, child: Text('延長する')),
    ],
  ),
)
```

### 242.2 — Confirmation for Financial Actions

```dart
// ✅ Confirmation dialog before transfer
showDialog(
  context: context,
  builder: (_) => AlertDialog(
    title: Text('振込実行の確認'),
    content: Column(mainAxisSize: MainAxisSize.min, children: [
      Text('振込先: $recipientName'),
      Text('¥${amount.toStringAsFixed(0)}', style: textTheme.headlineMedium),
      Text('この操作は取り消しできません。', style: TextStyle(color: colorScheme.error)),
    ]),
    actions: [
      TextButton(onPressed: () => Navigator.pop(context), child: Text('キャンセル')),
      FilledButton(
        style: FilledButton.styleFrom(backgroundColor: colorScheme.error),
        onPressed: handleTransfer, child: Text('実行する'),
      ),
    ],
  ),
)
```

### 242.3 — Double-Submit Prevention

```dart
// ✅ Disable button + idempotency key
FilledButton(
  onPressed: isSubmitting ? null : handleSubmit,
  child: isSubmitting
    ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
    : Text('送信'),
)
```

### 242.4 — Audit Trail

Use `Timeline`-style widget to display action log with who/what/when/where.

### 242.5 — Auto-Save

- ✅ Auto-save drafts every 30 seconds, server-side storage
- ❌ NEVER use SharedPreferences for financial drafts — security risk

### 242.6 — Mandatory Fields

```dart
// ✅ Required indicator
TextFormField(
  decoration: InputDecoration(
    labelText: 'メールアドレス *',
    errorText: submitted && value.isEmpty ? 'メールアドレスは必須です' : null,
  ),
  validator: (v) => v?.isEmpty == true ? 'メールアドレスは必須です' : null,
)
```
