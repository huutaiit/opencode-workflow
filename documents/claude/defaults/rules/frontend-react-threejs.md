---
paths:
  - "EaglePlus/ClientApp/src/**/*.tsx"
  - "EaglePlus/ClientApp/src/**/*.ts"
---
# React Three.js Frontend Rules — Construction 3D Viewer

## Architecture
- React 17.x, TypeScript 4.x           # CONFIGURE: versions
- Feature-based architecture (features/ + services/ + store/)
- 3D: Three.js 0.139 + React Three Fiber 7 + Drei 8
- State: Redux Toolkit 1.8 (persistent) + Valtio (viewport)
- Realtime: SignalR 6.x
- i18n: Japanese (default) + English

## Layer Rules

### Rendering (3D viewer components)
- CAN import: Camera (controls), State (via connect HOC)
- CANNOT import: API (services directly), Settings (subsystem components)
- Pattern: Canvas → Stage → ModelGroup → Model hierarchy

### Camera (camera control components)
- CAN import: Rendering (placed inside Canvas)
- CANNOT import: State (Redux — camera is ref-based), API (services)

### State (Redux slices + Valtio proxies)
- CAN import: API (service classes via createAsyncThunk)
- CANNOT import: Rendering (components), Camera (controls), other slices directly

### API (service classes + axios client)
- CAN import: API (axios-client only)
- CANNOT import: State (Redux), Rendering (components), Settings (subsystems)

### Realtime (SignalR hub)
- CAN import: State (Redux — dispatches to slices)
- CANNOT import: Rendering (components directly)

### Settings (15 subsystems)
- CAN import: State (own slice via connect), API (own service)
- CANNOT import: Rendering (viewers), other settings subsystems

### Domain (page-level composition)
- CAN import: Rendering (viewers), State (multiple slices via connect), Settings (modals)
- CANNOT import: API (directly — through Redux thunks)

## Naming
- 3D Viewer: `ThreeEditor.tsx`, `3dViewer.tsx`, `Mode2dEditor.tsx`
- Camera: `CameraControl.tsx`, `Camera2DControls.tsx`
- Redux: `slices.ts`, `actions.ts`, `types.d.ts` in `state_management/`
- API: `{entity}.ts` → `class {Entity}API` with `prefix = '/api/v1/{Entity}'`
- Settings: `{SubsystemName}.tsx` or `{SubsystemName}List.tsx`

## State Management
- Redux Toolkit for persistent, server-synced state (mesh data, settings, loading)
- Valtio proxy for ephemeral viewport state (selection, modal flags, current GLB)
- connect() HOC pattern — NOT useSelector/useDispatch (React 17 legacy)
- serializableCheck: false in store config for Valtio compatibility

## 3D Rendering
- Canvas: dpr=[1,2], shadows for construction/home viewers only
- Lighting: pointLight [10,10,10] 0.8 + hemisphereLight #A6A7A5/#696B67 0.85
- Material: ALWAYS meshStandardMaterial with transparent=true
- Layer separation: constant Y-offset = 6 (never adaptive)
- Color priority: active > pumpFilter > warning > status+slim > default

## Response Format
- All toast messages in Japanese (JP default locale)
- API classes use singleton pattern with prefix property
- JWT Bearer authentication with token refresh queue

## KHI NAO KHONG AP DUNG (When NOT to Apply)
- Non-3D pages (pure CRUD forms) — use Settings CRUD Table pattern instead
- Mobile-only features — this stack targets desktop + tablet
- Server-side rendering — this is a client-side SPA
