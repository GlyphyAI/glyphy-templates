import { spawn } from "child_process";
import { Process, type WaitResult } from "~/utils/process/process";
import { ProcessOutput } from "~/utils/process/processOutput";
import { createDeferred } from "~/utils/promise";

export interface ProcessOptions {
  cmd: string;
  cwd?: string;
  onStdout?: (data: Buffer) => Promise<void> | void;
  onStderr?: (data: Buffer) => Promise<void> | void;
  onExit?: (code: number | undefined) => Promise<void> | void;
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
      void options.onExit?.(code ?? undefined);
      processDeferredOutput.resolve(processOutput);
    });

    const processInstance = new Process(
      spawnedProcess, //
      processDeferredOutput.promise,
      processOutput,
    );

    return processInstance;
  }
}
