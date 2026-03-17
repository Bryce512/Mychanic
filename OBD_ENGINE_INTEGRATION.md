/\*\*

- OBD Engine Integration Guide
- =============================
-
- This guide explains how to integrate the new OBD Engine (useOBDEngine hook)
- into your screens, replacing the old createOBDService() pattern.
-
- ## Architecture Pattern
-
- NEW (Current):
- Screen → useOBDEngine hook → OBD Engine → Command Queue → BLE sendCommand
- └─ Separation: UI → OBD Logic → Transport
-
- OLD (Deprecated):
- Screen → createOBDService() → obdService instance → direct BLE calls
- └─ Problem: No queue control, potential concurrent command crashes
-
- ## Step 1: Replace Imports
-
- BEFORE:
- ```typescript

  ```
- import { createOBDService, obdDataFunctions } from "../services/obdService";
- ```

  ```
-
- AFTER:
- ```typescript

  ```
- import { useOBDEngine } from "../hooks/useOBDEngine";
- // Import types you need
- import type { DiagnosticTroubleCode } from "../services/obd";
- ```

  ```
-
- ## Step 2: Initialize Hook
-
- BEFORE:
- ```typescript

  ```
- const handleScan = async () => {
- const obdService = createOBDService(plxDevice, sendCommand, logMessage);
- const dtcs = await obdService.getDTCs();
- };
- ```

  ```
-
- AFTER:
- ```typescript

  ```
- const { plxDevice, sendCommand } = useBluetooth();
- const obdEngine = useOBDEngine(plxDevice, sendCommand);
-
- const handleScan = async () => {
- if (!obdEngine.isInitialized) {
-     await obdEngine.initialize();
- }
- const dtcs = await obdEngine.getActiveDTCs();
- };
- ```

  ```
-
- ## Step 3: Replace Individual Function Calls
-
- ### RPM Query
- BEFORE:
- ```typescript

  ```
- const rpm = await obdDataFunctions.getEngineRPM(plxDevice, sendCommand);
- ```

  ```
-
- AFTER:
- ```typescript

  ```
- const result = await obdEngine.queryPID("010C");
- const rpm = result?.value;
- ```

  ```
-
- ### Speed Query
- BEFORE:
- ```typescript

  ```
- const speed = await obdDataFunctions.getVehicleSpeed(plxDevice, sendCommand);
- ```

  ```
-
- AFTER:
- ```typescript

  ```
- const result = await obdEngine.queryPID("010D");
- const speed = result?.value;
- ```

  ```
-
- ### Batch Query (Better for Multiple PIDs)
- BEFORE:
- ```typescript

  ```
- const rpm = await obdDataFunctions.getEngineRPM(plxDevice, sendCommand);
- const speed = await obdDataFunctions.getVehicleSpeed(plxDevice, sendCommand);
- const coolant = await obdDataFunctions.getCoolantTemperature(plxDevice, sendCommand);
- // ... 200ms delay between each call
- ```

  ```
-
- AFTER:
- ```typescript

  ```
- const results = await obdEngine.queryMultiplePIDs(["010C", "010D", "0105"]);
- const rpm = results["010C"]?.value;
- const speed = results["010D"]?.value;
- const coolant = results["0105"]?.value;
- // Queue handles spacing automatically
- ```

  ```
-
- ### DTC Scanning
- BEFORE:
- ```typescript

  ```
- const obdService = createOBDService(plxDevice, sendCommand, logMessage);
- const dtcs = await obdService.getDTCs();
- ```

  ```
-
- AFTER:
- ```typescript

  ```
- const dtcs = await obdEngine.getActiveDTCs();
- ```

  ```
-
- ### Clear DTCs
- BEFORE:
- ```typescript

  ```
- const obdService = createOBDService(plxDevice, sendCommand, logMessage);
- await obdService.clearDTCs();
- ```

  ```
-
- AFTER:
- ```typescript

  ```
- await obdEngine.clearDTCs();
- ```

  ```
-
- ### VIN Retrieval
- BEFORE:
- ```typescript

  ```
- const obdService = createOBDService(plxDevice, sendCommand, logMessage);
- const vin = await obdService.getVIN();
- ```

  ```
-
- AFTER:
- ```typescript

  ```
- const vin = await obdEngine.getVIN();
- ```

  ```
-
- ## Step 4: Use New Polling System
-
- BEFORE (Manual polling):
- ```typescript

  ```
- const [isPolling, setIsPolling] = useState(false);
- const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
-
- const togglePolling = () => {
- if (isPolling) {
-     clearInterval(pollIntervalRef.current!);
-     setIsPolling(false);
- } else {
-     pollIntervalRef.current = setInterval(() => {
-       fetchData();
-     }, 5000);
-     setIsPolling(true);
- }
- };
-
- useEffect(() => {
- return () => {
-     if (pollIntervalRef.current) {
-       clearInterval(pollIntervalRef.current);
-     }
- };
- }, []);
- ```

  ```
-
- AFTER (Engine-managed polling):
- ```typescript

  ```
- const togglePolling = () => {
- if (obdEngine.isPolling) {
-     obdEngine.stopPolling();
- } else {
-     obdEngine.startPolling(["010C", "010D", "0105"], 200);
- }
- };
-
- // Hook cleanup is automatic
- ```

  ```
-
- ## Step 5: Handle Errors Properly
-
- BEFORE:
- ```typescript

  ```
- try {
- const data = await obdDataFunctions.getEngineRPM(...);
- } catch (error) {
- console.error(error);
- }
- ```

  ```
-
- AFTER:
- ```typescript

  ```
- const result = await obdEngine.queryPID("010C");
- if (!result) {
- console.error("Failed to query RPM");
- // obdEngine.lastError contains the error message
- }
- ```

  ```
-
- ## Common PID Codes Reference
-
- | Data | PID Code | Formula |
- |------------------|----------|------------------------|
- | RPM | 010C | ((A \* 256) + B) / 4 |
- | Speed | 010D | A |
- | Coolant Temp | 0105 | A - 40 |
- | Engine Load | 0104 | (A \* 100) / 255 |
- | Throttle Pos | 0111 | (A \* 100) / 255 |
- | Fuel Level | 012F | (A \* 100) / 255 |
- | Intake Air Temp | 010F | A - 40 |
- | Manifold Press | 010B | A |
- | Battery Voltage | ATRV | (returned as string) |
-
- ## Complete Example: Refactoring a Simple Data Fetch
-
- BEFORE:
- ```typescript

  ```
- export default function MyScreen() {
- const { plxDevice, sendCommand, isConnected } = useBluetooth();
-
- const fetchRPM = async () => {
-     const rpm = await obdDataFunctions.getEngineRPM(plxDevice, sendCommand);
-     console.log("RPM:", rpm);
- };
-
- return (
-     <Button onPress={fetchRPM} title="Get RPM" />
- );
- }
- ```

  ```
-
- AFTER:
- ```typescript

  ```
- export default function MyScreen() {
- const { plxDevice, sendCommand, isConnected } = useBluetooth();
- const obdEngine = useOBDEngine(plxDevice, sendCommand);
-
- const fetchRPM = async () => {
-     if (!obdEngine.isInitialized) {
-       await obdEngine.initialize();
-     }
-     const result = await obdEngine.queryPID("010C");
-     console.log("RPM:", result?.value);
- };
-
- return (
-     <Button onPress={fetchRPM} title="Get RPM" />
- );
- }
- ```

  ```
-
- ## Hook Options
-
- ```typescript

  ```
- interface UseOBDEngineOptions {
- onLog?: (message: string) => void; // Logging callback
- autoInitialize?: boolean; // Auto-init on mount
- }
-
- const obdEngine = useOBDEngine(plxDevice, sendCommand, {
- autoInitialize: true,
- onLog: (msg) => console.log("[OBD]", msg),
- });
- ```

  ```
-
- ## Hook Return Value
-
- ```typescript

  ```
- interface UseOBDEngineReturn {
- engine: OBDEngine | null; // Raw engine instance
- isInitialized: boolean; // Initialization status
- isPolling: boolean; // Polling active
- lastError: string | null; // Last error message
-
- // Query methods
- queryPID: (pidCode: string) => Promise<ParsedPIDResult | null>;
- queryMultiplePIDs: (pidCodes: string[]) => Promise<TelemetryData>;
-
- // Polling
- startPolling: (pidCodes: string[], intervalMs?: number) => void;
- stopPolling: () => void;
-
- // Diagnostics
- getActiveDTCs: () => Promise<DiagnosticTroubleCode[]>;
- getPendingDTCs: () => Promise<DiagnosticTroubleCode[]>;
- clearDTCs: () => Promise<boolean>;
-
- // Vehicle info
- getVIN: () => Promise<string | null>;
- discoverSupportedPIDs: () => Promise<string[]>;
- getAdapterInfo: () => Promise<{...} | null>;
-
- // Utilities
- isResponsive: () => Promise<boolean>;
- reset: () => Promise<boolean>;
- getQueueStatus: () => { length: number; busy: boolean };
- getCorePIDList: () => string[];
-
- initialize: () => Promise<boolean>;
- setTransport: (sendCommand: (...) => Promise<string>) => void;
- }
- ```

  ```
-
- ## Screens That Have Been Refactored
-
- ✅ LiveData.tsx - Complete refactor
- ✅ ScanDevices.tsx - Complete refactor
-
- ## Screens That Need Refactoring
-
- - BluetoothContext.tsx (scanDeviceForVIN method)
- - AddVehicle.tsx (if it has OBD logic)
- - EditVehicleInfo.tsx (if it has OBD logic)
- - VehicleProfiles.tsx (if it has OBD logic)
-
- ## Benefits of the New Architecture
-
- 1.  **Queue Management**: All commands go through the command queue
- - Prevents concurrent command crashes on ELM327
- - Automatic spacing between commands
- - Retry logic for failed commands
-
- 2.  **Data-Driven PIDs**: PIDs defined in pidRegistry.ts
- - Easy to add new PIDs (just add to registry)
- - Formula evaluation is automatic
- - No hardcoded parsing per PID
-
- 3.  **Better UX**:
- - Batch querying reduces latency
- - Built-in polling eliminates manual interval management
- - Cleaner error handling
-
- 4.  **Maintainability**:
- - ~1400 lines modular code vs 800-line monolith
- - Clear separation of concerns
- - Industry-standard pattern (Torque Pro, OBD Fusion)
    \*/

// This file is documentation and not meant to be imported.
// See the examples above for integration patterns.
