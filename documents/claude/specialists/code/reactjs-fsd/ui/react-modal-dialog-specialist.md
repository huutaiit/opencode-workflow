# React Modal & Dialog Specialist
# Reactモーダル・ダイアログスペシャリスト
# Chuyen Gia Modal & Dialog React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Shared, Features |
| **Directory Pattern** | `src/shared/ui/modal/`, `src/features/{name}/ui/modals/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 38.1–38.10 |
| **Source Paths** | `**/ui/modal*/**`, `**/ui/modals/**` |
| **File Count** | 5–15 modal/dialog files per project |
| **Naming Convention** | `{Name}Modal.tsx`, `{Name}Drawer.tsx`, `useModal.ts` |
| **Imports From** | Shared (types, hooks), Entities (entity types) |
| **Cannot Import** | Pages |
| **Imported By** | Features, Widgets, Pages |
| **Dependencies** | `antd:5.x` (Modal, Drawer, App) |
| **When To Use** | Confirmation dialogs, form-in-modal, side drawer panels, toast notifications |
| **Source Skeleton** | `src/shared/ui/modal/ConfirmModal.tsx`, `src/shared/hooks/useModal.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate modal/dialog patterns — AntD Modal/Drawer, Modal.confirm, App.useApp(), form-in-modal, notification system |
| **Activation Trigger** | files: **/ui/modal*/**; keywords: modal, drawer, dialog, confirmation, notification, toast |

---

## Evidence Sources

- E1: AntD Modal/Drawer API documentation
- E2: AntD App.useApp() for imperative feedback
- E3: Modal accessibility (focus trap, aria-modal)
- E4: Enterprise confirmation/notification patterns

---

## Patterns

### Pattern 38.1: AntD Modal (Controlled) (CRITICAL)

```typescript
function UserDetailModal({ userId, open, onClose }: { userId: string; open: boolean; onClose: () => void }) {
  const { data: user, isLoading } = useQuery({ ...userQueries.detail(userId), enabled: open });

  return (
    <Modal title="User Details" open={open} onCancel={onClose} footer={null} width={600} destroyOnClose>
      {isLoading ? <Spin /> : user && (
        <Descriptions bordered column={1}>
          <Descriptions.Item label="Name">{user.displayName}</Descriptions.Item>
          <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
          <Descriptions.Item label="Role"><Tag>{user.role}</Tag></Descriptions.Item>
        </Descriptions>
      )}
    </Modal>
  );
}
```

### Pattern 38.2: AntD Drawer (CRITICAL)

```typescript
function UserFormDrawer({ open, onClose, user }: DrawerFormProps) {
  const [form] = Form.useForm<UpdateUserDTO>();

  return (
    <Drawer title={user ? 'Edit User' : 'Create User'} open={open} onClose={onClose}
      width={480} destroyOnClose extra={<Space>
        <Button onClick={onClose}>Cancel</Button>
        <Button type="primary" onClick={() => form.submit()}>Save</Button>
      </Space>}>
      <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={user}>
        <Form.Item name="displayName" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
      </Form>
    </Drawer>
  );
}
```

### Pattern 38.3: Modal.confirm (Imperative) (HIGH)

```typescript
import { ExclamationCircleOutlined } from '@ant-design/icons';

// Via App.useApp() — respects theme
function UserActions({ user }: { user: User }) {
  const { modal } = App.useApp();
  const deleteUser = useDeleteUser();

  const handleDelete = () => {
    modal.confirm({
      title: 'Delete User',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete ${user.displayName}? This action cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => deleteUser.mutateAsync(user.id),
    });
  };

  return <Button danger onClick={handleDelete}>Delete</Button>;
}
```

### Pattern 38.4: App.useApp() — Message/Notification (CRITICAL)

```typescript
// Always use App.useApp() instead of static imports
function CreateUserForm() {
  const { message, notification } = App.useApp();
  const createUser = useCreateUser();

  const onFinish = async (values: CreateUserDTO) => {
    try {
      const user = await createUser.mutateAsync(values);
      message.success(`User ${user.displayName} created`);
    } catch (error) {
      notification.error({
        message: 'Failed to create user',
        description: (error as Error).message,
        duration: 5,
        placement: 'topRight',
      });
    }
  };
}

// Message types: success, error, warning, info, loading
// Notification: richer — has title + description + icon + actions
// Modal.confirm: blocking — requires user decision
```

### Pattern 38.5: Form-in-Modal (HIGH)

```typescript
function CreateUserModal({ open, onClose, onSuccess }: ModalFormProps) {
  const [form] = Form.useForm<CreateUserDTO>();
  const createUser = useCreateUser();

  const handleOk = async () => {
    const values = await form.validateFields();
    await createUser.mutateAsync(values);
    form.resetFields();
    onSuccess();
  };

  return (
    <Modal title="Create User" open={open} onOk={handleOk} onCancel={() => { form.resetFields(); onClose(); }}
      confirmLoading={createUser.isPending} destroyOnClose okText="Create">
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input /></Form.Item>
        <Form.Item name="displayName" label="Name" rules={[{ required: true }]}><Input /></Form.Item>
        <Form.Item name="role" label="Role" rules={[{ required: true }]}>
          <Select options={[{ value: 'admin' }, { value: 'viewer' }]} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
```

### Pattern 38.6: useModal Hook (HIGH)

```typescript
// src/shared/hooks/useModal.ts
export function useModal(initialOpen = false) {
  const [open, setOpen] = useState(initialOpen);
  const [data, setData] = useState<unknown>(null);

  const show = useCallback((modalData?: unknown) => {
    setData(modalData ?? null);
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    setOpen(false);
    setData(null);
  }, []);

  return { open, data, show, hide };
}

// Usage
function UserList() {
  const editModal = useModal();
  const deleteModal = useModal();

  return (
    <>
      <Table columns={[
        { title: 'Actions', render: (_, user) => (
          <Space>
            <Button onClick={() => editModal.show(user)}>Edit</Button>
            <Button danger onClick={() => deleteModal.show(user)}>Delete</Button>
          </Space>
        )},
      ]} />
      <EditUserModal open={editModal.open} user={editModal.data as User} onClose={editModal.hide} />
      <DeleteConfirmModal open={deleteModal.open} user={deleteModal.data as User} onClose={deleteModal.hide} />
    </>
  );
}
```

### Pattern 38.7: Notification System (MEDIUM-HIGH)

```typescript
// Centralized notification from API errors
apiClient.interceptors.response.use(null, (error) => {
  const apiError = normalizeError(error);
  if (apiError.status >= 500) {
    // Use window event for non-React context
    window.dispatchEvent(new CustomEvent('api-error', { detail: apiError }));
  }
  return Promise.reject(apiError);
});

// Listener in app root
function ApiErrorNotifier() {
  const { notification } = App.useApp();
  useEventListener('api-error', (e: CustomEvent<ApiError>) => {
    notification.error({ message: 'Server Error', description: e.detail.message });
  });
  return null;
}
```

### Pattern 38.8: Toast vs Notification vs Modal Guide (MEDIUM-HIGH)

| Feedback Type | AntD Component | Duration | Blocking | Use For |
|:---:|:---:|:---:|:---:|---|
| Toast | `message` | 3s | No | Success/info — "Saved", "Copied" |
| Notification | `notification` | 5s | No | Warnings, errors with detail |
| Modal.confirm | `modal.confirm` | Until action | Yes | Destructive actions — delete, discard |
| Modal | `<Modal>` | Until close | Yes | Forms, detail views, wizards |

### Pattern 38.9: Stacked Modals (MEDIUM)

```typescript
// AntD supports stacked modals — each gets higher z-index automatically
// Pattern: Detail modal → Edit drawer from within
function UserDetailModal({ open, onClose, userId }: Props) {
  const editDrawer = useModal();

  return (
    <>
      <Modal open={open} onCancel={onClose} title="User Detail"
        footer={<Button type="primary" onClick={() => editDrawer.show()}>Edit</Button>}>
        <UserDetail userId={userId} />
      </Modal>
      <UserFormDrawer open={editDrawer.open} onClose={editDrawer.hide} userId={userId} />
    </>
  );
}
```

### Pattern 38.10: Anti-patterns (MEDIUM)

**1. Static message import** — `import { message } from 'antd'` ignores theme. Use `App.useApp()`.
**2. Missing destroyOnClose** — Stale form data when reopening modal.
**3. Confirm for non-destructive actions** — Unnecessary friction. Use message.success instead.
**4. Modal inside map** — Modal rendered per list item (N modals). Use single modal + selected data.
**5. Missing loading on confirm** — User clicks OK multiple times. Use `confirmLoading`.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (38.1–38.10)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React Modal & Dialog Specialist | EPS v3.2 | Metadata v2.1*
