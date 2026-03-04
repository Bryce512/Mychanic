import React, { createContext, useContext, useState, useEffect } from "react";
import type { FirebaseAuthTypes } from "@react-native-firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import firebaseService, {
  getUserProfile,
  signInWithPhone,
  confirmPhoneCode,
  signInWithGoogle,
  signInWithApple,
} from "../services/firebaseService";
import * as types from "../../types";

type AuthContextType = {
  user: FirebaseAuthTypes.User | null;
  profile: types.userProfile | null;
  viewMode: "user" | "mechanic" | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    role?: "user" | "mechanic",
  ) => Promise<{ error: any; user: FirebaseAuthTypes.User | null }>;
  signInWithPhone: (
    phoneNumber: string,
    role?: "user" | "mechanic",
  ) => Promise<{ confirmation: any; error: any }>;
  confirmPhoneCode: (
    confirmation: any,
    verificationCode: string,
    role?: "user" | "mechanic",
  ) => Promise<{ user: FirebaseAuthTypes.User | null; error: any }>;
  signInWithGoogle: (
    role?: "user" | "mechanic",
  ) => Promise<{ user: FirebaseAuthTypes.User | null; error: any }>;
  signInWithApple: (
    role?: "user" | "mechanic",
  ) => Promise<{ user: FirebaseAuthTypes.User | null; error: any }>;
  signOut: () => Promise<void>;
  toggleViewMode: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<types.userProfile | null>(null);
  const [viewMode, setViewMode] = useState<"user" | "mechanic" | null>(null);

  // Load stored user data when app starts
  useEffect(() => {
    // Check for stored credentials on startup
    const loadStoredUser = async () => {
      try {
        const storedUserData = await AsyncStorage.getItem("userData");
        if (storedUserData) {
          setUser(JSON.parse(storedUserData));
          let profile = await getUserProfile(JSON.parse(storedUserData).uid);
          setProfile(profile || null);
          // Initialize viewMode based on user role
          if (profile?.role === "mechanic") {
            setViewMode("mechanic"); // Default to mechanic view for mechanics
          } else {
            setViewMode("user"); // Always user view for non-mechanics
          }
        }
      } catch (error) {
        console.error("Failed to load authentication state:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredUser();

    // Also listen to Firebase auth state changes
    const unsubscribe = firebaseService.onAuthChange(async (firebaseUser) => {
      console.log(
        "Auth state changed:",
        firebaseUser ? "logged in" : "logged out",
      );
      if (firebaseUser) {
        // User is logged in
        setUser(firebaseUser);
        try {
          let profile = await getUserProfile(firebaseUser.uid);
          setProfile(profile || null);
        } catch (error) {
          console.error("Error loading profile:", error);
          setProfile(null);
        }
      } else {
        // User is logged out
        setUser(null);
        setProfile(null);
        setViewMode(null);
        await AsyncStorage.removeItem("userData");
      }
    });

    return () => unsubscribe();
  }, []);

  // Update viewMode when profile changes
  useEffect(() => {
    if (profile?.role === "mechanic") {
      setViewMode("mechanic");
    } else {
      setViewMode("user");
    }
  }, [profile?.role]);

  const toggleViewMode = () => {
    // Only allow toggling if user is a mechanic
    if (profile?.role === "mechanic") {
      setViewMode((prevMode) =>
        prevMode === "mechanic" ? "user" : "mechanic",
      );
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Your existing sign in logic
      const response = await firebaseService.signIn(email, password);

      // If login successful, store user data
      if (response.user && !response.error) {
        await AsyncStorage.setItem("userData", JSON.stringify(response.user));
        setUser(response.user);
        let profile = await getUserProfile(response.user.uid);
        setProfile(profile || null);
      }

      return response;
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    role: "user" | "mechanic" = "user",
  ) => {
    try {
      // Your existing sign up logic
      const response = await firebaseService.signUp(email, password, role);

      // If signup successful, store user data
      if (response.user && !response.error) {
        await AsyncStorage.setItem("userData", JSON.stringify(response.user));
        setUser(response.user);
        return { user: response.user, error: null };
      }

      // If signup failed, ensure both user and error are present
      return { user: null, error: response.error ?? "Unknown error" };
    } catch (error) {
      return { user: null, error };
    }
  };

  const signOut = async () => {
    try {
      // Your existing sign out logic
      await firebaseService.signOut();

      // Clear stored user data
      await AsyncStorage.removeItem("userData");
      setUser(null);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const signInWithPhoneAuth = async (
    phoneNumber: string,
    role: "user" | "mechanic" = "user",
  ) => {
    try {
      const response = await signInWithPhone(phoneNumber, role);
      return response;
    } catch (error) {
      return { confirmation: null, error };
    }
  };

  const confirmPhoneCodeAuth = async (
    confirmation: any,
    verificationCode: string,
    role: "user" | "mechanic" = "user",
  ) => {
    try {
      const response = await confirmPhoneCode(
        confirmation,
        verificationCode,
        role,
      );

      // If phone verification successful, store user data
      if (response.user && !response.error) {
        await AsyncStorage.setItem("userData", JSON.stringify(response.user));
        setUser(response.user);
        let profile = await getUserProfile(response.user.uid);
        setProfile(profile || null);
      }

      return response;
    } catch (error) {
      return { user: null, error };
    }
  };

  const signInWithGoogleAuth = async (role: "user" | "mechanic" = "user") => {
    try {
      const response = await signInWithGoogle(role);

      // If Google sign in successful, store user data
      if (response.user && !response.error) {
        await AsyncStorage.setItem("userData", JSON.stringify(response.user));
        setUser(response.user);
        let profile = await getUserProfile(response.user.uid);
        setProfile(profile || null);
      }

      return response;
    } catch (error) {
      return { user: null, error };
    }
  };

  const signInWithAppleAuth = async (role: "user" | "mechanic" = "user") => {
    try {
      const response = await signInWithApple(role);

      if (response.user && !response.error) {
        await AsyncStorage.setItem("userData", JSON.stringify(response.user));
        setUser(response.user);
        let profile = await getUserProfile(response.user.uid);
        setProfile(profile || null);
      }

      return response;
    } catch (error) {
      return { user: null, error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        viewMode,
        isLoading,
        signIn,
        signUp,
        signInWithPhone: signInWithPhoneAuth,
        confirmPhoneCode: confirmPhoneCodeAuth,
        signInWithGoogle: signInWithGoogleAuth,
        signInWithApple: signInWithAppleAuth,
        signOut,
        toggleViewMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
