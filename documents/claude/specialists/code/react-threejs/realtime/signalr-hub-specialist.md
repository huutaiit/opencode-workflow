# SignalR Hub Specialist
# SignalR Hub スペシャリスト

**Stack**: React 17 + Three.js 0.139 + R3F 7 | **Variant**: construction-3d

---

## Architecture Metadata

| Property | Value |
|----------|-------|
| **Layer** | Realtime (SignalR connection, message routing, Redux dispatch chains) |
| **Directory Pattern** | `app/layouts/Main.tsx` (hub setup + message handlers) |
| **Variant** | construction-3d |
| **Pattern Numbers** | 4.01–4.04 |
| **Source Paths** | `**/layouts/Main.tsx`, `**/const/constants.ts` |
| **File Count** | 2 files (Main.tsx hub logic, constants.ts TYPE_MESSAGE_SOCKET) |
| **Naming Convention** | `Main.tsx` layout component, `TYPE_MESSAGE_SOCKET` constant array |
| **Imports From** | State (Redux — dispatches to locationSelector, shippingInformation, shipment slices), API (indirect via thunks) |
| **Cannot Import** | Rendering (viewer components directly — dispatches through Redux) |
| **Imported By** | Domain (App.tsx renders Main layout which contains hub) |
| **Dependencies** | `@microsoft/signalr:6.x` |
| **When To Use** | Setting up real-time mesh/shipping/pump updates via SignalR with auto-reconnect, group join, page-aware dispatch routing, and rate limiting |
| **Source Skeleton** | `app/layouts/Main.tsx` (SignalR section lines 163-358) |
| **Specialist Type** | code |
| **Purpose** | Generate SignalR hub connection with auto-reconnect, 6-type message routing, page-aware Redux dispatch chains, and 1-second rate limiting |
| **Activation Trigger** | files: **/layouts/Main.tsx; keywords: signalR, hubConnection, receiveMessage, realtime, socketUpdate |

---

## Specialist Identity

```pseudo
SPECIALIST SignalRHubSpecialist {
  ROLE: "Real-time communication expert for construction data synchronization"

  FILE: "app/layouts/Main.tsx (lines 163-358)"
  HUB_URL: "${process.env.REACT_APP_API_ENDPOINT}eagleplushub"
  GROUP: "EaglePlus"
  MESSAGE_TYPES: 6
}
```

---

## Pattern 4.01: Connection Setup

```pseudo
WORKFLOW ConnectionSetup_Implementation {
  LOGIC: |
    connection = new signalR.HubConnectionBuilder()
      .withUrl(`${process.env.REACT_APP_API_ENDPOINT}eagleplushub`)
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          IF retryContext.elapsedMilliseconds < 60000 THEN
            return Math.random() * 10000  # Random 0-10s
          ELSE
            return null  # Stop reconnecting after 60s
          END IF
        }
      })
      .build()

    await connection.start()
    await connection.invoke("JoinGroup", "EaglePlus")

  LIFECYCLE: |
    connection.onclose(() => {
      # Auto-restart connection
      startConnection()
    })

    connection.onreconnecting(() => {
      # Rejoin group after reconnect
      connection.invoke("JoinGroup", "EaglePlus")
      # Show socket alert on tablet
    })
}
```

---

## Pattern 4.02: Message Routing (6 Types)

```pseudo
WORKFLOW MessageRouting_Implementation {
  HANDLER: |
    connection.on("ReceiveMessage", (message) => {
      eventCode = message.eventCode
      data = message.data
      currentPath = history.location.pathname

      SWITCH eventCode:
        TYPE_MESSAGE_SOCKET[0] ('Mesh'):
          IF data.locationId === currentLocationId THEN
            updateMeshOnSocket(message)
          END IF

        TYPE_MESSAGE_SOCKET[1] ('ShippingInformation'):
          IF currentPath includes '/location' OR '/construction' THEN
            updateShippingInfo(data)
          END IF

        TYPE_MESSAGE_SOCKET[2] ('OrderDetail'):
          # Same as ShippingInformation
          updateShippingInfo(data)

        TYPE_MESSAGE_SOCKET[3] ('Pump'):
          updateModeSlim(data)

        TYPE_MESSAGE_SOCKET[4] ('ShippingInformationWarning'):
          updateShippingInfoWithSort(data)

        TYPE_MESSAGE_SOCKET[5] ('UnderMeshCreate'):
          dispatch(locationActions.setUnderMeshLoading(false))
    })

  CRITICAL_RULES: [
    "Check locationId match before processing Mesh updates",
    "Check pathname for page-aware routing (don't update wrong page)",
    "Rate limit ShippingInformation updates (1s cooldown)"
  ]
}
```

---

## Pattern 4.03: Dispatch Chains Per Message Type

```pseudo
DISPATCH_CHAINS: {
  MESH_UPDATE: |
    fetchLocationMeshAlert({ locationId, ignoreFilter: true })
    updateStatusMesh({ id, status, warningStatus, isSlim, pumpId })
    overlappingActions.fetchList({ LocationId })
    shippingInformationActions.fetchList({ locationId })
    shippingInformationActions.fetchPumpList({ LocationId })

  SHIPPING_INFO_UPDATE: |
    # On /location page:
    shippingInformationActions.fetchList({ locationId })
    shipmentActions.fetchFactoryList()
    shipmentActions.fetchPumpList()
    shipmentActions.fetchProcessChartData({ locationId })
    shipmentActions.fetchOrderByLocation(locationId)

    # On /construction page (lighter):
    shippingInformationActions.fetchList({ locationId })
    shipmentActions.fetchPumpList()

  PUMP_UPDATE: |
    shipmentActions.fetchPumpList()
    # Find pump, dispatch setModeSlimSocket if matching

  SHIPPING_WARNING: |
    # Same as SHIPPING_INFO but preserves sort column/direction
    shippingInformationActions.fetchList({ locationId, sortColumn, sortDirection })
}
```

---

## Pattern 4.04: Rate Limiting

```pseudo
WORKFLOW RateLimiting_Implementation {
  LOGIC: |
    const isUpdateShippingInformation = useRef(true)

    # Before dispatching shipping updates:
    IF isUpdateShippingInformation.current THEN
      isUpdateShippingInformation.current = false
      # ... dispatch all shipping actions ...
      setTimeout(() => {
        isUpdateShippingInformation.current = true
      }, 1000)  # 1 second cooldown
    END IF

  CRITICAL_RULES: [
    "useRef (not useState) — avoids re-render on flag change",
    "1 second cooldown prevents duplicate API floods from rapid socket messages",
    "Only applied to ShippingInformation — Mesh updates are always processed"
  ]
}
```

---

## Anti-Patterns

```pseudo
ANTI_PATTERNS: {
  NO_GLOBAL_DISPATCH: "Always check locationId and pathname before dispatching",
  NO_MISSING_REJOIN: "Always rejoin group on reconnect — server may have lost group membership",
  NO_INFINITE_RECONNECT: "Stop after 60s — prevents battery drain on mobile"
}
```
