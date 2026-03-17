import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { vehicleFormStyles } from "../theme/styles/VehicleForm.styles";
import { launchImageLibrary } from "react-native-image-picker";
import {
  vehicleDataService,
  VehicleMake,
  VehicleModel,
  VehicleYear,
} from "../services/vehicleDataService";
import { Feather } from "@expo/vector-icons";
import { useBluetooth } from "../contexts/BluetoothContext";
import { useVINScanning } from "../hooks/useOBDEngine";
import {
  DeviceConnectionFlow,
  DeviceConnectionAction,
} from "./DeviceConnectionFlow";
import firebaseService from "../services/firebaseService";
import type { BluetoothDevice } from "../services/bleConnections";

interface VehicleFormProps {
  initialData?: any;
  loading?: boolean;
  onSave: (
    vehicleData: any,
    maintConfig?: any,
    imageUri?: string | null,
  ) => Promise<{ id: string | null } | undefined>;
  onDelete?: () => Promise<void>;
  isEdit?: boolean;
}

// Fields that stay as free-text inputs
const TEXT_FIELDS = [
  { key: "mileage", label: "Mileage", required: true, numeric: true },
  { key: "nickname", label: "Nickname", required: false },
  {
    key: "vin",
    label: "VIN",
    required: false,
    caps: "characters" as const,
    maxLength: 17,
  },
  { key: "engine", label: "Engine", required: false },
];

const REQUIRED_FIELDS = ["year", "make", "model", "mileage"];

const DEFAULT_IMAGE =
  "https://firebasestorage.googleapis.com/v0/b/fluid-tangent-405719.firebasestorage.app/o/public%2Fcar_default.png?alt=media&token=5232adad-a5f7-4b8c-be47-781163a7eaa1";

const VehicleForm: React.FC<VehicleFormProps> = ({
  initialData = {},
  loading = false,
  onSave,
  onDelete,
  isEdit = false,
}) => {
  const [form, setForm] = useState({
    ...initialData,
    vin: initialData.vin || "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [saving, setSaving] = useState(false);
  const [image, setImage] = useState<string | null>(initialData.image || null);
  const [uploading, setUploading] = useState(false);
  const [vin, setVin] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);

  // OBD Scanning state
  const [showConnectionFlow, setShowConnectionFlow] = useState(false);
  const [existingVehicles, setExistingVehicles] = useState<any[]>([]);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [scannedVehicleData, setScannedVehicleData] = useState<any>(null);
  const [connectedDevice, setConnectedDevice] =
    useState<BluetoothDevice | null>(null);
  const bluetoothContext = useBluetooth();

  // Initialize VIN scanning hook
  const { scanVIN, isScanning: scanningVIN } = useVINScanning(
    bluetoothContext.plxDevice,
    bluetoothContext.sendCommand,
  );

  // NHTSA dropdown state
  const [vehicleYears, setVehicleYears] = useState<VehicleYear[]>([]);
  const [vehicleMakes, setVehicleMakes] = useState<VehicleMake[]>([]);
  const [vehicleModels, setVehicleModels] = useState<VehicleModel[]>([]);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMakeDropdown, setShowMakeDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [isLoadingVehicleData, setIsLoadingVehicleData] = useState(false);
  const [makeSearch, setMakeSearch] = useState("");

  // Load years on mount; in edit mode also pre-load makes/models
  useEffect(() => {
    const init = async () => {
      const years = await vehicleDataService.getVehicleYears();
      setVehicleYears(years);

      if (isEdit && initialData.year) {
        const makes = await vehicleDataService.getVehicleMakes(
          parseInt(initialData.year),
        );
        setVehicleMakes(makes);

        if (initialData.make) {
          const models = await vehicleDataService.getVehicleModels(
            initialData.make,
            parseInt(initialData.year),
          );
          setVehicleModels(models);
        }
      }
    };
    init();
  }, []);

  const handleChange = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
  };

  // NHTSA handlers
  const handleYearSelect = async (year: number) => {
    setForm((prev: any) => ({
      ...prev,
      year: year.toString(),
      make: "",
      model: "",
    }));
    setVehicleMakes([]);
    setVehicleModels([]);
    setShowYearDropdown(false);
    setIsLoadingVehicleData(true);
    try {
      const makes = await vehicleDataService.getVehicleMakes(year);
      setVehicleMakes(makes);
    } catch {
      Alert.alert("Error", "Failed to load vehicle makes");
    } finally {
      setIsLoadingVehicleData(false);
    }
  };

  const handleMakeSelect = async (make: VehicleMake) => {
    const makeName = make.MakeName || make.Make_Name || "";
    setForm((prev: any) => ({ ...prev, make: makeName, model: "" }));
    setVehicleModels([]);
    setShowMakeDropdown(false);
    setIsLoadingVehicleData(true);
    try {
      const models = await vehicleDataService.getVehicleModels(
        makeName,
        parseInt(form.year),
      );
      setVehicleModels(models);
    } catch {
      Alert.alert("Error", "Failed to load vehicle models");
    } finally {
      setIsLoadingVehicleData(false);
    }
  };

  const handleModelSelect = (model: VehicleModel) => {
    setForm((prev: any) => ({
      ...prev,
      model: model.Model_Name || model.ModelName || "",
    }));
    setShowModelDropdown(false);
  };

  // Lazy-load makes before opening that dropdown (handles edit mode with no prior selection)
  const openMakeDropdown = async () => {
    if (vehicleMakes.length === 0 && form.year) {
      setIsLoadingVehicleData(true);
      try {
        const makes = await vehicleDataService.getVehicleMakes(
          parseInt(form.year),
        );
        setVehicleMakes(makes);
      } catch {
        Alert.alert("Error", "Failed to load vehicle makes");
        setIsLoadingVehicleData(false);
        return;
      } finally {
        setIsLoadingVehicleData(false);
      }
    }
    setShowMakeDropdown(true);
  };

  // Lazy-load models before opening that dropdown
  const openModelDropdown = async () => {
    if (vehicleModels.length === 0 && form.make && form.year) {
      setIsLoadingVehicleData(true);
      try {
        const models = await vehicleDataService.getVehicleModels(
          form.make,
          parseInt(form.year),
        );
        setVehicleModels(models);
      } catch {
        Alert.alert("Error", "Failed to load vehicle models");
        setIsLoadingVehicleData(false);
        return;
      } finally {
        setIsLoadingVehicleData(false);
      }
    }
    setShowModelDropdown(true);
  };

  const lookupVehicleByVin = async () => {
    if (!vin.trim()) {
      Alert.alert("Error", "Please enter a VIN");
      return;
    }
    if (vin.length !== 17) {
      Alert.alert("Error", "VIN must be 17 characters long");
      return;
    }
    setLookupLoading(true);
    try {
      const response = await fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`,
      );
      const data = await response.json();
      if (data.Results && data.Results.length > 0) {
        const vehicleData: any = {};
        data.Results.forEach((result: any) => {
          switch (result.Variable) {
            case "Model Year":
              vehicleData.year = result.Value;
              break;
            case "Make":
              vehicleData.make = result.Value;
              break;
            case "Model":
              vehicleData.model = result.Value;
              break;
            case "Engine Model":
            case "Engine Configuration":
            case "Displacement (L)":
              if (result.Value && result.Value !== "Not Applicable") {
                vehicleData.engine = result.Value;
              }
              break;
          }
        });
        setForm({ ...form, ...vehicleData, vin });
        // Pre-load makes/models for the VIN-decoded year/make so dropdowns work
        if (vehicleData.year) {
          const makes = await vehicleDataService.getVehicleMakes(
            parseInt(vehicleData.year),
          );
          setVehicleMakes(makes);
          if (vehicleData.make) {
            const models = await vehicleDataService.getVehicleModels(
              vehicleData.make,
              parseInt(vehicleData.year),
            );
            setVehicleModels(models);
          }
        }
        Alert.alert("Success", "Vehicle information retrieved successfully!");
      } else {
        Alert.alert(
          "Error",
          "Could not retrieve vehicle information. Please check the VIN and try again.",
        );
      }
    } catch (error) {
      console.error("VIN lookup error:", error);
      Alert.alert(
        "Error",
        "Failed to lookup vehicle information. Please try again.",
      );
    } finally {
      setLookupLoading(false);
    }
  };

  const handleScanVINFromOBD = async () => {
    // Show modal immediately and start scanning
    try {
      setShowConnectionFlow(true);
      await bluetoothContext.startScan();
    } catch (error) {
      console.error("Failed to start scan:", error);
      Alert.alert("Error", "Failed to start scanning for devices");
      setShowConnectionFlow(false);
    }
  };

  // Handle connection success - ask user what to do
  const handleConnectionSuccess = async (device: BluetoothDevice) => {
    setConnectedDevice(device);

    // Ask user if they want to create new or use existing vehicle
    const currentUser = firebaseService.getCurrentUser();
    const userVehicles = currentUser
      ? await firebaseService.getVehicles(currentUser.uid)
      : [];
    setExistingVehicles(userVehicles);

    // Show choice dialog only if user has existing vehicles
    if (currentUser && userVehicles && userVehicles.length > 0) {
      Alert.alert("Select Action", "What would you like to do?", [
        {
          text: "Create New Vehicle",
          onPress: () => {
            Alert.alert(
              "Scanning VIN",
              "Scanning vehicle identification number from OBD-II device...",
            );
            proceedWithVINScan("new", userVehicles);
          },
        },
        {
          text: "Update Existing Vehicle",
          onPress: () => {
            Alert.alert(
              "Scanning VIN",
              "Scanning vehicle identification number from OBD-II device...",
            );
            proceedWithVINScan("existing", userVehicles);
          },
        },
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            setShowConnectionFlow(false);
          },
        },
      ]);
    } else {
      // No existing vehicles or not logged in, proceed with new vehicle
      Alert.alert(
        "Scanning VIN",
        "Scanning vehicle identification number from OBD-II device...",
      );
      proceedWithVINScan("new", userVehicles);
    }
  };

  const proceedWithVINScan = async (
    userChoice: "new" | "existing",
    existingVehicles: any[],
  ) => {
    try {
      // Step 3: Scan VIN using the hook - returns full vehicle data (vin, year, make, model)
      console.log("VehicleForm: Starting VIN scan...");
      const vinResult = await scanVIN();

      if (!vinResult || !vinResult.vin) {
        Alert.alert(
          "VIN Not Available",
          "Unable to access VIN from this vehicle. Please create the vehicle manually.",
          [
            {
              text: "OK",
              onPress: () => {
                setShowConnectionFlow(false);
              },
            },
          ],
        );
        return;
      }

      console.log("VehicleForm: VIN retrieved:", vinResult.vin);

      // Build vehicle data from scan result
      const vehicleData: any = {
        vin: vinResult.vin,
        ...(vinResult.year && { year: vinResult.year }),
        ...(vinResult.make && { make: vinResult.make }),
        ...(vinResult.model && { model: vinResult.model }),
      };

      setScannedVehicleData(vehicleData);

      // Step 4: Handle based on user choice
      if (userChoice === "existing" && existingVehicles.length > 0) {
        setExistingVehicles(existingVehicles);
        setShowVehicleSelector(true);
        setShowConnectionFlow(false);
      } else {
        // New vehicle - populate form
        populateFormWithVehicleData(vehicleData);
        Alert.alert("Success", "Vehicle information retrieved successfully!");
        setShowConnectionFlow(false);
      }
    } catch (error) {
      console.error("VIN scan error:", error);
      Alert.alert(
        "Error",
        "Failed to retrieve VIN from OBD-II device. Please try again or enter VIN manually.",
      );
      setShowConnectionFlow(false);
    }
  };

  const populateFormWithVehicleData = async (vehicleData: any) => {
    setForm({ ...form, ...vehicleData });
    setVin(vehicleData.vin || "");

    // Pre-load makes/models for the decoded year/make so dropdowns work
    if (vehicleData.year) {
      const makes = await vehicleDataService.getVehicleMakes(
        parseInt(vehicleData.year),
      );
      setVehicleMakes(makes);
      if (vehicleData.make) {
        const models = await vehicleDataService.getVehicleModels(
          vehicleData.make,
          parseInt(vehicleData.year),
        );
        setVehicleModels(models);
      }
    }
  };

  const handleUpdateExistingVehicle = async (vehicleId: string) => {
    setShowVehicleSelector(false);

    if (!scannedVehicleData) return;

    try {
      // Update the selected vehicle with the new VIN and vehicle data
      await firebaseService.updateVehicle(vehicleId, {
        vin: scannedVehicleData.vin,
        year: scannedVehicleData.year
          ? parseInt(scannedVehicleData.year)
          : undefined,
        make: scannedVehicleData.make,
        model: scannedVehicleData.model,
        engine: scannedVehicleData.engine,
      });

      Alert.alert("Success", "Vehicle information updated successfully!", [
        {
          text: "OK",
          onPress: () => {
            // Reset form or navigate back
            setScannedVehicleData(null);
          },
        },
      ]);
    } catch (error) {
      console.error("Error updating vehicle:", error);
      Alert.alert("Error", "Failed to update vehicle. Please try again.");
    }
  };

  const pickImage = async () => {
    launchImageLibrary(
      { mediaType: "photo", quality: 0.7, includeBase64: false },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert(
            "Image Picker Error",
            response.errorMessage || "Unknown error",
          );
          return;
        }
        if (response.assets && response.assets.length > 0) {
          setImage(response.assets[0].uri || null);
        }
      },
    );
  };

  const handleSave = async () => {
    const newErrors: { [key: string]: string } = {};
    REQUIRED_FIELDS.forEach((field) => {
      if (!form[field] || form[field].toString().trim() === "") {
        newErrors[field] =
          `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
      }
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      Alert.alert("Missing Fields", "Please fill out all required fields.");
      return;
    } else {
      setErrors({});
    }
    setSaving(true);
    try {
      const updatedForm = {
        ...form,
        year: form.year ? parseInt(form.year, 10) : undefined,
        mileage: form.mileage ? parseInt(form.mileage, 10) : null,
      };
      const defaultMaintConfig = {
        milesBetweenOilChanges: 5000,
        milesBetweenBrakeChangess: 7500,
        batteryInstallDate: null,
      };
      const result = await onSave(updatedForm, defaultMaintConfig, image);
      return result;
    } catch (e) {
      console.error("Error in form:", e);
      Alert.alert("Failed to process vehicle info.");
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    Alert.alert(
      "Delete Vehicle",
      "Are you sure you want to delete this vehicle? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setSaving(true);
            try {
              await onDelete();
            } catch (e) {
              Alert.alert("Failed to delete vehicle.");
            } finally {
              setSaving(false);
            }
          },
        },
      ],
    );
  };

  const renderDropdown = (
    label: string,
    placeholder: string,
    value: string,
    onPress: () => void,
    isDisabled = false,
    containerStyle?: object,
  ) => (
    <View style={[vehicleFormStyles.inputGroup, containerStyle]}>
      <Text style={vehicleFormStyles.label}>
        {label}
        {REQUIRED_FIELDS.includes(label.toLowerCase()) && (
          <Text style={{ color: "red" }}>*</Text>
        )}
      </Text>
      <TouchableOpacity
        style={[
          vehicleFormStyles.dropdownButton,
          isDisabled && { opacity: 0.4 },
        ]}
        onPress={onPress}
        disabled={isDisabled}
      >
        <Text
          style={
            value
              ? vehicleFormStyles.dropdownButtonText
              : vehicleFormStyles.dropdownPlaceholder
          }
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        <Feather name="chevron-down" size={18} color="#9ca3af" />
      </TouchableOpacity>
      {errors[label.toLowerCase()] && (
        <Text style={{ color: "red", fontSize: 12 }}>
          {errors[label.toLowerCase()]}
        </Text>
      )}
    </View>
  );

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          vehicleFormStyles.container,
          { paddingBottom: 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={true}
      >
        {/* Image Picker */}
        <View style={vehicleFormStyles.imageSection}>
          <TouchableOpacity
            onPress={pickImage}
            disabled={uploading || saving || loading}
          >
            <Image
              source={{ uri: image || DEFAULT_IMAGE }}
              style={vehicleFormStyles.image}
              resizeMode="cover"
            />
            <Text style={vehicleFormStyles.imageLabel}>
              {uploading ? "Uploading..." : "Tap to change image"}
            </Text>
          </TouchableOpacity>
          {uploading && <ActivityIndicator style={{ marginTop: 8 }} />}
        </View>

        {/* VIN Quick Lookup */}
        {!isEdit && (
          <View style={vehicleFormStyles.lookupSection}>
            <Text style={vehicleFormStyles.sectionTitle}>
              Quick Vehicle Lookup
            </Text>
            <Text style={vehicleFormStyles.sectionSubtitle}>
              Enter VIN manually or scan from your OBD-II device
            </Text>
            <View style={vehicleFormStyles.lookupGroup}>
              <Text style={vehicleFormStyles.lookupLabel}>
                VIN (17 characters)
              </Text>
              <View style={vehicleFormStyles.lookupInputRow}>
                <TextInput
                  style={[vehicleFormStyles.input, { flex: 1, marginRight: 8 }]}
                  value={vin}
                  onChangeText={setVin}
                  placeholder="Enter VIN"
                  maxLength={17}
                  autoCapitalize="characters"
                  editable={!scanningVIN}
                />
                <TouchableOpacity
                  style={vehicleFormStyles.lookupButton}
                  onPress={lookupVehicleByVin}
                  disabled={lookupLoading || scanningVIN}
                >
                  {lookupLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={vehicleFormStyles.lookupButtonText}>
                      Lookup
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[
                  vehicleFormStyles.lookupButton,
                  { marginTop: 8, backgroundColor: "#10b981" },
                ]}
                onPress={handleScanVINFromOBD}
                disabled={scanningVIN || lookupLoading}
              >
                {scanningVIN ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={vehicleFormStyles.lookupButtonText}>
                      Scanning...
                    </Text>
                  </View>
                ) : (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Feather name="bluetooth" size={16} color="#fff" />
                    <Text style={vehicleFormStyles.lookupButtonText}>
                      Scan from OBD-II
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Year / Make / Model dropdowns */}
        <View style={vehicleFormStyles.dropdownRow}>
          {renderDropdown(
            "Year",
            "Year",
            form.year?.toString() || "",
            () => setShowYearDropdown(true),
            false,
            { width: 96 },
          )}
          {renderDropdown(
            "Make",
            "Make",
            form.make || "",
            openMakeDropdown,
            !form.year,
            { flex: 1 },
          )}
        </View>

        {renderDropdown(
          "Model",
          "Select Model",
          form.model || "",
          openModelDropdown,
          !form.make,
        )}

        {isLoadingVehicleData && (
          <Text style={vehicleFormStyles.loadingText}>
            Loading vehicle data...
          </Text>
        )}

        {/* Remaining free-text fields */}
        {TEXT_FIELDS.map(
          ({ key, label, required, numeric, caps, maxLength }) => (
            <View key={key} style={vehicleFormStyles.inputGroup}>
              <Text style={vehicleFormStyles.label}>
                {label}
                {required && <Text style={{ color: "red" }}>*</Text>}
              </Text>
              <TextInput
                style={vehicleFormStyles.input}
                value={form[key]?.toString() || ""}
                onChangeText={(text) => handleChange(key, text)}
                keyboardType={numeric ? "numeric" : "default"}
                autoCapitalize={caps ?? "words"}
                maxLength={maxLength}
              />
              {errors[key] && (
                <Text style={{ color: "red", fontSize: 12 }}>
                  {errors[key]}
                </Text>
              )}
            </View>
          ),
        )}

        <Button
          title={saving || loading ? "Saving..." : "Save"}
          onPress={handleSave}
          disabled={saving || loading || uploading}
        />
        {isEdit && onDelete && (
          <View style={{ marginTop: 24 }}>
            <Button
              title={saving || loading ? "Deleting..." : "Delete Vehicle"}
              color="#d32f2f"
              onPress={handleDelete}
              disabled={saving || loading}
            />
          </View>
        )}
      </ScrollView>

      {/* Year Modal */}
      <Modal visible={showYearDropdown} transparent animationType="slide">
        <View style={vehicleFormStyles.dropdownModal}>
          <View style={vehicleFormStyles.dropdownContent}>
            <View style={vehicleFormStyles.dropdownHeader}>
              <Text style={vehicleFormStyles.dropdownHeaderText}>
                Select Year
              </Text>
              <TouchableOpacity onPress={() => setShowYearDropdown(false)}>
                <Feather name="x" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={vehicleYears}
              keyExtractor={(item) => item.year.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={vehicleFormStyles.dropdownItem}
                  onPress={() => handleYearSelect(item.year)}
                >
                  <Text style={vehicleFormStyles.dropdownItemText}>
                    {item.year}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Make Modal */}
      <Modal visible={showMakeDropdown} transparent animationType="slide">
        <View style={vehicleFormStyles.dropdownModal}>
          <View style={vehicleFormStyles.dropdownContent}>
            <View style={vehicleFormStyles.dropdownHeader}>
              <Text style={vehicleFormStyles.dropdownHeaderText}>
                Select Make
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowMakeDropdown(false);
                  setMakeSearch("");
                }}
              >
                <Feather name="x" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
              <TextInput
                style={vehicleFormStyles.input}
                placeholder="Search makes..."
                value={makeSearch}
                onChangeText={setMakeSearch}
                autoCapitalize="words"
                clearButtonMode="while-editing"
              />
            </View>
            <FlatList
              data={vehicleMakes.filter((m) => {
                const name = m.MakeName || m.Make_Name || "";
                return name
                  .toLowerCase()
                  .includes(makeSearch.toLowerCase().trim());
              })}
              keyExtractor={(item) =>
                (item.MakeId || item.Make_ID || 0).toString()
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={vehicleFormStyles.dropdownItem}
                  onPress={() => {
                    handleMakeSelect(item);
                    setMakeSearch("");
                  }}
                >
                  <Text style={vehicleFormStyles.dropdownItemText}>
                    {item.MakeName || item.Make_Name || "Unknown"}
                  </Text>
                </TouchableOpacity>
              )}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </View>
      </Modal>

      {/* Model Modal */}
      <Modal visible={showModelDropdown} transparent animationType="slide">
        <View style={vehicleFormStyles.dropdownModal}>
          <View style={vehicleFormStyles.dropdownContent}>
            <View style={vehicleFormStyles.dropdownHeader}>
              <Text style={vehicleFormStyles.dropdownHeaderText}>
                Select Model
              </Text>
              <TouchableOpacity onPress={() => setShowModelDropdown(false)}>
                <Feather name="x" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={vehicleModels}
              keyExtractor={(item, index) =>
                `model-${item.Model_ID || item.ModelId || index}-${
                  item.Model_Name || item.ModelName || index
                }`
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={vehicleFormStyles.dropdownItem}
                  onPress={() => handleModelSelect(item)}
                >
                  <Text style={vehicleFormStyles.dropdownItemText}>
                    {item.Model_Name || item.ModelName || "Unknown"}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Device Connection Flow */}
      <DeviceConnectionFlow
        visible={showConnectionFlow}
        onClose={() => setShowConnectionFlow(false)}
        onConnectionSuccess={handleConnectionSuccess}
      />

      {/* Vehicle Selector Modal */}
      <Modal visible={showVehicleSelector} transparent animationType="slide">
        <View style={vehicleFormStyles.dropdownModal}>
          <View style={vehicleFormStyles.dropdownContent}>
            <View style={vehicleFormStyles.dropdownHeader}>
              <Text style={vehicleFormStyles.dropdownHeaderText}>
                Select Vehicle to Update
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
              data={existingVehicles}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={vehicleFormStyles.dropdownItem}
                  onPress={() => handleUpdateExistingVehicle(item.id)}
                >
                  <View>
                    <Text style={vehicleFormStyles.dropdownItemText}>
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
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

export default VehicleForm;
