import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "./app/contexts/AuthContext";
import { ThemeProvider } from "./app/components/theme-provider";
import AppNavigator from "./app/navigation/AppNavigator";
import { BluetoothProvider } from "./app/contexts/BluetoothContext";
import { DiagnosticsProviderWrapper } from "./app/contexts/VehicleDiagnosticsContext";

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <BluetoothProvider>
            <DiagnosticsProviderWrapper>
              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>
            </DiagnosticsProviderWrapper>
          </BluetoothProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
