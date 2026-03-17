/**
 * OBD Command Queue
 * Single-threaded execution for ELM327 adapter reliability
 *
 * Most production OBD apps (Torque, OBD Fusion, etc.) implement this pattern
 * because ELM327 adapters cannot handle concurrent commands.
 */

export interface QueuedCommand {
  command: string;
  retries?: number;
  timeout?: number;
  resolve: (response: string) => void;
  reject: (error: Error) => void;
}

export class OBDCommandQueue {
  private queue: QueuedCommand[] = [];
  private busy = false;
  private processTimer: NodeJS.Timeout | null = null;
  private onLog: (message: string) => void;
  private sendToAdapter: (
    command: string,
    timeout: number,
  ) => Promise<string>;

  constructor(
    sendToAdapter: (command: string, timeout: number) => Promise<string>,
    onLog: (message: string) => void = console.log,
  ) {
    this.sendToAdapter = sendToAdapter;
    this.onLog = onLog;
  }

  /**
   * Enqueue a command for execution
   * Returns a promise that resolves when command completes
   */
  enqueue(
    command: string,
    options?: { retries?: number; timeout?: number },
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        command,
        retries: options?.retries ?? 2,
        timeout: options?.timeout ?? 5000,
        resolve,
        reject,
      });

      this.process();
    });
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is currently processing
   */
  isBusy(): boolean {
    return this.busy;
  }

  /**
   * Clear all queued commands
   */
  clear(): void {
    const count = this.queue.length;
    this.queue = [];
    if (count > 0) {
      this.onLog(`🗑️ Cleared ${count} queued command(s)`);
    }
  }

  /**
   * Process next command in queue
   */
  private async process(): Promise<void> {
    // If already processing or no commands, skip
    if (this.busy || this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift();
    if (!job) return;

    this.busy = true;

    try {
      let lastError: Error | null = null;
      let response = "";

      // Retry logic
      for (let attempt = 0; attempt <= job.retries!; attempt++) {
        try {
          if (attempt > 0) {
            this.onLog(
              `🔄 Retry ${attempt}/${job.retries} for command: ${job.command}`,
            );
            // Small delay between retries
            await this.delay(200 * attempt);
          }

          response = await this.sendToAdapter(job.command, job.timeout!);

          // Successfully got response
          job.resolve(response);
          this.busy = false;

          // Process next command in queue
          this.process();
          return;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          // Will retry or fail below
        }
      }

      // Failed after all retries
      if (lastError) {
        job.reject(lastError);
      } else {
        job.reject(new Error(`Command failed: ${job.command}`));
      }
    } catch (error) {
      this.onLog(
        `❌ Queue processing error: ${error instanceof Error ? error.message : String(error)}`,
      );
      job.reject(
        error instanceof Error
          ? error
          : new Error(`Command processing failed: ${job.command}`),
      );
    } finally {
      this.busy = false;
      // Continue processing remaining commands
      this.process();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
