# React AntD Form Patterns Specialist
# React AntDフォームパターンスペシャリスト
# Chuyen Gia AntD Form Patterns React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Features |
| **Directory Pattern** | `src/features/{name}/ui/forms/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 40.1–40.10 |
| **Source Paths** | `**/ui/forms/**/*.tsx` |
| **File Count** | 5–15 complex form files per project |
| **Naming Convention** | `{Entity}WizardForm.tsx`, `{Entity}FilterForm.tsx` |
| **Imports From** | Shared (AntD form fields, validation), Entities (entity types) |
| **Cannot Import** | Pages, other Features |
| **Imported By** | Pages (compose forms into CRUD pages), Widgets |
| **Dependencies** | `antd:5.x` (Form, Steps, Upload) |
| **When To Use** | Multi-step wizard, conditional fields, dynamic field lists, file upload forms, bulk edit |
| **Source Skeleton** | `src/features/{name}/ui/forms/{Entity}WizardForm.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate advanced AntD Form patterns — wizard (Steps+Form), conditional fields, Form.List, file upload, draft auto-save |
| **Activation Trigger** | files: **/ui/forms/**; keywords: wizardForm, conditionalField, formList, fileUpload, bulkEdit |

---

## Evidence Sources

- E1: AntD Form advanced patterns documentation
- E2: Multi-step form wizard best practices
- E3: File upload with progress tracking
- E4: Draft auto-save debounce patterns

---

## Patterns

### Pattern 40.1: Multi-Step Wizard (CRITICAL)

```typescript
function CreateOrderWizard() {
  const [current, setCurrent] = useState(0);
  const [formData, setFormData] = useState<Partial<CreateOrderDTO>>({});
  const [forms] = useState(() => [Form.useForm()[0], Form.useForm()[0], Form.useForm()[0]]);

  const steps = [
    { title: 'Items', content: <ItemsStep form={forms[0]} /> },
    { title: 'Shipping', content: <ShippingStep form={forms[1]} /> },
    { title: 'Review', content: <ReviewStep data={formData} /> },
  ];

  const next = async () => {
    const values = await forms[current].validateFields();
    setFormData((prev) => ({ ...prev, ...values }));
    setCurrent((c) => c + 1);
  };

  const prev = () => setCurrent((c) => c - 1);

  const submit = async () => {
    await createOrder.mutateAsync(formData as CreateOrderDTO);
    message.success('Order created');
  };

  return (
    <div>
      <Steps current={current} items={steps.map((s) => ({ title: s.title }))} />
      <div style={{ marginTop: 24 }}>{steps[current].content}</div>
      <Space style={{ marginTop: 24 }}>
        {current > 0 && <Button onClick={prev}>Back</Button>}
        {current < steps.length - 1 && <Button type="primary" onClick={next}>Next</Button>}
        {current === steps.length - 1 && <Button type="primary" onClick={submit} loading={createOrder.isPending}>Submit</Button>}
      </Space>
    </div>
  );
}
```

### Pattern 40.2: Conditional Fields (CRITICAL)

```typescript
function OrderForm() {
  const orderType = Form.useWatch('orderType');
  return (
    <Form layout="vertical">
      <Form.Item name="orderType" label="Type" rules={[{ required: true }]}>
        <Select options={[{ value: 'standard' }, { value: 'express' }, { value: 'bulk' }]} />
      </Form.Item>
      {orderType === 'express' && (
        <Form.Item name="deliveryDate" label="Delivery Date" rules={[{ required: true }]}><DatePicker /></Form.Item>
      )}
      {orderType === 'bulk' && (
        <>
          <Form.Item name="quantity" label="Min Quantity" rules={[{ required: true }]}><InputNumber min={100} /></Form.Item>
          <Form.Item name="discount" label="Discount %"><InputNumber min={0} max={50} /></Form.Item>
        </>
      )}
    </Form>
  );
}
```

### Pattern 40.3: Form.List — Dynamic Fields (HIGH)

```typescript
<Form.List name="contacts" rules={[{ validator: async (_, contacts) => {
  if (!contacts || contacts.length < 1) throw new Error('At least 1 contact required');
}}]}>
  {(fields, { add, remove }, { errors }) => (
    <>
      {fields.map(({ key, name, ...rest }) => (
        <Row key={key} gutter={16} align="middle">
          <Col span={10}><Form.Item {...rest} name={[name, 'name']} rules={[{ required: true }]}><Input placeholder="Name" /></Form.Item></Col>
          <Col span={10}><Form.Item {...rest} name={[name, 'email']} rules={[{ required: true, type: 'email' }]}><Input placeholder="Email" /></Form.Item></Col>
          <Col span={4}><Button icon={<DeleteOutlined />} onClick={() => remove(name)} danger /></Col>
        </Row>
      ))}
      <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>Add Contact</Button>
      <Form.ErrorList errors={errors} />
    </>
  )}
</Form.List>
```

### Pattern 40.4: Nested Object Fields (HIGH)

```typescript
// Nested: address.street, address.city
<Form.Item name={['address', 'street']} label="Street"><Input /></Form.Item>
<Form.Item name={['address', 'city']} label="City"><Input /></Form.Item>
<Form.Item name={['address', 'zipCode']} label="ZIP"><Input /></Form.Item>

// Initial values for nested
<Form initialValues={{ address: { street: '123 Main', city: 'NYC', zipCode: '10001' } }}>
```

### Pattern 40.5: Form Composition (HIGH)

```typescript
// Sub-form components with shared Form instance
function PersonalInfoFields() {
  return (
    <>
      <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}><Input /></Form.Item>
      <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
    </>
  );
}

function AddressFields({ prefix = '' }: { prefix?: string }) {
  const name = (field: string) => prefix ? [prefix, field] : field;
  return (
    <>
      <Form.Item name={name('street')} label="Street"><Input /></Form.Item>
      <Form.Item name={name('city')} label="City"><Input /></Form.Item>
    </>
  );
}

// Composed form
<Form form={form}><PersonalInfoFields /><AddressFields prefix="homeAddress" /><AddressFields prefix="workAddress" /></Form>
```

### Pattern 40.6: File Upload + Form (HIGH)

```typescript
<Form.Item name="avatar" label="Avatar" valuePropName="fileList" getValueFromEvent={(e) => Array.isArray(e) ? e : e?.fileList}>
  <Upload listType="picture-card" maxCount={1} beforeUpload={() => false} accept="image/*">
    <div><PlusOutlined /><div style={{ marginTop: 8 }}>Upload</div></div>
  </Upload>
</Form.Item>

// With API upload + progress
<Form.Item name="documents" label="Documents">
  <Upload.Dragger multiple customRequest={async ({ file, onProgress, onSuccess, onError }) => {
    try {
      const result = await uploadFile(file as File, (percent) => onProgress?.({ percent }));
      onSuccess?.(result);
    } catch (err) { onError?.(err as Error); }
  }}>
    <p><InboxOutlined /></p><p>Click or drag files to upload</p>
  </Upload.Dragger>
</Form.Item>
```

### Pattern 40.7: Draft Auto-Save (MEDIUM-HIGH)

```typescript
function AutoSaveForm() {
  const [form] = Form.useForm();
  const draftKey = 'order-draft';

  // Restore draft on mount
  useEffect(() => {
    const draft = localStorage.getItem(draftKey);
    if (draft) form.setFieldsValue(JSON.parse(draft));
  }, [form]);

  // Auto-save on change (debounced)
  const saveDraft = useDebouncedCallback(() => {
    const values = form.getFieldsValue();
    localStorage.setItem(draftKey, JSON.stringify(values));
  }, 1000);

  return <Form form={form} onValuesChange={saveDraft} onFinish={() => { localStorage.removeItem(draftKey); submit(); }}>...</Form>;
}
```

### Pattern 40.8: Bulk Edit Table (MEDIUM-HIGH)

```typescript
function BulkEditTable({ users }: { users: User[] }) {
  const [form] = Form.useForm();

  return (
    <Form form={form} component={false} initialValues={{ users }}>
      <Table dataSource={users} rowKey="id" columns={[
        { title: 'Name', dataIndex: 'displayName', render: (_, __, index) => (
          <Form.Item name={['users', index, 'displayName']} style={{ margin: 0 }}><Input /></Form.Item>
        )},
        { title: 'Role', dataIndex: 'role', render: (_, __, index) => (
          <Form.Item name={['users', index, 'role']} style={{ margin: 0 }}>
            <Select options={[{ value: 'admin' }, { value: 'viewer' }]} />
          </Form.Item>
        )},
      ]} />
      <Button type="primary" onClick={() => form.validateFields().then(bulkUpdate)}>Save All</Button>
    </Form>
  );
}
```

### Pattern 40.9: Filter Form (MEDIUM-HIGH)

```typescript
function UserFilterForm({ onFilter, onReset }: FilterFormProps) {
  const [form] = Form.useForm();

  return (
    <Form form={form} layout="inline" onFinish={onFilter}>
      <Form.Item name="search"><Input.Search placeholder="Search..." allowClear /></Form.Item>
      <Form.Item name="role"><Select placeholder="Role" allowClear options={roleOptions} style={{ width: 120 }} /></Form.Item>
      <Form.Item name="dateRange"><DatePicker.RangePicker /></Form.Item>
      <Space>
        <Button type="primary" htmlType="submit">Filter</Button>
        <Button onClick={() => { form.resetFields(); onReset(); }}>Reset</Button>
      </Space>
    </Form>
  );
}
```

### Pattern 40.10: Anti-patterns (MEDIUM)

**1. One god form** — 50+ fields in single form. Split into wizard or sub-forms.
**2. Custom onChange** — Overriding AntD Form value tracking with manual state.
**3. No validation on wizard steps** — Letting user skip invalid steps.
**4. Missing initialValues for edit** — Form blank when editing existing entity.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (40.1–40.10)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React AntD Form Patterns Specialist | EPS v3.2 | Metadata v2.1*
