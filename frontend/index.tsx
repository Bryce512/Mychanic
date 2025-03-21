import React from "react";
import { AppRegistry } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import App from "./App";
import { name as appName } from "./app.json";

// Import the Firebase initialization
// import "./firebaseConfig"; // Ensure this is imported to initialize Firebase

const RootComponent = () => {
  return (
    // Wrap the App in GestureHandlerRootView
    <GestureHandlerRootView style={{ flex: 1 }}>
      <App />
    </GestureHandlerRootView>
  );
};

AppRegistry.registerComponent(appName, () => RootComponent);
