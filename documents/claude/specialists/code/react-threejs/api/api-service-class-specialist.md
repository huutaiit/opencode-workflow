# API Service Class Specialist
# API Service Class スペシャリスト

**Stack**: React 17 + Three.js 0.139 + R3F 7 | **Variant**: construction-3d

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | API (singleton service classes for RESTful endpoints) |
| **Directory Pattern** | `services/api/{entity}.ts` |
| **Variant** | construction-3d |
| **Pattern Numbers** | 6.06–6.10 |
| **Source Paths** | `**/services/api/*.ts` |
| **File Count** | 24 API service class files |
| **Naming Convention** | `{entity}.ts` → `class {Entity}API` exported as `export const {entity}API = new {Entity}API()` |
| **Imports From** | API (axios-client configured instance) |
| **Cannot Import** | State (Redux), Rendering (viewer components), Settings (subsystem components) |
| **Imported By** | State (Redux async thunks import `api.{entity}API.method()`), API (services/index.ts aggregates all) |
| **Dependencies** | `axios:0.21` (configured instance from axios-client) |
| **When To Use** | Creating a new API service class with CRUD methods, query parameter builder, blob export, or batch update endpoints |
| **Source Skeleton** | `services/api/{entity}.ts`, `services/index.ts` (aggregation update) |
| **Specialist Type** | code |
| **Purpose** | Generate singleton API service classes with prefix-based CRUD methods (fetchList, insert, update, delete), appendParams utility, and services/index.ts aggregation |
| **Activation Trigger** | files: **/services/api/*.ts; keywords: apiService, singletonClass, fetchList, crudEndpoint, appendParams |

---

## Specialist Identity

```pseudo
SPECIALIST APIServiceClassSpecialist {
  ROLE: "API service class pattern expert for RESTful endpoint management"

  RESPONSIBILITIES: [
    "Create singleton API service classes with consistent prefix pattern",
    "Implement standard CRUD methods (fetch, insert, update, delete)",
    "Handle FormData construction for file uploads (DWG, GLB, documents)",
    "Build query parameters with appendParams utility",
    "Handle blob responses for file downloads/exports",
    "Aggregate all services in central export"
  ]

  TECH_STACK: {
    http: "axios (configured instance from axios-client)",
    upload: "FormData API (browser native)",
    params: "appendParams utility with lodash _.pickBy",
    export: "Centralized in services/index.ts"
  }

  DOMAIN_CONTEXT: {
    api_prefix: "/api/v1/{EntityName}",
    total_services: "24 API service classes",
    key_services: "constructionmodel (GLB), mesh (status), location (CRUD), shippinginformation"
  }
}
```

---

## Pattern 6.06: Singleton API Class

```pseudo
WORKFLOW SingletonAPI_Implementation {
  TEMPLATE: |
    import axios from '@utils/axios-client'

    class FeatureAPI {
      prefix = '/api/v1/Feature'

      async fetchList(params?: any) {
        return axios.get(`${this.prefix}/GetAll`, { params })
      }

      async fetchById(id: string) {
        return axios.get(`${this.prefix}/GetById?id=${id}`)
      }

      async insert(params: any) {
        return axios.post(`${this.prefix}/Create`, params)
      }

      async update(params: any) {
        return axios.put(`${this.prefix}/Update`, params)
      }

      async delete(id: string) {
        return axios.delete(`${this.prefix}/Delete?id=${id}`)
      }
    }

    export const featureAPI = new FeatureAPI()

  NAMING_CONVENTIONS: {
    class_name: "{EntityName}API  (PascalCase + API suffix)",
    export_name: "{entityName}API  (camelCase + API suffix)",
    prefix: "/api/v1/{EntityName}  (PascalCase entity name)",
    methods: "fetchList, fetchById, fetchAll, insert, update, delete"
  }

  CRITICAL_RULES: [
    "Import axios from '@utils/axios-client' — NOT from 'axios' directly",
    "prefix property on class — NOT per-method URL construction",
    "Singleton exported at module level — NOT lazy instantiation",
    "All methods are async (even when await not strictly needed)",
    "ID-based delete via query string: /Delete?id=${id}"
  ]
}
```

---

## Pattern 6.07: CRUD Method Variants

```pseudo
WORKFLOW CRUDMethods_Implementation {
  GET_SIMPLE: |
    async fetchAll() {
      return axios.get(`${this.prefix}/GetAll`)
    }

  GET_WITH_PARAMS: |
    async fetchByConstructionModel(id: string) {
      return axios.get(`${this.prefix}/GetByConstructionModel?id=${id}`)
    }

  GET_WITH_COMPLEX_PARAMS: |
    async fetchList(params: any) {
      url = appendParams(`${this.prefix}/GetAll`, params)
      return axios.get(url)
    }

  GET_BLOB_EXPORT: |
    async exportReport(locationId: string) {
      return axios.get(
        `${this.prefix}/ReportCastingRecord?locationId=${locationId}`,
        { responseType: 'blob' }
      )
    }

  POST_JSON: |
    async insert(params: IModel) {
      return axios.post(`${this.prefix}/Create`, params)
    }

  PUT_JSON: |
    async update(params: IModel) {
      return axios.put(`${this.prefix}/Update`, params)
    }

  PUT_BATCH: |
    async updateRange(params: IModel[]) {
      return axios.put(`${this.prefix}/UpdateRange`, params)
    }

  DELETE_BY_ID: |
    async delete(id: string) {
      return axios.delete(`${this.prefix}/Delete?id=${id}`)
    }

  PATCH_SPECIFIC: |
    async updatePlannedVolume(params: any) {
      return axios.patch(`${this.prefix}/UpdatePlannedVolume`, params)
    }
}
```

---

## Pattern 6.08: FormData File Upload

```pseudo
WORKFLOW FormDataUpload_Implementation {
  CONSTRUCTION_MODEL_UPLOAD: |
    # Upload DWG + GLB files for 3D model
    async upload(dataUpload: any) {
      formData = new FormData()
      formData.append("file", dataUpload.dwgFile, dataUpload.dwgFile.name)
      formData.append("glbFile", dataUpload.glbFile, dataUpload.glbFile.name)
      return axios.post(`${this.prefix}/Upload`, formData)
      # Axios auto-detects FormData → sets Content-Type: multipart/form-data
    }

  DOCUMENT_UPLOAD: |
    # Upload document with metadata
    async create(dataUpload: any) {
      formData = new FormData()
      formData.append("File", dataUpload.file, dataUpload.file.name)
      formData.append('FactoryId', dataUpload.factoryId)
      formData.append('FileCategoryId', dataUpload.fileCategoryId)
      formData.append('Note', dataUpload.note)
      formData.append('RegisterTime', dataUpload.registerTime)
      return axios.post(`${this.prefix}/Create`, formData)
    }

  FILE_VALIDATION_IN_COMPONENT: |
    # Validate before sending (component-level, not API-level)
    IF !file.name.endsWith(".dwg") THEN
      error("dwgファイル以外は登録できません")
      return
    END IF

  CRITICAL_RULES: [
    "FormData.append with 3 params: (fieldName, file, fileName)",
    "Do NOT set Content-Type header manually — axios detects FormData",
    "Mixed file + scalar fields in same FormData is OK",
    "File extension validation done in COMPONENT, not API service",
    "Field name casing varies: 'file' vs 'File' — match backend expectation"
  ]
}
```

---

## Pattern 6.09: Query Parameter Builder

```pseudo
WORKFLOW QueryParams_Implementation {
  UTILITY_FUNCTION: |
    # utils/func.ts — appendParams
    import _ from 'lodash'

    export function appendParams(url: string, paramObj: any): string {
      IF !paramObj THEN return url

      # Filter out empty values but keep false/0
      filtered = _.pickBy(paramObj, (value, key) => {
        IF key === 'Status' THEN return true  # Always include Status
        return _.identity(value)               # Filter empty/null/undefined
      })

      queryString = Object.entries(filtered)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&')

      return queryString ? `${url}?${queryString}` : url
    }

  CRITICAL_RULES: [
    "Status field ALWAYS included even if falsy (special case)",
    "Boolean false preserved (lodash identity returns false → filtered, but Status override)",
    "Empty strings, null, undefined filtered out",
    "Values are URL-encoded via encodeURIComponent"
  ]
}
```

---

## Pattern 6.10: Service Aggregation

```pseudo
WORKFLOW ServiceAggregation_Implementation {
  FILE: "services/index.ts"

  TEMPLATE: |
    import { factoryAPI } from './api/factory'
    import { meshAPI } from './api/mesh'
    import { locationAPI } from './api/location'
    // ... 21 more imports

    export const api = {
      auth,                    // Functions (not class instance)
      factoryAPI,
      mixtureAPI,
      locationAPI,
      pumpAPI,
      orderAPI,
      shippingInformationAPI,
      mixerTruckAPI,
      overlappingAPI,
      constructionModelAPI,
      blockAPI,
      liftAPI,
      meshAPI,
      meshSettingAPI,
      displayItemSettingAPI,
      warningTimeSettingAPI,
      userAPI,
      cardReaderAPI,
      fileCategoryAPI,
      documentAPI,
      manualAPI,
      termsAPI,
      compressionExperimentAPI
    }

    export * as logger from './logger-service'
    export * as toast from './toast-service'

  USAGE_IN_THUNKS: |
    import { api } from '@services'
    const response = await api.meshAPI.siteUpdate(params)

  CRITICAL_RULES: [
    "All API classes aggregated in single api object",
    "auth is function-based (not class), rest are class instances",
    "Import path: '@services' (aliased)",
    "Supporting services (logger, toast) exported as namespaces"
  ]
}
```

---

## Key API Services Reference

| Service | Prefix | Key Methods |
|---------|--------|------------|
| constructionModelAPI | /api/v1/ConstructionModel | upload(FormData), getAll, update, delete |
| meshAPI | /api/v1/Mesh | siteUpdate, siteUpdateList, revertByPump, resetBeforePumping, getUnderMesh |
| locationAPI | /api/v1/Location | getWithMesh, getMeshHistory, updatePump, changeMode, 3 report exports |
| shippingInformationAPI | /api/v1/ShippingInformation | fetchList, fetchListForEditor, fetchPumpList |
| meshSettingAPI | /api/v1/MeshSetting | getAll, updateRange |

---

## Anti-Patterns

```pseudo
ANTI_PATTERNS: {
  NO_RAW_AXIOS: "Never import 'axios' directly in API files — always '@utils/axios-client'",
  NO_INLINE_URL: "Never construct full URL inline — use prefix property",
  NO_MANUAL_CONTENT_TYPE: "Never set Content-Type for FormData — axios auto-detects",
  NO_RESPONSE_INCONSISTENCY: "Return response.data consistently (known project inconsistency to avoid)",
  NO_ERROR_HANDLING_IN_API: "Errors propagate to thunks — API classes don't catch/handle"
}
```
