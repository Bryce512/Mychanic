"use client";

import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { useBluetooth } from "../contexts/BluetoothContext";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  NavigationProp,
  useIsFocused,
} from "@react-navigation/native";
import { RootStackParamList } from "../navigation/AppNavigator";
import { Feather } from "@expo/vector-icons";
import Button from "../components/Button";
import Card, { CardContent, CardHeader } from "../components/Card";
import { colors } from "../theme/colors";
import { vehicleProfileStyles } from "../theme/styles/VehicleProfiles.styles";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DEFAULT_IMAGE =
  "https://firebasestorage.googleapis.com/v0/b/fluid-tangent-405719.firebasestorage.app/o/public%2Fcar_default.png?alt=media&token=5232adad-a5f7-4b8c-be47-781163a7eaa1";
import firebaseService from "../services/firebaseService";
import { useDiagnostics } from "../contexts/VehicleDiagnosticsContext";
import { obdDataFunctions } from "../services/obdService";
import { Alert } from "react-native";

const VEHICLES_CACHE_KEY = "@MychanicApp:vehiclesCache";
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

interface CachedVehiclesData {
  vehicles: any[];
  timestamp: number;
}

export default function VehicleProfilesScreen() {
  // All hooks must be called unconditionally and in the same order on every render
  const diagnosticsContext = useDiagnostics();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState(0);
  const [loading, setLoading] = useState(true);
  const bluetoothContext = useBluetooth();
  const isFocused = useIsFocused();
  const styles = vehicleProfileStyles;
  const cacheRef = useRef<CachedVehiclesData | null>(null);

  // Check if cache is still valid
  const isCacheValid = (): boolean => {
    if (!cacheRef.current) return false;
    const now = Date.now();
    return now - cacheRef.current.timestamp < CACHE_DURATION;
  };

  // Fetch vehicles on focus or when Bluetooth connection status/device changes
  useEffect(() => {
    const fetchVehicles = async (forceRefresh = false) => {
      try {
        setLoading(true);
        const currentUser = firebaseService.getCurrentUser();

        if (!currentUser) {
          setVehicles([]);
          return;
        }

        // Check if we have valid cache and not forcing refresh
        if (!forceRefresh && isCacheValid() && cacheRef.current) {
          setVehicles(cacheRef.current.vehicles);
          setLoading(false);
          return;
        }

        // Try to load from AsyncStorage first (persistent cache)
        if (!forceRefresh) {
          try {
            const cachedData = await AsyncStorage.getItem(VEHICLES_CACHE_KEY);
            if (cachedData) {
              const parsed: CachedVehiclesData = JSON.parse(cachedData);
              if (isCacheValid()) {
                cacheRef.current = parsed;
                setVehicles(parsed.vehicles);
                setLoading(false);
                return;
              }
            }
          } catch (cacheError) {
            console.log("Cache read error (non-critical):", cacheError);
          }
        }

        // Fetch fresh data from Firebase
        const userVehicles = await firebaseService.getVehicles(currentUser.uid);
        setVehicles(userVehicles || []);

        // Save to cache
        const cacheData: CachedVehiclesData = {
          vehicles: userVehicles || [],
          timestamp: Date.now(),
        };
        cacheRef.current = cacheData;

        try {
          await AsyncStorage.setItem(
            VEHICLES_CACHE_KEY,
            JSON.stringify(cacheData)
          );
        } catch (cacheError) {
          console.log("Cache write error (non-critical):", cacheError);
        }

        // Reset selected vehicle if out of range
        if (
          userVehicles?.length > 0 &&
          selectedVehicle >= userVehicles.length
        ) {
          setSelectedVehicle(0);
        }
      } catch (error) {
        console.error("Error fetching vehicles:", error);
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    };

    if (isFocused) {
      // Use cached data initially, but check for updates
      fetchVehicles(false);
    }

    // Subscribe to auth changes to reload vehicles when user changes
    const unsubscribe = firebaseService.onAuthChange((user) => {
      if (user) {
        fetchVehicles(true); // Force refresh on auth change
      } else {
        setVehicles([]);
        cacheRef.current = null;
        AsyncStorage.removeItem(VEHICLES_CACHE_KEY);
      }
    });

    return () => unsubscribe();
    // Note: Don't include deviceId and isConnected in dependencies for vehicle fetching
    // They're only used for connection status display, not vehicle data
  }, [isFocused]);

  const handleViewJobDetails = (
    navigation: NavigationProp<RootStackParamList>
  ) => {
    navigation.navigate("JobDetails", {
      jobId: "hPqMoZXd5KTZASxe32FE",
    });
  };

  // Add loading state handling
  if (loading || diagnosticsContext.loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={isDark ? styles.textLight : undefined}>
            Loading vehicles...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Helper to determine if the connect alert should be shown for the selected vehicle
  const showConnectAlert = (() => {
    const { deviceId, isConnected } = bluetoothContext;
    if (!vehicles[selectedVehicle]) return false;
    const vehicle = vehicles[selectedVehicle];
    // Use the correct OBD UUID field (adjust if your DB uses a different field)
    const expectedUuid = vehicle.obdUUID || vehicle.obdScannerUuid;
    const vehicleIsConnected =
      isConnected && deviceId && expectedUuid && deviceId === expectedUuid;
    return !vehicleIsConnected;
  })();

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Vehicle List */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.vehicleListContainer}
          >
            {vehicles.map((vehicle, index) => {
              const { deviceId, isConnected } = bluetoothContext;
              const vehicleIsConnected =
                isConnected && deviceId === vehicle.obdUUID;
              return (
                <TouchableOpacity
                  key={vehicle.id}
                  onPress={() => setSelectedVehicle(index)}
                  style={[
                    styles.vehicleCard,
                    selectedVehicle === index && styles.selectedVehicleCard,
                    isDark && styles.vehicleCardDark,
                    selectedVehicle === index &&
                      isDark &&
                      styles.selectedVehicleCardDark,
                  ]}
                >
                  <View style={styles.vehicleCardHeader}>
                    <Text
                      style={[styles.vehicleName, isDark && styles.textLight]}
                    >
                      {vehicle.nickname || vehicle.model}
                    </Text>

                    <View
                      style={[
                        styles.connectionBadge,
                        vehicleIsConnected
                          ? styles.connectedBadge
                          : styles.notConnectedBadge,
                        isDark && styles.connectionBadgeDark,
                      ]}
                    >
                      {vehicleIsConnected ? (
                        <Feather
                          name="bluetooth"
                          size={14}
                          color={colors.green[500]}
                        />
                      ) : (
                        <Feather
                          name="bluetooth"
                          size={14}
                          color={isDark ? colors.gray[500] : colors.gray[400]}
                        />
                      )}
                    </View>
                  </View>

                  <Image
                    source={{ uri: vehicle.image || DEFAULT_IMAGE }}
                    style={styles.vehicleImage}
                    resizeMode="contain"
                  />

                  <View style={styles.vehicleStatus}>
                    <View style={styles.statusHeader}>
                      <Text
                        style={[
                          styles.statusLabel,
                          isDark && styles.textMutedLight,
                        ]}
                      >
                        Health Status
                      </Text>
                      <Text
                        style={[
                          styles.statusValue,
                          (() => {
                            // Calculate health status based on service averages
                            const diag =
                              diagnosticsContext.diagnostics[vehicle.id];
                            if (!diag) return styles.statusUnknown;

                            const oilRemaining =
                              diag.milesSinceLastOilChange &&
                              diag.milesBetweenOilChanges
                                ? Math.max(
                                    0,
                                    100 -
                                      Math.round(
                                        (diag.milesSinceLastOilChange /
                                          diag.milesBetweenOilChanges) *
                                          100
                                      )
                                  )
                                : 0;

                            const brakeRemaining =
                              diag.milesSinceLastBrakeService &&
                              diag.milesBetweenBrakeChanges
                                ? Math.max(
                                    0,
                                    100 -
                                      Math.round(
                                        (diag.milesSinceLastBrakeService /
                                          diag.milesBetweenBrakeChanges) *
                                          100
                                      )
                                  )
                                : 0;

                            const tireRemaining =
                              diag.milesSinceLastTireService &&
                              diag.milesBetweenTireService
                                ? Math.max(
                                    0,
                                    100 -
                                      Math.round(
                                        (diag.milesSinceLastTireService /
                                          diag.milesBetweenTireService) *
                                          100
                                      )
                                  )
                                : 0;

                            const services = [
                              oilRemaining,
                              brakeRemaining,
                              tireRemaining,
                            ];
                            const servicesBelow10 = services.filter(
                              (s) => s <= 10
                            ).length;
                            const servicesBelow30 = services.filter(
                              (s) => s <= 30
                            ).length;

                            if (servicesBelow10 > 0) return styles.statusPoor; // Red for "Needs Maintenance"
                            if (servicesBelow30 > 0) return styles.statusFair; // Yellow for "Fair"
                            return styles.statusGood; // Green for "Good"
                          })(),
                          isDark &&
                            vehicle.status === "Unknown" &&
                            styles.textMutedLight,
                        ]}
                      >
                        {(() => {
                          // Calculate health status text based on service averages
                          const diag =
                            diagnosticsContext.diagnostics[vehicle.id];
                          if (!diag) return "Unknown";

                          const oilRemaining =
                            diag.milesSinceLastOilChange &&
                            diag.milesBetweenOilChanges
                              ? Math.max(
                                  0,
                                  100 -
                                    Math.round(
                                      (diag.milesSinceLastOilChange /
                                        diag.milesBetweenOilChanges) *
                                        100
                                    )
                                )
                              : 0;

                          const brakeRemaining =
                            diag.milesSinceLastBrakeService &&
                            diag.milesBetweenBrakeChanges
                              ? Math.max(
                                  0,
                                  100 -
                                    Math.round(
                                      (diag.milesSinceLastBrakeService /
                                        diag.milesBetweenBrakeChanges) *
                                        100
                                    )
                                )
                              : 0;

                          const tireRemaining =
                            diag.milesSinceLastTireService &&
                            diag.milesBetweenTireService
                              ? Math.max(
                                  0,
                                  100 -
                                    Math.round(
                                      (diag.milesSinceLastTireService /
                                        diag.milesBetweenTireService) *
                                        100
                                    )
                                )
                              : 0;

                          const services = [
                            oilRemaining,
                            brakeRemaining,
                            tireRemaining,
                          ];
                          const servicesBelow10 = services.filter(
                            (s) => s <= 10
                          ).length;
                          const servicesBelow30 = services.filter(
                            (s) => s <= 30
                          ).length;

                          if (servicesBelow10 > 0) return "Needs Maintenance";
                          if (servicesBelow30 > 0) return "Fair";
                          return "Good";
                        })()}
                      </Text>
                    </View>

                    <View style={styles.progressBarContainer}>
                      <View
                        style={[
                          styles.progressBar,
                          {
                            width: `${(() => {
                              // Calculate average health percentage
                              const diag =
                                diagnosticsContext.diagnostics[vehicle.id];
                              if (!diag) return "0";

                              const oilRemaining =
                                diag.milesSinceLastOilChange &&
                                diag.milesBetweenOilChanges
                                  ? Math.max(
                                      0,
                                      100 -
                                        Math.round(
                                          (diag.milesSinceLastOilChange /
                                            diag.milesBetweenOilChanges) *
                                            100
                                        )
                                    )
                                  : 0;

                              const brakeRemaining =
                                diag.milesSinceLastBrakeService &&
                                diag.milesBetweenBrakeChanges
                                  ? Math.max(
                                      0,
                                      100 -
                                        Math.round(
                                          (diag.milesSinceLastBrakeService /
                                            diag.milesBetweenBrakeChanges) *
                                            100
                                        )
                                    )
                                  : 0;

                              const tireRemaining =
                                diag.milesSinceLastTireService &&
                                diag.milesBetweenTireService
                                  ? Math.max(
                                      0,
                                      100 -
                                        Math.round(
                                          (diag.milesSinceLastTireService /
                                            diag.milesBetweenTireService) *
                                            100
                                        )
                                    )
                                  : 0;

                              const averageHealth = Math.round(
                                (oilRemaining +
                                  brakeRemaining +
                                  tireRemaining) /
                                  3
                              );
                              return averageHealth;
                            })()}%`,
                          },
                          (() => {
                            // Calculate progress bar color
                            const diag =
                              diagnosticsContext.diagnostics[vehicle.id];
                            if (!diag) return styles.progressUnknown;

                            const oilRemaining =
                              diag.milesSinceLastOilChange &&
                              diag.milesBetweenOilChanges
                                ? Math.max(
                                    0,
                                    100 -
                                      Math.round(
                                        (diag.milesSinceLastOilChange /
                                          diag.milesBetweenOilChanges) *
                                          100
                                      )
                                  )
                                : 0;

                            const brakeRemaining =
                              diag.milesSinceLastBrakeService &&
                              diag.milesBetweenBrakeChanges
                                ? Math.max(
                                    0,
                                    100 -
                                      Math.round(
                                        (diag.milesSinceLastBrakeService /
                                          diag.milesBetweenBrakeChanges) *
                                          100
                                      )
                                  )
                                : 0;

                            const tireRemaining =
                              diag.milesSinceLastTireService &&
                              diag.milesBetweenTireService
                                ? Math.max(
                                    0,
                                    100 -
                                      Math.round(
                                        (diag.milesSinceLastTireService /
                                          diag.milesBetweenTireService) *
                                          100
                                      )
                                  )
                                : 0;

                            const services = [
                              oilRemaining,
                              brakeRemaining,
                              tireRemaining,
                            ];
                            const servicesBelow10 = services.filter(
                              (s) => s <= 10
                            ).length;
                            const servicesBelow30 = services.filter(
                              (s) => s <= 30
                            ).length;

                            if (servicesBelow10 > 0) return styles.progressPoor;
                            if (servicesBelow30 > 0) return styles.progressFair;
                            return styles.progressGood;
                          })(),
                        ]}
                      />
                    </View>

                    <View style={styles.vehicleFooter}>
                      {vehicle.obdUUID ? (
                        <View style={styles.syncInfo}>
                          <Feather
                            name="clock"
                            size={12}
                            color={isDark ? colors.gray[400] : colors.gray[500]}
                          />
                          <Text
                            style={[
                              styles.syncText,
                              isDark && styles.textMutedLight,
                            ]}
                          >
                            Last sync:{" "}
                            {diagnosticsContext.diagnostics[vehicle.id]
                              ?.lastSync
                              ? new Date(
                                  diagnosticsContext.diagnostics[
                                    vehicle.id
                                  ].lastSync
                                ).toLocaleString()
                              : "-"}
                          </Text>
                        </View>
                      ) : !isConnected ? (
                        <View style={styles.syncInfo}>
                          <Feather
                            name="alert-triangle"
                            size={12}
                            color={isDark ? colors.gray[400] : colors.gray[500]}
                          />
                          <Text
                            style={[
                              styles.syncText,
                              isDark && styles.textMutedLight,
                            ]}
                          >
                            Connect OBD-II for diagnostics
                          </Text>
                        </View>
                      ) : null}

                      {vehicle.alerts > 0 && (
                        <View style={styles.alertInfo}>
                          <Feather
                            name="alert-triangle"
                            size={12}
                            color={colors.yellow[500]}
                          />
                          <Text style={styles.alertText}>
                            {vehicle.alerts} alert
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[
                styles.addVehicleCard,
                isDark && styles.addVehicleCardDark,
              ]}
              onPress={() => navigation.navigate("AddVehicle")}
            >
              <Feather
                name="plus-circle"
                size={40}
                color={isDark ? colors.gray[400] : colors.gray[500]}
              />
              <Text
                style={[styles.addVehicleText, isDark && styles.textMutedLight]}
              >
                Add Vehicle
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Vehicle Details */}
          {vehicles.length > 0 ? (
            <Card style={styles.detailsCard}>
              <CardHeader style={styles.detailsCardHeader}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <View>
                    <Text
                      style={[styles.detailsTitle, isDark && styles.textLight]}
                    >
                      {vehicles[selectedVehicle].nickname ||
                        vehicles[selectedVehicle].model}
                    </Text>
                    <Text
                      style={[
                        styles.detailsMileage,
                        isDark && styles.textMutedLight,
                      ]}
                    >
                      {vehicles[selectedVehicle].mileage} miles
                    </Text>
                  </View>
                  <Feather
                    name="edit-2"
                    size={22}
                    color={isDark ? colors.white : colors.primary[500]}
                    style={{ marginLeft: 12 }}
                    onPress={() => {
                      const userId = firebaseService.getCurrentUser()?.uid;
                      if (userId) {
                        navigation.navigate("EditVehicleInfo", {
                          vehicle: vehicles[selectedVehicle],
                          userId,
                        });
                      }
                    }}
                  />
                </View>
                <View>
                  <Feather
                    name="share"
                    size={22}
                    color={isDark ? colors.white : colors.primary[500]}
                    style={{ marginRight: 12 }}
                    onPress={() => {
                      navigation.navigate("ShareVehicle" as never)
                    }}
                  />
                </View>
              </CardHeader>

              <CardContent style={styles.detailsCardContent}>
                {/* Only show alert if NOT connected */}
                {showConnectAlert && (
                  <View
                    style={[styles.alertCard, isDark && styles.alertCardDark]}
                  >
                    <Feather
                      name="alert-triangle"
                      size={20}
                      color={colors.yellow[500]}
                    />
                    <View style={styles.alertCardContent}>
                      <Text
                        style={[
                          styles.alertCardTitle,
                          isDark && styles.textLight,
                        ]}
                      >
                        Connect OBD-II for Enhanced Features
                      </Text>
                      <Text
                        style={[
                          styles.alertCardText,
                          isDark && styles.textMutedLight,
                        ]}
                      >
                        Connect your vehicle to an OBD-II scanner to unlock
                        real-time diagnostics, predictive maintenance, and share
                        data with mechanics for better service.
                      </Text>
                      <Button
                        title="Connect Now"
                        onPress={() =>
                          navigation.navigate("ScanDevices" as never)
                        }
                        size="sm"
                        style={styles.alertCardButton}
                      />
                    </View>
                  </View>
                )}
                <View>
                  <Card style={styles.diagnosticsCard}>
                    <CardHeader style={styles.diagnosticsCardHeader}>
                      <Text
                        style={[
                          styles.diagnosticsTitle,
                          isDark && styles.textLight,
                        ]}
                      >
                        Diagnostic Summary
                      </Text>
                      <Button
                        title="Live Data"
                        onPress={() => navigation.navigate("LiveData")}
                        variant="outline"
                        size="sm"
                        style={styles.viewDetailsButton}
                        icon={
                          <Feather
                            name="activity"
                            size={12}
                            color={isDark ? colors.white : colors.primary[500]}
                          />
                        }
                      />
                    </CardHeader>
                    <CardContent>
                      <View style={styles.diagnosticsGrid}>
                        {vehicles[selectedVehicle] &&
                        diagnosticsContext.diagnostics[
                          vehicles[selectedVehicle].id
                        ] ? (
                          <>
                            {/* Oil Life */}
                            <View style={styles.progressHeader}>
                              <Feather
                                name="droplet"
                                size={16}
                                color={(() => {
                                  const vehicle = vehicles[selectedVehicle];

                                  // Check if there's no service history data
                                  const hasOilData =
                                    vehicle.lastOilChange &&
                                    vehicle.milesAtLastOilChange !== undefined;

                                  if (!hasOilData) {
                                    return colors.gray[500];
                                  }

                                  const milesSince =
                                    diagnosticsContext.diagnostics[
                                      vehicles[selectedVehicle].id
                                    ].milesSinceLastOilChange;
                                  const milesBetween =
                                    diagnosticsContext.diagnostics[
                                      vehicles[selectedVehicle].id
                                    ].milesBetweenOilChanges;
                                  const remaining =
                                    milesSince && milesBetween
                                      ? Math.max(
                                          0,
                                          100 -
                                            Math.round(
                                              (milesSince / milesBetween) * 100
                                            )
                                        )
                                      : 0;
                                  return remaining > 25
                                    ? colors.green[500]
                                    : remaining > 10
                                    ? colors.yellow[500]
                                    : colors.red[500];
                                })()}
                              />
                              <Text
                                style={[
                                  styles.progressLabel,
                                  isDark && styles.textMutedLight,
                                ]}
                              >
                                Oil Life
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.progressBarContainer,
                                isDark && styles.progressBarContainerDark,
                              ]}
                            >
                              {(() => {
                                const milesSince =
                                  diagnosticsContext.diagnostics[
                                    vehicles[selectedVehicle].id
                                  ].milesSinceLastOilChange;
                                const milesBetween =
                                  diagnosticsContext.diagnostics[
                                    vehicles[selectedVehicle].id
                                  ].milesBetweenOilChanges;
                                const vehicle = vehicles[selectedVehicle];

                                // Check if there's no service history data
                                const hasOilData =
                                  vehicle.lastOilChange &&
                                  vehicle.milesAtLastOilChange !== undefined;

                                if (!hasOilData) {
                                  return (
                                    <Text
                                      style={[
                                        styles.progressBarText,
                                        isDark && styles.progressBarTextDark,
                                        { color: colors.gray[500] },
                                      ]}
                                    >
                                      Please enter mileage
                                    </Text>
                                  );
                                }

                                const remaining = Math.max(
                                  0,
                                  100 -
                                    Math.round(
                                      (milesSince / milesBetween) * 100
                                    )
                                );
                                const barWidth = remaining < 5 ? 3 : remaining;
                                const barColor =
                                  remaining > 25
                                    ? colors.green[500]
                                    : remaining > 10
                                    ? colors.yellow[500]
                                    : colors.red[500];
                                const textColor =
                                  remaining < 55
                                    ? colors.gray[900]
                                    : isDark
                                    ? colors.white
                                    : colors.gray[900];

                                // Show specific messages for low progress
                                if (remaining <= 0) {
                                  const milesOverdue = Math.round(
                                    milesSince - milesBetween
                                  );
                                  return (
                                    <Text
                                      style={[
                                        styles.progressBarText,
                                        isDark && styles.progressBarTextDark,
                                        {
                                          color: colors.red[500],
                                          fontSize: 12,
                                        },
                                      ]}
                                    >
                                      {milesOverdue} miles overdue
                                    </Text>
                                  );
                                } else if (remaining < 5) {
                                  const milesUntilDue = Math.round(
                                    milesBetween - milesSince
                                  );
                                  return (
                                    <Text
                                      style={[
                                        styles.progressBarText,
                                        isDark && styles.progressBarTextDark,
                                        {
                                          color: colors.red[500],
                                          fontSize: 12,
                                        },
                                      ]}
                                    >
                                      Oil change due in {milesUntilDue} miles
                                    </Text>
                                  );
                                }

                                return (
                                  <>
                                    <View
                                      style={[
                                        styles.progressBar,
                                        {
                                          width: `${barWidth}%`,
                                          backgroundColor: barColor,
                                        },
                                      ]}
                                    />
                                    <Text
                                      style={[
                                        styles.progressBarText,
                                        isDark && styles.progressBarTextDark,
                                        { color: textColor },
                                      ]}
                                    >
                                      {remaining}%
                                    </Text>
                                  </>
                                );
                              })()}
                            </View>
                            {/* Brakes */}
                            <View style={styles.progressHeader}>
                              <Feather
                                name="alert-triangle"
                                size={16}
                                color={(() => {
                                  const vehicle = vehicles[selectedVehicle];

                                  // Check if there's no service history data
                                  const hasBrakeData =
                                    vehicle.lastBrakeService &&
                                    vehicle.milesAtLastBrakeService !==
                                      undefined;

                                  if (!hasBrakeData) {
                                    return colors.gray[500];
                                  }

                                  const milesSince =
                                    diagnosticsContext.diagnostics[
                                      vehicles[selectedVehicle].id
                                    ].milesSinceLastBrakeService;
                                  const milesBetween =
                                    diagnosticsContext.diagnostics[
                                      vehicles[selectedVehicle].id
                                    ].milesBetweenBrakeChanges;
                                  const remaining = Math.max(
                                    0,
                                    100 -
                                      Math.round(
                                        (milesSince / milesBetween) * 100
                                      )
                                  );
                                  return remaining > 25
                                    ? colors.green[500]
                                    : remaining > 10
                                    ? colors.yellow[500]
                                    : colors.red[500];
                                })()}
                              />
                              <Text
                                style={[
                                  styles.progressLabel,
                                  isDark && styles.textMutedLight,
                                ]}
                              >
                                Brakes
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.progressBarContainer,
                                isDark && styles.progressBarContainerDark,
                              ]}
                            >
                              {(() => {
                                const milesSince =
                                  diagnosticsContext.diagnostics[
                                    vehicles[selectedVehicle].id
                                  ].milesSinceLastBrakeService;
                                const milesBetween =
                                  diagnosticsContext.diagnostics[
                                    vehicles[selectedVehicle].id
                                  ].milesBetweenBrakeChanges;
                                const vehicle = vehicles[selectedVehicle];

                                // Check if there's no service history data
                                const hasBrakeData =
                                  vehicle.lastBrakeService &&
                                  vehicle.milesAtLastBrakeService !== undefined;

                                if (!hasBrakeData) {
                                  return (
                                    <Text
                                      style={[
                                        styles.progressBarText,
                                        isDark && styles.progressBarTextDark,
                                        { color: colors.gray[500] },
                                      ]}
                                    >
                                      Please enter mileage
                                    </Text>
                                  );
                                }

                                const remaining = Math.max(
                                  0,
                                  100 -
                                    Math.round(
                                      (milesSince / milesBetween) * 100
                                    )
                                );
                                const barWidth = remaining < 5 ? 3 : remaining;
                                const barColor =
                                  remaining > 25
                                    ? colors.green[500]
                                    : remaining > 10
                                    ? colors.yellow[500]
                                    : colors.red[500];
                                const textColor =
                                  remaining < 55
                                    ? colors.gray[900]
                                    : isDark
                                    ? colors.white
                                    : colors.gray[900];

                                // Show specific messages for low progress
                                if (remaining <= 0) {
                                  const milesOverdue = Math.round(
                                    milesSince - milesBetween
                                  );
                                  return (
                                    <Text
                                      style={[
                                        styles.progressBarText,
                                        isDark && styles.progressBarTextDark,
                                        {
                                          color: colors.red[500],
                                          fontSize: 12,
                                        },
                                      ]}
                                    >
                                      {milesOverdue} miles overdue
                                    </Text>
                                  );
                                } else if (remaining < 5) {
                                  const milesUntilDue = Math.round(
                                    milesBetween - milesSince
                                  );
                                  return (
                                    <Text
                                      style={[
                                        styles.progressBarText,
                                        isDark && styles.progressBarTextDark,
                                        {
                                          color: colors.red[500],
                                          fontSize: 12,
                                        },
                                      ]}
                                    >
                                      Brake service due in {milesUntilDue} miles
                                    </Text>
                                  );
                                }

                                return (
                                  <>
                                    <View
                                      style={[
                                        styles.progressBar,
                                        {
                                          width: `${barWidth}%`,
                                          backgroundColor: barColor,
                                        },
                                      ]}
                                    />
                                    <Text
                                      style={[
                                        styles.progressBarText,
                                        isDark && styles.progressBarTextDark,
                                        { color: textColor },
                                      ]}
                                    >
                                      {remaining}%
                                    </Text>
                                  </>
                                );
                              })()}
                            </View>
                            {/* Tires */}
                            <View style={styles.progressHeader}>
                              <Feather
                                name="circle"
                                size={16}
                                color={(() => {
                                  const vehicle = vehicles[selectedVehicle];

                                  // Check if there's no service history data
                                  const hasTireData =
                                    vehicle.lastTireService &&
                                    vehicle.milesAtLastTireService !==
                                      undefined;

                                  if (!hasTireData) {
                                    return colors.gray[500];
                                  }

                                  const milesSince =
                                    diagnosticsContext.diagnostics[
                                      vehicles[selectedVehicle].id
                                    ].milesSinceLastTireService;
                                  const milesBetween =
                                    diagnosticsContext.diagnostics[
                                      vehicles[selectedVehicle].id
                                    ].milesBetweenTireService;
                                  const remaining = Math.max(
                                    0,
                                    100 -
                                      Math.round(
                                        (milesSince / milesBetween) * 100
                                      )
                                  );
                                  return remaining > 25
                                    ? colors.green[500]
                                    : remaining > 10
                                    ? colors.yellow[500]
                                    : colors.red[500];
                                })()}
                              />
                              <Text
                                style={[
                                  styles.progressLabel,
                                  isDark && styles.textMutedLight,
                                ]}
                              >
                                Tires
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.progressBarContainer,
                                isDark && styles.progressBarContainerDark,
                              ]}
                            >
                              {(() => {
                                const milesSince =
                                  diagnosticsContext.diagnostics[
                                    vehicles[selectedVehicle].id
                                  ].milesSinceLastTireService;
                                const milesBetween =
                                  diagnosticsContext.diagnostics[
                                    vehicles[selectedVehicle].id
                                  ].milesBetweenTireService;
                                const vehicle = vehicles[selectedVehicle];

                                // Check if there's no service history data
                                const hasTireData =
                                  vehicle.lastTireService &&
                                  vehicle.milesAtLastTireService !== undefined;

                                if (!hasTireData) {
                                  return (
                                    <Text
                                      style={[
                                        styles.progressBarText,
                                        isDark && styles.progressBarTextDark,
                                        { color: colors.gray[500] },
                                      ]}
                                    >
                                      Please enter mileage
                                    </Text>
                                  );
                                }

                                const remaining = Math.max(
                                  0,
                                  100 -
                                    Math.round(
                                      (milesSince / milesBetween) * 100
                                    )
                                );
                                const barWidth = remaining < 5 ? 3 : remaining;
                                const barColor =
                                  remaining > 25
                                    ? colors.green[500]
                                    : remaining > 10
                                    ? colors.yellow[500]
                                    : colors.red[500];
                                const textColor =
                                  remaining < 55
                                    ? colors.gray[900]
                                    : isDark
                                    ? colors.white
                                    : colors.gray[900];

                                // Show specific messages for low progress
                                if (remaining <= 0) {
                                  const milesOverdue = Math.round(
                                    milesSince - milesBetween
                                  );
                                  return (
                                    <Text
                                      style={[
                                        styles.progressBarText,
                                        isDark && styles.progressBarTextDark,
                                        {
                                          color: colors.red[500],
                                          fontSize: 12,
                                        },
                                      ]}
                                    >
                                      {milesOverdue} miles overdue
                                    </Text>
                                  );
                                } else if (remaining < 5) {
                                  const milesUntilDue = Math.round(
                                    milesBetween - milesSince
                                  );
                                  return (
                                    <Text
                                      style={[
                                        styles.progressBarText,
                                        isDark && styles.progressBarTextDark,
                                        {
                                          color: colors.red[500],
                                          fontSize: 12,
                                        },
                                      ]}
                                    >
                                      Tire service due in {milesUntilDue} miles
                                    </Text>
                                  );
                                }

                                return (
                                  <>
                                    <View
                                      style={[
                                        styles.progressBar,
                                        {
                                          width: `${barWidth}%`,
                                          backgroundColor: barColor,
                                        },
                                      ]}
                                    />
                                    <Text
                                      style={[
                                        styles.progressBarText,
                                        isDark && styles.progressBarTextDark,
                                        { color: textColor },
                                      ]}
                                    >
                                      {remaining}%
                                    </Text>
                                  </>
                                );
                              })()}
                            </View>
                          </>
                        ) : (
                          <Text style={styles.diagnosticText}>
                            No diagnostics available
                          </Text>
                        )}
                      </View>
                      <View style={styles.diagnosticsButtonContainer}>
                        <Button
                          title="All Diagnostics"
                          onPress={() =>
                            navigation.navigate("FullDiagnostics", {
                              vehicleId: vehicles[selectedVehicle].id,
                            })
                          }
                          style={styles.viewDetailsButton}
                          icon={
                            <Feather
                              name="arrow-right"
                              size={16}
                              color={colors.white}
                            />
                          }
                        />
                      </View>
                    </CardContent>
                  </Card>
                </View>
                <View style={styles.serviceInfo}>
                  <Card style={styles.infoCard}>
                    <CardHeader style={styles.infoCardHeader}>
                      <Text
                        style={[
                          styles.infoCardTitle,
                          isDark && styles.textLight,
                        ]}
                      >
                        Service Status
                      </Text>
                    </CardHeader>
                    <CardContent>
                      <View style={styles.serviceInfo}>
                        <View style={styles.serviceItem}>
                          <Text
                            style={[
                              styles.serviceLabel,
                              isDark && styles.textMutedLight,
                            ]}
                          >
                            Last Service
                          </Text>
                          <View style={styles.serviceDetail}>
                            <Feather
                              name="clock"
                              size={14}
                              color={
                                isDark ? colors.gray[400] : colors.gray[500]
                              }
                            />
                            <Text
                              style={[
                                styles.serviceText,
                                isDark && styles.textLight,
                              ]}
                            >
                              {(() => {
                                const vehicle = vehicles[selectedVehicle];
                                const serviceDates = [
                                  vehicle.lastOilChange,
                                  vehicle.lastBrakeService,
                                  vehicle.lastTireService,
                                ].filter((date) => date && date.trim() !== "");

                                if (serviceDates.length === 0)
                                  return "No service history";

                                // Find the most recent date
                                const sortedDates = serviceDates.sort(
                                  (a, b) =>
                                    new Date(b).getTime() -
                                    new Date(a).getTime()
                                );
                                return sortedDates[0];
                              })()}
                            </Text>
                          </View>
                        </View>

                        <Button
                          title="Schedule Service"
                          onPress={() =>
                            navigation.navigate("RequestJob" as never)
                          }
                          variant="outline"
                          icon={
                            <Feather
                              name="tool"
                              size={14}
                              color={
                                isDark ? colors.white : colors.primary[500]
                              }
                            />
                          }
                          style={styles.scheduleButton}
                        />
                      </View>
                    </CardContent>
                  </Card>
                </View>

                <View style={styles.infoCards}>
                  <Card style={styles.infoCard}>
                    <CardHeader style={styles.infoCardHeader}>
                      <Text
                        style={[
                          styles.infoCardTitle,
                          isDark && styles.textLight,
                        ]}
                      >
                        Vehicle Information
                      </Text>
                    </CardHeader>
                    <CardContent>
                      <View style={styles.infoGrid}>
                        <View style={styles.infoRow}>
                          <Text
                            style={[
                              styles.infoLabel,
                              isDark && styles.textMutedLight,
                            ]}
                          >
                            Year:
                          </Text>
                          <Text
                            style={[
                              styles.infoValue,
                              isDark && styles.textLight,
                            ]}
                          >
                            {vehicles[selectedVehicle]?.year || "-"}
                          </Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text
                            style={[
                              styles.infoLabel,
                              isDark && styles.textMutedLight,
                            ]}
                          >
                            Make:
                          </Text>
                          <Text
                            style={[
                              styles.infoValue,
                              isDark && styles.textLight,
                            ]}
                          >
                            {vehicles[selectedVehicle]?.make || "-"}
                          </Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text
                            style={[
                              styles.infoLabel,
                              isDark && styles.textMutedLight,
                            ]}
                          >
                            Model:
                          </Text>
                          <Text
                            style={[
                              styles.infoValue,
                              isDark && styles.textLight,
                            ]}
                          >
                            {vehicles[selectedVehicle]?.model || "-"}
                          </Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text
                            style={[
                              styles.infoLabel,
                              isDark && styles.textMutedLight,
                            ]}
                          >
                            Engine:
                          </Text>
                          <Text
                            style={[
                              styles.infoValue,
                              isDark && styles.textLight,
                            ]}
                          >
                            {vehicles[selectedVehicle]?.engine || "-"}
                          </Text>
                        </View>
                      </View>
                    </CardContent>
                  </Card>
                </View>
              </CardContent>
            </Card>
          ) : (
            <Card style={styles.detailsCard}>
              <CardContent style={styles.emptyStateContainer}>
                <Feather
                  name="truck"
                  size={64}
                  color={isDark ? colors.gray[400] : colors.gray[500]}
                />
                <Text
                  style={[styles.emptyStateText, isDark && styles.textLight]}
                >
                  No vehicles found
                </Text>
                <Text
                  style={[
                    styles.emptyStateSubText,
                    isDark && styles.textMutedLight,
                  ]}
                >
                  Add your first vehicle to track maintenance and diagnostics
                </Text>
                <Button
                  title="Add Your First Vehicle"
                  onPress={() => navigation.navigate("AddVehicle")}
                  style={{ marginTop: 20 }}
                />
              </CardContent>
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
