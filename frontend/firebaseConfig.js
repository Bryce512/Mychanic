import firestore from "@react-native-firebase/firestore";
import { Car, Session, DTCLog } from "./src/types";


// 🔹 Get User Data
export const getUser = async (userId) => {
  try {
    const userDoc = await firestore().collection("users").doc(userId).get();
    return userDoc.exists ? userDoc.data() : null;
  } catch (error) {
    console.error("Error fetching user:", error);
  }
};

// 🔹 Fetch Car Data with Proper Type Casting
export const getCarData = async (carId) => {
  try {
    const carDoc = await firestore().collection('cars').doc(carId).get();
    
    if (!carDoc.exists) return null;

    const carData = carDoc.data(); // Get document data
    if (!carData) return null;

    // ✅ Ensure full Car object structure
    return {
      id: carDoc.id,
      make: carData.make || '',
      model: carData.model || '',
      year: carData.year || 0,
      vin: carData.vin || undefined, // Optional field
    } ;
  } catch (error) {
    console.error("Error fetching car data:", error);
    return null;
  }
};

// 🔹 Get Latest Session Data
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
    await firestore().collection("sessions").add(newSession);
  } catch (error) {
    console.error("Error saving session:", error);
  }
};

// 🔹 Save a DTC Event
export const saveDTCLog = async (carId, userId, dtcCode, context) => {
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
