/**
 * BLE Connection Service - Simplified
 * Handles Bluetooth Low Energy connection management only
 * OBD-II specific logic should be in obdService.ts
 */
import { useState, useEffect, useRef } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import {
  BleManager as BlePlxManager,
  Device,
  State,
  Subscription,
} from "react-native-ble-plx";
import base64 from "react-native-base64";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Constants
const SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb";
const WRITE_UUID = "0000fff2-0000-1000-8000-00805f9b34fb";
const READ_UUID = "0000fff1-0000-1000-8000-00805f9b34fb";
const REMEMBERED_DEVICE_KEY = "@MychanicApp:rememberedDevice";
const COMMAND_TIMEOUT_MS = 5000;
const MAX_RETRIES = 2;

// Single BLE manager instance
const bleManager = new BlePlxManager();

// Types
export interface BluetoothDevice {
  id: string;
  name: string | null;
  rssi: number;
  isConnectable?: boolean;
}

export interface BleConnectionOptions {
  onConnectionChange?: (connected: boolean, deviceId: string | null) => void;
  onLogMessage?: (message: string) => void;
}

/**
 * Main BLE Connection Hook
 * Provides clean API for Bluetooth connectivity
 */
export const useBleConnection = (options?: BleConnectionOptions) => {
  // Connection state
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [plxDevice, setPlxDevice] = useState<Device | null>(null);

  // Discovery
  const [discoveredDevices, setDiscoveredDevices] = useState<BluetoothDevice[]>(
    [],
  );
  const [rememberedDevice, setRememberedDevice] =
    useState<BluetoothDevice | null>(null);

  // Internal state
  const [isInitialized, setIsInitialized] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const lastCommandTime = useRef<number | null>(null);
  const connectionLock = useRef<boolean>(false);

  // Subscriptions
  const stateSubscription = useRef<Subscription | null>(null);
  const disconnectSubscription = useRef<Subscription | null>(null);

  // Characteristic UUIDs (can be updated during discovery)
  const [writeServiceUUID, setWriteServiceUUID] =
    useState<string>(SERVICE_UUID);
  const [writeCharUUID, setWriteCharUUID] = useState<string>(WRITE_UUID);
  const [readCharUUID, setReadCharUUID] = useState<string>(READ_UUID);

  // Initialize on mount
  useEffect(() => {
    if (isInitialized) return;

    const initialize = async () => {
      try {
        await initializeBLE();
        await loadRememberedDevice();
        setIsInitialized(true);
      } catch (error) {
        logMessage(
          `❌ Initialization error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    };

    initialize();

    return () => {
      stateSubscription.current?.remove();
      disconnectSubscription.current?.remove();
      bleManager.stopDeviceScan();
    };
  }, []);

  // Helper: Log message
  const logMessage = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setLog((prev) => [...prev.slice(-50), logEntry]); // Keep last 50 messages
    console.log(logEntry);
    options?.onLogMessage?.(logEntry);
  };

  // Initialize BLE
  const initializeBLE = async () => {
    logMessage("🔄 Initializing Bluetooth...");

    stateSubscription.current = bleManager.onStateChange((state) => {
      logMessage(`🔵 Bluetooth state: ${state}`);
    }, true);

    const state = await bleManager.state();
    logMessage(`📱 Current Bluetooth state: ${state}`);
  };

  // Request permissions
  const requestPermissions = async (): Promise<boolean> => {
    logMessage("🔐 Requesting Bluetooth permissions...");

    try {
      if (Platform.OS === "ios") {
        return true;
      }

      if (Platform.OS === "android") {
        const apiLevel = Platform.Version;

        if (apiLevel >= 31) {
          const permissions = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ]);

          const allGranted = Object.values(permissions).every(
            (status) => status === PermissionsAndroid.RESULTS.GRANTED,
          );

          if (!allGranted) {
            logMessage("❌ Required permissions not granted");
            return false;
          }
        } else {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          );

          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            logMessage("❌ Location permission not granted");
            return false;
          }
        }

        logMessage("✅ All permissions granted");
        return true;
      }

      return false;
    } catch (error) {
      logMessage(
        `❌ Permission error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  };

  // Start scanning for devices
  const startScan = async () => {
    logMessage("🔍 Starting device scan...");

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
      setDiscoveredDevices([]);

      bleManager.startDeviceScan(
        null,
        { allowDuplicates: false },
        (error, device) => {
          if (error) {
            logMessage(`❌ Scan error: ${error.message}`);
            setIsScanning(false);
            return;
          }

          if (device) {
            // Filter for devices named "OBDII" (case insensitive)
            const deviceName = device.name || "";
            if (!deviceName.toLowerCase().includes("obdii")) {
              return; // Skip devices that don't match
            }

            setDiscoveredDevices((prev) => {
              const exists = prev.some((d) => d.id === device.id);
              if (exists) return prev;

              const newDevice: BluetoothDevice = {
                id: device.id,
                name: device.name,
                rssi: device.rssi || 0,
                isConnectable: device.isConnectable ?? undefined,
              };

              logMessage(
                `📡 Found OBDII device: ${device.name || "Unknown"} (${device.id})`,
              );
              return [...prev, newDevice];
            });
          }
        },
      );

      // Stop scan after 4 seconds
      setTimeout(() => {
        bleManager.stopDeviceScan();
        setIsScanning(false);
        logMessage("🛑 Scan completed");
      }, 4000);
    } catch (error) {
      setIsScanning(false);
      logMessage(
        `❌ Scan error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  // Connect to device
  const connectToDevice = async (device: BluetoothDevice): Promise<boolean> => {
    if (connectionLock.current) {
      logMessage("⚠️ Connection already in progress");
      return false;
    }

    connectionLock.current = true;

    try {
      logMessage(`🔗 Connecting to ${device.name || device.id}...`);
      bleManager.stopDeviceScan();

      const connectedDevice = await bleManager.connectToDevice(device.id);
      logMessage("✅ Connection established");

      const deviceWithServices =
        await connectedDevice.discoverAllServicesAndCharacteristics();
      logMessage("✅ Services discovered");

      // Discover and set characteristics
      await discoverCharacteristics(deviceWithServices);

      // Initialize OBD-II protocol
      await initializeOBD(deviceWithServices);

      // Update state
      setDeviceId(device.id);
      setDeviceName(device.name);
      setIsConnected(true);
      setPlxDevice(deviceWithServices);

      // Setup disconnect listener
      setupDisconnectListener(device.id);

      // Remember device
      await rememberDevice(device);

      options?.onConnectionChange?.(true, device.id);

      logMessage(`✅ Successfully connected to ${device.name || device.id}`);
      return true;
    } catch (error) {
      logMessage(
        `❌ Connection failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    } finally {
      connectionLock.current = false;
    }
  };

  // Disconnect from device
  const disconnectDevice = async (): Promise<boolean> => {
    if (!deviceId) {
      logMessage("⚠️ No device to disconnect");
      return false;
    }

    try {
      logMessage(`📵 Disconnecting from ${deviceName || deviceId}...`);
      await bleManager.cancelDeviceConnection(deviceId);

      setIsConnected(false);
      setDeviceId(null);
      setDeviceName(null);
      setPlxDevice(null);

      options?.onConnectionChange?.(false, null);

      logMessage("✅ Disconnected successfully");
      return true;
    } catch (error) {
      logMessage(
        `❌ Disconnect error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  };

  // Setup disconnect listener
  const setupDisconnectListener = (deviceId: string) => {
    disconnectSubscription.current?.remove();
    disconnectSubscription.current = bleManager.onDeviceDisconnected(
      deviceId,
      (error, device) => {
        logMessage(`🔌 Device disconnected: ${device?.id || deviceId}`);
        setIsConnected(false);
        setDeviceId(null);
        setDeviceName(null);
        setPlxDevice(null);
        options?.onConnectionChange?.(false, null);
      },
    );
  };

  // Discover characteristics
  const discoverCharacteristics = async (device: Device): Promise<void> => {
    try {
      logMessage("🔍 Discovering characteristics...");

      const services = await device.services();
      const obdServiceIds = ["fff0", "ffe0", "ffb0"];

      for (const service of services) {
        const serviceIdShort = service.uuid.substring(4, 8).toLowerCase();

        if (obdServiceIds.includes(serviceIdShort)) {
          logMessage(`✅ Found OBD service: ${service.uuid}`);
          setWriteServiceUUID(service.uuid);

          const characteristics = await service.characteristics();

          for (const char of characteristics) {
            const charIdShort = char.uuid.substring(4, 8).toLowerCase();

            if (char.isWritableWithResponse || char.isWritableWithoutResponse) {
              logMessage(`✅ Write characteristic: ${char.uuid}`);
              setWriteCharUUID(char.uuid);
            }

            if (char.isNotifiable) {
              logMessage(`✅ Read characteristic: ${char.uuid}`);
              setReadCharUUID(char.uuid);
            }
          }

          return;
        }
      }

      logMessage("⚠️ Using default characteristics");
    } catch (error) {
      logMessage(
        `❌ Characteristic discovery error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  // Initialize OBD-II protocol
  const initializeOBD = async (device: Device): Promise<void> => {
    logMessage("🚗 Initializing OBD-II protocol...");

    try {
      // Test if device is already initialized by trying a simple command
      try {
        const testResponse = await sendCommand(device, "ATI", 1, 2000);
        if (testResponse && testResponse.length > 0) {
          logMessage("✅ OBD-II device already initialized");
          return;
        }
      } catch (error) {
        logMessage("⚠️ Device not responding, will initialize...");
      }

      // Only send essential initialization commands
      // Removed ATZ (reset) - unnecessary and causes delays
      const commands = ["ATE0", "ATL0", "ATS0", "ATH1", "ATSP0"];

      for (const cmd of commands) {
        await sendCommand(device, cmd, 1, 3000);
        await delay(200);
      }

      logMessage("✅ OBD-II initialized");
    } catch (error) {
      logMessage(
        `⚠️ OBD initialization warning: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  // Send command to device
  const sendCommand = async (
    device: Device,
    command: string,
    retries = MAX_RETRIES,
    timeoutMs = COMMAND_TIMEOUT_MS,
  ): Promise<string> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (attempt > 0) {
          logMessage(`🔄 Retry ${attempt}/${retries}: ${command}`);
          await delay(500 * attempt);
        }

        // Write command
        const commandWithCR = command + "\r";
        const base64Command = base64.encode(commandWithCR);

        await device.writeCharacteristicWithResponseForService(
          writeServiceUUID,
          writeCharUUID,
          base64Command,
        );

        // Monitor for response
        let responseData = "";
        let timeoutHandle: NodeJS.Timeout;

        const responsePromise = new Promise<string>((resolve, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(new Error(`Timeout waiting for response to: ${command}`));
          }, timeoutMs);

          let promptSeenTime: number | null = null;
          const WAIT_AFTER_PROMPT_MS = 200; // Wait 200ms after seeing prompt to collect remaining data

          device.monitorCharacteristicForService(
            writeServiceUUID,
            readCharUUID,
            (error, characteristic) => {
              if (error) {
                clearTimeout(timeoutHandle);
                reject(error);
                return;
              }

              if (characteristic?.value) {
                const chunk = base64.decode(characteristic.value);
                responseData += chunk;

                // When we see the prompt character '>', start a timer to wait for any remaining data
                if (chunk.includes(">") && !promptSeenTime) {
                  promptSeenTime = Date.now();

                  // Set a short timer to collect any remaining chunks
                  setTimeout(() => {
                    clearTimeout(timeoutHandle);
                    resolve(responseData);
                  }, WAIT_AFTER_PROMPT_MS);
                }
              }
            },
          );
        });

        const response = await responsePromise;
        lastCommandTime.current = Date.now();
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === retries) {
          logMessage(
            `❌ Command failed after ${retries + 1} attempts: ${command}`,
          );
        }
      }
    }

    throw lastError || new Error(`Command failed: ${command}`);
  };

  // Remember device
  const rememberDevice = async (device: BluetoothDevice) => {
    try {
      await AsyncStorage.setItem(REMEMBERED_DEVICE_KEY, JSON.stringify(device));
      setRememberedDevice(device);
      logMessage(`💾 Device saved: ${device.name || device.id}`);
    } catch (error) {
      logMessage(
        `❌ Failed to save device: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  // Load remembered device
  const loadRememberedDevice = async () => {
    try {
      const deviceJson = await AsyncStorage.getItem(REMEMBERED_DEVICE_KEY);

      if (deviceJson) {
        const device = JSON.parse(deviceJson);
        setRememberedDevice(device);
        logMessage(`📱 Remembered device loaded: ${device.name || device.id}`);
      }
    } catch (error) {
      logMessage(
        `❌ Failed to load remembered device: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  // Connect to remembered device
  const connectToRememberedDevice = async (): Promise<boolean> => {
    if (!rememberedDevice) {
      logMessage("ℹ️ No remembered device found");
      return false;
    }

    return connectToDevice(rememberedDevice);
  };

  // Forget remembered device
  const forgetRememberedDevice = async () => {
    try {
      await AsyncStorage.removeItem(REMEMBERED_DEVICE_KEY);
      setRememberedDevice(null);
      logMessage("🗑️ Remembered device forgotten");
    } catch (error) {
      logMessage(
        `❌ Failed to forget device: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  // Utility: delay
  const delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  // Return public API
  return {
    // State
    isScanning,
    isConnected,
    deviceId,
    deviceName,
    plxDevice,
    discoveredDevices,
    rememberedDevice,
    log,

    // Characteristic UUIDs
    writeServiceUUID,
    writeCharUUID,
    readCharUUID,

    // Methods
    startScan,
    connectToDevice,
    disconnectDevice,
    connectToRememberedDevice,
    forgetRememberedDevice,
    sendCommand,
    logMessage,

    // Setters (for external control)
    setDiscoveredDevices,
  };
};
