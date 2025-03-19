/* eslint-disable no-bitwise */
import React, { useState, useEffect } from 'react';
// import { NodeJS } from 'node';
import { View, Button, Text, Image, StyleSheet, ScrollView } from 'react-native';
import {pidCommands}from '../services/pidCommands';
import {useBleConnection} from '../services/bleConnections';



const ScanDevicesScreen = () => {

  const { isScanning, isConnected, device,  logMessage, handleScanAndConnect, sendCommand, handleDisconnect } = useBleConnection();
  const {getCurrentVoltage,
         getEngineRPM,
  } = pidCommands();
  const [log, setLog] = useState([]);
  const [voltage, setVoltage] = useState<string | null>(null);
  const [RPM, setRPM] = useState<string | null>(null);
 

// const writableUUID = '0000fff2-0000-1000-8000-00805f9b34fb'; // Correct writable UUID
// const readableUUID = '0000fff1-0000-1000-8000-00805f9b34fb'; // Correct readable UUID
// const serviceUUID = '0000fff0-0000-1000-8000-00805f9b34fb'; // Correct service UUID

const fetchData = async () => {
  logMessage('Fetching data...');
  await fetchVoltage();
  await fetchEngineRPM();
};

const fetchVoltage = async () => {
  try {
    if (!device) {
      console.error("Device is null. Cannot send command.");
      return;
    }
    const voltageResponse = await sendCommand(device, "AT RV");

    // Ensure it's a valid voltage response before updating state
    if (voltageResponse.match(/^\d+\.\d+V$/)) {
      setVoltage(voltageResponse);
    } else {
      console.warn("Invalid voltage response:", voltageResponse);
    }
  } catch (error) {
    console.error("Error fetching voltage:", error);
  }
};
const fetchEngineRPM = async () => {
  if (!device) {
    console.error("Device is null. Cannot send command.");
    return;
  }
  try {
    await new Promise<void>((resolve) => setTimeout(() => resolve(), 500)); // Delay for stability
    const rpmResponse = await sendCommand(device, "010C");

    // Ensure it's a valid RPM response before updating state
    if (rpmResponse.match(/^\d+$/)) {
      setRPM(rpmResponse);
    } else {
      console.warn("Invalid RPM response:", rpmResponse);
    }
  } catch (error) {
    console.error("Error fetching RPM:", error);
  }
};



// `useEffect` to run both fetch functions continuously when connected
  // useEffect(() => {
  //   let intervalId: any; // Use `any` for interval ID

  //   if (isConnected) {
  //     // Start polling both functions every 3 seconds (or whatever interval you prefer)
  //     intervalId = setInterval(() => {
  //       fetchVoltage();
  //       fetchEngineRPM();
  //     }, 3000);
  //   }

  //   // Cleanup on component unmount or when `isConnected` changes
  //   return () => {
  //     if (intervalId) {
  //       clearInterval(intervalId); // Using the standard `clearInterval` without needing NodeJS.Timeout
  //     }
  //   };
  // }, [isConnected]); // Runs when `isConnected` changes

  return (
    <View style={styles.container}>
      <Button
        title={isScanning ? "Scanning..." : "Start Scan"}
        onPress={handleScanAndConnect}
        disabled={isScanning || isConnected}
      />
      <Button
        title="Disconnect"
        onPress={handleDisconnect}
        disabled={!isConnected}
      />
      <Button title="Get Voltage" onPress={fetchData} disabled={!isConnected} />
      <Button
        title="Get Engine RPM"
        onPress={fetchEngineRPM}
        disabled={!isConnected}
      />
      <ScrollView style={styles.scrollView}>
        <Text style={styles.logTitle}>Current Voltage: {voltage}</Text>
        <Text></Text>
        <Text style={styles.logTitle}>Current RPM: {RPM}</Text>
        <Text>hey! L-A-N-E-Y</Text>
        <Image
          source={require("../assets/images/IMG_6179.jpeg")}
          style={styles.image}
        />
        <Image
          source={require("../assets/images/IMG_6180.jpeg")}
          style={styles.image}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    marginTop: 20,
    width: '100%',
  },
  logTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginBottom: 10,
  },
  logEntry: {
    fontSize: 14,
    marginBottom: 5,
  },
    image: {
    width: 200,
    height: 200,
    resizeMode: 'contain', // or 'cover', 'stretch', 'repeat', 'center'
  },
});

export default ScanDevicesScreen;




// const logMessage = (message) => {
  //   setLog((prevLog) => [...prevLog, message]);
  //   console.log(message); // Log to console
  // };
  
  // const handleScanAndConnect = async () => {
  //   setIsScanning(true);
  //   setLog([]);
  //   logMessage('Starting scan...');
  
  //   btManager.startDeviceScan(null, null, async (error, discoveredDevice) => {
  //     if (error) {
  //       logMessage(`Scan error: ${error.message}`);
  //       setIsScanning(false);
  //       return;
  //     }
  
  //     if (discoveredDevice.name === 'OBDII') {
  //       logMessage(`Found OBDII device: ${discoveredDevice.name}`);
  //       btManager.stopDeviceScan();
  
  //       try {
  //         const connectedDevice = await discoveredDevice.connect({ autoConnect: true });
  //         setIsConnected(true);
  //         // setDevice(connectedDevice);
  //         device = connectedDevice;
  //         console.log('device:', device);
  //         logMessage('Connected to OBDII device');
  
  //         await discoverServicesAndCharacteristics(connectedDevice);
  //       } catch (err) {
  //         logMessage(`Connection failed: ${err.message}`);
  //       } finally {
  //         setIsScanning(false);
  //       }
  //     }
  //   });
  // };
  
  // const discoverServicesAndCharacteristics = async (connectedDevice) => {
  //   try {
  //     await connectedDevice.discoverAllServicesAndCharacteristics();
  //     const services = await connectedDevice.services();
  
  //     // for (const service of services) {
  //     //   logMessage(`Service: ${service.uuid}`);
  //     //   const characteristics = await connectedDevice.characteristicsForService(service.uuid);
  
  //     //   for (const characteristic of characteristics) {
  //     //     logMessage(`  Characteristic: ${characteristic.uuid}`);
  //     //     logMessage(`    Writable with response: ${characteristic.isWritableWithResponse}`);
  //     //     logMessage(`    Readable: ${characteristic.isReadable}`);
  //     //     logMessage(`    Notifiable: ${characteristic.isNotifiable}`);
  //     //   }
  //     // }
  //   } catch (err) {
  //     logMessage(`Error discovering services and characteristics: ${err.message}`);
  //   }
  // };
  
  // const handleVoltageResponse = (response) => {
  //   console.log('Response:', response);
  
  //   // Remove unnecessary characters (e.g., \r, \n, >) but keep valid voltage characters
  //   const cleanedResponse = response.replace(/[^0-9.]/g, ''); // Remove everything except digits and the decimal point
  //   console.log('Cleaned Response:', cleanedResponse);
  
  //   // Match a floating-point number pattern
  //   const voltageMatch = cleanedResponse.match(/(\d+\.\d+)/); // Match numbers like 9.1
  
  //   if (voltageMatch) {
  //     return parseFloat(voltageMatch[1]); // Return the numerical voltage
  //   }
  
  //   return null; // Return null if no voltage pattern is found
  // };
  
  
  // const onVoltageUpdate = async (
  //   error: BleError | null,
  //   characteristic: Characteristic | null
  // ) => {
  //   if (error) {
  //     console.log(error);
  //     return;
  //   }
  
  //   if (characteristic?.value) {
  //     console.log("Raw Data Received (Base64):", characteristic.value); // Log raw base64 data
  
  //     try {
  //       const decodedData = base64.decode(characteristic.value); // Decode base64 data
  //       console.log("Decoded Raw Data (String):", decodedData);
  
  //       // Log decoded data as bytes for additional debugging
  //       const byteArray = Array.from(Buffer.from(decodedData, 'utf8'));
  //       console.log("Decoded Raw Data (Bytes):", byteArray);
  
  //       // Extract and set the voltage
  //       const extractedVoltage = handleVoltageResponse(decodedData);
  //       if (extractedVoltage !== null) {
  //         setVoltage(extractedVoltage);
  //       } else {
  //         console.log("No valid voltage found in response");
  //       }
  //     } catch (decodeError) {
  //       console.error("Error decoding base64 data:", decodeError);
  //     }
  
  //     return;
  //   }
  // };
  
  
  // const testOBDIICommunication = async () => {
  //   const command = Buffer.from('AT RV\r', 'utf8'); // Command to read voltage, encoded as UTF-8
  
  //   try {
  //     await device.writeCharacteristicWithResponseForService(serviceUUID, writableUUID, command.toString('base64'));
  //     console.log('Command sent:', 'AT RV');
  
  //     await device.monitorCharacteristicForService(serviceUUID, readableUUID, onVoltageUpdate);
  
  //   } catch (error) {
  //     console.error('Error communicating with OBDII device:', error.message);
  //   }
  // };
  
  // const handleDisconnect = async () => {
  //   try {
  //     if (device) {
  //       await device.cancelConnection();
  //     }
  //     setIsConnected(false);
  //     logMessage('Disconnected from device.');
  //   } catch (error) {
  //     logMessage(`Failed to disconnect: ${error.message}`);
  //   }
  // };