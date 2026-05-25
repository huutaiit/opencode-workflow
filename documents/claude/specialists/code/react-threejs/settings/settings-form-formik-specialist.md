# Settings Form Formik Specialist
# Settings Form Formik スペシャリスト

**Stack**: React 17 + Three.js 0.139 + R3F 7 | **Variant**: construction-3d

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Settings (Formik + Yup validated forms for complex settings) |
| **Directory Pattern** | `features/setting/overlapping/`, `features/construction/ConstructionPage.tsx` (transparency modal) |
| **Variant** | construction-3d |
| **Pattern Numbers** | 5.05–5.07 |
| **Source Paths** | `**/setting/overlapping/**`, `**/construction/ConstructionPage.tsx` |
| **File Count** | 4 files (overlapping form + construction transparency modal + state files) |
| **Naming Convention** | `{SubsystemName}.tsx` with Formik wrapper, `validationSchema` with Yup |
| **Imports From** | State (own slice via connect), API (own service via thunks) |
| **Cannot Import** | Rendering (viewer components), Camera (controls) |
| **Imported By** | Domain (Settings page, Construction page modal) |
| **Dependencies** | `formik:2.2`, `yup:0.x` |
| **When To Use** | Creating settings forms with Formik array validation, conditional required fields (Yup .when), datetime pickers, or range sliders |
| **Source Skeleton** | `features/setting/{subsystem}/{SubsystemName}.tsx` (Formik form) |
| **Specialist Type** | code |
| **Purpose** | Generate Formik-based settings forms with Yup conditional validation, array form pattern, enableReinitialize, and batch updateRange API calls |
| **Activation Trigger** | files: **/setting/overlapping/**, **/ConstructionPage.tsx; keywords: formik, yup, validationSchema, conditionalRequired, rangeSlider |

---

## Pattern 5.05: Formik Array Form

```pseudo
WORKFLOW FormikArrayForm_Implementation {
  TEMPLATE: |
    const validationSchema = Yup.array().of(
      Yup.object().shape({
        pumpId: Yup.string().when("pumpFinishTime", {
          is: (val) => val,
          then: Yup.string().required("ポンプ車を選択してください"),
          otherwise: Yup.string().nullable()
        })
      })
    )

    <Formik
      initialValues={dataList}
      validationSchema={validationSchema}
      enableReinitialize={true}
      onSubmit={(values) => {
        dispatch(actions.updateList({ listMesh: values }))
      }}
    >
      {({ values, setFieldValue, errors, submitForm }) => (
        <table>
          {values.map((item, idx) => (
            <tr key={item.id}>
              <td>
                <Field as="select" name={`${idx}.pumpId`}
                       className={errors[idx]?.pumpId ? 'is-invalid' : ''}>
                  <option value="">選択</option>
                  {pumpList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Field>
                {errors[idx]?.pumpId && <div className="text-danger">{errors[idx].pumpId}</div>}
              </td>
            </tr>
          ))}
          <button onClick={submitForm}>保存</button>
        </table>
      )}
    </Formik>

  CRITICAL_RULES: [
    "enableReinitialize={true} — data may change from API refresh",
    "Array index in field name: `${idx}.fieldName`",
    "Conditional validation with Yup .when() for dependent fields",
    "Error display per-cell with className 'is-invalid' + text-danger"
  ]
}
```

---

## Pattern 5.06: Mesh Transparency Modal (Formik)

```pseudo
WORKFLOW TransparencyModal_Implementation {
  USAGE: "メッシュ透過率設定 modal on Construction page"

  TEMPLATE: |
    <Formik
      initialValues={meshSettingState.meshSettingList}
      onSubmit={(values) => {
        dispatch(meshSettingActions.updateRange(values))
        success("保存が完了しました。")
        closeModal()
      }}
    >
      {({ values, setFieldValue }) => (
        <table>
          {values.map((setting, idx) => (
            <tr>
              <td>{setting.colorName}</td>
              <td>
                <input type="range" min={0} max={100}
                       value={setting.transferTime}
                       onChange={e => setFieldValue(`${idx}.transferTime`, parseInt(e.target.value))} />
                <span>{setting.transferTime}%</span>
              </td>
            </tr>
          ))}
        </table>
      )}
    </Formik>

  CRITICAL_RULES: [
    "Range slider 0-100 for transferTime",
    "Batch save via updateRange (all settings at once)",
    "Changes affect all 3D viewers immediately after save"
  ]
}
```

---

## Anti-Patterns

```pseudo
ANTI_PATTERNS: {
  NO_FORMIK_FOR_SIMPLE: "Don't use Formik for single-field settings — direct dispatch is simpler",
  NO_MISSING_REINITIALIZE: "enableReinitialize needed when initialValues change from API"
}
```
