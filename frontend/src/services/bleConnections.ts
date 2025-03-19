import { useState, useRef } from 'react';
import { BleManager, Device } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import base64 from 'react-native-base64';

// Create BLE Manager instance
const btManager = new BleManager();

const serviceUUID = '0000fff0-0000-1000-8000-00805f9b34fb'; // Service UUID
const writableUUID = '0000fff2-0000-1000-8000-00805f9b34fb'; // Writable characteristic UUID
const readableUUID = '0000fff1-0000-1000-8000-00805f9b34fb'; // Readable (notification) characteristic UUID

export const useBleConnection = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [device, setDevice] = useState<Device | null>(null);
  

  // Function to log messages
  const logMessage = (message) => {
    setLog((prevLog) => [...prevLog, message]);
    console.log(message); // Log to console
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
          // device = connectedDevice;
          console.log('device:', device);
          logMessage('Connected to OBDII device');
  
          await discoverServicesAndCharacteristics(connectedDevice);
        } catch (err) {
          logMessage(`Connection failed: ${err.message}`);
        } finally {
          setIsScanning(false);
        }
      }
    });
  };

  const discoverServicesAndCharacteristics = async (connectedDevice) => {
    try {
      await connectedDevice.discoverAllServicesAndCharacteristics();
      const services = await connectedDevice.services();
  
      // for (const service of services) {
      //   logMessage(`Service: ${service.uuid}`);
      //   const characteristics = await connectedDevice.characteristicsForService(service.uuid);
  
      //   for (const characteristic of characteristics) {
      //     logMessage(`  Characteristic: ${characteristic.uuid}`);
      //     logMessage(`    Writable with response: ${characteristic.isWritableWithResponse}`);
      //     logMessage(`    Readable: ${characteristic.isReadable}`);
      //     logMessage(`    Notifiable: ${characteristic.isNotifiable}`);
      //   }
      // }
    } catch (err) {
      logMessage(`Error discovering services and characteristics: ${err.message}`);
    }
  };

  // Function to send commands to the OBD-II device
  const sendCommand = async (
    device: Device,
    command: string
  ): Promise<string> => {
    if (!device) {
      console.error("No device connected");
      throw new Error("No device connected");
    }

    try {
      // Encode command properly for the OBD-II device
      const encodedCommand = Buffer.from(`${command}\r`, "utf8").toString(
        "base64"
      );
      console.log("Sending Command:", command);
      await device.writeCharacteristicWithResponseForService(
        serviceUUID,
        writableUUID,
        encodedCommand
      );

      return new Promise((resolve, reject) => {
        let receivedBytes: number[] = [];
        let responseText = "";

        const subscription = device.monitorCharacteristicForService(
          serviceUUID,
          readableUUID,
          (error, characteristic) => {
            if (error) {
              console.error("Error receiving response:", error);
              subscription?.remove();
              reject(error);
              return;
            }

            if (characteristic?.value) {
              const decodedChunk = base64.decode(characteristic.value);
              console.log("Received Chunk:", decodedChunk);

              receivedBytes.push(...Buffer.from(decodedChunk, "utf8"));

              // Check if the response contains the termination character ">"
              if (decodedChunk.includes(">")) {
                responseText = Buffer.from(receivedBytes).toString("utf8").trim();
                console.log("Full Response (Raw):", responseText);

                // Remove carriage returns and newlines
                responseText = responseText
                  .replace(/\r/g, "")
                  .replace(/\n/g, "")
                  .replace(">", "");

                // Ignore command echo
                if (responseText.startsWith(command)) {
                  responseText = responseText.replace(command, "").trim();
                }

                console.log("Parsed Response:", responseText);

                subscription.remove();
                resolve(responseText);
              }
            }
          }
        );
      });
    } catch (error) {
      console.error("Error sending command:", error);
      throw error;
    }
  };


  // Function to disconnect from the device
  const handleDisconnect = async () => {
    if (device) {
      try {
        await device?.cancelConnection();
        setIsConnected(false);
        device = null; // Clear the device reference
        logMessage('Disconnected from OBDII device');
      } catch (error) {
        if (error instanceof Error) {
          logMessage(`Error disconnecting: ${error.message}`);
        } else {
          logMessage('Error disconnecting: Unknown error');
        }
      }
    } else {
      logMessage('No device to disconnect');
    }
  };

  // Exported functions
  return {
    isScanning,
    isConnected,
    device,
    logMessage,
    handleScanAndConnect,
    sendCommand,
    handleDisconnect
  };
};
