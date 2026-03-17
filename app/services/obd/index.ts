/**
 * OBD Module Exports
 * Production-grade OBD engine with ~800 lines across 6 modules
 */

// Core engine
export { OBDEngine, createOBDEngine } from "./obdEngine";
export type {
  OBDEngineOptions,
  TelemetryData,
  DiagnosticResult,
} from "./obdEngine";

// Command queue
export { OBDCommandQueue } from "./commandQueue";
export type { QueuedCommand } from "./commandQueue";

// PID registry and parser
export {
  getPIDDefinition,
  getPIDsByType,
  getAllPIDCodes,
  validatePIDValue,
} from "./pidRegistry";
export type { PIDDefinition } from "./pidRegistry";

export {
  parsePIDResponse,
  parseMultiplePIDResponses,
  evaluateFormula,
  isPIDSupported,
  parseResponseHeader,
} from "./pidParser";
export type { ParsedPIDResult, ParseError } from "./pidParser";

// DTC parser
export {
  parseDTCResponse,
  getDTCDescription,
  filterDTCsBySeverity,
  getHighestDTCSeverity,
} from "./dtcParser";
export type { DiagnosticTroubleCode, ParsedDTCResult } from "./dtcParser";

// ELM327 protocol
export { ELM327Protocol } from "./elm327Protocol";
export type { ProtocolState } from "./elm327Protocol";

// ISO-TP frame handling
export { ISOTPFrameHandler, isMultiFrameResponse } from "./isoTpFrames";
export type { AssembledFrame } from "./isoTpFrames";
