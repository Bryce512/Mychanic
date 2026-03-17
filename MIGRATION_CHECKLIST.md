# OBD Engine Migration Checklist

Use this checklist when refactoring screens to use the new `useOBDEngine` hook.

## Pre-Refactoring

- [ ] Identify screen name: ******\_\_\_******
- [ ] Identify what OBD operations it uses:
  - [ ] Single PID queries (RPM, Speed, Temp, etc.)
  - [ ] Batch PID queries
  - [ ] DTC scanning
  - [ ] DTC clearing
  - [ ] VIN retrieval
  - [ ] Polling/periodic data fetching
  - [ ] Voltage reading
  - [ ] Other: ******\_\_\_******

## Step 1: Update Imports

- [ ] Remove: `import { createOBDService, obdDataFunctions } from "../services/obdService"`
- [ ] Add: `import { useOBDEngine } from "../hooks/useOBDEngine"`
- [ ] Add type imports if needed: `import type { DiagnosticTroubleCode, ParsedPIDResult } from "../services/obd"`

## Step 2: Add Hook

- [ ] Add after `useBluetooth()` call:
  ```typescript
  const obdEngine = useOBDEngine(
    bluetoothContext.plxDevice,
    bluetoothContext.sendCommand,
    { autoInitialize: true }, // Remove if you want manual init
  );
  ```

## Step 3: Replace Operations

### Single PID Query

- [ ] Find: `obdDataFunctions.getEngineRPM(plxDevice, sendCommand)`
- [ ] Replace with: `obdEngine.queryPID("010C")`
- [ ] Update state assignment to use `.value`

**Other common PIDs**:

- [ ] Speed: `"010D"`
- [ ] Coolant Temp: `"0105"`
- [ ] Engine Load: `"0104"`
- [ ] Throttle: `"0111"`
- [ ] Fuel Level: `"012F"`
- [ ] Intake Temp: `"010F"`
- [ ] Manifold Pressure: `"010B"`
- [ ] Voltage: `"ATRV"`

### Batch Queries (when 3+ PIDs)

- [ ] Find multiple sequential PID calls
- [ ] Replace with single `queryMultiplePIDs()` call:
  ```typescript
  const results = await obdEngine.queryMultiplePIDs([
    "010C",
    "010D",
    "0105",
    "0104",
    "0111",
    "012F",
    "010F",
    "010B",
  ]);
  ```
- [ ] Extract individual results from returned object

### DTC Operations

- [ ] Find: `obdService.getDTCs()` → Replace: `obdEngine.getActiveDTCs()`
- [ ] Find: `obdService.clearDTCs()` → Replace: `obdEngine.clearDTCs()`
- [ ] Find: `obdService.getPendingDTCs()` → Replace: `obdEngine.getPendingDTCs()`

### VIN Retrieval

- [ ] Find: `obdService.getVIN()` → Replace: `obdEngine.getVIN()`

### Polling Setup

- [ ] Remove manual interval logic:

  ```typescript
  // REMOVE THIS:
  const [isPolling, setIsPolling] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const togglePolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    // ... etc
  };
  ```

- [ ] Replace with:
  ```typescript
  const togglePolling = () => {
    if (obdEngine.isPolling) {
      obdEngine.stopPolling();
    } else {
      obdEngine.startPolling(["010C", "010D", "0105"], 200);
    }
  };
  ```

### Cleanup (useEffect)

- [ ] Find manual cleanup code in useEffect return
- [ ] Remove: `clearInterval(pollIntervalRef.current)`
- [ ] Add if you have custom polling:
  ```typescript
  return () => {
    if (obdEngine.isPolling) {
      obdEngine.stopPolling();
    }
  };
  ```

## Step 4: Initialization Check

Before each operation that uses the engine:

- [ ] Add check:
  ```typescript
  if (!obdEngine.isInitialized) {
    await obdEngine.initialize();
  }
  ```

Or use the `autoInitialize` option in the hook (recommended).

## Step 5: Error Handling

- [ ] Replace try-catch blocks with new pattern:
  ```typescript
  const result = await obdEngine.queryPID("010C");
  if (!result) {
    console.error("Failed to query RPM:", obdEngine.lastError);
    // handle error
  }
  ```

## Step 6: Testing

- [ ] Does the screen mount without errors?
- [ ] Can you perform all OBD operations?
- [ ] Do values update correctly?
- [ ] Test with pull-to-refresh (if applicable)?
- [ ] Test with polling toggle (if applicable)?
- [ ] Test error cases:
  - [ ] Disconnect device mid-operation
  - [ ] Query when not connected
  - [ ] Cancel operation while pending

## Step 7: Cleanup

After all screens refactored:

- [ ] Run search: `grep -r "obdDataFunctions\|createOBDService" app/`
- [ ] Verify results are empty
- [ ] Delete: `app/services/obdService.ts`
- [ ] Update: `app/services/index.ts` if it exports from obdService
- [ ] Run build to verify no broken imports

## Verification

After refactoring, verify:

- [ ] No TypeScript errors: ✅ / ❌
- [ ] No console errors: ✅ / ❌
- [ ] All OBD operations work: ✅ / ❌
- [ ] Polling works (if applicable): ✅ / ❌
- [ ] Error handling works: ✅ / ❌
- [ ] Memory leaks fixed (no dangling intervals): ✅ / ❌

## Command Reference

### Query Single PID

```typescript
const result = await obdEngine.queryPID("010C");
if (result?.value) {
  console.log("RPM:", result.value);
}
```

### Query Multiple PIDs

```typescript
const results = await obdEngine.queryMultiplePIDs(["010C", "010D", "0105"]);
console.log("RPM:", results["010C"]?.value);
console.log("Speed:", results["010D"]?.value);
console.log("Temp:", results["0105"]?.value);
```

### Get DTCs

```typescript
const dtcs = await obdEngine.getActiveDTCs();
dtcs.forEach((dtc) => {
  console.log(`${dtc.code}: ${dtc.description} (${dtc.severity})`);
});
```

### Clear DTCs

```typescript
const success = await obdEngine.clearDTCs();
if (success) {
  console.log("Codes cleared");
}
```

### Get VIN

```typescript
const vin = await obdEngine.getVIN();
if (vin) {
  console.log("VIN:", vin);
}
```

### Start Polling

```typescript
const PIDs_TO_MONITOR = ["010C", "010D", "0105"]; // RPM, Speed, Temp
obdEngine.startPolling(PIDs_TO_MONITOR, 200); // 200ms between commands
```

### Stop Polling

```typescript
obdEngine.stopPolling();
```

### Check Queue Status

```typescript
const status = obdEngine.getQueueStatus();
console.log(`Queue length: ${status.length}, Busy: ${status.busy}`);
```

### Get Core PID List

```typescript
const pids = obdEngine.getCorePIDList();
console.log("Available PIDs:", pids);
```

## Common Mistakes to Avoid

- ❌ Creating multiple OBDEngine instances - **DO**: Use the hook (manages singleton)
- ❌ Not checking `isInitialized` before queries - **DO**: Initialize first
- ❌ Ignoring error state (`lastError`) - **DO**: Log and handle errors
- ❌ Not stopping polling on unmount - **DO**: Let hook handle cleanup
- ❌ Calling `sendCommand` directly - **DO**: Use OBDEngine methods
- ❌ Hardcoding PID codes - **DO**: Use constants from pidRegistry

## Need Help?

1. See `OBD_ENGINE_INTEGRATION.md` for detailed patterns
2. Check `LiveData.tsx` or `ScanDevices.tsx` for working examples
3. Review `app/hooks/useOBDEngine.ts` for full hook API
4. Check `app/services/obd/pidRegistry.ts` for available PIDs

---

**Signature**: Mark refactoring as complete when all checks pass:

Screen Name: ******\_\_\_\_******  
Date: ******\_\_\_\_******  
Tested By: ******\_\_\_\_******  
Status: ✅ Complete / 🔄 In Progress / ❌ Blocked
