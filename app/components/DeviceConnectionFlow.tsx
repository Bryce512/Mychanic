import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  Alert,
  Modal,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useBluetooth } from "../contexts/BluetoothContext";
import { colors } from "../theme/colors";
import { vehicleProfileStyles } from "../theme/styles/VehicleProfiles.styles";
import BluetoothDeviceSelector from "./BluetoothDeviceSelector";
import { ConnectionSpinner } from "./ConnectionSpinner";
import type { BluetoothDevice } from "../services/bleConnections";

export type DeviceConnectionAction = "addScanner" | "addVehicle";

interface DeviceConnectionFlowProps {
  visible: boolean;
  onClose: () => void;
  onConnectionSuccess?: (device: BluetoothDevice) => void;
  onActionSelected?: (
    action: DeviceConnectionAction,
    device: BluetoothDevice,
  ) => void;
  showActionSelector?: boolean;
  scanVIN?: () => Promise<any>;
  onVINScanned?: (vinData: any) => void;
}

export const DeviceConnectionFlow: React.FC<DeviceConnectionFlowProps> = ({
  visible,
  onClose,
  onConnectionSuccess,
  onActionSelected,
  showActionSelector = false,
  scanVIN,
  onVINScanned,
}) => {
  console.log("DeviceConnectionFlow: Rendered with visible=", visible);

  const bluetoothContext = useBluetooth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const styles = vehicleProfileStyles;

  // Flow states
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedDevice, setConnectedDevice] =
    useState<BluetoothDevice | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [isVINScanning, setIsVINScanning] = useState(false);
  const waitingForActionSelectorRef = useRef(false);

  // Log when internal state changes
  useEffect(() => {
    console.log("DeviceConnectionFlow: Internal state changed:", {
      showDeviceSelector,
      isConnecting,
      connectedDevice: connectedDevice?.name,
      showActions,
      isVINScanning,
      waitingForActionSelector: waitingForActionSelectorRef.current,
    });
  }, [
    showDeviceSelector,
    isConnecting,
    connectedDevice,
    showActions,
    isVINScanning,
  ]);

  // Handle device selection and connection
  const handleDeviceSelected = useCallback(
    async (device: BluetoothDevice): Promise<boolean> => {
      setIsConnecting(true);

      try {
        console.log("DeviceConnectionFlow: Connecting to device...");
        const connected = await bluetoothContext.connectToDevice(device);

        if (!connected) {
          setIsConnecting(false);
          Alert.alert("Error", "Failed to connect to OBD-II device");
          return false;
        }

        console.log("DeviceConnectionFlow: Device connected successfully");

        // Wait for connection to stabilize
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Hide spinner
        setIsConnecting(false);

        // Store device and close device selector
        setConnectedDevice(device);

        // If showing action selector, display it; otherwise close and notify parent
        if (showActionSelector) {
          console.log("DeviceConnectionFlow: Showing action selector");
          waitingForActionSelectorRef.current = true;
          setShowDeviceSelector(false);
          setShowActions(true);
        } else {
          console.log("DeviceConnectionFlow: Closing flow");
          // Notify parent only if not showing action selector (VehicleForm case)
          onConnectionSuccess?.(device);
          setShowDeviceSelector(false);
          handleClose();
        }

        return true;
      } catch (error) {
        console.error("Device connection error:", error);
        setIsConnecting(false);
        Alert.alert(
          "Error",
          "An error occurred while connecting to the device.",
        );
        return false;
      }
    },
    [bluetoothContext, showActionSelector],
  );

  // Handle action selection
  const handleAddScanner = () => {
    console.log("DeviceConnectionFlow: handleAddScanner called");
    if (connectedDevice && onActionSelected) {
      console.log(
        "DeviceConnectionFlow: Calling onActionSelected for addScanner",
      );
      onActionSelected("addScanner", connectedDevice);
      // Parent will handle closing DeviceConnectionFlow
    }
  };

  const handleAddVehicle = () => {
    console.log("DeviceConnectionFlow: handleAddVehicle called");
    if (connectedDevice && onActionSelected) {
      console.log(
        "DeviceConnectionFlow: Calling onActionSelected for addVehicle",
      );
      onActionSelected("addVehicle", connectedDevice);
      // Parent will handle closing DeviceConnectionFlow (or screen unmounts on navigation)
    }
  };

  // Handle VIN scanning for scanner association
  const handleScanVINForScanner = async () => {
    if (!scanVIN || !connectedDevice) return;

    console.log(
      "DeviceConnectionFlow: Starting VIN scan for scanner association",
    );
    setIsVINScanning(true);

    try {
      const scanPromise = scanVIN();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => {
          console.log("DeviceConnectionFlow: VIN scan timeout triggered!");
          reject(new Error("VIN scan timeout"));
        }, 3000),
      );
      const vehicleInfo = await Promise.race([scanPromise, timeoutPromise]);
      console.log("DeviceConnectionFlow: VIN scan completed:", vehicleInfo);

      setIsVINScanning(false);

      // Notify parent of VIN data
      if (onVINScanned) {
        onVINScanned({ device: connectedDevice, vehicleInfo });
      }
    } catch (error) {
      console.error("DeviceConnectionFlow: VIN scan error:", error);
      setIsVINScanning(false);

      // Notify parent even on error
      if (onVINScanned) {
        onVINScanned({ device: connectedDevice, vehicleInfo: null, error });
      }
    }
  };

  // Reset flow state
  const resetFlow = () => {
    console.log("DeviceConnectionFlow: resetFlow called");
    console.log("DeviceConnectionFlow: State before reset:", {
      showDeviceSelector,
      isConnecting,
      connectedDevice: connectedDevice?.name,
      showActions,
      isVINScanning,
    });
    setShowDeviceSelector(false);
    setShowActions(false);
    setConnectedDevice(null);
    setIsConnecting(false);
    setIsVINScanning(false);
    waitingForActionSelectorRef.current = false;
    onClose();
  };

  // Handle close
  const handleClose = () => {
    console.log("DeviceConnectionFlow: handleClose called");
    resetFlow();
  };

  // Show device selector when flow becomes visible
  React.useEffect(() => {
    if (visible) {
      console.log("DeviceConnectionFlow: visible changed to true");
      console.log("DeviceConnectionFlow: Internal state:", {
        showDeviceSelector,
        isConnecting,
        connectedDevice: connectedDevice?.name,
        showActions,
      });
      setShowDeviceSelector(true);
    } else {
      console.log("DeviceConnectionFlow: visible changed to false");
      console.log("DeviceConnectionFlow: Internal state before resetFlow:", {
        showDeviceSelector,
        isConnecting,
        connectedDevice: connectedDevice?.name,
        showActions,
      });
      resetFlow();
    }
  }, [visible, showActionSelector]);

  return (
    <>
      {/* Device Selector Modal */}
      <BluetoothDeviceSelector
        visible={showDeviceSelector}
        onClose={() => {
          console.log(
            "DeviceConnectionFlow: BluetoothDeviceSelector onClose called - user dismissed without selecting",
          );
          console.log(
            "DeviceConnectionFlow: BluetoothDeviceSelector close state:",
            {
              showActionSelector,
              showDeviceSelector,
              connectedDevice: connectedDevice?.name,
              showActions,
              waitingForActionSelector: waitingForActionSelectorRef.current,
            },
          );
          setShowDeviceSelector(false);
          // Only skip handleClose if we're waiting to show action selector
          if (!waitingForActionSelectorRef.current) {
            console.log(
              "DeviceConnectionFlow: Not waiting for action selector, calling handleClose",
            );
            handleClose();
          } else {
            console.log(
              "DeviceConnectionFlow: Waiting for action selector, NOT calling handleClose",
            );
            waitingForActionSelectorRef.current = false;
          }
        }}
        devices={bluetoothContext.discoveredDevices}
        onSelectDevice={handleDeviceSelected}
        isScanning={bluetoothContext.isScanning}
        onScanAgain={bluetoothContext.startScan}
        connectedDeviceId={bluetoothContext.deviceId}
        connectedDeviceName={bluetoothContext.deviceName}
        onDisconnect={async () => {
          console.log(
            "DeviceConnectionFlow: onDisconnect called, closing flow",
          );
          await bluetoothContext.disconnectDevice();
          handleClose();
        }}
      />

      {/* Connection Spinner Modal */}
      <ConnectionSpinner visible={isConnecting} />

      {/* Action Selector Modal (optional) */}
      {showActionSelector && (
        <Modal
          visible={showActions}
          transparent
          animationType="fade"
          onDismiss={() => {
            console.log(
              "DeviceConnectionFlow: Action selector modal onDismiss triggered",
            );
          }}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0, 0, 0, 0.5)",
            }}
          >
            <View
              style={{
                width: "85%",
                backgroundColor: isDark ? colors.gray[800] : "white",
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? colors.gray[700] : "#eee",
                }}
              >
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "bold",
                    color: isDark ? colors.white : colors.gray[900],
                  }}
                >
                  {isVINScanning
                    ? "Scanning VIN..."
                    : "What would you like to do?"}
                </Text>
                {!isVINScanning && (
                  <TouchableOpacity onPress={handleClose}>
                    <Feather
                      name="x"
                      size={24}
                      color={isDark ? colors.gray[400] : "#6b7280"}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {isVINScanning ? (
                <View style={{ padding: 40, alignItems: "center" }}>
                  <ActivityIndicator size="large" color={colors.primary[500]} />
                  <Text
                    style={{
                      marginTop: 16,
                      fontSize: 16,
                      color: isDark ? colors.gray[400] : "#6b7280",
                    }}
                  >
                    Scanning for VIN...
                  </Text>
                </View>
              ) : (
                <View style={{ padding: 16 }}>
                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 20,
                      backgroundColor: isDark ? colors.gray[700] : "#f9fafb",
                      borderRadius: 12,
                      marginBottom: 12,
                    }}
                    onPress={handleScanVINForScanner}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: colors.primary[100],
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 16,
                      }}
                    >
                      <Feather
                        name="bluetooth"
                        size={24}
                        color={colors.primary[500]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: "600",
                          color: isDark ? colors.white : colors.gray[900],
                          marginBottom: 4,
                        }}
                      >
                        Add Scanner
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          color: isDark ? colors.gray[400] : "#6b7280",
                        }}
                      >
                        Connect to an existing vehicle
                      </Text>
                    </View>
                    <Feather
                      name="chevron-right"
                      size={20}
                      color={isDark ? colors.gray[400] : "#9ca3af"}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 20,
                      backgroundColor: isDark ? colors.gray[700] : "#f9fafb",
                      borderRadius: 12,
                      marginBottom: 12,
                    }}
                    onPress={handleAddVehicle}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: colors.green[100],
                        alignItems: "center",
                        justifyContent: "center",
                        marginRight: 16,
                      }}
                    >
                      <Feather
                        name="truck"
                        size={24}
                        color={colors.green[500]}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 18,
                          fontWeight: "600",
                          color: isDark ? colors.white : colors.gray[900],
                          marginBottom: 4,
                        }}
                      >
                        Add Vehicle
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          color: isDark ? colors.gray[400] : "#6b7280",
                        }}
                      >
                        Create a new vehicle then add the scanner
                      </Text>
                    </View>
                    <Feather
                      name="chevron-right"
                      size={20}
                      color={isDark ? colors.gray[400] : "#9ca3af"}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}
    </>
  );
};
