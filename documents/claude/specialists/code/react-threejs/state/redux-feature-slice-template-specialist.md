# Redux Feature Slice Template Specialist
# Redux Feature Slice Template スペシャリスト

**Stack**: React 17 + Three.js 0.139 + R3F 7 | **Variant**: construction-3d

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | State (standard Redux slice pattern for all feature modules) |
| **Directory Pattern** | `features/{feature}/state_management/` — slices.ts, actions.ts, types.d.ts |
| **Variant** | construction-3d |
| **Pattern Numbers** | 3.07–3.12 |
| **Source Paths** | `**/state_management/slices.ts`, `**/state_management/actions.ts`, `**/state_management/types.d.ts` |
| **File Count** | ~45 files (3 files × 15 feature modules) |
| **Naming Convention** | `slices.ts`, `actions.ts`, `types.d.ts` in `state_management/` |
| **Imports From** | API (service classes via createAsyncThunk) |
| **Cannot Import** | Rendering (viewer components), Camera (controls), other slices (no cross-slice imports) |
| **Imported By** | Rendering (components connect via connect() HOC), Store (root reducer imports all slices) |
| **Dependencies** | `@reduxjs/toolkit:1.8` (createSlice, createAsyncThunk), `react-redux:7.2` (connect) |
| **When To Use** | Creating a new feature module with Redux state management following the project's consistent slice/actions/types pattern |
| **Source Skeleton** | `features/{feature}/state_management/slices.ts`, `features/{feature}/state_management/actions.ts`, `features/{feature}/state_management/types.d.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate Redux Toolkit feature slices with createSlice, createAsyncThunk error handling, TypeScript namespace types, and connect() HOC pattern |
| **Activation Trigger** | files: **/state_management/slices.ts, **/state_management/types.d.ts; keywords: createSlice, createAsyncThunk, featureModule, reduxSlice, connectHOC |

---

## Specialist Identity

```pseudo
SPECIALIST ReduxFeatureSliceSpecialist {
  ROLE: "Redux Toolkit slice template expert for consistent feature module creation"

  RESPONSIBILITIES: [
    "Create feature slices with createSlice (reducers + extraReducers)",
    "Implement async thunks with createAsyncThunk and error handling",
    "Define TypeScript types via namespace pattern (TState, Model, ModelUpsert)",
    "Structure feature modules (Component + index + state_management/)",
    "Connect components to Redux via connect() HOC pattern",
    "Handle loading states, CRUD operations, pagination"
  ]

  TECH_STACK: {
    state: "@reduxjs/toolkit 1.8 (createSlice, createAsyncThunk)",
    binding: "react-redux 7.2 (connect, NOT useSelector/useDispatch)",
    types: "TypeScript with declare module + declare namespace",
    routing: "connected-react-router 6.5 + react-router 5.2"
  }

  DOMAIN_CONTEXT: {
    slices: "22 slices in root store",
    pattern: "All 15 settings subsystems follow identical pattern",
    connect_style: "Class-based connect() — NOT hooks (legacy React 17)"
  }
}
```

---

## Pattern 3.07: Feature Module File Structure

### Overview

```pseudo
PATTERN FeatureModuleStructure {
  PURPOSE: "Consistent directory layout for every feature module"

  PROBLEM: "Inconsistent module structure makes navigation and code generation unreliable"

  SOLUTION: "Standard 3-4 file structure per feature with state_management/ subdirectory"

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW FeatureModule_Structure {
  DIRECTORY_TEMPLATE: |
    features/{featureName}/
    ├── {FeatureName}.tsx              # Main UI component (Redux connected)
    ├── index.tsx                      # Barrel export / route config
    └── state_management/
        ├── slices.ts                  # createSlice + createAsyncThunk
        ├── actions.ts                 # Re-export: export * from './slices'
        └── types.d.ts                 # TypeScript interfaces + namespace

  OPTIONAL_FILES: [
    "{FeatureName}List.tsx        # List/table variant of main component",
    "{FeatureName}Editor.tsx      # Editor/form variant",
    "components/                  # Sub-components directory",
    "{featureName}.css            # Component-specific styles"
  ]

  CRITICAL_RULES: [
    "state_management/ ALWAYS has slices.ts, actions.ts, types.d.ts",
    "actions.ts is ALWAYS just re-export: export * from './slices'",
    "index.tsx is barrel export or simple route wrapper",
    "Main component is ALWAYS Redux-connected via connect() HOC"
  ]
}
```

---

## Pattern 3.08: createSlice Template

### Overview

```pseudo
PATTERN CreateSliceTemplate {
  PURPOSE: "Standard Redux slice with sync reducers and async thunk handlers"

  COMPLEXITY: "MEDIUM"
}
```

### Workflow

```pseudo
WORKFLOW CreateSlice_Implementation {
  TEMPLATE: |
    import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit"
    import { api } from "@services"

    // ─── INITIAL STATE ────────────────────────────────────
    export const initialState: TFeatureManagement.TState = {
      list: { data: [] },           # For list-based features
      detail: { data: new TFeatureManagement.ModelUpsert() },
      insert: { data: new TFeatureManagement.ModelUpsert() },
      updatingId: "",
      deletingId: "",
      isLoading: false
    }

    // ─── ASYNC THUNKS ─────────────────────────────────────
    export const fetch = createAsyncThunk(
      "featureName/fetch",
      async (params: ParamType, { rejectWithValue }) => {
        try {
          const response = await api.featureAPI.fetchList(params)
          return response.data
        } catch (error: any) {
          return rejectWithValue(error.response.data)
        }
      }
    )

    export const insert = createAsyncThunk(
      "featureName/insert",
      async (params: TFeatureManagement.ModelUpsert, { rejectWithValue }) => {
        try {
          const response = await api.featureAPI.insert(params)
          return response.data
        } catch (error: any) {
          return rejectWithValue(error.response.data)
        }
      }
    )

    export const update = createAsyncThunk(...)  # Same pattern
    export const deleteOne = createAsyncThunk(...)  # Same pattern

    // ─── SLICE ─────────────────────────────────────────────
    const slice = createSlice({
      name: "featureName",
      initialState,
      reducers: {
        setData(state, action: PayloadAction<{ key: string; value: any }>) {
          const target = state.detail.data as any
          target[action.payload.key] = action.payload.value
        },
        setUpdatingId(state, action: PayloadAction<string>) {
          IF action.payload THEN
            const item = state.list.data.find(x => x.id === action.payload)
            IF item THEN
              state.detail.data = { ...item }
            END IF
          ELSE
            state.detail = { data: new TFeatureManagement.ModelUpsert() }
          END IF
          state.updatingId = action.payload
        },
        resetData(state) {
          state.detail = initialState.detail
          state.insert = initialState.insert
          state.updatingId = ""
        }
      },
      extraReducers: (builder) => {
        builder
          .addCase(fetch.pending, (state) => {
            state.isLoading = true
          })
          .addCase(fetch.fulfilled, (state, action) => {
            state.list.data = action.payload.data
            state.isLoading = false
          })
          .addCase(fetch.rejected, (state) => {
            state.isLoading = false
          })
          # Repeat for insert, update, deleteOne...
      }
    })

    export const { setData, setUpdatingId, resetData } = slice.actions
    export default slice.reducer

  SLICE_VARIANTS: {
    SIMPLE_SETTINGS: {
      description: "Single object, no list (warningtime, meshcolor)",
      state: "{ settingObject: IModel, isLoading: boolean }",
      thunks: "fetch + update only"
    }
    CRUD_TABLE: {
      description: "List with pagination (factory, mixture)",
      state: "{ list: { data: Model[] } & TPagination, updatingId, detail, insert, isLoading }",
      thunks: "fetch + insert + update + delete"
    }
    COMPLEX_3D: {
      description: "3D viewer state (locationSelector — 655 LOC)",
      state: "{ locationMesh[], floorActive, pumpSelect, modeShowFloor, ... }",
      thunks: "8+ async thunks, 20+ sync reducers"
    }
  }

  CRITICAL_RULES: [
    "Always try/catch in async thunks with rejectWithValue",
    "error.response.data passed to rejectWithValue (not error itself)",
    "isLoading set in pending, cleared in fulfilled AND rejected",
    "Slice name must be unique across entire store",
    "Use PayloadAction<T> for typed reducers"
  ]
}
```

---

## Pattern 3.09: Types Namespace Pattern

### Overview

```pseudo
PATTERN TypesNamespace {
  PURPOSE: "Consistent TypeScript type definitions for feature modules"

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW Types_Implementation {
  TEMPLATE: |
    // types.d.ts
    import Reducer from "./slices"

    // ─── Module Augmentation ───────────────────────────
    declare module "AppTypes" {
      export interface IFeatureModel {
        id: string
        name: string
        // ... domain fields
      }

      export type FeatureState = ReturnType<typeof Reducer>
    }

    // ─── Namespace ─────────────────────────────────────
    declare namespace TFeatureManagement {
      type TState = {
        list: { data: Model[] }
        detail: { data: ModelUpsert }
        insert: { data: ModelUpsert }
        updatingId: string
        deletingId: string
        isLoading: boolean
      }

      export class Model implements IFeatureModel {
        id: string
        name: string

        constructor(m: IFeatureModel) {
          this.id = m.id
          this.name = m.name
        }
      }

      export class ModelUpsert {
        id: string | null = null
        name: string = ""
        isActive: boolean = true
      }
    }

  VARIANTS: {
    SIMPLE: "TState with single object, no list/detail/insert",
    PAGINATED: "TState with list: { data: Model[] } & TPagination.ReceiveFromServer",
    FILE_HANDLING: "TState adds uploadFile: File | null, glbUploadFile: File | null"
  }

  CRITICAL_RULES: [
    "declare module 'AppTypes' for global interface augmentation",
    "declare namespace T{Feature}Management for internal state types",
    "Model class implements IModel interface from AppTypes",
    "ModelUpsert has default values for form initialization",
    "ReturnType<typeof Reducer> auto-infers state type"
  ]
}
```

---

## Pattern 3.10: connect() HOC Pattern

### Overview

```pseudo
PATTERN ConnectHOC {
  PURPOSE: "Connect React components to Redux store via connect() HOC"

  NOTE: "This project uses connect() not useSelector/useDispatch (React 17 legacy)"

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW Connect_Implementation {
  TEMPLATE: |
    // Component definition
    type Props = {
      dispatch: Dispatcher
      featureState: FeatureState
      // Other connected slices as needed
    }

    const FeatureComponent: React.FC<Props> = ({ featureState, dispatch }) => {
      useEffect(() => {
        dispatch(featureActions.fetch())
      }, [])

      // ... component logic

      return <div>...</div>
    }

    // connect() at bottom of file
    export default connect(
      (state: RootState) => ({
        featureState: state.featureName
      })
    )(FeatureComponent)

  MULTI_SLICE_CONNECT: |
    # For viewers needing multiple slices:
    export default connect(
      (state: RootState) => ({
        locationSelectorState: state.locationSelector,
        appState: state.app,
        meshSettingState: state.meshSetting,
        shippingInformationState: state.shippingInformation,
        constructionState: state.construction
      })
    )(ThreeEditor)

  CRITICAL_RULES: [
    "ALWAYS use connect() HOC — NOT useSelector/useDispatch hooks",
    "dispatch comes from connect() props, typed as Dispatcher",
    "RootState imported from store/types.d.ts",
    "mapStateToProps is inline arrow function in connect()",
    "No mapDispatchToProps — use dispatch(action) directly"
  ]
}
```

---

## Pattern 3.11: Store Registration

### Overview

```pseudo
PATTERN StoreRegistration {
  PURPOSE: "Register new slice in root store configuration"

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW StoreRegister_Implementation {
  FILE: "src/store/index.ts"

  TEMPLATE: |
    import { configureStore } from "@reduxjs/toolkit"
    import { connectRouter } from "connected-react-router"
    import featureReducer from "@features/featureName/state_management/slices"

    const store = configureStore({
      reducer: {
        router: connectRouter(history),
        app: appReducer,
        auth: authReducer,
        featureName: featureReducer,     # ADD NEW SLICE HERE
        // ... other slices
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false   # Disabled for Valtio compatibility
        })
    })

  CRITICAL_RULES: [
    "serializableCheck: false — REQUIRED for Valtio proxy compatibility",
    "Slice key in store MUST match the name used in connect() mapStateToProps",
    "Import reducer as default import from slices.ts",
    "22 slices currently registered — follow alphabetical convention"
  ]
}
```

---

## Pattern 3.12: Component Error Handling

### Overview

```pseudo
PATTERN ComponentErrorHandling {
  PURPOSE: "Standard error handling pattern in Redux-connected components"

  COMPLEXITY: "LOW"
}
```

### Workflow

```pseudo
WORKFLOW ErrorHandling_Implementation {
  TEMPLATE: |
    import { success, error } from '@services/toast-service'

    const handleSave = async () => {
      const response = await dispatch(featureActions.update(data))

      IF response.payload && response.payload.success THEN
        success("保存が完了しました。")      # Japanese success message
        dispatch(featureActions.fetch())    # Refresh list
      ELSE
        error(response.payload.errors[0])  # First error message
      END IF
    }

  CRITICAL_RULES: [
    "Toast messages in Japanese (JP default locale)",
    "Always refresh list after successful CRUD operation",
    "Check response.payload.success before showing success toast",
    "Display first error from response.payload.errors array",
    "import { success, error } from toast-service — not react-toastify directly"
  ]
}
```

---

## Anti-Patterns

```pseudo
ANTI_PATTERNS: {
  NO_USE_SELECTOR: "Never use useSelector/useDispatch — this project uses connect() HOC",
  NO_DIRECT_API: "Never call API directly in component — always through createAsyncThunk",
  NO_INLINE_STATE: "Never define initial state inline in createSlice — use named constant",
  NO_MISSING_REJECTED: "Always handle .rejected case in extraReducers to clear isLoading",
  NO_ENGLISH_TOAST: "Toast messages must be in Japanese (default locale)"
}
```
