import React, { useState } from "react";
import { StatusBar } from "react-native";
import { useNavigation } from "@react-navigation/native";
import firebaseService from "../services/firebaseService";
import VehicleForm from "../components/VehicleForm";

export default function AddVehicleScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);

  const handleSave = async (
    vehicleData: any,
    maintConfig: any = {},
    imageUri?: string | null
  ) => {
    setLoading(true);
    try {
      const currentUser = firebaseService.getCurrentUser();
      if (!currentUser) {
        alert("You must be signed in to add a vehicle.");
        setLoading(false);
        return;
      }

      // Handle image upload if needed
      let imageUrl =
        "https://firebasestorage.googleapis.com/v0/b/fluid-tangent-405719.firebasestorage.app/o/public%2Fcar_default.png?alt=media&token=5232adad-a5f7-4b8c-be47-781163a7eaa1";
      if (imageUri && !imageUri.startsWith("http")) {
        // Upload new image - we need to add the vehicle first to get the ID
        const tempResult = await firebaseService.addVehicle(
          currentUser.uid,
          vehicleData
        );
        const vehicleId = tempResult?.id;

        if (vehicleId) {
          const extMatch = imageUri.match(/\.([a-zA-Z0-9]+)$/);
          const ext = extMatch ? extMatch[1] : "jpg";
          imageUrl = await firebaseService.uploadVehicleImage(
            currentUser.uid,
            vehicleId,
            imageUri,
            ext
          );

          // Update the vehicle with the image URL
          await firebaseService.updateVehicle(vehicleId, {
            ...vehicleData,
            image: imageUrl,
          });

          // Save maintenance config
          const maintConfigData = {
            milesBetweenOilChanges: maintConfig?.milesBetweenOilChanges || 7500,
            milesBetweenBrakeChangess:
              maintConfig?.milesBetweenBrakeChangess || 50000,
            batteryInstallDate: maintConfig?.batteryInstallDate || null,
          };

          const db = await import("@react-native-firebase/database");
          const ref = db.ref(
            db.getDatabase(),
            `users/${currentUser.uid}/vehicles/${vehicleId}/maintConfigs`
          );
          await db.set(ref, maintConfigData);

          navigation.goBack();
          return tempResult;
        }
      } else {
        // No image upload needed, just add the vehicle
        if (imageUri && imageUri.startsWith("http")) {
          vehicleData.image = imageUri;
        }

        const result = await firebaseService.addVehicle(
          currentUser.uid,
          vehicleData
        );

        // Save maintenance config
        const vehicleId = result?.id;
        if (vehicleId) {
          const maintConfigData = {
            milesBetweenOilChanges: maintConfig?.milesBetweenOilChanges || 7500,
            milesBetweenBrakeChangess:
              maintConfig?.milesBetweenBrakeChangess || 50000,
            batteryInstallDate: maintConfig?.batteryInstallDate || null,
          };

          const db = await import("@react-native-firebase/database");
          const ref = db.ref(
            db.getDatabase(),
            `users/${currentUser.uid}/vehicles/${vehicleId}/maintConfigs`
          );
          await db.set(ref, maintConfigData);
        }

        navigation.goBack();
        return result;
      }
    } catch (e) {
      console.error("Error adding vehicle:", e);
      alert("Failed to add vehicle.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <VehicleForm onSave={handleSave} loading={loading} isEdit={false} />
    </>
  );
}
