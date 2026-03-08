import React, { useState } from "react";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/AppNavigator";
import firebaseService from "../services/firebaseService";
import VehicleForm from "../components/VehicleForm";
import { useDiagnostics } from "../contexts/VehicleDiagnosticsContext";

export default function EditVehicleInfoScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, "EditVehicleInfo">>();
  const { vehicle, userId } = route.params;
  const [loading, setLoading] = useState(false);
  const diagContext = useDiagnostics();

  const handleSave = async (
    vehicleData: any,
    maintConfig: any,
    imageUri?: string | null
  ) => {
    setLoading(true);
    try {
      const currentUser = firebaseService.getCurrentUser();
      if (!currentUser) {
        alert("You must be signed in to save vehicle info.");
        return;
      }

      // Handle image upload if needed
      let imageUrl =
        vehicleData.image ||
        "https://firebasestorage.googleapis.com/v0/b/fluid-tangent-405719.firebasestorage.app/o/public%2Fcar_default.png?alt=media&token=5232adad-a5f7-4b8c-be47-781163a7eaa1";
      if (imageUri && !imageUri.startsWith("http")) {
        // Upload new image
        const extMatch = imageUri.match(/\.([a-zA-Z0-9]+)$/);
        const ext = extMatch ? extMatch[1] : "jpg";
        imageUrl = await firebaseService.uploadVehicleImage(
          currentUser.uid,
          vehicle.id,
          imageUri,
          ext
        );
      } else if (imageUri && imageUri.startsWith("http")) {
        imageUrl = imageUri;
      }

      // Prepare vehicle data for update
      const updatedVehicleData = {
        ...vehicleData,
        image: imageUrl,
      };

      // Update the vehicle
      const result = await firebaseService.updateVehicle(
        vehicle.id,
        updatedVehicleData
      );

      // Save maintenance config
      const maintConfigData = {
        milesBetweenOilChanges: maintConfig.milesBetweenOilChanges
          ? parseInt(maintConfig.milesBetweenOilChanges, 10)
          : undefined,
        milesBetweenBrakeChangess: maintConfig.milesBetweenBrakeChangess
          ? parseInt(maintConfig.milesBetweenBrakeChangess, 10)
          : undefined,
        batteryInstallDate: maintConfig.batteryInstallDate || undefined,
      };

      // Write to /users/<userId>/vehicles/<vehicleId>/maintConfigs
      const db = await import("@react-native-firebase/database");
      const ref = db.ref(
        db.getDatabase(),
        `users/${currentUser.uid}/vehicles/${vehicle.id}/maintConfigs`
      );
      await db.set(ref, maintConfigData);

      // Refresh diagnostics context after vehicle info is updated
      await diagContext.refreshDiagnostics();

      navigation.goBack();
      return result;
    } catch (e) {
      console.error("Error saving vehicle:", e);
      alert("Failed to save vehicle info.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await firebaseService.deleteVehicle(userId, vehicle.id);
      navigation.goBack();
    } catch (e) {
      alert("Failed to delete vehicle.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <VehicleForm
      initialData={vehicle}
      loading={loading}
      onSave={handleSave}
      onDelete={handleDelete}
      isEdit={true}
    />
  );
}
