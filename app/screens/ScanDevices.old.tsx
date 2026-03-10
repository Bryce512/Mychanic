/* eslint-disable no-bitwise */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  SafeAreaView,
  StyleSheet,
  PermissionsAndroid,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import {
  Button,
  Surface,
  Text,
  Divider,
  List,
  IconButton,
  Card,
} from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "@react-navigation/native";
import { useNavigation, useTheme } from "@react-navigation/native";
import { obdDataFunctions } from "../services/obdService";
import BluetoothDeviceSelector from "../components/BluetoothDeviceSelector";
import { useBluetooth } from "../contexts/BluetoothContext";
import firebaseService from "../services/firebaseService";
import { scanDevicesStyles } from "../theme/styles/ScanDevices.styles";
import { colors } from "../theme/colors";

const ScanDevicesScreen = () => {
  // Check Bluetooth status before scanning
  const checkBluetoothAndStartScan = async () => {
    try {
      // If we get here, Bluetooth should be on
      console.log(
        "Bluetooth is on. Setting showDeviceSelector to true and starting scan.",
      );
      setShowDeviceSelector(true);
      setDiscoveredDevices([]);
      startScan();
    } catch (error) {
      if (error && typeof error === "object" && "message" in error) {
        console.error(
          `Error checking Bluetooth: ${(error as { message: string }).message}`,
        );
      } else {
        console.error(`Error checking Bluetooth: ${JSON.stringify(error)}`);
      }
    }
  };
  // Check Bluetooth status before scanning
  // (Removed duplicate checkBluetoothAndStartScan definition)

  const theme = useTheme();
  const navigation = useNavigation();
  const {
    voltage,
    isScanning,
    isConnected,
    deviceId,
    deviceName,
    discoveredDevices,
    setDiscoveredDevices,
    startScan,
    sendCommand,
    connectToDevice,
    disconnectDevice,
    robustReconnect,
    showAllDevices,
    verifyConnection,
    rememberedDevice,
    connectToRememberedDevice,
    fetchVoltage,
  } = useBluetooth();

  // Wrapper to support passing vehicleId to context connectToDevice
  function connectToDeviceWithVehicle(device: any, vehicleId: string | null) {
    // Pass device and vehicleId to context connectToDevice
    return connectToDevice(device, vehicleId ?? undefined);
  }

  // Local state for device selector modal
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  // const { getCurrentVoltage, getEngineRPM } = pidCommands();
  const [rpm, setRpm] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchData = async () => {
    console.log("Fetching data not enabled yet");
  };

  // Check Bluetooth status before scanning
  // (Removed duplicate checkBluetoothAndStartScan definition)

  // Main render
  return (
    <SafeAreaView style={scanDevicesStyles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.gray[50]} />

      <ScrollView showsVerticalScrollIndicator={false}>
        <Card style={scanDevicesStyles.connectionCard}>
          <Card.Content>
            <View style={scanDevicesStyles.connectionStatusRow}>
              <MaterialCommunityIcons
                name={isConnected ? "bluetooth-connect" : "bluetooth"}
                size={32}
                color={isConnected ? colors.primary[500] : colors.gray[500]}
              />
              <View style={scanDevicesStyles.connectionTextContainer}>
                <Text variant="titleMedium">
                  {isConnected ? "Connected" : "Not Connected"}
                </Text>
                {deviceName && (
                  <Text
                    variant="bodyMedium"
                    style={scanDevicesStyles.deviceName}
                  >
                    {deviceName}
                  </Text>
                )}
              </View>
            </View>

            <Divider style={scanDevicesStyles.divider} />

            <View style={scanDevicesStyles.buttonGrid}>
              {!isConnected ? (
                <Button
                  mode="contained"
                  onPress={checkBluetoothAndStartScan}
                  disabled={isScanning}
                  icon={({ size, color }) => (
                    <MaterialCommunityIcons
                      name="bluetooth"
                      size={size}
                      color={color}
                    />
                  )}
                  style={scanDevicesStyles.actionButton}
                >
                  {isScanning ? "Scanning..." : "Scan for Devices"}
                </Button>
              ) : (
                <>
                  <Button
                    mode="contained"
                    onPress={fetchData}
                    loading={refreshing}
                    icon={({ size, color }) => (
                      <MaterialCommunityIcons
                        name="refresh"
                        size={size}
                        color={color}
                      />
                    )}
                    style={scanDevicesStyles.actionButton}
                  >
                    {refreshing ? "Reading..." : "Read Data"}
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={disconnectDevice}
                    icon={({ size, color }) => (
                      <MaterialCommunityIcons
                        name="bluetooth-off"
                        size={size}
                        color={color}
                      />
                    )}
                    style={scanDevicesStyles.actionButton}
                  >
                    Disconnect
                  </Button>
                </>
              )}
            </View>
          </Card.Content>
        </Card>

        {isConnected && (
          <Card style={scanDevicesStyles.dataCard}>
            <Card.Title title="Vehicle Data" />
            <Divider />
            <Card.Content>
              <List.Item
                title="Battery Voltage"
                description={voltage || "Not available"}
                left={(props) => <List.Icon {...props} icon="car-battery" />}
              />
              <Divider style={scanDevicesStyles.itemDivider} />
              <List.Item
                title="Engine RPM"
                description={rpm || "Not available"}
                left={(props) => <List.Icon {...props} icon="engine" />}
              />
            </Card.Content>
          </Card>
        )}

        {isConnected && (
          <Card style={scanDevicesStyles.dataCard}>
            <Card.Title title="Battery Voltage" />
            <Card.Content>
              <View style={scanDevicesStyles.dataRow}>
                <MaterialCommunityIcons
                  name="battery"
                  size={24}
                  color={colors.primary[500]}
                />
                <Text style={scanDevicesStyles.dataValue}>
                  {refreshing ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.primary[500]}
                    />
                  ) : (
                    voltage + "V" || "N/A"
                  )}
                </Text>
              </View>

              <Button
                mode="contained"
                onPress={fetchVoltage}
                loading={refreshing}
                style={{ marginTop: 10 }}
              >
                Refresh Voltage
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* Import the device selector component */}
        <>
          {console.log(
            "Rendering BluetoothDeviceSelector. showDeviceSelector:",
            showDeviceSelector,
          )}
        </>
        <BluetoothDeviceSelector
          visible={showDeviceSelector}
          onClose={() => setShowDeviceSelector(false)}
          devices={discoveredDevices}
          onSelectDevice={(device) => connectToDeviceWithVehicle(device, null)}
          isScanning={isScanning}
          onScanAgain={startScan}
        />

        {/* Connection Status button */}
        <TouchableOpacity
          style={[scanDevicesStyles.debugButtonContainer, { bottom: 220 }]}
          onPress={() => {
            console.log(
              "Connection Status:",
              isConnected ? "Connected" : "Disconnected",
            );
            console.log("Device ID:", deviceId);
            console.log("Device Name:", deviceName);

            // Try to connect if not already connected
            if (!isConnected && rememberedDevice) {
              console.log("Attempting reconnection...");
              connectToRememberedDevice();
            }
          }}
        >
          <View style={scanDevicesStyles.debugButton}>
            <MaterialCommunityIcons name="information" size={20} color="#fff" />
            <Text style={scanDevicesStyles.debugButtonText}>
              Connection Status
            </Text>
          </View>
        </TouchableOpacity>

        {/* Test OBD Command button */}
        <TouchableOpacity
          style={[scanDevicesStyles.debugButton, { marginTop: 10 }]}
          onPress={async () => {
            if (!isConnected) {
              Alert.alert("Not Connected", "Please connect to a device first");
              return;
            }

            try {
              // Show a prompt to enter an OBD command
              Alert.prompt(
                "Test OBD Command",
                "Enter an OBD command (e.g., AT RV, 0100, etc.)",
                [
                  {
                    text: "Cancel",
                    style: "cancel",
                  },
                  {
                    text: "Send",
                    onPress: async (command) => {
                      if (!command) return;

                      try {
                        const response = await sendCommand(
                          command.trim(),
                          "53fc0537-e506-0bcf-81ec-e757067e9ed3",
                        );
                        Alert.alert(
                          "Response",
                          `Command: ${command}\n\nResponse: ${response}`,
                        );
                      } catch (err) {
                        Alert.alert(
                          "Command Error",
                          `Error sending command: ${
                            err instanceof Error ? err.message : String(err)
                          }`,
                        );
                      }
                    },
                  },
                ],
                "plain-text",
                "AT RV", // Default value
              );
            } catch (error) {
              console.error("Error with test command:", error);
            }
          }}
        >
          <View style={scanDevicesStyles.buttonContent}>
            <MaterialCommunityIcons name="console" size={20} color="#fff" />
            <Text style={scanDevicesStyles.buttonText}>Test Command</Text>
          </View>
        </TouchableOpacity>

        {/* Add diagnostic button to your UI */}
        <TouchableOpacity
          style={[scanDevicesStyles.debugButtonContainer, { bottom: 630 }]}
          onPress={async () => {
            try {
              if (isConnected && deviceId) {
                Alert.alert(
                  "Reset Connection",
                  "This will disconnect and attempt to reconnect with proper service discovery.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Reset Connection",
                      onPress: async () => {
                        // Disconnect
                        await disconnectDevice();

                        // Wait a moment
                        await new Promise((resolve) =>
                          setTimeout(resolve, 1000),
                        );

                        // Reconnect with clean state
                        if (rememberedDevice) {
                          const success = await connectToRememberedDevice();
                          if (success) {
                            Alert.alert(
                              "Reconnected",
                              "Connection has been re-established with proper service discovery.",
                              [{ text: "OK" }],
                            );
                          } else {
                            Alert.alert(
                              "Reconnection Failed",
                              "Could not reconnect to the device. Try scanning again.",
                              [{ text: "OK" }],
                            );
                          }
                        }
                      },
                    },
                  ],
                );
              } else {
                Alert.alert(
                  "Not Connected",
                  "Device is not currently connected",
                );
              }
            } catch (error) {
              console.error("Error during reset:", error);
            }
          }}
        >
          <View style={scanDevicesStyles.debugButton}>
            <MaterialCommunityIcons name="restart" size={20} color="#fff" />
            <Text style={scanDevicesStyles.debugButtonText}>
              Reset Connection
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ScanDevicesScreen;
