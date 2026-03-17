/\*\*

- OBD Engine Integration Guide
- Shows how to use the production-grade OBD system with your React Native app
-
- Architecture (industry-standard):
- ```

  ```
- BLE Transport (bleConnections.ts)
-     ↓
- OBD Engine (obdEngine.ts) - Orchestrator
-     ├── Command Queue (commandQueue.ts) - single-threaded execution
-     ├── ELM327 Protocol (elm327Protocol.ts) - adapter management
-     ├── PID Parser (pidParser.ts) - data extraction
-     ├── DTC Parser (dtcParser.ts) - diagnostic codes
-     └── ISO-TP Handler (isoTpFrames.ts) - multi-frame assembly
- ```
  */
  ```

import { Device } from "react-native-ble-plx";
import { OBDEngine, createOBDEngine } from "./obdEngine";

/\*\*

- Example 1: Basic Integration with BLE
-
- This shows how to connect the OBD Engine to your existing BLE connection
  \*/
  export class OBDIntegration {
  private obdEngine: OBDEngine;
  private bleDevice: Device | null = null;

constructor() {
// Initialize OBD Engine with logging
this.obdEngine = createOBDEngine({
onLog: this.handleLog,
autoInitialize: false,
});
}

/\*\*

- Connect OBD Engine to BLE device
- Call this after BLE connection is established
  \*/
  async setupWithBLEDevice(
  device: Device,
  sendCommand: (
  device: Device,
  command: string,
  retries?: number,
  timeout?: number,
  ) => Promise<string>,
  ): Promise<boolean> {
  this.bleDevice = device;


    // Configure transport layer
    this.obdEngine.setTransport(async (command, timeout) => {
      return sendCommand(device, command, 2, timeout);
    });

    // Initialize OBD connection
    const initialized = await this.obdEngine.initialize();

    if (initialized) {
      console.log("✅ OBD Engine ready");
      return true;
    }

    return false;

}

/\*\*

- Query a single PID
  \*/
  async queryRPM() {
  const result = await this.obdEngine.queryPID("010C");
  if (result) {
  console.log(`RPM: ${result.value} ${result.unit}`);
  }
  return result;
  }

/\*\*

- Query core diagnostic data (typical use case)
  \*/
  async getDiagnosticSnapshot() {
  const pidCodes = [
  "010C", // RPM
  "010D", // Speed
  "0105", // Coolant Temp
  "0104", // Engine Load
  "0111", // Throttle Position
  "012F", // Fuel Level
  ];


    const data = await this.obdEngine.queryMultiplePIDs(pidCodes);
    return data;

}

/\*\*

- Get all active diagnostic trouble codes
  \*/
  async getActiveDiagnostics() {
  return this.obdEngine.getActiveDTCs();
  }

/\*\*

- Get Vehicle ID
  \*/
  async getVehicleID() {
  return this.obdEngine.getVIN();
  }

/\*\*

- Start real-time sensor monitoring
- Polls core PIDs every 200ms
  \*/
  startRealtimeMonitoring() {
  const corePIDs = this.obdEngine.getCorePIDList();
  this.obdEngine.startPolling(corePIDs, 200);
  }

/\*\*

- Stop monitoring
  \*/
  stopRealtimeMonitoring() {
  this.obdEngine.stopPolling();
  }

/\*\*

- Check if still connected
  \*/
  async isHealthy(): Promise<boolean> {
  return this.obdEngine.isResponsive();
  }

/\*\*

- Handle disconnection
  \*/
  async handleDisconnection() {
  await this.obdEngine.handleConnectionLoss();
  }

private handleLog = (message: string) => {
console.log(`[OBD] ${message}`);
};
}

/\*\*

- Example 2: React Hook for OBD Integration
-
- Use this pattern to integrate OBD into your screens
  \*/
  export function useOBDEngine() {
  const [engine] = React.useState(() => createOBDEngine());
  const [telemetry, setTelemetry] = React.useState<Record<string, any>>({});
  const [dtcs, setDTCs] = React.useState<any[]>([]);
  const [isPolling, setIsPolling] = React.useState(false);

/\*\*

- Setup with BLE device
  \*/
  const setupWithDevice = React.useCallback(
  async (device: Device, sendCommand: any) => {
  engine.setTransport(async (command, timeout) => {
  return sendCommand(device, command, 2, timeout);
  });

      const success = await engine.initialize();
      return success;

  },
  [engine],
  );

/\*\*

- Query single PID
  \*/
  const queryPID = React.useCallback(
  async (pidCode: string) => {
  return engine.queryPID(pidCode);
  },
  [engine],
  );

/\*\*

- Start polling
  \*/
  const startPolling = React.useCallback(() => {
  const corePIDs = engine.getCorePIDList();
  engine.startPolling(corePIDs, 200);
  setIsPolling(true);
  }, [engine]);

/\*\*

- Stop polling
  \*/
  const stopPolling = React.useCallback(() => {
  engine.stopPolling();
  setIsPolling(false);
  }, [engine]);

/\*\*

- Get diagnostics
  \*/
  const getDiagnostics = React.useCallback(async () => {
  const activeDTCs = await engine.getActiveDTCs();
  setDTCs(activeDTCs);
  return activeDTCs;
  }, [engine]);

return {
engine,
telemetry,
dtcs,
isPolling,
setupWithDevice,
queryPID,
startPolling,
stopPolling,
getDiagnostics,
};
}

/\*\*

- Example 3: Screen Integration
-
- Shows how to use OBD Engine in a diagnostic screen
  \*/
  export const OBDDiagnosticScreenExample = () => {
  const { plxDevice, sendCommand } = useBluetoothContext(); // Your existing context
  const obd = useOBDEngine();
  const [rpData, setRPMData] = React.useState<any>(null);
  const [isInitialized, setIsInitialized] = React.useState(false);

// Initialize on mount
React.useEffect(() => {
if (plxDevice && !isInitialized) {
const init = async () => {
const success = await obd.setupWithDevice(plxDevice, sendCommand);
setIsInitialized(success);

        if (success) {
          // Get VIN
          const vin = await obd.engine.getVIN();
          console.log("VIN:", vin);

          // Get adapter info
          const adapterInfo = await obd.engine.getAdapterInfo();
          console.log("Adapter:", adapterInfo);
        }
      };

      init();
    }

}, [plxDevice, isInitialized, obd, sendCommand]);

// Query RPM on button press
const handleQueryRPM = async () => {
const result = await obd.queryPID("010C");
setRPMData(result);
};

// Start real-time monitoring
const handleStartMonitoring = () => {
obd.startPolling();
};

// Get diagnostics
const handleGetDiagnostics = async () => {
const diagnostics = await obd.getDiagnostics();
console.log("Active DTCs:", diagnostics);
};

return (
<View>
<Text>OBD Diagnostic Screen</Text>

      {isInitialized && <Text>✅ OBD Initialized</Text>}

      {rpData && (
        <Text>
          RPM: {rpData.value} {rpData.unit}
        </Text>
      )}

      <Pressable onPress={handleQueryRPM}>
        <Text>Query RPM</Text>
      </Pressable>

      <Pressable onPress={handleStartMonitoring}>
        <Text>{obd.isPolling ? "Stop Monitoring" : "Start Monitoring"}</Text>
      </Pressable>

      <Pressable onPress={handleGetDiagnostics}>
        <Text>Get Diagnostics</Text>
      </Pressable>
    </View>

);
};

/\*\*

- Example 4: Advanced - Custom PID Polling
-
- Shows how to poll specific PIDs for a custom dashboard
  \*/
  export async function createCustomDashboard(obdEngine: OBDEngine) {
  // Engine performance PIDs
  const performancePIDs = [
  "010C", // RPM
  "010D", // Speed
  "0104", // Engine Load
  "0111", // Throttle
  "0110", // MAF
  ];

// Emissions PIDs
const emissionsPIDs = [
"0106", // ST Fuel Trim Bank 1
"0107", // LT Fuel Trim Bank 1
"0113", // O2 Sensor 1
"0115", // O2 Sensor 2
];

// Query all
const [performanceData, emissionsData] = await Promise.all([
obdEngine.queryMultiplePIDs(performancePIDs),
obdEngine.queryMultiplePIDs(emissionsPIDs),
]);

return {
performance: performanceData,
emissions: emissionsData,
};
}

/\*\*

- Example 5: Error Handling Pattern
  \*/
  export class OBDServiceWithErrorHandling {
  private engine: OBDEngine;

constructor() {
this.engine = createOBDEngine();
}

async safeQueryPID(pidCode: string): Promise<number | null> {
try {
// Check if device is still responsive
const isResponsive = await this.engine.isResponsive();
if (!isResponsive) {
console.error("Device not responsive");
return null;
}

      // Try to query PID
      const result = await this.engine.queryPID(pidCode);

      if (!result) {
        console.warn(`PID ${pidCode} not supported or no data`);
        return null;
      }

      // Validate value
      if (!result.valid) {
        console.warn(`Invalid value for ${pidCode}: ${result.value}`);
        return null;
      }

      return result.value;
    } catch (error) {
      // Handle specific errors
      if (error instanceof Error) {
        if (error.message.includes("Timeout")) {
          // Retry with longer timeout
          return null;
        }

        if (error.message.includes("Transport not configured")) {
          // Need to initialize
          return null;
        }
      }

      console.error("Query error:", error);
      return null;
    }

}

async safeGetDTCs() {
try {
const dtcs = await this.engine.getActiveDTCs();

      // Filter by severity
      const critical = dtcs.filter((dtc) => dtc.severity === "critical");
      const warnings = dtcs.filter((dtc) => dtc.severity === "warning");

      return { total: dtcs.length, critical, warnings };
    } catch (error) {
      console.error("DTC fetch error:", error);
      return { total: 0, critical: [], warnings: [] };
    }

}
}

/\*\*

- Summary
-
- The OBD Engine provides:
-
- ✅ Single-threaded command queue (prevents adapter crashes)
- ✅ Data-driven PID registry (easy to extend with custom PIDs)
- ✅ Dynamic formula evaluation (no hardcoded parsing)
- ✅ Comprehensive DTC database (~150 common codes)
- ✅ ELM327 protocol management (initialization, discovery)
- ✅ ISO-TP frame assembly (multi-frame responses)
- ✅ Polling/streaming support (real-time sensor data)
- ✅ Error handling & retries (adapter reliability)
-
- Total code: ~800 lines (mirrors production apps)
-
- The architecture is flexible:
- - Swap BLE for WiFi/serial without changing OBD logic
- - Add custom PIDs to registry
- - Extend DTC database
- - Customize polling rates
    \*/

// NOTE: Add 'import React from "react"' and imports as needed for your app
