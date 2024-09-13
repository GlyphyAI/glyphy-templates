import treeKill from "tree-kill";

import { type ChildProcess, spawn } from "child_process";
import { createDeferred } from "./promise";

interface EventOptions<T> {
  condition: (payload: T) => boolean;
  timeout?: number;
}

type ProcessMessageType = "stdout" | "stderr" | "exit";

class ProcessMessage {
  constructor(
    readonly type: ProcessMessageType,
    readonly message: string,
  ) {}

  toString(): string {
    return this.message;
  }
}

export class ProcessOutput {
  private readonly delimiter = "\n";
  private readonly messages: ProcessMessage[] = [];
  private _finished = false;
  private _exitCode?: number;

  get stdout(): string {
    return this.messages
      .filter((msg) => msg.type === "stdout")
      .map((msg) => msg.toString())
      .join(this.delimiter);
  }

  get stderr(): string {
    return this.messages
      .filter((msg) => msg.type === "stderr")
      .map((msg) => msg.toString())
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
    this.messages.push(new ProcessMessage(type, message));
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

  get pid(): number {
    return this.process.pid!;
  }

  async wait(timeout?: number): Promise<ProcessOutput> {
    let timeoutHandle: NodeJS.Timeout | undefined;

    try {
      if (timeout === undefined) {
        return await this.processFinished;
      }

      const timeoutPromise = new Promise<ProcessOutput>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          void this.kill();
          reject(new Error(`Process timed out after ${timeout}ms`));
        }, timeout);
      });

      return await Promise.race([this.processFinished, timeoutPromise]);
    } catch (error) {
      void this.kill();
      throw error;
    } finally {
      if (timeoutHandle !== undefined) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  async waitForEvent<T = unknown>({ condition, timeout = 5000 }: EventOptions<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.process.stdout?.off("data", onEvent);
        this.process.off("exit", onExit);
        reject(new Error("Timeout waiting for event"));
      }, timeout);

      const onEvent = (payload: T) => {
        if (!condition || condition(payload)) {
          clearTimeout(timeoutId);
          cleanupListeners();
          resolve(payload);
        }
      };

      const onExit = (code: number) => {
        clearTimeout(timeoutId);
        cleanupListeners();
        reject(new Error(`Process exited with code ${code}`));
      };

      const cleanupListeners = () => {
        this.process.stdout?.off("data", onEvent);
        this.process.off("exit", onExit);
      };

      this.process.stdout?.on("data", onEvent);
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
  timeout?: number;
  onStdout?: (data: Buffer) => Promise<void> | void;
  onStderr?: (data: Buffer) => Promise<void> | void;
  onExit?: (code: number) => Promise<void> | void;
}

export interface IProcessController {
  start(cmd: string): Promise<Process>;
  start(options: ProcessOptions): Promise<Process>;
  startAndWait(cmd: string): Promise<ProcessOutput>;
  startAndWait(options: ProcessOptions): Promise<ProcessOutput>;
}

export class ProcessController implements IProcessController {
  async start(cmd: string): Promise<Process>;

  async start(options: ProcessOptions): Promise<Process>;

  async start(args: string | ProcessOptions): Promise<Process> {
    const options = typeof args === "string" ? { cmd: args } : args;
    return await this.startProcess(options);
  }

  async startAndWait(cmd: string): Promise<ProcessOutput>;

  async startAndWait(options: ProcessOptions): Promise<ProcessOutput>;

  async startAndWait(args: string | ProcessOptions): Promise<ProcessOutput> {
    const options = typeof args === "string" ? { cmd: args } : args;
    return await this.startAndWaitProcess(options);
  }

  private async startProcess(options: ProcessOptions): Promise<Process> {
    const processOutput = new ProcessOutput();
    const spawnedProcess = spawn(options.cmd, [], { cwd: options.cwd, shell: true });
    const processDeferredOutput = createDeferred<ProcessOutput>();
    let timeoutHandle: NodeJS.Timeout;

    spawnedProcess.stdout?.on("data", (data: Buffer) => {
      processOutput?.addMessage("stdout", data.toString());
      void options.onStdout?.(data);
    });

    spawnedProcess.stderr?.on("data", (data: Buffer) => {
      processOutput?.addMessage("stderr", data.toString());
      void options.onStderr?.(data);
    });

    spawnedProcess?.on("exit", (code) => {
      clearTimeout(timeoutHandle);
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

    if (options.timeout) {
      timeoutHandle = setTimeout(() => {
        if (spawnedProcess && !processOutput?.finished) {
          spawnedProcess.kill();
          processOutput.finish();
          processDeferredOutput.reject(new Error(`Process timed out after ${options.timeout}ms`));
        }
      }, options.timeout);
    }

    return process;
  }

  private async startAndWaitProcess(options: ProcessOptions): Promise<ProcessOutput> {
    const process = await this.startProcess(options);
    return await process.wait(options.timeout);
  }
}
