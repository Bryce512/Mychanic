import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import HomeScreen from "../screens/HomeScreen";
import CarDashboard from "../screens/carDashboard";
import ScanDevicesScreen from "../screens/ScanDevices";
import SettingsScreen from "../screens/settings";
import ClickMenuScreen from "../screens/ClickMenu";

export type RootStackParamList = {
  Home: undefined;
  Settings: undefined;
  ClickMenu: undefined;
  ScanDevices: undefined;
  CarDashboard: { carId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="CarDashboard" component={CarDashboard} />
        <Stack.Screen name="ScanDevices" component={ScanDevicesScreen} />
        {/* <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="ClickMenu" component={ClickMenuScreen} /> */}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
