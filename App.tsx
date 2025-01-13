/* eslint-disable react-hooks/exhaustive-deps */
import React, {useEffect, useState} from 'react';
import {View, Button, StyleSheet} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {GestureHandlerRootView} from 'react-native-gesture-handler';

// Import Screens
import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import SettingScreen from './src/screens/SettingsScreen';
import ClickScreen from './src/screens/ClickMenu';
import DataScreen from './src/screens/LiveData';
import SoundScreen from './src/screens/SoundsLike';
import FeelScreen from './src/screens/FeelScreen';
import NotWorking from './src/screens/NotWorking';
import DashLib from './src/screens/DashlightLibrary';
import LooksLike from './src/screens/Looks';
import Smells from './src/screens/Smells';

// Import Theme and Bluetooth Manager
import theme from './src/styles/StylizedComponents';
import BluetoothManager from './src/services/BluetoothManager';

// Navigation Setup
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Default Screen Options
const defaultScreenOptions = {
  headerStyle: theme.headerBackground,
  headerTitleStyle: theme.headerText,
  headerTintColor: 'white',
  headerBackTitleVisible: false,
};

const App = () => {
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [deviceFound, setDeviceFound] = useState<boolean>(false);
  const [deviceConnected, setDeviceConnected] = useState(false);
  const btManager = new BluetoothManager();

  useEffect(() => {
    btManager
      .startScan()
      .then(() => {
        setIsScanning(false);
        setDeviceFound(true);
        return btManager.connectToDevice();
      })
      .then(() => {
        console.log('Device connection successful');
        setDeviceConnected(true);
      })
      .catch(error => {
        setIsScanning(false);
        console.error('Error during scan or connection:', error);
      });
  }, []);

  const disconnect = (): void => {
    btManager
      .disconnectFromDevice()
      .then(() => {
        setDeviceConnected(false);
      })
      .catch(error => {
        console.error('Device disconnect error:', error);
      });
  };

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Splash">
          <Stack.Screen
            name="Splash"
            component={SplashScreen}
            initialParams={{theme, isScanning, deviceFound, Stack}}
            options={{headerShown: false}}
          />
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            initialParams={{theme, Stack}}
            options={{title: 'My Garage', headerShown: false}}
          />
          <Stack.Screen
            name="Settings"
            component={SettingScreen}
            initialParams={{theme, Stack}}
            options={{title: 'Settings', ...defaultScreenOptions}}
          />
          <Stack.Screen
            name="ClickMenu"
            component={ClickScreen}
            initialParams={{theme, Stack}}
            options={{title: 'Issue?', ...defaultScreenOptions}}
          />
          <Stack.Screen
            name="DataScreen"
            component={DataScreen}
            initialParams={{theme}}
            options={{title: 'DataScreen', ...defaultScreenOptions}}
          />
          <Stack.Screen
            name="SoundScreen"
            component={SoundScreen}
            initialParams={{theme}}
            options={{title: 'Sounds', ...defaultScreenOptions}}
          />
          <Stack.Screen
            name="FeelScreen"
            component={FeelScreen}
            initialParams={{theme}}
            options={{title: 'Feels Wrong', ...defaultScreenOptions}}
          />
          <Stack.Screen
            name="DashLib"
            component={DashLib}
            initialParams={{theme}}
            options={{title: 'Dashlight Library', ...defaultScreenOptions}}
          />
          <Stack.Screen
            name="NotWorking"
            component={NotWorking}
            initialParams={{theme}}
            options={{title: 'Not Working?', ...defaultScreenOptions}}
          />
          <Stack.Screen
            name="Looks"
            component={LooksLike}
            initialParams={{theme}}
            options={{title: 'Looks Like', ...defaultScreenOptions}}
          />
          <Stack.Screen
            name="Smells"
            component={Smells}
            initialParams={{theme}}
            options={{title: 'Smells Like', ...defaultScreenOptions}}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
};

export default App;
