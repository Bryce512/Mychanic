/**
 * @format
 */
// index.tsx or App.tsx
import React from 'react';
import { AppRegistry } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler'; // Import this
import App from './App';
import { name as appName } from './app.json';

const RootComponent = () => {
  return (
    // Wrap the App in GestureHandlerRootView
    <GestureHandlerRootView style={{ flex: 1 }}>
      <App />
    </GestureHandlerRootView>
  );
};

AppRegistry.registerComponent(appName, () => RootComponent);
