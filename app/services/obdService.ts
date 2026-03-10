/**
 * OBD-II Service - Simplified and Professional
 * Focused on diagnostic trouble codes and essential vehicle data
 */
import { Device } from "react-native-ble-plx";

// Types
export interface DiagnosticTroubleCode {
  code: string;
  description: string;
  severity: "critical" | "warning" | "info";
}

export interface VehicleData {
  voltage: string | null;
  rpm: number | null;
  speed: number | null;
  coolantTemp: number | null;
}

// DTC Code Descriptions Database
const DTC_DESCRIPTIONS: Record<
  string,
  { description: string; severity: "critical" | "warning" | "info" }
> = {
  P0001: {
    description: "Fuel Volume Regulator Control Circuit/Open",
    severity: "warning",
  },
  P0100: {
    description: "Mass or Volume Air Flow Circuit Malfunction",
    severity: "warning",
  },
  P0101: {
    description: "Mass or Volume Air Flow Circuit Range/Performance Problem",
    severity: "warning",
  },
  P0102: {
    description: "Mass or Volume Air Flow Circuit Low Input",
    severity: "warning",
  },
  P0103: {
    description: "Mass or Volume Air Flow Circuit High Input",
    severity: "warning",
  },
  P0110: {
    description: "Intake Air Temperature Circuit Malfunction",
    severity: "warning",
  },
  P0115: {
    description: "Engine Coolant Temperature Circuit Malfunction",
    severity: "critical",
  },
  P0116: {
    description: "Engine Coolant Temperature Circuit Range/Performance Problem",
    severity: "warning",
  },
  P0117: {
    description: "Engine Coolant Temperature Circuit Low Input",
    severity: "critical",
  },
  P0118: {
    description: "Engine Coolant Temperature Circuit High Input",
    severity: "critical",
  },
  P0120: {
    description: "Throttle Position Sensor/Switch A Circuit Malfunction",
    severity: "warning",
  },
  P0121: {
    description:
      "Throttle Position Sensor/Switch A Circuit Range/Performance Problem",
    severity: "warning",
  },
  P0130: {
    description: "O2 Sensor Circuit Malfunction (Bank 1, Sensor 1)",
    severity: "warning",
  },
  P0131: {
    description: "O2 Sensor Circuit Low Voltage (Bank 1, Sensor 1)",
    severity: "warning",
  },
  P0132: {
    description: "O2 Sensor Circuit High Voltage (Bank 1, Sensor 1)",
    severity: "warning",
  },
  P0133: {
    description: "O2 Sensor Circuit Slow Response (Bank 1, Sensor 1)",
    severity: "warning",
  },
  P0134: {
    description: "O2 Sensor Circuit No Activity Detected (Bank 1, Sensor 1)",
    severity: "warning",
  },
  P0171: { description: "System Too Lean (Bank 1)", severity: "critical" },
  P0172: { description: "System Too Rich (Bank 1)", severity: "critical" },
  P0174: { description: "System Too Lean (Bank 2)", severity: "critical" },
  P0175: { description: "System Too Rich (Bank 2)", severity: "critical" },
  P0200: { description: "Injector Circuit Malfunction", severity: "critical" },
  P0300: {
    description: "Random/Multiple Cylinder Misfire Detected",
    severity: "critical",
  },
  P0301: { description: "Cylinder 1 Misfire Detected", severity: "critical" },
  P0302: { description: "Cylinder 2 Misfire Detected", severity: "critical" },
  P0303: { description: "Cylinder 3 Misfire Detected", severity: "critical" },
  P0304: { description: "Cylinder 4 Misfire Detected", severity: "critical" },
  P0305: { description: "Cylinder 5 Misfire Detected", severity: "critical" },
  P0306: { description: "Cylinder 6 Misfire Detected", severity: "critical" },
  P0420: {
    description: "Catalyst System Efficiency Below Threshold (Bank 1)",
    severity: "warning",
  },
  P0430: {
    description: "Catalyst System Efficiency Below Threshold (Bank 2)",
    severity: "warning",
  },
  P0440: {
    description: "Evaporative Emission Control System Malfunction",
    severity: "warning",
  },
  P0442: {
    description:
      "Evaporative Emission Control System Leak Detected (small leak)",
    severity: "info",
  },
  P0443: {
    description:
      "Evaporative Emission Control System Purge Control Valve Circuit Malfunction",
    severity: "warning",
  },
  P0500: {
    description: "Vehicle Speed Sensor Malfunction",
    severity: "warning",
  },
  P0505: {
    description: "Idle Control System Malfunction",
    severity: "warning",
  },
  P0601: {
    description: "Internal Control Module Memory Check Sum Error",
    severity: "critical",
  },
  P0700: {
    description: "Transmission Control System Malfunction",
    severity: "critical",
  },
  P0750: { description: "Shift Solenoid A Malfunction", severity: "critical" },
};

/**
 * OBD-II Service Class
 * Provides clean API for OBD-II operations
 */
export class OBDIIService {
  private device: Device;
  private sendCommand: (
    device: Device,
    command: string,
    retries?: number,
    timeout?: number,
  ) => Promise<string>;
  private logMessage: (message: string) => void;

  constructor(
    device: Device,
    sendCommand: (
      device: Device,
      command: string,
      retries?: number,
      timeout?: number,
    ) => Promise<string>,
    logMessage: (message: string) => void,
  ) {
    this.device = device;
    this.sendCommand = sendCommand;
    this.logMessage = logMessage;
  }

  /**
   * Get Diagnostic Trouble Codes
   * Returns array of DTCs with descriptions and severity
   */
  async getDTCs(): Promise<DiagnosticTroubleCode[]> {
    this.logMessage("📋 Fetching diagnostic trouble codes...");

    try {
      // Request stored DTCs (Mode 03)
      const response = await this.sendCommand(this.device, "03", 3, 8000);

      if (!response) {
        this.logMessage("❌ No response received for DTC request");
        return [];
      }

      this.logMessage(`📨 Raw DTC Response: ${response}`);

      // Check for "NO DATA" response
      if (response.includes("NO DATA")) {
        this.logMessage("✅ No diagnostic trouble codes found");
        return [];
      }

      // Parse DTC codes from response
      const dtcCodes = this.parseDTCResponse(response);

      if (dtcCodes.length === 0) {
        this.logMessage("✅ No diagnostic trouble codes found");
        return [];
      }

      // Enhance DTCs with descriptions and severity
      const enhancedDTCs = dtcCodes.map((code) => this.enhanceDTC(code));

      this.logMessage(
        `✅ Found ${enhancedDTCs.length} diagnostic trouble code(s)`,
      );
      return enhancedDTCs;
    } catch (error) {
      this.logMessage(
        `❌ Error fetching DTCs: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  /**
   * Clear all Diagnostic Trouble Codes
   */
  async clearDTCs(): Promise<boolean> {
    this.logMessage("🗑️ Clearing diagnostic trouble codes...");

    try {
      // Send clear DTCs command (Mode 04)
      const response = await this.sendCommand(this.device, "04", 2, 5000);

      if (response.includes("44") || response.includes("OK")) {
        this.logMessage("✅ Diagnostic trouble codes cleared successfully");
        return true;
      }

      this.logMessage("⚠️ Unclear response when clearing DTCs");
      return false;
    } catch (error) {
      this.logMessage(
        `❌ Error clearing DTCs: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /**
   * Get battery voltage
   */
  async getVoltage(): Promise<string | null> {
    this.logMessage("🔋 Fetching battery voltage...");

    try {
      const response = await this.sendCommand(this.device, "AT RV", 3, 5000);

      if (response) {
        const voltageMatch = response.match(/(\d+\.?\d*)\s*V/i);
        if (voltageMatch) {
          const voltage = voltageMatch[1];
          this.logMessage(`✅ Battery voltage: ${voltage}V`);
          return voltage;
        }
      }

      this.logMessage("❌ Could not parse voltage from response");
      return null;
    } catch (error) {
      this.logMessage(
        `❌ Error fetching voltage: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * Get Vehicle Identification Number (VIN)
   * Uses Mode 09, PID 02
   */
  async getVIN(): Promise<string | null> {
    this.logMessage("🔍 Fetching Vehicle Identification Number (VIN)...");

    try {
      // Request VIN (Mode 09, PID 02)
      const response = await this.sendCommand(this.device, "0902", 3, 10000);

      if (!response) {
        this.logMessage("❌ No response received for VIN request");
        return null;
      }

      this.logMessage(`📨 Raw VIN Response: ${response}`);

      // Check for "NO DATA" or error response
      if (
        response.includes("NO DATA") ||
        response.includes("NODATA") ||
        response.includes("UNABLE")
      ) {
        this.logMessage(
          "❌ VIN not available from this vehicle (OBD-II does not support Mode 09 PID 02)",
        );
        return null;
      }

      // Check if response is just the command echo with no data
      const cleanedForCheck = response.replace(/[\r\n\s>]/g, "").toUpperCase();
      if (cleanedForCheck === "0902" || cleanedForCheck.length < 10) {
        this.logMessage("❌ Vehicle did not respond with VIN data");
        return null;
      }

      // Parse VIN from response
      const vin = this.parseVINResponse(response);

      if (!vin || vin.length !== 17) {
        this.logMessage(
          `⚠️ Invalid VIN length: ${vin?.length || 0} (expected 17)`,
        );
        return null;
      }

      this.logMessage(`✅ VIN Retrieved: ${vin}`);
      return vin;
    } catch (error) {
      this.logMessage(
        `❌ Error fetching VIN: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * Get basic vehicle data (voltage, RPM, speed, coolant temp)
   */
  async getBasicVehicleData(): Promise<VehicleData> {
    this.logMessage("📊 Fetching basic vehicle data...");

    const data: VehicleData = {
      voltage: null,
      rpm: null,
      speed: null,
      coolantTemp: null,
    };

    try {
      // Get voltage
      data.voltage = await this.getVoltage();

      // Get RPM (PID 0C)
      try {
        const rpmResponse = await this.sendCommand(
          this.device,
          "010C",
          2,
          5000,
        );
        data.rpm = this.parseRPM(rpmResponse);
      } catch (error) {
        this.logMessage(`⚠️ Could not fetch RPM: ${error}`);
      }

      // Get speed (PID 0D)
      try {
        const speedResponse = await this.sendCommand(
          this.device,
          "010D",
          2,
          5000,
        );
        data.speed = this.parseSpeed(speedResponse);
      } catch (error) {
        this.logMessage(`⚠️ Could not fetch speed: ${error}`);
      }

      // Get coolant temp (PID 05)
      try {
        const tempResponse = await this.sendCommand(
          this.device,
          "0105",
          2,
          5000,
        );
        data.coolantTemp = this.parseCoolantTemp(tempResponse);
      } catch (error) {
        this.logMessage(`⚠️ Could not fetch coolant temperature: ${error}`);
      }

      this.logMessage("✅ Basic vehicle data retrieved");
      return data;
    } catch (error) {
      this.logMessage(
        `❌ Error fetching vehicle data: ${error instanceof Error ? error.message : String(error)}`,
      );
      return data;
    }
  }

  // Private helper methods

  private parseVINResponse(response: string): string | null {
    try {
      // Clean response - remove whitespace, carriage returns, and common noise
      let cleanResponse = response
        .replace(/\r/g, "")
        .replace(/\n/g, " ")
        .toUpperCase();

      this.logMessage(`🔍 Initial Response: ${cleanResponse}`);

      // Remove common OBD-II noise patterns
      cleanResponse = cleanResponse
        .replace(/BUS INIT[:\s]*\.+OK/gi, "") // Remove BUS INIT: ...OK
        .replace(/SEARCHING\.+/gi, "") // Remove SEARCHING...
        .replace(/0902/g, "") // Remove command echo
        .replace(/09\s*02/g, "") // Remove spaced command echo
        .replace(/>/g, "") // Remove prompt characters
        .replace(/\d:/g, "") // Remove frame indicators (0:, 1:, 2:, etc)
        .replace(/\s+/g, "") // Remove all remaining whitespace
        .trim();

      this.logMessage(`🔍 Cleaned VIN Response: ${cleanResponse}`);

      // Look for Mode 09 response pattern: 49 02 01 [VIN bytes]
      // Multi-frame format: 49 02 01 + 17 bytes of VIN in hex
      const vinPattern = /490201([\dA-F]+)/i;
      const match = cleanResponse.match(vinPattern);

      if (!match) {
        this.logMessage("❌ Could not find VIN pattern in response");
        this.logMessage(
          "💡 Tip: The OBD device may not support VIN retrieval, or initialization failed",
        );
        return null;
      }

      // Extract hex data after the header (49 02 01)
      let hexData = match[1];

      this.logMessage(`🔍 Extracted hex data: ${hexData}`);

      // Convert hex pairs to ASCII characters
      let vin = "";
      for (let i = 0; i < hexData.length && i < 34; i += 2) {
        // 34 hex chars = 17 bytes
        const hexPair = hexData.substr(i, 2);
        const charCode = parseInt(hexPair, 16);

        // Only include valid VIN characters (A-Z, 0-9)
        // VINs don't contain I, O, Q to avoid confusion with 1, 0
        if (
          (charCode >= 48 && charCode <= 57) || // 0-9
          (charCode >= 65 && charCode <= 72) || // A-H
          (charCode >= 74 && charCode <= 78) || // J-N
          (charCode >= 80 && charCode <= 90) // P-Z (excluding O, Q)
        ) {
          vin += String.fromCharCode(charCode);
        }
      }

      this.logMessage(`🔍 Parsed VIN: ${vin}`);

      // VIN should be exactly 17 characters
      if (vin.length >= 17) {
        return vin.substring(0, 17);
      } else if (vin.length > 0) {
        this.logMessage(`⚠️ VIN too short (${vin.length} chars): ${vin}`);
        return vin.length >= 11 ? vin : null; // Return if at least 11 chars (partial VIN)
      }

      return null;
    } catch (error) {
      this.logMessage(`❌ Error parsing VIN: ${error}`);
      return null;
    }
  }

  private parseDTCResponse(response: string): string[] {
    const dtcCodes: string[] = [];

    // Clean response
    const cleanResponse = response
      .replace(/\r/g, "\n")
      .replace(/\s+/g, " ")
      .trim();

    // Look for 43 XX XX pattern (Mode 03 response)
    const hexPattern = /43\s*([0-9A-F\s]+)/gi;
    const matches = cleanResponse.matchAll(hexPattern);

    for (const match of matches) {
      const hexData = match[1].replace(/\s/g, "");

      // Parse DTC bytes (each DTC is 2 bytes)
      for (let i = 0; i < hexData.length; i += 4) {
        const dtcBytes = hexData.substr(i, 4);
        if (dtcBytes.length === 4 && dtcBytes !== "0000") {
          const dtcCode = this.hexToDTC(dtcBytes);
          if (dtcCode) {
            dtcCodes.push(dtcCode);
          }
        }
      }
    }

    return dtcCodes;
  }

  private hexToDTC(hex: string): string | null {
    if (hex.length !== 4) return null;

    const byte1 = parseInt(hex.substring(0, 2), 16);
    const byte2 = parseInt(hex.substring(2, 4), 16);

    // Determine DTC prefix based on first 2 bits of first byte
    const prefixBits = (byte1 >> 6) & 0x03;
    const prefixMap: Record<number, string> = {
      0: "P", // Powertrain
      1: "C", // Chassis
      2: "B", // Body
      3: "U", // Network
    };
    const prefix = prefixMap[prefixBits] || "P";

    // Extract the rest of the code
    const digit2Bits = (byte1 >> 4) & 0x03;
    const digit3 = (byte1 & 0x0f).toString(16).toUpperCase();
    const digit4and5 = byte2.toString(16).toUpperCase().padStart(2, "0");

    return `${prefix}${digit2Bits}${digit3}${digit4and5}`;
  }

  private enhanceDTC(code: string): DiagnosticTroubleCode {
    const dtcInfo = DTC_DESCRIPTIONS[code];

    if (dtcInfo) {
      return {
        code,
        description: dtcInfo.description,
        severity: dtcInfo.severity,
      };
    }

    // Default for unknown codes
    return {
      code,
      description: "Unknown diagnostic trouble code",
      severity: "info",
    };
  }

  private parseRPM(response: string): number | null {
    const responseStr = String(response).replace(/\r/g, "\n");
    const lines = responseStr
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const hexLine = lines.reverse().find((line) => /41\s*0C/i.test(line));

    if (!hexLine) return null;

    const hexMatch = hexLine.match(
      /41\s*0C\s*([0-9A-Fa-f]{2})\s*([0-9A-Fa-f]{2})/,
    );
    if (!hexMatch) return null;

    const A = parseInt(hexMatch[1], 16);
    const B = parseInt(hexMatch[2], 16);
    if (isNaN(A) || isNaN(B)) return null;

    return (A * 256 + B) / 4;
  }

  private parseSpeed(response: string): number | null {
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
  }

  private parseCoolantTemp(response: string): number | null {
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

    return A - 40; // Celsius
  }
}

/**
 * Factory function to create OBD-II Service instance
 */
export function createOBDService(
  device: Device,
  sendCommand: (
    device: Device,
    command: string,
    retries?: number,
    timeout?: number,
  ) => Promise<string>,
  logMessage: (message: string) => void,
): OBDIIService {
  return new OBDIIService(device, sendCommand, logMessage);
}

/**
 * Backward Compatibility Layer
 * For screens still using the old obdDataFunctions API
 * @deprecated Use createOBDService() instead
 */
export interface TemperatureData {
  celsius: number;
  fahrenheit: number;
}

export const obdDataFunctions = {
  /**
   * @deprecated Use OBDIIService.getDTCs() instead
   */
  getDTCCodes: async (
    plxDevice: Device | null,
    sendCommand: (
      device: Device,
      command: string,
      retries?: number,
      timeout?: number,
    ) => Promise<string>,
    logMessage: (message: string) => void,
  ): Promise<string[]> => {
    if (!plxDevice) {
      logMessage("❌ No device connected");
      return [];
    }
    try {
      const service = createOBDService(plxDevice, sendCommand, logMessage);
      const dtcs = await service.getDTCs();
      return dtcs.map((dtc) => dtc.code);
    } catch (error) {
      logMessage(`❌ Error getting DTCs: ${error}`);
      return [];
    }
  },

  /**
   * @deprecated Use OBDIIService.clearDTCs() instead
   */
  clearDTCCodes: async (
    plxDevice: Device | null,
    sendCommand: (
      device: Device,
      command: string,
      retries?: number,
      timeout?: number,
    ) => Promise<string>,
    logMessage: (message: string) => void,
  ): Promise<boolean> => {
    if (!plxDevice) {
      logMessage("❌ No device connected");
      return false;
    }
    try {
      const service = createOBDService(plxDevice, sendCommand, logMessage);
      return await service.clearDTCs();
    } catch (error) {
      logMessage(`❌ Error clearing DTCs: ${error}`);
      return false;
    }
  },

  /**
   * @deprecated Use OBDIIService.getVoltage() instead
   */
  fetchVoltage: async (
    plxDevice: Device | null,
    sendCommand: (
      device: Device,
      command: string,
      retries?: number,
      timeout?: number,
    ) => Promise<string>,
    logMessage: (message: string) => void,
  ): Promise<string | null> => {
    if (!plxDevice) {
      logMessage("❌ No device connected");
      return null;
    }
    try {
      const service = createOBDService(plxDevice, sendCommand, logMessage);
      return await service.getVoltage();
    } catch (error) {
      logMessage(`❌ Error fetching voltage: ${error}`);
      return null;
    }
  },

  /**
   * @deprecated Use OBDIIService class instead
   */
  getEngineRPM: async (
    device: Device,
    sendCommand: (
      device: Device,
      command: string,
      retries?: number,
      timeout?: number,
    ) => Promise<string>,
  ): Promise<number> => {
    try {
      const response = await sendCommand(device, "010C", 2, 5000);
      const responseStr = String(response).replace(/\r/g, "\n");
      const lines = responseStr
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      const hexLine = lines.reverse().find((line) => /41\s*0C/i.test(line));

      if (!hexLine) return 0;

      const hexMatch = hexLine.match(
        /41\s*0C\s*([0-9A-Fa-f]{2})\s*([0-9A-Fa-f]{2})/,
      );
      if (!hexMatch) return 0;

      const A = parseInt(hexMatch[1], 16);
      const B = parseInt(hexMatch[2], 16);
      if (isNaN(A) || isNaN(B)) return 0;

      return (A * 256 + B) / 4;
    } catch (error) {
      console.error("Error getting engine RPM:", error);
      return 0;
    }
  },

  /**
   * @deprecated Use OBDIIService class instead
   */
  getCoolantTemperature: async (
    device: Device,
    sendCommand: (
      device: Device,
      command: string,
      retries?: number,
      timeout?: number,
    ) => Promise<string>,
  ): Promise<TemperatureData | null> => {
    try {
      const response = await sendCommand(device, "0105", 2, 5000);
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
   * @deprecated Use OBDIIService class instead
   */
  getIntakeAirTemperature: async (
    device: Device,
    sendCommand: (
      device: Device,
      command: string,
      retries?: number,
      timeout?: number,
    ) => Promise<string>,
  ): Promise<TemperatureData | null> => {
    try {
      const response = await sendCommand(device, "010F", 2, 5000);
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
   * @deprecated Use OBDIIService class instead
   */
  getThrottlePosition: async (
    device: Device,
    sendCommand: (
      device: Device,
      command: string,
      retries?: number,
      timeout?: number,
    ) => Promise<string>,
  ): Promise<number | null> => {
    try {
      const response = await sendCommand(device, "0111", 2, 5000);
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
      return Math.round(throttlePercent * 10) / 10;
    } catch (error) {
      console.error("Error getting throttle position:", error);
      return null;
    }
  },

  /**
   * @deprecated Use OBDIIService class instead
   */
  getFuelLevel: async (
    device: Device,
    sendCommand: (
      device: Device,
      command: string,
      retries?: number,
      timeout?: number,
    ) => Promise<string>,
  ): Promise<number | null> => {
    try {
      const response = await sendCommand(device, "012F", 2, 5000);
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
      return Math.round(fuelPercent * 10) / 10;
    } catch (error) {
      console.error("Error getting fuel level:", error);
      return null;
    }
  },

  /**
   * @deprecated Use OBDIIService class instead
   */
  getEngineLoad: async (
    device: Device,
    sendCommand: (
      device: Device,
      command: string,
      retries?: number,
      timeout?: number,
    ) => Promise<string>,
  ): Promise<number | null> => {
    try {
      const response = await sendCommand(device, "0104", 2, 5000);
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
      return Math.round(loadPercent * 10) / 10;
    } catch (error) {
      console.error("Error getting engine load:", error);
      return null;
    }
  },

  /**
   * @deprecated Use OBDIIService class instead
   */
  getManifoldPressure: async (
    device: Device,
    sendCommand: (
      device: Device,
      command: string,
      retries?: number,
      timeout?: number,
    ) => Promise<string>,
  ): Promise<number | null> => {
    try {
      const response = await sendCommand(device, "010B", 2, 5000);
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
   * @deprecated Use OBDIIService class instead
   */
  getVehicleSpeed: async (
    device: Device,
    sendCommand: (
      device: Device,
      command: string,
      retries?: number,
      timeout?: number,
    ) => Promise<string>,
  ): Promise<number | null> => {
    try {
      const response = await sendCommand(device, "010D", 2, 5000);
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
   * @deprecated Use OBDIIService.getVoltage() instead
   */
  getCurrentVoltage: async (
    device: Device,
    sendCommand: (
      device: Device,
      command: string,
      retries?: number,
      timeout?: number,
    ) => Promise<string>,
  ): Promise<string | null> => {
    try {
      const voltageResponse = await sendCommand(device, "AT RV", 2, 5000);
      const responseStr = String(voltageResponse);

      if (responseStr.includes("NO DATA")) {
        return null;
      }

      const voltageMatch = responseStr.match(/(\d+\.?\d*)\s*V/i);
      if (voltageMatch) {
        return voltageMatch[1];
      }

      return null;
    } catch (error) {
      console.error("Error getting voltage:", error);
      return null;
    }
  },
};
