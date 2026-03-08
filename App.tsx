import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider } from "./app/contexts/AuthContext";
import { ThemeProvider } from "./app/components/theme-provider";
import AppNavigator from "./app/navigation/AppNavigator";
import { BluetoothProvider } from "./app/contexts/BluetoothContext";
import { DiagnosticsProviderWrapper } from "./app/contexts/VehicleDiagnosticsContext";
import { navigationRef } from "./app/navigation/navigationRef";
import {
  getMessaging,
  getInitialNotification,
} from "@react-native-firebase/messaging";
import notifee from "@notifee/react-native";
import { navigateToVehicleEdit } from "./app/services/notificationService";

/**
 * Handles deep-link navigation when the app is launched cold by tapping
 * a notification (quit state). Called once the NavigationContainer is ready.
 */
async function handleInitialNotification() {
  // FCM notification tapped from quit state
  const remoteMessage = await getInitialNotification(getMessaging());
  console.log(
    "[Notification] getInitialNotification data:",
    JSON.stringify(remoteMessage?.data),
  );
  if (remoteMessage?.data?.vehicleId) {
    await navigateToVehicleEdit(remoteMessage.data.vehicleId as string);
    return;
  }

  // Notifee local notification tapped from quit state
  const notifeeInitial = await notifee.getInitialNotification();
  console.log(
    "[Notification] notifee.getInitialNotification data:",
    JSON.stringify(notifeeInitial?.notification?.data),
  );
  if (notifeeInitial?.notification?.data?.vehicleId) {
    await navigateToVehicleEdit(
      notifeeInitial.notification.data.vehicleId as string,
    );
  }
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <BluetoothProvider>
            <DiagnosticsProviderWrapper>
              <NavigationContainer
                ref={navigationRef}
                onReady={() => {
                  handleInitialNotification().catch(console.error);
                }}
              >
                <AppNavigator />
              </NavigationContainer>
            </DiagnosticsProviderWrapper>
          </BluetoothProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
