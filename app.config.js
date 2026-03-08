import "dotenv/config";

export default {
  expo: {
    name: "Mychanic",
    slug: "Mychanic",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#003566",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.bryce512.Mychanic",
      googleServicesFile: "./ios/Mychanic/GoogleService-Info.plist",
      infoPlist: {
        NSBluetoothAlwaysUsageDescription:
          "This app uses Bluetooth to connect to your OBD-II device.",
        NSBluetoothPeripheralUsageDescription:
          "This app uses Bluetooth to connect to your OBD-II device.",
        NSLocationWhenInUseUsageDescription:
          "This app uses location to find nearby mechanics and services.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "This app uses location to find nearby mechanics and services.",
        NSUserNotificationUsageDescription:
          "Mychanic sends reminders to keep your vehicle mileage up to date.",
        UIBackgroundModes: ["bluetooth-central", "remote-notification"],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#003566",
      },
      edgeToEdgeEnabled: true,
      package: "com.bryce512.Mychanic",
      googleServicesFile: "./google-services.json",
      permissions: [
        "android.permission.BLUETOOTH",
        "android.permission.BLUETOOTH_ADMIN",
        "android.permission.BLUETOOTH_CONNECT",
        "android.permission.BLUETOOTH_SCAN",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.RECEIVE_BOOT_COMPLETED",
      ],
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      "@react-native-firebase/messaging",
      "react-native-ble-manager",
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Allow Mychanic to use your location to find nearby mechanics and services.",
          locationAlwaysPermission:
            "Allow Mychanic to use your location to find nearby mechanics and services.",
          locationWhenInUsePermission:
            "Allow Mychanic to use your location to find nearby mechanics and services.",
        },
      ],
      [
        "expo-build-properties",
        {
          ios: {
            infoPlist: {
              NSBluetoothAlwaysUsageDescription:
                "This app uses Bluetooth to connect to your OBD-II device.",
              NSBluetoothPeripheralUsageDescription:
                "This app uses Bluetooth to connect to your OBD-II device.",
              NSLocationWhenInUseUsageDescription:
                "This app uses location to find nearby mechanics and services.",
              NSLocationAlwaysAndWhenInUseUsageDescription:
                "This app uses location to find nearby mechanics and services.",
              NSUserNotificationUsageDescription:
                "Mychanic sends reminders to keep your vehicle mileage up to date.",
              UIBackgroundModes: ["bluetooth-central", "remote-notification"],
            },
          },
          android: {
            permissions: [
              "android.permission.BLUETOOTH",
              "android.permission.BLUETOOTH_ADMIN",
              "android.permission.BLUETOOTH_CONNECT",
              "android.permission.BLUETOOTH_SCAN",
              "android.permission.ACCESS_FINE_LOCATION",
              "android.permission.ACCESS_COARSE_LOCATION",
              "android.permission.POST_NOTIFICATIONS",
              "android.permission.RECEIVE_BOOT_COMPLETED",
            ],
          },
        },
      ],
      "react-native-ble-plx",
    ],
    extra: {
      // This makes environment variables available at runtime
      EXPO_PUBLIC_OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
    },
  },
};
