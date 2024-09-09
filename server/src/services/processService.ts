import { spawn, type ChildProcess } from "child_process";
import { z } from "zod";
import type { CommandsTemplate } from "~/models/template";
import type { IBroadcaster } from "~/utils/broadcaster";

const flutterEventSchema = z.object({
  event: z.string(),
  params: z.record(z.unknown()),
});

const flutterEventArraySchema = z.array(flutterEventSchema);

function extractAppId(stdoutData: string): string | null {
  try {
    const flutterEventArray = flutterEventArraySchema.parse(JSON.parse(stdoutData));
    for (const event of flutterEventArray) {
      if (event.params && typeof event.params === "object" && "appId" in event.params) {
        return event.params.appId as string;
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

interface ExecuteCommandOptions {
  captureErrors?: boolean;
}

interface ProcessServiceOptions {
  commandsTemplate: CommandsTemplate;
  broadcaster: IBroadcaster;
  workingDirectory: string;
}

export interface IProcessService {
  startProcess(): Promise<void>;
  stopProcess(): Promise<void>;
  reloadProcess(): Promise<void>;
  lint(options?: ExecuteCommandOptions): Promise<string>;
  format(options?: ExecuteCommandOptions): Promise<string>;
  install(options?: ExecuteCommandOptions): Promise<string>;
}

export class ProcessService implements IProcessService {
  private process: ChildProcess | null = null;
  private appId: string | null = null;
  private requestId = 1;

  private errorTimer: NodeJS.Timeout | null = null;
  private errorStream: string[] = [];
  private readonly cooldownPeriod = 3000;

  private readonly commandsTemplate: CommandsTemplate;
  private readonly broadcaster: IBroadcaster;
  private readonly workingDirectory: string;

  constructor({ commandsTemplate, broadcaster, workingDirectory }: ProcessServiceOptions) {
    this.commandsTemplate = commandsTemplate;
    this.broadcaster = broadcaster;
    this.workingDirectory = workingDirectory;
  }

  async init(startProcessOnBoot = true): Promise<void> {
    if (startProcessOnBoot) {
      await this.install();
      await this.startProcess();
    }
  }

  async startProcess(): Promise<void> {
    if (this.process) {
      throw new Error("Another process is already running");
    }

    if (!this.commandsTemplate.start) {
      throw new Error("Start command not defined");
    }

    const [command, ...args] = this.splitCommand(this.commandsTemplate.start);
    this.process = spawn(command, args, {
      cwd: this.workingDirectory,
      shell: true,
    });

    this.setupProcessListeners(this.process);
  }

  async stopProcess(): Promise<void> {
    if (!this.process) {
      throw new Error("No process is running");
    }

    this.process.kill();
    this.process = null;
  }

  async reloadProcess(): Promise<void> {
    const requestId = this.requestId++;
    const payload = {
      id: requestId,
      method: "app.restart",
      params: {
        appId: this.appId,
        fullRestart: true,
        pause: false,
        reason: "manual",
      },
    };

    if (this.process) {
      const message = JSON.stringify([payload]);
      this.process.stdin?.write(message + "\n");
    } else {
      await this.startProcess();
    }
  }

  async lint({ captureErrors = true }: ExecuteCommandOptions = {}): Promise<string> {
    return this.executeTemplateCommand("lint", { captureErrors });
  }

  async format({ captureErrors = false }: ExecuteCommandOptions = {}): Promise<string> {
    return this.executeTemplateCommand("format", { captureErrors });
  }

  async install({ captureErrors = false }: ExecuteCommandOptions = {}): Promise<string> {
    return this.executeTemplateCommand("install", { captureErrors });
  }

  private splitCommand(command: string): [string, ...string[]] {
    const [cmd, ...args] = command.split(" ");
    if (!cmd) {
      throw new Error(`Invalid command: ${command}`);
    }

    return [cmd, ...args];
  }

  private async executeTemplateCommand(
    commandKey: keyof CommandsTemplate,
    { captureErrors }: ExecuteCommandOptions,
  ): Promise<string> {
    const command = this.commandsTemplate[commandKey];
    if (!command) {
      throw new Error(`${commandKey} not defined`);
    }

    return await this.executeCommand(command, { captureErrors });
  }

  private async executeCommand(
    command: string,
    { captureErrors = false }: ExecuteCommandOptions,
  ): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const [cmd, ...args] = this.splitCommand(command);
      const process = spawn(cmd, args, { cwd: this.workingDirectory });
      let result = "";

      process.stdout.on("data", (data: Buffer) => {
        result += data.toString();
      });

      process.stderr.on("data", (data: Buffer) => {
        const errorOutput = data.toString();
        if (captureErrors) {
          result += errorOutput;
        } else {
          reject(errorOutput);
        }
      });

      process.on("close", (code: number) => {
        if (code === 0 || captureErrors) {
          resolve(result);
        } else {
          reject(`Process exited with code ${code}`);
        }
      });

      process.on("error", (err: Error) => {
        reject(err.message);
      });
    });
  }

  private setupProcessListeners(process: ChildProcess): void {
    process.stdout?.on("data", (data: Buffer) => {
      const message = data.toString().trimEnd();

      try {
        const events = flutterEventArraySchema.parse(JSON.parse(message));
        for (const event of events) {
          this.broadcaster.broadcast({
            event: "app:info",
            params: {
              event: event.event,
              ...event.params,
            },
          });
        }
      } catch (error) {
        this.broadcaster.broadcast({
          event: "app:info", //
          params: { message },
        });
      }

      console.log("stdout:", message);
      const appId = extractAppId(message);
      if (appId) {
        this.appId = appId;
      }
    });

    process.stderr?.on("data", (data: Buffer) => {
      const errorMessage = data.toString().trimEnd();
      this.errorStream.push(errorMessage);

      if (this.errorTimer) {
        clearTimeout(this.errorTimer);
      }

      this.errorTimer = setTimeout(() => {
        if (this.errorStream.length > 0) {
          console.log("stderr:\n", this.errorStream);
          this.broadcaster.broadcast({
            event: "app:error",
            params: { errors: this.errorStream.join("\n") },
          });

          this.errorStream = [];
        }
      }, this.cooldownPeriod);
    });

    process.on("close", (code) => {
      this.process = null;
      this.appId = null;
      console.log(`Process exited with code ${code}`);

      if (code !== 0) {
        this.broadcaster.broadcast({
          event: "app:exit",
          params: { code, error: this.errorStream.join("\n") },
        });

        this.errorStream = [];
      } else {
        this.broadcaster.broadcast({
          event: "app:exit",
          params: { code, error: null },
        });
      }
    });

    process.on("error", (err) => {
      console.log("error:", JSON.stringify(err, null, 2));
      this.broadcaster.broadcast({
        event: "app:error",
        params: { message: err.message },
      });
    });
  }
}
