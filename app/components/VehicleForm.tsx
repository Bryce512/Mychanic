import React, { useState } from "react";
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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { vehicleFormStyles } from "../theme/styles/VehicleForm.styles";
import type { KeyboardTypeOptions } from "react-native";
import { launchImageLibrary } from "react-native-image-picker";
import firebaseService from "../services/firebaseService";

interface VehicleFormProps {
  initialData?: any;
  loading?: boolean;
  onSave: (
    vehicleData: any,
    maintConfig?: any,
    imageUri?: string | null
  ) => Promise<{ id: string | null } | undefined>;
  onDelete?: () => Promise<void>;
  isEdit?: boolean;
}

const VEHICLE_FIELDS = [
  "year",
  "make",
  "model",
  "mileage",
  "nickname",
  "vin",
  "engine",
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
    vin: initialData.vin || "", // Ensure VIN is always a string
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [saving, setSaving] = useState(false);
  const [image, setImage] = useState<string | null>(initialData.image || null);
  const [uploading, setUploading] = useState(false);
  const [vin, setVin] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);

  const handleChange = (key: string, value: string) => {
    setForm({ ...form, [key]: value });
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
        `https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`
      );
      const data = await response.json();

      if (data.Results && data.Results.length > 0) {
        const results = data.Results;
        const vehicleData: any = {};

        // Extract relevant information from NHTSA response
        results.forEach((result: any) => {
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

        // Update form with the retrieved data
        setForm({ ...form, ...vehicleData, vin });
        Alert.alert("Success", "Vehicle information retrieved successfully!");
      } else {
        Alert.alert(
          "Error",
          "Could not retrieve vehicle information. Please check the VIN and try again."
        );
      }
    } catch (error) {
      console.error("VIN lookup error:", error);
      Alert.alert(
        "Error",
        "Failed to lookup vehicle information. Please try again."
      );
    } finally {
      setLookupLoading(false);
    }
  };

  const lookupVehicleByLicensePlate = async () => {
    // License plate lookup removed - using VIN only
  };

  const pickImage = async () => {
    launchImageLibrary(
      {
        mediaType: "photo",
        quality: 0.7,
        includeBase64: false,
      },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert(
            "Image Picker Error",
            response.errorMessage || "Unknown error"
          );
          return;
        }
        if (response.assets && response.assets.length > 0) {
          setImage(response.assets[0].uri || null);
        }
      }
    );
  };

  const handleSave = async () => {
    // Validate required fields
    const newErrors: { [key: string]: string } = {};
    REQUIRED_FIELDS.forEach((field) => {
      if (!form[field] || form[field].toString().trim() === "") {
        newErrors[field] = `${
          field.charAt(0).toUpperCase() + field.slice(1)
        } is required`;
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
      // Parse numeric fields
      const updatedForm = {
        ...form,
        year: form.year ? parseInt(form.year, 10) : undefined,
        mileage: form.mileage ? parseInt(form.mileage, 10) : undefined,
      };

      // Default maintenance config for new vehicles
      const defaultMaintConfig = {
        milesBetweenOilChanges: 7500,
        milesBetweenBrakeChangess: 50000,
        batteryInstallDate: null,
      };

      // Return the data to the parent component for saving
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
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <ScrollView
        contentContainerStyle={vehicleFormStyles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Image Picker and Display */}
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

        {/* Vehicle Lookup Section - Only show when adding new vehicle */}
        {!isEdit && (
          <View style={vehicleFormStyles.lookupSection}>
            <Text style={vehicleFormStyles.sectionTitle}>
              Quick Vehicle Lookup
            </Text>
            <Text style={vehicleFormStyles.sectionSubtitle}>
              Enter VIN to auto-fill vehicle details from NHTSA database
            </Text>

            {/* VIN Lookup */}
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
                />
                <TouchableOpacity
                  style={vehicleFormStyles.lookupButton}
                  onPress={lookupVehicleByVin}
                  disabled={lookupLoading}
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
            </View>
          </View>
        )}

        {VEHICLE_FIELDS.map((field) => (
          <View key={field} style={vehicleFormStyles.inputGroup}>
            <Text style={vehicleFormStyles.label}>
              {field.charAt(0).toUpperCase() + field.slice(1)}
              {REQUIRED_FIELDS.includes(field) && (
                <Text style={{ color: "red" }}>*</Text>
              )}
            </Text>
            <TextInput
              style={vehicleFormStyles.input}
              value={form[field]?.toString() || ""}
              onChangeText={(text) => handleChange(field, text)}
              keyboardType={
                field === "mileage" || field === "year" ? "numeric" : "default"
              }
              autoCapitalize={field === "vin" ? "characters" : "words"}
              maxLength={field === "vin" ? 17 : undefined}
            />
            {errors[field] && (
              <Text style={{ color: "red", fontSize: 12 }}>
                {errors[field]}
              </Text>
            )}
          </View>
        ))}
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
    </KeyboardAvoidingView>
  );
};

export default VehicleForm;
