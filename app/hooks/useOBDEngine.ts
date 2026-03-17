/**
 * useOBDEngine Hook
 * Clean interface for screens to interact with OBD Engine
 * Handles initialization and transport configuration automatically
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { Device } from "react-native-ble-plx";
import { OBDEngine, createOBDEngine } from "../services/obd";
import type {
  DiagnosticTroubleCode,
  ParsedPIDResult,
  TelemetryData,
} from "../services/obd";

export interface UseOBDEngineOptions {
  onLog?: (message: string) => void;
  autoInitialize?: boolean;
}

export interface UseOBDEngineReturn {
  // Engine instance
  engine: OBDEngine | null;

  // State
  isInitialized: boolean;
  isPolling: boolean;
  lastError: string | null;

  // Single PID query
  queryPID: (pidCode: string) => Promise<ParsedPIDResult | null>;

  // Batch query
  queryMultiplePIDs: (pidCodes: string[]) => Promise<TelemetryData>;

  // Batch query with incremental updates
  queryMultiplePIDsWithCallback: (
    pidCodes: string[],
    onEachComplete: (pidCode: string, result: ParsedPIDResult | null) => void,
  ) => Promise<TelemetryData>;

  // Real-time monitoring
  startPolling: (pidCodes: string[], intervalMs?: number) => void;
  stopPolling: () => void;

  // Diagnostics
  getActiveDTCs: () => Promise<DiagnosticTroubleCode[]>;
  getPendingDTCs: () => Promise<DiagnosticTroubleCode[]>;
  clearDTCs: () => Promise<boolean>;

  // Vehicle info
  getVIN: () => Promise<string | null>;
  discoverSupportedPIDs: () => Promise<string[]>;
  getAdapterInfo: () => Promise<{
    adapter: string;
    protocol: string;
    version: string;
  } | null>;

  // Utilities
  isResponsive: () => Promise<boolean>;
  reset: () => Promise<boolean>;
  getQueueStatus: () => { length: number; busy: boolean };
  getCorePIDList: () => string[];

  // Manual initialization
  initialize: () => Promise<boolean>;
  setTransport: (
    sendCommand: (command: string, timeout: number) => Promise<string>,
  ) => void;
}

/**
 * Main hook for OBD Engine integration
 */
export function useOBDEngine(
  bleDevice: Device | null,
  sendCommand:
    | ((
        device: Device,
        command: string,
        retries?: number,
        timeout?: number,
      ) => Promise<string>)
    | null,
  options?: UseOBDEngineOptions,
): UseOBDEngineReturn {
  const engineRef = useRef<OBDEngine | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const initializingRef = useRef(false); // Prevent concurrent initializations

  const onLog = useCallback(
    (msg: string) => {
      options?.onLog?.(msg) ?? console.log(msg);
    },
    [options?.onLog],
  );

  // Create engine instance (only once)
  useEffect(() => {
    if (!engineRef.current) {
      engineRef.current = createOBDEngine({ onLog });
    }
  }, [onLog]);

  // Configure transport when BLE device and sendCommand change
  const setTransportWithBLE = useCallback(() => {
    if (!engineRef.current || !bleDevice || !sendCommand) {
      onLog(
        `[setTransportWithBLE] ❌ Cannot set transport: engine=${!!engineRef.current}, device=${!!bleDevice}, command=${!!sendCommand}`,
      );
      return false;
    }

    onLog(`[setTransportWithBLE] ✅ Configuring BLE transport...`);

    // Create a wrapper that uses the BLE device
    engineRef.current.setTransport(async (command, timeout) => {
      try {
        return await sendCommand(bleDevice, command, 2, timeout);
      } catch (error) {
        throw error;
      }
    });

    return true;
  }, [bleDevice, sendCommand, onLog]);

  // Auto-initialize if configured
  useEffect(() => {
    if (!options?.autoInitialize || isInitialized || initializingRef.current) {
      return;
    }

    // Prevent concurrent initialization attempts
    initializingRef.current = true;

    const initialize = async () => {
      try {
        onLog(`[useOBDEngine] Starting auto-initialization...`);

        if (!setTransportWithBLE()) {
          onLog(
            `[useOBDEngine] ❌ Cannot set transport: BLE device=${!!bleDevice}, sendCommand=${!!sendCommand}`,
          );
          return;
        }

        onLog(
          `[useOBDEngine] ✅ Transport configured, initializing protocol...`,
        );

        const success = await engineRef.current?.initialize();
        if (success) {
          setIsInitialized(true);
          setLastError(null);
          onLog(`[useOBDEngine] ✅ Engine initialized successfully`);
        } else {
          setLastError("Failed to initialize OBD engine");
          onLog(`[useOBDEngine] ❌ Initialize returned false`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        setLastError(errorMsg);
        onLog(`❌ Initialization error: ${errorMsg}`);
      } finally {
        initializingRef.current = false;
      }
    };

    initialize();
  }, [options?.autoInitialize, isInitialized, setTransportWithBLE, onLog]);

  // ==== PUBLIC API ====

  const initialize = useCallback(async (): Promise<boolean> => {
    onLog(`[useOBDEngine.initialize] Starting manual initialization...`);

    if (!setTransportWithBLE()) {
      const msg = `BLE device=${!!bleDevice}, sendCommand=${!!sendCommand}`;
      setLastError(`BLE device or sendCommand not available: ${msg}`);
      onLog(`[useOBDEngine.initialize] ❌ Cannot set transport: ${msg}`);
      return false;
    }

    onLog(`[useOBDEngine.initialize] ✅ Transport configured`);

    try {
      const success = await engineRef.current?.initialize();
      if (success) {
        setIsInitialized(true);
        setLastError(null);
        onLog(`[useOBDEngine.initialize] ✅ Successfully initialized`);
      } else {
        setLastError("Failed to initialize OBD engine");
        onLog(`[useOBDEngine.initialize] ❌ Initialize returned false`);
      }
      return success ?? false;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setLastError(errorMsg);
      onLog(`[useOBDEngine.initialize] ❌ Error: ${errorMsg}`);
      return false;
    }
  }, [setTransportWithBLE, bleDevice, sendCommand, onLog]);

  const setTransport = useCallback(
    (newSendCommand: (command: string, timeout: number) => Promise<string>) => {
      if (!engineRef.current) {
        return;
      }
      engineRef.current.setTransport(newSendCommand);
    },
    [],
  );

  const queryPID = useCallback(
    async (pidCode: string): Promise<ParsedPIDResult | null> => {
      try {
        return (await engineRef.current?.queryPID(pidCode)) ?? null;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        setLastError(errorMsg);
        return null;
      }
    },
    [],
  );

  const queryMultiplePIDs = useCallback(
    async (pidCodes: string[]): Promise<TelemetryData> => {
      try {
        return (await engineRef.current?.queryMultiplePIDs(pidCodes)) ?? {};
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        setLastError(errorMsg);
        return {};
      }
    },
    [],
  );

  const queryMultiplePIDsWithCallback = useCallback(
    async (
      pidCodes: string[],
      onEachComplete: (pidCode: string, result: ParsedPIDResult | null) => void,
    ): Promise<TelemetryData> => {
      try {
        return (
          (await engineRef.current?.queryMultiplePIDs(
            pidCodes,
            onEachComplete,
          )) ?? {}
        );
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        setLastError(errorMsg);
        return {};
      }
    },
    [],
  );

  const startPollingInternal = useCallback(
    (pidCodes: string[], intervalMs = 200) => {
      try {
        engineRef.current?.startPolling(pidCodes, intervalMs);
        setIsPolling(true);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        setLastError(errorMsg);
      }
    },
    [],
  );

  const stopPollingInternal = useCallback(() => {
    engineRef.current?.stopPolling();
    setIsPolling(false);
  }, []);

  const getActiveDTCsInternal = useCallback(async (): Promise<
    DiagnosticTroubleCode[]
  > => {
    try {
      return (await engineRef.current?.getActiveDTCs()) ?? [];
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setLastError(errorMsg);
      return [];
    }
  }, []);

  const getPendingDTCsInternal = useCallback(async (): Promise<
    DiagnosticTroubleCode[]
  > => {
    try {
      return (await engineRef.current?.getPendingDTCs()) ?? [];
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setLastError(errorMsg);
      return [];
    }
  }, []);

  const clearDTCsInternal = useCallback(async (): Promise<boolean> => {
    try {
      return (await engineRef.current?.clearDTCs()) ?? false;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setLastError(errorMsg);
      return false;
    }
  }, []);

  const getVINInternal = useCallback(async (): Promise<string | null> => {
    try {
      return (await engineRef.current?.getVIN()) ?? null;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setLastError(errorMsg);
      return null;
    }
  }, []);

  const discoverSupportedPIDsInternal = useCallback(async (): Promise<
    string[]
  > => {
    try {
      return (await engineRef.current?.discoverSupportedPIDs()) ?? [];
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setLastError(errorMsg);
      return [];
    }
  }, []);

  const getAdapterInfoInternal = useCallback(async (): Promise<{
    adapter: string;
    protocol: string;
    version: string;
  } | null> => {
    try {
      return (await engineRef.current?.getAdapterInfo()) ?? null;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setLastError(errorMsg);
      return null;
    }
  }, []);

  const isResponsiveInternal = useCallback(async (): Promise<boolean> => {
    try {
      return (await engineRef.current?.isResponsive()) ?? false;
    } catch (error) {
      return false;
    }
  }, []);

  const resetInternal = useCallback(async (): Promise<boolean> => {
    try {
      const success = await engineRef.current?.reset();
      if (success) {
        setIsInitialized(false);
      }
      return success ?? false;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setLastError(errorMsg);
      return false;
    }
  }, []);

  const getQueueStatusInternal = useCallback((): {
    length: number;
    busy: boolean;
  } => {
    return engineRef.current?.getQueueStatus() ?? { length: 0, busy: false };
  }, []);

  const getCorePIDListInternal = useCallback((): string[] => {
    return engineRef.current?.getCorePIDList() ?? [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isPolling) {
        engineRef.current?.stopPolling();
      }
    };
  }, [isPolling]);

  return {
    engine: engineRef.current,
    isInitialized,
    isPolling,
    lastError,

    // Methods
    queryPID,
    queryMultiplePIDs,
    queryMultiplePIDsWithCallback,
    startPolling: startPollingInternal,
    stopPolling: stopPollingInternal,
    getActiveDTCs: getActiveDTCsInternal,
    getPendingDTCs: getPendingDTCsInternal,
    clearDTCs: clearDTCsInternal,
    getVIN: getVINInternal,
    discoverSupportedPIDs: discoverSupportedPIDsInternal,
    getAdapterInfo: getAdapterInfoInternal,
    isResponsive: isResponsiveInternal,
    reset: resetInternal,
    getQueueStatus: getQueueStatusInternal,
    getCorePIDList: getCorePIDListInternal,
    initialize,
    setTransport,
  };
}

/**
 * Helper hook for VIN scanning during vehicle setup
 * Includes NHTSA API decoding for vehicle year/make/model
 */
export interface VINScanResult {
  vin?: string;
  year?: string;
  make?: string;
  model?: string;
}

export function useVINScanning(
  bleDevice: Device | null,
  sendCommand:
    | ((
        device: Device,
        command: string,
        retries?: number,
        timeout?: number,
      ) => Promise<string>)
    | null,
) {
  // Disable autoInitialize - we'll initialize manually when device is connected
  const obd = useOBDEngine(bleDevice, sendCommand, { autoInitialize: false });
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scanVIN = useCallback(async (): Promise<VINScanResult | null> => {
    setIsScanning(true);
    setError(null);

    try {
      // Check if we have the necessary parameters
      if (!bleDevice) {
        const msg = "❌ No BLE device available";
        console.log("[useVINScanning]", msg);
        setError(msg);
        return null;
      }

      if (!sendCommand) {
        const msg = "❌ No sendCommand function available";
        console.log("[useVINScanning]", msg);
        setError(msg);
        return null;
      }

      console.log("[useVINScanning] Starting VIN scan...");

      // Ensure transport is configured (might not be in autoInitialize yet)
      if (!obd.isInitialized) {
        console.log(
          "[useVINScanning] Engine not initialized, attempting initialization...",
        );
        const initSuccess = await obd.initialize();
        if (!initSuccess) {
          const msg = `❌ Failed to initialize OBD engine: ${obd.lastError || "Unknown error"}`;
          console.log("[useVINScanning]", msg);
          setError(msg);
          return null;
        }
      }

      console.log("[useVINScanning] Engine initialized, fetching VIN...");
      const vinFromOBD = await obd.getVIN();

      if (!vinFromOBD) {
        const msg = "[useVINScanning] VIN not available from OBD-II device";
        console.log(msg);
        setError("VIN not available");
        return null;
      }

      console.log("[useVINScanning] VIN retrieved:", vinFromOBD);

      // Decode VIN using NHTSA API
      const response = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vinFromOBD}?format=json`,
      );
      const data = await response.json();

      const vehicleInfo: VINScanResult = {
        vin: vinFromOBD,
      };

      if (data.Results && data.Results.length > 0) {
        data.Results.forEach((result: any) => {
          switch (result.Variable) {
            case "Model Year":
              if (result.Value && result.Value !== "Not Applicable") {
                vehicleInfo.year = result.Value;
              }
              break;
            case "Make":
              if (result.Value && result.Value !== "Not Applicable") {
                vehicleInfo.make = result.Value;
              }
              break;
            case "Model":
              if (result.Value && result.Value !== "Not Applicable") {
                vehicleInfo.model = result.Value;
              }
              break;
          }
        });
      }

      console.log(
        "[useVINScanning] Vehicle decoded:",
        vehicleInfo.year,
        vehicleInfo.make,
        vehicleInfo.model,
      );

      return vehicleInfo;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("[useVINScanning] Error:", errorMsg);
      setError(errorMsg);
      return null;
    } finally {
      setIsScanning(false);
    }
  }, [obd, bleDevice, sendCommand]);

  return { scanVIN, isScanning, error: error || obd.lastError };
}

/**
 * Helper hook for diagnostic scanning
 */
export function useDiagnosticScanning(
  bleDevice: Device | null,
  sendCommand:
    | ((
        device: Device,
        command: string,
        retries?: number,
        timeout?: number,
      ) => Promise<string>)
    | null,
) {
  const obd = useOBDEngine(bleDevice, sendCommand);
  const [dtcs, setDTCs] = useState<DiagnosticTroubleCode[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  const scanDTCs = useCallback(async () => {
    setIsScanning(true);
    try {
      await obd.initialize();
      const codes = await obd.getActiveDTCs();
      setDTCs(codes);
      return codes;
    } finally {
      setIsScanning(false);
    }
  }, [obd]);

  const clearDiagnostics = useCallback(async () => {
    return obd.clearDTCs();
  }, [obd]);

  return {
    dtcs,
    isScanning,
    error: obd.lastError,
    scanDTCs,
    clearDiagnostics,
  };
}
