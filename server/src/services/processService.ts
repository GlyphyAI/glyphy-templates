import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { unwrapErrorMessage } from "~/utils/zodErrors";

import type { CommandsTemplate } from "~/models/template";
import type { Broadcaster } from "~/utils/broadcaster";
import type { Promisable } from "~/utils/types";

function splitCommand(command: string): [string, string[]] {
  const [cmd, ...args] = command.split(" ");
  if (!cmd) {
    throw new Error(`Invalid command: ${command}`);
  }

  return [cmd, args];
}

export interface IProcessService {
  startProcess(): Promisable<void>;
  stopProcess(): Promisable<void>;
  reloadProcess(): Promisable<void>;
  lint(): Promisable<string>;
  format(): Promisable<string>;
  buildDependencies(): Promisable<string>;
}

export class ProcessService implements IProcessService {
  private template: CommandsTemplate;
  private process: ChildProcessWithoutNullStreams | null = null;
  private broadcaster: Broadcaster | null = null;

  constructor(template: CommandsTemplate, options: { broadcaster?: Broadcaster } = {}) {
    this.template = template;
    this.broadcaster = options.broadcaster ?? null;
  }

  setBroadcaster(broadcaster: Broadcaster) {
    this.broadcaster = broadcaster;
  }

  startProcess() {
    if (this.process) {
      throw new Error("Another process is already running");
    }

    if (!this.template.startCommand) {
      throw new Error("Start command not defined");
    }

    const [command, args] = splitCommand(this.template.startCommand);
    const process = spawn(command, args, { cwd: this.template.workingDirectory });

    process.stdout.on("data", (data: Buffer) => {
      console.log(`stdout: ${data.toString()}`);
      this.broadcaster?.broadcast({ type: "stdout", data: data.toString() });
    });

    process.stderr.on("data", (data: Buffer) => {
      console.error(`stderr: ${data.toString()}`);
      this.broadcaster?.broadcast({ type: "stderr", data: data.toString() });
    });

    process.on("close", (code) => {
      console.log(`process exited with code ${code}`);
      this.process = null;
      this.broadcaster?.broadcast({ type: "close", data: `${code}` });
    });

    process.on("error", (err) => {
      console.error(`Failed to start process: ${err.message}`);
      this.process = null;
      this.broadcaster?.broadcast({ type: "error", data: err.message });
    });

    this.process = process;
  }

  stopProcess() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  reloadProcess() {
    this.sendProcess("R\n");
  }

  private sendProcess(data: string) {
    if (this.process) {
      this.process.stdin.write(data);
    }
  }

  private async runCommand(
    command: string,
    cwd: string,
    includeErrorsInOutput = false,
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const [cmd, args] = splitCommand(command);
      const process = spawn(cmd, args, { cwd });
      let result = "";

      process.stdout.on("data", (data: Buffer) => {
        result += data.toString();
      });

      process.stderr.on("data", (data: Buffer) => {
        const errorOutput = data.toString();
        console.error(`stderr: ${errorOutput}`);
        if (includeErrorsInOutput) {
          result += errorOutput;
        } else {
          reject(errorOutput);
        }
      });

      process.on("close", (code: number) => {
        if (code === 0 || includeErrorsInOutput) {
          resolve(result);
        } else {
          reject(`Process exited with code ${code}`);
        }
      });

      process.on("error", (err: Error) => {
        console.error(`Failed to execute command: ${err.message}`);
        reject(err.message);
      });
    });
  }

  async lint(): Promise<string> {
    if (!this.template.lintCommand) {
      throw new Error("Lint command not defined");
    }

    try {
      const result = await this.runCommand(
        this.template.lintCommand,
        this.template.workingDirectory,
        true,
      );

      this.broadcaster?.broadcast({ type: "lint", data: result });
      return result;
    } catch (error) {
      const errorMessage = unwrapErrorMessage(error);
      this.broadcaster?.broadcast({ type: "lint_error", data: errorMessage });
      throw error;
    }
  }

  async format(): Promise<string> {
    if (!this.template.formatCommand) {
      throw new Error("Format command not defined");
    }

    try {
      const result = await this.runCommand(
        this.template.formatCommand,
        this.template.workingDirectory,
      );

      this.broadcaster?.broadcast({ type: "format", data: result });
      return result;
    } catch (error) {
      const errorMessage = unwrapErrorMessage(error);
      this.broadcaster?.broadcast({ type: "format_error", data: errorMessage });
      throw error;
    }
  }

  async buildDependencies(): Promise<string> {
    if (!this.template.buildDependenciesCommand) {
      throw new Error("Build dependencies command not defined");
    }

    try {
      const result = await this.runCommand(
        this.template.buildDependenciesCommand,
        this.template.workingDirectory,
      );

      this.broadcaster?.broadcast({ type: "build_dependencies", data: result });
      return result;
    } catch (error) {
      const errorMessage = unwrapErrorMessage(error);
      this.broadcaster?.broadcast({ type: "build_dependencies_error", data: errorMessage });
      throw error;
    }
  }
}
