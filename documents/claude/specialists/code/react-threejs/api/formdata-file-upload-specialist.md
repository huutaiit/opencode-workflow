# FormData File Upload Specialist
# FormData File Upload スペシャリスト

**Stack**: React 17 + Three.js 0.139 + R3F 7 | **Variant**: construction-3d

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | API, Settings (file upload for DWG/GLB models and documents) |
| **Directory Pattern** | `services/api/constructionmodel.ts`, `services/api/document.ts`, `features/setting/location/` |
| **Variant** | construction-3d |
| **Pattern Numbers** | 6.11–6.13 |
| **Source Paths** | `**/services/api/constructionmodel.ts`, `**/services/api/document.ts`, `**/setting/location/**` |
| **File Count** | 4 files (2 API services + 2 setting components with file inputs) |
| **Naming Convention** | `upload()` method in API class, `useRef<HTMLInputElement>` for hidden file inputs |
| **Imports From** | API (axios-client for POST), Settings (location component for UI) |
| **Cannot Import** | Rendering (viewer components), State (Redux directly — upload through thunks) |
| **Imported By** | State (Redux thunks call upload methods), Settings (location component triggers upload) |
| **Dependencies** | None (uses browser FormData API + axios auto-detection) |
| **When To Use** | Uploading DWG/GLB construction model files or documents with mixed file + scalar FormData fields and extension validation |
| **Source Skeleton** | `services/api/constructionmodel.ts` (upload method), `features/setting/location/LocationSetting.tsx` (file input refs) |
| **Specialist Type** | code |
| **Purpose** | Generate FormData file upload with hidden input refs, multi-file append (DWG + GLB), extension validation in component, and auto Content-Type detection |
| **Activation Trigger** | files: **/services/api/constructionmodel.ts, **/setting/location/**; keywords: formData, fileUpload, dwgUpload, glbUpload, hiddenInput |

---

## Pattern 6.11: Construction Model Upload (DWG + GLB)

```pseudo
WORKFLOW ConstructionModelUpload_Implementation {
  UI: |
    const dwgRef = useRef<HTMLInputElement>(null)
    const glbRef = useRef<HTMLInputElement>(null)

    <input type="file" ref={dwgRef} accept=".dwg"
           onChange={e => setDwgFile(e.currentTarget.files[0])} hidden />
    <input type="file" ref={glbRef} accept=".glb"
           onChange={e => setGlbFile(e.currentTarget.files[0])} hidden />

    <button onClick={() => dwgRef.current?.click()}>DWGファイル選択</button>
    <button onClick={() => glbRef.current?.click()}>GLBファイル選択</button>

  API_SERVICE: |
    async upload(dataUpload) {
      formData = new FormData()
      formData.append("file", dataUpload.dwgFile, dataUpload.dwgFile.name)
      formData.append("glbFile", dataUpload.glbFile, dataUpload.glbFile.name)
      return axios.post(`${this.prefix}/Upload`, formData)
    }

  CRITICAL_RULES: [
    "Hidden file inputs triggered via ref.click()",
    "FormData.append(fieldName, file, fileName) — 3 params",
    "Axios auto-sets Content-Type: multipart/form-data for FormData",
    "Both DWG and GLB required for construction model"
  ]
}
```

---

## Pattern 6.12: Document Upload (File + Metadata)

```pseudo
WORKFLOW DocumentUpload_Implementation {
  API_SERVICE: |
    async create(dataUpload) {
      formData = new FormData()
      formData.append("File", dataUpload.file, dataUpload.file.name)
      formData.append('FactoryId', dataUpload.factoryId)
      formData.append('FileCategoryId', dataUpload.fileCategoryId)
      formData.append('Note', dataUpload.note)
      formData.append('RegisterTime', dataUpload.registerTime)
      return axios.post(`${this.prefix}/Create`, formData)
    }

  NOTE: "Mixed file + scalar fields in same FormData. Field name casing must match backend."
}
```

---

## Pattern 6.13: File Extension Validation

```pseudo
WORKFLOW FileValidation_Implementation {
  DWG_VALIDATION: |
    IF !file.name.endsWith(".dwg") THEN
      error("dwgファイル以外は登録できません")
      return
    END IF

  GLB_VALIDATION: |
    IF !file.name.endsWith(".glb") THEN
      error("glbファイル以外は登録できません")
      return
    END IF

  LOCATION: "Validation in COMPONENT, not API service layer"
}
```

---

## Anti-Patterns

```pseudo
ANTI_PATTERNS: {
  NO_MANUAL_CONTENT_TYPE: "Never set Content-Type for FormData uploads",
  NO_VALIDATION_IN_API: "File validation in component, not service",
  NO_DIRECT_INPUT: "Use hidden input + ref.click() pattern for styled buttons"
}
```
