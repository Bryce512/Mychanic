import { useState, useEffect, useRef } from "react";
import {
  PermissionsAndroid,
  Platform,
} from "react-native";
import { BleManager as BlePlxManager, Device, State, Subscription } from "react-native-ble-plx";
import base64 from "react-native-base64";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Buffer } from "buffer";

// Constants
const SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb";
const WRITE_UUID = "0000fff2-0000-1000-8000-00805f9b34fb";
const READ_UUID = "0000fff1-0000-1000-8000-00805f9b34fb";
const REMEMBERED_DEVICE_KEY = "@MychanicApp:rememberedDevice";

// Single BLE manager instance for the entire app
const bleManager = new BlePlxManager();

// Types
export interface BluetoothDevice {
  id: string;
  name: string | null;
  rssi: number;
  isConnectable?: boolean;
}

// Pure utility functions (not dependent on hook state)
export const stringToBytes = (str: string): number[] => {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i));
  }
  return bytes;
};

export const base64ToBytes = (b64: string): number[] => {
  try {
    const decoded = base64.decode(b64);
    const bytes = [];
    for (let i = 0; i < decoded.length; i++) {
      bytes.push(decoded.charCodeAt(i));
    }
    return bytes;
  } catch (error) {
    console.log(
      `Error converting base64 to bytes: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    return [];
  }
};

// Main BLE hook
export const useBleConnection = (options?: {
  onConnectionChange?: (connected: boolean, id: string | null) => void;
  onLogMessage?: (message: string) => void;
}) => {
  // State variables
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [voltage, setVoltage] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoadingRemembered, setIsLoadingRemembered] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<BluetoothDevice[]>([]);
  const lastSuccessfulCommandTime = useRef<number | null>(null);
  const [rememberedDevice, setRememberedDevice] = useState<BluetoothDevice | null>(null);
  const [plxDevice, setPlxDevice] = useState<Device | null>(null);

  // Characteristic UUIDs
  const [writeServiceUUID, setWriteServiceUUID] = useState<string>(SERVICE_UUID);
  const [writeCharUUID, setWriteCharUUID] = useState<string>(
    "0000fff2-0000-1000-8000-00805f9b34fb"
  );
  const [readCharUUID, setReadCharUUID] = useState<string>(
    "0000fff1-0000-1000-8000-00805f9b34fb"
  );

  const connectionLockTime = useRef<number | null>(null);
  const stateSubscription = useRef<Subscription | null>(null);
  const disconnectSubscription = useRef<Subscription | null>(null);

  useEffect(() => {
    if (isInitialized) {
      logMessage("[BLE] Already initialized, skipping");
      return;
    }

    logMessage("[BLE] useEffect mount: initializing BLE and loading remembered device");

    const initialize = async () => {
      try {
        await initializeBLE();
        setIsInitialized(true);
      } catch (error) {
        logMessage(
          `❌ Initialization failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    };

    initialize();

    return () => {
      logMessage("🧹 Cleaning up BLE subscriptions");
      stateSubscription.current?.remove();
      disconnectSubscription.current?.remove();
      bleManager.stopDeviceScan();
    };
  }, []);

  // Helper functions
  const logMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setLog((prev) => [...prev, logEntry]);
    console.log(logEntry);

    if (options?.onLogMessage) {
      options.onLogMessage(logEntry);
    }
  };

  const isLocked = () => {
    if (connectionLockTime.current === null) return false;
    const now = Date.now();
    const lockExpired = now - connectionLockTime.current > 15000;

    if (lockExpired) {
      logMessage("🔓 Connection lock expired automatically - clearing stale lock");
      connectionLockTime.current = null;
      return false;
    }
    return true;
  };

  const forceClearLock = () => {
    if (connectionLockTime.current !== null) {
      logMessage("🔓 Forcibly clearing connection lock");
      connectionLockTime.current = null;
    }
  };

  const setLock = () => {
    connectionLockTime.current = Date.now();
  };

  const releaseLock = () => {
    connectionLockTime.current = null;
    logMessage("🔓 Releasing connection lock");
  };

  const initializeBLE = async () => {
    logMessage("🔄 Initializing Bluetooth module...");

    stateSubscription.current = bleManager.onStateChange((state) => {
      logMessage(`🔵 Bluetooth state changed: ${state}`);
    }, true);

    const state = await bleManager.state();
    logMessage(`📱 Bluetooth state: ${state}`);

    if (!isConnected) {
      await loadRememberedDevice();
    }
  };

  const setupDisconnectListener = (connectedDeviceId: string) => {
    disconnectSubscription.current?.remove();
    disconnectSubscription.current = bleManager.onDeviceDisconnected(
      connectedDeviceId,
      (error, device) => {
        logMessage(`🔌 Device disconnected: ${device?.id ?? connectedDeviceId}`);
        setIsConnected(false);
        setDeviceId(null);
        setPlxDevice(null);
        disconnectSubscription.current?.remove();
        disconnectSubscription.current = null;

        if (options?.onConnectionChange) {
          options.onConnectionChange(false, null);
        }
      }
    );
  };

  // Disconnect from device
  const disconnectDevice = async (targetDeviceId?: string): Promise<boolean> => {
    const finalDeviceId = targetDeviceId || deviceId;

    if (!finalDeviceId) {
      logMessage("❌ Cannot disconnect: No device ID specified");
      return false;
    }

    logMessage(`📵 Disconnecting from device ${finalDeviceId}...`);

    try {
      await bleManager.cancelDeviceConnection(finalDeviceId);
      logMessage(`✅ Device disconnected successfully`);

      setIsConnected(false);
      setDeviceId(null);
      setPlxDevice(null);

      if (options?.onConnectionChange) {
        options.onConnectionChange(false, null);
      }

      return true;
    } catch (error) {
      logMessage(
        `❌ Error during disconnect: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      try {
        const stillConnected = await bleManager.isDeviceConnected(finalDeviceId);
        if (!stillConnected) {
          logMessage("ℹ️ Device is already disconnected");
          setIsConnected(false);
          setDeviceId(null);
          setPlxDevice(null);

          if (options?.onConnectionChange) {
            options.onConnectionChange(false, null);
          }
          return true;
        }
      } catch (checkError) {
        // Ignore errors checking connection state
      }

      return false;
    }
  };

  const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

  const showAllDevices = async () => {
    logMessage("👁️ Showing all Bluetooth devices, including unnamed ones...");

    const permissionsGranted = await requestPermissions();
    if (!permissionsGranted) {
      logMessage("⚠️ Cannot scan: insufficient permissions");
      return;
    }

    const state = await bleManager.state();
    if (state !== State.PoweredOn) {
      logMessage("❌ Cannot scan: Bluetooth is not enabled");
      return;
    }

    try {
      setIsScanning(true);
      setShowDeviceSelector(true);
      logMessage("🔎 Starting scan for ALL BLE devices (including unnamed)...");

      bleManager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
        if (error) {
          logMessage(`❌ Scan error: ${error.message}`);
          setIsScanning(false);
          return;
        }

        if (device) {
          logMessage(
            `🔍 Found device: ${device.name || "Unnamed"} (${device.id}), RSSI: ${device.rssi}`
          );
          setDiscoveredDevices((prev) => {
            const exists = prev.some((d) => d.id === device.id);
            if (!exists) {
              return [
                ...prev,
                {
                  id: device.id,
                  name: device.name || null,
                  rssi: device.rssi ?? -100,
                  isConnectable: device.isConnectable ?? true,
                },
              ];
            }
            return prev;
          });
        }
      });

      setTimeout(() => {
        bleManager.stopDeviceScan();
        logMessage("🛑 Scan stopped after timeout");
        setIsScanning(false);
      }, 5000);
    } catch (err) {
      setIsScanning(false);
      logMessage(
        `❌ Error during scan: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  };

  // Scan for devices
  const startScan = async () => {
    logMessage("🔍 Preparing to scan for Bluetooth devices...");

    const permissionsGranted = await requestPermissions();
    if (!permissionsGranted) {
      logMessage("⚠️ Cannot scan: insufficient permissions");
      return;
    }

    const state = await bleManager.state();
    logMessage(`Bluetooth state before scan: ${state}`);

    if (state !== State.PoweredOn) {
      logMessage("❌ Cannot scan: Bluetooth is not enabled");
      return;
    }

    try {
      setIsScanning(true);
      setDiscoveredDevices([]);
      setShowDeviceSelector(true);
      logMessage("🔎 Starting scan for all BLE devices...");

      bleManager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
        if (error) {
          logMessage(`❌ Scan error: ${error.message}`);
          setIsScanning(false);
          return;
        }

        if (device && device.name) {
          logMessage(
            `🔍 Found named device: ${device.name} (${device.id}), RSSI: ${device.rssi}`
          );
          setDiscoveredDevices((prev) => {
            const exists = prev.some((d) => d.id === device.id);
            if (!exists) {
              return [
                ...prev,
                {
                  id: device.id,
                  name: device.name ?? null,
                  rssi: device.rssi ?? -100,
                  isConnectable: device.isConnectable ?? true,
                },
              ];
            }
            return prev;
          });
        }
      });

      setTimeout(() => {
        bleManager.stopDeviceScan();
        logMessage("🛑 Scan stopped after timeout");
        setIsScanning(false);
      }, 10000);
    } catch (err) {
      setIsScanning(false);
      logMessage(
        `❌ Error during scan: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  };

  // Verify connection
  const verifyConnection = async (targetDeviceId: string): Promise<boolean> => {
    if (!targetDeviceId) return false;

    try {
      logMessage(`🔍 Verifying connection to device ${targetDeviceId}...`);

      const connected = await bleManager.isDeviceConnected(targetDeviceId);
      if (!connected) {
        logMessage("❌ Device not connected according to BLE manager");
        return false;
      }

      try {
        await bleManager.readRSSIForDevice(targetDeviceId);
        logMessage("✅ Connection verified - device responded to RSSI request");
        return true;
      } catch (rssiError) {
        logMessage(
          `❌ Device failed RSSI check: ${
            rssiError instanceof Error ? rssiError.message : String(rssiError)
          }`
        );
        return false;
      }
    } catch (error) {
      logMessage(
        `❌ Error verifying connection: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  };

  // Load remembered device
  const loadRememberedDevice = async () => {
    if (isLoadingRemembered) {
      logMessage("⚠️ Already loading remembered device, skipping");
      return null;
    }

    if (isConnected) {
      logMessage("ℹ️ Already connected, skipping remembered device load");
      return null;
    }

    setIsLoadingRemembered(true);

    try {
      logMessage("🔍 Checking for remembered device...");
      const deviceJson = await AsyncStorage.getItem(REMEMBERED_DEVICE_KEY);

      if (deviceJson) {
        const remembered: BluetoothDevice = JSON.parse(deviceJson);
        setRememberedDevice(remembered);
        logMessage(
          `✅ Remembered device found: ${
            remembered.name || "Unnamed device"
          } (${remembered.id})`
        );

        // ble-plx handles device discovery internally during connectToDevice
        logMessage(`Attempting to connect to remembered device ${remembered.id}...`);
        await connectToDevice(remembered);
        return remembered;
      } else {
        logMessage("ℹ️ No remembered device found");
        return null;
      }
    } catch (error) {
      logMessage(
        `❌ Failed to load remembered device: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return null;
    } finally {
      setIsLoadingRemembered(false);
    }
  };

  // Device connection function
  const connectToDevice = async (device: BluetoothDevice): Promise<boolean> => {
    if (isLocked()) {
      logMessage("⚠️ Connection already in progress, cancelling this connection");
      return false;
    }

    setLock();

    try {
      logMessage(`Connecting to ${device.id}...`);
      bleManager.stopDeviceScan();

      const connectedDevice = await bleManager.connectToDevice(device.id);
      logMessage("✅ Connection established");

      const deviceWithServices =
        await connectedDevice.discoverAllServicesAndCharacteristics();
      logMessage("✅ Services and characteristics discovered");

      setDeviceId(device.id);
      setIsConnected(true);
      setPlxDevice(deviceWithServices);

      setupDisconnectListener(device.id);

      await discoverDeviceProfile(deviceWithServices);
      await initializeOBD(device.id, deviceWithServices);
      await rememberDevice(device);

      if (options?.onConnectionChange) {
        options.onConnectionChange(true, device.id);
      }

      releaseLock();
      return true;
    } catch (error) {
      logMessage(`❌ Connection failed: ${String(error)}`);
      releaseLock();
      return false;
    }
  };

  // Reconnect to previously used device
  const connectToRememberedDevice = async (): Promise<boolean> => {
    if (!rememberedDevice) {
      logMessage("ℹ️ No remembered device found");
      return false;
    }

    return connectToDevice(rememberedDevice);
  };

  // Save device for later use
  const rememberDevice = async (device: BluetoothDevice) => {
    try {
      await AsyncStorage.setItem(REMEMBERED_DEVICE_KEY, JSON.stringify(device));
      setRememberedDevice(device);
      logMessage(
        `💾 Device saved for future connections: ${
          device.name || "Unnamed device"
        }`
      );
    } catch (error) {
      logMessage(
        `❌ Failed to save device: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  // Forget previously remembered device
  const forgetRememberedDevice = async () => {
    try {
      await AsyncStorage.removeItem(REMEMBERED_DEVICE_KEY);
      setRememberedDevice(null);
      logMessage("🗑️ Remembered device has been forgotten");
    } catch (error) {
      logMessage(
        `❌ Failed to forget device: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  // Request permissions
  const requestPermissions = async () => {
    logMessage("🔐 Requesting Bluetooth permissions...");

    try {
      if (Platform.OS === "ios") {
        logMessage("📱 iOS detected, no explicit permission requests needed");
        return true;
      } else if (Platform.OS === "android") {
        logMessage(`📱 Android API level ${Platform.Version} detected`);

        let permissionsToRequest: string[] = [];
        let permissionResults = {};

        if (Platform.Version >= 31) {
          // Android 12+
          logMessage("Requesting Android 12+ permissions");
          permissionsToRequest = [
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ];
        } else if (Platform.Version >= 23) {
          logMessage("Requesting Android 6-11 permissions");
          permissionsToRequest = [
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ];
        }

        permissionResults = await PermissionsAndroid.requestMultiple(
          permissionsToRequest as any
        );

        Object.entries(permissionResults).forEach(([permission, result]) => {
          logMessage(`Permission ${permission}: ${result}`);
        });

        const denied = Object.values(permissionResults).includes(
          PermissionsAndroid.RESULTS.DENIED
        );
        if (denied) {
          logMessage("❌ Some permissions were denied!");
        } else {
          logMessage("✅ All permissions granted");
        }

        return !denied;
      }
    } catch (error) {
      logMessage(
        `❌ Error requesting permissions: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  };

  // Discover device characteristics using ble-plx Device
  const discoverDeviceProfile = async (device: Device): Promise<boolean> => {
    try {
      logMessage(`🔍 Discovering device profile...`);

      const services = await device.services();
      logMessage(`✅ Discovered ${services.length} services:`);

      const obdServiceIds = ["fff0", "ffe0", "ffb0"];

      for (const service of services) {
        const serviceUUID = service.uuid.toLowerCase();
        logMessage(`Service: ${serviceUUID}`);

        const isPotentialOBDService =
          obdServiceIds.some((id) => serviceUUID.includes(id)) ||
          serviceUUID === SERVICE_UUID.toLowerCase();

        if (isPotentialOBDService) {
          logMessage(`✅ Found potential OBD service: ${serviceUUID}`);
          setWriteServiceUUID(service.uuid);

          if (serviceUUID.includes("fff0")) {
            logMessage(`Using standard OBD characteristic pattern`);
            return true;
          } else if (serviceUUID.includes("ffe0")) {
            setWriteCharUUID("ffe1");
            return true;
          } else if (serviceUUID.includes("ffb0")) {
            setWriteCharUUID("ffb2");
            return true;
          }
        }
      }

      logMessage(`⚠️ Could not identify suitable OBD service, using defaults`);
      setWriteServiceUUID("0000fff0-0000-1000-8000-00805f9b34fb");
      setWriteCharUUID("0000fff2-0000-1000-8000-00805f9b34fb");
      return false;
    } catch (error) {
      logMessage(
        `❌ Error in device profile discovery: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  };

  // Initialize OBD device
  const initializeOBD = async (
    targetDeviceId?: string | null,
    device?: Device | null
  ): Promise<boolean> => {
    const finalDeviceId = targetDeviceId || deviceId;
    const finalDevice = device || plxDevice;

    if (!finalDeviceId) {
      logMessage("❌ Cannot initialize OBD: No device ID available");
      return false;
    }

    if (!finalDevice) {
      logMessage("❌ No PLX device available for reset");
      return false;
    }

    try {
      logMessage("🔄 Initializing OBD-II adapter...");
      await delay(500);

      logMessage("Sending reset command: ATZ");
      await sendCommand(finalDevice, "ATZ");

      logMessage("Waiting for device to reset...");
      await delay(500);

      const commands = [
        "ATL0", // Turn off linefeeds
        "ATH0", // Turn off headers
        "ATE0", // Turn off echo
        "ATS0", // Turn off spaces
        "ATI",  // Get version info
        "AT SP 0", // Set protocol to auto
      ];

      for (const cmd of commands) {
        logMessage(`Sending init command: ${cmd}`);
        await delay(100);
      }

      logMessage("✅ OBD initialization sequence completed");
      return true;
    } catch (error) {
      logMessage(
        `❌ OBD initialization failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return false;
    }
  };

  const wakeUpDevice = async (device: Device): Promise<boolean> => {
    try {
      logMessage("💤 Performing full OBD device wake-up sequence...");

      try {
        const wakeupCmd = Buffer.from("\r", "utf8").toString("base64");
        await device.writeCharacteristicWithResponseForService(
          SERVICE_UUID,
          WRITE_UUID,
          wakeupCmd
        );
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (e) {
        // Ignore wake-up errors
      }

      lastSuccessfulCommandTime.current = Date.now();
      return true;
    } catch (error) {
      logMessage(`⚠️ Wake-up sequence failed: ${String(error)}`);
      return false;
    }
  };

  const sendCommand = async (
    device: Device,
    command: string,
    retries = 2,
    customTimeoutMs?: number
  ): Promise<string> => {
    if (!device) {
      console.error("No device connected");
      throw new Error("No device connected");
    }

    let lastError: Error | null = null;
    const now = Date.now();
    const lastCmdTime = lastSuccessfulCommandTime.current ?? 0;
    const needsWakeup = now - lastCmdTime > 5000;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (needsWakeup && attempt === 0) {
          logMessage("💤 Device may be sleeping, sending quick wake-up...");
          try {
            await wakeUpDevice(device);
            logMessage("✅ Device wake-up command sent successfully");
          } catch (wakeupError) {
            logMessage("Wake-up command ignored error");
          }
        } else if (attempt > 0) {
          logMessage(
            `📢 Retry attempt ${attempt}/${retries} - sending wake-up signal...`
          );
        }

        const encodedCommand = Buffer.from(`${command}\r`, "utf8").toString(
          "base64"
        );
        console.log(
          `Sending Command (attempt ${attempt + 1}/${retries + 1}):`,
          command
        );

        await device.writeCharacteristicWithResponseForService(
          SERVICE_UUID,
          WRITE_UUID,
          encodedCommand
        );

        const response = await new Promise<string>((resolve, reject) => {
          let receivedBytes: number[] = [];
          let responseText = "";
          let subscription: any = null;
          let isCompleted = false;

          try {
            subscription = device.monitorCharacteristicForService(
              SERVICE_UUID,
              READ_UUID,
              (error, characteristic) => {
                if (isCompleted) return;

                if (error) {
                  console.error("Error receiving response:", error);
                  if (subscription) {
                    try {
                      subscription.remove();
                    } catch (removalError) {
                      // Silently ignore removal errors
                    }
                  }

                  if (!isCompleted) {
                    isCompleted = true;
                    reject(error);
                  }
                  return;
                }

                if (characteristic?.value) {
                  const decodedChunk = base64.decode(characteristic.value);
                  console.log("Received Chunk:", decodedChunk);

                  for (let i = 0; i < decodedChunk.length; i++) {
                    receivedBytes.push(decodedChunk.charCodeAt(i));
                  }

                  if (decodedChunk.includes(">")) {
                    responseText = Buffer.from(receivedBytes)
                      .toString("utf8")
                      .trim();
                    console.log("Full Response (Raw):", responseText);

                    let lines = responseText
                      .split(/[\r\n]+/)
                      .map((line) => line.trim())
                      .filter((line) => line.length > 0 && line !== ">");

                    console.log("Response Lines:", lines);

                    let finalResponse = "";

                    for (let i = 0; i < lines.length; i++) {
                      const line = lines[i];
                      if (line.toUpperCase() === command.toUpperCase()) {
                        console.log("Skipping echo line:", line);
                        continue;
                      }
                      if (line.toUpperCase() === "OK") {
                        if (finalResponse.length === 0) {
                          finalResponse = "OK";
                        }
                        continue;
                      }
                      if (line.length > 0) {
                        finalResponse = line;
                        break;
                      }
                    }

                    console.log("Parsed Response:", finalResponse);
                    isCompleted = true;

                    if (subscription) {
                      try {
                        subscription.remove();
                      } catch (removalError) {
                        console.log("Ignoring subscription removal error");
                      }
                    }

                    resolve(finalResponse);
                  }
                }
              }
            );
          } catch (subError) {
            if (!isCompleted) {
              isCompleted = true;
              reject(subError);
            }
          }

          const timeoutMs =
            customTimeoutMs || (attempt === retries ? 5000 : 3000);
          setTimeout(() => {
            if (!isCompleted) {
              isCompleted = true;
              if (subscription) {
                try {
                  subscription.remove();
                } catch (removalError) {
                  // Silently handle subscription removal errors
                }
              }

              if (receivedBytes.length > 0) {
                const partialResponse = Buffer.from(receivedBytes)
                  .toString("utf8")
                  .trim();
                resolve(partialResponse);
              } else {
                reject(new Error(`Command timed out (attempt ${attempt + 1})`));
              }
            }
          }, timeoutMs);
        });

        lastSuccessfulCommandTime.current = Date.now();
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.error(`Error sending command (attempt ${attempt + 1}):`, error);

        if (attempt === retries) {
          throw lastError;
        }

        await new Promise((resolve) =>
          setTimeout(resolve, 500 * (attempt + 1))
        );
      }
    }

    throw lastError || new Error("Unknown command error");
  };

  // Methods
  return {
    // State Variables
    voltage,
    discoveredDevices,
    isScanning,
    plxDevice,
    writeServiceUUID,
    writeCharUUID,
    readCharUUID,
    deviceId,
    lastSuccessfulCommandTime,
    showDeviceSelector,
    rememberedDevice,
    isConnected,
    showAllDevices,

    // Methods
    logMessage,
    startScan,
    connectToDevice,
    connectToRememberedDevice,
    disconnectDevice,
    sendCommand,
    verifyConnection,
    rememberDevice,
    forgetRememberedDevice,
    initializeOBD,
    discoverDeviceProfile,
    forceClearLock,
    wakeUpDevice,

    // Setters for discoveredDevices if needed externally
    setDiscoveredDevices,
  };
};
