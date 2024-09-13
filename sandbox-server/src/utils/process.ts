import treeKill from "tree-kill";

import { type ChildProcess, spawn } from "child_process";
import { err, ok, type Result } from "neverthrow";
import { createDeferred } from "./promise";

type ProcessMessage =
  | { type: "stdout"; message: string }
  | { type: "stderr"; message: string }
  | { type: "exit"; exitCode: number | undefined };

type ProcessMessageType = ProcessMessage["type"];

interface WaitForEventOptions<T> {
  condition: (payload: T) => boolean;
  timeout?: number;
}

export type TimeoutError = {
  type: "timeout";
  timeout: number;
};

export type ExitCodeError = {
  type: "exit";
  exitCode: number | undefined;
};

export type ProcessError = TimeoutError | ExitCodeError;

export type WaitResult = Result<ProcessOutput, ProcessError>;

export type WaitForEventResult<T> = Result<T, ProcessError>;

export class ProcessOutput {
  private readonly delimiter = "\n";
  private readonly messages: ProcessMessage[] = [];
  private _finished = false;
  private _exitCode?: number;

  get stdout(): string {
    return this.messages
      .filter((msg): msg is { type: "stdout"; message: string } => msg.type === "stdout")
      .map((msg) => msg.message)
      .join(this.delimiter);
  }

  get stderr(): string {
    return this.messages
      .filter((msg): msg is { type: "stderr"; message: string } => msg.type === "stderr")
      .map((msg) => msg.message)
      .join(this.delimiter);
  }

  get exitCode(): number | undefined {
    return this._exitCode;
  }

  get running(): boolean {
    return !this._finished;
  }

  get finished(): boolean {
    return this._finished;
  }

  addMessage(type: ProcessMessageType, message: string): void {
    if (type === "exit") {
      this.messages.push({ type, exitCode: parseInt(message) });
    } else {
      this.messages.push({ type, message });
    }
  }

  finish(exitCode?: number): void {
    this._exitCode = exitCode;
    this._finished = true;
  }
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
        const output = await this.processFinished;

        return output.exitCode === 0
          ? ok(output)
          : err({ type: "exit", exitCode: output.exitCode });
      }

      const timeoutPromise = new Promise<WaitResult>((resolve) => {
        timeoutHandle = setTimeout(() => {
          console.log(`[Process] Timeout waiting for process to finish after ${timeout}ms`);
          this.kill();
          resolve(err({ type: "timeout", timeout }));
        }, timeout);
      });

      const processResult = await Promise.race<WaitResult>([
        this.processFinished.then((output) => ok(output)),
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
      this.process?.stdin?.end();
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

export interface ProcessOptions {
  cmd: string;
  cwd?: string;
  onStdout?: (data: Buffer) => Promise<void> | void;
  onStderr?: (data: Buffer) => Promise<void> | void;
  onExit?: (code: number) => Promise<void> | void;
}

export interface IProcessController {
  start(cmd: string): Promise<Process>;
  start(options: ProcessOptions): Promise<Process>;
  startAndWait(cmd: string, timeout?: number): Promise<WaitResult>;
  startAndWait(options: ProcessOptions & { timeout?: number }): Promise<WaitResult>;
}

export class ProcessController implements IProcessController {
  async start(cmd: string): Promise<Process>;

  async start(options: ProcessOptions): Promise<Process>;

  async start(args: string | ProcessOptions): Promise<Process> {
    const options = typeof args === "string" ? { cmd: args } : args;
    return await this.startProcess(options);
  }

  async startAndWait(cmd: string, timeout?: number): Promise<WaitResult>;

  async startAndWait(args: ProcessOptions & { timeout?: number }): Promise<WaitResult>;

  async startAndWait(
    args: string | (ProcessOptions & { timeout?: number }),
    timeout?: number,
  ): Promise<WaitResult> {
    const options = typeof args === "string" ? { cmd: args, timeout } : args;
    const process = await this.startProcess(options);
    return await process.wait(options.timeout);
  }

  private async startProcess(options: ProcessOptions): Promise<Process> {
    const processOutput = new ProcessOutput();
    const spawnedProcess = spawn(options.cmd, [], { cwd: options.cwd, shell: true });
    const processDeferredOutput = createDeferred<ProcessOutput>();

    spawnedProcess.stdout?.on("data", (data: Buffer) => {
      processOutput?.addMessage("stdout", data.toString());
      void options.onStdout?.(data);
    });

    spawnedProcess.stderr?.on("data", (data: Buffer) => {
      processOutput?.addMessage("stderr", data.toString());
      void options.onStderr?.(data);
    });

    spawnedProcess?.on("exit", (code) => {
      spawnedProcess.stdin?.end();
      processOutput?.finish(code ?? undefined);
      void options.onExit?.(code ?? 0);
      processDeferredOutput.resolve(processOutput);
    });

    const process = new Process(
      spawnedProcess, //
      processDeferredOutput.promise,
      processOutput,
    );

    return process;
  }
}
