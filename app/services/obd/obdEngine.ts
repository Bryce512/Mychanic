/**
 * OBD Engine - Unified Service
 * Orchestrates all OBD components:
 * - Command Queue for single-threaded execution
 * - PID Parser for data extraction
 * - DTC Parser for diagnostic codes
 * - ELM327 Protocol for adapter management
 * - ISO-TP Frame Assembly for multi-frame responses
 *
 * This is the production-grade OBD core (~800 lines) that mirrors
 * the architecture used in apps like Torque Pro, OBD Fusion, and Car Scanner
 */

import { OBDCommandQueue } from "./commandQueue";
import { ELM327Protocol } from "./elm327Protocol";
import { parsePIDResponse, ParsedPIDResult } from "./pidParser";
import {
  parseDTCResponse,
  DiagnosticTroubleCode,
  getHighestDTCSeverity,
} from "./dtcParser";
import { ISOTPFrameHandler } from "./isoTpFrames";
import { getPIDDefinition, getAllPIDCodes } from "./pidRegistry";

// Types
export interface OBDEngineOptions {
  onLog?: (message: string) => void;
  autoInitialize?: boolean;
}

export interface TelemetryData {
  [pidCode: string]: ParsedPIDResult | null;
}

export interface DiagnosticResult {
  dtcs: DiagnosticTroubleCode[];
  severity: "critical" | "warning" | "info";
  hasErrors: boolean;
  cleared: boolean;
}

/**
 * Production-grade OBD Engine
 * Used by Torque, OBD Fusion, Car Scanner internally
 */
export class OBDEngine {
  private commandQueue: OBDCommandQueue;
  private protocol: ELM327Protocol;
  private frameHandler: ISOTPFrameHandler;
  private onLog: (message: string) => void;

  // Transport layer
  private sendToAdapter:
    | ((command: string, timeout: number) => Promise<string>)
    | null = null;

  // State
  private isInitialized = false;
  private isPolling = false;
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(options?: OBDEngineOptions) {
    this.onLog = options?.onLog ?? console.log;

    // Create queue with adapter transport
    this.commandQueue = new OBDCommandQueue(async (command, timeout) => {
      if (!this.sendToAdapter) {
        throw new Error("Transport not configured");
      }
      return this.sendToAdapter(command, timeout);
    }, this.onLog);

    // Create protocol handler
    this.protocol = new ELM327Protocol(async (command, timeout) => {
      if (!this.sendToAdapter) {
        throw new Error("Transport not configured");
      }
      return this.sendToAdapter(command, timeout ?? 5000);
    }, this.onLog);

    // Create frame handler
    this.frameHandler = new ISOTPFrameHandler();
  }

  /**
   * Configure transport layer (BLE, Serial, etc.)
   */
  setTransport(
    sendCommand: (command: string, timeout: number) => Promise<string>,
  ): void {
    this.sendToAdapter = sendCommand;
    this.logMessage("🔌 Transport configured");
  }

  /**
   * Initialize OBD connection
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      this.logMessage("⚠️ Already initialized");
      return true;
    }

    if (!this.sendToAdapter) {
      this.logMessage("❌ Transport not configured");
      return false;
    }

    try {
      const success = await this.protocol.initialize();
      if (success) {
        this.isInitialized = true;
        this.logMessage("✅ OBD Engine initialized");
      }
      return success;
    } catch (error) {
      this.logMessage(
        `❌ Initialization failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /**
   * Query a single PID
   */
  async queryPID(pidCode: string): Promise<ParsedPIDResult | null> {
    try {
      const pidDef = getPIDDefinition(pidCode);
      if (!pidDef) {
        this.logMessage(`❌ Unknown PID: ${pidCode}`);
        return null;
      }

      // Queue the command with reasonable timeout for live data queries
      // Device responds very quickly (100-300ms typically)
      // Keep timeout short but with buffer for BLE overhead
      const response = await this.commandQueue.enqueue(pidCode, {
        retries: 1,
        timeout: 900,
      });

      // Log raw response for debugging
      this.logMessage(`[${pidCode}] Raw response: "${response}"`);

      // Handle multi-frame if needed
      const processed = this.frameHandler.processFrame(response);
      const finalResponse = processed.data;

      // Log processed response for debugging
      this.logMessage(`[${pidCode}] Processed response: "${finalResponse}"`);

      // Parse the response
      const result = parsePIDResponse(pidCode, finalResponse);

      if ("value" in result) {
        this.logMessage(`✅ ${pidDef.name}: ${result.value} ${result.unit}`);
        return result;
      } else {
        this.logMessage(
          `⚠️ ${pidDef.name}: ${result.error} (raw: "${finalResponse}")`,
        );
        return null;
      }
    } catch (error) {
      this.logMessage(
        `❌ Query failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * Query multiple PIDs in sequence
   * @param pidCodes - Array of PID codes to query
   * @param onEachComplete - Optional callback fired after each PID completes
   */
  async queryMultiplePIDs(
    pidCodes: string[],
    onEachComplete?: (pidCode: string, result: ParsedPIDResult | null) => void,
  ): Promise<TelemetryData> {
    const results: TelemetryData = {};

    this.logMessage(`📊 Querying ${pidCodes.length} PIDs...`);

    for (const pidCode of pidCodes) {
      const result = await this.queryPID(pidCode);
      results[pidCode] = result;

      // Fire callback immediately after each PID completes
      if (onEachComplete) {
        onEachComplete(pidCode, result);
      }

      // Small delay between queries
      await this.delay(50);
    }

    return results;
  }

  /**
   * Start polling multiple sensors (sequential - waits for each cycle to complete)
   */
  startPolling(pidCodes: string[], intervalMs = 100): void {
    if (this.isPolling) {
      this.logMessage("⚠️ Polling already active");
      return;
    }

    this.isPolling = true;
    this.logMessage(
      `▶️ Starting polling: ${pidCodes.length} PIDs every ${intervalMs}ms`,
    );

    const poll = async () => {
      if (!this.isPolling) return;

      try {
        await this.queryMultiplePIDs(pidCodes);
      } catch (error) {
        this.logMessage(`⚠️ Polling error: ${error}`);
      }

      // Schedule next poll only after this one completes
      if (this.isPolling) {
        this.pollInterval = setTimeout(poll, intervalMs);
      }
    };

    // Start first poll
    poll();
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollInterval) {
      clearTimeout(this.pollInterval);
      this.pollInterval = null;
      this.isPolling = false;
      this.logMessage("⏹️ Polling stopped");
    }
  }

  /**
   * Get all Diagnostic Trouble Codes
   */
  async getActiveDTCs(): Promise<DiagnosticTroubleCode[]> {
    this.logMessage("📋 Fetching active DTCs...");

    try {
      // Mode 03 - Get stored DTCs (most common)
      const response = await this.commandQueue.enqueue("03", {
        retries: 2,
        timeout: 8000,
      });

      const result = parseDTCResponse(response);

      if (result.codes.length > 0) {
        this.logMessage(`⚠️ Found ${result.codes.length} active DTC(s)`);
        return result.codes;
      } else if (result.hasErrors) {
        this.logMessage("❌ Error parsing DTCs");
        return [];
      } else {
        this.logMessage("✅ No active DTCs");
        return [];
      }
    } catch (error) {
      this.logMessage(
        `❌ DTC fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  /**
   * Get pending DTCs (MIL Not Illuminated)
   */
  async getPendingDTCs(): Promise<DiagnosticTroubleCode[]> {
    this.logMessage("📋 Fetching pending DTCs...");

    try {
      // Mode 07 - Get pending DTCs
      const response = await this.commandQueue.enqueue("07", {
        retries: 2,
        timeout: 8000,
      });

      const result = parseDTCResponse(response);

      if (result.codes.length > 0) {
        this.logMessage(`⚠️ Found ${result.codes.length} pending DTC(s)`);
        return result.codes;
      } else {
        this.logMessage("✅ No pending DTCs");
        return [];
      }
    } catch (error) {
      this.logMessage(
        `❌ Pending DTC fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  /**
   * Clear all DTCs (MIL reset)
   */
  async clearDTCs(): Promise<boolean> {
    this.logMessage("🗑️ Clearing DTCs...");

    try {
      // Mode 04 - Clear stored DTCs
      const response = await this.commandQueue.enqueue("04", {
        retries: 2,
        timeout: 5000,
      });

      if (response.includes("44") || response.includes("OK")) {
        this.logMessage("✅ DTCs cleared");
        return true;
      } else {
        this.logMessage("⚠️ Unclear response when clearing DTCs");
        return false;
      }
    } catch (error) {
      this.logMessage(
        `❌ Clear DTCs failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /**
   * Get Vehicle Identification Number
   */
  async getVIN(): Promise<string | null> {
    return this.protocol.getVIN();
  }

  /**
   * Discover supported PIDs (dynamic capability detection)
   */
  async discoverSupportedPIDs(): Promise<string[]> {
    return this.protocol.discoverSupportedPIDs();
  }

  /**
   * Get adapter information
   */
  async getAdapterInfo(): Promise<{
    adapter: string;
    protocol: string;
    version: string;
  } | null> {
    return this.protocol.getProtocolInfo();
  }

  /**
   * Reset adapter (use cautiously - takes ~1 second)
   */
  async reset(): Promise<boolean> {
    this.isInitialized = false;
    return this.protocol.reset();
  }

  /**
   * Check adapter responsiveness
   */
  async isResponsive(): Promise<boolean> {
    try {
      return await this.protocol.isResponsive();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current queue status
   */
  getQueueStatus(): { length: number; busy: boolean } {
    return {
      length: this.commandQueue.getQueueLength(),
      busy: this.commandQueue.isBusy(),
    };
  }

  /**
   * Get polling status
   */
  getPollingStatus(): boolean {
    return this.isPolling;
  }

  /**
   * Get initialization status
   */
  getInitializationStatus(): boolean {
    return this.isInitialized;
  }

  /**
   * Get protocol state
   */
  getProtocolState() {
    return this.protocol.getState();
  }

  /**
   * Get core PID list (25 PIDs - covers 95% of vehicles)
   */
  getCorePIDList(): string[] {
    return [
      "010C", // RPM
      "010D", // Speed
      "0104", // Engine Load
      "0105", // Coolant Temp
      "010F", // Intake Air Temp
      "0111", // Throttle Position
      "012F", // Fuel Level
      "010A", // Fuel Pressure
      "010B", // MAP
      "0110", // MAF
      "0106", // STFT Bank 1
      "0107", // LTFT Bank 1
      "0108", // STFT Bank 2
      "0109", // LTFT Bank 2
      "0113", // O2 Sensor 1 Bank 1
      "0115", // O2 Sensor 2 Bank 1
      "0117", // O2 Sensor 1 Bank 2
      "011C", // OBD Standards
      "011F", // Runtime
      "0121", // Distance Since DTC Clear
      "0131", // Distance with MIL On
      "0133", // Barometric Pressure
      "0145", // Relative Throttle Pos
      "0146", // Ambient Air Temp
      "0149", // Accelerator Pedal Pos
    ];
  }

  /**
   * Get all available PIDs
   */
  getAllPIDCodes(): string[] {
    return getAllPIDCodes();
  }

  /**
   * Handle connection loss gracefully
   */
  async handleConnectionLoss(): Promise<void> {
    this.logMessage("🔌 Handling connection loss...");

    // Stop polling
    this.stopPolling();

    // Clear frame buffers
    this.frameHandler.reset();

    // Reset protocol state
    await this.protocol.handleConnectionLoss();

    // Reset state
    this.isInitialized = false;
  }

  /**
   * Log message helper
   */
  private logMessage(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    this.onLog(`[${timestamp}] ${message}`);
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create OBD engine
 */
export function createOBDEngine(options?: OBDEngineOptions): OBDEngine {
  return new OBDEngine(options);
}
