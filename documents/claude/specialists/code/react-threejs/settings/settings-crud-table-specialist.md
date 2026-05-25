# Settings CRUD Table Specialist
# Settings CRUD Table スペシャリスト

**Stack**: React 17 + Three.js 0.139 + R3F 7 | **Variant**: construction-3d

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Settings (inline-edit table pattern for 15 subsystems) |
| **Directory Pattern** | `features/setting/{subsystem}/` — {SubsystemName}.tsx + state_management/ |
| **Variant** | construction-3d |
| **Pattern Numbers** | 5.01–5.04 |
| **Source Paths** | `**/setting/factory/**`, `**/setting/mixture/**`, `**/setting/filecategory/**` |
| **File Count** | ~30 files (3-4 files × 8 CRUD subsystems: factory, mixture, filecategory, etc.) |
| **Naming Convention** | `{SubsystemName}List.tsx` or `{SubsystemName}.tsx`, `state_management/slices.ts` |
| **Imports From** | State (own slice via connect), API (own service via thunks) |
| **Cannot Import** | Rendering (viewer components), Camera (controls), other settings subsystems |
| **Imported By** | Domain (Settings index page routes to each subsystem) |
| **Dependencies** | `@reduxjs/toolkit:1.8`, `react-redux:7.2`, `react-toastify:7.x` |
| **When To Use** | Creating a new settings subsystem with inline-edit table, CRUD operations, pagination, and Japanese toast notifications |
| **Source Skeleton** | `features/setting/{subsystem}/{SubsystemName}.tsx`, `features/setting/{subsystem}/state_management/slices.ts`, `features/setting/{subsystem}/state_management/types.d.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate settings CRUD table with inline edit-by-ID toggle, 編/削/更新/キャンセル buttons, Redux-connected CRUD handlers, and list refresh after operations |
| **Activation Trigger** | files: **/setting/**/state_management/**; keywords: settingsCRUD, inlineEdit, updatingId, factoryList, mixtureList |

---

## Pattern 5.01: Inline Edit Table

```pseudo
WORKFLOW InlineEditTable_Implementation {
  STATE: |
    updatingId: string    # Currently editing row ID ('' = none)
    detail: { data: ModelUpsert }  # Edit form data
    insert: { data: ModelUpsert }  # New row form data

  TABLE_TEMPLATE: |
    <table className="table table-striped table-bordered">
      <thead><tr><th>操作</th><th>名前</th>...</tr></thead>
      <tbody>
        {list.data.map(item => (
          <tr key={item.id}>
            <td>
              {item.id !== updatingId ? (
                # View mode
                <button onClick={() => dispatch(setUpdatingId(item.id))}>編</button>
                <button onClick={() => handleDelete(item.id)}>削</button>
              ) : (
                # Edit mode
                <button onClick={() => handleSave()}>更新</button>
                <button onClick={() => dispatch(setUpdatingId(''))}>キャンセル</button>
              )}
            </td>
            <td>
              {item.id !== updatingId ?
                item.name :
                <input value={detail.data.name}
                       onChange={e => dispatch(setData({ key: 'name', value: e.target.value }))} />
              }
            </td>
          </tr>
        ))}
        # Insert row at bottom
        <tr>
          <td><button onClick={handleAdd}>追加</button></td>
          <td><input value={insert.data.name} onChange={...} /></td>
        </tr>
      </tbody>
    </table>

  BUTTON_LABELS: {
    edit: "編",
    delete: "削",
    save: "更新",
    cancel: "キャンセル",
    add: "追加"
  }
}
```

---

## Pattern 5.02: CRUD Handlers

```pseudo
WORKFLOW CRUDHandlers_Implementation {
  ADD: |
    handleAdd = async () => {
      IF !insert.data.name THEN error("名前を入力してください"); return
      response = await dispatch(actions.insert(insert.data))
      IF response.payload?.success THEN
        success("保存が完了しました。")
        dispatch(actions.fetchList(QUERY_PAGING))
        dispatch(actions.resetData())
      ELSE
        error(response.payload?.errors?.[0])
      END IF
    }

  SAVE: |
    handleSave = async () => {
      response = await dispatch(actions.update(detail.data))
      IF response.payload?.success THEN
        success("更新が完了しました。")
        dispatch(actions.fetchList(QUERY_PAGING))
        dispatch(setUpdatingId(''))
      END IF
    }

  DELETE: |
    handleDelete = async (id) => {
      IF !confirm("削除してよろしいですか？") THEN return
      response = await dispatch(actions.deleteOne(id))
      IF response.payload?.success THEN
        success("削除が完了しました。")
        dispatch(actions.fetchList(QUERY_PAGING))
      END IF
    }
}
```

---

## Pattern 5.03: Pagination

```pseudo
QUERY_PAGING: |
  { pageIndex: 0, pageSize: 10 }

USED_BY: "factory, mixture (large lists)"
NOT_USED_BY: "meshcolor, warningtime (small settings, no pagination)"
```

---

## Anti-Patterns

```pseudo
ANTI_PATTERNS: {
  NO_ENGLISH_BUTTONS: "All button labels in Japanese",
  NO_EDIT_WITHOUT_ID: "setUpdatingId gates edit mode — never edit multiple rows",
  NO_SKIP_REFRESH: "Always fetchList after CRUD — no optimistic updates"
}
```
