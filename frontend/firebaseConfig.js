import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import storage from "@react-native-firebase/storage";
import { FirebaseApp, initializeApp } from "@react-native-firebase/app";

// ✅ Firebase Configuration (Fix `storageBucket`!)
const firebaseConfig = {
  apiKey: "AIzaSyCkTvizBpmaxVJFAWbwL9BcbL93daDMMWE",
  authDomain: "fluid-tangent-405719.firebaseapp.com",
  databaseURL: "https://fluid-tangent-405719-default-rtdb.firebaseio.com",
  projectId: "fluid-tangent-405719",
  storageBucket: "fluid-tangent-405719.appspot.com", // ✅ Fixed
  messagingSenderId: "578434461817",
  appId: "1:578434461817:web:d336ebf5d1e7188dc524a8",
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// 🔹 Get User Data
export const getUser = async (userId) => {
  try {
    const userDoc = await firestore().collection("users").doc(userId).get();
    return userDoc.exists ? userDoc.data() : null;
  } catch (error) {
    console.error("Error fetching user:", error);
    return null;
  }
};

// 🔹 Fetch Car Data
export const getCarData = async (carId) => {
  try {
    const carDoc = await firestore().collection("cars").doc(carId).get();
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
    console.error("Error fetching car data:", error);
    return null;
  }
};

// 🔹 Get Latest OBD-II Session
export const getLatestSession = async (carId) => {
  try {
    const sessionSnapshot = await firestore()
      .collection("sessions")
      .where("carId", "==", carId)
      .orderBy("startTime", "desc")
      .limit(1)
      .get();

    return sessionSnapshot.docs.map((doc) => doc.data())[0] || null;
  } catch (error) {
    console.error("Error fetching latest session:", error);
    return null;
  }
};

// 🔹 Save a New OBD-II Session
export const saveSession = async (
  carId,
  userId,
  dataPoints,
) => {
  try {
    const newSession = {
      carId,
      userId,
      startTime: new Date().toISOString(),
      endTime: new Date(new Date().getTime() + 60000).toISOString(),
      dataPoints,
    };
    await firestore().collection("sessions").add(newSession);
  } catch (error) {
    console.error("Error saving session:", error);
  }
};

// 🔹 Save a DTC Log
export const saveDTCLog = async (
  carId,
  userId,
  dtcCode,
  context,
) => {
  try {
    const newLog = {
      carId,
      userId,
      dtcCode,
      timestamp: new Date().toISOString(),
      context,
    };
    await firestore().collection("dtc_logs").add(newLog);
  } catch (error) {
    console.error("Error saving DTC log:", error);
  }
};