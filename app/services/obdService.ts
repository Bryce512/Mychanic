/**
 * OBD-II Service
 * Comprehensive OBD-II communication and PID command handling
 * Includes enhanced voltage fetching with wake-up sequences and error handling
 */

import { Device } from "react-native-ble-plx";

export interface TemperatureData {
  celsius: number;
  fahrenheit: number;
}

export interface OBDCommandResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * OBD-II Data Collection Service
 * Pure functions that don't depend on context - accept dependencies as parameters
 */
export const obdDataFunctions = {
  /**
   * Fetch battery voltage from OBD-II device
   * Enhanced with wake-up sequences, health checks, and better error handling
   */
  fetchVoltage: async (
    plxDevice: Device | null,
    sendCommand: (
      device: Device,
      command: string,
      retries?: number,
      customTimeoutMs?: number
    ) => Promise<string>,
    logMessage: (message: string) => void
  ): Promise<string | null> => {
    if (!plxDevice) {
      logMessage("❌ No device connected, cannot fetch voltage");
      return null;
    }

    try {
      logMessage("🔋 Fetching battery voltage...");

      // First, perform adapter health check
      try {
        logMessage("🔍 Performing adapter health check...");
        const healthResponse = await sendCommand(plxDevice, "AT", 1, 2000);
        if (
          !healthResponse ||
          healthResponse.includes("ERROR") ||
          healthResponse.includes("?")
        ) {
          logMessage(
            "❌ Adapter health check failed - adapter may be unresponsive"
          );
          return null;
        }
        logMessage("✅ Adapter health check passed");
      } catch (healthError) {
        logMessage(
          `⚠️ Health check failed: ${String(healthError)} - proceeding anyway`
        );
      }

      // Wait a moment for adapter to stabilize
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Send voltage command with longer timeout and more retries
      const response = await sendCommand(plxDevice, "AT RV", 3, 8000);

      // Parse voltage from response
      if (response) {
        // Check for common failure responses
        if (
          response.includes("NO DATA") ||
          response.includes("ERROR") ||
          response.trim() === ""
        ) {
          logMessage(
            `❌ Voltage command returned invalid response: "${response}"`
          );
          return null;
        }

        // Try multiple regex patterns for voltage parsing
        const voltagePatterns = [
          /(\d+\.?\d*)\s*V/i, // "12.5V" or "12.5 V"
          /(\d+\.?\d*)/, // Just numbers like "12.5"
          /([0-9]+(?:\.[0-9]+)?)/, // More specific number pattern
        ];

        for (const pattern of voltagePatterns) {
          const voltageMatch = response.match(pattern);
          if (voltageMatch) {
            const voltage = voltageMatch[1];
            const voltageNum = parseFloat(voltage);

            // Validate voltage is in reasonable range (8-16V for car batteries)
            if (voltageNum >= 8 && voltageNum <= 16) {
              logMessage(`🔋 Detected voltage: ${voltage}V`);
              return voltage;
            } else {
              logMessage(
                `⚠️ Detected voltage ${voltage}V is outside normal range (8-16V)`
              );
              return voltage; // Still return it, but log the warning
            }
          }
        }

        logMessage(`📬 Raw response: "${response}" (could not parse voltage)`);
        return null;
      }

      logMessage("❌ No response received for voltage command");
      return null;
    } catch (error) {
      logMessage(`❌ Error fetching voltage: ${String(error)}`);
      return null;
    }
  },

  /**
   * Fetch engine RPM
   * OBD-II PID: 0C
   */
  fetchRPM: async (
    plxDevice: Device | null,
    sendCommand: (
      device: Device,
      command: string,
      retries?: number,
      customTimeoutMs?: number
    ) => Promise<string>,
    logMessage: (message: string) => void
  ): Promise<number | null> => {
    if (!plxDevice) {
      logMessage("❌ No device connected, cannot fetch RPM");
      return null;
    }

    try {
      logMessage("🔄 Fetching engine RPM...");

      // Send RPM command (PID: 0C) with AT prefix
      const response = await sendCommand(plxDevice, "AT RV", 2);

      // Parse RPM from response
      if (response) {
        const rpmRegex = /41 0C ([0-9A-F]{2}) ([0-9A-F]{2})/i;
        const match = response.match(rpmRegex);

        if (match) {
          const a = parseInt(match[1], 16);
          const b = parseInt(match[2], 16);
          const rpm = (a * 256 + b) / 4;

          logMessage(`🔄 Engine RPM: ${rpm}`);
          return rpm;
        } else {
          logMessage(`❌ Could not parse RPM from response: ${response}`);
          return null;
        }
      }

      return null;
    } catch (error) {
      logMessage(`❌ Error fetching RPM: ${String(error)}`);
      return null;
    }
  },

  /**
   * Get engine RPM (PID 0C) - with AT prefix
   */
  getEngineRPM: async (
    device: Device,
    sendCommand: (
      device: Device,
      command: string,
      retries?: number,
      customTimeoutMs?: number
    ) => Promise<string>
  ): Promise<number> => {
    try {
      console.log("Fetching engine RPM...");
      // Send with AT prefix and spaces
      const rpmResponse = await sendCommand(device, "AT 010C");
      console.log("Engine RPM Response:", rpmResponse);

      // Normalize response to string and split into lines
      const responseStr = String(rpmResponse).replace(/\r/g, "\n");
      const lines = responseStr
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      // Find the last line that looks like a valid hex response (e.g., starts with 41 0C)
      const hexLine = lines.reverse().find((line) => /41\s*0C/i.test(line));
      if (!hexLine) return 0;
      // Remove any non-hex characters (like OK, dots, etc.)
      const hexMatch = hexLine.match(
        /41\s*0C\s*([0-9A-Fa-f]{2})\s*([0-9A-Fa-f]{2})/
      );
      if (!hexMatch) return 0;
      const A = parseInt(hexMatch[1], 16);
      const B = parseInt(hexMatch[2], 16);
      if (isNaN(A) || isNaN(B)) return 0;
      const rpm = (A * 256 + B) / 4;
      return rpm;
    } catch (error) {
      console.error("Error getting engine RPM:", error);
      return 0;
    }
  },

  /**
   * Get coolant temperature (PID 05) - with AT prefix
   */
  getCoolantTemperature: async (
    device: Device,
    sendCommand: (
      device: Device,
      command: string,
      retries?: number,
      customTimeoutMs?: number
    ) => Promise<string>
  ): Promise<TemperatureData | null> => {
    try {
      console.log("Fetching coolant temperature...");
      // Send with AT prefix and spaces
      const response = await sendCommand(device, "AT 0105");
      console.log("Coolant Temperature Response:", response);

      const responseStr = String(response).replace(/\r/g, "\n");
      const lines = responseStr
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const hexLine = lines.reverse().find((line) => /41\s*05/i.test(line));
      if (!hexLine) return null;

      const hexMatch = hexLine.match(/41\s*05\s*([0-9A-Fa-f]{2})/);
      if (!hexMatch) return null;

      const A = parseInt(hexMatch[1], 16);
      if (isNaN(A)) return null;

      const tempCelsius = A - 40;
      const tempFahrenheit = (tempCelsius * 9) / 5 + 32;

      return { celsius: tempCelsius, fahrenheit: tempFahrenheit };
    } catch (error) {
      console.error("Error getting coolant temperature:", error);
      return null;
    }
  },

  /**
   * Get intake air temperature (PID 0F) - with AT prefix
   */
  getIntakeAirTemperature: async (
    device: Device,
    sendCommand: (
      device: Device,
      command: string,
      retries?: number,
      customTimeoutMs?: number
    ) => Promise<string>
  ): Promise<TemperatureData | null> => {
    try {
      console.log("Fetching intake air temperature...");
      // Send with AT prefix and spaces
      const response = await sendCommand(device, "AT 01 0F");
      console.log("Intake Air Temperature Response:", response);

      const responseStr = String(response).replace(/\r/g, "\n");
      const lines = responseStr
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const hexLine = lines.reverse().find((line) => /41\s*0F/i.test(line));
      if (!hexLine) return null;

      const hexMatch = hexLine.match(/41\s*0F\s*([0-9A-Fa-f]{2})/);
      if (!hexMatch) return null;

      const A = parseInt(hexMatch[1], 16);
      if (isNaN(A)) return null;

      const tempCelsius = A - 40;
      const tempFahrenheit = (tempCelsius * 9) / 5 + 32;

      return { celsius: tempCelsius, fahrenheit: tempFahrenheit };
    } catch (error) {
      console.error("Error getting intake air temperature:", error);
      return null;
    }
  },

  /**
   * Get throttle position (PID 11) - with AT prefix
   */
  getThrottlePosition: async (
    device: Device,
    sendCommand: (
      device: Device,
      command: string,
      retries?: number,
      customTimeoutMs?: number
    ) => Promise<string>
  ): Promise<number | null> => {
    try {
      console.log("Fetching throttle position...");
      // Send with AT prefix and spaces
      const response = await sendCommand(device, "AT 0111");
      console.log("Throttle Position Response:", response);

      const responseStr = String(response).replace(/\r/g, "\n");
      const lines = responseStr
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const hexLine = lines.reverse().find((line) => /41\s*11/i.test(line));
      if (!hexLine) return null;

      const hexMatch = hexLine.match(/41\s*11\s*([0-9A-Fa-f]{2})/);
      if (!hexMatch) return null;

      const A = parseInt(hexMatch[1], 16);
      if (isNaN(A)) return null;

      const throttlePercent = (A * 100) / 255;

      return Math.round(throttlePercent * 10) / 10; // Round to 1 decimal place
    } catch (error) {
      console.error("Error getting throttle position:", error);
      return null;
    }
  },

  /**
   * Get fuel level (PID 2F) - with AT prefix
   */
  getFuelLevel: async (
    device: Device,
    sendCommand: (
      device: Device,
      command: string,
      retries?: number,
      customTimeoutMs?: number
    ) => Promise<string>
  ): Promise<number | null> => {
    try {
      console.log("Fetching fuel level...");
      // Send with AT prefix and spaces
      const response = await sendCommand(device, "AT 012F");
      console.log("Fuel Level Response:", response);

      const responseStr = String(response).replace(/\r/g, "\n");
      const lines = responseStr
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const hexLine = lines.reverse().find((line) => /41\s*2F/i.test(line));
      if (!hexLine) return null;

      const hexMatch = hexLine.match(/41\s*2F\s*([0-9A-Fa-f]{2})/);
      if (!hexMatch) return null;

      const A = parseInt(hexMatch[1], 16);
      if (isNaN(A)) return null;

      const fuelPercent = (A * 100) / 255;

      return Math.round(fuelPercent * 10) / 10; // Round to 1 decimal place
    } catch (error) {
      console.error("Error getting fuel level:", error);
      return null;
    }
  },

  /**
   * Get engine load (PID 04) - with AT prefix
   */
  getEngineLoad: async (
    device: Device,
    sendCommand: (
      device: Device,
      command: string,
      retries?: number,
      customTimeoutMs?: number
    ) => Promise<string>
  ): Promise<number | null> => {
    try {
      console.log("Fetching engine load...");
      // Send with AT prefix and spaces
      const response = await sendCommand(device, "AT 0104");
      console.log("Engine Load Response:", response);

      const responseStr = String(response).replace(/\r/g, "\n");
      const lines = responseStr
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const hexLine = lines.reverse().find((line) => /41\s*04/i.test(line));
      if (!hexLine) return null;

      const hexMatch = hexLine.match(/41\s*04\s*([0-9A-Fa-f]{2})/);
      if (!hexMatch) return null;

      const A = parseInt(hexMatch[1], 16);
      if (isNaN(A)) return null;

      const loadPercent = (A * 100) / 255;

      return Math.round(loadPercent * 10) / 10; // Round to 1 decimal place
    } catch (error) {
      console.error("Error getting engine load:", error);
      return null;
    }
  },

  /**
   * Get manifold absolute pressure (PID 0B)
   */
  getManifoldPressure: async (
    device: Device,
    sendCommand: (
      device: Device,
      command: string,
      retries?: number,
      customTimeoutMs?: number
    ) => Promise<string>
  ): Promise<number | null> => {
    try {
      console.log("Fetching manifold pressure...");
      const response = await sendCommand(device, "010B");
      console.log("Manifold Pressure Response:", response);

      const responseStr = String(response).replace(/\r/g, "\n");
      const lines = responseStr
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const hexLine = lines.reverse().find((line) => /41\s*0B/i.test(line));
      if (!hexLine) return null;

      const hexMatch = hexLine.match(/41\s*0B\s*([0-9A-Fa-f]{2})/);
      if (!hexMatch) return null;

      const A = parseInt(hexMatch[1], 16);
      if (isNaN(A)) return null;

      return A; // kPa
    } catch (error) {
      console.error("Error getting manifold pressure:", error);
      return null;
    }
  },

  /**
   * Get vehicle speed (PID 0D) - with AT prefix
   */
  getVehicleSpeed: async (
    device: Device,
    sendCommand: (
      device: Device,
      command: string,
      retries?: number,
      customTimeoutMs?: number
    ) => Promise<string>
  ): Promise<number | null> => {
    try {
      console.log("Fetching vehicle speed...");
      const response = await sendCommand(device, "AT 010D");
      console.log("Vehicle Speed Response:", response);

      const responseStr = String(response).replace(/\r/g, "\n");
      const lines = responseStr
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      const hexLine = lines.reverse().find((line) => /41\s*0D/i.test(line));
      if (!hexLine) return null;

      const hexMatch = hexLine.match(/41\s*0D\s*([0-9A-Fa-f]{2})/);
      if (!hexMatch) return null;

      const A = parseInt(hexMatch[1], 16);
      if (isNaN(A)) return null;

      return A; // km/h
    } catch (error) {
      console.error("Failed to get Vehicle Speed:", error);
      return null;
    }
  },

  /**
   * Get current voltage (legacy function for backward compatibility)
   */
  getCurrentVoltage: async (
    device: Device,
    sendCommand: (
      device: Device,
      command: string,
      retries?: number,
      customTimeoutMs?: number
    ) => Promise<string>
  ): Promise<string | null> => {
    try {
      console.log("Fetching voltage...");
      const voltageResponse = await sendCommand(device, "AT RV");
      console.log("Voltage Response:", voltageResponse);

      // Check if response contains "NO DATA"
      const responseStr = String(voltageResponse);
      if (responseStr.includes("NO DATA")) {
        console.log("Voltage command returned NO DATA");
        return null;
      }

      // Look for voltage pattern (number followed by V)
      const voltageMatch = responseStr.match(/(\d+\.?\d*)\s*V/i);
      if (voltageMatch) {
        return voltageMatch[1] + "V";
      }

      // If no voltage pattern found, return null
      console.log("No valid voltage pattern found in response");
      return null;
    } catch (error) {
      console.error("Error getting voltage:", error);
      return null;
    }
  },

  /**
   * Get Diagnostic Trouble Codes (DTC) from vehicle - with AT prefix
   */
  getDTCCodes: async (
    plxDevice: Device | null,
    sendCommand: (
      device: Device,
      command: string,
      retries?: number,
      customTimeoutMs?: number
    ) => Promise<string>,
    logMessage: (message: string) => void
  ): Promise<string[]> => {
    if (!plxDevice) {
      logMessage("❌ No device connected, cannot fetch DTC codes");
      return [];
    }

    try {
      logMessage("🔍 Fetching DTC codes...");

      // Send command to get stored DTC codes with AT prefix
      const dtcResponse = await sendCommand(plxDevice, "AT03", 3, 5000);
      logMessage(`DTC Response: ${dtcResponse}`);

      const responseStr = String(dtcResponse).toUpperCase();

      // Check for NO DATA response
      if (responseStr.includes("NO DATA") || responseStr.includes("43 00")) {
        logMessage("No DTC codes found");
        return [];
      }

      // Parse DTC codes from response
      // Format: 43 XX XX XX XX... where each XX XX is a DTC code
      const dtcCodes: string[] = [];
      const lines = responseStr.split("\n");

      for (const line of lines) {
        if (line.includes("43")) {
          // Remove header and parse DTC codes
          const dataPart = line.split("43")[1]?.trim();
          if (dataPart) {
            // Each DTC code is 4 characters (2 bytes)
            for (let i = 0; i < dataPart.length; i += 4) {
              const dtcHex = dataPart.substr(i, 4);
              if (dtcHex.length === 4) {
                // Convert hex to DTC format (e.g., "0123" -> "P0123")
                const firstByte = parseInt(dtcHex.substr(0, 2), 16);
                const secondByte = parseInt(dtcHex.substr(2, 2), 16);

                // First byte: bits 7-6 = DTC type, bits 5-0 = first DTC digit
                const dtcType = (firstByte >> 6) & 0x03;
                const firstDigit = firstByte & 0x3f;

                // Second byte: second and third DTC digits
                const secondDigit = (secondByte >> 4) & 0x0f;
                const thirdDigit = secondByte & 0x0f;

                // Convert to standard DTC format
                let dtcPrefix = "P"; // Powertrain
                if (dtcType === 1) dtcPrefix = "C"; // Chassis
                else if (dtcType === 2) dtcPrefix = "B"; // Body
                else if (dtcType === 3) dtcPrefix = "U"; // Network

                const dtcCode = `${dtcPrefix}${firstDigit
                  .toString()
                  .padStart(2, "0")}${secondDigit}${thirdDigit}`;
                dtcCodes.push(dtcCode);
              }
            }
          }
        }
      }

      logMessage(
        `Found ${dtcCodes.length} DTC code(s): ${dtcCodes.join(", ")}`
      );
      return dtcCodes;
    } catch (error) {
      logMessage(`❌ Error fetching DTC codes: ${error}`);
      return [];
    }
  },

  /**
   * Clear Diagnostic Trouble Codes from vehicle
   */
  clearDTCCodes: async (
    plxDevice: Device | null,
    sendCommand: (
      device: Device,
      command: string,
      retries?: number,
      customTimeoutMs?: number
    ) => Promise<string>,
    logMessage: (message: string) => void
  ): Promise<boolean> => {
    if (!plxDevice) {
      logMessage("❌ No device connected, cannot clear DTC codes");
      return false;
    }

    try {
      logMessage("🧹 Clearing DTC codes...");

      // Send command to clear DTC codes
      const clearResponse = await sendCommand(plxDevice, "04", 3, 5000);
      logMessage(`Clear DTC Response: ${clearResponse}`);

      const responseStr = String(clearResponse).toUpperCase();

      // Check for successful response
      if (responseStr.includes("44") || responseStr.includes("OK")) {
        logMessage("✅ DTC codes cleared successfully");
        return true;
      } else {
        logMessage("❌ Failed to clear DTC codes");
        return false;
      }
    } catch (error) {
      logMessage(`❌ Error clearing DTC codes: ${error}`);
      return false;
    }
  },
};

/**
 * Legacy PID Commands Hook (for backward compatibility)
 * @deprecated Use obdDataFunctions instead for better error handling
 */
export const usePidCommands = () => {
  // This would need to be updated to use the new BLE connection context
  // For now, returning empty functions to maintain compatibility
  return {
    getCurrentVoltage: async (device: Device) => null,
    getEngineRPM: async (device: Device) => 0,
    getVehicleSpeed: async (device: Device) => null,
    getCoolantTemperature: async (device: Device) => null,
    getIntakeAirTemperature: async (device: Device) => null,
    getThrottlePosition: async (device: Device) => null,
    getFuelLevel: async (device: Device) => null,
    getEngineLoad: async (device: Device) => null,
    getManifoldPressure: async (device: Device) => null,
  };
};
