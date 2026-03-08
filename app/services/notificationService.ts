import {
  getMessaging,
  getToken,
  onMessage,
} from "@react-native-firebase/messaging";
import notifee, {
  AndroidImportance,
  TimestampTrigger,
  TriggerType,
  AuthorizationStatus,
  IOSNotificationCategory,
  EventType,
} from "@notifee/react-native";
import {
  getFirestore,
  doc,
  updateDoc,
  getDoc,
} from "@react-native-firebase/firestore";
import { getAuth } from "@react-native-firebase/auth";
import { Platform } from "react-native";
import { navigationRef } from "../navigation/navigationRef";

const ANDROID_CHANNEL_ID = "mychanic-reminders";
const MILEAGE_REMINDER_ID_PREFIX = "mileage-reminder-";
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

/** Category ID used on the local + FCM mileage reminder notifications. */
export const MILEAGE_CATEGORY_ID = "mileage-reminder";

/** Action ID for the "Update Mileage" text-input action. */
export const UPDATE_MILEAGE_ACTION_ID = "update-mileage";

/** Action ID for the "View Vehicle" button action. */
export const VIEW_VEHICLE_ACTION_ID = "view-vehicle";

/**
 * Creates the Android notification channel (no-op on iOS).
 * Must be called before displaying any notifications on Android.
 */
async function ensureAndroidChannel() {
  if (Platform.OS === "android") {
    await notifee.createChannel({
      id: ANDROID_CHANNEL_ID,
      name: "Mychanic Reminders",
      importance: AndroidImportance.HIGH,
      sound: "default",
    });
  }
}

/**
 * Registers the iOS notification category that enables the "Update Mileage"
 * text-input action on mileage reminders. Must be called once on app startup.
 * No-op on Android (handled per-notification via the actions array).
 */
export async function setupNotificationCategories(): Promise<void> {
  if (Platform.OS === "ios") {
    const category: IOSNotificationCategory = {
      id: MILEAGE_CATEGORY_ID,
      actions: [
        {
          id: UPDATE_MILEAGE_ACTION_ID,
          title: "Update Mileage",
          input: {
            buttonText: "Save",
            placeholderText: "Enter mileage",
          },
        },
        {
          id: VIEW_VEHICLE_ACTION_ID,
          title: "View Vehicle",
          foreground: true,
        },
      ],
    };
    await notifee.setNotificationCategories([category]);
  }
}

/**
 * Requests notification permissions from the OS.
 * Returns true if granted, false otherwise.
 */
export async function requestPermissions(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
}

/**
 * Retrieves the FCM device token for this installation.
 * Returns null if unavailable.
 */
export async function getFCMToken(): Promise<string | null> {
  try {
    const token = await getToken(getMessaging());
    console.log("FCM Token:", token); // add this temporarily
    return token ?? null;
  } catch {
    return null;
  }
}

/**
 * Saves the FCM token to the user's Firestore document so Cloud Functions
 * can target this device for remote push notifications later.
 */
export async function saveFCMToken(
  userId: string,
  token: string,
): Promise<void> {
  const db = getFirestore();
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, { fcmToken: token });
}

/**
 * Fires an immediate local notification for testing purposes.
 */
export async function sendTestNotification(): Promise<void> {
  await ensureAndroidChannel();
  await notifee.displayNotification({
    id: "test-notification",
    title: "Mychanic Test Notification",
    body: "Notifications are working!",
    android: {
      channelId: ANDROID_CHANNEL_ID,
      pressAction: { id: "default" },
    },
  });
}

/**
 * Listens for FCM messages while the app is in the foreground and
 * displays them via notifee. Returns the unsubscribe function.
 */
export function setupForegroundHandler(): () => void {
  return onMessage(getMessaging(), async (remoteMessage) => {
    await ensureAndroidChannel();

    const data = remoteMessage.data as Record<string, string> | undefined;
    const isMileageReminder =
      data?.vehicleId !== undefined && data?.vehicleId !== "";

    await notifee.displayNotification({
      title: remoteMessage.notification?.title ?? "Mychanic",
      body: remoteMessage.notification?.body ?? "",
      data,
      ios: isMileageReminder ? { categoryId: MILEAGE_CATEGORY_ID } : undefined,
      android: {
        channelId: ANDROID_CHANNEL_ID,
        pressAction: { id: "default" },
        ...(isMileageReminder
          ? {
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
            }
          : {}),
      },
    });
  });
}

/**
 * Schedules a local notification 14 days from now reminding the user
 * to update their vehicle mileage. Any existing reminder for this
 * vehicle is cancelled first.
 */
export async function scheduleMileageReminder(
  vehicleId: string,
  vehicleNickname: string,
): Promise<void> {
  console.log("[scheduleMileageReminder] called for vehicleId:", vehicleId);
  await ensureAndroidChannel();
  await cancelMileageReminder(vehicleId);

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: Date.now() + TWO_WEEKS_MS,
  };

  await notifee.createTriggerNotification(
    {
      id: `${MILEAGE_REMINDER_ID_PREFIX}${vehicleId}`,
      title: "Update your mileage",
      body: `${vehicleNickname} hasn't had a mileage update in 2 weeks. Hold for options.`,
      data: { vehicleId, vehicleNickname },
      ios: {
        categoryId: MILEAGE_CATEGORY_ID,
        // Ensure the notification shows as a banner even when the app is open
        foregroundPresentationOptions: {
          banner: true,
          sound: true,
          badge: false,
        },
      },
      android: {
        channelId: ANDROID_CHANNEL_ID,
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
    },
    trigger,
  );

  // Confirm it was actually scheduled
  const scheduled = await notifee.getTriggerNotifications();
  console.log(
    "[scheduleMileageReminder] scheduled notifications:",
    scheduled.map((n) => n.notification.id),
  );
}

/**
 * Cancels any pending mileage reminder for the given vehicle.
 */
export async function cancelMileageReminder(vehicleId: string): Promise<void> {
  await notifee.cancelNotification(`${MILEAGE_REMINDER_ID_PREFIX}${vehicleId}`);
}

/**
 * Navigates to the EditVehicleInfo screen for the given vehicle.
 * Fetches the vehicle from Firestore and uses the navigation ref.
 * Polls until navigation is ready (handles background/quit state launches).
 */
export async function navigateToVehicleEdit(vehicleId: string): Promise<void> {
  const db = getFirestore();
  const vehicleSnap = await getDoc(doc(db, "vehicles", vehicleId));
  if (!vehicleSnap.exists()) return;

  // Wait up to 4 seconds for the navigation container and auth to be ready
  for (let i = 0; i < 40; i++) {
    const userId = getAuth().currentUser?.uid;
    if (navigationRef.isReady() && userId) {
      navigationRef.navigate("EditVehicleInfo", {
        vehicle: { id: vehicleSnap.id, ...vehicleSnap.data() },
        userId,
      });
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

/**
 * Saves new mileage directly from a notification action, then re-schedules
 * the 14-day reminder. Called by both foreground and background event handlers.
 */
export async function handleMileageUpdateAction(
  vehicleId: string,
  vehicleNickname: string,
  newMileageText: string,
  notificationId: string | undefined,
): Promise<void> {
  const mileage = Number(newMileageText?.trim());
  if (!vehicleId || Number.isNaN(mileage) || mileage <= 0) return;

  const db = getFirestore();
  await updateDoc(doc(db, "vehicles", vehicleId), {
    mileage,
    lastMileageUpdate: Date.now(),
  });

  // Dismiss the notification and reschedule the 14-day reminder
  if (notificationId) {
    await notifee.cancelNotification(notificationId);
  }
  await scheduleMileageReminder(vehicleId, vehicleNickname || "Your vehicle");
}

/**
 * Handles notifee foreground/background events for mileage reminders.
 * Returns true if the event was handled, false otherwise.
 */
export async function handleNotifeeEvent(
  type: number,
  detail: { notification?: { id?: string; data?: Record<string, string> }; pressAction?: { id?: string }; input?: string },
): Promise<boolean> {
  const { notification, pressAction, input } = detail;
  const vehicleId = notification?.data?.vehicleId;
  const vehicleNickname = notification?.data?.vehicleNickname;

  console.log(
    "[handleNotifeeEvent] type:", type,
    "| pressAction:", pressAction?.id,
    "| input:", input,
    "| vehicleId:", vehicleId,
    "| data keys:", Object.keys(notification?.data ?? {}),
  );

  if (type === EventType.PRESS && vehicleId) {
    await navigateToVehicleEdit(vehicleId);
    return true;
  }

  if (
    type === EventType.ACTION_PRESS &&
    pressAction?.id === UPDATE_MILEAGE_ACTION_ID &&
    vehicleId &&
    input
  ) {
    await handleMileageUpdateAction(
      vehicleId,
      vehicleNickname ?? "Your vehicle",
      input,
      notification?.id,
    );
    return true;
  }

  if (
    type === EventType.ACTION_PRESS &&
    pressAction?.id === VIEW_VEHICLE_ACTION_ID &&
    vehicleId
  ) {
    await navigateToVehicleEdit(vehicleId);
    return true;
  }
  return false;
}
