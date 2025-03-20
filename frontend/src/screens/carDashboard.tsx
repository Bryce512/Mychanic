import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { getCarData } from "../../firebaseConfig";
import { RootStackParamList } from "../navigation/appNavigator";
import { Car } from "../types";

// Correctly type the props with NativeStackScreenProps
type Props = NativeStackScreenProps<RootStackParamList, "CarDashboard">;

const CarDashboard: React.FC<Props> = ({ route }) => {
  // Access carId from the route.params
  const { carId } = route.params;
  const [car, setCar] = useState<Car | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const carData = await getCarData(carId);
      setCar(carData); // ✅ No TypeScript error now!
      setLoading(false);
    };

    fetchData();
  }, [carId]);

  if (loading) return <ActivityIndicator size="large" color="#0000ff" />;

  return (
    <View>
      {car ? (
        <>
          <Text>
            🚗 {car.make} {car.model} ({car.year})
          </Text>
        </>
      ) : (
        <Text>Car data not found</Text>
      )}
    </View>
  );
};

export default CarDashboard;
