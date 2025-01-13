import {
  BleManager,
  Device,
  Service,
  Characteristic,
} from 'react-native-ble-plx';
import Base64 from 'react-native-base64';

const SERVICE_UUID = '00001101-0000-1000-8000-00805F9B34FB';
const CHARACTERISTIC_UUIDS = {
  write: '0000FFF1-0000-1000-8000-00805F9B34FB',
  read: '0000FFF1-0000-1000-8000-00805F9B34FB',
};

class BluetoothManager {
  manager: BleManager;
  device: Device | undefined;
  service: Service | undefined;
  readCharacteristic: Characteristic | undefined;
  writeCharacteristic: Characteristic | undefined;

  constructor() {
    this.manager = new BleManager();
    this.device;
    this.service;
    this.readCharacteristic;
    this.writeCharacteristic;
  }

  startScan() {
    return new Promise((resolve, reject) => {
      console.log('Scanning started...');
      this.manager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.log('Scanning error:', error);
          reject(error);
          return;
        }
        console.log('Found device:', device.name);

        if (device && device.name === 'OBDII') {
          console.log('Device found:', device.name);
          this.manager.stopDeviceScan();
          this.device = device;
          resolve(device);
        }
      });
    });
  }

  connectToDevice() {
    return new Promise((resolve, reject) => {
      if (this.device) {
        this.device
          .connect()
          .then(device => {
            console.log('Connected to device:', device.name);
            return device.discoverAllServicesAndCharacteristics();
          })
          .then(device => {
            console.log('Services and characteristics discovered');
            this.device = device;

            return device.services(); // get the services of the device
          })
          .then(services => {
            const obdService = services.find(
              service => service.uuid === SERVICE_UUID,
            );
            if (!obdService) {
              reject(new Error('OBDII service not found'));
              return;
            }

            return obdService.characteristics(); // get the characteristics of the OBDII service
          })
          .then(characteristics => {
            if (!characteristics) {
              reject(new Error('Device has no characteristics'));
              return;
            }

            this.readCharacteristic = characteristics.find(
              characteristic =>
                characteristic.uuid === CHARACTERISTIC_UUIDS.read,
            );
            this.writeCharacteristic = characteristics.find(
              characteristic =>
                characteristic.uuid === CHARACTERISTIC_UUIDS.write,
            );

            if (!this.readCharacteristic || !this.writeCharacteristic) {
              reject(new Error('Read or write characteristic not found'));
              return;
            }

            resolve(this.device);
          })
          .catch(error => {
            reject(new Error('Connection error: ' + error.message));
          });
      } else {
        reject(new Error('Tried to connect to device without a known device'));
      }
    });
  }

  disconnectFromDevice(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.device) {
        this.device
          .cancelConnection()
          .then(() => {
            console.log('Disconnected from the device');
            resolve();
          })
          .catch(error => {
            reject(new Error('Disconnection error: ' + error.message));
          });
      } else {
        reject(
          new Error('Tried to disconnect to device without a known device'),
        );
      }
    });
  }

  writeCommand(command: string) {
    // Convert command from hex to base64
    const commandData = hexToBase64(command);

    if (this.writeCharacteristic) {
      return this.writeCharacteristic.writeWithResponse(commandData);
    } else {
      return Promise.reject(new Error('Write characteristic not available'));
    }
  }

  readResponse() {
    if (this.readCharacteristic) {
      return this.readCharacteristic
        .read()
        .then((characteristic: Characteristic) => {
          // Convert response from DataView to hex string
          const response = characteristic.value;
          // const response = dataViewToHexString(characteristic.value);

          console.log('Received response:', response);
          return response;
        });
    } else {
      return Promise.reject(new Error('Read characteristic not available'));
    }
  }
}

function hexToBase64(hex: string) {
  let raw = '';
  for (let i = 0; i < hex.length; i += 2) {
    raw += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  }
  return Base64.encode(raw);
}

export default BluetoothManager;

// import { BleManager, Device } from 'react-native-ble-plx';

// // Initialize the BLE manager
// const manager = new BleManager();

// const startScan = () => {
//   console.log("Scanning started...");
//   manager.startDeviceScan(null, null, (error, device: Device | null) => {
//     if (error) {
//       console.log("Scanning error:", error);
//       return;
//     }

//     if (device) {
//       console.log('Device found:', device.name);
//       console.log('Device ID:', device.id);  // Safely access device properties

//       // Assuming you want to connect to a specific device (e.g., named 'OBDII')
//       if (device.name === 'OBDII') {
//         console.log('OBDII device found! ID:', device.id);

//         // Stop scanning once the device is found
//         manager.stopDeviceScan();

//         // Proceed to connect to the device
//         connectToDevice(device);
//       }
//     } else {
//       console.log('No valid device found.');
//     }
//   });
// };

// // This is the function to connect to a Bluetooth device
// const connectToDevice = (device: Device) => {
//   if (device) {
//     console.log("Connecting to device with ID:", device.id);

//     device.connect()
//       .then(device => {
//         console.log('Connected to device:', device.name);
//         return device.discoverAllServicesAndCharacteristics();
//       })
//       .then(device => {
//         console.log('Services and characteristics discovered for device:', device.name);
//         // Here you can handle services/characteristics or further communication
//       })
//       .catch(error => {
//         console.log('Connection failed:', error);
//       });
//   } else {
//     console.log('No device object to connect to.');
//   }
// };

// // Start scanning for devices when the app loads
// startScan();

// export default BleManager;
