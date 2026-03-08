import { Alert } from "react-native";
import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useBleConnection } from "../services/bleConnections";
import { AppState } from "react-native";
import { Device } from "react-native-ble-plx";
import { obdDataFunctions } from "../services/obdService";

// Define the shape of our context
interface BluetoothContextType {
  isScanning: boolean;
  isConnected: boolean;
  deviceId: string | null;
  deviceName: string | null;
  discoveredDevices: any[];
  plxDevice: Device | null; // Assuming plxDevice is a Device type, adjust as needed
  voltage: string | null; // Assuming voltage is a number, adjust type as needed
  rpm: number | null;
  speed: number | null;
  setDiscoveredDevices: (devices: any[]) => void;
  showDeviceSelector: boolean;
  setShowDeviceSelector: (show: boolean) => void;
  startScan: () => Promise<void>;
  connectToDevice: (device: any, vehicleId?: string) => Promise<boolean>;
  disconnectDevice: () => Promise<void>;
  sendCommand: (
    device: any,
    command: string,
    retries?: number,
    customTimeoutMs?: number
  ) => Promise<string>;
  showAllDevices: () => Promise<void>;
  rememberedDevice: any | null;
  verifyConnection: (deviceId: string) => Promise<boolean>;
  connectToRememberedDevice: () => Promise<boolean>;
  logMessage: (message: string) => void;
  robustReconnect: () => Promise<boolean>;
  reconnectAttempt: number;
  enhancedVerifyConnection: (deviceId: string) => Promise<boolean>;
  fetchVoltage: () => Promise<string | null>;
  fetchRPM: () => Promise<number | null>;
}

// Create the context
const BluetoothContext = createContext<BluetoothContextType | undefined>(
  undefined
);

// Provider component
export const BluetoothProvider = ({ children }: { children: ReactNode }) => {
  // Get base BLE functionality from the hook
  const bleConnectionHook = useBleConnection();

  // State variables managed at the context level
  const [voltage, setVoltage] = useState<string | null>(null);
  const [rpm, setRPM] = useState<number | null>(null);
  const [speed, setSpeed] = useState<number | null>(null);

  // Maintain context-level state that persists across screens
  const [isConnected, setIsConnected] = useState(bleConnectionHook.isConnected);
  const [isScanning, setIsScanning] = useState(bleConnectionHook.isScanning);
  const [lastSuccessfulCommandTime, setLastSuccessfulCommandTime] = useState(
    bleConnectionHook.lastSuccessfulCommandTime
  );
  const [deviceId, setDeviceId] = useState<string | null>(
    bleConnectionHook.deviceId
  );
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [discoveredDevices, setDiscoveredDevices] = useState<any[]>(
    bleConnectionHook.discoveredDevices
  );
  const [showDeviceSelector, setShowDeviceSelector] = useState(
    bleConnectionHook.showDeviceSelector
  );
  const [rememberedDevice, setRememberedDevice] = useState(
    bleConnectionHook.rememberedDevice
  );
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const logMessage = bleConnectionHook.logMessage;
  const showAllDevices = bleConnectionHook.showAllDevices;
  const sendCommand = bleConnectionHook.sendCommand;

  // Reference to hook's log to track changes

  // Sync hook state to context state
  useEffect(() => {
    setIsConnected(bleConnectionHook.isConnected);
    setDeviceId(bleConnectionHook.deviceId);
    setDiscoveredDevices(bleConnectionHook.discoveredDevices);
    setShowDeviceSelector(bleConnectionHook.showDeviceSelector);
    setRememberedDevice(bleConnectionHook.rememberedDevice);
    setVoltage(bleConnectionHook.voltage); // Add this line
  }, [
    bleConnectionHook.isConnected,
    bleConnectionHook.deviceId,
    bleConnectionHook.discoveredDevices,
    bleConnectionHook.showDeviceSelector,
    bleConnectionHook.rememberedDevice,
    bleConnectionHook.voltage,
    bleConnectionHook.lastSuccessfulCommandTime,
  ]);

  // Monitor app state for background/foreground transitions - DISABLED to prevent auto-reconnects
  // useEffect(() => {
  //   const subscription = AppState.addEventListener("change", (nextAppState) => {
  //     if (nextAppState === "active") {
  //       verifyAndReconnectIfNeeded();
  //     }
  //   });

  //   return () => subscription.remove();
  // }, [deviceId, isConnected]);

  // Verify connection periodically - DISABLED to prevent auto-reconnects
  // useEffect(() => {
  //   if (isConnected && deviceId) {
  //     const interval = setInterval(async () => {
  //       const stillConnected = await verifyConnection(deviceId);
  //       if (!stillConnected && rememberedDevice) {
  //         logMessage("Connection lost, attempting reconnection from context");
  //         connectToRememberedDevice();
  //       }
  //     }, 30000);

  //     return () => clearInterval(interval);
  //   }
  // }, [isConnected, deviceId, rememberedDevice]);

  // Enhanced version of verifyConnection that updates context state
  const verifyConnection = async (deviceId: string): Promise<boolean> => {
    try {
      const isStillConnected = await bleConnectionHook.verifyConnection(
        deviceId
      );
      setIsConnected(isStillConnected);
      return isStillConnected;
    } catch (error) {
      setIsConnected(false);
      return false;
    }
  };

  // Verify and reconnect if needed
  const verifyAndReconnectIfNeeded = async () => {
    if (isConnected && deviceId) {
      logMessage("Verifying connection after app state change...");
      const stillConnected = await verifyConnection(deviceId);

      if (!stillConnected && rememberedDevice) {
        logMessage("Connection lost, attempting reconnection from context");
        try {
          await connectToRememberedDevice();
        } catch (error) {
          console.error("Reconnection failed:", error);
        }
      }
    }
  };

  // Enhanced connect function that updates context state
  // Accept vehicleId for alert logic
  const connectToDevice = async (
    device: any,
    vehicleId?: string
  ): Promise<boolean> => {
    try {
      // Add defensive logging to debug device object
      logMessage(`Attempting to connect to device: ${JSON.stringify(device)}`);
      logMessage(
        `Device ID: ${device?.id}, Device Name: ${
          device?.name || "Unnamed Device"
        }`
      );

      // Validate device object
      if (!device || !device.id) {
        logMessage("❌ Invalid device object - missing ID");
        return false;
      }

      logMessage(`Connecting to ${device.name || "Unnamed Device"}...`);
      const success = await bleConnectionHook.connectToDevice(device);

      if (success) {
        setIsConnected(true);
        setDeviceId(device.id);
        setDeviceName(device.name);
        setRememberedDevice(device);

        // 2-week mileage alert logic
        if (vehicleId) {
          try {
            const user =
              require("../services/firebaseService").default.getCurrentUser();
            if (user) {
              const diag =
                await require("../services/firebaseService").default.getVehicleById(
                  user.uid,
                  vehicleId
                );
              const lastMileageUpdate = diag?.lastMileageUpdate;
              if (
                !lastMileageUpdate ||
                Date.now() - lastMileageUpdate > 14 * 24 * 60 * 60 * 1000
              ) {
                Alert.alert(
                  "Mileage Update Needed",
                  "It's been over 2 weeks since you last updated your vehicle's mileage. Please update it now.",
                  [{ text: "OK" }]
                );
              }
            }
          } catch (e) {
            let msg =
              typeof e === "object" && e && "message" in e
                ? (e as any).message
                : String(e);
            logMessage("Could not check last mileage update: " + msg);
          }
        }
      }

      return success;
    } catch (error) {
      logMessage(
        `Connection error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  };

  // Enhanced reconnect function that updates context state
  const connectToRememberedDevice = async (): Promise<boolean> => {
    try {
      setReconnectAttempt((prev) => prev + 1);
      const success = await bleConnectionHook.connectToRememberedDevice();

      if (success && rememberedDevice) {
        setIsConnected(true);
        setDeviceId(rememberedDevice.id);
        setDeviceName(rememberedDevice.name);
      }

      return success;
    } catch (error) {
      logMessage(
        `Reconnection error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  };

  // Enhanced disconnect function
  const disconnectDevice = async (): Promise<void> => {
    try {
      await bleConnectionHook.disconnectDevice();
      setIsConnected(false);
      setDeviceId(null);
    } catch (error) {
      logMessage(
        `Disconnect error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  // Enhanced scan function
  const startScan = async (): Promise<void> => {
    try {
      await bleConnectionHook.startScan();
    } catch (error) {
      logMessage(
        `Scan error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  // Enhanced reconnect function with robustness
  const robustReconnect = async (): Promise<boolean> => {
    try {
      setReconnectAttempt((prev) => prev + 1);

      // First try normal reconnect
      let success = await connectToRememberedDevice();

      // If failed, try additional methods
      if (!success && rememberedDevice) {
        // Try with enhanced verification
        logMessage(
          "First attempt failed, trying with enhanced verification..."
        );
        const enhancedVerified = await enhancedVerifyConnection(
          rememberedDevice.id
        );

        if (enhancedVerified) {
          setIsConnected(true);
          setDeviceId(rememberedDevice.id);
          return true;
        }
      }

      return success;
    } catch (error) {
      logMessage(
        `Robust reconnect error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  };

  // Enhanced verification with additional checks
  const enhancedVerifyConnection = async (
    deviceId: string
  ): Promise<boolean> => {
    try {
      // First try standard verification
      const basicVerified = await verifyConnection(deviceId);
      if (basicVerified) return true;

      // Additional verification logic can be added here
      // For example, trying to read a characteristic
      logMessage("Running enhanced verification steps...");

      return false; // Default to false until implemented
    } catch (error) {
      return false;
    }
  };

  // Create wrapper functions that update state after calling service functions
  const fetchVoltage = async (): Promise<string | null> => {
    const voltageValue = await obdDataFunctions.fetchVoltage(
      bleConnectionHook.plxDevice,
      bleConnectionHook.sendCommand,
      bleConnectionHook.logMessage
    );

    if (voltageValue) {
      setVoltage(voltageValue);
    }

    return voltageValue;
  };

  const fetchRPM = async (): Promise<number | null> => {
    const rpmValue = await obdDataFunctions.fetchRPM(
      bleConnectionHook.plxDevice,
      bleConnectionHook.sendCommand,
      bleConnectionHook.logMessage
    );

    if (rpmValue !== null) {
      setRPM(rpmValue);
    }

    return rpmValue;
  };

  // Add to context value
  const contextValue = {
    // Context-managed state
    voltage,
    rpm,
    speed,
    isScanning,
    isConnected,
    deviceId,
    deviceName,
    discoveredDevices,
    showDeviceSelector,
    rememberedDevice,
    reconnectAttempt,
    lastSuccessfulCommandTime,
    plxDevice: bleConnectionHook.plxDevice, // Assuming plxDevice is part of the hook

    // Enhanced functions with context state management
    setDiscoveredDevices,
    sendCommand,
    setShowDeviceSelector,
    showAllDevices,
    startScan,
    connectToDevice,
    disconnectDevice: disconnectDevice,
    connectToRememberedDevice,
    verifyConnection,
    logMessage,
    robustReconnect,
    enhancedVerifyConnection,
    // Pass through other hook functions
    fetchVoltage,
    fetchRPM,
  };

  return (
    <BluetoothContext.Provider value={contextValue as BluetoothContextType}>
      {children}
    </BluetoothContext.Provider>
  );
};

export const useBluetooth = () => {
  const context = useContext(BluetoothContext);

  if (context === undefined) {
    throw new Error("useBluetooth must be used within a BluetoothProvider");
  }

  return context;
};
