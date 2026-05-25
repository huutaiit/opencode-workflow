# Slim Mode Specialist
# Slim Mode スペシャリスト

**Stack**: React 17 + Three.js 0.139 + R3F 7 | **Variant**: construction-3d

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | ALL (cross-cutting — touches UI checkbox, Redux state, API params, 3D rendering colors, SignalR sync) |
| **Directory Pattern** | `features/construction/components/ThreeEditor.tsx` (UI + colors), `features/location/selector/state_management/slices.ts` (state), `app/layouts/Main.tsx` (SignalR) |
| **Variant** | construction-3d |
| **Pattern Numbers** | 4.10–4.13 |
| **Source Paths** | `**/construction/components/ThreeEditor.tsx`, `**/slices.ts`, `**/layouts/Main.tsx`, `**/constants.ts` |
| **File Count** | Cross-cutting: affects 4+ files across rendering, state, realtime layers |
| **Naming Convention** | `isModeSlim` state flag, `changeModeLocation` thunk, `CASTING_HEIGHT` constant |
| **Imports From** | State (Redux isModeSlim, pumpSelect), API (locationAPI.changeMode), Realtime (SignalR Pump message) |
| **Cannot Import** | N/A (cross-cutting specialist — coordinates across layers, does not own files exclusively) |
| **Imported By** | Rendering (color calculation checks isSlim), Realtime (SignalR syncs slim mode), State (locationSelector stores flag) |
| **Dependencies** | None (uses framework core only — coordinates existing dependencies) |
| **When To Use** | Implementing thin-layer casting (薄層打設) toggle with casting height selection, slim-specific colors, and cross-client SignalR synchronization |
| **Source Skeleton** | Cross-cutting: modifies `ThreeEditor.tsx` (checkbox + colors), `slices.ts` (isModeSlim + changeModeLocation), `Main.tsx` (Pump handler) |
| **Specialist Type** | code |
| **Purpose** | Generate slim mode cross-cutting workflow with toggle confirmation, casting height selector (10/20cm), slim-specific color scheme, and SignalR pump message sync |
| **Activation Trigger** | files: **/ThreeEditor.tsx, **/slices.ts, **/Main.tsx; keywords: slimMode, thinLayer, castingHeight, isModeSlim, 薄層打設 |

---

## Specialist Identity

```pseudo
SPECIALIST SlimModeSpecialist {
  ROLE: "Thin-layer casting cross-cutting expert — touches UI, state, API, 3D rendering"

  CROSS_CUTTING: [
    "UI: Checkbox toggle + casting height selector",
    "State: isModeSlim in Redux + per-pump isSlim",
    "API: changeModeLocation + siteUpdate with castingHeight",
    "3D: Different color scheme for slim meshes",
    "SignalR: Pump message type syncs slim mode across clients"
  ]
}
```

---

## Pattern 4.10: Slim Mode Toggle

```pseudo
WORKFLOW SlimToggle_Implementation {
  UI: |
    <input type="checkbox"
      checked={locationSelectorState.isModeSlim}
      onChange={() => setConfirmChangeSlim(true)}
    />
    <label>薄層打設</label>

  CONFIRMATION_MODAL: |
    # Entering slim:
    "薄層打設に切り替えます。よろしいですか？"

    # Exiting slim:
    "薄層打設を終了します。よろしいですか？"
    WARNING: "薄層打設中のメッシュは薄層打設終了に更新されます。"

  API_CALL: |
    changeModeSlimAction() {
      dispatch(locationSelectorActions.changeModeLocation({
        isSlim: !isModeSlim,
        pumpId: pumpSelect
      }))
      # API: PUT /api/v1/Location/ChangeMode
      # Then refetch mesh data
    }
}
```

---

## Pattern 4.11: Casting Height Selection

```pseudo
WORKFLOW CastingHeight_Implementation {
  VISIBILITY: |
    # Only shown when ALL conditions met:
    isModeSlim === true
    AND (item.status === 'BeforePumping' OR item.status === 'FinishPumping')

  OPTIONS: |
    CASTING_HEIGHT = [10, 20]  # 10cm or 20cm

  UI: |
    <select value={castingHeightValue}
            onChange={(e) => setCastingHeightValue(parseInt(e.target.value))}>
      <option value={10}>10cm</option>
      <option value={20}>20cm</option>
    </select>

  RESTORE_PREVIOUS: |
    # When selecting a mesh, restore its previous casting height
    setCastingHeightValue(item?.previousCastingHeight || CASTING_HEIGHT[0])

  API_PAYLOAD: |
    # castingHeight included in siteUpdate only for slim mode
    {
      id: mesh.id,
      pumpId: pumpSelect,
      status: nextState,
      isCancel: false,
      castingHeight: castingHeightValue  # 10 or 20
    }
}
```

---

## Pattern 4.12: Slim Mode Colors

```pseudo
COLOR_SCHEME: {
  NORMAL: {
    BeforePumping: '#FFFAFA',  # White
    DuringPumping: '#FFFF00',  # Yellow
    FinishPumping: '#9ACD32'   # Yellow-green
  }
  SLIM: {
    BeforePumping: '#FFFAFA',  # White (SAME)
    DuringPumping: '#fdfc06',  # Bright lime yellow (distinct from normal yellow)
    FinishPumping: '#2670c1'   # Blue (very different from normal green)
  }
}

RENDERING_CHECK: |
  # In color priority chain (mesh-status-color-specialist):
  IF item.isSlim THEN
    use SLIM color scheme
  ELSE
    use NORMAL color scheme
```

---

## Pattern 4.13: SignalR Slim Mode Sync

```pseudo
WORKFLOW SlimSyncSignalR_Implementation {
  TRIGGER: "TYPE_MESSAGE_SOCKET[3] ('Pump') message"

  LOGIC: |
    updateModeSlim(data) {
      # Fetch updated pump list
      dispatch(shipmentActions.fetchPumpList())

      # Find matching pump
      pump = pumpList.find(p => p.id === data.pumpId)

      IF pump AND pump.id === currentPumpSelect THEN
        dispatch(locationSelectorActions.setModeSlimSocket({
          isModeSlim: data.isSlim,
          pumpId: data.pumpId
        }))
      END IF
    }

  CRITICAL_RULES: [
    "Only update if pump matches current selection",
    "Re-fetch pump list to get latest slim state",
    "setModeSlimSocket updates isModeSlim in Redux"
  ]
}
```

---

## Anti-Patterns

```pseudo
ANTI_PATTERNS: {
  NO_SLIM_WITHOUT_CONFIRM: "Always show confirmation modal before toggling slim mode",
  NO_SLIM_HEIGHT_ON_DURING: "Casting height only for BeforePumping/FinishPumping, NOT DuringPumping",
  NO_NORMAL_COLORS_IN_SLIM: "When isSlim=true, MUST use slim color scheme",
  NO_SKIP_PREVIOUS_HEIGHT: "Restore previousCastingHeight when re-selecting a slim mesh"
}
```
