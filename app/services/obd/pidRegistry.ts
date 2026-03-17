/**
 * OBD-II PID Registry
 * Data-driven approach used by production apps like Torque, OBD Fusion, etc.
 *
 * Core PIDs:  The ~25 PIDs that cover ~95% of real vehicles
 * Extended:   Additional diagnostic PIDs
 *
 * Formula syntax: Use A, B, C, D for bytes (0-indexed)
 * Example: "010C" → "(A*256 + B) / 4" → RPM
 */

export interface PIDDefinition {
  /** OBD command code (e.g., "010C") */
  code: string;
  /** Human readable name */
  name: string;
  /** Description for UI */
  description: string;
  /** Number of bytes in response */
  bytes: number;
  /** Formula to calculate value from bytes (A, B, C, D available) */
  formula: string;
  /** Unit of measurement */
  unit: string;
  /** Type for UI grouping */
  type: "engine" | "emission" | "system" | "advanced";
  /** Min/max values for validation */
  min?: number;
  max?: number;
}

export const PID_REGISTRY: Record<string, PIDDefinition> = {
  // ============================================
  // CORE PIDS (25 PIDs - covers 95% of vehicles)
  // ============================================

  // Battery Voltage
  "ATRV": {
    code: "ATRV",
    name: "battery_voltage",
    description: "Battery Voltage",
    bytes: 1,
    formula: "A",
    unit: "V",
    type: "system",
    min: 0,
    max: 20,
  },

  // Engine RPM - One of the most important PIDs
  "010C": {
    code: "010C",
    name: "engine_rpm",
    description: "Engine RPM",
    bytes: 2,
    formula: "(A * 256 + B) / 4",
    unit: "rpm",
    type: "engine",
    min: 0,
    max: 8000,
  },

  // Vehicle Speed
  "010D": {
    code: "010D",
    name: "vehicle_speed",
    description: "Vehicle Speed",
    bytes: 1,
    formula: "A",
    unit: "km/h",
    type: "engine",
    min: 0,
    max: 255,
  },

  // Engine Load
  "0104": {
    code: "0104",
    name: "engine_load",
    description: "Calculated Engine Load",
    bytes: 1,
    formula: "(A * 100) / 255",
    unit: "%",
    type: "engine",
    min: 0,
    max: 100,
  },

  // Coolant Temperature - Critical for diagnostics
  "0105": {
    code: "0105",
    name: "coolant_temp",
    description: "Engine Coolant Temperature",
    bytes: 1,
    formula: "A - 40",
    unit: "°C",
    type: "engine",
    min: -40,
    max: 130,
  },

  // Short Term Fuel Trim Bank 1
  "0106": {
    code: "0106",
    name: "fuel_trim_st_bank1",
    description: "Short Term Fuel Trim - Bank 1",
    bytes: 1,
    formula: "((A / 128) - 1) * 100",
    unit: "%",
    type: "emission",
    min: -100,
    max: 100,
  },

  // Long Term Fuel Trim Bank 1
  "0107": {
    code: "0107",
    name: "fuel_trim_lt_bank1",
    description: "Long Term Fuel Trim - Bank 1",
    bytes: 1,
    formula: "((A / 128) - 1) * 100",
    unit: "%",
    type: "emission",
    min: -100,
    max: 100,
  },

  // Short Term Fuel Trim Bank 2
  "0108": {
    code: "0108",
    name: "fuel_trim_st_bank2",
    description: "Short Term Fuel Trim - Bank 2",
    bytes: 1,
    formula: "((A / 128) - 1) * 100",
    unit: "%",
    type: "emission",
    min: -100,
    max: 100,
  },

  // Long Term Fuel Trim Bank 2
  "0109": {
    code: "0109",
    name: "fuel_trim_lt_bank2",
    description: "Long Term Fuel Trim - Bank 2",
    bytes: 1,
    formula: "((A / 128) - 1) * 100",
    unit: "%",
    type: "emission",
    min: -100,
    max: 100,
  },

  // Intake Air Temperature
  "010F": {
    code: "010F",
    name: "intake_air_temp",
    description: "Intake Air Temperature",
    bytes: 1,
    formula: "A - 40",
    unit: "°C",
    type: "engine",
    min: -40,
    max: 130,
  },

  // Throttle Position
  "0111": {
    code: "0111",
    name: "throttle_position",
    description: "Absolute Throttle Position",
    bytes: 1,
    formula: "(A * 100) / 255",
    unit: "%",
    type: "engine",
    min: 0,
    max: 100,
  },

  // Oxygen Sensor 1 - Bank 1
  "0113": {
    code: "0113",
    name: "o2_sensor_1_bank1",
    description: "O2 Sensor 1 - Bank 1",
    bytes: 1,
    formula: "A * 0.01",
    unit: "V",
    type: "emission",
    min: 0,
    max: 1.28,
  },

  // Oxygen Sensor 2 - Bank 1
  "0115": {
    code: "0115",
    name: "o2_sensor_2_bank1",
    description: "O2 Sensor 2 - Bank 1",
    bytes: 1,
    formula: "A * 0.01",
    unit: "V",
    type: "emission",
    min: 0,
    max: 1.28,
  },

  // OBD Standards (Diagnostics)
  "011C": {
    code: "011C",
    name: "obd_standards",
    description: "OBD Standards Compliance",
    bytes: 1,
    formula: "A",
    unit: "code",
    type: "system",
  },

  // Fuel Level
  "012F": {
    code: "012F",
    name: "fuel_level",
    description: "Fuel Tank Level",
    bytes: 1,
    formula: "(A * 100) / 255",
    unit: "%",
    type: "engine",
    min: 0,
    max: 100,
  },

  // Distance Traveled with MIL On
  "0131": {
    code: "0131",
    name: "distance_mil_on",
    description: "Distance Traveled with MIL On",
    bytes: 2,
    formula: "A * 256 + B",
    unit: "km",
    type: "system",
  },

  // Absolute Barometric Pressure
  "0133": {
    code: "0133",
    name: "barometric_pressure",
    description: "Barometric Pressure (altitude)",
    bytes: 1,
    formula: "A",
    unit: "kPa",
    type: "engine",
  },

  // Oxygen Sensor 1 - Bank 2
  "0117": {
    code: "0117",
    name: "o2_sensor_1_bank2",
    description: "O2 Sensor 1 - Bank 2",
    bytes: 1,
    formula: "A * 0.01",
    unit: "V",
    type: "emission",
    min: 0,
    max: 1.28,
  },

  // Mass Air Flow
  "0110": {
    code: "0110",
    name: "maf_sensor",
    description: "Mass Air Flow Sensor",
    bytes: 2,
    formula: "(A * 256 + B) / 100",
    unit: "g/s",
    type: "engine",
    min: 0,
    max: 655.35,
  },

  // Manifold Absolute Pressure
  "010B": {
    code: "010B",
    name: "map_sensor",
    description: "Intake Manifold Absolute Pressure",
    bytes: 1,
    formula: "A",
    unit: "kPa",
    type: "engine",
    min: 0,
    max: 255,
  },

  // Fuel Pressure
  "010A": {
    code: "010A",
    name: "fuel_pressure",
    description: "Fuel Pressure Gauge",
    bytes: 1,
    formula: "A * 3",
    unit: "kPa",
    type: "engine",
    min: 0,
    max: 765,
  },

  // Runtime Since Engine Start
  "011F": {
    code: "011F",
    name: "runtime",
    description: "Runtime Since Engine Start",
    bytes: 2,
    formula: "A * 256 + B",
    unit: "seconds",
    type: "system",
  },

  // Distance Traveled Since DTC Clear
  "0121": {
    code: "0121",
    name: "distance_dtc_clear",
    description: "Distance Traveled Since DTC Clear",
    bytes: 2,
    formula: "A * 256 + B",
    unit: "km",
    type: "system",
  },

  // Relative Throttle Position
  "0145": {
    code: "0145",
    name: "relative_throttle_pos",
    description: "Relative Throttle Position",
    bytes: 1,
    formula: "(A * 100) / 255",
    unit: "%",
    type: "engine",
    min: 0,
    max: 100,
  },

  // Ambient Air Temperature
  "0146": {
    code: "0146",
    name: "ambient_air_temp",
    description: "Ambient Air Temperature",
    bytes: 1,
    formula: "A - 40",
    unit: "°C",
    type: "engine",
    min: -40,
    max: 130,
  },

  // Accelerator Pedal Position
  "0149": {
    code: "0149",
    name: "accel_pedal_pos",
    description: "Accelerator Pedal Position",
    bytes: 1,
    formula: "(A * 100) / 255",
    unit: "%",
    type: "system",
    min: 0,
    max: 100,
  },

  // ============================================
  // EXTENDED PIDS (Additional diagnostics)
  // ============================================

  // Fuel Trim Commands
  "016F": {
    code: "016F",
    name: "fuel_rail_pressure",
    description: "Fuel Rail Pressure (diesel)",
    bytes: 2,
    formula: "(A * 256 + B) * 0.079",
    unit: "kPa",
    type: "engine",
  },

  // Fuel tank vapor control
  "0150": {
    code: "0150",
    name: "fuel_evap_control",
    description: "Fuel Evap Control",
    bytes: 1,
    formula: "A",
    unit: "code",
    type: "emission",
  },

  // Hybrid system percent
  "0152": {
    code: "0152",
    name: "hybrid_system",
    description: "Hybrid System Mode",
    bytes: 1,
    formula: "(A * 100) / 255",
    unit: "%",
    type: "system",
  },

  // Engine Oil Temperature
  "0165": {
    code: "0165",
    name: "engine_oil_temp",
    description: "Engine Oil Temperature",
    bytes: 1,
    formula: "A - 40",
    unit: "°C",
    type: "engine",
    min: -40,
    max: 130,
  },

  // Transmission Temperature
  "0170": {
    code: "0170",
    name: "transmission_temp",
    description: "Transmission Temperature",
    bytes: 1,
    formula: "A - 40",
    unit: "°C",
    type: "system",
    min: -40,
    max: 130,
  },
};

/**
 * Get PID definition by code
 */
export function getPIDDefinition(code: string): PIDDefinition | null {
  return PID_REGISTRY[code] || null;
}

/**
 * Get all PIDs of a specific type
 */
export function getPIDsByType(
  type: "engine" | "emission" | "system" | "advanced",
): PIDDefinition[] {
  return Object.values(PID_REGISTRY).filter((pid) => pid.type === type);
}

/**
 * Get all available PID codes
 */
export function getAllPIDCodes(): string[] {
  return Object.keys(PID_REGISTRY);
}

/**
 * Validate a value against PID min/max
 */
export function validatePIDValue(code: string, value: number): boolean {
  const pid = getPIDDefinition(code);
  if (!pid) return false;

  if (pid.min !== undefined && value < pid.min) return false;
  if (pid.max !== undefined && value > pid.max) return false;

  return true;
}
