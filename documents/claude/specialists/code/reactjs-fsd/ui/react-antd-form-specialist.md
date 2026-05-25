# React AntD Form Specialist
# React AntDフォームスペシャリスト
# Chuyen Gia AntD Form React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Shared, Features |
| **Directory Pattern** | `src/shared/ui/form-fields/`, `src/features/{name}/ui/forms/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 32.1–32.12 |
| **Source Paths** | `**/ui/forms/**/*.tsx`, `**/ui/form-fields/**/*.tsx` |
| **File Count** | 10–30 form component files per project |
| **Naming Convention** | `{Entity}Form.tsx`, `{Field}FormField.tsx` |
| **Imports From** | Shared (types, validation), Entities (entity types) |
| **Cannot Import** | Pages, Widgets |
| **Imported By** | Features (pages compose forms), Widgets |
| **Dependencies** | `antd:5.x` (Form, Input, Select, DatePicker) |
| **When To Use** | CRUD form creation, AntD Form.useForm setup, validation rules, form layouts, dynamic fields |
| **Source Skeleton** | `src/features/{name}/ui/forms/{Entity}Form.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate AntD Form patterns — Form.useForm, Form.Item rules, layouts, Form.List, Form.useWatch, cross-field validation |
| **Activation Trigger** | files: **/ui/forms/**; keywords: antdForm, formUseForm, formItem, formValidation |

---

## Evidence Sources

- E1: Ant Design 5 Form API documentation
- E2: AntD Form TypeScript integration patterns
- E3: Enterprise form validation patterns
- E4: React 19 form actions + AntD bridge

---

## Patterns

### Pattern 32.1: Form.useForm + TypeScript (CRITICAL)

```typescript
import { Form, Input, Select, Button } from 'antd';
import type { FormProps } from 'antd';

interface CreateUserFormValues {
  email: string;
  displayName: string;
  role: 'admin' | 'manager' | 'viewer';
  department?: string;
}

export function CreateUserForm({ onSubmit }: { onSubmit: (values: CreateUserFormValues) => Promise<void> }) {
  const [form] = Form.useForm<CreateUserFormValues>();
  const [loading, setLoading] = useState(false);

  const onFinish: FormProps<CreateUserFormValues>['onFinish'] = async (values) => {
    setLoading(true);
    try {
      await onSubmit(values);
      form.resetFields();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form<CreateUserFormValues> form={form} onFinish={onFinish} layout="vertical" requiredMark="optional">
      <Form.Item<CreateUserFormValues> name="email" label="Email" rules={[{ required: true }, { type: 'email' }]}>
        <Input placeholder="user@company.com" />
      </Form.Item>
      <Form.Item<CreateUserFormValues> name="displayName" label="Name" rules={[{ required: true, min: 2 }]}>
        <Input />
      </Form.Item>
      <Form.Item<CreateUserFormValues> name="role" label="Role" rules={[{ required: true }]}>
        <Select options={[{ value: 'admin', label: 'Admin' }, { value: 'manager', label: 'Manager' }, { value: 'viewer', label: 'Viewer' }]} />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={loading}>Create</Button>
    </Form>
  );
}
```

### Pattern 32.2: Form.Item Validation Rules (CRITICAL)

```typescript
// Built-in rules
rules={[
  { required: true, message: 'Required' },
  { type: 'email', message: 'Invalid email' },
  { min: 2, max: 100, message: '2-100 characters' },
  { pattern: /^[A-Z]/, message: 'Must start with uppercase' },
  { whitespace: true, message: 'Cannot be empty' },
]}

// Custom validator
rules={[
  {
    validator: async (_, value) => {
      if (value && value.includes('admin')) throw new Error('Cannot contain "admin"');
    },
  },
]}

// Async validation (check uniqueness)
rules={[
  {
    validator: async (_, value) => {
      if (!value) return;
      const exists = await checkEmailExists(value);
      if (exists) throw new Error('Email already registered');
    },
    validateTrigger: 'onBlur', // Only check on blur (not every keystroke)
  },
]}
```

### Pattern 32.3: Form Layouts (HIGH)

```typescript
// Vertical (default — label above input)
<Form layout="vertical">

// Horizontal (label + input side by side)
<Form layout="horizontal" labelCol={{ span: 6 }} wrapperCol={{ span: 18 }}>

// Inline (all fields in one row)
<Form layout="inline">

// Responsive layout
<Form layout="vertical">
  <Row gutter={16}>
    <Col xs={24} md={12}>
      <Form.Item name="firstName" label="First Name"><Input /></Form.Item>
    </Col>
    <Col xs={24} md={12}>
      <Form.Item name="lastName" label="Last Name"><Input /></Form.Item>
    </Col>
  </Row>
</Form>
```

### Pattern 32.4: initialValues + setFieldsValue (HIGH)

```typescript
// Edit form — populate with existing data
function EditUserForm({ user }: { user: User }) {
  const [form] = Form.useForm<UpdateUserFormValues>();

  // Option A: initialValues (set once on mount)
  return <Form form={form} initialValues={{ email: user.email, displayName: user.displayName, role: user.role }}>

  // Option B: setFieldsValue (update dynamically)
  useEffect(() => {
    form.setFieldsValue({ email: user.email, displayName: user.displayName, role: user.role });
  }, [user, form]);

  // Option C: Reset + set (form switch between users)
  useEffect(() => {
    form.resetFields();
    form.setFieldsValue(user);
  }, [user.id, form]);
}
```

### Pattern 32.5: Form.List — Dynamic Fields (HIGH)

```typescript
<Form.List name="addresses">
  {(fields, { add, remove }) => (
    <>
      {fields.map(({ key, name, ...restField }) => (
        <Space key={key} align="baseline">
          <Form.Item {...restField} name={[name, 'street']} rules={[{ required: true }]}>
            <Input placeholder="Street" />
          </Form.Item>
          <Form.Item {...restField} name={[name, 'city']} rules={[{ required: true }]}>
            <Input placeholder="City" />
          </Form.Item>
          <Button icon={<MinusCircleOutlined />} onClick={() => remove(name)} danger />
        </Space>
      ))}
      <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} block>Add Address</Button>
    </>
  )}
</Form.List>
```

### Pattern 32.6: Form.useWatch — Dependent Fields (HIGH)

```typescript
function OrderForm() {
  const form = Form.useFormInstance();
  const orderType = Form.useWatch('orderType', form);
  const quantity = Form.useWatch('quantity', form);
  const unitPrice = Form.useWatch('unitPrice', form);

  // Computed value — auto-updates when dependencies change
  const total = (quantity ?? 0) * (unitPrice ?? 0);

  return (
    <>
      <Form.Item name="orderType" label="Type">
        <Select options={[{ value: 'standard' }, { value: 'express' }, { value: 'bulk' }]} />
      </Form.Item>

      {/* Conditional field based on orderType */}
      {orderType === 'express' && (
        <Form.Item name="expressDeliveryDate" label="Delivery Date" rules={[{ required: true }]}>
          <DatePicker />
        </Form.Item>
      )}

      {orderType === 'bulk' && (
        <Form.Item name="bulkDiscount" label="Discount %">
          <InputNumber min={0} max={50} />
        </Form.Item>
      )}

      <Statistic title="Total" value={total} prefix="$" />
    </>
  );
}
```

### Pattern 32.7: Cross-Field Validation (HIGH)

```typescript
// Password confirmation
<Form.Item name="password" label="Password" rules={[{ required: true, min: 8 }]}>
  <Input.Password />
</Form.Item>
<Form.Item
  name="confirmPassword"
  label="Confirm"
  dependencies={['password']}
  rules={[
    { required: true },
    ({ getFieldValue }) => ({
      validator(_, value) {
        if (!value || getFieldValue('password') === value) return Promise.resolve();
        return Promise.reject(new Error('Passwords do not match'));
      },
    }),
  ]}
>
  <Input.Password />
</Form.Item>

// Date range validation (start < end)
<Form.Item name="endDate" dependencies={['startDate']} rules={[
  ({ getFieldValue }) => ({
    validator(_, value) {
      const start = getFieldValue('startDate');
      if (!value || !start || value.isAfter(start)) return Promise.resolve();
      return Promise.reject(new Error('End date must be after start date'));
    },
  }),
]}>
  <DatePicker />
</Form.Item>
```

### Pattern 32.8: Form Submission + Loading (MEDIUM-HIGH)

```typescript
// With TanStack Query mutation
function CreateOrderForm() {
  const [form] = Form.useForm<CreateOrderDTO>();
  const createOrder = useCreateOrder();
  const { message } = App.useApp();

  const onFinish = async (values: CreateOrderDTO) => {
    try {
      await createOrder.mutateAsync(values);
      message.success('Order created');
      form.resetFields();
    } catch (error) {
      if (isApiError(error) && error.details) {
        // Set server-side field errors
        const fields = Object.entries(error.details).map(([name, errors]) => ({
          name: name as keyof CreateOrderDTO,
          errors,
        }));
        form.setFields(fields);
      } else {
        message.error((error as Error).message);
      }
    }
  };

  return (
    <Form form={form} onFinish={onFinish}>
      {/* fields */}
      <Button type="primary" htmlType="submit" loading={createOrder.isPending}>Submit</Button>
    </Form>
  );
}
```

### Pattern 32.9: Form Reset (MEDIUM-HIGH)

```typescript
// Reset all fields to initialValues
form.resetFields();

// Reset specific fields
form.resetFields(['email', 'role']);

// Reset + clear errors
form.resetFields();
form.setFields([]); // Clear all validation states

// Confirm before reset
const handleReset = () => {
  modal.confirm({
    title: 'Reset Form?',
    content: 'All unsaved changes will be lost.',
    onOk: () => form.resetFields(),
  });
};
```

### Pattern 32.10: Modal Form Pattern (MEDIUM-HIGH)

```typescript
function CreateUserModal({ open, onClose, onSuccess }: ModalFormProps) {
  const [form] = Form.useForm<CreateUserDTO>();
  const createUser = useCreateUser();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await createUser.mutateAsync(values);
      form.resetFields();
      onSuccess();
    } catch {
      // Validation or API error — form shows errors
    }
  };

  return (
    <Modal
      title="Create User"
      open={open}
      onOk={handleOk}
      onCancel={() => { form.resetFields(); onClose(); }}
      confirmLoading={createUser.isPending}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
          <Input />
        </Form.Item>
        {/* more fields */}
      </Form>
    </Modal>
  );
}
```

### Pattern 32.11: React 19 Form Actions + AntD Bridge (MEDIUM)

```typescript
// Bridging native form action with AntD Form
import { useActionState } from 'react';

async function submitAction(prev: FormState, formData: FormData): Promise<FormState> {
  try {
    await apiClient.post('/users', Object.fromEntries(formData));
    return { error: null, success: true };
  } catch (err) {
    return { error: (err as Error).message, success: false };
  }
}

function HybridForm() {
  const [state, formAction, isPending] = useActionState(submitAction, { error: null, success: false });

  return (
    <form action={formAction}>
      <Form component={false} layout="vertical">
        <Form.Item label="Email">
          <Input name="email" disabled={isPending} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={isPending}>Submit</Button>
      </Form>
      {state.error && <Alert type="error" message={state.error} />}
    </form>
  );
}
```

### Pattern 32.12: Anti-patterns (MEDIUM)

**1. Uncontrolled + Form.useForm** — Mixing uncontrolled inputs with AntD Form state.
**2. Missing form.validateFields before submit** — Submitting without validation.
**3. initialValues as object literal** — New reference every render → form resets.
**4. Missing destroyOnClose on Modal form** — Stale form state when reopening.
**5. Custom onChange on Form.Item children** — Breaks AntD Form's value tracking.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (32.1–32.12)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React AntD Form Specialist | EPS v3.2 | Metadata v2.1*
