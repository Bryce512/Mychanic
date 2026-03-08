import {onSchedule} from "firebase-functions/v2/scheduler";
import {onRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Runs daily at 9 AM UTC. Finds vehicles whose mileage hasn't been
 * updated in 14+ days and sends an FCM push notification to each owner.
 */
export const sendMileageReminders = onSchedule("0 9 * * *", async () => {
  const db = admin.firestore();
  const messaging = admin.messaging();

  const twoWeeksAgo = Date.now() - TWO_WEEKS_MS;

  const vehiclesSnap = await db
    .collection("vehicles")
    .where("lastMileageUpdate", ">", 0)
    .where("lastMileageUpdate", "<", twoWeeksAgo)
    .get();

  if (vehiclesSnap.empty) {
    return;
  }

  const jobs: Promise<void>[] = [];

  for (const vehicleDoc of vehiclesSnap.docs) {
    const vehicle = vehicleDoc.data();
    const nickname: string = vehicle.nickname || "Your vehicle";
    const ownerIds: string[] = vehicle.ownerId ?? [];

    for (const ownerId of ownerIds) {
      jobs.push(notifyUser(db, messaging, ownerId, nickname, vehicleDoc.id));
    }
  }

  const results = await Promise.allSettled(jobs);
  const failed = results.filter((r) => r.status === "rejected").length;
  console.log(`Mileage reminders: ${jobs.length} sent, ${failed} failed.`);
});

/**
 * HTTP endpoint for testing: sends a mileage reminder to all vehicles
 * owned by the given userId, bypassing the 14-day date filter.
 *
 * POST body: { "userId": "<uid>" }
 * Example: curl -X POST <url> -H "Content-Type: application/json" \
 *   -d '{"userId":"abc123"}'
 */
export const testMileageReminder = onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }

  const userId: string = req.body.userId;
  if (!userId) {
    res.status(400).json({error: "userId is required"});
    return;
  }

  const db = admin.firestore();
  const messaging = admin.messaging();

  const vehiclesSnap = await db
    .collection("vehicles")
    .where("ownerId", "array-contains", userId)
    .get();

  if (vehiclesSnap.empty) {
    res.json({sent: 0, message: "No vehicles found for this user."});
    return;
  }

  const jobs: Promise<void>[] = [];

  for (const vehicleDoc of vehiclesSnap.docs) {
    const vehicle = vehicleDoc.data();
    const nickname: string = vehicle.nickname || "Your vehicle";
    jobs.push(notifyUser(db, messaging, userId, nickname, vehicleDoc.id));
  }

  const results = await Promise.allSettled(jobs);
  const failed = results.filter((r) => r.status === "rejected").length;

  res.json({
    sent: jobs.length - failed,
    failed,
    total: jobs.length,
  });
});

/**
 * Fetches a user's FCM token from Firestore and sends them a
 * mileage reminder push notification.
 * @param {admin.firestore.Firestore} db - Firestore instance
 * @param {admin.messaging.Messaging} messaging - FCM instance
 * @param {string} userId - UID of the user to notify
 * @param {string} vehicleNickname - Display name of the vehicle
 * @param {string} vehicleId - Firestore document ID of the vehicle
 */
async function notifyUser(
  db: admin.firestore.Firestore,
  messaging: admin.messaging.Messaging,
  userId: string,
  vehicleNickname: string,
  vehicleId: string,
): Promise<void> {
  const userSnap = await db.collection("users").doc(userId).get();
  if (!userSnap.exists) return;

  const fcmToken: string | undefined = userSnap.data()?.fcmToken;
  if (!fcmToken) return;

  const notificationTitle = "It's Been a While";
  const notificationBody = `Update the mileage for ${vehicleNickname}.`;

  await messaging.send({
    token: fcmToken,
    notification: {
      title: notificationTitle,
      body: notificationBody,
    },
    // Include title/body in data so the background handler can re-display
    // the notification via notifee with the full action payload attached.
    data: {vehicleId, vehicleNickname, notificationTitle, notificationBody},
    apns: {
      payload: {
        aps: {
          sound: "default",
          category: "mileage-reminder",
          // Wake the background message handler while app is backgrounded
          // so notifee can re-display the notification with action data.
          contentAvailable: true,
        },
      },
    },
    android: {
      notification: {sound: "default"},
    },
  });
}
