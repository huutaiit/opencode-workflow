# Pumping Lifecycle Specialist
# Pumping Lifecycle スペシャリスト

**Stack**: React 17 + Three.js 0.139 + R3F 7 | **Variant**: construction-3d

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Realtime, Rendering (pumping status state machine + confirmation modals) |
| **Directory Pattern** | `features/construction/components/ThreeEditor.tsx` (modal logic), `features/construction/state_management/slices.ts` (thunks) |
| **Variant** | construction-3d |
| **Pattern Numbers** | 4.05–4.09 |
| **Source Paths** | `**/construction/components/ThreeEditor.tsx`, `**/construction/state_management/**` |
| **File Count** | 3 files (ThreeEditor modals, construction slices, ConstructionPage menu) |
| **Naming Convention** | Modal flags: `showPumpStartConfirmModal`, `showFinishedMeshConfirmModal`; API: `fetchUpdateMesh` |
| **Imports From** | State (Valtio for modal flags, Redux for mesh data), API (meshAPI.siteUpdate via thunk) |
| **Cannot Import** | Camera (controls), Settings (subsystem components), other viewer files |
| **Imported By** | Rendering (ThreeEditor onClick triggers modal flow), Domain (ConstructionPage menu actions) |
| **Dependencies** | `@reduxjs/toolkit:1.8`, `valtio:1.x` |
| **When To Use** | Implementing the BeforePumping→DuringPumping→FinishPumping status transition workflow with confirmation modals and pump assignment validation |
| **Source Skeleton** | `features/construction/components/ThreeEditor.tsx` (modal section), `features/construction/state_management/slices.ts` |
| **Specialist Type** | code |
| **Purpose** | Generate pumping lifecycle state machine with 6 confirmation modals, status transition validation, pump assignment checks, and Japanese confirmation text generation |
| **Activation Trigger** | files: **/construction/components/ThreeEditor.tsx; keywords: pumpingLifecycle, statusTransition, confirmModal, siteUpdate, beforePumping, duringPumping |

---

## Specialist Identity

```pseudo
SPECIALIST PumpingLifecycleSpecialist {
  ROLE: "Construction pumping workflow state machine expert"

  STATE_MACHINE: |
    Normal Mode:
    BeforePumping ─[打設開始]─→ DuringPumping ─[打設終了]─→ FinishPumping
                                      ↑                          │
                                [開始取消]←─────────────[終了取消]

    Slim Mode (overlay on FinishPumping):
    FinishPumping ─[薄層打設開始]─→ DuringPumping(slim) ─[薄層打設終了]─→ FinishPumping(slim)
                                          ↑                                     │
                                    [薄層開始取消]←──────────────[薄層終了取消]
}
```

---

## Pattern 4.05: Click → Modal → API Flow

```pseudo
WORKFLOW ClickToAPI_Implementation {
  STEP_1_CLICK: |
    User clicks mesh in Construction ThreeEditor
    → state.current = meshCode
    → state.currentItem = meshData
    → Branch based on pump/status (see 4.06)

  STEP_2_MODAL: |
    Modal shows action options based on current status
    → User selects action (打設開始/終了/取消)
    → state.nextState = target status
    → Show confirmation text

  STEP_3_CONFIRM: |
    User clicks OK
    → setStatusAPI() called

  STEP_4_API: |
    setStatusAPI() {
      payload = {
        id: state.currentItem.id,
        pumpId: locationSelectorState.pumpSelect,
        status: state.nextState,
        isCancel: state.isCancel,
        castingHeight: castingHeightValue  # Only for slim mode
      }
      dispatch(constructionActions.fetchUpdateMesh(payload))
      # API: PUT /api/v1/Mesh/SiteUpdate
    }

  STEP_5_REFRESH: |
    On API success:
    → Close all modals
    → dispatch(fetchLocationMesh({ locationId }))  # Refresh 3D
    → dispatch(overlappingActions.fetchList())      # Refresh table
    → Reset state variables
}
```

---

## Pattern 4.06: Modal Trigger Logic

```pseudo
WORKFLOW ModalTriggers_Implementation {
  CLICK_BRANCHING: |
    # In ThreeEditor onClick handler:

    IF item.pumpId !== currentPumpId THEN
      # DIFFERENT PUMP
      IF item.status === 'DuringPumping' → error("打設開始済みです") → RETURN
      IF item.status === 'FinishPumping' → error("打設済みです") → RETURN
      ELSE → state.showPumpStartConfirmModal = true

    ELSE IF item.status === 'FinishPumping' AND !isModeSlim THEN
      # SAME PUMP, FINISHED (normal)
      → state.showFinishedMeshConfirmModal = true

    ELSE IF item.status === 'DuringPumping' THEN
      # SAME PUMP, IN PROGRESS
      → state.showChangeMeshStateAtPumpingConfirmModal = true

    ELSE
      # SAME PUMP, BEFORE PUMPING (or slim mode variants)
      → Show action options in main modal

  MODAL_ACTIONS_BY_STATUS: {
    BeforePumping: ["打設開始 (Start) → DuringPumping"],
    DuringPumping_Normal: ["打設終了 (Finish) → FinishPumping", "打設開始取消 (Cancel) → BeforePumping"],
    DuringPumping_Slim: ["薄層打設終了 → FinishPumping", "薄層開始取消 → BeforePumping"],
    FinishPumping_Normal: ["終了取消 → DuringPumping"],
    FinishPumping_SlimMode: ["薄層打設開始 → DuringPumping", "薄層終了取消 → DuringPumping"]
  }
}
```

---

## Pattern 4.07: Confirmation Text Generation

```pseudo
WORKFLOW ConfirmText_Implementation {
  LOGIC: |
    renderTextConfirm() {
      IF isModeSlim THEN
        IF nextState === STATUS_MESH[1] THEN  # Starting slim
          return "薄層打設を開始します。よろしいですか？"
        ELSE IF nextState === STATUS_MESH[2] THEN  # Finishing slim
          return "薄層打設を終了します。よろしいですか？"
        ELSE IF isCancel THEN
          return "薄層打設を取消します。よろしいですか？"
        END IF
      ELSE
        IF nextState === STATUS_MESH[1] THEN  # Starting
          return "打設を開始します。よろしいですか？"
        ELSE IF nextState === STATUS_MESH[2] THEN  # Finishing
          return "打設を終了します。よろしいですか？"
        ELSE IF isCancel THEN
          return "打設を取消します。よろしいですか？"
        END IF
      END IF
    }
}
```

---

## Pattern 4.08: Revert and Batch Operations

```pseudo
OPERATIONS: {
  REVERT_BY_PUMP: |
    # Revert all DuringPumping meshes for selected pump
    API: PUT /api/v1/Mesh/RevertByPump?pumpId={pumpId}
    Triggered: "開始取消" menu item on Construction page

  RESET_BEFORE_PUMPING: |
    # Reset specific mesh to BeforePumping
    API: PUT /api/v1/Mesh/ResetBeforePumping
    Triggered: Cancel actions in modals

  SITE_UPDATE_LIST: |
    # Batch update multiple meshes
    API: PUT /api/v1/Mesh/SiteUpdateList
    Triggered: Batch operations (rarely used in UI)
}
```

---

## Anti-Patterns

```pseudo
ANTI_PATTERNS: {
  NO_DIRECT_STATUS_CHANGE: "ALWAYS go through modal → confirm → API → refresh cycle",
  NO_SKIP_PUMP_CHECK: "Always verify pump assignment before allowing status change",
  NO_OPTIMISTIC_UPDATE: "Wait for API success before updating UI — use fetchLocationMesh refresh",
  NO_ENGLISH_CONFIRM: "All confirmation text must be in Japanese"
}
```
