/**
 * OBD-II PID Parser
 * Parses OBD responses and evaluates formulas
 * Used by production apps for flexible, data-driven parsing
 */

import { getPIDDefinition, validatePIDValue } from "./pidRegistry";

export interface ParsedPIDResult {
  code: string;
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  valid: boolean;
  raw: string;
}

export interface ParseError {
  code: string;
  error: string;
  raw: string;
}

/**
 * Parse a single PID response
 *
 * Response format:
 * 41 0C 1A F8  → RPM response
 * ┌─ Mode response (41 = mode 01 response)
 * ├─ PID code (0C)
 * └─ Data bytes (1A F8)
 */
export function parsePIDResponse(
  code: string,
  rawResponse: string,
): ParsedPIDResult | ParseError {
  try {
    // Get PID definition
    const pidDef = getPIDDefinition(code);
    if (!pidDef) {
      return {
        code,
        error: `Unknown PID code: ${code}`,
        raw: rawResponse,
      };
    }

    // Check for error responses
    if (rawResponse.includes("NO DATA") || rawResponse.includes("UNABLE")) {
      return {
        code,
        error: "No data available for this PID",
        raw: rawResponse,
      };
    }

    // Special handling for ATRV (battery voltage)
    // ATRV returns a string like "12.5V", not standard OBD bytes
    if (code === "ATRV") {
      const voltageMatch = rawResponse.match(/(\d+\.?\d*)/);
      if (voltageMatch) {
        const value = parseFloat(voltageMatch[1]);
        if (!isNaN(value)) {
          return {
            code,
            name: pidDef.name,
            value: Math.round(value * 100) / 100,
            unit: pidDef.unit,
            timestamp: Date.now(),
            valid: validatePIDValue(code, value),
            raw: rawResponse,
          };
        }
      }
      return {
        code,
        error: "Could not parse voltage from ATRV response",
        raw: rawResponse,
      };
    }

    // Extract bytes from response
    const bytes = extractBytesFromResponse(code, rawResponse);
    if (bytes === null || bytes.length !== pidDef.bytes) {
      return {
        code,
        error: `Invalid response format or incorrect byte count. Expected: ${pidDef.bytes}, Got: ${bytes?.length || 0}`,
        raw: rawResponse,
      };
    }

    // Evaluate formula
    const value = evaluateFormula(pidDef.formula, bytes);

    // Validate against min/max
    const valid = validatePIDValue(code, value);

    return {
      code,
      name: pidDef.name,
      value,
      unit: pidDef.unit,
      timestamp: Date.now(),
      valid,
      raw: rawResponse,
    };
  } catch (error) {
    return {
      code,
      error: `Parse error: ${error instanceof Error ? error.message : String(error)}`,
      raw: rawResponse,
    };
  }
}

/**
 * Parse multiple PID responses
 * Useful for batch polling
 */
export function parseMultiplePIDResponses(
  responses: Record<string, string>,
): (ParsedPIDResult | ParseError)[] {
  return Object.entries(responses).map(([code, response]) =>
    parsePIDResponse(code, response),
  );
}

/**
 * Extract bytes from OBD response
 *
 * Format: 41 0C 1A F8
 * Mode response (41 0C) followed by data bytes
 */
function extractBytesFromResponse(
  code: string,
  response: string,
): number[] | null {
  try {
    // Clean the response - remove whitespace and extra newlines
    let clean = response
      .replace(/\r/g, "\n")
      .replace(/\n/g, " ")
      .trim()
      .toUpperCase();

    // Strip ISO-TP frame headers if present
    // First Frame: 48 6B 10 ... (48=FirstFrame, 6B=length, 10=start of data)
    // Single Frame: 02 41 0C ... (02=SingleFrame(2 bytes), 41=mode, 0C=pid)
    // Consecutive Frame: 21 ...
    const isoTPMatch = clean.match(
      /^([0-9A-F]{2})\s*([0-9A-F]{2})\s*([0-9A-F]{2})/,
    );
    if (isoTPMatch) {
      const firstByte = parseInt(isoTPMatch[1], 16);
      const secondByte = parseInt(isoTPMatch[2], 16);

      // Check if this looks like ISO-TP frame
      // First Frame: 0x4x or 0x5x (48 = 0x48, 586B = multi-frame)
      // Single Frame: 0x0x (length < 8)
      if (firstByte >= 0x40 || (firstByte & 0xf0) === 0x00) {
        // This is likely an ISO-TP frame, check if we can find 41 later
        if (clean.includes("41")) {
          // Find where 41 starts (OBD mode 1 response header)
          const modeIndex = clean.indexOf("41");
          if (modeIndex > 0) {
            clean = clean.substring(modeIndex);
          }
        }
      }
    }

    // Look for mode response pattern: 41 XX YY ZZ ... (41 = mode 1 response)
    const pidShort = code.substring(2, 4); // Get last 2 chars (PID code)

    // Pattern: 41 followed by PID code followed by data bytes
    // 41 0C 1A F8 → extract 1A F8
    const pattern = new RegExp(`41\\s*${pidShort}\\s*([0-9A-F\\s]+)`, "i");
    const match = clean.match(pattern);

    if (!match) {
      return null;
    }

    // Extract and parse hex bytes
    const hexString = match[1].replace(/\s+/g, "");
    const bytes: number[] = [];

    for (let i = 0; i < hexString.length; i += 2) {
      const hex = hexString.substring(i, i + 2);
      if (hex.length === 2) {
        bytes.push(parseInt(hex, 16));
      }
    }

    return bytes.length > 0 ? bytes : null;
  } catch (error) {
    console.error("Error extracting bytes:", error);
    return null;
  }
}

/**
 * Evaluate a formula with given byte values
 *
 * Formula uses A, B, C, D for bytes
 * Example: "(A * 256 + B) / 4"
 */
export function evaluateFormula(formula: string, bytes: number[]): number {
  try {
    const A = bytes[0] ?? 0;
    const B = bytes[1] ?? 0;
    const C = bytes[2] ?? 0;
    const D = bytes[3] ?? 0;

    // Use Function constructor for dynamic formula evaluation
    // This is safe here because formulas come from the PID registry (static data)
    const result = Function(
      "A",
      "B",
      "C",
      "D",
      `return ${formula}`,
    )(A, B, C, D);

    const num = Number(result);
    if (isNaN(num)) {
      throw new Error(`Formula evaluated to NaN: ${formula}`);
    }

    // Round to 2 decimal places
    return Math.round(num * 100) / 100;
  } catch (error) {
    throw new Error(
      `Formula evaluation failed: ${formula} with bytes [${bytes.join(",")}]. ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Check if a response indicates the PID is not supported
 */
export function isPIDSupported(rawResponse: string): boolean {
  const noDataPatterns = [
    "NO DATA",
    "UNABLE",
    "NOT SUPPORTED",
    "NOT AVAILABLE",
  ];
  return !noDataPatterns.some((pattern) =>
    rawResponse.toUpperCase().includes(pattern),
  );
}

/**
 * Parse response header to get mode and PID
 * Useful for validation
 */
export function parseResponseHeader(
  rawResponse: string,
): { mode: string; pid: string } | null {
  try {
    const clean = rawResponse
      .replace(/\r/g, "\n")
      .replace(/\n/g, " ")
      .trim()
      .toUpperCase();

    const match = clean.match(/41\s*([0-9A-F]{2})/);
    if (!match) {
      return null;
    }

    return {
      mode: "41", // Mode 1 response
      pid: match[1],
    };
  } catch (error) {
    return null;
  }
}
