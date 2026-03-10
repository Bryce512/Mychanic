/**
 * Bluetooth Context - Simplified
 * Provides Bluetooth connection state management across the app
 * Uses simplified bleConnections service
 */
import React, { createContext, useContext, ReactNode } from "react";
import { Alert } from "react-native";
import { useBleConnection } from "../services/bleConnections";
import { Device } from "react-native-ble-plx";
import type { BluetoothDevice } from "../services/bleConnections";
import firebaseService from "../services/firebaseService";
import { createOBDService } from "../services/obdService";

// VIN scan result type
export interface VINScanResult {
  vin?: string;
  year?: string;
  make?: string;
  model?: string;
  deviceId: string;
}

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

  // VIN scanning methods
  scanDeviceForVIN: (device: BluetoothDevice) => Promise<VINScanResult | null>;

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
  // Use the simplified BLE connection hook
  const bleConnection = useBleConnection({
    onConnectionChange: (connected, deviceId) => {
      console.log(
        `[Context] Connection changed: ${connected ? "Connected" : "Disconnected"} - ${deviceId}`,
      );
    },
    onLogMessage: (message) => {
      // Can add additional logging handling here if needed
    },
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

  // Scan device for VIN and decode vehicle information
  const scanDeviceForVIN = async (
    device: BluetoothDevice,
  ): Promise<VINScanResult | null> => {
    try {
      // Connect to device
      const connected = await bleConnection.connectToDevice(device);

      if (!connected || !bleConnection.plxDevice) {
        bleConnection.logMessage("❌ Failed to connect to device for VIN scan");
        return null;
      }

      // Wait for connection to stabilize
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Create OBD service and get VIN
      const obdService = createOBDService(
        bleConnection.plxDevice,
        bleConnection.sendCommand,
        bleConnection.logMessage,
      );

      const vinFromOBD = await obdService.getVIN();

      if (!vinFromOBD) {
        bleConnection.logMessage("⚠️ VIN not available from OBD-II device");
        return { deviceId: device.id };
      }

      bleConnection.logMessage(`✅ VIN retrieved: ${vinFromOBD}`);

      // Decode VIN using NHTSA API
      const response = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vinFromOBD}?format=json`,
      );
      const data = await response.json();

      const vehicleInfo: VINScanResult = {
        vin: vinFromOBD,
        deviceId: device.id,
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

      bleConnection.logMessage(
        `✅ Vehicle decoded: ${vehicleInfo.year || ""} ${vehicleInfo.make || ""} ${vehicleInfo.model || ""}`.trim(),
      );

      return vehicleInfo;
    } catch (error) {
      bleConnection.logMessage(
        `❌ VIN scan error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
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
    sendCommand: bleConnection.sendCommand,
    logMessage: bleConnection.logMessage,
    setDiscoveredDevices: bleConnection.setDiscoveredDevices,

    // VIN scanning
    scanDeviceForVIN,
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
