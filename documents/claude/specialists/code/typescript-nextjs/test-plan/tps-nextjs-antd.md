# Test Plan Specialist — NextJS Ant Design Component Testing
# テストプランスペシャリスト — NextJS Ant Design Component Testing
# Chuyen Gia Test — NextJS Ant Design Component Testing

**Version**: 1.0.0
**Technology**: Vitest/Jest + @testing-library/react + Playwright
**Purpose**: Ant Design specific testing - Form.useForm, Table pagination, Modal lifecycle, ConfigProvider theme, SSR compatibility

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Pattern Numbers** | ANTD |
| **Specialist Type** | code |
| **Purpose** | Ant Design specific testing - Form.useForm, Table pagination, Modal lifecycle, ConfigProvider theme, SSR compatibility |

---

## Patterns

### Pattern ANTD.1: Form Testing

const [form] = Form.useForm(). render(<Form form={form}><Form.Item name="email" rules={[{ required: true, type: "email" }]}><Input /></Form.Item></Form>). Clear + type invalid -> verify error message. Submit valid -> verify form.getFieldsValue().

---

### Pattern ANTD.2: Table with Pagination

render(<Table dataSource={100items} pagination={{ pageSize: 10 }} />). Verify: 10 rows visible. Click page 2 -> verify rows 11-20 visible. Sort column -> verify order.

---

### Pattern ANTD.3: Modal Lifecycle

render(<Modal open={true} />). Verify: modal visible. Click OK -> verify onOk callback. Click Cancel -> verify onCancel. Press Escape -> verify close. Check: focus trap inside modal.

---

### Pattern ANTD.4: ConfigProvider Theme

render(<ConfigProvider theme={{ token: { colorPrimary: "#ff0000" } }}><Button type="primary">Test</Button></ConfigProvider>). Verify: button background-color matches theme.

---

### Pattern ANTD.5: SSR Compatibility

Verify: Ant Design components render without "window is not defined" error in SSR. Use dynamic(() => import("antd/..."), { ssr: false }) for client-only components.

---

## ❌ Negative Example

BAD: Mock Ant Design components entirely. GOOD: Render real Ant Design components - test actual behavior (form validation, table sorting, modal focus trap).

---

## Quality Checklist

- [ ] **Q1**: Testing Library queries used (getByRole > getByTestId)?
- [ ] **Q2**: User interaction via userEvent (not fireEvent)?
- [ ] **Q3**: Negative examples explain consequences?
- [ ] **Q4**: axe-core accessibility check on every component?

---

*Test Plan Specialist — NextJS Ant Design Component Testing | EPS v10.0*
