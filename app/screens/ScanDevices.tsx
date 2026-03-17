/**
 * Scan Devices Screen - Professional DTC Scanner
 * Focused on OBD-II connection and diagnostic trouble code scanning
 */
import React, { useState } from "react";
import {
  View,
  ScrollView,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Alert,
  StyleSheet,
} from "react-native";
import {
  Button,
  Surface,
  Text,
  Card,
  Divider,
  IconButton,
  Chip,
  ActivityIndicator,
} from "react-native-paper";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useRoute, RouteProp } from "@react-navigation/native";
import { useBluetooth } from "../contexts/BluetoothContext";
import { useOBDEngine } from "../hooks/useOBDEngine";
import BluetoothDeviceSelector from "../components/BluetoothDeviceSelector";
import type { DiagnosticTroubleCode } from "../services/obd";
import { colors } from "../theme/colors";

type ScanDevicesRouteProp = RouteProp<
  { ScanDevices: { vehicleId?: string } },
  "ScanDevices"
>;

const ScanDevicesScreen = () => {
  const route = useRoute<ScanDevicesRouteProp>();
  const vehicleId = route.params?.vehicleId;

  // Bluetooth context
  const {
    isScanning,
    isConnected,
    deviceId,
    deviceName,
    discoveredDevices,
    plxDevice,
    startScan,
    connectToDevice,
    disconnectDevice,
    sendCommand,
    logMessage,
  } = useBluetooth();

  // OBD Engine hook
  const obdEngine = useOBDEngine(plxDevice, sendCommand, {
    autoInitialize: true,
  });

  // Local state
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [dtcCodes, setDtcCodes] = useState<DiagnosticTroubleCode[]>([]);
  const [isScanningDTC, setIsScanningDTC] = useState(false);
  const [voltage, setVoltage] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Scan for diagnostic trouble codes
  const scanForDTCs = async () => {
    if (!plxDevice || !isConnected) {
      Alert.alert("Not Connected", "Please connect to an OBD-II device first");
      return;
    }

    setIsScanningDTC(true);

    try {
      // Initialize engine if needed
      if (!obdEngine.isInitialized) {
        console.log("[ScanDevices] Initializing OBD engine...");
        const initialized = await obdEngine.initialize();
        if (!initialized) {
          Alert.alert("Connection Error", "Failed to initialize OBD engine");
          return;
        }
      }

      // Get active DTCs
      console.log("[ScanDevices] Scanning for DTCs...");
      const codes = await obdEngine.getActiveDTCs();
      setDtcCodes(codes);
      setLastScanTime(new Date());

      // Get voltage separately
      try {
        const voltageResult = await obdEngine.queryPID("ATRV");
        if (voltageResult?.value) {
          setVoltage(String(voltageResult.value));
        }
      } catch (error) {
        console.log("[ScanDevices] Voltage query failed (optional):", error);
      }

      if (codes.length === 0) {
        Alert.alert(
          "No Issues Found",
          "No diagnostic trouble codes detected. Your vehicle is operating normally.",
          [{ text: "OK" }],
        );
      }
    } catch (error) {
      Alert.alert(
        "Scan Failed",
        `Could not scan for trouble codes: ${error instanceof Error ? error.message : String(error)}`,
        [{ text: "OK" }],
      );
    } finally {
      setIsScanningDTC(false);
    }
  };

  // Clear all DTCs
  const clearDTCs = async () => {
    if (!plxDevice || !isConnected) {
      Alert.alert("Not Connected", "Please connect to an OBD-II device first");
      return;
    }

    Alert.alert(
      "Clear Trouble Codes",
      "This will clear all diagnostic trouble codes and reset the check engine light. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              if (!obdEngine.isInitialized) {
                const initialized = await obdEngine.initialize();
                if (!initialized) {
                  Alert.alert("Error", "Failed to initialize OBD engine");
                  return;
                }
              }

              console.log("[ScanDevices] Clearing DTCs...");
              const success = await obdEngine.clearDTCs();

              if (success) {
                setDtcCodes([]);
                Alert.alert(
                  "Success",
                  "Diagnostic trouble codes cleared successfully",
                );
              } else {
                Alert.alert(
                  "Failed",
                  "Could not clear diagnostic trouble codes",
                );
              }
            } catch (error) {
              Alert.alert(
                "Error",
                `Failed to clear codes: ${error instanceof Error ? error.message : String(error)}`,
              );
            }
          },
        },
      ],
    );
  };

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await scanForDTCs();
    setRefreshing(false);
  };

  // Handle device connection
  const handleDeviceConnection = async (device: any): Promise<boolean> => {
    try {
      const success = await connectToDevice(device, vehicleId);

      if (success) {
        // Connection successful, modal will auto-close
        logMessage(`✅ Successfully connected to ${device.name || device.id}`);
        if (vehicleId) {
          logMessage(`💾 Device associated with vehicle ${vehicleId}`);
        }
        return true;
      } else {
        // Connection failed
        Alert.alert(
          "Connection Failed",
          `Could not connect to ${device.name || device.id}. Please try again.`,
          [{ text: "OK" }],
        );
        return false;
      }
    } catch (error) {
      Alert.alert(
        "Connection Error",
        `Error connecting to device: ${error instanceof Error ? error.message : String(error)}`,
        [{ text: "OK" }],
      );
      return false;
    }
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return colors.error[500];
      case "warning":
        return colors.warning[500];
      case "info":
        return colors.info[500];
      default:
        return colors.gray[500];
    }
  };

  // Get severity icon
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return "alert-circle";
      case "warning":
        return "alert";
      case "info":
        return "information";
      default:
        return "help-circle";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.gray[50]} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            enabled={isConnected}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.headerTitle}>
            OBD-II Diagnostics
          </Text>
          <Text variant="bodyMedium" style={styles.headerSubtitle}>
            Scan for diagnostic trouble codes
          </Text>
          {vehicleId && !isConnected && (
            <Chip
              icon="car"
              style={styles.vehicleChip}
              textStyle={styles.vehicleChipText}
            >
              Connecting for this vehicle
            </Chip>
          )}
        </View>

        {/* Connection Status Card */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.connectionHeader}>
              <View style={styles.connectionIconContainer}>
                <MaterialCommunityIcons
                  name={isConnected ? "bluetooth-connect" : "bluetooth"}
                  size={40}
                  color={isConnected ? colors.primary[500] : colors.gray[400]}
                />
                {isConnected && (
                  <View style={styles.connectedBadge}>
                    <MaterialCommunityIcons
                      name="check"
                      size={16}
                      color="#fff"
                    />
                  </View>
                )}
              </View>

              <View style={styles.connectionInfo}>
                <Text variant="titleLarge" style={styles.connectionStatus}>
                  {isConnected ? "Connected" : "Disconnected"}
                </Text>
                {deviceName && (
                  <Text variant="bodyMedium" style={styles.deviceName}>
                    {deviceName}
                  </Text>
                )}
                {voltage && (
                  <View style={styles.voltageContainer}>
                    <MaterialCommunityIcons
                      name="battery"
                      size={16}
                      color={colors.gray[600]}
                    />
                    <Text variant="bodySmall" style={styles.voltageText}>
                      {voltage}V
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <Divider style={styles.divider} />

            {!isConnected ? (
              <Button
                mode="contained"
                onPress={() => {
                  setShowDeviceSelector(true);
                  startScan();
                }}
                disabled={isScanning}
                icon={({ size, color }) => (
                  <MaterialCommunityIcons
                    name="bluetooth-connect"
                    size={size}
                    color={color}
                  />
                )}
                style={styles.button}
              >
                {isScanning ? "Scanning..." : "Connect to Device"}
              </Button>
            ) : (
              <View style={styles.buttonRow}>
                <Button
                  mode="contained"
                  onPress={scanForDTCs}
                  disabled={isScanningDTC}
                  loading={isScanningDTC}
                  icon={({ size, color }) => (
                    <MaterialCommunityIcons
                      name="magnify"
                      size={size}
                      color={color}
                    />
                  )}
                  style={[styles.button, styles.buttonFlex]}
                >
                  {isScanningDTC ? "Scanning..." : "Scan for DTCs"}
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
                  style={styles.disconnectButton}
                >
                  Disconnect
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* DTC Results */}
        {lastScanTime && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.dtcHeader}>
                <View>
                  <Text variant="titleLarge">Diagnostic Codes</Text>
                  <Text variant="bodySmall" style={styles.scanTime}>
                    Last scan: {lastScanTime.toLocaleTimeString()}
                  </Text>
                </View>

                {dtcCodes.length > 0 && (
                  <Chip
                    icon={({ size, color }) => (
                      <MaterialCommunityIcons
                        name="alert-circle"
                        size={size}
                        color={color}
                      />
                    )}
                    style={[
                      styles.dtcCountChip,
                      { backgroundColor: colors.error[100] },
                    ]}
                    textStyle={{ color: colors.error[700] }}
                  >
                    {dtcCodes.length} {dtcCodes.length === 1 ? "Code" : "Codes"}
                  </Chip>
                )}
              </View>

              <Divider style={styles.divider} />

              {dtcCodes.length === 0 ? (
                <View style={styles.noDtcContainer}>
                  <MaterialCommunityIcons
                    name="check-circle"
                    size={64}
                    color={colors.success[500]}
                  />
                  <Text variant="titleMedium" style={styles.noDtcTitle}>
                    No Issues Found
                  </Text>
                  <Text variant="bodyMedium" style={styles.noDtcText}>
                    Your vehicle is operating normally with no diagnostic
                    trouble codes detected.
                  </Text>
                </View>
              ) : (
                <>
                  {dtcCodes.map((dtc, index) => (
                    <Surface key={index} style={styles.dtcCard} elevation={1}>
                      <View style={styles.dtcCardHeader}>
                        <View
                          style={[
                            styles.severityBadge,
                            { backgroundColor: getSeverityColor(dtc.severity) },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={getSeverityIcon(dtc.severity)}
                            size={20}
                            color="#fff"
                          />
                        </View>

                        <View style={styles.dtcCodeContainer}>
                          <Text variant="titleMedium" style={styles.dtcCode}>
                            {dtc.code}
                          </Text>
                          <Chip
                            style={styles.severityChip}
                            textStyle={styles.severityChipText}
                          >
                            {dtc.severity.toUpperCase()}
                          </Chip>
                        </View>
                      </View>

                      <Text variant="bodyMedium" style={styles.dtcDescription}>
                        {dtc.description}
                      </Text>
                    </Surface>
                  ))}

                  <Button
                    mode="outlined"
                    onPress={clearDTCs}
                    icon={({ size, color }) => (
                      <MaterialCommunityIcons
                        name="broom"
                        size={size}
                        color={color}
                      />
                    )}
                    style={styles.clearButton}
                    textColor={colors.error[500]}
                  >
                    Clear All Codes
                  </Button>
                </>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Info Card */}
        {!isConnected && (
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.infoContainer}>
                <MaterialCommunityIcons
                  name="information"
                  size={32}
                  color={colors.info[500]}
                />
                <View style={styles.infoTextContainer}>
                  <Text variant="titleMedium" style={styles.infoTitle}>
                    Getting Started
                  </Text>
                  <Text variant="bodyMedium" style={styles.infoText}>
                    1. Plug in your OBD-II scanner to your vehicle
                  </Text>
                  <Text variant="bodyMedium" style={styles.infoText}>
                    2. Turn on your vehicle's ignition
                  </Text>
                  <Text variant="bodyMedium" style={styles.infoText}>
                    3. Tap "Connect to Device" to start scanning
                  </Text>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      {/* Device Selector Modal */}
      <BluetoothDeviceSelector
        visible={showDeviceSelector}
        onClose={() => setShowDeviceSelector(false)}
        devices={discoveredDevices}
        onSelectDevice={handleDeviceConnection}
        isScanning={isScanning}
        onScanAgain={startScan}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontWeight: "bold",
    color: colors.gray[900],
  },
  headerSubtitle: {
    color: colors.gray[600],
    marginTop: 4,
  },
  vehicleChip: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: colors.primary[50],
  },
  vehicleChipText: {
    color: colors.primary[700],
    fontSize: 12,
  },
  card: {
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  connectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  connectionIconContainer: {
    position: "relative",
    marginRight: 16,
  },
  connectedBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: colors.success[500],
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  connectionInfo: {
    flex: 1,
  },
  connectionStatus: {
    fontWeight: "600",
    color: colors.gray[900],
  },
  deviceName: {
    color: colors.gray[600],
    marginTop: 2,
  },
  voltageContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  voltageText: {
    marginLeft: 4,
    color: colors.gray[600],
  },
  divider: {
    marginVertical: 16,
  },
  button: {
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  buttonFlex: {
    flex: 1,
  },
  disconnectButton: {
    minWidth: 120,
  },
  dtcHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  scanTime: {
    color: colors.gray[600],
    marginTop: 4,
  },
  dtcCountChip: {
    height: 32,
  },
  noDtcContainer: {
    alignItems: "center",
    paddingVertical: 32,
  },
  noDtcTitle: {
    marginTop: 16,
    fontWeight: "600",
    color: colors.success[700],
  },
  noDtcText: {
    marginTop: 8,
    textAlign: "center",
    color: colors.gray[600],
    paddingHorizontal: 16,
  },
  dtcCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  dtcCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  severityBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dtcCodeContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dtcCode: {
    fontWeight: "bold",
    fontFamily: "monospace",
    color: colors.gray[900],
  },
  severityChip: {
    height: 24,
  },
  severityChipText: {
    fontSize: 10,
    fontWeight: "600",
  },
  dtcDescription: {
    color: colors.gray[700],
    lineHeight: 20,
  },
  clearButton: {
    marginTop: 16,
    borderColor: colors.error[500],
  },
  infoContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  infoTitle: {
    fontWeight: "600",
    color: colors.gray[900],
    marginBottom: 8,
  },
  infoText: {
    color: colors.gray[700],
    marginBottom: 4,
    lineHeight: 20,
  },
});

export default ScanDevicesScreen;
