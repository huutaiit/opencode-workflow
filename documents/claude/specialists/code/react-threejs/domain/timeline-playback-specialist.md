# Timeline Playback Specialist
# Timeline Playback スペシャリスト

**Stack**: React 17 + Three.js 0.139 + R3F 7 | **Variant**: construction-3d

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Domain (construction progress timeline replay with variable speed) |
| **Directory Pattern** | `features/playHistory/PlayHistory.tsx` |
| **Variant** | construction-3d |
| **Pattern Numbers** | 7.05–7.08 |
| **Source Paths** | `**/playHistory/PlayHistory.tsx`, `**/playHistory/index.tsx` |
| **File Count** | 2 files (PlayHistory component + index route) |
| **Naming Convention** | `PlayHistory.tsx`, play control functions: `handleStop`, `handlePlayPause`, `handleForward` |
| **Imports From** | State (Redux locationMeshHistory, stepIndexHistoryPlay), Rendering (shared Valtio state from settings) |
| **Cannot Import** | API (services directly), Camera (controls — inside viewer), Settings (subsystem components) |
| **Imported By** | Domain (App routing renders this page) |
| **Dependencies** | `moment:2.x` (time calculation), `@react-three/fiber:7.x`, `@react-three/drei:8.x` |
| **When To Use** | Building construction progress replay with variable speed (1x-100x), progress bar, play/pause/stop controls, and mesh history state iteration |
| **Source Skeleton** | `features/playHistory/PlayHistory.tsx`, `features/playHistory/index.tsx` |
| **Specialist Type** | code |
| **Purpose** | Generate timeline playback component with setInterval-based speed control, moment.js time calculation, mesh history state application, and play/pause/stop/forward/backward UI |
| **Activation Trigger** | files: **/playHistory/PlayHistory.tsx; keywords: playHistory, timelinePlayback, speedControl, meshHistory, playPause |

---

## Pattern 7.05: PlayHistory Component

```pseudo
COMPONENT: |
  FILE: "features/playHistory/PlayHistory.tsx (674 LOC)"

  STRUCTURE: |
    PlayHistory (Redux connected)
    ├── Canvas (same as home viewer)
    │   ├── Lighting
    │   ├── ModelGroup (filtered by history state)
    │   └── CameraControls
    ├── Progress Bar (visual timeline)
    ├── Play Controls (stop, backward, pause, forward, end)
    ├── Speed Selector (X1, X2, X10, X25, X50, X100)
    └── Step/Time Display

  DATA_FLOW: |
    fetchLocationMeshHistory(locationId)
    → locationMeshHistory.meshHistories: IMeshHistory[]
    → changeIsGetMeshPlayHistory(true) → resets all to BeforePumping
    → Interval-based iteration applies history entries
```

---

## Pattern 7.06: Speed Control

```pseudo
SPEED_OPTIONS: [1, 2, 10, 25, 50, 100]

PLAYBACK_MODES: {
  TIME_BASED: {
    label: "実時間 (Real-time)",
    behavior: "Steps through actual time intervals",
    interval: "1000ms / speedMultiplier"
  }
  STEP_BASED: {
    label: "1秒間隔 (1-second steps)",
    behavior: "Each step = 1 second regardless of actual time gaps",
    interval: "1000ms / speedMultiplier"
  }
}

INTERVAL_LOGIC: |
  useEffect(() => {
    IF isPlaying THEN
      interval = setInterval(() => {
        dispatch(changeStepIndexHistory(1))  # Forward
        # OR dispatch(changeStepIndexHistory(-1))  # Backward
      }, 1000 / speedMultiplier)

      return () => clearInterval(interval)
    END IF
  }, [isPlaying, speedMultiplier])
```

---

## Pattern 7.07: Time Calculation

```pseudo
TIME_CALCULATION: |
  firstTime = moment(meshHistories[0].logTime).subtract(1, 'seconds')
  lastTime = moment(meshHistories[meshHistories.length - 1].logTime).add(1, 'seconds')
  maxLength = lastTime.diff(firstTime, 'seconds')  # Total seconds

  # Current position
  currentTime = firstTime.add(stepIndexHistoryPlay, 'seconds')

  # Progress percentage
  progress = (stepIndexHistoryPlay / maxLength) * 100
```

---

## Pattern 7.08: Play Control UI

```pseudo
CONTROLS: |
  <div className="play-controls">
    <button onClick={handleStop}>⏹</button>           # Reset to start
    <button onClick={handleBackward}>⏪</button>       # Step backward
    <button onClick={handlePlayPause}>⏸/▶</button>   # Toggle
    <button onClick={handleForward}>⏩</button>        # Step forward
    <button onClick={handleEnd}>⏭</button>            # Jump to end
  </div>

  <select value={speed} onChange={setSpeed}>
    {[1, 2, 10, 25, 50, 100].map(s => <option>X{s}</option>)}
  </select>

  <div className="progress-bar">
    <div style={{ width: `${progress}%` }} />
  </div>

  <span>{stepIndexHistoryPlay} / {maxLength}</span>
```

---

## Anti-Patterns

```pseudo
ANTI_PATTERNS: {
  NO_MISSING_CLEANUP: "Always clearInterval on unmount and when isPlaying changes",
  NO_SKIP_RESET: "changeIsGetMeshPlayHistory(true) MUST reset all meshes before playback",
  NO_DIRECT_MOMENT_MUTATION: "moment objects are mutable — clone before math operations"
}
```
