import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { initializeApp, getApp, getApps } from "@react-native-firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as authSignOut,
  onAuthStateChanged,
  signInWithCredential,
  GoogleAuthProvider,
  AppleAuthProvider,
  PhoneAuthProvider,
  signInWithPhoneNumber,
  linkWithCredential,
} from "@react-native-firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  documentId,
  getDoc,
  deleteField,
} from "@react-native-firebase/firestore";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import {
  getStorage,
  ref,
  putFile,
  getDownloadURL,
} from "@react-native-firebase/storage";
import appleAuth from "@invertase/react-native-apple-authentication";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAZ2Xk8Kkbc-0tdkJBqWhqNZie8Ls7cEnc",
  authDomain: "fluid-tangent-405719.firebaseapp.com",
  projectId: "fluid-tangent-405719",
  storageBucket: "fluid-tangent-405719.firebasestorage.app",
  messagingSenderId: "578434461817",
  appId: "1:578434461817:ios:5509bcf8e73151e2c524a8",
};

const app = getApp();
const db = getFirestore(app);

// Flag to track initialization status
let isInitialized = false;

// Initialize Firebase - get the existing app or create a new one
export const initializeFirebase = async () => {
  if (isInitialized) {
    console.log("Firebase already initialized by this service");
    return getApp();
  }

  try {
    if (getApps().length === 0) {
      initializeApp(firebaseConfig);
      console.log("Firebase initialized successfully");
    } else {
      console.log("Firebase app already exists, using existing app");
    }
    isInitialized = true;
    return getApp();
  } catch (error) {
    console.error("Firebase initialization error:", error);
    throw error;
  }
};

// Upload vehicle image to Firebase Storage and return the download URL
export const uploadVehicleImage = async (
  userId: string,
  vehicleId: string,
  uri: string,
  ext: string = "jpg",
) => {
  try {
    const pathString = `user_uploads/${userId}/${vehicleId}.${ext}`;
    const storage = getStorage();
    const storageRef = ref(storage, pathString);
    await putFile(storageRef, uri);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (error) {
    console.error("Error uploading vehicle image:", error);
    throw error;
  }
};

// Upload mechanic document to Firebase Storage and return the storage path
export const uploadMechanicDocument = async (
  mechanicId: string,
  documentType: "insurance" | "identity" | "tax" | "business",
  uri: string,
  fileName: string,
) => {
  try {
    console.log("Uploading document:", {
      mechanicId,
      documentType,
      fileName,
      uri,
    });

    const pathString = `mechanic-documents/${mechanicId}/${documentType}/${fileName}`;
    const storage = getStorage();
    const storageRef = ref(storage, pathString);

    // putFile expects a local file path (can have file:// prefix)
    await putFile(storageRef, uri);

    console.log("Document uploaded successfully to:", pathString);

    // Return the gs:// URL format for Firestore storage
    return `gs://${storage.app.options.storageBucket}/${pathString}`;
  } catch (error) {
    console.error("Error uploading mechanic document:", error);
    throw error;
  }
};

// Convert gs:// URL to download URL for viewing documents
export const getDocumentDownloadURL = async (
  gsUrl: string,
): Promise<string> => {
  try {
    console.log("getDocumentDownloadURL - Input:", gsUrl);

    if (!gsUrl.startsWith("gs://")) {
      throw new Error("Invalid gs:// URL");
    }

    // Extract path from gs://bucket/path format
    const path = gsUrl.replace("gs://", "");
    console.log("Path after removing gs://:", path);

    const [bucket, ...pathParts] = path.split("/");
    const filePath = pathParts.join("/");

    console.log("Bucket:", bucket);
    console.log("File path:", filePath);

    const storage = getStorage();
    const storageRef = ref(storage, filePath);
    console.log("Storage ref created for:", filePath);

    const downloadURL = await getDownloadURL(storageRef);
    console.log("Download URL obtained:", downloadURL);

    return downloadURL;
  } catch (error) {
    console.error("Error getting download URL:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    throw error;
  }
};

// Save mechanic profile with documents to Firestore
export const saveMechanicProfile = async (
  mechanicId: string,
  profileData: {
    businessName: string;
    insuranceExpiry: string;
    email: string;
    name?: string;
    phone?: string;
    documents: {
      insuranceCert?: string;
      driversLicense?: string;
      w9?: string;
      businessReg?: string;
    };
  },
) => {
  try {
    const db = getFirestore();
    const mechanicRef = doc(db, "mechanics", mechanicId);

    const mechanicData = {
      businessName: profileData.businessName,
      email: profileData.email,
      name: profileData.name || "",
      phone: profileData.phone || "",
      insuranceStatus: "pending",
      insuranceExpiry: profileData.insuranceExpiry,
      documents: profileData.documents,
      onboardingStatus: "pending",
      verified: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(mechanicRef, mechanicData, { merge: true });

    // Also update user profile with onboarding status
    const userRef = doc(db, "users", mechanicId);
    await updateDoc(userRef, {
      "profile.onboardingStatus": "pending",
      "profile.onboardingSubmittedAt": serverTimestamp(),
    });

    console.log("Mechanic profile saved successfully");
    return true;
  } catch (error) {
    console.error("Error saving mechanic profile:", error);
    throw error;
  }
};

// Get mechanic profile from Firestore
export const getMechanicProfile = async (mechanicId: string) => {
  try {
    const db = getFirestore();
    const mechanicRef = doc(db, "mechanics", mechanicId);
    const mechanicSnap = await getDoc(mechanicRef);

    if (mechanicSnap.exists()) {
      return mechanicSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Error fetching mechanic profile:", error);
    throw error;
  }
};

// Update mechanic onboarding status (admin only)
export const updateMechanicOnboardingStatus = async (
  mechanicId: string,
  status: "incomplete" | "pending" | "approved" | "rejected",
  adminNote?: string,
) => {
  try {
    const db = getFirestore();

    // Update mechanics collection
    const mechanicRef = doc(db, "mechanics", mechanicId);
    await updateDoc(mechanicRef, {
      onboardingStatus: status,
      verified: status === "approved",
      statusUpdatedAt: serverTimestamp(),
      adminNote: adminNote || "",
    });

    // Update user profile
    const userRef = doc(db, "users", mechanicId);
    await updateDoc(userRef, {
      "profile.onboardingStatus": status,
      "profile.statusUpdatedAt": serverTimestamp(),
    });

    console.log("Onboarding status updated to:", status);
    return true;
  } catch (error) {
    console.error("Error updating onboarding status:", error);
    throw error;
  }
};

export const getJob = async (jobId: string) => {
  const db = getFirestore();
  const jobRef = doc(db, "jobs", jobId);
  const jobSnap = await getDoc(jobRef);
  if (jobSnap.exists()) {
    return { id: jobSnap.id, data: jobSnap.data() };
  }
  return null;
};

// Update diagInfo for a specific vehicle
export const updateVehicleDiagInfo = async (
  vehicleId: string,
  diagData: any,
) => {
  const db = getFirestore();
  let dataToSet = { ...diagData };
  if (typeof diagData.mileage !== "undefined") {
    dataToSet.lastMileageUpdate = Date.now();
  }
  const vehicleRef = doc(db, "vehicles", vehicleId);
  await updateDoc(vehicleRef, { diagnosticData: dataToSet });
  return true;
};

// Fetch diagInfo for a specific vehicle
export const getVehicleById = async (vehicleId: string) => {
  const db = getFirestore();
  const vehicleRef = doc(db, "vehicles", vehicleId);
  const vehicleSnap = await getDoc(vehicleRef);
  if (vehicleSnap.exists()) {
    const vehicleData = vehicleSnap.data();
    return vehicleData || null;
  }
  return null;
};

// Function to write user data to Firestore
export const writeData = async (
  userId: string,
  name: string,
  email: string,
) => {
  const db = getFirestore();
  const userData = {
    profile: {
      name: name,
      email: email,
    },
    vehicleIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const userRef = doc(db, "users", userId);
  await setDoc(userRef, userData);
  console.log("Data written successfully");
  return true;
};

// Function to read user data from Firestore
export const readData = async (userId: string) => {
  const db = getFirestore();
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    const userData = userSnap.data();
    console.log(userData);
    return userData;
  } else {
    console.log("No data available");
    return null;
  }
};

// Creates a user profile in the database if it doesn't already exist
export const ensureUserProfile = async (
  user: FirebaseAuthTypes.User,
  role: "user" | "mechanic" = "user",
) => {
  if (!user) return null;

  const db = getFirestore();
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    const userData = {
      profile: {
        name: user.displayName || "",
        email: user.email || "",
        phone: user.phoneNumber || "",
        role: role,
      },
      vehicleIds: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(userRef, userData);
    console.log("Created new user profile in database");
    return userData;
  }
  return userSnap.data();
};

// Retry user profile creation - call this when user tries to access profile features
export const retryUserProfileCreation = async () => {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      console.log("No authenticated user to create profile for");
      return false;
    }

    console.log("Retrying user profile creation for:", currentUser.uid);
    await ensureUserProfile(currentUser);
    console.log("User profile creation retry successful");
    return true;
  } catch (error: any) {
    console.warn("User profile creation retry failed:", error.code);
    return false;
  }
};

// Authentication functions
export const signIn = async (email: string, password: string) => {
  try {
    // Basic validation before attempting sign in
    if (!email || !email.trim()) {
      return {
        user: null,
        error: { code: "auth/empty-email", message: "Email cannot be empty" },
      };
    }

    if (!password || password.length < 6) {
      return {
        user: null,
        error: {
          code: "auth/weak-password",
          message: "Password must be at least 6 characters",
        },
      };
    }

    // Use React Native Firebase auth
    const auth = getAuth();
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );

    // Return successful login immediately - don't wait for Firestore operations
    // Firestore operations will happen in background (non-blocking)
    setTimeout(async () => {}, 100); // Very short delay to not block login UI

    return { user: userCredential.user, error: null };
  } catch (error: any) {
    let errorMessage = "Failed to sign in";
    let errorCode = error.code || "auth/unknown";

    if (error.code === "auth/user-not-found") {
      errorMessage = "No account exists with this email";
    } else if (error.code === "auth/invalid-credential") {
      // invalid-credential can mean wrong password OR user not found
      // Treat as user-not-found for new signup flow
      errorCode = "auth/user-not-found";
      errorMessage = "No account exists with this email";
    } else if (error.code === "auth/wrong-password") {
      errorMessage = "Incorrect password";
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "Invalid email format";
    } else if (error.code === "auth/too-many-requests") {
      errorMessage = "Too many failed login attempts. Please try again later";
    } else if (error.code === "firestore/unavailable") {
      errorMessage = "Database temporarily unavailable. Please try again.";
    }

    return {
      user: null,
      error: {
        code: errorCode,
        message: errorMessage,
        originalError: error,
      },
    };
  }
};

export const signUp = async (
  email: string,
  password: string,
  role: "user" | "mechanic" = "user",
) => {
  try {
    const auth = getAuth();
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );

    console.log("Signup successful, user ID:", userCredential.user.uid);

    // Create user profile in background (non-blocking)
    setTimeout(async () => {
      try {
        console.log("Background: Creating user profile...");
        await ensureUserProfile(userCredential.user, role);
        console.log("Background: User profile created successfully");
      } catch (firestoreError: any) {
        console.warn(
          "Background: Could not create user profile:",
          firestoreError.code,
        );
        // This will be retried later when user accesses profile-related features
      }
    }, 100);

    return { user: userCredential.user, error: null };
  } catch (error) {
    console.error("Firebase signup error:", error);
    return { user: null, error };
  }
};

// Phone Authentication
export const signInWithPhone = async (
  phoneNumber: string,
  role?: "user" | "mechanic",
) => {
  try {
    const auth = getAuth();
    const confirmation = await signInWithPhoneNumber(auth, phoneNumber);
    return { confirmation, error: null };
  } catch (error: any) {
    console.error("Phone sign in error:", error);
    return { confirmation: null, error };
  }
};

export const confirmPhoneCode = async (
  confirmation: any,
  verificationCode: string,
  role: "user" | "mechanic" = "user",
) => {
  try {
    const userCredential = await confirmation.confirm(verificationCode);

    // Create user profile in background (non-blocking)
    setTimeout(async () => {
      try {
        console.log("Background: Creating user profile for phone auth...");
        await ensureUserProfile(userCredential.user, role);
        console.log(
          "Background: User profile created successfully for phone auth",
        );
      } catch (firestoreError: any) {
        console.warn(
          "Background: Could not create user profile for phone auth:",
          firestoreError.code,
        );
      }
    }, 100);

    return { user: userCredential.user, error: null };
  } catch (error: any) {
    console.error("Phone verification error:", error);
    return { user: null, error };
  }
};

// Google Authentication
export const signInWithGoogle = async (role?: "user" | "mechanic") => {
  try {
    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId:
        "578434461817-994bl7g0rqsqljs8e29cncfulv70ej6c.apps.googleusercontent.com",
    });

    // Check if device has Google Play Services
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Sign in with Google
    const userInfo = await GoogleSignin.signIn();

    // Create a Google credential with the token
    const googleCredential = GoogleAuthProvider.credential(
      userInfo.data?.idToken,
    );

    // Sign in with Firebase
    const auth = getAuth();
    const userCredential = await signInWithCredential(auth, googleCredential);

    // Create user profile in background (non-blocking)
    setTimeout(async () => {
      try {
        console.log("Background: Creating user profile for Google auth...");
        await ensureUserProfile(userCredential.user, role);
        console.log(
          "Background: User profile created successfully for Google auth",
        );
      } catch (firestoreError: any) {
        console.warn(
          "Background: Could not create user profile for Google auth:",
          firestoreError.code,
        );
      }
    }, 100);

    return { user: userCredential.user, error: null };
  } catch (error: any) {
    console.error("Google sign in error:", error);
    let errorMessage = "Failed to sign in with Google";
    if (error.code === "auth/account-exists-with-different-credential") {
      errorMessage = "Account exists with different sign-in method";
    } else if (error.code === "auth/invalid-credential") {
      errorMessage = "Invalid Google credential";
    } else if (error.code === "auth/operation-not-allowed") {
      errorMessage = "Google sign-in is not enabled";
    }

    return {
      user: null,
      error: {
        code: error.code || "auth/google-signin-error",
        message: errorMessage,
        originalError: error,
      },
    };
  }
};

// Apple Authentication
export const signInWithApple = async (role?: "user" | "mechanic") => {
  try {
    const appleAuthRequestResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });

    const { identityToken, nonce } = appleAuthRequestResponse;

    if (!identityToken) {
      return {
        user: null,
        error: {
          code: "auth/apple-signin-error",
          message: "Apple Sign-In failed - no identity token returned",
        },
      };
    }

    const appleCredential = AppleAuthProvider.credential(identityToken, nonce);
    const auth = getAuth();
    const userCredential = await signInWithCredential(auth, appleCredential);

    // Create user profile in background (non-blocking)
    setTimeout(async () => {
      try {
        await ensureUserProfile(userCredential.user, role);
      } catch (firestoreError: any) {
        console.warn(
          "Background: Could not create user profile for Apple auth:",
          firestoreError.code,
        );
      }
    }, 100);

    return { user: userCredential.user, error: null };
  } catch (error: any) {
    console.error("Apple sign in error:", error);
    if (error.code === "1001") {
      return { user: null, error: null };
    }
    return {
      user: null,
      error: {
        code: error.code || "auth/apple-signin-error",
        message: "Failed to sign in with Apple",
        originalError: error,
      },
    };
  }
};

export const signOut = async () => {
  const auth = getAuth();
  return authSignOut(auth);
};

export const deleteAccount = async (userId: string) => {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error("No authenticated user found");
    }

    // Delete user profile from Firestore, but keep vehicles intact
    const db = getFirestore();
    const userRef = doc(db, "users", userId);

    // Delete the user profile document
    await deleteDoc(userRef);

    console.log("User profile deleted from Firestore");

    // Then delete the authentication user
    await currentUser.delete();

    console.log("User authentication deleted");

    return { success: true, error: null };
  } catch (error: any) {
    console.error("Account deletion error:", error);
    let errorMessage = "Failed to delete account";

    if (error.code === "auth/requires-recent-login") {
      errorMessage =
        "Please log out and log back in before deleting your account";
    } else if (error.code === "auth/user-not-found") {
      errorMessage = "User account not found";
    }

    return {
      success: false,
      error: {
        code: error.code || "auth/unknown",
        message: errorMessage,
        originalError: error,
      },
    };
  }
};

export const getCurrentUser = () => {
  const auth = getAuth();
  return auth.currentUser;
};

export const onAuthChange = (
  callback: (user: FirebaseAuthTypes.User | null) => void,
) => {
  const auth = getAuth();
  return onAuthStateChanged(auth, callback);
};

export const getUserProfile = async (userId: string) => {
  try {
    const db = getFirestore();
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      return userData?.profile || null;
    } else {
      return null;
    }
  } catch (error: any) {
    console.error("📋 getUserProfile error:", {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

export const updateUserProfile = async (userId: string, profileData: any) => {
  try {
    const db = getFirestore();
    const userRef = doc(db, "users", userId);

    // Update only the profile fields within the profile object
    await updateDoc(userRef, {
      profile: {
        ...profileData,
      },
      updatedAt: serverTimestamp(),
    });

    console.log("User profile updated successfully");
    return true;
  } catch (error: any) {
    console.error("📋 updateUserProfile error:", {
      code: error.code,
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

// Debug function to check Firestore data across databases
export const debugFirestoreData = async (userId: string) => {
  console.log("🔍 Starting comprehensive Firestore debugging...");

  try {
    // Check auth state
    const currentUser = getAuth().currentUser;
    console.log("🔍 Current user:", {
      uid: currentUser?.uid,
      email: currentUser?.email,
      displayName: currentUser?.displayName,
    });

    // Check different database references
    const defaultDb = getFirestore();

    console.log("🔍 Testing basic Firestore connectivity...");
    try {
      const testRef = doc(db, "test", "connectivity");
      console.log("🔍 Created test reference successfully");

      await setDoc(testRef, {
        timestamp: new Date().toISOString(),
        test: true,
        userId: userId,
      });
      console.log("🔍 Firestore write test successful");

      const testSnap = await getDoc(testRef);
      console.log("🔍 Firestore read test successful:", testSnap.data());

      await deleteDoc(testRef);
      console.log("🔍 Firestore delete test successful");
    } catch (connectivityError: any) {
      console.error(
        "🔍 Firestore connectivity test failed:",
        connectivityError,
      );
      console.error("🔍 Error code:", connectivityError.code);
      console.error("🔍 Error message:", connectivityError.message);
    }

    console.log("🔍 Checking users collection in default database...");
    try {
      const defaultUserRef = doc(db, "users", userId);
      const defaultUserSnap = await getDoc(defaultUserRef);
      console.log("🔍 Default DB user exists:", defaultUserSnap.exists());
      if (defaultUserSnap.exists()) {
        console.log("🔍 Default DB user data:", defaultUserSnap.data());
      }
    } catch (error) {
      console.error("🔍 Error checking default DB:", error);
    }

    console.log("🔍 Checking vehicles collection in default database...");
    try {
      const vehiclesQuery = query(
        collection(db, "vehicles"),
        where("ownerId", "array-contains", userId),
      );
      const defaultVehiclesSnap = await getDocs(vehiclesQuery);
      console.log("🔍 Default DB vehicles count:", defaultVehiclesSnap.size);
      defaultVehiclesSnap.forEach((doc: any) => {
        console.log("🔍 Default DB vehicle:", doc.id, doc.data());
      });
    } catch (error) {
      console.error("🔍 Error checking default DB vehicles:", error);
    }
  } catch (error) {
    console.error("🔍 Debug function error:", error);
  }
};

// Vehicle-specific functions
export const getVehicles = async (userId: string) => {
  const db = getFirestore();
  const vehicles: any[] = [];
  const seenIds = new Set<string>();

  const add = (d: any) => {
    if (!seenIds.has(d.id)) {
      seenIds.add(d.id);
      vehicles.push({ id: d.id, ...d.data() });
    }
  };

  // Primary: fetch via user's vehicleIds array
  try {
    const userSnap = await getDoc(doc(db, "users", userId));
    const vehicleIds: string[] = userSnap.data()?.vehicleIds ?? [];
    await Promise.all(
      vehicleIds.map(async (vid) => {
        try {
          const vSnap = await getDoc(doc(db, "vehicles", vid));
          if (vSnap.exists()) add(vSnap);
        } catch (e) {
          console.warn(`[getVehicles] failed to fetch vehicle ${vid}:`, e);
        }
      }),
    );
  } catch (e) {
    console.warn("[getVehicles] user doc fetch failed:", e);
  }

  // Shared: drivers array-contains
  try {
    const driversSnap = await getDocs(
      query(
        collection(db, "vehicles"),
        where("drivers", "array-contains", userId),
      ),
    );
    driversSnap.forEach(add);
  } catch (e) {
    console.warn("[getVehicles] drivers array-contains query failed:", e);
  }

  // Legacy: owner string field
  try {
    const legacyOwnerSnap = await getDocs(
      query(collection(db, "vehicles"), where("owner", "==", userId)),
    );
    legacyOwnerSnap.forEach(add);
  } catch (e) {
    console.warn("[getVehicles] owner == query failed:", e);
  }

  return vehicles;
};

export const addVehicle = async (userId: string, vehicleData: any) => {
  const db = getFirestore();
  const vehicleWithOwner = {
    ...vehicleData,
    ownerId: [userId],
    drivers: [],
  };
  const vehiclesCol = collection(db, "vehicles");
  const docRef = await addDoc(vehiclesCol, vehicleWithOwner);
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, { vehicleIds: arrayUnion(docRef.id) });
  return { id: docRef.id };
};

export const updateVehicle = async (vehicleId: string, vehicleData: any) => {
  const db = getFirestore();
  const vehicleRef = doc(db, "vehicles", vehicleId);
  await updateDoc(vehicleRef, vehicleData);
  return { id: vehicleId };
};

export const deleteVehicle = async (userId: string, vehicleId: string) => {
  const db = getFirestore();
  const vehicleRef = doc(db, "vehicles", vehicleId);
  await deleteDoc(vehicleRef);
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, { vehicleIds: arrayRemove(vehicleId) });
  return true;
};

// Add a driver to a vehicle. Stores masked display info so no cross-user
// reads are needed when listing drivers.
export const addVehicleOwner = async (
  vehicleId: string,
  newOwnerId: string,
  driverInfo: { name: string; maskedEmail: string },
) => {
  const db = getFirestore();
  const vehicleRef = doc(db, "vehicles", vehicleId);
  await updateDoc(vehicleRef, {
    drivers: arrayUnion(newOwnerId),
    [`driverProfiles.${newOwnerId}`]: driverInfo,
  });
  return true;
};

// Remove a driver from a vehicle and delete their stored display info.
export const removeVehicleOwner = async (
  vehicleId: string,
  driverUid: string,
) => {
  const db = getFirestore();
  const vehicleRef = doc(db, "vehicles", vehicleId);

  // Remove from ownerId array. Also remove from legacy drivers field as a safe no-op.
  await updateDoc(vehicleRef, {
    drivers: arrayRemove(driverUid),
  });

  // Delete the stored display profile separately — dynamic key + deleteField()
  // in a combined updateDoc can fail on react-native-firebase.
  try {
    await updateDoc(vehicleRef, {
      [`driverProfiles.${driverUid}`]: deleteField(),
    });
  } catch {
    // Non-critical — just display metadata cleanup.
  }

  return true;
};

export const getDiagnosticLogs = async (userId: string, vehicleId: string) => {
  const db = getFirestore();
  const logsCol = collection(db, "diagnostic_logs");
  const logsQuery = query(
    logsCol,
    where("vehicleId", "==", vehicleId),
    where("userId", "==", userId),
  );
  const logsSnapshot = await getDocs(logsQuery);
  const logs = logsSnapshot.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data(),
  }));
  return logs;
};

export const updateUserAddress = async (
  userId: string,
  addressType: "homeAddress" | "workAddress",
  address: string,
) => {
  const db = getFirestore();
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    [`profile.${addressType}`]: address,
    updatedAt: serverTimestamp(),
  });
  console.log(`User ${addressType} updated successfully`);
  return true;
};

export const getJobsList = async () => {
  const db = getFirestore();
  const jobsCol = collection(db, "jobs");
  const jobsQuery = query(jobsCol, where("status", "==", "available"));
  const jobsSnapshot = await getDocs(jobsQuery);
  const jobs = jobsSnapshot.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data(),
  }));
  return jobs;
};

export const claimJob = async (
  jobId: string,
  mechanicId: string | undefined,
) => {
  if (!mechanicId) {
    throw new Error("Mechanic ID is required to claim a job");
  }

  const db = getFirestore();
  const jobRef = doc(db, "jobs", jobId);
  await updateDoc(jobRef, {
    status: "claimed",
    mechanicId: mechanicId,
    claimedAt: serverTimestamp(),
  });
  console.log(`Job ${jobId} claimed by mechanic ${mechanicId}`);
  return true;
};

export const getMyJobs = async (mechanicId: string) => {
  const jobsCol = collection(db, "jobs");
  const jobsQuery = query(jobsCol, where("mechanicId", "==", mechanicId));
  const jobsSnapshot = await getDocs(jobsQuery);
  const jobs = jobsSnapshot.docs.map((doc: any) => ({
    id: doc.id,
    ...doc.data(),
  }));
  return jobs;
};

export const releaseJob = async (jobId: string) => {
  const db = getFirestore();
  const jobRef = doc(db, "jobs", jobId);
  await updateDoc(jobRef, {
    status: "available",
    mechanicId: null,
    claimedAt: null,
  });
  console.log(`Job ${jobId} released back to available`);
  return true;
};

export const createJob = async (jobData: any) => {
  const db = getFirestore();
  const jobsCol = collection(db, "jobs");
  const docRef = await addDoc(jobsCol, {
    ...jobData,
    createdAt: serverTimestamp(),
  });
  console.log(`Job created with ID: ${docRef.id}`);
  return { id: docRef.id };
};

export const updateJobStatus = async (
  jobId: string,
  newStatus: "available" | "claimed" | "in_progress" | "completed",
) => {
  const db = getFirestore();
  const jobRef = doc(db, "jobs", jobId);

  const updateData: any = {
    status: newStatus,
    updatedAt: serverTimestamp(),
  };

  // When marking a job as available, clear mechanic assignment
  if (newStatus === "available") {
    updateData.mechanicId = null;
    updateData.claimedAt = null;
  }

  await updateDoc(jobRef, updateData);
  console.log(`Job ${jobId} status updated to ${newStatus}`);
  return true;
};

export const addCarOwner = async (email: String) => {
  // TODO
};

export default {
  initializeFirebase,
  readData,
  writeData,
  signIn,
  signUp,
  signInWithPhone,
  confirmPhoneCode,
  signInWithGoogle,
  signInWithApple,
  signOut,
  getCurrentUser,
  getJob,
  onAuthChange,
  getVehicles,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  addVehicleOwner,
  removeVehicleOwner,
  getDiagnosticLogs,
  ensureUserProfile,
  getUserProfile,
  updateUserAddress,
  getVehicleById,
  updateVehicleDiagInfo,
  uploadVehicleImage,
  retryUserProfileCreation,
  debugFirestoreData,
  getJobsList,
  getMyJobs,
  claimJob,
  releaseJob,
  createJob,
  updateJobStatus,
  updateUserProfile,
  addCarOwner,
  uploadMechanicDocument,
  saveMechanicProfile,
  getMechanicProfile,
  updateMechanicOnboardingStatus,
};
