# React AntD Table Specialist
# React AntDテーブルスペシャリスト
# Chuyen Gia AntD Table React

**Stack**: React 19 + TypeScript 5 | **Variant**: enterprise

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Shared, Features |
| **Directory Pattern** | `src/shared/ui/table/`, `src/features/{name}/ui/tables/` |
| **Variant** | enterprise |
| **Pattern Numbers** | 33.1–33.12 |
| **Source Paths** | `**/ui/tables/**/*.tsx`, `**/ui/table/**/*.tsx` |
| **File Count** | 5–20 table component files per project |
| **Naming Convention** | `{Entity}Table.tsx`, `{Entity}Columns.tsx` |
| **Imports From** | Shared (types, hooks), Entities (entity types) |
| **Cannot Import** | Pages, Widgets |
| **Imported By** | Features (CRUD pages), Widgets (dashboard tables) |
| **Dependencies** | `antd:5.x` (Table), `@ant-design/pro-components:2.x` (optional) |
| **When To Use** | Data tables with server-side pagination/sorting/filtering, row selection, expandable rows |
| **Source Skeleton** | `src/features/{name}/ui/tables/{Entity}Table.tsx`, `src/features/{name}/ui/tables/{Entity}Columns.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate AntD Table patterns — typed columns, server-side pagination+sorting+filtering, ProTable, TQ integration |
| **Activation Trigger** | files: **/ui/tables/**; keywords: antdTable, proTable, serverPagination, tableColumns |

---

## Evidence Sources

- E1: Ant Design 5 Table API documentation
- E2: ProTable (pro-components) documentation
- E3: TanStack Query + AntD Table integration
- E4: Virtual scroll for large datasets

---

## Patterns

### Pattern 33.1: Typed ColumnsType<T> (CRITICAL)

```typescript
import type { ColumnsType } from 'antd/es/table';

const columns: ColumnsType<User> = [
  { title: 'Name', dataIndex: 'displayName', key: 'name', sorter: true, width: 200 },
  { title: 'Email', dataIndex: 'email', key: 'email', ellipsis: true },
  { title: 'Role', dataIndex: 'role', key: 'role', filters: [{ text: 'Admin', value: 'admin' }, { text: 'Viewer', value: 'viewer' }],
    render: (role: User['role']) => <Tag color={role === 'admin' ? 'red' : 'blue'}>{role}</Tag> },
  { title: 'Created', dataIndex: 'createdAt', key: 'created', sorter: true,
    render: (date: string) => dayjs(date).format('YYYY-MM-DD') },
  { title: 'Actions', key: 'actions', fixed: 'right', width: 120,
    render: (_, record) => (
      <Space><Button size="small" onClick={() => edit(record)}>Edit</Button>
        <Popconfirm title="Delete?" onConfirm={() => del(record.id)}><Button size="small" danger>Delete</Button></Popconfirm></Space>
    ) },
];
```

### Pattern 33.2: Server-Side Pagination + Sorting + Filtering (CRITICAL)

```typescript
function UserTable() {
  const [tableParams, setTableParams] = useState({ page: 1, pageSize: 20, sortField: 'name', sortOrder: 'asc' as const, role: undefined as string | undefined });
  const { data, isLoading } = useQuery(userQueries.list(tableParams));

  const handleChange: TableProps<User>['onChange'] = (pagination, filters, sorter) => {
    setTableParams({
      page: pagination.current ?? 1,
      pageSize: pagination.pageSize ?? 20,
      sortField: !Array.isArray(sorter) && sorter.field ? String(sorter.field) : 'name',
      sortOrder: !Array.isArray(sorter) && sorter.order === 'descend' ? 'desc' : 'asc',
      role: filters.role?.[0] as string | undefined,
    });
  };

  return (
    <Table<User> columns={columns} dataSource={data?.items} loading={isLoading} rowKey="id"
      onChange={handleChange} pagination={{ current: tableParams.page, pageSize: tableParams.pageSize, total: data?.total, showSizeChanger: true, showTotal: (t, r) => `${r[0]}-${r[1]} of ${t}` }} />
  );
}
```

### Pattern 33.3: Row Selection (HIGH)

```typescript
const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
const rowSelection: TableProps<User>['rowSelection'] = {
  selectedRowKeys,
  onChange: setSelectedRowKeys,
  getCheckboxProps: (record) => ({ disabled: record.role === 'superadmin' }),
};

<Table rowSelection={rowSelection} />
<Space>
  <span>{selectedRowKeys.length} selected</span>
  <Button disabled={selectedRowKeys.length === 0} onClick={() => batchDelete(selectedRowKeys)}>Delete Selected</Button>
</Space>
```

### Pattern 33.4: Expandable Rows (HIGH)

```typescript
<Table expandable={{
  expandedRowRender: (record) => <OrderDetails order={record} />,
  rowExpandable: (record) => record.orders.length > 0,
  expandIcon: ({ expanded, onExpand, record }) => expanded ? <MinusOutlined onClick={(e) => onExpand(record, e)} /> : <PlusOutlined onClick={(e) => onExpand(record, e)} />,
}} />
```

### Pattern 33.5: Editable Table (HIGH)

```typescript
// Inline editing with AntD Form per row
interface EditableCellProps { editing: boolean; dataIndex: string; title: string; record: User; children: React.ReactNode; }

function EditableCell({ editing, dataIndex, title, children, ...restProps }: EditableCellProps) {
  return (
    <td {...restProps}>
      {editing ? <Form.Item name={dataIndex} style={{ margin: 0 }} rules={[{ required: true }]}><Input /></Form.Item> : children}
    </td>
  );
}
```

### Pattern 33.6: Virtual Scroll (HIGH)

```typescript
// For 10,000+ rows
<Table virtual scroll={{ y: 500 }} dataSource={largeDataset} pagination={false} />
```

### Pattern 33.7: ProTable + Search Form (MEDIUM-HIGH)

```typescript
import { ProTable, type ProColumns } from '@ant-design/pro-components';

const columns: ProColumns<User>[] = [
  { title: 'Name', dataIndex: 'displayName', valueType: 'text' },
  { title: 'Role', dataIndex: 'role', valueType: 'select', valueEnum: { admin: 'Admin', viewer: 'Viewer' } },
  { title: 'Created', dataIndex: 'createdAt', valueType: 'dateRange', hideInTable: true },
];

<ProTable<User> columns={columns} request={async (params) => {
  const data = await fetchUsers(params);
  return { data: data.items, total: data.total, success: true };
}} rowKey="id" search={{ labelWidth: 'auto' }} />
```

### Pattern 33.8: TQ Integration Pattern (MEDIUM-HIGH)

```typescript
// Separate columns definition from table component
// src/features/user-management/ui/tables/userColumns.tsx
export function useUserColumns(): ColumnsType<User> {
  const { can } = usePermission();
  const deleteUser = useDeleteUser();

  return useMemo(() => [
    { title: 'Name', dataIndex: 'displayName', sorter: true },
    { title: 'Email', dataIndex: 'email' },
    ...(can('user:update') ? [{ title: 'Actions', render: (_, r: User) => <Button onClick={() => edit(r)}>Edit</Button> }] : []),
  ], [can, deleteUser]);
}
```

### Pattern 33.9: Excel Export (MEDIUM)

```typescript
import * as XLSX from 'xlsx';

function exportToExcel(data: User[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data.map(u => ({ Name: u.displayName, Email: u.email, Role: u.role, Created: u.createdAt })));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Users');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

<Button icon={<DownloadOutlined />} onClick={() => exportToExcel(data?.items ?? [], 'users')}>Export</Button>
```

### Pattern 33.10: Column Visibility (MEDIUM)

```typescript
const [visibleColumns, setVisibleColumns] = useState<string[]>(columns.map(c => c.key as string));
const filteredColumns = columns.filter(c => visibleColumns.includes(c.key as string));

<Dropdown menu={{ items: columns.map(c => ({ key: c.key, label: <Checkbox checked={visibleColumns.includes(c.key as string)} onChange={(e) => { /**/ }}>{c.title as string}</Checkbox> })) }}>
  <Button icon={<SettingOutlined />}>Columns</Button>
</Dropdown>
<Table columns={filteredColumns} />
```

### Pattern 33.11: Responsive Table (MEDIUM)

```typescript
<Table scroll={{ x: 1200 }} // Horizontal scroll on small screens
  columns={[
    { title: 'Name', fixed: 'left', width: 150 },  // Fixed left
    { title: 'Email', width: 200 },
    // ... more columns
    { title: 'Actions', fixed: 'right', width: 100 }, // Fixed right
  ]}
/>
```

### Pattern 33.12: Anti-patterns (MEDIUM)

**1. Client-side pagination for large datasets** — Loading 10,000 rows then paginating. Use server-side.
**2. Missing rowKey** — React key warnings, incorrect row selection. Always set rowKey.
**3. Columns in render body** — New column array every render → table re-renders. Use useMemo.
**4. Missing loading state** — Table appears empty during fetch.
**5. Over-fetching** — Fetching all columns when table shows 5.

---

## Quality Checklist

- [ ] **Q1**: Patterns evidence-based (E1-E4)?
- [ ] **Q2**: Pattern IDs unique (33.1–33.12)?
- [ ] **Q3**: Trilingual header present?
- [ ] **Q4**: No implementation code — patterns only?

---

*React AntD Table Specialist | EPS v3.2 | Metadata v2.1*
