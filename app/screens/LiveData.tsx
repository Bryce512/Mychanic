import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useBluetooth } from "../contexts/BluetoothContext";
import { obdDataFunctions } from "../services/obdService";
import { obdDataFunctions as obdFunctions } from "../services/obdService";
import Card, { CardContent, CardHeader } from "../components/Card";
import LiveDataParameter from "../components/LiveDataParameter";
import { colors } from "../theme/colors";

interface LiveDataItem {
  id: string;
  label: string;
  value: string | number | null;
  unit: string;
  icon: string;
  color: string;
  priority: number; // Lower number = higher priority (shown first)
}

// Initialize live data structure
const initializeLiveData = (): LiveDataItem[] => [
  {
    id: "voltage",
    label: "Battery Voltage",
    value: null,
    unit: "V",
    icon: "battery",
    color: colors.green[500],
    priority: 1,
  },
  {
    id: "rpm",
    label: "Engine RPM",
    value: null,
    unit: "RPM",
    icon: "zap",
    color: colors.primary[500],
    priority: 2,
  },
  {
    id: "speed",
    label: "Vehicle Speed",
    value: null,
    unit: "km/h",
    icon: "activity",
    color: colors.accent[500],
    priority: 3,
  },
  {
    id: "coolantTemp",
    label: "Coolant Temperature",
    value: null,
    unit: "°C",
    icon: "thermometer",
    color: colors.red[500],
    priority: 4,
  },
  {
    id: "engineLoad",
    label: "Engine Load",
    value: null,
    unit: "%",
    icon: "cpu",
    color: colors.red[500],
    priority: 5,
  },
  {
    id: "throttlePosition",
    label: "Throttle Position",
    value: null,
    unit: "%",
    icon: "sliders",
    color: colors.yellow[500],
    priority: 6,
  },
  {
    id: "fuelLevel",
    label: "Fuel Level",
    value: null,
    unit: "%",
    icon: "droplet",
    color: colors.primary[300],
    priority: 7,
  },
  {
    id: "intakeTemp",
    label: "Intake Air Temperature",
    value: null,
    unit: "°C",
    icon: "wind",
    color: colors.gray[500],
    priority: 8,
  },
  {
    id: "manifoldPressure",
    label: "Manifold Pressure",
    value: null,
    unit: "kPa",
    icon: "gauge",
    color: colors.accent[700],
    priority: 9,
  },
];

export default function LiveDataScreen() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const bluetoothContext = useBluetooth();
  const [refreshing, setRefreshing] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

  // const pidService = pidCommands();

  // Initialize live data structure with all parameters shown
  const [liveData, setLiveData] = useState<LiveDataItem[]>(() =>
    initializeLiveData()
  );

  // Fetch all live data
  const fetchLiveData = async () => {
    const { plxDevice, isConnected } = bluetoothContext;

    if (!isConnected || !plxDevice) {
      Alert.alert("No Connection", "Please connect to an OBD-II device first.");
      return;
    }

    try {
      // Fetch voltage with enhanced error handling
      try {
        console.log("Sending voltage command...");
        const voltage = await obdDataFunctions.fetchVoltage(
          plxDevice,
          bluetoothContext.sendCommand,
          (message) => console.log(`[VOLTAGE] ${message}`)
        );
        console.log("Voltage raw response:", voltage);
        if (voltage) {
          const voltageValue = parseFloat(voltage);
          console.log("Parsed voltage value:", voltageValue);
          setLiveData((prevData) =>
            prevData.map((item) =>
              item.id === "voltage"
                ? { ...item, value: voltageValue.toFixed(1) }
                : item
            )
          );
        } else {
          console.log("Voltage returned null or invalid");
        }
      } catch (e) {
        console.log("Failed to fetch voltage:", e);
      }

      // Wait longer before next command (voltage needs more time to stabilize)
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Fetch RPM
      try {
        console.log("Sending RPM command...");
        const rpm = await obdDataFunctions.getEngineRPM(
          plxDevice,
          bluetoothContext.sendCommand
        );
        console.log("RPM raw response:", rpm);
        if (rpm && typeof rpm === "number") {
          console.log("Parsed RPM value:", rpm);
          setLiveData((prevData) =>
            prevData.map((item) =>
              item.id === "rpm" ? { ...item, value: Math.round(rpm) } : item
            )
          );
        }
      } catch (e) {
        console.log("Failed to fetch RPM:", e);
      }

      // Wait before next command
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Fetch vehicle speed
      try {
        console.log("Sending speed command...");
        const speed = await obdDataFunctions.getVehicleSpeed(
          plxDevice,
          bluetoothContext.sendCommand
        );
        console.log("Speed raw response:", speed);
        if (speed !== null) {
          console.log("Parsed speed value:", speed);
          setLiveData((prevData) =>
            prevData.map((item) =>
              item.id === "speed" ? { ...item, value: speed } : item
            )
          );
        }
      } catch (e) {
        console.log("Failed to fetch speed:", e);
      }

      // Wait before next command
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Fetch coolant temperature
      try {
        console.log("Sending coolant temperature command...");
        const coolantTemp = await obdDataFunctions.getCoolantTemperature(
          plxDevice,
          bluetoothContext.sendCommand
        );
        console.log("Coolant temp raw response:", coolantTemp);
        if (coolantTemp) {
          console.log("Parsed coolant temp value:", coolantTemp.celsius);
          setLiveData((prevData) =>
            prevData.map((item) =>
              item.id === "coolantTemp"
                ? { ...item, value: coolantTemp.celsius }
                : item
            )
          );
        }
      } catch (e) {
        console.log("Failed to fetch coolant temperature:", e);
      }

      // Wait before next command
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Fetch engine load
      try {
        console.log("Sending engine load command...");
        const engineLoad = await obdDataFunctions.getEngineLoad(
          plxDevice,
          bluetoothContext.sendCommand
        );
        console.log("Engine load raw response:", engineLoad);
        if (engineLoad !== null) {
          console.log("Parsed engine load value:", engineLoad);
          setLiveData((prevData) =>
            prevData.map((item) =>
              item.id === "engineLoad" ? { ...item, value: engineLoad } : item
            )
          );
        }
      } catch (e) {
        console.log("Failed to fetch engine load:", e);
      }

      // Wait before next command
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Fetch throttle position
      try {
        console.log("Sending throttle position command...");
        const throttlePos = await obdDataFunctions.getThrottlePosition(
          plxDevice,
          bluetoothContext.sendCommand
        );
        console.log("Throttle position raw response:", throttlePos);
        if (throttlePos !== null) {
          console.log("Parsed throttle position value:", throttlePos);
          setLiveData((prevData) =>
            prevData.map((item) =>
              item.id === "throttlePosition"
                ? { ...item, value: throttlePos }
                : item
            )
          );
        }
      } catch (e) {
        console.log("Failed to fetch throttle position:", e);
      }

      // Wait before next command
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Fetch fuel level
      try {
        console.log("Sending fuel level command...");
        const fuelLevel = await obdDataFunctions.getFuelLevel(
          plxDevice,
          bluetoothContext.sendCommand
        );
        console.log("Fuel level raw response:", fuelLevel);
        if (fuelLevel !== null) {
          console.log("Parsed fuel level value:", fuelLevel);
          setLiveData((prevData) =>
            prevData.map((item) =>
              item.id === "fuelLevel" ? { ...item, value: fuelLevel } : item
            )
          );
        }
      } catch (e) {
        console.log("Failed to fetch fuel level:", e);
      }

      // Wait before next command
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Fetch intake air temperature
      try {
        console.log("Sending intake air temperature command...");
        const intakeTemp = await obdDataFunctions.getIntakeAirTemperature(
          plxDevice,
          bluetoothContext.sendCommand
        );
        console.log("Intake temp raw response:", intakeTemp);
        if (intakeTemp) {
          console.log("Parsed intake temp value:", intakeTemp.celsius);
          setLiveData((prevData) =>
            prevData.map((item) =>
              item.id === "intakeTemp"
                ? { ...item, value: intakeTemp.celsius }
                : item
            )
          );
        }
      } catch (e) {
        console.log("Failed to fetch intake temperature:", e);
      }

      // Wait before next command
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Fetch manifold pressure
      try {
        console.log("Sending manifold pressure command...");
        const manifoldPressure = await obdDataFunctions.getManifoldPressure(
          plxDevice,
          bluetoothContext.sendCommand
        );
        console.log("Manifold pressure raw response:", manifoldPressure);
        if (manifoldPressure !== null) {
          console.log("Parsed manifold pressure value:", manifoldPressure);
          setLiveData((prevData) =>
            prevData.map((item) =>
              item.id === "manifoldPressure"
                ? { ...item, value: manifoldPressure }
                : item
            )
          );
        }
      } catch (e) {
        console.log("Failed to fetch manifold pressure:", e);
      }
    } catch (error) {
      console.error("Error fetching live data:", error);
      // Don't show alert to user, just log the error
    }
  };

  // Handle manual refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Small delay to ensure UI updates properly
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check connection status before fetching
      const { plxDevice, isConnected } = bluetoothContext;
      if (!isConnected || !plxDevice) {
        console.log("No connection available for refresh");
        return;
      }

      await fetchLiveData();
    } catch (error) {
      console.log("Error during refresh:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Start/stop auto-polling
  const togglePolling = () => {
    if (isPolling) {
      // Stop polling
      if (pollInterval) {
        clearInterval(pollInterval);
        setPollInterval(null);
      }
      setIsPolling(false);
    } else {
      // Start polling every 5 seconds (increased due to voltage command timing)
      const interval = setInterval(fetchLiveData, 5000);
      setPollInterval(interval);
      setIsPolling(true);
      fetchLiveData(); // Initial fetch
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pollInterval]);

  // Stop polling when screen loses focus
  useFocusEffect(
    useCallback(() => {
      return () => {
        if (pollInterval) {
          clearInterval(pollInterval);
          setPollInterval(null);
          setIsPolling(false);
        }
      };
    }, [pollInterval])
  );

  // Set up navigation header
  useEffect(() => {
    navigation.setOptions({
      headerTitle: "Live Data",
      headerRight: () => (
        <TouchableOpacity
          onPress={togglePolling}
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginRight: 16,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 6,
            backgroundColor: isPolling ? colors.red[500] : colors.green[500],
          }}
        >
          <Feather
            name={isPolling ? "pause" : "play"}
            size={16}
            color={colors.white}
            style={{ marginRight: 4 }}
          />
          <Text
            style={{ color: colors.white, fontSize: 12, fontWeight: "600" }}
          >
            {isPolling ? "Stop" : "Start"}
          </Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, isPolling, togglePolling]);

  // Sort data by priority (most important first)
  const sortedData = liveData.sort((a, b) => a.priority - b.priority);

  // Separate data into primary (top 4) and secondary
  const primaryData = sortedData.slice(0, 4);
  const secondaryData = sortedData.slice(4);

  return (
    <SafeAreaView style={[styles.container, isDark && styles.containerDark]}
    edges={['bottom','left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.content}>
          {/* Connection Status */}
          <Card
            style={
              isDark
                ? { ...styles.statusCard, ...styles.cardDark }
                : styles.statusCard
            }
          >
            <CardContent style={styles.statusContent}>
              <View style={styles.statusRow}>
                <Feather
                  name={
                    bluetoothContext.isConnected ? "check-circle" : "x-circle"
                  }
                  size={20}
                  color={
                    bluetoothContext.isConnected
                      ? colors.green[500]
                      : colors.red[500]
                  }
                />
                <Text style={[styles.statusText, isDark && styles.textLight]}>
                  {bluetoothContext.isConnected
                    ? "Connected to OBD-II Device"
                    : "Not Connected"}
                </Text>
              </View>
              {bluetoothContext.deviceName && (
                <Text style={[styles.deviceName, isDark && styles.textMuted]}>
                  {bluetoothContext.deviceName}
                </Text>
              )}
            </CardContent>
          </Card>

          {/* Primary Data Grid */}
          <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
            Essential Parameters
          </Text>
          <View style={styles.primaryGrid}>
            {primaryData.map((item) => (
              <LiveDataParameter
                key={item.id}
                label={item.label}
                value={item.value}
                unit={item.unit}
                icon={item.icon}
                color={item.color}
                isLarge={true}
              />
            ))}
          </View>

          {/* Secondary Data List */}
          <Text style={[styles.sectionTitle, isDark && styles.textLight]}>
            Additional Parameters
          </Text>
          <Card
            style={
              isDark
                ? { ...styles.listCard, ...styles.cardDark }
                : styles.listCard
            }
          >
            <CardContent>
              {secondaryData.map((item) => (
                <LiveDataParameter
                  key={item.id}
                  label={item.label}
                  value={item.value}
                  unit={item.unit}
                  icon={item.icon}
                  color={item.color}
                  isLarge={false}
                />
              ))}
            </CardContent>
          </Card>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={[styles.instructionText, isDark && styles.textMuted]}>
              Pull down to refresh • Use Start/Stop to toggle auto-refresh every
              5 seconds
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gray[50],
  },
  containerDark: {
    backgroundColor: colors.gray[900],
  },
  content: {
    padding: 16,
  },
  statusCard: {
    marginBottom: 16,
  },
  cardDark: {
    backgroundColor: colors.gray[800],
  },
  statusContent: {
    padding: 16,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: colors.gray[900],
  },
  textLight: {
    color: colors.white,
  },
  deviceName: {
    marginTop: 4,
    fontSize: 14,
    color: colors.gray[600],
  },
  textMuted: {
    color: colors.gray[400],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.gray[900],
    marginBottom: 12,
    marginTop: 8,
  },
  primaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  dataCard: {
    width: "48%",
    marginBottom: 12,
  },
  dataContent: {
    padding: 16,
    alignItems: "center",
  },
  dataHeader: {
    marginBottom: 8,
  },
  dataValue: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 4,
  },
  valueText: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.gray[900],
  },
  unitText: {
    fontSize: 14,
    marginLeft: 4,
    color: colors.gray[600],
  },
  labelText: {
    fontSize: 12,
    textAlign: "center",
    color: colors.gray[600],
  },
  listCard: {
    marginBottom: 24,
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  listItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  listItemBorderDark: {
    borderBottomColor: colors.gray[700],
  },
  listItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  listLabel: {
    marginLeft: 12,
    fontSize: 16,
    color: colors.gray[900],
  },
  listItemRight: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  listValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.gray[900],
  },
  listUnit: {
    fontSize: 14,
    marginLeft: 4,
    color: colors.gray[600],
  },
  instructions: {
    alignItems: "center",
    marginTop: 16,
  },
  instructionText: {
    fontSize: 14,
    textAlign: "center",
    color: colors.gray[500],
  },
});
