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
const PREVIOUS_DEVICES_KEY = "@MychanicApp:previousDevices";
const COMMAND_TIMEOUT_MS = 2000; // Timeout for BLE command responses (2s allows ISO-TP multi-frame assembly)
const MAX_RETRIES = 2;
const AUTO_RECONNECT_DELAY_MS = 2000; // Wait before attempting auto-reconnect

// Single BLE manager instance
const bleManager = new BlePlxManager();

// Types
export interface BluetoothDevice {
  id: string;
  name: string | null;
  rssi: number;
  isConnectable?: boolean;
}

export interface PreviousDevice extends BluetoothDevice {
  lastConnected: number; // timestamp
  connectionCount: number; // how many times connected
}

export interface BleConnectionOptions {
  onConnectionChange?: (connected: boolean, deviceId: string | null) => void;
  onLogMessage?: (message: string) => void;
  enableAutoReconnect?: boolean; // enable background auto-reconnection
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
  const [previousDevices, setPreviousDevices] = useState<PreviousDevice[]>([]);
  const [isAutoReconnecting, setIsAutoReconnecting] = useState(false);

  // Internal state
  const [isInitialized, setIsInitialized] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const lastCommandTime = useRef<number | null>(null);
  const connectionLock = useRef<boolean>(false);
  const autoReconnectAttempts = useRef<Map<string, number>>(new Map()); // Track retry attempts per device

  // Subscriptions
  const stateSubscription = useRef<Subscription | null>(null);
  const disconnectSubscription = useRef<Subscription | null>(null);
  const monitorSubscription = useRef<any>(null);

  // Single shared response buffer for all commands
  const responseBuffer = useRef<string>("");

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
        await loadPreviousDevices();

        // If auto-reconnect enabled, attempt to reconnect to last used device
        if (options?.enableAutoReconnect) {
          await delay(AUTO_RECONNECT_DELAY_MS);
          attemptAutoReconnect();
        }

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
      }, 3000);
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

      // Save to previous devices history
      await savePreviousDevice(device);

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
      // Clean up monitor
      if (monitorSubscription.current) {
        monitorSubscription.current.remove?.();
        monitorSubscription.current = null;
      }
      responseBuffer.current = "";

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

  // Set up persistent monitor for the entire device connection
  const setupPersistentMonitor = (device: Device) => {
    logMessage("📡 Setting up persistent response monitor...");

    try {
      // monitorCharacteristicForService returns a subscription or null
      const subscription = device.monitorCharacteristicForService(
        writeServiceUUID,
        readCharUUID,
        (error, characteristic) => {
          if (error) {
            logMessage(`⚠️ Monitor received error: ${error.message}`);
            return;
          }

          if (characteristic?.value) {
            try {
              const chunk = base64.decode(characteristic.value);
              responseBuffer.current += chunk;
            } catch (decodeError) {
              logMessage(`⚠️ Failed to decode chunk`);
            }
          }
        },
      );

      // Store subscription if it's returned (for cleanup later)
      if (subscription) {
        monitorSubscription.current = subscription;
      }

      logMessage("✅ Persistent monitor active for all commands");
    } catch (error) {
      logMessage(
        `⚠️ Monitor setup error: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Continue with initialization even if monitor setup has issues
      // Some devices may not support this characteristic
    }
  };

  // Initialize OBD-II protocol
  const initializeOBD = async (device: Device): Promise<void> => {
    logMessage("🚗 Initializing OBD-II protocol...");

    try {
      // Set up persistent monitor first, before any commands
      setupPersistentMonitor(device);
      await delay(100);

      // Full initialization sequence - ALWAYS run this first
      // This ensures headers are disabled from the start
      const commands = [
        "ATZ", // Reset adapter (critical for fresh state)
        "ATE0", // Echo off
        "ATL0", // Linefeeds off
        "ATS0", // Space off
        "ATH0", // Headers OFF - critical for proper response parsing (no CAN headers)
        "ATD1", // Use default headers (allows adapter to handle frame assembly)
        "ATSP0", // Auto protocol detection
      ];

      for (const cmd of commands) {
        try {
          await sendCommand(device, cmd, 1, 3000);
          await delay(200);
        } catch (error) {
          logMessage(
            `⚠️ Command ${cmd} failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      // Now verify protocol was established by testing a real OBD command
      try {
        const verifyResponse = await sendCommand(device, "0100", 1, 2000);
        if (
          verifyResponse &&
          verifyResponse.length > 0 &&
          !verifyResponse.includes("NO DATA")
        ) {
          logMessage("✅ OBD-II protocol established successfully");
        } else {
          logMessage(
            "⚠️ OBD protocol may not be responding correctly. Response: " +
              verifyResponse,
          );
        }
      } catch (error) {
        logMessage("⚠️ Could not verify OBD protocol");
      }
    } catch (error) {
      logMessage(
        `⚠️ OBD initialization warning: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  // Send command to device (uses shared persistent monitor)
  const extractResponseFromBuffer = (
    command: string,
    timeoutMs: number,
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let promptSeenTime: number | null = null;
      const WAIT_AFTER_PROMPT_MS = 50; // Reduced from 200ms to minimize contamination window
      const SEARCHING_TIMEOUT_MS = 8000;

      const checkBuffer = () => {
        const elapsed = Date.now() - startTime;
        const buffer = responseBuffer.current.trim();

        // Skip empty buffer early on
        if (!buffer && elapsed < 100) {
          setTimeout(checkBuffer, 50);
          return;
        }

        // Check for search dots - extend timeout
        if (buffer.includes(".") && !buffer.includes(">")) {
          if (elapsed > SEARCHING_TIMEOUT_MS) {
            responseBuffer.current = "";
            reject(new Error(`Timeout during search: "${buffer}"`));
            return;
          }
          setTimeout(checkBuffer, 100);
          return;
        }

        // Check for NO DATA
        if (buffer.includes("NO DATA") && !promptSeenTime) {
          promptSeenTime = Date.now();
          // Immediately capture and clear to prevent contamination
          const finalBuffer = buffer;
          responseBuffer.current = "";
          resolve(finalBuffer);
          return;
        }

        // Check for prompt
        if (buffer.includes(">") && !promptSeenTime) {
          promptSeenTime = Date.now();
          // Wait briefly for final fragments, then capture and IMMEDIATELY clear
          setTimeout(() => {
            const finalBuffer = responseBuffer.current.trim();
            responseBuffer.current = "";
            resolve(finalBuffer);
          }, WAIT_AFTER_PROMPT_MS);
          return;
        }

        // Check timeout
        if (elapsed > timeoutMs) {
          responseBuffer.current = "";
          reject(new Error(`Timeout after ${elapsed}ms: "${buffer}"`));
          return;
        }

        // Keep checking
        setTimeout(checkBuffer, 50);
      };

      checkBuffer();
    });
  };

  // Send command to device (uses shared persistent monitor)
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

        // CRITICAL: Clear buffer before sending new command to prevent contamination
        responseBuffer.current = "";

        // Write command to BLE characteristic
        const commandWithCR = command + "\r";
        const base64Command = base64.encode(commandWithCR);

        logMessage(`📝 [${command}] Sending command...`);

        await device.writeCharacteristicWithResponseForService(
          writeServiceUUID,
          writeCharUUID,
          base64Command,
        );

        // Wait for response using shared monitor buffer
        logMessage(`⏳ [${command}] Waiting for response...`);
        let response = await extractResponseFromBuffer(command, timeoutMs);

        lastCommandTime.current = Date.now();

        // Clean response
        response = response
          .replace(/UNABLE TO CONNECT/g, "")
          .replace(/SEARCHING\.\.\./g, "")
          .replace(/^\.*/, "")
          .trim();

        logMessage(`✅ [${command}] Response: "${response}"`);
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === retries) {
          logMessage(`❌ [${command}] Failed after ${retries + 1} attempts`);
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

  // Save previous device
  const savePreviousDevice = async (device: BluetoothDevice) => {
    try {
      const existing = previousDevices.find((d) => d.id === device.id);

      let previousDevicesToSave: PreviousDevice[];

      if (existing) {
        // Update existing device with new connection timestamp and increment count
        previousDevicesToSave = previousDevices.map((d) =>
          d.id === device.id
            ? {
                ...d,
                lastConnected: Date.now(),
                connectionCount: d.connectionCount + 1,
              }
            : d,
        );
      } else {
        // Add new device to previous devices list
        const newPreviousDevice: PreviousDevice = {
          ...device,
          lastConnected: Date.now(),
          connectionCount: 1,
        };
        previousDevicesToSave = [newPreviousDevice, ...previousDevices].slice(
          0,
          10,
        ); // Keep last 10 devices
      }

      setPreviousDevices(previousDevicesToSave);
      await AsyncStorage.setItem(
        PREVIOUS_DEVICES_KEY,
        JSON.stringify(previousDevicesToSave),
      );
      logMessage(`💾 Device saved to history: ${device.name || device.id}`);
    } catch (error) {
      logMessage(
        `❌ Failed to save device to history: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  // Load previous devices
  const loadPreviousDevices = async () => {
    try {
      const devicesJson = await AsyncStorage.getItem(PREVIOUS_DEVICES_KEY);

      if (devicesJson) {
        const devices: PreviousDevice[] = JSON.parse(devicesJson);
        // Sort by most recent connection
        devices.sort((a, b) => b.lastConnected - a.lastConnected);
        setPreviousDevices(devices);
        logMessage(`📋 Loaded ${devices.length} previous device(s)`);
      }
    } catch (error) {
      logMessage(
        `❌ Failed to load previous devices: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };

  // Attempt auto-reconnect to most recent device
  const attemptAutoReconnect = async () => {
    if (isConnected || isAutoReconnecting || previousDevices.length === 0) {
      return;
    }

    setIsAutoReconnecting(true);
    try {
      const mostRecent = previousDevices[0]; // Already sorted by most recent
      logMessage(
        `🔄 Attempting auto-reconnect to ${mostRecent.name || mostRecent.id}...`,
      );

      const success = await connectToDevice(mostRecent);

      if (success) {
        logMessage(
          `✅ Auto-reconnected to ${mostRecent.name || mostRecent.id}`,
        );
      } else {
        logMessage(`⚠️ Auto-reconnect failed, will retry on next scan`);
      }
    } catch (error) {
      logMessage(
        `❌ Auto-reconnect error: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setIsAutoReconnecting(false);
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
    previousDevices,
    isAutoReconnecting,
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
    loadPreviousDevices,
    attemptAutoReconnect,
    sendCommand,
    logMessage,

    // Setters (for external control)
    setDiscoveredDevices,
  };
};
