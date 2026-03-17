/**
 * Bluetooth Context - Simplified
 * Provides Bluetooth connection state management across the app
 * Uses simplified bleConnections service
 */
import React, { createContext, useContext, ReactNode } from "react";
import { Alert } from "react-native";
import { useBleConnection } from "../services/bleConnections";
import { Device } from "react-native-ble-plx";
import type {
  BluetoothDevice,
  PreviousDevice,
} from "../services/bleConnections";
import firebaseService from "../services/firebaseService";

// Context interface
interface BluetoothContextType {
  // Connection state
  isScanning: boolean;
  isConnected: boolean;
  deviceId: string | null;
  deviceName: string | null;
  plxDevice: Device | null;

  // Discovery
  discoveredDevices: BluetoothDevice[];
  rememberedDevice: BluetoothDevice | null;
  previousDevices: PreviousDevice[];
  isAutoReconnecting: boolean;

  // Logging
  log: string[];

  // Connection methods
  startScan: () => Promise<void>;
  connectToDevice: (
    device: BluetoothDevice,
    vehicleId?: string,
  ) => Promise<boolean>;
  disconnectDevice: () => Promise<boolean>;
  connectToRememberedDevice: () => Promise<boolean>;
  forgetRememberedDevice: () => Promise<void>;
  loadPreviousDevices: () => Promise<void>;
  attemptAutoReconnect: () => Promise<void>;

  // Communication
  sendCommand: (
    device: Device,
    command: string,
    retries?: number,
    timeout?: number,
  ) => Promise<string>;

  // Utilities
  logMessage: (message: string) => void;
  setDiscoveredDevices: React.Dispatch<React.SetStateAction<BluetoothDevice[]>>;

  // Characteristic UUIDs (for advanced usage)
  writeServiceUUID: string;
  writeCharUUID: string;
  readCharUUID: string;
}

// Create context
const BluetoothContext = createContext<BluetoothContextType | undefined>(
  undefined,
);

// Provider component
export const BluetoothProvider = ({ children }: { children: ReactNode }) => {
  // Use the simplified BLE connection hook with auto-reconnect enabled
  const bleConnection = useBleConnection({
    onConnectionChange: (connected, deviceId) => {
      console.log(
        `[Context] Connection changed: ${connected ? "Connected" : "Disconnected"} - ${deviceId}`,
      );
    },
    onLogMessage: (message) => {
      // Can add additional logging handling here if needed
    },
    enableAutoReconnect: true, // Enable background auto-reconnection
  });

  // Enhanced connectToDevice that saves device to vehicle
  const connectToDeviceWithVehicle = async (
    device: BluetoothDevice,
    vehicleId?: string,
  ): Promise<boolean> => {
    try {
      bleConnection.logMessage(`Connecting to ${device.name || device.id}...`);

      // Connect to the device
      const success = await bleConnection.connectToDevice(device);

      if (success) {
        bleConnection.logMessage(
          `✅ Successfully connected to ${device.name || device.id}`,
        );

        // If vehicleId provided, save device UUID to vehicle
        if (vehicleId) {
          try {
            bleConnection.logMessage(
              `💾 Associating device with vehicle ${vehicleId}`,
            );
            await firebaseService.updateVehicle(vehicleId, {
              obdUUID: device.id,
            });
            bleConnection.logMessage(`✅ Device associated with vehicle`);

            // Check for mileage update reminder (2 weeks)
            const user = firebaseService.getCurrentUser();
            if (user) {
              const vehicle = await firebaseService.getVehicleById(vehicleId);
              const lastMileageUpdate = vehicle?.lastMileageUpdate;
              if (
                !lastMileageUpdate ||
                Date.now() - lastMileageUpdate > 14 * 24 * 60 * 60 * 1000
              ) {
                Alert.alert(
                  "Mileage Update Needed",
                  "It's been over 2 weeks since you last updated your vehicle's mileage. Please update it now.",
                  [{ text: "OK" }],
                );
              }
            }
          } catch (error) {
            bleConnection.logMessage(
              `⚠️ Could not associate device with vehicle: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      }

      return success;
    } catch (error) {
      bleConnection.logMessage(
        `❌ Connection error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  };

  // Create context value with all BLE connection properties and methods
  const contextValue: BluetoothContextType = {
    // State
    isScanning: bleConnection.isScanning,
    isConnected: bleConnection.isConnected,
    deviceId: bleConnection.deviceId,
    deviceName: bleConnection.deviceName,
    plxDevice: bleConnection.plxDevice,
    discoveredDevices: bleConnection.discoveredDevices,
    rememberedDevice: bleConnection.rememberedDevice,
    previousDevices: bleConnection.previousDevices,
    isAutoReconnecting: bleConnection.isAutoReconnecting,
    log: bleConnection.log,

    // Characteristic UUIDs
    writeServiceUUID: bleConnection.writeServiceUUID,
    writeCharUUID: bleConnection.writeCharUUID,
    readCharUUID: bleConnection.readCharUUID,

    // Methods
    startScan: bleConnection.startScan,
    connectToDevice: connectToDeviceWithVehicle,
    disconnectDevice: bleConnection.disconnectDevice,
    connectToRememberedDevice: bleConnection.connectToRememberedDevice,
    forgetRememberedDevice: bleConnection.forgetRememberedDevice,
    loadPreviousDevices: bleConnection.loadPreviousDevices,
    attemptAutoReconnect: bleConnection.attemptAutoReconnect,
    sendCommand: bleConnection.sendCommand,
    logMessage: bleConnection.logMessage,
    setDiscoveredDevices: bleConnection.setDiscoveredDevices,
  };

  return (
    <BluetoothContext.Provider value={contextValue}>
      {children}
    </BluetoothContext.Provider>
  );
};

/**
 * Hook to access Bluetooth context
 * Must be used within BluetoothProvider
 */
export const useBluetooth = () => {
  const context = useContext(BluetoothContext);

  if (context === undefined) {
    throw new Error("useBluetooth must be used within a BluetoothProvider");
  }

  return context;
};
