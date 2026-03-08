"use client";
import React from "react";
import { Share, StatusBar } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../components/theme-provider";

// Define user roles for type safety
export type UserRole = "user" | "mechanic" | "admin";

// HOW TO USE ROLE-BASED AUTH:
//
// 1. To add a new screen with role restrictions:
//    Use conditional rendering with hasRole():
//
//    {hasRole(profile?.role, ["mechanic"]) && (
//      <Stack.Screen name="MechanicOnlyScreen" component={MechanicOnlyScreen} />
//    )}
//
// 2. Available roles: "user" (customers), "mechanic", "admin"
//
// 3. For role checks in components, use the hasRole utility:
//    import { hasRole } from './AppNavigator';
//    if (hasRole(profile?.role, ["mechanic", "admin"])) { ... }
//
// 4. To add customer-only screens, use:
//    {hasRole(profile?.role, ["user", "admin"]) && (
// Utility function to check if user has required role
export function hasRole(
  userRole: string | null | undefined,
  allowedRoles: UserRole[],
): boolean {
  return userRole ? allowedRoles.includes(userRole as UserRole) : false;
}

// HOW TO USE ROLE-BASED AUTH:
//
// 1. To add a new screen with role restrictions:
//    Use conditional rendering with hasRole():
//
//    {hasRole(profile?.role, ["mechanic"]) && (
//      <Stack.Screen name="MechanicOnlyScreen" component={MechanicOnlyScreen} />
//    )}
//
// 2. Available roles: "user" (customers), "mechanic", "admin"
//
// 3. For role checks in components, use the hasRole utility:
//    import { hasRole } from './AppNavigator';
//    if (hasRole(profile?.role, ["mechanic", "admin"])) { ... }
//
// 4. To add customer-only screens, use:
//    {hasRole(profile?.role, ["user", "admin"]) && (
//
// 5. All authenticated users can access screens not wrapped in conditionals

// Screens
import HomeScreen from "../screens/Home";
import FindMechanicsScreen from "../screens/FindMechanics";
import VehicleProfilesScreen from "../screens/VehicleProfiles";
import AddVehicleScreen from "../screens/AddVehicle";
import BookAppointmentScreen from "../screens/BookAppointment";
import ProfileScreen from "../screens/Profile";
import JobDetails from "../screens/JobDetails";
import ScanDevicesScreen from "../screens/ScanDevices";
import LoginScreen from "../screens/Login";
import SignupScreen from "../screens/Signup";
import EditVehicleInfoScreen from "../screens/EditVehicleInfo";
import AddProfileScreen from "../screens/AddProfile";
import EditProfileScreen from "../screens/EditProfile";
import DiagnosticAssistantScreen from "../screens/DiagnosticChat";
import MechanicDashboardScreen from "../screens/MechanicDashboard";
import LiveDataScreen from "../screens/LiveData";
import JobsListScreen from "../screens/JobsList";
import FeedbackScreen from "../screens/Feedback";
import RequestJobScreen from "../screens/RequestJob";
import CheckoutScreen from "../screens/Checkout";
import FullDiagnosticsScreen from "../screens/FullDiagnostics";
import ShareVehicle from "../screens/ShareVehicle";
import DriverOnboardingScreen from "../screens/driverOnBoarding";
import AdminReviewMechanicsScreen from "../screens/AdminReviewMechanics";

export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Signup: { role: string };
  BookAppointment: { mechanicId: number };
  JobDetails: { jobId: string };
  DiagnosticAssistant: undefined;
  MechanicDashboard: undefined;
  ScanDevices: undefined;
  Profile: undefined;
  EditVehicleInfo: { vehicle: any; userId: string };
  AddVehicle: undefined;
  FindMechanics: undefined;
  VehicleProfiles: undefined;
  AddProfile: undefined;
  EditProfile: undefined;
  LiveData: undefined;
  JobsList: { isMyJobs?: boolean };
  Feedback: undefined;
  RequestJob: undefined;
  Checkout: {
    jobId?: string;
    amount: number;
    description: string;
    mechanicName?: string;
  };
  FullDiagnostics: { vehicleId: string };
  ShareVehicle: undefined;
  DriverOnboarding: undefined;
  AdminReviewMechanics: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();
const VehiclesStack = createNativeStackNavigator();

function VehiclesStackScreen() {
  const { colors } = useTheme();

  return (
    <VehiclesStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary[500] },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: "bold", fontSize: 20 },
      }}
    >
      <VehiclesStack.Screen
        name="VehicleProfiles"
        component={VehicleProfilesScreen}
        options={{ title: "My Vehicles" }}
      />
      <VehiclesStack.Screen
        name="AddVehicle"
        component={AddVehicleScreen}
        options={{ title: "Add Vehicle" }}
      />
      <VehiclesStack.Screen
        name="EditVehicleInfo"
        component={EditVehicleInfoScreen}
        options={{ title: "Edit Vehicle Info" }}
      />
    </VehiclesStack.Navigator>
  );
}

function MainTabs() {
  const { colors, isDark } = useTheme();
  const { profile, viewMode } = useAuth();
  const isMechanic = viewMode === "mechanic" && profile?.role === "mechanic";
  const isAdmin = profile?.role === "admin";

  return (
    <Tab.Navigator
      initialRouteName={
        isMechanic || isAdmin ? "MechanicDashboard" : "Vehicles"
      }
      screenOptions={{
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: isDark ? colors.gray[400] : colors.gray[500],
        tabBarStyle: {
          backgroundColor: isDark ? colors.gray[900] : colors.white,
          borderTopColor: isDark ? colors.gray[800] : colors.gray[200],
        },
        headerShown: true,
        headerStyle: { backgroundColor: colors.primary[500] },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: "bold", fontSize: 20 },
      }}
    >
      {isMechanic || isAdmin ? (
        <>
          <Tab.Screen
            name="MechanicDashboard"
            component={MechanicDashboardScreen}
            options={{
              title: "Dashboard",
              tabBarIcon: ({ color, size }) => (
                <Feather name="grid" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="JobsList"
            component={JobsListScreen}
            options={{
              title: "Jobs",
              tabBarIcon: ({ color, size }) => (
                <Feather name="briefcase" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Vehicles"
            component={VehiclesStackScreen}
            options={{
              headerShown: false,
              tabBarIcon: ({ color, size }) => (
                <Feather name="truck" size={size} color={color} />
              ),
            }}
          />
        </>
      ) : (
        <>
          <Tab.Screen
            name="FindMechanics"
            component={FindMechanicsScreen}
            options={{
              title: "Find Mechanics",
              tabBarIcon: ({ color, size }) => (
                <Feather name="search" size={size} color={color} />
              ),
            }}
          />
          <Tab.Screen
            name="Vehicles"
            component={VehiclesStackScreen}
            options={{
              headerShown: false,
              tabBarIcon: ({ color, size }) => (
                <Feather name="truck" size={size} color={color} />
              ),
            }}
          />
        </>
      )}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

import { View, ActivityIndicator } from "react-native";

export default function AppNavigator() {
  const { user, isLoading, profile, viewMode } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation();

  // Navigate to Main tabs when user is authenticated
  React.useEffect(() => {
    if (user && !isLoading) {
      navigation.navigate("Main" as never);
    }
  }, [viewMode, user, isLoading, navigation]);

  // Set global status bar for blue headers
  React.useEffect(() => {
    StatusBar.setBarStyle("light-content", true);
  }, []);

  // Debug logging

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.white,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary[500] },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: "bold", fontSize: 20 },
      }}
    >
      {user ? (
        <>
          {/* Main tab navigator - always the initial screen */}
          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{ headerShown: false }}
          />

          {/* Stack screens accessible from within tabs */}
          <Stack.Screen
            name="MechanicDashboard"
            component={MechanicDashboardScreen}
            options={{ title: "Dashboard" }}
          />
          {viewMode === "mechanic" && (
            <Stack.Screen
              name="JobsList"
              component={JobsListScreen}
              options={{ title: "Jobs" }}
            />
          )}

          {/* Profile screen - available to all authenticated users */}
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ title: "Profile" }}
          />

          <Stack.Screen
            name="BookAppointment"
            component={BookAppointmentScreen}
            options={{ title: "Book Appointment" }}
          />
          <Stack.Screen
            name="JobDetails"
            component={JobDetails}
            options={{ title: "Job Details" }}
          />
          <Stack.Screen name="ScanDevices" component={ScanDevicesScreen} />
          <Stack.Screen
            name="EditVehicleInfo"
            component={EditVehicleInfoScreen}
            options={{ title: "Edit Vehicle Info" }}
          />
          <Stack.Screen
            name="AddVehicle"
            component={AddVehicleScreen}
            options={{ title: "Add Vehicle" }}
          />
          <Stack.Screen
            name="FindMechanics"
            component={FindMechanicsScreen}
            options={{ title: "Find Mechanics" }}
          />
          <Stack.Screen
            name="AddProfile"
            component={AddProfileScreen}
            options={{ title: "Complete Profile" }}
          />
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{ title: "Edit Profile" }}
          />
          <Stack.Screen
            name="DiagnosticAssistant"
            component={DiagnosticAssistantScreen}
            options={{ title: "Diagnostic AI" }}
          />
          <Stack.Screen
            name="LiveData"
            component={LiveDataScreen}
            options={{ title: "Live Data" }}
          />
          <Stack.Screen
            name="Feedback"
            component={FeedbackScreen}
            options={{ title: "Send Feedback" }}
          />
          <Stack.Screen
            name="RequestJob"
            component={RequestJobScreen}
            options={{ title: "Request Job" }}
          />
          <Stack.Screen
            name="Checkout"
            component={CheckoutScreen}
            options={{ title: "Checkout" }}
          />
          <Stack.Screen
            name="FullDiagnostics"
            component={FullDiagnosticsScreen}
            options={{ title: "Full Diagnostics" }}
          />
          <Stack.Screen
            name="ShareVehicle"
            component={ShareVehicle}
            options={{ title: "Manage Drivers" }}
          />
          <Stack.Screen
            name="DriverOnboarding"
            component={DriverOnboardingScreen}
            options={{ title: "Mechanic Onboarding" }}
          />
          {hasRole(profile?.role, ["admin"]) && (
            <Stack.Screen
              name="AdminReviewMechanics"
              component={AdminReviewMechanicsScreen}
              options={{ title: "Review Mechanics" }}
            />
          )}
        </>
      ) : (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ title: "Login", headerShown: false }}
          />
          <Stack.Screen
            name="Signup"
            component={SignupScreen}
            options={{ title: "Sign Up", headerShown: false }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
