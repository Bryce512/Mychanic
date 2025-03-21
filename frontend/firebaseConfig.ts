// Import React Native Firebase modules
import firebase  from "@react-native-firebase/app";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import analytics from "@react-native-firebase/analytics";

// console.log(firebase);

// Export Firebase services for cleaner imports
export const db = firestore();
export const authService = auth();
export const analyticsService = analytics();

// Default export for convenience
export default {
  firebase,
  db,
  auth: authService,
  analytics: analyticsService,
};

/* ──────────────────────────── 🔹 Firestore Queries ──────────────────────────── */

// 🔹 Get User Data
export const getUser = async (userId) => {
  try {
    const userDoc = await db.collection("users").doc(userId).get();
    return userDoc.exists ? userDoc.data() : null;
  } catch (error) {
    console.error("🔥 Error fetching user:", error);
    return null;
  }
};

// 🔹 Fetch Car Data
export const getCarData = async (carId) => {
  try {
    const carDoc = await db.collection("cars").doc(carId).get();
    if (!carDoc.exists) return null;

    const carData = carDoc.data();
    return {
      id: carDoc.id,
      make: carData?.make || "",
      model: carData?.model || "",
      year: carData?.year || 0,
      vin: carData?.vin || undefined,
    };
  } catch (error) {
    console.error("🔥 Error fetching car data:", error);
    return null;
  }
};

// 🔹 Get Latest OBD-II Session
export const getLatestSession = async (carId) => {
  try {
    const sessionSnapshot = await db
      .collection("sessions")
      .where("carId", "==", carId)
      .orderBy("startTime", "desc")
      .limit(1)
      .get();

    return sessionSnapshot.docs.map((doc) => doc.data())[0] || null;
  } catch (error) {
    console.error("🔥 Error fetching latest session:", error);
    return null;
  }
};

// 🔹 Save a New OBD-II Session
export const saveSession = async (carId, userId, dataPoints) => {
  try {
    const newSession = {
      carId,
      userId,
      startTime: new Date().toISOString(),
      endTime: new Date(new Date().getTime() + 60000).toISOString(),
      dataPoints,
    };
    await db.collection("sessions").add(newSession);
  } catch (error) {
    console.error("🔥 Error saving session:", error);
  }
};

// 🔹 Save a DTC Log
export const saveDTCLog = async (carId, userId, dtcCode, context) => {
  try {
    const newLog = {
      carId,
      userId,
      dtcCode,
      timestamp: new Date().toISOString(),
      context,
    };
    await db.collection("dtc_logs").add(newLog);
  } catch (error) {
    console.error("🔥 Error saving DTC log:", error);
  }
};
