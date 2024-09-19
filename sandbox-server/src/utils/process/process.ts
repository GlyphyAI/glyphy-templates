import treeKill from "tree-kill";

import { err, ok, type Result } from "neverthrow";

import type { ChildProcess } from "child_process";
import type { ProcessOutput } from "~/utils/process/processOutput";
import type { ProcessError } from "~/utils/process/processTypes";

export type WaitResult = Result<ProcessOutput, ProcessError>;
export type WaitForEventResult<T> = Result<T, ProcessError>;
export interface WaitForEventOptions<T> {
  condition: (payload: T) => boolean;
  timeout?: number;
}

export class Process {
  constructor(
    private readonly process: ChildProcess,
    private readonly processFinished: Promise<ProcessOutput>,
    readonly output: ProcessOutput,
  ) {}

  get pid(): number | undefined {
    return this.process.pid;
  }

  get running(): boolean {
    return (
      this.process.pid !== undefined &&
      !this.process.killed &&
      this.process.exitCode === null &&
      this.process.signalCode === null
    );
  }

  async wait(timeout?: number): Promise<WaitResult> {
    let timeoutHandle: NodeJS.Timeout | undefined;

    try {
      if (timeout === undefined) {
        return this.processFinished.then(ok);
      }

      const timeoutPromise = new Promise<WaitResult>((resolve) => {
        timeoutHandle = setTimeout(() => {
          console.log(`[Process] Timeout waiting for process to finish after ${timeout}ms`);
          this.kill();
          resolve(err({ type: "timeout", timeout }));
        }, timeout);
      });

      const processResult = await Promise.race<WaitResult>([
        this.processFinished.then(ok),
        timeoutPromise,
      ]);

      return processResult;
    } finally {
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  async waitForEvent<T = unknown>({
    condition,
    timeout = 5000,
  }: WaitForEventOptions<T>): Promise<WaitForEventResult<T>> {
    return new Promise<WaitForEventResult<T>>((resolve) => {
      let resolved = false;
      const timeoutId = setTimeout(() => {
        console.log("[Process] Timeout waiting for event");
        cleanupListeners();
        if (!resolved) {
          resolved = true;
          resolve(err({ type: "timeout", timeout }));
        }
      }, timeout);

      const onEvent = (data: Buffer) => {
        const payload = data.toString() as T;
        if (!condition || condition(payload)) {
          clearTimeout(timeoutId);
          cleanupListeners();
          if (!resolved) {
            resolved = true;
            resolve(ok(payload));
          }
        }
      };

      const onExit = (code: number) => {
        console.log("[Process] Process exited", code);
        clearTimeout(timeoutId);
        cleanupListeners();
        if (!resolved) {
          resolved = true;
          resolve(err({ type: "exit", exitCode: code }));
        }
      };

      const cleanupListeners = () => {
        this.process.stdout?.off("data", onEvent);
        this.process.stderr?.off("data", onEvent);
        this.process.off("exit", onExit);
      };

      this.process.stdout?.on("data", onEvent);
      this.process.stderr?.on("data", onEvent);
      this.process.on("exit", onExit);
    });
  }

  kill(signal: NodeJS.Signals | number = "SIGTERM"): void {
    if (!this.process.pid) {
      return;
    }

    try {
      console.log("[Process] Killing process and its children", this.process.pid);
      treeKill(this.process.pid, signal, (err) => {
        if (err) {
          console.error("[Process] Error killing process tree", err);
        } else {
          console.log("[Process] Process tree killed");
        }
      });
    } catch (error) {
      console.log("[Process] Error killing process", error);
    }
  }

  writeInput(data: string): void {
    if (this.process.stdin) {
      this.process.stdin.write(data);
    } else {
      throw new Error("No stdin available for the process");
    }
  }
}
