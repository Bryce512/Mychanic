import { registerRootComponent } from "expo";
import {
  getMessaging,
  setBackgroundMessageHandler,
} from "@react-native-firebase/messaging";
import notifee, { AndroidImportance } from "@notifee/react-native";
import {
  handleNotifeeEvent,
  MILEAGE_CATEGORY_ID,
  UPDATE_MILEAGE_ACTION_ID,
  VIEW_VEHICLE_ACTION_ID,
} from "./app/services/notificationService";

import App from "./App";

// Handle FCM messages when the app is in background or quit state.
// Re-display mileage reminder messages via notifee so they carry the
// vehicleId/vehicleNickname data needed for inline mileage update actions.
setBackgroundMessageHandler(getMessaging(), async (remoteMessage) => {
  const { vehicleId, vehicleNickname, notificationTitle, notificationBody } =
    (remoteMessage.data ?? {}) as Record<string, string>;

  if (!vehicleId) return;

  // Create the Android channel if needed
  await notifee.createChannel({
    id: "mychanic-reminders",
    name: "Mychanic Reminders",
    importance: AndroidImportance.HIGH,
    sound: "default",
  });

  await notifee.displayNotification({
    id: `mileage-reminder-${vehicleId}`,
    title: notificationTitle ?? "Time to update your mileage",
    body:
      notificationBody ??
      `${vehicleNickname ?? "Your vehicle"} hasn't had a mileage update in 2 weeks. Hold for options.`,
    data: { vehicleId, vehicleNickname: vehicleNickname ?? "" },
    ios: {
      categoryId: MILEAGE_CATEGORY_ID,
      foregroundPresentationOptions: { banner: true, sound: true, badge: false },
    },
    android: {
      channelId: "mychanic-reminders",
      pressAction: { id: "default" },
      actions: [
        {
          title: "Update Mileage",
          pressAction: { id: UPDATE_MILEAGE_ACTION_ID },
          input: { allowFreeFormInput: true, placeholder: "Enter mileage" },
        },
        {
          title: "View Vehicle",
          pressAction: { id: VIEW_VEHICLE_ACTION_ID },
        },
      ],
    },
  });
});

// Handle notifee notification interactions (press or action button) while
// the app is in background or quit state.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  console.log("[onBackgroundEvent] fired, type:", type, "pressAction:", (detail as any).pressAction?.id);
  await handleNotifeeEvent(
    type,
    detail as Parameters<typeof handleNotifeeEvent>[1],
  );
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
