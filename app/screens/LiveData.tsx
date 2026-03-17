import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
import { useOBDEngine } from "../hooks/useOBDEngine";
import Card, { CardContent } from "../components/Card";
import LiveDataParameter from "../components/LiveDataParameter";
import { colors } from "../theme/colors";
import type { ParsedPIDResult } from "../services/obd/pidParser";

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
    icon: "wind",
    color: colors.accent[700],
    priority: 9,
  },
];

export default function LiveDataScreen() {
  const navigation = useNavigation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const bluetoothContext = useBluetooth();
  const obdEngine = useOBDEngine(
    bluetoothContext.plxDevice,
    bluetoothContext.sendCommand,
    { autoInitialize: true },
  );

  const [refreshing, setRefreshing] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  // Initialize live data structure with all parameters shown
  const [liveData, setLiveData] = useState<LiveDataItem[]>(() =>
    initializeLiveData(),
  );

  // Core PIDs to query (memoized to prevent unnecessary re-renders)
  const CORE_PIDS = useMemo(
    () => [
      "ATRV", // Voltage (not a standard PID but commonly supported)
      "010C", // RPM
      "010D", // Speed
      "0105", // Coolant Temp
      "0104", // Engine Load
      "0111", // Throttle Position
      "012F", // Fuel Level
      "010F", // Intake Air Temp
      "010B", // Manifold Pressure
    ],
    [],
  );

  // Fetch live data using batch query (more efficient)
  const fetchLiveData = async () => {
    const { plxDevice, isConnected } = bluetoothContext;

    if (!isConnected || !plxDevice) {
      // Silently fail when device disconnected during polling - don't show alert
      // Only stop polling and return
      if (pollingRef.current.active) {
        pollingRef.current.active = false;
        if (pollingRef.current.timeoutId) {
          clearTimeout(pollingRef.current.timeoutId);
          pollingRef.current.timeoutId = null;
        }
        setIsPolling(false);
        console.log("[LiveData] Polling stopped - device disconnected");
      }
      return;
    }

    try {
      // Initialize engine if needed
      if (!obdEngine.isInitialized) {
        console.log("[LiveData] Initializing OBD engine...");
        const initialized = await obdEngine.initialize();
        if (!initialized) {
          Alert.alert("Connection Error", "Failed to initialize OBD engine");
          return;
        }
      }

      // Callback that updates state after each PID completes
      const updateForPID = (
        pidCode: string,
        result: ParsedPIDResult | null,
      ) => {
        setLiveData((prevData) => {
          const getPIDValue = (): string | number | null => {
            if (!result || !("value" in result)) {
              return null;
            }
            const value = result.value as number;

            // Apply PID-specific formatting
            switch (pidCode) {
              case "010C":
                return Math.round(value); // RPM
              case "010D":
              case "0105":
              case "0104":
              case "0111":
              case "012F":
              case "010F":
              case "010B":
                return value;
              case "ATRV":
                return parseFloat(value.toString()).toFixed(1); // Voltage
              default:
                return value;
            }
          };

          // Map PIDs to live data items
          return prevData.map((item) => {
            if (pidCode === "ATRV" && item.id === "voltage") {
              return { ...item, value: getPIDValue() };
            } else if (pidCode === "010C" && item.id === "rpm") {
              return { ...item, value: getPIDValue() };
            } else if (pidCode === "010D" && item.id === "speed") {
              return { ...item, value: getPIDValue() };
            } else if (pidCode === "0105" && item.id === "coolantTemp") {
              return { ...item, value: getPIDValue() };
            } else if (pidCode === "0104" && item.id === "engineLoad") {
              return { ...item, value: getPIDValue() };
            } else if (pidCode === "0111" && item.id === "throttlePosition") {
              return { ...item, value: getPIDValue() };
            } else if (pidCode === "012F" && item.id === "fuelLevel") {
              return { ...item, value: getPIDValue() };
            } else if (pidCode === "010F" && item.id === "intakeTemp") {
              return { ...item, value: getPIDValue() };
            } else if (pidCode === "010B" && item.id === "manifoldPressure") {
              return { ...item, value: getPIDValue() };
            }
            return item;
          });
        });
      };

      // Batch query all PIDs at once with incremental updates
      console.log("[LiveData] Querying PIDs:", CORE_PIDS);
      await obdEngine.queryMultiplePIDsWithCallback(CORE_PIDS, updateForPID);
    } catch (error) {
      console.error("[LiveData] Error fetching live data:", error);
      // Don't show alert, just log
    }
  };

  // Handle manual refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const { plxDevice, isConnected } = bluetoothContext;
      if (!isConnected || !plxDevice) {
        console.log("[LiveData] No connection available for refresh");
        return;
      }

      await fetchLiveData();
    } catch (error) {
      console.log("[LiveData] Error during refresh:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Polling state and timer
  const pollingRef = useRef<{
    active: boolean;
    timeoutId: NodeJS.Timeout | null;
  }>({
    active: false,
    timeoutId: null,
  });

  // Start/stop auto-polling with incremental updates
  const togglePolling = useCallback(() => {
    const { isConnected } = bluetoothContext;

    if (pollingRef.current.active) {
      // Stop polling
      pollingRef.current.active = false;
      if (pollingRef.current.timeoutId) {
        clearTimeout(pollingRef.current.timeoutId);
        pollingRef.current.timeoutId = null;
      }
      setIsPolling(false);
      console.log("[LiveData] Stopping polling");
    } else {
      // Check device is connected before starting
      if (!isConnected) {
        Alert.alert(
          "No Connection",
          "Please connect to an OBD-II device first.",
        );
        return;
      }

      // Start polling
      pollingRef.current.active = true;
      setIsPolling(true);
      console.log("[LiveData] Starting polling with incremental updates");

      const poll = async () => {
        if (!pollingRef.current.active) return;

        try {
          await fetchLiveData();
        } catch (error) {
          console.log("[LiveData] Polling error:", error);
        }

        // Schedule next poll only if still active (200ms interval)
        if (pollingRef.current.active) {
          pollingRef.current.timeoutId = setTimeout(poll, 200);
        }
      };

      // Start first poll
      poll();
    }
  }, []);

  // Test VIN retrieval
  const testVIN = async () => {
    const { isConnected } = bluetoothContext;

    if (!isConnected || !obdEngine.engine) {
      Alert.alert("No Connection", "Please connect to an OBD-II device first.");
      return;
    }

    console.log("[LiveData] Testing VIN retrieval...");
    try {
      if (!obdEngine.isInitialized) {
        const initialized = await obdEngine.initialize();
        if (!initialized) {
          Alert.alert("Error", "Failed to initialize OBD engine");
          return;
        }
      }

      const vin = await obdEngine.getVIN();
      if (vin) {
        console.log("[LiveData] ✅ VIN retrieved:", vin);
        Alert.alert("VIN Retrieved", `VIN: ${vin}`);
      } else {
        console.log("[LiveData] ❌ Failed to retrieve VIN");
        Alert.alert("VIN Test", "Failed to retrieve VIN from vehicle");
      }
    } catch (error) {
      console.log("[LiveData] ❌ VIN test error:", error);
      Alert.alert(
        "VIN Test Error",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  };

  // Test voltage retrieval
  const testVoltage = async () => {
    const { isConnected } = bluetoothContext;

    if (!isConnected || !obdEngine.engine) {
      Alert.alert("No Connection", "Please connect to an OBD-II device first.");
      return;
    }

    console.log("[LiveData] Testing ATRV (voltage)...");
    try {
      if (!obdEngine.isInitialized) {
        const initialized = await obdEngine.initialize();
        if (!initialized) {
          Alert.alert("Error", "Failed to initialize OBD engine");
          return;
        }
      }

      // Query voltage - this should return battery voltage
      // Log everything to debug the raw response
      console.log("[LiveData] Sending ATRV command...");
      const voltageResult = await obdEngine.queryPID("ATRV");

      if (voltageResult && "value" in voltageResult) {
        console.log(
          "[LiveData] ✅ Voltage retrieved:",
          voltageResult.value,
          voltageResult.unit,
        );
        Alert.alert(
          "Battery Voltage",
          `Voltage: ${voltageResult.value} ${voltageResult.unit}`,
        );
      } else {
        console.log(
          "[LiveData] ❌ Failed to parse voltage result:",
          voltageResult,
        );
        Alert.alert(
          "Voltage Test",
          "Adapter responded but could not parse voltage. Check console logs.",
        );
      }
    } catch (error) {
      console.log("[LiveData] ❌ Voltage test error:", error);
      Alert.alert(
        "Voltage Test Error",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  };

  // Test DTC retrieval
  const testDTC = async () => {
    const { isConnected } = bluetoothContext;

    if (!isConnected || !obdEngine.engine) {
      Alert.alert("No Connection", "Please connect to an OBD-II device first.");
      return;
    }

    console.log("[LiveData] Testing DTC scan...");
    try {
      if (!obdEngine.isInitialized) {
        const initialized = await obdEngine.initialize();
        if (!initialized) {
          Alert.alert("Error", "Failed to initialize OBD engine");
          return;
        }
      }

      const dtcs = await obdEngine.getActiveDTCs();
      if (dtcs.length > 0) {
        console.log(`[LiveData] ✅ Found ${dtcs.length} DTC(s):`, dtcs);
        const dtcList = dtcs
          .map((d) => `${d.code}: ${d.description}`)
          .join("\n");
        Alert.alert(`DTCs Found (${dtcs.length})`, dtcList, [{ text: "OK" }], {
          cancelable: true,
        });
      } else {
        console.log("[LiveData] ✅ No DTCs found");
        Alert.alert(
          "No DTCs",
          "No diagnostic trouble codes found. Vehicle is healthy!",
        );
      }
    } catch (error) {
      console.log("[LiveData] ❌ DTC test error:", error);
      Alert.alert(
        "DTC Test Error",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  };

  // Stop polling when screen loses focus
  useFocusEffect(
    useCallback(() => {
      // This callback runs when screen comes into focus
      console.log("[LiveData] Screen focused");

      // Return a cleanup function that runs when screen loses focus
      return () => {
        console.log("[LiveData] Screen blurred - stopping polling");
        if (pollingRef.current.active) {
          pollingRef.current.active = false;
          if (pollingRef.current.timeoutId) {
            clearTimeout(pollingRef.current.timeoutId);
            pollingRef.current.timeoutId = null;
          }
          setIsPolling(false);
        }
      };
    }, []),
  );

  // Set up navigation header with polling button
  useEffect(() => {
    navigation.setOptions({
      headerTitle: "Live Data",
      headerRight: () => (
        <TouchableOpacity onPress={togglePolling}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Feather
              name={isPolling ? "pause" : "play"}
              size={16}
              color={colors.primary[500]}
              style={{ marginRight: 4 }}
            />
            <Text
              style={{
                color: colors.primary[500],
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              {isPolling ? "Stop" : "Start"}
            </Text>
          </View>
        </TouchableOpacity>
      ),
    });
  }, [navigation, isPolling, togglePolling]);

  // Sort data by priority (most important first)
  const sortedData = liveData.sort(
    (a: LiveDataItem, b: LiveDataItem) => a.priority - b.priority,
  );

  // Separate data into primary (top 4) and secondary
  const primaryData = sortedData.slice(0, 4);
  const secondaryData = sortedData.slice(4);

  return (
    <SafeAreaView
      style={[styles.container, isDark && styles.containerDark]}
      edges={["bottom", "left", "right"]}
    >
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

          {/* Test Buttons */}
          {bluetoothContext.isConnected && (
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              <TouchableOpacity
                style={[styles.testVinButton, { flex: 1 }]}
                onPress={testVoltage}
              >
                <Feather name="battery" size={16} color={colors.green[500]} />
                <Text style={styles.testVinButtonText}>Test Voltage</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.testVinButton, { flex: 1 }]}
                onPress={testVIN}
              >
                <Feather name="info" size={16} color={colors.primary[500]} />
                <Text style={styles.testVinButtonText}>Test VIN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.testVinButton, { flex: 1 }]}
                onPress={testDTC}
              >
                <Feather
                  name="alert-circle"
                  size={16}
                  color={colors.yellow[500]}
                />
                <Text style={styles.testVinButtonText}>Test DTC</Text>
              </TouchableOpacity>
            </View>
          )}

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
              Pull down to refresh • New OBD Engine with optimized batch
              querying
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
  testVinButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary[50],
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.primary[200],
    gap: 8,
  },
  testVinButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary[500],
  },
});
