import React, { useState } from 'react';
import { View, Button, Text, StyleSheet, ScrollView } from 'react-native';
import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

const btManager = new BleManager();

const ScanDevicesScreen = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [batteryVoltage, setBatteryVoltage] = useState('N/A');
  const [log, setLog] = useState([]);
  const [writableCharacteristics, setWritableCharacteristics] = useState([]);
  const [readableCharacteristics, setReadableCharacteristics] = useState([]);
  const [device, setDevice] = useState(null);

  const logMessage = (message) => {
    setLog((prevLog) => [...prevLog, message]);
  };

  const handleScanAndConnect = async () => {
    setIsScanning(true);
    setLog([]);
    logMessage('Starting scan...');

    btManager.startDeviceScan(null, null, async (error, discoveredDevice) => {
      if (error) {
        logMessage(`Scan error: ${error.message}`);
        setIsScanning(false);
        return;
      }

      if (discoveredDevice.name === 'OBDII') {
        logMessage(`Found OBDII device: ${discoveredDevice.name}`);
        btManager.stopDeviceScan();

        try {
          const connectedDevice = await discoveredDevice.connect({ autoConnect: true });
          setIsConnected(true);
          setDevice(connectedDevice);
          logMessage('Connected to OBDII device');

          await discoverCharacteristics(connectedDevice);
        } catch (err) {
          logMessage(`Connection failed: ${err.message}`);
        } finally {
          setIsScanning(false);
        }
      }
    });
  };

  const discoverCharacteristics = async (connectedDevice) => {
    try {
      await connectedDevice.discoverAllServicesAndCharacteristics();
      const services = await connectedDevice.services();

      const writableWithResponse = [];
      const readableOrNotifiable = [];

      for (const service of services) {
        const characteristics = await connectedDevice.characteristicsForService(service.uuid);

        for (const characteristic of characteristics) {
          // Log characteristics' abilities
          logMessage(`Characteristic UUID: ${characteristic.uuid}`);
          logMessage(`Writable with response: ${characteristic.isWritableWithResponse}`);
          logMessage(`Readable: ${characteristic.isReadable}`);
          logMessage(`Notifiable: ${characteristic.isNotifiable}`);

          if (characteristic.isWritableWithResponse) {
            writableWithResponse.push(characteristic);
          }
          if (characteristic.isReadable || characteristic.isNotifiable) {
            readableOrNotifiable.push(characteristic);
          }
        }
      }

      setWritableCharacteristics(writableWithResponse);
      setReadableCharacteristics(readableOrNotifiable);

      logMessage(`Discovered ${writableWithResponse.length} writable characteristics.`);
      logMessage(`Discovered ${readableOrNotifiable.length} readable/notifiable characteristics.`);
    } catch (error) {
      logMessage(`Error discovering characteristics: ${error.message}`);
    }
  };

  const testWritableAndReadablePairs = async () => {
    if (!writableCharacteristics || writableCharacteristics.length === 0) {
      logMessage('No writable characteristics available for testing.');
      return;
    }

    if (!readableCharacteristics || readableCharacteristics.length === 0) {
      logMessage('No readable/notifiable characteristics available for testing.');
      return;
    }

    const pid = Buffer.from('AT RV\r'); // Command to read battery voltage

    for (const writeChar of writableCharacteristics) {
      logMessage(`Testing writable characteristic: ${writeChar.uuid}`);

      for (const readChar of readableCharacteristics) {
        logMessage(`Testing read characteristic: ${readChar.uuid}`);

        try {
          // Send command to writable characteristic
          await writeChar.writeWithResponse(pid.toString('base64'));
          logMessage('Sent AT RV command.');

          // Wait for a response
          await new Promise(resolve => setTimeout(resolve, 500)); // Small delay before reading

          const response = await readChar.read();
          const rawBytes = Buffer.from(response.value, 'base64');

          // Log raw bytes for debugging
          logMessage(`Raw Response (Hex): ${rawBytes.toString('hex')}`);

          // Parse and log the voltage, if applicable
          const voltage = parseVoltageResponse(rawBytes);
          setBatteryVoltage(voltage);
          logMessage(`Parsed Voltage: ${voltage}V`);
        } catch (error) {
          logMessage(`Error testing pair (write: ${writeChar.uuid}, read: ${readChar.uuid}): ${error.message}`);
        }

        // Add a delay before testing the next pair
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  };

  const parseVoltageResponse = (data) => {
    const response = data.toString('ascii');
    if (response.includes('V')) {
      const match = response.match(/[\d.]+V/);
      return match ? match[0] : 'N/A';
    }
    return 'N/A';
  };

  const handleDisconnect = async () => {
    try {
      if (device) {
        await device.cancelConnection();
      }
      setIsConnected(false);
      setWritableCharacteristics([]);
      setReadableCharacteristics([]);
      logMessage('Disconnected from device.');
    } catch (error) {
      logMessage(`Failed to disconnect: ${error.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <Button
        title={isScanning ? 'Scanning...' : 'Start Scan'}
        onPress={handleScanAndConnect}
        disabled={isScanning || isConnected}
      />
      <Button
        title="Test Write/Read Pairs"
        onPress={testWritableAndReadablePairs}
        disabled={!isConnected || writableCharacteristics.length === 0 || readableCharacteristics.length === 0}
      />
      <Button
        title="Disconnect"
        onPress={handleDisconnect}
        disabled={!isConnected}
      />
      <ScrollView style={styles.scrollView}>
        <Text style={styles.logTitle}>Logs:</Text>
        {log.map((entry, index) => (
          <Text key={index} style={styles.logEntry}>
            {entry}
          </Text>
        ))}
      </ScrollView>
      <Text style={styles.batteryText}>
        Battery Voltage: {batteryVoltage}V
      </Text>
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
  batteryText: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ScanDevicesScreen;
