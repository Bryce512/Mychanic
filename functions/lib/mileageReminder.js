"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.testMileageReminder = exports.sendMileageReminders = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
/**
 * Runs daily at 9 AM UTC. Finds vehicles whose mileage hasn't been
 * updated in 14+ days and sends an FCM push notification to each owner.
 */
exports.sendMileageReminders = (0, scheduler_1.onSchedule)("0 9 * * *", async () => {
    var _a;
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
    const jobs = [];
    for (const vehicleDoc of vehiclesSnap.docs) {
        const vehicle = vehicleDoc.data();
        const nickname = vehicle.nickname || "Your vehicle";
        const ownerIds = (_a = vehicle.ownerId) !== null && _a !== void 0 ? _a : [];
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
exports.testMileageReminder = (0, https_1.onRequest)(async (req, res) => {
    if (req.method !== "POST") {
        res.status(405).send("Method not allowed");
        return;
    }
    const userId = req.body.userId;
    if (!userId) {
        res.status(400).json({ error: "userId is required" });
        return;
    }
    const db = admin.firestore();
    const messaging = admin.messaging();
    const vehiclesSnap = await db
        .collection("vehicles")
        .where("ownerId", "array-contains", userId)
        .get();
    if (vehiclesSnap.empty) {
        res.json({ sent: 0, message: "No vehicles found for this user." });
        return;
    }
    const jobs = [];
    for (const vehicleDoc of vehiclesSnap.docs) {
        const vehicle = vehicleDoc.data();
        const nickname = vehicle.nickname || "Your vehicle";
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
async function notifyUser(db, messaging, userId, vehicleNickname, vehicleId) {
    var _a;
    const userSnap = await db.collection("users").doc(userId).get();
    if (!userSnap.exists)
        return;
    const fcmToken = (_a = userSnap.data()) === null || _a === void 0 ? void 0 : _a.fcmToken;
    if (!fcmToken)
        return;
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
        data: { vehicleId, vehicleNickname, notificationTitle, notificationBody },
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
            notification: { sound: "default" },
        },
    });
}
//# sourceMappingURL=mileageReminder.js.map