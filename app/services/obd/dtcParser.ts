/**
 * DTC Parser - Diagnostic Trouble Code
 * Parses mode 03 responses and decodes DTC codes
 * Database sourced from standard OBD-II references
 */

export type DTCSeverity = "critical" | "warning" | "info";

export interface DiagnosticTroubleCode {
  code: string;
  system: "P" | "C" | "B" | "U";
  description: string;
  severity: DTCSeverity;
}

export interface ParsedDTCResult {
  codes: DiagnosticTroubleCode[];
  rawCodes: string[];
  timestamp: number;
  hasErrors: boolean;
}

// Comprehensive DTC Database
// P = Powertrain, C = Chassis, B = Body, U = Network
const DTC_DATABASE: Record<
  string,
  { description: string; severity: DTCSeverity }
> = {
  // P0000-P0099: Fuel & Air Metering
  P0001: {
    description: "Fuel Volume Regulator Control Circuit/Open",
    severity: "warning",
  },
  P0011: {
    description: "Cam Profile Timing Over-Advanced Bank A",
    severity: "warning",
  },
  P0012: {
    description: "Cam Profile Timing Over-Retarded Bank A",
    severity: "warning",
  },
  P0013: {
    description: "O2 Sensor Heater Control Circuit Bank 2 Sensor 1",
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

  // P0100-P0199: Fuel & Air Metering (continued)
  P0110: {
    description: "Intake Air Temperature Circuit Malfunction",
    severity: "warning",
  },
  P0111: {
    description: "Intake Air Temperature Circuit Range/Performance Problem",
    severity: "warning",
  },
  P0112: {
    description: "Intake Air Temperature Circuit Low Input",
    severity: "warning",
  },
  P0113: {
    description: "Intake Air Temperature Circuit High Input",
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
  P0122: {
    description: "Throttle Position Sensor/Switch A Circuit Low Input",
    severity: "warning",
  },
  P0123: {
    description: "Throttle Position Sensor/Switch A Circuit High Input",
    severity: "warning",
  },

  // P0130-P0199: Fuel Injection & Ignition Systems
  P0130: {
    description: "O2 Sensor Circuit Malfunction Bank 1 Sensor 1",
    severity: "warning",
  },
  P0131: {
    description: "O2 Sensor Circuit Low Voltage Bank 1 Sensor 1",
    severity: "warning",
  },
  P0132: {
    description: "O2 Sensor Circuit High Voltage Bank 1 Sensor 1",
    severity: "warning",
  },
  P0133: {
    description: "O2 Sensor Circuit Slow Response Bank 1 Sensor 1",
    severity: "warning",
  },
  P0134: {
    description: "O2 Sensor Circuit No Activity Detected Bank 1 Sensor 1",
    severity: "warning",
  },
  P0135: {
    description: "O2 Sensor Heater Circuit Malfunction Bank 1 Sensor 1",
    severity: "warning",
  },
  P0136: {
    description: "O2 Sensor Circuit Malfunction Bank 1 Sensor 2",
    severity: "warning",
  },
  P0140: {
    description: "O2 Sensor Circuit Malfunction Bank 2 Sensor 1",
    severity: "warning",
  },
  P0141: {
    description: "O2 Sensor Heater Circuit Malfunction Bank 2 Sensor 1",
    severity: "warning",
  },
  P0171: {
    description: "System Too Lean Bank 1",
    severity: "critical",
  },
  P0172: {
    description: "System Too Rich Bank 1",
    severity: "critical",
  },
  P0173: {
    description: "Fuel Trim System Malfunction Bank 1",
    severity: "warning",
  },
  P0174: {
    description: "System Too Lean Bank 2",
    severity: "critical",
  },
  P0175: {
    description: "System Too Rich Bank 2",
    severity: "critical",
  },
  P0176: {
    description: "Fuel Composition Sensor Circuit Malfunction",
    severity: "warning",
  },
  P0180: {
    description: "Fuel Temperature Sensor Circuit Malfunction",
    severity: "warning",
  },
  P0190: {
    description: "Fuel Injector Circuit Malfunction",
    severity: "critical",
  },
  P0200: {
    description: "Injector Circuit Malfunction",
    severity: "critical",
  },
  P0201: {
    description: "Cylinder 1 Injector Circuit Malfunction",
    severity: "critical",
  },
  P0202: {
    description: "Cylinder 2 Injector Circuit Malfunction",
    severity: "critical",
  },
  P0203: {
    description: "Cylinder 3 Injector Circuit Malfunction",
    severity: "critical",
  },
  P0204: {
    description: "Cylinder 4 Injector Circuit Malfunction",
    severity: "critical",
  },
  P0205: {
    description: "Cylinder 5 Injector Circuit Malfunction",
    severity: "critical",
  },
  P0206: {
    description: "Cylinder 6 Injector Circuit Malfunction",
    severity: "critical",
  },

  // P0300-P0399: Ignition System
  P0300: {
    description: "Random/Multiple Cylinder Misfire Detected",
    severity: "critical",
  },
  P0301: {
    description: "Cylinder 1 Misfire Detected",
    severity: "critical",
  },
  P0302: {
    description: "Cylinder 2 Misfire Detected",
    severity: "critical",
  },
  P0303: {
    description: "Cylinder 3 Misfire Detected",
    severity: "critical",
  },
  P0304: {
    description: "Cylinder 4 Misfire Detected",
    severity: "critical",
  },
  P0305: {
    description: "Cylinder 5 Misfire Detected",
    severity: "critical",
  },
  P0306: {
    description: "Cylinder 6 Misfire Detected",
    severity: "critical",
  },
  P0307: {
    description: "Cylinder 7 Misfire Detected",
    severity: "critical",
  },
  P0308: {
    description: "Cylinder 8 Misfire Detected",
    severity: "critical",
  },
  P0320: {
    description: "Ignition/Distributor Engine Speed Input Circuit Malfunction",
    severity: "critical",
  },
  P0325: {
    description: "Knock Sensor 1 Circuit Malfunction",
    severity: "warning",
  },
  P0330: {
    description: "Knock Sensor 2 Circuit Malfunction",
    severity: "warning",
  },
  P0335: {
    description: "Engine Position System Malfunction ECM/PCM",
    severity: "critical",
  },
  P0340: {
    description: "Cam Shaft Position Sensor Circuit Malfunction",
    severity: "warning",
  },
  P0345: {
    description: "Cam Shaft Position Sensor Circuit Malfunction Bank 1",
    severity: "warning",
  },
  P0350: {
    description: "Ignition Coil Primary/Secondary Circuit Malfunction",
    severity: "critical",
  },

  // P0400-P0499: Emission Control Systems
  P0400: {
    description: "Exhaust Gas Recirculation Flow Malfunction",
    severity: "warning",
  },
  P0401: {
    description: "Exhaust Gas Recirculation Flow Insufficient Detected",
    severity: "warning",
  },
  P0402: {
    description: "Exhaust Gas Recirculation Flow Excessive Detected",
    severity: "warning",
  },
  P0410: {
    description: "Secondary Air Injection System Malfunction",
    severity: "warning",
  },
  P0420: {
    description: "Catalyst System Efficiency Below Threshold Bank 1",
    severity: "warning",
  },
  P0430: {
    description: "Catalyst System Efficiency Below Threshold Bank 2",
    severity: "warning",
  },
  P0440: {
    description: "Evaporative Emission Control System Malfunction",
    severity: "warning",
  },
  P0441: {
    description: "Evaporative Emission Control System Incorrect Purge Flow",
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
  P0444: {
    description:
      "Evaporative Emission Control System Purge Control Valve Circuit Open",
    severity: "warning",
  },
  P0445: {
    description:
      "Evaporative Emission Control System Purge Control Valve Circuit Shorted",
    severity: "warning",
  },
  P0450: {
    description: "Evaporative Emission Control System Pressure Sensor",
    severity: "warning",
  },
  P0455: {
    description: "Evaporative Emission Control System Leak Detected (large)",
    severity: "warning",
  },

  // P0500-P0599: Vehicle Speed & Idle Control
  P0500: {
    description: "Vehicle Speed Sensor Malfunction",
    severity: "warning",
  },
  P0501: {
    description: "Vehicle Speed Sensor Range/Performance Problem",
    severity: "warning",
  },
  P0505: {
    description: "Idle Control System Malfunction",
    severity: "warning",
  },
  P0510: {
    description: "Closed Throttle Position Switch Malfunction",
    severity: "warning",
  },

  // P0600-P0699: Computer/PCM
  P0600: {
    description: "Serial Communication Link Malfunction",
    severity: "critical",
  },
  P0601: {
    description: "Internal Control Module Memory Check Sum Error",
    severity: "critical",
  },
  P0602: {
    description: "Control Module Programming Error",
    severity: "critical",
  },
  P0603: {
    description: "Internal Control Module Keep Alive Memory Error",
    severity: "critical",
  },
  P0604: {
    description: "Internal Control Module Random Access Memory Error",
    severity: "critical",
  },
  P0605: {
    description: "Internal Control Module Read Only Memory Error",
    severity: "critical",
  },

  // P0700-P0799: Transmission
  P0700: {
    description: "Transmission Control System Malfunction",
    severity: "critical",
  },
  P0701: {
    description: "Transmission Control System Range/Performance Problem",
    severity: "warning",
  },
  P0702: {
    description: "Transmission Control System Electrical",
    severity: "warning",
  },
  P0705: {
    description: "Transmission Range Sensor Circuit Malfunction",
    severity: "warning",
  },
  P0710: {
    description: "Transmission Fluid Temperature Sensor Circuit Malfunction",
    severity: "warning",
  },
  P0715: {
    description: "Input/Turbine Speed Sensor Circuit Malfunction",
    severity: "warning",
  },
  P0720: {
    description: "Output Speed Sensor Circuit Malfunction",
    severity: "warning",
  },
  P0725: {
    description: "Engine Speed Input Circuit Malfunction",
    severity: "critical",
  },
  P0730: {
    description: "Automatic Transmission Range Selection Error",
    severity: "warning",
  },
  P0740: {
    description: "Torque Converter Clutch Circuit Malfunction",
    severity: "warning",
  },
  P0750: {
    description: "Shift Solenoid A Malfunction",
    severity: "critical",
  },
  P0755: {
    description: "Shift Solenoid B Malfunction",
    severity: "critical",
  },
  P0760: {
    description: "Shift Solenoid C Malfunction",
    severity: "critical",
  },
  P0765: {
    description: "Shift Solenoid D Malfunction",
    severity: "critical",
  },
  P0770: {
    description: "Shift Solenoid E Malfunction",
    severity: "critical",
  },

  // Chassis codes
  C0001: {
    description: "Brake Electronic Control Module Communication Malfunction",
    severity: "warning",
  },
  C0035: {
    description: "Right Front Wheel ABS Sensor Circuit Malfunction",
    severity: "warning",
  },
  C0040: {
    description: "Left Rear Wheel ABS Sensor Circuit Malfunction",
    severity: "warning",
  },

  // Body codes
  B0000: {
    description: "Body Control Module Communication Malfunction",
    severity: "warning",
  },

  // Network codes
  U0001: {
    description: "CAN Bus Off - Error Active",
    severity: "critical",
  },
  U0002: {
    description: "CAN Communication Bus Error",
    severity: "critical",
  },
  U0100: {
    description: "Lost Communication With Engine Control Module",
    severity: "critical",
  },
};

/**
 * Parse DTC response from Mode 03 command
 *
 * Response format: 43 01 33 00 00
 * 43 = mode 03 response
 * 01 33 = first DTC code
 * 00 00 = second DTC (empty)
 */
export function parseDTCResponse(rawResponse: string): ParsedDTCResult {
  try {
    const codeStrings = extractDTCCodes(rawResponse);
    const dtcCodes = codeStrings
      .map((code) => decodeDTC(code))
      .filter((dtc) => dtc !== null) as DiagnosticTroubleCode[];

    return {
      codes: dtcCodes,
      rawCodes: codeStrings,
      timestamp: Date.now(),
      hasErrors: dtcCodes.length === 0 && codeStrings.length > 0,
    };
  } catch (error) {
    console.error("Error parsing DTC response:", error);
    return {
      codes: [],
      rawCodes: [],
      timestamp: Date.now(),
      hasErrors: true,
    };
  }
}

/**
 * Extract raw DTC code strings from response
 */
function extractDTCCodes(response: string): string[] {
  const dtcCodes: string[] = [];

  // Clean response
  const cleanResponse = response
    .replace(/\r/g, "\n")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  // Check for "NO DATA" response
  if (cleanResponse.includes("NO DATA")) {
    return [];
  }

  // Look for mode 03 response pattern: 43 XX XX XX XX ...
  const hexPattern = /43\s*([0-9A-F\s]+)/gi;
  const matches = cleanResponse.matchAll(hexPattern);

  for (const match of matches) {
    const hexData = match[1].replace(/\s/g, "");

    // Parse DTC bytes (each DTC is 2 bytes = 4 hex chars)
    for (let i = 0; i < hexData.length; i += 4) {
      const dtcBytes = hexData.substring(i, i + 4);

      // Skip if doesn't look like real data (0000)
      if (dtcBytes.length === 4 && dtcBytes !== "0000") {
        dtcCodes.push(dtcBytes);
      }
    }
  }

  return dtcCodes;
}

/**
 * Decode a single DTC code from 2 hex bytes
 *
 * Format:
 * Byte 1: PP AAAA (2 bits prefix, 4 bits first digit)
 * Byte 2: DDDD DDDD (8 bits rest of code)
 *
 * Result: P0123 (prefix + digits)
 */
function decodeDTC(hexCode: string): DiagnosticTroubleCode | null {
  if (hexCode.length !== 4) return null;

  try {
    const byte1 = parseInt(hexCode.substring(0, 2), 16);
    const byte2 = parseInt(hexCode.substring(2, 4), 16);

    // Determine DTC prefix based on first 2 bits of first byte
    const prefixBits = (byte1 >> 6) & 0x03;
    const prefixMap: Record<number, "P" | "C" | "B" | "U"> = {
      0: "P", // Powertrain
      1: "C", // Chassis
      2: "B", // Body
      3: "U", // Network
    };

    const system = prefixMap[prefixBits] || "P";

    // Extract the digit codes
    const digit2Bits = (byte1 >> 4) & 0x03;
    const digit3 = (byte1 & 0x0f).toString(16).toUpperCase();
    const digit45 = byte2.toString(16).toUpperCase().padStart(2, "0");

    const dtcCode = `${system}${digit2Bits}${digit3}${digit45}`;

    // Look up description
    const dbEntry = DTC_DATABASE[dtcCode];

    return {
      code: dtcCode,
      system,
      description: dbEntry?.description || "Unknown diagnostic trouble code",
      severity: dbEntry?.severity || "info",
    };
  } catch (error) {
    console.error("Error decoding DTC:", error);
    return null;
  }
}

/**
 * Get DTC description
 */
export function getDTCDescription(
  code: string,
): { description: string; severity: DTCSeverity } | null {
  return DTC_DATABASE[code] || null;
}

/**
 * Filter DTCs by severity
 */
export function filterDTCsBySeverity(
  dtcs: DiagnosticTroubleCode[],
  severity: DTCSeverity,
): DiagnosticTroubleCode[] {
  return dtcs.filter((dtc) => dtc.severity === severity);
}

/**
 * Get highest severity from DTC list
 */
export function getHighestDTCSeverity(
  dtcs: DiagnosticTroubleCode[],
): DTCSeverity {
  if (dtcs.some((dtc) => dtc.severity === "critical")) return "critical";
  if (dtcs.some((dtc) => dtc.severity === "warning")) return "warning";
  return "info";
}
