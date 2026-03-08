"use client";

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  useColorScheme,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useBluetooth } from "../contexts/BluetoothContext";
import { useDiagnostics } from "../contexts/VehicleDiagnosticsContext";
import { obdDataFunctions } from "../services/obdService";
import Card, { CardContent, CardHeader } from "../components/Card";
import Button from "../components/Button";
import ServiceEditModal from "../components/ServiceEditModal";
import { colors } from "../theme/colors";
import firebaseService from "../services/firebaseService";

type RootStackParamList = {
  FullDiagnostics: { vehicleId: string };
};

type FullDiagnosticsRouteProp = RouteProp<
  RootStackParamList,
  "FullDiagnostics"
>;

export default function FullDiagnosticsScreen() {
  const navigation = useNavigation();
  const route = useRoute<FullDiagnosticsRouteProp>();
  const { vehicleId } = route.params;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const bluetoothContext = useBluetooth();
  const diagnosticsContext = useDiagnostics();

  const [isScanningDTC, setIsScanningDTC] = useState(false);
  const [dtcCodes, setDtcCodes] = useState<string[]>([]);
  const [serviceHistory, setServiceHistory] = useState({
    lastOilChange: "",
    milesAtLastOilChange: "",
    lastBrakeService: "",
    milesAtLastBrakeService: "",
    lastTireService: "",
    milesAtLastTireService: "",
  });

  const [maintenanceConfig, setMaintenanceConfig] = useState({
    milesBetweenOilChanges: "",
    milesBetweenBrakeChanges: "",
    milesBetweenTireService: "",
  });

  const [currentMileage, setCurrentMileage] = useState(0);

  // Modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editModalType, setEditModalType] = useState<"service" | "maintenance">(
    "service"
  );
  const [editModalTitle, setEditModalTitle] = useState("");

  // Load existing service history
  useEffect(() => {
    const loadServiceHistory = async () => {
      try {
        const vehicle = await firebaseService.getVehicleById(vehicleId);
        if (vehicle) {
          const diagInfo = diagnosticsContext.diagnostics[vehicleId];
          setCurrentMileage(vehicle.mileage || 0);
          setServiceHistory({
            lastOilChange: vehicle.lastOilChange || "",
            milesAtLastOilChange:
              vehicle.milesAtLastOilChange?.toString() || "",
            lastBrakeService: vehicle.lastBrakeService || "",
            milesAtLastBrakeService:
              vehicle.milesAtLastBrakeService?.toString() || "",
            lastTireService: vehicle.lastTireService || "",
            milesAtLastTireService:
              vehicle.milesAtLastTireService?.toString() || "",
          });

          // Load maintenance config
          setMaintenanceConfig({
            milesBetweenOilChanges:
              vehicle.maintConfigs?.milesBetweenOilChanges?.toString() || "",
            milesBetweenBrakeChanges:
              vehicle.maintConfigs?.milesBetweenBrakeChanges?.toString() || "",
            milesBetweenTireService:
              vehicle.maintConfigs?.milesBetweenTireService?.toString() || "",
          });

          // Load DTC codes if available
          if (diagInfo?.dtcCodes) {
            setDtcCodes(diagInfo.dtcCodes);
          }
        }
      } catch (error) {
        console.error("Error loading service history:", error);
      }
    };

    if (vehicleId) {
      loadServiceHistory();
    }
  }, [vehicleId, diagnosticsContext.diagnostics]);

  // Scan for DTC codes
  const scanForDTCCodes = async () => {
    const { deviceId, isConnected, plxDevice } = bluetoothContext;

    if (!isConnected || !plxDevice) {
      Alert.alert(
        "No OBD-II Device Connected",
        "Please connect to an OBD-II device first."
      );
      return;
    }

    setIsScanningDTC(true);
    try {
      const codes = await obdDataFunctions.getDTCCodes(
        plxDevice,
        bluetoothContext.sendCommand,
        (message) => console.log(`[DTC SCAN] ${message}`)
      );

      if (codes && codes.length > 0) {
        setDtcCodes(codes);
        // Save DTC codes directly to vehicle document
        await firebaseService.updateVehicle(vehicleId, {
          dtcCodes: codes,
        });
        await diagnosticsContext.refreshDiagnostics();

        Alert.alert(
          "DTC Codes Found",
          `Found ${codes.length} diagnostic trouble code(s).`
        );
      } else {
        setDtcCodes([]);
        Alert.alert("No DTC Codes", "No diagnostic trouble codes found.");
      }
    } catch (error) {
      console.error("Error scanning DTC codes:", error);
      Alert.alert("Scan Failed", "Failed to scan for DTC codes.");
    } finally {
      setIsScanningDTC(false);
    }
  };

  // Save service history
  const saveServiceHistory = async (showAlerts = false) => {
    try {
      const currentUser = firebaseService.getCurrentUser();
      if (!currentUser) {
        Alert.alert("Error", "No user logged in");
        return;
      }

      // Get current vehicle data to calculate "miles since" values
      const currentVehicle = await firebaseService.getVehicleById(vehicleId);
      const currentMileage = currentVehicle?.mileage || 0;

      // Prepare maintenance config updates
      const maintConfigUpdates: any = {};

      if (maintenanceConfig.milesBetweenOilChanges) {
        maintConfigUpdates.milesBetweenOilChanges = parseInt(
          maintenanceConfig.milesBetweenOilChanges
        );
      }
      if (maintenanceConfig.milesBetweenBrakeChanges) {
        maintConfigUpdates.milesBetweenBrakeChanges = parseInt(
          maintenanceConfig.milesBetweenBrakeChanges
        );
      }
      if (maintenanceConfig.milesBetweenTireService) {
        maintConfigUpdates.milesBetweenTireService = parseInt(
          maintenanceConfig.milesBetweenTireService
        );
      }

      // Prepare main vehicle updates (dates and mileage at service)
      const vehicleUpdates: any = {};

      if (serviceHistory.lastOilChange) {
        vehicleUpdates.lastOilChange = serviceHistory.lastOilChange;
      }
      if (serviceHistory.milesAtLastOilChange) {
        vehicleUpdates.milesAtLastOilChange = parseInt(
          serviceHistory.milesAtLastOilChange
        );
      }
      if (serviceHistory.lastBrakeService) {
        vehicleUpdates.lastBrakeService = serviceHistory.lastBrakeService;
      }
      if (serviceHistory.milesAtLastBrakeService) {
        vehicleUpdates.milesAtLastBrakeService = parseInt(
          serviceHistory.milesAtLastBrakeService
        );
      }
      if (serviceHistory.lastTireService) {
        vehicleUpdates.lastTireService = serviceHistory.lastTireService;
      }
      if (serviceHistory.milesAtLastTireService) {
        vehicleUpdates.milesAtLastTireService = parseInt(
          serviceHistory.milesAtLastTireService
        );
      }

      // Save maintenance config if there are updates
      if (Object.keys(maintConfigUpdates).length > 0) {
        vehicleUpdates.maintConfigs = {
          ...(currentVehicle?.maintConfigs || {}),
          ...maintConfigUpdates,
        };
      }

      // Save to main vehicle document
      if (Object.keys(vehicleUpdates).length > 0) {
        await firebaseService.updateVehicle(vehicleId, vehicleUpdates);
      }

      // Refresh diagnostics context to recalculate dynamic values
      await diagnosticsContext.refreshDiagnostics();

      if (showAlerts) {
        Alert.alert(
          "Success",
          "Service history and maintenance configuration updated successfully."
        );
      }
    } catch (error) {
      console.error("Error saving service history:", error);
      if (showAlerts) {
        Alert.alert("Error", "Failed to save service history.");
      }
    }
  };

  const clearDTCCodes = async () => {
    Alert.alert(
      "Clear DTC Codes",
      "This will clear all diagnostic trouble codes from the vehicle's ECU. Only do this after fixing the issues. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: async () => {
            try {
              const { plxDevice } = bluetoothContext;
              if (plxDevice) {
                await obdDataFunctions.clearDTCCodes(
                  plxDevice,
                  bluetoothContext.sendCommand,
                  (message) => console.log(`[CLEAR DTC] ${message}`)
                );

                setDtcCodes([]);
                await firebaseService.updateVehicle(vehicleId, {
                  dtcCodes: [],
                });
                await diagnosticsContext.refreshDiagnostics();

                Alert.alert("Success", "DTC codes cleared successfully.");
              }
            } catch (error) {
              console.error("Error clearing DTC codes:", error);
              Alert.alert("Error", "Failed to clear DTC codes.");
            }
          },
        },
      ]
    );
  };

  const handleModalSave = async (
    fields: Array<{
      key: string;
      label: string;
      date?: string;
      mileage?: string;
    }>
  ) => {
    try {
      const currentUser = firebaseService.getCurrentUser();
      if (!currentUser) {
        Alert.alert("Error", "No user logged in");
        return;
      }

      // Get current vehicle data
      const currentVehicle = await firebaseService.getVehicleById(vehicleId);
      const vehicleUpdates: any = {};
      let updatedServiceHistory: any = { ...serviceHistory };
      let updatedMaintenanceConfig: any = { ...maintenanceConfig };

      if (editModalType === "service") {
        // Update service history from fields
        fields.forEach((field) => {
          if (field.date) {
            updatedServiceHistory[field.key] = field.date;
            vehicleUpdates[field.key] = field.date;
          }
          const mileageKey = field.key.replace("last", "milesAtLast");
          if (field.mileage) {
            updatedServiceHistory[mileageKey] = field.mileage;
            vehicleUpdates[mileageKey] = parseInt(field.mileage) || 0;
          }
        });
      } else {
        // Update maintenance config from fields
        const maintConfigUpdates: any = {};
        fields.forEach((field) => {
          if (field.mileage) {
            updatedMaintenanceConfig[field.key] = field.mileage;
            maintConfigUpdates[field.key] = parseInt(field.mileage) || 0;
          }
        });
        if (Object.keys(maintConfigUpdates).length > 0) {
          vehicleUpdates.maintConfigs = {
            ...(currentVehicle?.maintConfigs || {}),
            ...maintConfigUpdates,
          };
        }
      }

      // Save to Firebase
      if (Object.keys(vehicleUpdates).length > 0) {
        await firebaseService.updateVehicle(vehicleId, vehicleUpdates);
      }

      // Update local state after Firebase save
      setServiceHistory(updatedServiceHistory);
      setMaintenanceConfig(updatedMaintenanceConfig);

      // Refresh diagnostics context
      await diagnosticsContext.refreshDiagnostics();
      setEditModalVisible(false);
    } catch (error) {
      console.error("Error saving from modal:", error);
      Alert.alert("Error", "Failed to save changes.");
    }
  };

  const handleModalCancel = () => {
    setEditModalVisible(false);
  };

  // Open edit modal for entire service history section
  const openEditServiceHistoryModal = () => {
    setEditModalType("service");
    setEditModalTitle("Edit Service History");
    setEditModalVisible(true);
  };

  // Open edit modal for entire maintenance config section
  const openEditMaintenanceModal = () => {
    setEditModalType("maintenance");
    setEditModalTitle("Edit Maintenance Configuration");
    setEditModalVisible(true);
  };

  return (
    <SafeAreaView
      style={[styles.container, isDark && styles.containerDark]}
      edges={["bottom", "left", "right"]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* DTC Codes Section */}
          <Card style={styles.sectionCard}>
            <CardHeader style={styles.cardHeader}>
              <Text style={[styles.cardTitle, isDark && styles.textLight]}>
                Diagnostic Trouble Codes (DTC)
              </Text>
            </CardHeader>
            <CardContent>
              <View style={styles.dtcSection}>
                <Button
                  title={isScanningDTC ? "Scanning..." : "Scan for DTC Codes"}
                  onPress={scanForDTCCodes}
                  loading={isScanningDTC}
                  icon={
                    <Feather name="search" size={16} color={colors.white} />
                  }
                  style={styles.scanButton}
                />

                {dtcCodes.length > 0 && (
                  <View style={styles.dtcList}>
                    <Text style={[styles.dtcTitle, isDark && styles.textLight]}>
                      Found {dtcCodes.length} code(s):
                    </Text>
                    {dtcCodes.map((code, index) => (
                      <View key={index} style={styles.dtcItem}>
                        <Text
                          style={[styles.dtcCode, isDark && styles.textLight]}
                        >
                          {code}
                        </Text>
                      </View>
                    ))}

                    <Button
                      title="Clear DTC Codes"
                      onPress={clearDTCCodes}
                      variant="outline"
                      size="sm"
                      style={styles.clearButton}
                    />
                  </View>
                )}

                {dtcCodes.length === 0 && !isScanningDTC && (
                  <Text style={[styles.noDtcText, isDark && styles.textMuted]}>
                    No DTC codes found. Tap "Scan for DTC Codes" to check for
                    issues.
                  </Text>
                )}
              </View>
            </CardContent>
          </Card>

          {/* Service History Section */}
          <Card style={styles.sectionCard}>
            <View style={[styles.cardHeader, styles.cardHeaderWithButton]}>
              <Text style={[styles.cardTitle, isDark && styles.textLight]}>
                Service History
              </Text>
              <Button
                title="Edit"
                onPress={openEditServiceHistoryModal}
                size="sm"
                variant="outline"
              />
            </View>
            <CardContent>
              <View style={styles.serviceSection}>
                {/* Oil Change */}
                <View style={styles.serviceItem}>
                  <Text
                    style={[styles.serviceLabel, isDark && styles.textLight]}
                  >
                    Last Oil Change
                  </Text>
                  <Text
                    style={[
                      styles.serviceText,
                      isDark && styles.textMuted,
                      !serviceHistory.lastOilChange && styles.placeholderText,
                    ]}
                  >
                    {serviceHistory.lastOilChange
                      ? `${serviceHistory.lastOilChange} | ${
                          serviceHistory.milesAtLastOilChange || "?"
                        } miles`
                      : "Not set"}
                  </Text>
                </View>

                {/* Brake Service */}
                <View style={styles.serviceItem}>
                  <Text
                    style={[styles.serviceLabel, isDark && styles.textLight]}
                  >
                    Last Brake Service
                  </Text>
                  <Text
                    style={[
                      styles.serviceText,
                      isDark && styles.textMuted,
                      !serviceHistory.lastBrakeService &&
                        styles.placeholderText,
                    ]}
                  >
                    {serviceHistory.lastBrakeService
                      ? `${serviceHistory.lastBrakeService} | ${
                          serviceHistory.milesAtLastBrakeService || "?"
                        } miles`
                      : "Not set"}
                  </Text>
                </View>

                {/* Tire Service */}
                <View style={styles.serviceItem}>
                  <Text
                    style={[styles.serviceLabel, isDark && styles.textLight]}
                  >
                    Last Tire Service
                  </Text>
                  <Text
                    style={[
                      styles.serviceText,
                      isDark && styles.textMuted,
                      !serviceHistory.lastTireService && styles.placeholderText,
                    ]}
                  >
                    {serviceHistory.lastTireService
                      ? `${serviceHistory.lastTireService} | ${
                          serviceHistory.milesAtLastTireService || "?"
                        } miles`
                      : "Not set"}
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>

          {/* Maintenance Configuration Section */}
          <Card style={styles.sectionCard}>
            <View style={[styles.cardHeader, styles.cardHeaderWithButton]}>
              <Text style={[styles.cardTitle, isDark && styles.textLight]}>
                Maintenance Configuration
              </Text>
              <Button
                title="Edit"
                onPress={openEditMaintenanceModal}
                size="sm"
                variant="outline"
              />
            </View>
            <CardContent>
              <View style={styles.serviceSection}>
                {/* Oil Change Interval */}
                <View style={styles.serviceItem}>
                  <Text
                    style={[styles.serviceLabel, isDark && styles.textLight]}
                  >
                    Oil Change Interval
                  </Text>
                  <Text
                    style={[
                      styles.serviceText,
                      isDark && styles.textMuted,
                      !maintenanceConfig.milesBetweenOilChanges &&
                        styles.placeholderText,
                    ]}
                  >
                    {maintenanceConfig.milesBetweenOilChanges
                      ? `${maintenanceConfig.milesBetweenOilChanges} miles`
                      : "Not set"}
                  </Text>
                </View>

                {/* Brake Service Interval */}
                <View style={styles.serviceItem}>
                  <Text
                    style={[styles.serviceLabel, isDark && styles.textLight]}
                  >
                    Brake Service Interval
                  </Text>
                  <Text
                    style={[
                      styles.serviceText,
                      isDark && styles.textMuted,
                      !maintenanceConfig.milesBetweenBrakeChanges &&
                        styles.placeholderText,
                    ]}
                  >
                    {maintenanceConfig.milesBetweenBrakeChanges
                      ? `${maintenanceConfig.milesBetweenBrakeChanges} miles`
                      : "Not set"}
                  </Text>
                </View>

                {/* Tire Service Interval */}
                <View style={styles.serviceItem}>
                  <Text
                    style={[styles.serviceLabel, isDark && styles.textLight]}
                  >
                    Tire Service Interval
                  </Text>
                  <Text
                    style={[
                      styles.serviceText,
                      isDark && styles.textMuted,
                      !maintenanceConfig.milesBetweenTireService &&
                        styles.placeholderText,
                    ]}
                  >
                    {maintenanceConfig.milesBetweenTireService
                      ? `${maintenanceConfig.milesBetweenTireService} miles`
                      : "Not set"}
                  </Text>
                </View>
              </View>
            </CardContent>
          </Card>
        </View>
      </ScrollView>

      {/* Service/Maintenance Edit Modal */}
      <ServiceEditModal
        visible={editModalVisible}
        title={editModalTitle}
        type={editModalType}
        fields={
          editModalType === "service"
            ? [
                {
                  key: "lastOilChange",
                  label: "Oil Change",
                  date: serviceHistory.lastOilChange,
                  mileage: serviceHistory.milesAtLastOilChange,
                },
                {
                  key: "lastBrakeService",
                  label: "Brake Service",
                  date: serviceHistory.lastBrakeService,
                  mileage: serviceHistory.milesAtLastBrakeService,
                },
                {
                  key: "lastTireService",
                  label: "Tire Service",
                  date: serviceHistory.lastTireService,
                  mileage: serviceHistory.milesAtLastTireService,
                },
              ]
            : [
                {
                  key: "milesBetweenOilChanges",
                  label: "Miles Between Oil Changes",
                  mileage: maintenanceConfig.milesBetweenOilChanges,
                },
                {
                  key: "milesBetweenBrakeChanges",
                  label: "Miles Between Brake Changes",
                  mileage: maintenanceConfig.milesBetweenBrakeChanges,
                },
                {
                  key: "milesBetweenTireService",
                  label: "Miles Between Tire Service",
                  mileage: maintenanceConfig.milesBetweenTireService,
                },
              ]
        }
        onSave={handleModalSave}
        onCancel={handleModalCancel}
        maxMileage={currentMileage}
      />
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
  sectionCard: {
    marginBottom: 16,
  },
  cardHeader: {
    paddingBottom: 8,
  },
  cardHeaderWithButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.gray[900],
  },
  textLight: {
    color: colors.white,
  },
  textMuted: {
    color: colors.gray[400],
  },
  dtcSection: {
    gap: 16,
  },
  scanButton: {
    marginBottom: 16,
  },
  dtcList: {
    gap: 12,
  },
  dtcTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.gray[900],
  },
  dtcItem: {
    backgroundColor: colors.red[500] + "20", // 20% opacity
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.red[500] + "40", // 40% opacity
  },
  dtcCode: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.red[500],
    fontFamily: "monospace",
  },
  clearButton: {
    marginTop: 8,
  },
  noDtcText: {
    fontSize: 14,
    color: colors.gray[600],
    textAlign: "center",
    fontStyle: "italic",
  },
  serviceSection: {
    gap: 16,
  },
  serviceItem: {
    gap: 0,
    flex: 1,
    flexDirection: "column",
  },
  serviceItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  serviceLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.gray[900],
    marginBottom: 8,
  },
  serviceText: {
    fontSize: 14,
    color: colors.gray[700],
    marginBottom: 16,
  },
  serviceDisplay: {
    flexDirection: "row",
    gap: 16,
  },
  displayField: {
    flex: 1,
    backgroundColor: colors.gray[100],
    padding: 12,
    borderRadius: 8,
  },
  displayLabel: {
    fontSize: 12,
    color: colors.gray[600],
    marginBottom: 4,
    fontWeight: "500",
  },
  displayValue: {
    fontSize: 14,
    color: colors.gray[900],
    fontWeight: "500",
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    alignItems: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.white,
    color: colors.gray[900],
    flex: 1,
  },
  inputDark: {
    borderColor: colors.gray[600],
    backgroundColor: colors.gray[800],
    color: colors.white,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: colors.gray[300],
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.white,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flex: 1,
  },
  dateInputDark: {
    borderColor: colors.gray[600],
    backgroundColor: colors.gray[800],
  },
  dateText: {
    fontSize: 16,
    color: colors.gray[900],
  },
  placeholderText: {
    color: colors.gray[500],
  },
  placeholderTextDark: {
    color: colors.gray[400],
  },
  saveButton: {
    marginTop: 16,
  },
});
