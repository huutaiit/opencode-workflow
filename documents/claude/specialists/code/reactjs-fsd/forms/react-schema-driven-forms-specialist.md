# React Schema-Driven Forms Specialist
# Reactスキーマ駆動フォームスペシャリスト
# Chuyen Gia Schema-Driven Forms React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Shared, Features |
| **Directory Pattern** | `src/shared/lib/form-schema/`, `src/features/{name}/ui/forms/schema/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 41.1–41.8 |
| **Source Paths** | `**/form-schema/**`, `**/forms/schema/**` |
| **File Count** | 3–8 schema form files |
| **Naming Convention** | `{entity}FormSchema.ts`, `SchemaFormRenderer.tsx`, `fieldRegistry.ts` |
| **Imports From** | Shared (AntD components, field registry) |
| **Cannot Import** | Pages |
| **Imported By** | Features (render dynamic forms from API-driven schemas) |
| **Dependencies** | `antd:5.x`, `zod:3.x` (schema validation) |
| **When To Use** | Admin panels with configurable forms, API-driven form definitions, no-code form builders |
| **Source Skeleton** | `src/shared/lib/form-schema/SchemaFormRenderer.tsx`, `src/shared/lib/form-schema/fieldRegistry.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate schema-driven form patterns — JSON Schema→AntD Form, field type registry, dynamic layout from schema |
| **Activation Trigger** | files: **/form-schema/**; keywords: schemaForm, jsonSchema, dynamicForm, fieldRegistry |

---

## Evidence Sources

- E1: JSON Schema specification for form generation
- E2: Formily (alibaba) AntD integration
- E3: Dynamic form rendering patterns
- E4: Field type registry for extensible forms

---

## Patterns

### Pattern 41.1: JSON Schema → AntD Form (CRITICAL)

```typescript
// src/shared/lib/form-schema/formSchema.types.ts
interface FormFieldSchema {
  name: string;
  label: string;
  type: 'text' | 'email' | 'number' | 'select' | 'date' | 'textarea' | 'checkbox' | 'upload';
  required?: boolean;
  rules?: Rule[];
  options?: { value: string; label: string }[];  // For select
  placeholder?: string;
  defaultValue?: unknown;
  hidden?: boolean;
  dependsOn?: { field: string; value: unknown };  // Conditional
  colSpan?: number;  // Grid layout
}

interface FormSchema {
  fields: FormFieldSchema[];
  layout?: 'vertical' | 'horizontal';
  columns?: number;
}
```

```typescript
// src/shared/lib/form-schema/SchemaFormRenderer.tsx
import { Form, Row, Col } from 'antd';
import { fieldRegistry } from './fieldRegistry';

export function SchemaFormRenderer({ schema, form, onFinish }: { schema: FormSchema; form: FormInstance; onFinish: (values: any) => void }) {
  return (
    <Form form={form} layout={schema.layout ?? 'vertical'} onFinish={onFinish}>
      <Row gutter={16}>
        {schema.fields.filter((f) => !f.hidden).map((field) => (
          <Col span={field.colSpan ?? 24 / (schema.columns ?? 1)} key={field.name}>
            <Form.Item name={field.name} label={field.label} rules={field.required ? [{ required: true }, ...(field.rules ?? [])] : field.rules}>
              {fieldRegistry.render(field)}
            </Form.Item>
          </Col>
        ))}
      </Row>
    </Form>
  );
}
```

### Pattern 41.2: Field Type Registry (CRITICAL)

```typescript
// src/shared/lib/form-schema/fieldRegistry.ts
import { Input, InputNumber, Select, DatePicker, Checkbox, Upload } from 'antd';

type FieldRenderer = (field: FormFieldSchema) => React.ReactNode;

class FieldRegistry {
  private renderers = new Map<string, FieldRenderer>();

  register(type: string, renderer: FieldRenderer) { this.renderers.set(type, renderer); }
  render(field: FormFieldSchema): React.ReactNode {
    const renderer = this.renderers.get(field.type);
    if (!renderer) return <Input placeholder={field.placeholder} />;
    return renderer(field);
  }
}

export const fieldRegistry = new FieldRegistry();

// Register built-in types
fieldRegistry.register('text', (f) => <Input placeholder={f.placeholder} />);
fieldRegistry.register('email', (f) => <Input type="email" placeholder={f.placeholder} />);
fieldRegistry.register('number', (f) => <InputNumber style={{ width: '100%' }} placeholder={f.placeholder} />);
fieldRegistry.register('textarea', (f) => <Input.TextArea rows={4} placeholder={f.placeholder} />);
fieldRegistry.register('select', (f) => <Select options={f.options} placeholder={f.placeholder} />);
fieldRegistry.register('date', () => <DatePicker style={{ width: '100%' }} />);
fieldRegistry.register('checkbox', (f) => <Checkbox>{f.label}</Checkbox>);

// Custom field registration (extensible)
fieldRegistry.register('richText', (f) => <RichTextEditor placeholder={f.placeholder} />);
fieldRegistry.register('colorPicker', () => <ColorPicker />);
```

### Pattern 41.3: Conditional Fields from Schema (HIGH)

```typescript
function ConditionalField({ field, form }: { field: FormFieldSchema; form: FormInstance }) {
  const dependencyValue = Form.useWatch(field.dependsOn?.field, form);
  if (field.dependsOn && dependencyValue !== field.dependsOn.value) return null;
  return (
    <Form.Item name={field.name} label={field.label} rules={field.rules}>
      {fieldRegistry.render(field)}
    </Form.Item>
  );
}
```

### Pattern 41.4: Schema from API (HIGH)

```typescript
// Fetch form schema from backend
function DynamicEntityForm({ entityType }: { entityType: string }) {
  const { data: schema, isLoading } = useQuery({
    queryKey: ['form-schema', entityType],
    queryFn: () => apiClient.get<FormSchema>(`/admin/form-schemas/${entityType}`).then((r) => r.data),
  });
  const [form] = Form.useForm();

  if (isLoading) return <FormSkeleton />;
  if (!schema) return <Empty description="No form schema" />;

  return <SchemaFormRenderer schema={schema} form={form} onFinish={handleSubmit} />;
}
```

### Pattern 41.5: Zod Schema Integration (HIGH)

```typescript
import { z } from 'zod';

// Zod schema → AntD validation rules
function zodToAntdRules(schema: z.ZodType): Rule[] {
  const rules: Rule[] = [];
  if (schema instanceof z.ZodString) {
    if (schema._def.checks) {
      schema._def.checks.forEach((check) => {
        if (check.kind === 'min') rules.push({ min: check.value, message: check.message });
        if (check.kind === 'max') rules.push({ max: check.value, message: check.message });
        if (check.kind === 'email') rules.push({ type: 'email', message: check.message });
      });
    }
  }
  return rules;
}
```

### Pattern 41.6: Formily Integration (MEDIUM-HIGH)

```typescript
// Formily — alibaba's schema form engine for AntD
import { createForm } from '@formily/core';
import { FormProvider, createSchemaField } from '@formily/react';
import { FormItem, Input, Select, DatePicker } from '@formily/antd-v5';

const SchemaField = createSchemaField({ components: { FormItem, Input, Select, DatePicker } });

const form = createForm();
const schema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name', required: true, 'x-decorator': 'FormItem', 'x-component': 'Input' },
    email: { type: 'string', title: 'Email', format: 'email', 'x-decorator': 'FormItem', 'x-component': 'Input' },
    role: { type: 'string', title: 'Role', enum: ['admin', 'viewer'], 'x-decorator': 'FormItem', 'x-component': 'Select' },
  },
};

<FormProvider form={form}><SchemaField schema={schema} /></FormProvider>
```

### Pattern 41.7: Dynamic Layout (MEDIUM)

```typescript
// Schema controls grid layout
const schema: FormSchema = {
  columns: 2,
  fields: [
    { name: 'firstName', label: 'First', type: 'text', colSpan: 12 },
    { name: 'lastName', label: 'Last', type: 'text', colSpan: 12 },
    { name: 'email', label: 'Email', type: 'email', colSpan: 24 },  // Full width
    { name: 'bio', label: 'Bio', type: 'textarea', colSpan: 24 },
  ],
};
```

### Pattern 41.8: Anti-patterns (MEDIUM)

**1. Over-dynamic** — Schema for simple static forms. Use direct AntD Form for known layouts.
**2. No type safety** — Schema values as `any`. Use TypeScript generics for type inference.
**3. Missing validation** — Schema defines fields but no rules.
**4. Client-only schema** — Schemas hardcoded in frontend. Use API-driven for admin configurability.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (41.1–41.8)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Schema-Driven Forms Specialist | EPS v3.2 | Metadata v2.1*
