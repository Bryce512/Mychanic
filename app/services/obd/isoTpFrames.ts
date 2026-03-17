/**
 * ISO-TP Frame Handler
 * Handles multi-frame OBD responses
 *
 * Some OBD queries (VIN, DTCs, etc.) return data larger than 7 bytes.
 * These use ISO-TP frame assembly:
 *
 * Single Frame (SF): 0x0n XX XX XX XX XX XX XX
 * First Frame   (FF): 0x1n XX XX XX XX XX XX XX
 * Consecutive Frame: 0x2n XX XX XX XX XX XX XX
 */

export interface AssembledFrame {
  complete: boolean;
  data: number[];
  frameCount: number;
  lastUpdated: number;
}

export class ISOTPFrameHandler {
  private frames: Map<string, AssembledFrame> = new Map();
  private frameTimeout = 5000; // 5 second timeout for frame assembly

  /**
   * Process a potential multi-frame response
   * Handles both single-frame and multi-frame responses
   */
  processFrame(rawResponse: string): { complete: boolean; data: string } {
    const bytes = this.extractHexBytes(rawResponse);

    if (!bytes || bytes.length === 0) {
      return { complete: false, data: rawResponse };
    }

    // Check frame type (first nibble of first byte)
    const frameType = (bytes[0] >> 4) & 0x0f;

    if (frameType === 0) {
      // Single or consecutive frame in single response
      // Most OBD adapters handle this automatically
      return { complete: true, data: rawResponse };
    }

    if (frameType === 1) {
      // First frame of multi-frame response
      return this.handleFirstFrame(bytes);
    }

    if (frameType === 2) {
      // Consecutive frame
      return this.handleConsecutiveFrame(bytes);
    }

    // Single frame (0x0n format)
    return { complete: true, data: rawResponse };
  }

  /**
   * Handle first frame of ISO-TP sequence
   */
  private handleFirstFrame(bytes: number[]): {
    complete: boolean;
    data: string;
  } {
    if (bytes.length < 2) {
      return { complete: false, data: "" };
    }

    // Extract length from first frame
    // 0x1n LL where LL is the length
    const length = bytes[1];
    const frameKey = `ff_${Date.now()}`;

    // Initialize frame assembly
    const assembled: AssembledFrame = {
      complete: false,
      data: bytes.slice(2), // Data starts at byte 2
      frameCount: 1,
      lastUpdated: Date.now(),
    };

    this.frames.set(frameKey, assembled);

    return {
      complete: false,
      data: "", // Waiting for consecutive frames
    };
  }

  /**
   * Handle consecutive frame
   */
  private handleConsecutiveFrame(bytes: number[]): {
    complete: boolean;
    data: string;
  } {
    if (bytes.length < 2) {
      return { complete: false, data: "" };
    }

    // Find the most recent first frame (usually there's only one)
    const entries = Array.from(this.frames.entries());
    if (entries.length === 0) {
      return { complete: false, data: "" };
    }

    const [frameKey, frame] = entries[entries.length - 1];

    // Add consecutive frame data
    frame.data.push(...bytes.slice(1)); // Skip the header byte
    frame.frameCount++;
    frame.lastUpdated = Date.now();

    // Check if complete (this is application-dependent)
    // For now, assume complete after receiving a few frames
    if (frame.frameCount >= 3 || frame.data.length > 256) {
      frame.complete = true;
      const assembledData = this.bytesToHexString(frame.data);
      this.frames.delete(frameKey);
      return { complete: true, data: assembledData };
    }

    return { complete: false, data: "" };
  }

  /**
   * Extract hex bytes from response string
   */
  private extractHexBytes(response: string): number[] | null {
    try {
      const clean = response
        .replace(/\r/g, " ")
        .replace(/\n/g, " ")
        .trim()
        .toUpperCase();

      const bytes: number[] = [];
      const hexPairs = clean.split(/\s+/);

      for (const pair of hexPairs) {
        if (/^[0-9A-F]{2}$/.test(pair)) {
          bytes.push(parseInt(pair, 16));
        }
      }

      return bytes.length > 0 ? bytes : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Convert bytes to hex string
   */
  private bytesToHexString(bytes: number[]): string {
    return bytes
      .map((b) => b.toString(16).toUpperCase().padStart(2, "0"))
      .join(" ");
  }

  /**
   * Clear expired frames
   */
  clearExpiredFrames(): void {
    const now = Date.now();
    const expired: string[] = [];

    for (const [key, frame] of this.frames.entries()) {
      if (now - frame.lastUpdated > this.frameTimeout) {
        expired.push(key);
      }
    }

    expired.forEach((key) => this.frames.delete(key));
  }

  /**
   * Reset all frame buffers
   */
  reset(): void {
    this.frames.clear();
  }

  /**
   * Get frame assembly status
   */
  getStatus(): { pendingFrames: number; totalData: number } {
    let totalData = 0;

    for (const frame of this.frames.values()) {
      totalData += frame.data.length;
    }

    return {
      pendingFrames: this.frames.size,
      totalData,
    };
  }
}

/**
 * Utility to check if response looks like multi-frame
 */
export function isMultiFrameResponse(response: string): boolean {
  const bytes = extractHexBytes(response);

  if (!bytes || bytes.length === 0) {
    return false;
  }

  const frameType = (bytes[0] >> 4) & 0x0f;

  // Frame types 1+ indicate multi-frame
  return frameType >= 1;
}

/**
 * Extract hex bytes from response string (utility)
 */
function extractHexBytes(response: string): number[] | null {
  try {
    const clean = response
      .replace(/\r/g, " ")
      .replace(/\n/g, " ")
      .trim()
      .toUpperCase();

    const bytes: number[] = [];
    const hexPairs = clean.split(/\s+/);

    for (const pair of hexPairs) {
      if (/^[0-9A-F]{2}$/.test(pair)) {
        bytes.push(parseInt(pair, 16));
      }
    }

    return bytes.length > 0 ? bytes : null;
  } catch (error) {
    return null;
  }
}
