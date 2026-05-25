# Locale Enterprise UX Specialist
# ロケールエンタープライズUXスペシャリスト

**Stack**: Next.js 16 + Ant Design 5 + Tailwind CSS v4 | **Variant**: default

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Presentation |
| **Variant** | default (antd + tailwind) |
| **Pattern Numbers** | 258.1–258.5 |
| **Specialist Type** | rule-set |
| **Purpose** | Hanko workflow, notification channels, business cycle awareness, legal entity normalization |
| **Activation Trigger** | Enterprise approval workflows, notification integration, business calendar |
| **Complements** | 240.x government-form, 252.x date-calendar |

---

## Rules

### 258.1 — Hanko (Digital Seal / 印鑑) Workflow

```tsx
// ✅ Hanko upload and placement
<div className="space-y-4">
  <Form.Item label="印鑑画像" name="hankoImage">
    <Upload
      accept=".png,.jpg"
      listType="picture-card"
      maxCount={1}
      beforeUpload={(file) => {
        // Validate: square aspect, min 100×100px, max 200KB
        return validateHankoImage(file);
      }}
    >
      <div className="flex flex-col items-center text-gray-500">
        <PlusOutlined />
        <span className="text-xs mt-1">印鑑をアップロード</span>
      </div>
    </Upload>
  </Form.Item>

  {/* Hanko display on approval document */}
  <div className="relative w-[20mm] h-[20mm] border border-red-400 rounded-full overflow-hidden">
    <img src={hankoUrl} alt="印鑑" className="w-full h-full object-contain" />
  </div>
</div>
```

- ✅ Hanko image: circular crop, red tint, transparent background preferred
- ✅ Display position: within approval zone (see 240.3)
- ✅ Record placement timestamp for audit trail
- ❌ NEVER allow hanko placement without authentication confirmation

### 258.2 — Notification Channel Preference

| Locale | Primary Channel | Integration |
|--------|----------------|------------|
| JP | LINE | LINE Messaging API, LINE Notify |
| VN | Zalo OA | Zalo OA API (Official Account) |
| Both | Email | Fallback channel |

```tsx
// ✅ Notification preference UI
<Form.Item label="通知チャンネル / Kênh thông báo" name="notificationChannel">
  <Radio.Group className="flex flex-col gap-2">
    {locale === 'ja' && (
      <Radio value="line" className="flex items-center gap-2">
        <span className="text-sm">LINE通知</span>
      </Radio>
    )}
    {locale === 'vi' && (
      <Radio value="zalo" className="flex items-center gap-2">
        <span className="text-sm">Zalo OA</span>
      </Radio>
    )}
    <Radio value="email" className="flex items-center gap-2">
      <span className="text-sm">{locale === 'ja' ? 'メール' : 'Email'}</span>
    </Radio>
  </Radio.Group>
</Form.Item>
```

- ✅ Default to locale-appropriate channel (LINE for JP, Zalo for VN)
- ✅ Always offer email as fallback option
- ❌ NEVER send notifications to unverified channels

### 258.3 — Business Cycle Awareness

| Event | JP | VN |
|-------|----|----|
| Fiscal closing | 決算期 (March/September) | December |
| Major holiday | Golden Week (4/29-5/5), お盆 (8/13-8/16) | Tet (Lunar NY ~Jan/Feb) |
| Busy period | 年度末 (March), 年末調整 (November) | Mid-year inventory (June) |

- ✅ Show contextual `Alert` banners during fiscal closing (年度末), Golden Week, Tet
- ✅ Detect by month: JP March=年度末, JP April=新年度, VN Jan/Feb=Tet
- ❌ NEVER schedule maintenance during 決算期 or Tet

### 258.4 — Legal Entity Suffix Normalization

| Locale | Short | Full | JP | VN |
|--------|-------|------|----|----|
| JP | ㈱ / (株) | 株式会社 | JP | ㈲→有限会社 |
| VN | TNHH | Công ty TNHH | VN | CP→Công ty Cổ phần |

- ✅ Normalize on input: `㈱` → `株式会社`, store full form
- ✅ Search should match both ㈱ and 株式会社
- ❌ NEVER reject abbreviated forms — auto-normalize instead

### 258.5 — Locale-Aware Empty States

| Key | JP | VN |
|-----|----|----|
| noData | データがありません | Khong co du lieu |
| noResults | 検索結果が見つかりませんでした | Khong tim thay ket qua |

- ✅ All UI text locale-aware — use `<Empty description={msg[locale].noData} />`
- ✅ Empty state illustrations should be culturally neutral
- ❌ NEVER show English fallback text in JP/VN-facing systems
