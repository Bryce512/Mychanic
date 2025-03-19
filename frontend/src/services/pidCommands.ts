import { useBleConnection } from './bleConnections';
import { Device } from 'react-native-ble-plx';

export const pidCommands = () => {
    const { sendCommand } = useBleConnection();
  // Function to get the current voltage of the OBD-II device
  
  const getCurrentVoltage = async (device: Device) => {
    try {
      console.log("Fetching voltage...");
      const voltageResponse = await sendCommand(device, "AT RV");
      console.log("Voltage Response:", voltageResponse);
      return String(voltageResponse);
    } catch (error) {
      console.error("Error getting voltage:", error);
      return null;
    }
  };
  
  const getEngineRPM = async (device: Device) => {
    try {
      console.log("Fetching engine RPM...");
      const rpmResponse = await sendCommand(device, '010C');
      console.log("Engine RPM Response:", rpmResponse);
      return rpmResponse;  // Or process as needed
    } catch (error) {
      console.error("Error getting engine RPM:", error);
    }
  };
  

  // You can define more PID functions here, for example:
  const getVehicleSpeed = async (device: Device) => {
    try {
      const rpmResponse = await sendCommand(device, '010D'); // Vehicle Speed command
      console.log("Vehicle Speed Response:", rpmResponse);

      const speed = rpmResponse[3]; // Assuming the response has the speed at byte 3
      console.log("Parsed Vehicle Speed:", speed);
      return speed;
    } catch (error) {
      console.error("Failed to get Vehicle Speed:", error);
    }
  };

  return {
    getCurrentVoltage,
    getEngineRPM,
    getVehicleSpeed,
  };
};

