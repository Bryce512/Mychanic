// app.tsx

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';

// Import screens here
import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import Settings from './src/screens/settings';
import ScanDevicesScreen from './src/screens/ScanDevices';

// Define RootStackParamList with all screen names
export type RootStackParamList = {
  Splash: undefined;
  Home: undefined;
  Settings: undefined;
  ScanDevices: undefined;
};

// Your screens array can stay as is
export const screens: { name: keyof RootStackParamList; component: React.ComponentType<any>; options: object }[] = [
  { name: 'Splash', component: SplashScreen, options: { headerShown: false } },
  { name: 'Home', component: HomeScreen, options: { title: 'My Garage' } },
  { name: 'Settings', component: Settings, options: { title: 'Settings' } },
  { name: 'ScanDevices', component: ScanDevicesScreen, options: { title: 'Scan Devices' } },
];

// Stack Navigator Setup
const Stack = createNativeStackNavigator<RootStackParamList>();  // Use the type here

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash">
        {screens.map(({ name, component, options }) => (
          <Stack.Screen
            key={name}
            name={name}
            component={component}
            options={options}
          />
        ))}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;