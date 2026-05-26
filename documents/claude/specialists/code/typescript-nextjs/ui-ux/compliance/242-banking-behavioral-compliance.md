# Banking Behavioral Compliance Specialist
# 金融行動コンプライアンススペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 242.1–242.6 |
| **Specialist Type** | rule-set |
| **Purpose** | Session timeout, confirmation dialogs, double-submit prevention, audit trail, auto-save |
| **Activation Trigger** | Financial transaction UI, banking application behavior |
| **Complements** | 240.x government-form, 254.x financial-compliance |

---

## Rules

### 242.1 — Session Timeout Warning (FISC安全対策基準 6.1.2)

Display modal 5 minutes before session expiry.

```tsx
// ✅ Timeout warning modal
<Modal
  open={showTimeoutWarning}
  title="セッション期限のお知らせ"
  closable={false}
  maskClosable={false}
  footer={[
    <Button key="logout" onClick={handleLogout}>ログアウト</Button>,
    <Button key="extend" type="primary" onClick={handleExtend}>延長する</Button>,
  ]}
>
  <p className="text-base text-gray-700">
    あと<span className="font-bold text-error">{remainingMinutes}分</span>でセッションが切れます。
  </p>
</Modal>
```

- ✅ Show warning at T-5 minutes (FISC 6.1.2 — user notification before forced logout)
- ✅ Auto-logout on expiry with redirect to login page
- ❌ NEVER allow silent session expiry — always warn user

### 242.2 — Confirmation Dialog for Financial Actions (FISC 6.2.1)

```tsx
// ✅ AntD Modal.confirm for all financial operations
Modal.confirm({
  title: '振込実行の確認',
  icon: <ExclamationCircleOutlined />,
  content: (
    <div className="space-y-2 text-sm">
      <p>振込先: {recipientName}</p>
      <p>金額: <span className="font-bold text-lg">¥{amount.toLocaleString()}</span></p>
      <p className="text-warning">この操作は取り消しできません。</p>
    </div>
  ),
  okText: '実行する',
  cancelText: 'キャンセル',
  okButtonProps: { danger: true },
  onOk: handleTransfer,
});
```

- ✅ Require explicit confirmation for: 振込 (transfer), 出金 (withdrawal), 承認 (approval)
- ✅ Display full details (amount, recipient, date) in confirmation
- ❌ NEVER execute financial action without confirmation step

### 242.3 — Double-Submit Prevention (FISC 6.3.4)

```tsx
// ✅ Button disable + request deduplication
const [submitting, setSubmitting] = useState(false);
const requestIdRef = useRef<string>();

const handleSubmit = async () => {
  const requestId = crypto.randomUUID();
  requestIdRef.current = requestId;
  setSubmitting(true);
  try {
    await api.post('/transfer', { ...data, requestId }); // Server dedup by requestId
  } finally {
    setSubmitting(false);
  }
};

<Button type="primary" loading={submitting} disabled={submitting} onClick={handleSubmit}>
  送信
</Button>
```

- ✅ Disable button immediately on click (`disabled={submitting}`)
- ✅ Server-side idempotency key (`requestId` in payload)
- ❌ NEVER rely on client-side only — always pair with server dedup

### 242.4 — Audit Trail Visibility (FISC 7.1.1)

```tsx
// ✅ Action log display
<Timeline className="px-4">
  {auditLog.map(entry => (
    <Timeline.Item key={entry.id} color={entry.type === 'error' ? 'red' : 'blue'}>
      <p className="text-sm font-medium">{entry.action}</p>
      <p className="text-xs text-gray-500">
        {entry.user} — {entry.timestamp}
      </p>
    </Timeline.Item>
  ))}
</Timeline>
```

- ✅ Show user action log for: login, data changes, approvals, exports
- ✅ Include: who (user), what (action), when (timestamp), where (IP/device)
- ❌ NEVER allow audit log modification from client side

### 242.5 — Auto-Save with Recovery (FISC 6.4.2)

- ✅ Auto-save draft every 30 seconds, show indicator: `自動保存: {time}`
- ✅ Recovery prompt on reload: "未保存の下書きがあります。復元しますか？"
- ✅ Store drafts server-side (NOT localStorage — security risk)
- ❌ NEVER auto-save completed/submitted forms — drafts only

### 242.6 — Mandatory Field Emphasis (FISC 6.5.1)

- ✅ Red asterisk (*) via AntD `required` prop + red border `className="border-error/30"`
- ✅ Error message in Japanese: `{fieldName}は必須です`
- ✅ Use `InputNumber` with `formatter` for currency fields
- ❌ NEVER mark optional fields with asterisk — only required fields
