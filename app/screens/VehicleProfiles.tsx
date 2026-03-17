"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import DraggableFlatList, {
  ScaleDecorator,
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { useBluetooth } from "../contexts/BluetoothContext";
import { useVINScanning } from "../hooks/useOBDEngine";
import type { VINScanResult } from "../hooks/useOBDEngine";
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
import { Alert, Modal, FlatList, ActivityIndicator } from "react-native";
import {
  DeviceConnectionFlow,
  DeviceConnectionAction,
} from "../components/DeviceConnectionFlow";
import type { BluetoothDevice } from "../services/bleConnections";
import { vehicleDataService } from "../services/vehicleDataService";
import { transparent } from "react-native-paper/lib/typescript/styles/themes/v2/colors";

const VEHICLES_CACHE_KEY = "@MychanicApp:vehiclesCache";
const VEHICLE_ORDER_KEY = "@MychanicApp:vehicleOrder";
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
  const [cardHeight, setCardHeight] = useState(0);
  const bluetoothContext = useBluetooth();
  const isFocused = useIsFocused();
  const styles = vehicleProfileStyles;
  const cacheRef = useRef<CachedVehiclesData | null>(null);

  // VIN scanning state
  const [showConnectionFlow, setShowConnectionFlow] = useState(false);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [scannedVehicleData, setScannedVehicleData] = useState<any>(null);
  const [showActionSelector, setShowActionSelector] = useState(false);

  // Disconnect device state
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Initialize VIN scanning hook
  const { scanVIN, isScanning, error } = useVINScanning(
    bluetoothContext.plxDevice,
    bluetoothContext.sendCommand,
  );

  // Check if cache is still valid
  const isCacheValid = (): boolean => {
    if (!cacheRef.current) return false;
    const now = Date.now();
    return now - cacheRef.current.timestamp < CACHE_DURATION;
  };

  // Apply user-saved drag order to a vehicle list
  const applyVehicleOrder = async (list: any[]): Promise<any[]> => {
    try {
      const saved = await AsyncStorage.getItem(VEHICLE_ORDER_KEY);
      if (!saved) return list;
      const orderIds: string[] = JSON.parse(saved);
      const ordered = orderIds
        .map((id) => list.find((v) => v.id === id))
        .filter(Boolean);
      const unordered = list.filter((v) => !orderIds.includes(v.id));
      return [...ordered, ...unordered];
    } catch {
      return list;
    }
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
          setVehicles(await applyVehicleOrder(cacheRef.current.vehicles));
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
                setVehicles(await applyVehicleOrder(parsed.vehicles));
                setLoading(false);
                return;
              }
            }
          } catch (cacheError) {}
        }

        // Fetch fresh data from Firebase
        const userVehicles = await firebaseService.getVehicles(currentUser.uid);
        setVehicles(await applyVehicleOrder(userVehicles || []));

        // Save to cache
        const cacheData: CachedVehiclesData = {
          vehicles: userVehicles || [],
          timestamp: Date.now(),
        };
        cacheRef.current = cacheData;

        try {
          await AsyncStorage.setItem(
            VEHICLES_CACHE_KEY,
            JSON.stringify(cacheData),
          );
        } catch (cacheError) {}

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

  // Log modal state changes for debugging
  useEffect(() => {
    console.log("[VehicleProfiles] Modal state changed:", {
      showConnectionFlow,
      showVehicleSelector,
      showActionSelector,
    });
  }, [showConnectionFlow, showVehicleSelector, showActionSelector]);

  // Handle + button press - show connection flow
  const handleAddAction = () => {
    console.log("[VehicleProfiles] + button pressed");
    console.log("[VehicleProfiles] Current modal state before opening:", {
      showConnectionFlow,
      showVehicleSelector,
      showActionSelector,
    });
    setShowConnectionFlow(true);
  };

  // Handle VIN scan completion from DeviceConnectionFlow
  const handleVINScanned = async (result: {
    device: BluetoothDevice;
    vehicleInfo?: any;
    error?: any;
  }) => {
    console.log("[VehicleProfiles] handleVINScanned called:", result);

    // Store device ID and any available vehicle info
    const vehicleData: any = { deviceId: result.device.id };

    if (result.vehicleInfo) {
      vehicleData.vin = result.vehicleInfo.vin;
      vehicleData.year = result.vehicleInfo.year;
      vehicleData.make = result.vehicleInfo.make;
      vehicleData.model = result.vehicleInfo.model;
    }

    setScannedVehicleData(vehicleData);

    // Close the connection flow first to allow vehicle selector to show
    setShowConnectionFlow(false);

    // If VIN scanning failed, alert user but still show vehicle selector
    if (result.error || !result.vehicleInfo) {
      Alert.alert(
        "VIN Scanning Unavailable",
        "VIN retrieval failed. Please manually select which vehicle to associate with this scanner.",
        [
          {
            text: "OK",
            onPress: () => {
              setShowVehicleSelector(true);
            },
          },
        ],
      );
    } else {
      // VIN available, show vehicle selector directly
      setShowVehicleSelector(true);
    }
  };

  // Refresh vehicles helper
  const refreshVehicles = async () => {
    const currentUser = firebaseService.getCurrentUser();
    if (currentUser) {
      const userVehicles = await firebaseService.getVehicles(currentUser.uid);
      setVehicles(await applyVehicleOrder(userVehicles || []));
    }
  };

  // Check if the current vehicle's device is connected
  const isDeviceConnected =
    bluetoothContext.isConnected &&
    bluetoothContext.deviceId === vehicles[selectedVehicle]?.obdUUID;

  // Handle connecting to device
  const handleConnectDevice = async () => {
    setIsDisconnecting(true);
    try {
      const vehicle = vehicles[selectedVehicle];
      if (!vehicle || !vehicle.obdUUID) return;

      // Try to connect to the device
      const success = await bluetoothContext.connectToDevice(
        { id: vehicle.obdUUID } as any, // Type casting since we only need the ID
        vehicle.id,
      );

      if (success) {
        setShowDisconnectModal(false);
      } else {
        Alert.alert(
          "Error",
          "Failed to connect to device. Please ensure it's nearby and powered on.",
        );
      }
    } catch (error) {
      console.error("Error connecting to device:", error);
      Alert.alert("Error", "Failed to connect to device. Please try again.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Handle disconnecting from device (BLE only, no DB change)
  const handleDisconnectDevice = async () => {
    setIsDisconnecting(true);
    try {
      const vehicle = vehicles[selectedVehicle];
      if (!vehicle) return;

      // Disconnect from BLE if currently connected to this device
      if (
        bluetoothContext.isConnected &&
        bluetoothContext.deviceId === vehicle.obdUUID
      ) {
        await bluetoothContext.disconnectDevice();
      }

      setShowDisconnectModal(false);
    } catch (error) {
      console.error("Error disconnecting device:", error);
      Alert.alert("Error", "Failed to disconnect device. Please try again.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Handle removing device from vehicle (BLE disconnect + DB removal)
  const handleRemoveDeviceFromVehicle = async () => {
    setIsDisconnecting(true);
    try {
      const vehicle = vehicles[selectedVehicle];
      if (!vehicle) return;

      // Disconnect from BLE if currently connected to this device
      if (
        bluetoothContext.isConnected &&
        bluetoothContext.deviceId === vehicle.obdUUID
      ) {
        await bluetoothContext.disconnectDevice();
      }

      // Remove device ID from vehicle in database
      await firebaseService.updateVehicle(vehicle.id, {
        obdUUID: null,
      });

      setShowDisconnectModal(false);
      refreshVehicles();
    } catch (error) {
      console.error("Error removing device:", error);
      Alert.alert("Error", "Failed to remove device. Please try again.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Handle updating an existing vehicle with scanned data
  const handleUpdateExistingVehicle = async (vehicleId: string) => {
    setShowVehicleSelector(false);

    if (!scannedVehicleData) return;

    try {
      const updateData: any = {
        obdUUID: scannedVehicleData.deviceId,
      };

      // Only update vehicle info if VIN is available
      if (scannedVehicleData.vin) {
        updateData.vin = scannedVehicleData.vin;
        if (scannedVehicleData.year)
          updateData.year = parseInt(scannedVehicleData.year);
        if (scannedVehicleData.make) updateData.make = scannedVehicleData.make;
        if (scannedVehicleData.model)
          updateData.model = scannedVehicleData.model;
      }

      await firebaseService.updateVehicle(vehicleId, updateData);

      // Get updated vehicle info for feedback
      const updatedVehicle = vehicles.find((v) => v.id === vehicleId);
      const vehicleDescription =
        `${updatedVehicle?.year || ""} ${updatedVehicle?.make || ""} ${updatedVehicle?.model || ""}`.trim() ||
        "vehicle";

      Alert.alert(
        "Success",
        `Scanner successfully connected to your ${vehicleDescription}!`,
        [
          {
            text: "OK",
            onPress: () => {
              setScannedVehicleData(null);
              setShowConnectionFlow(false);
              // Refresh vehicles
              const fetchVehicles = async () => {
                const currentUser = firebaseService.getCurrentUser();
                if (currentUser) {
                  const userVehicles = await firebaseService.getVehicles(
                    currentUser.uid,
                  );
                  setVehicles(await applyVehicleOrder(userVehicles || []));
                }
              };
              fetchVehicles();
            },
          },
        ],
      );
    } catch (error) {
      console.error("Error updating vehicle:", error);
      Alert.alert("Error", "Failed to update vehicle. Please try again.");
    }
  };

  // Set navigation header button
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleAddAction} style={{ padding: 8 }}>
          <Feather name="plus" size={20} color={colors.primary[500]} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

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

  const renderVehicleItem = ({
    item: vehicle,
    drag,
    isActive,
    getIndex,
  }: RenderItemParams<any>) => {
    const { deviceId, isConnected } = bluetoothContext;
    const vehicleIsConnected = isConnected && deviceId === vehicle.obdUUID;
    const index = getIndex() ?? 0;
    return (
      <ScaleDecorator activeScale={0.85}>
        <TouchableOpacity
          onPress={() => setSelectedVehicle(index)}
          onLongPress={drag}
          disabled={isActive}
          onLayout={(e) => {
            if (cardHeight === 0) setCardHeight(e.nativeEvent.layout.height);
          }}
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
            <Text style={[styles.vehicleName, isDark && styles.textLight]}>
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
                <Feather name="bluetooth" size={14} color={colors.green[500]} />
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
                style={[styles.statusLabel, isDark && styles.textMutedLight]}
              >
                Health Status
              </Text>
              <Text
                style={[
                  styles.statusValue,
                  (() => {
                    const diag = diagnosticsContext.diagnostics[vehicle.id];
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
                                  100,
                              ),
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
                                  100,
                              ),
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
                                  100,
                              ),
                          )
                        : 0;
                    const services = [
                      oilRemaining,
                      brakeRemaining,
                      tireRemaining,
                    ];
                    if (services.filter((s) => s <= 10).length > 0)
                      return styles.statusPoor;
                    if (services.filter((s) => s <= 30).length > 0)
                      return styles.statusFair;
                    return styles.statusGood;
                  })(),
                  isDark &&
                    vehicle.status === "Unknown" &&
                    styles.textMutedLight,
                ]}
              >
                {(() => {
                  const diag = diagnosticsContext.diagnostics[vehicle.id];
                  if (!diag) return "Unknown";
                  const oilRemaining =
                    diag.milesSinceLastOilChange && diag.milesBetweenOilChanges
                      ? Math.max(
                          0,
                          100 -
                            Math.round(
                              (diag.milesSinceLastOilChange /
                                diag.milesBetweenOilChanges) *
                                100,
                            ),
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
                                100,
                            ),
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
                                100,
                            ),
                        )
                      : 0;
                  const services = [
                    oilRemaining,
                    brakeRemaining,
                    tireRemaining,
                  ];
                  if (services.filter((s) => s <= 10).length > 0)
                    return "Needs Maintenance";
                  if (services.filter((s) => s <= 30).length > 0) return "Fair";
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
                      const diag = diagnosticsContext.diagnostics[vehicle.id];
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
                                    100,
                                ),
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
                                    100,
                                ),
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
                                    100,
                                ),
                            )
                          : 0;
                      return Math.round(
                        (oilRemaining + brakeRemaining + tireRemaining) / 3,
                      );
                    })()}%`,
                  },
                  (() => {
                    const diag = diagnosticsContext.diagnostics[vehicle.id];
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
                                  100,
                              ),
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
                                  100,
                              ),
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
                                  100,
                              ),
                          )
                        : 0;
                    const services = [
                      oilRemaining,
                      brakeRemaining,
                      tireRemaining,
                    ];
                    if (services.filter((s) => s <= 10).length > 0)
                      return styles.progressPoor;
                    if (services.filter((s) => s <= 30).length > 0)
                      return styles.progressFair;
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
                    style={[styles.syncText, isDark && styles.textMutedLight]}
                  >
                    Last sync:{" "}
                    {diagnosticsContext.diagnostics[vehicle.id]?.lastSync
                      ? new Date(
                          diagnosticsContext.diagnostics[vehicle.id].lastSync,
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
                    style={[styles.syncText, isDark && styles.textMutedLight]}
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
                  <Text style={styles.alertText}>{vehicle.alerts} alert</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Vehicle List */}
          <DraggableFlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={vehicles}
            keyExtractor={(item) => item.id}
            renderItem={renderVehicleItem}
            onDragEnd={({ data }) => {
              const selectedId = vehicles[selectedVehicle]?.id;
              setVehicles(data);
              const newIndex = data.findIndex((v) => v.id === selectedId);
              if (newIndex !== -1) setSelectedVehicle(newIndex);
              AsyncStorage.setItem(
                VEHICLE_ORDER_KEY,
                JSON.stringify(data.map((v) => v.id)),
              ).catch(() => {});
            }}
            contentContainerStyle={styles.vehicleListContainer}
            ListFooterComponent={
              <TouchableOpacity
                style={[
                  styles.addVehicleCard,
                  isDark && styles.addVehicleCardDark,
                  cardHeight > 0 && { height: cardHeight },
                ]}
                onPress={() => navigation.navigate("AddVehicle")}
              >
                <Feather
                  name="plus-circle"
                  size={40}
                  color={isDark ? colors.gray[400] : colors.gray[500]}
                />
                <Text
                  style={[
                    styles.addVehicleText,
                    isDark && styles.textMutedLight,
                  ]}
                >
                  Add Vehicle
                </Text>
              </TouchableOpacity>
            }
          />

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
                  <View style={{ flex: 1 }}>
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
                    style={{ marginLeft: 12, marginRight: 12 }}
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
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {vehicles[selectedVehicle]?.obdUUID && (
                      <Feather
                        name="bluetooth"
                        size={22}
                        color={isDark ? colors.white : colors.primary[500]}
                        style={{ marginRight: 12 }}
                        onPress={() => {
                          setShowDisconnectModal(true);
                        }}
                      />
                    )}
                    <Feather
                      name="share"
                      size={22}
                      color={isDark ? colors.white : colors.primary[500]}
                      onPress={() => {
                        navigation.navigate("ShareVehicle");
                      }}
                    />
                  </View>
                </View>
              </CardHeader>

              <CardContent style={styles.detailsCardContent}>
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
                                              (milesSince / milesBetween) * 100,
                                            ),
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
                                      (milesSince / milesBetween) * 100,
                                    ),
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
                                    milesSince - milesBetween,
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
                                    milesBetween - milesSince,
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
                                        (milesSince / milesBetween) * 100,
                                      ),
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
                                      (milesSince / milesBetween) * 100,
                                    ),
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
                                    milesSince - milesBetween,
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
                                    milesBetween - milesSince,
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
                                        (milesSince / milesBetween) * 100,
                                      ),
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
                                      (milesSince / milesBetween) * 100,
                                    ),
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
                                    milesSince - milesBetween,
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
                                    milesBetween - milesSince,
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
                                    new Date(a).getTime(),
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

      {/* Device Connection Flow */}
      <DeviceConnectionFlow
        visible={showConnectionFlow}
        onClose={() => setShowConnectionFlow(false)}
        showActionSelector={true}
        scanVIN={scanVIN}
        onVINScanned={handleVINScanned}
      />

      {/* Vehicle Selector Modal */}
      <Modal visible={showVehicleSelector} transparent animationType="slide">
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
              width: "90%",
              maxHeight: "70%",
              backgroundColor: "white",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: "#eee",
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                {scannedVehicleData?.vin
                  ? "Select Vehicle to Update"
                  : "Associate Scanner with Vehicle"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowVehicleSelector(false);
                  setScannedVehicleData(null);
                }}
              >
                <Feather name="x" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={vehicles}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{
                    padding: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: "#eee",
                  }}
                  onPress={() => handleUpdateExistingVehicle(item.id)}
                >
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: "600" }}>
                      {item.nickname ||
                        `${item.year} ${item.make} ${item.model}`}
                    </Text>
                    <Text
                      style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}
                    >
                      {item.mileage
                        ? `${item.mileage} miles`
                        : "No mileage recorded"}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text
                  style={{ padding: 16, textAlign: "center", color: "#6b7280" }}
                >
                  No vehicles found
                </Text>
              }
              ListFooterComponent={
                <TouchableOpacity
                  style={{
                    padding: 16,
                    borderTopWidth: 2,
                    borderTopColor: "#e5e7eb",
                    backgroundColor: "#f9fafb",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onPress={() => {
                    setShowVehicleSelector(false);
                    setScannedVehicleData(null);
                    navigation.navigate("AddVehicle");
                  }}
                >
                  <Feather
                    name="plus-circle"
                    size={20}
                    color={colors.primary[500]}
                  />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "600",
                      color: colors.primary[500],
                      marginLeft: 8,
                    }}
                  >
                    Add New Vehicle
                  </Text>
                </TouchableOpacity>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Disconnect Device Modal */}
      <Modal
        visible={showDisconnectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDisconnectModal(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          }}
          onPress={() => setShowDisconnectModal(false)}
          activeOpacity={1}
        >
          <TouchableOpacity
            style={{
              width: "85%",
              backgroundColor: isDark ? colors.gray[800] : "white",
              borderRadius: 12,
              padding: 24,
              alignItems: "center",
            }}
            activeOpacity={1}
            onPress={() => {}}
          >
            <View style={{ position: "absolute", top: 12, right: 12 }}>
              <TouchableOpacity
                onPress={() => setShowDisconnectModal(false)}
                hitSlop={8}
              >
                <Feather
                  name="x"
                  size={24}
                  color={isDark ? colors.gray[300] : colors.gray[600]}
                />
              </TouchableOpacity>
            </View>

            <Feather
              name="bluetooth"
              size={48}
              color={colors.primary[500]}
              style={{ marginBottom: 16 }}
            />
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: isDark ? colors.white : colors.gray[900],
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              Device Options
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: isDark ? colors.gray[300] : colors.gray[600],
                marginBottom: 24,
                textAlign: "center",
              }}
            >
              {vehicles[selectedVehicle]?.obdUUID
                ? `Manage OBD-II device for ${vehicles[selectedVehicle]?.nickname || `${vehicles[selectedVehicle]?.year} ${vehicles[selectedVehicle]?.make} ${vehicles[selectedVehicle]?.model}`}`
                : "No device associated with this vehicle."}
            </Text>

            <View style={{ width: "100%", gap: 12 }}>
              {isDeviceConnected ? (
                <>
                  <Button
                    title={
                      isDisconnecting ? "Disconnecting..." : "Disconnect Device"
                    }
                    onPress={handleDisconnectDevice}
                    disabled={isDisconnecting}
                    variant="outline"
                  />
                  <Button
                    title="Remove Device from Vehicle"
                    onPress={handleRemoveDeviceFromVehicle}
                    disabled={isDisconnecting}
                    style={{ backgroundColor: colors.red[500] }}
                  />
                </>
              ) : (
                <>
                  <Button
                    title={
                      isDisconnecting ? "Connecting..." : "Connect to Device"
                    }
                    onPress={handleConnectDevice}
                    disabled={isDisconnecting}
                  />
                  <Button
                    title="Remove Device from Vehicle"
                    onPress={handleRemoveDeviceFromVehicle}
                    disabled={isDisconnecting}
                    variant="outline"
                    style={{ borderColor: colors.red[500], borderWidth: 2 }}
                  />
                </>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
