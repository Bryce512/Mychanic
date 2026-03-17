/**
 * ELM327 Protocol Handler
 * Manages adapter initialization and command sequences
 *
 * Most production apps use this same initialization sequence:
 * ATZ reset, ATE0 echo off, ATL0 linefeeds off, ATS0 spaces off,
 * ATH1 headers on, ATSP0 automatic protocol
 */

export interface ProtocolState {
  initialized: boolean;
  autoProtocol: boolean;
  headersEnabled: boolean;
  echoEnabled: boolean;
  lastInitTime: number | null;
}

export class ELM327Protocol {
  private onLog: (message: string) => void;
  private sendCommand: (command: string, timeout?: number) => Promise<string>;
  private state: ProtocolState = {
    initialized: false,
    autoProtocol: true,
    headersEnabled: true,
    echoEnabled: false,
    lastInitTime: null,
  };

  constructor(
    sendCommand: (command: string, timeout?: number) => Promise<string>,
    onLog: (message: string) => void = console.log,
  ) {
    this.sendCommand = sendCommand;
    this.onLog = onLog;
  }

  /**
   * Initialize ELM327 adapter
   * Runs standard initialization sequence
   */
  async initialize(): Promise<boolean> {
    this.onLog("🚗 Initializing ELM327 adapter...");

    try {
      // Test if already initialized
      try {
        const testResponse = await this.sendCommand("ATI", 2000);
        if (testResponse && testResponse.length > 2) {
          this.onLog("✅ ELM327 already initialized");
          this.state.initialized = true;
          this.state.lastInitTime = Date.now();
          return true;
        }
      } catch (error) {
        this.onLog("⚠️ Device not responding, initializing...");
      }

      // Core initialization commands (used by all major OBD apps)
      const initCommands = [
        { cmd: "ATE0", desc: "Echo off" },
        { cmd: "ATL0", desc: "Linefeeds off" },
        { cmd: "ATS0", desc: "Spaces off" },
        { cmd: "ATH1", desc: "Headers on" },
        { cmd: "ATSP0", desc: "Auto protocol detection" },
      ];

      for (const { cmd, desc } of initCommands) {
        try {
          const response = await this.sendCommand(cmd, 3000);
          this.onLog(`✅ ${desc}: ${cmd}`);
          await this.delay(100);
        } catch (error) {
          this.onLog(
            `⚠️ ${desc} failed (${cmd}): ${error instanceof Error ? error.message : String(error)}`,
          );
          // Continue with other commands even if one fails
        }
      }

      // Verify protocol is responsive with a simple command
      try {
        const testResponse = await this.sendCommand("010D", 2000);
        if (!testResponse.includes("NO DATA")) {
          this.onLog("✅ ELM327 initialization successful");
          this.state.initialized = true;
          this.state.lastInitTime = Date.now();
          return true;
        }
      } catch (error) {
        this.onLog(
          `⚠️ Initialization verification failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }

      this.state.initialized = true;
      this.state.lastInitTime = Date.now();
      return true;
    } catch (error) {
      this.onLog(
        `❌ Initialization error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /**
   * Reset adapter to default state
   * Use only when necessary (causes ~1 second delay)
   */
  async reset(): Promise<boolean> {
    this.onLog("🔄 Resetting ELM327 adapter...");

    try {
      await this.sendCommand("ATZ", 3000);
      this.onLog("✅ Adapter reset");

      // Re-initialize after reset
      this.state.initialized = false;
      await this.delay(1000); // ATZ requires delay

      return await this.initialize();
    } catch (error) {
      this.onLog(
        `❌ Reset failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }

  /**
   * Get supported PIDs (Mode 01, PID 00, 20, 40, 60, 80, A0)
   * Returns bitmask of supported PIDs
   */
  async discoverSupportedPIDs(): Promise<string[]> {
    this.onLog("🔍 Discovering supported PIDs...");

    const supportedPIDs: string[] = [];
    const pidChecks = ["0100", "0120", "0140", "0160", "0180", "01A0"];

    for (const pidCode of pidChecks) {
      try {
        const response = await this.sendCommand(pidCode, 2000);

        if (!response.includes("NO DATA") && response.includes("41")) {
          // Parse bitmask response
          const bytes = this.extractBytesFromResponse(pidCode, response);
          if (bytes && bytes.length >= 4) {
            // Generate PID codes from bitmask
            const basePID = parseInt(pidCode.substring(2, 4), 16);
            const newPIDs = this.decodePIDBitmask(basePID, bytes);
            supportedPIDs.push(...newPIDs);
          }
        }

        await this.delay(100);
      } catch (error) {
        // Continue without crashing
      }
    }

    this.onLog(`✅ Found ${supportedPIDs.length} supported PIDs`);
    return supportedPIDs;
  }

  /**
   * Get Vehicle Identification Number (VIN)
   */
  async getVIN(): Promise<string | null> {
    this.onLog("🔍 Fetching VIN...");

    try {
      // Mode 09 - Request vehicle info
      const response = await this.sendCommand("0902", 5000);

      if (response.includes("NO DATA") || response.includes("UNABLE")) {
        this.onLog("⚠️ VIN not available");
        return null;
      }

      const vin = this.parseVINResponse(response);

      if (vin && vin.length === 17) {
        this.onLog(`✅ VIN: ${vin}`);
        return vin;
      }

      if (vin && vin.length > 0) {
        this.onLog(`⚠️ Partial VIN (${vin.length} chars): ${vin}`);
        return vin.length >= 11 ? vin : null;
      }

      return null;
    } catch (error) {
      this.onLog(
        `❌ VIN fetch error: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  /**
   * Get protocol information
   */
  async getProtocolInfo(): Promise<{
    adapter: string;
    protocol: string;
    version: string;
  } | null> {
    try {
      // Get adapter ID
      const atiResponse = await this.sendCommand("ATI", 2000);
      const adapter = atiResponse.split("\n")[0]?.trim() || "Unknown";

      // Get protocol
      const atdpResponse = await this.sendCommand("ATDP", 2000);
      const protocol = atdpResponse.split("\n")[0]?.trim() || "Unknown";

      // Get version
      const atmvResponse = await this.sendCommand("ATMV", 2000);
      const version = atmvResponse.split("\n")[0]?.trim() || "Unknown";

      return { adapter, protocol, version };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if adapter is still responsive
   */
  async isResponsive(): Promise<boolean> {
    try {
      // Simple test command
      const response = await this.sendCommand("ATDP", 2000);
      return response.length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current protocol state
   */
  getState(): Readonly<ProtocolState> {
    return { ...this.state };
  }

  /**
   * Clear buffers and reset state on connection loss
   */
  async handleConnectionLoss(): Promise<void> {
    this.onLog("🔌 Handling connection loss...");
    this.state.initialized = false;

    try {
      // Try to flush any remaining data
      await this.sendCommand("ATPC", 1000); // Protocol close
    } catch (error) {
      // Ignore errors during connection loss handling
    }
  }

  // Private helper methods

  private parseVINResponse(response: string): string | null {
    try {
      let clean = response.replace(/\r/g, "").replace(/\n/g, " ").toUpperCase();

      // Remove noise
      clean = clean
        .replace(/BUS INIT[:\s]*\.+OK/gi, "")
        .replace(/SEARCHING\.+/gi, "")
        .replace(/0902/g, "")
        .replace(/09\s*02/g, "")
        .replace(/>/g, "")
        .replace(/\d:/g, "")
        .replace(/\s+/g, "")
        .trim();

      // Look for mode 09 response pattern: 49 02 01 [VIN bytes]
      const vinPattern = /490201([\dA-F]+)/i;
      const match = clean.match(vinPattern);

      if (!match) {
        return null;
      }

      let hexData = match[1];
      let vin = "";

      // Convert hex pairs to ASCII
      for (let i = 0; i < hexData.length && i < 34; i += 2) {
        const hexPair = hexData.substring(i, i + 2);
        const charCode = parseInt(hexPair, 16);

        // Only valid VIN characters (no I, O, Q to avoid confusion)
        if (
          (charCode >= 48 && charCode <= 57) ||
          (charCode >= 65 && charCode <= 72) ||
          (charCode >= 74 && charCode <= 78) ||
          (charCode >= 80 && charCode <= 90)
        ) {
          vin += String.fromCharCode(charCode);
        }
      }

      return vin.length >= 11 ? vin : null;
    } catch (error) {
      return null;
    }
  }

  private extractBytesFromResponse(
    code: string,
    response: string,
  ): number[] | null {
    try {
      const clean = response
        .replace(/\r/g, "\n")
        .replace(/\n/g, " ")
        .trim()
        .toUpperCase();

      const pidShort = code.substring(2, 4);
      const pattern = new RegExp(`41\\s*${pidShort}\\s*([0-9A-F\\s]+)`, "i");
      const match = clean.match(pattern);

      if (!match) {
        return null;
      }

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
      return null;
    }
  }

  private decodePIDBitmask(basePID: number, bytes: number[]): string[] {
    const pids: string[] = [];

    // Each byte is a bitmask of 8 PIDs
    for (let byteIndex = 0; byteIndex < 4; byteIndex++) {
      const byte = bytes[byteIndex];

      for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
        if (byte & (0x80 >> bitIndex)) {
          const pidNum = basePID + 1 + byteIndex * 8 + bitIndex;
          const pidCode = `01${pidNum.toString(16).toUpperCase().padStart(2, "0")}`;
          if (pidNum <= 255) {
            pids.push(pidCode);
          }
        }
      }
    }

    return pids;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
