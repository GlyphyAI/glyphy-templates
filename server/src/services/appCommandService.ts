import { z } from "zod";

import { ProcessController } from "~/utils/process";
import { BufferedStream, type IBufferedStream } from "~/utils/stream";

import type { CommandsTemplate } from "~/models/template";
import type { IBroadcaster } from "~/utils/broadcaster";
import type { IProcessController, Process, ProcessOutput } from "~/utils/process";

const flutterEventSchema = z.object({
  event: z.string(),
  params: z.record(z.unknown()),
});

const flutterEventArraySchema = z.array(flutterEventSchema);

type FlutterEventArray = z.infer<typeof flutterEventArraySchema>;

interface ExecuteCommandOptions {
  captureErrors?: boolean;
}

interface AppCommandServiceOptions {
  commandsTemplate: CommandsTemplate;
  broadcaster: IBroadcaster;
  workingDirectory: string;
  processController: IProcessController;
  stderrBufferedStream: IBufferedStream<string>;
}

export interface IAppCommandService {
  init(): Promise<void>;
  startApp(): Promise<ProcessOutput>;
  stopApp(): Promise<ProcessOutput>;
  reloadApp(): Promise<void>;
  lint(options?: ExecuteCommandOptions): Promise<string>;
  format(options?: ExecuteCommandOptions): Promise<string>;
  install(options?: ExecuteCommandOptions): Promise<string>;
}

export class AppCommandService implements IAppCommandService {
  private appProcess: Process | null = null;
  private appId: string | null = null;
  private requestId = 1;

  private readonly commandsTemplate: CommandsTemplate;
  private readonly broadcaster: IBroadcaster;
  private readonly workingDirectory: string;
  private readonly processController: IProcessController;
  private readonly stderrBufferedStream: IBufferedStream<string>;

  constructor({
    commandsTemplate,
    broadcaster,
    workingDirectory,
    processController = new ProcessController(),
    stderrBufferedStream = new BufferedStream(3000),
  }: AppCommandServiceOptions) {
    this.commandsTemplate = commandsTemplate;
    this.broadcaster = broadcaster;
    this.workingDirectory = workingDirectory;
    this.processController = processController;
    this.stderrBufferedStream = stderrBufferedStream;
    this.stderrBufferedStream.flushCallback = this.flushErrors.bind(this);
  }

  async init(): Promise<void> {
    await this.install();
    await this.startApp();
  }

  async startApp(): Promise<ProcessOutput> {
    if (this.appProcess) {
      throw new Error("Another app is already running");
    }

    if (!this.commandsTemplate.start) {
      throw new Error("No start command provided");
    }

    const stdoutHandler = (data: Buffer) => {
      console.log("stdout:", data.toString());
      const message = data.toString().trimEnd();
      const flutterEvents = this.parseFlutterEvents(message);
      if (!flutterEvents) {
        this.broadcaster.broadcast({
          event: "app:info",
          params: { message },
        });

        return;
      }

      for (const event of flutterEvents) {
        if (event.params && typeof event.params === "object" && "appId" in event.params) {
          this.appId = event.params.appId as string;
        }

        this.broadcaster.broadcast({
          event: "app:info",
          params: {
            event: event.event,
            ...event.params,
          },
        });
      }
    };

    const stderrHandler = (data: Buffer) => {
      console.log("stderr:", data.toString());
      this.stderrBufferedStream.add(data.toString());
    };

    const exitHandler = (code: number) => {
      console.log(`Process exited with code ${code}`);
      if (code !== 0) {
        this.broadcaster.broadcast({
          event: "app:exit",
          params: { code, error: this.appProcess?.output.stderr },
        });
      } else {
        this.broadcaster.broadcast({
          event: "app:exit",
          params: { code, error: null },
        });
      }

      this.appProcess = null;
      this.appId = null;
    };

    this.appProcess = await this.processController.start({
      cmd: this.commandsTemplate.start,
      cwd: this.workingDirectory,
      onStdout: stdoutHandler,
      onStderr: stderrHandler,
      onExit: exitHandler,
    });

    return this.appProcess.output;
  }

  async stopApp(): Promise<ProcessOutput> {
    if (!this.appProcess) {
      throw new Error("No app is running");
    }

    await this.appProcess.kill();

    const output = this.appProcess.output;
    this.appProcess = null;

    return output;
  }

  async reloadApp(): Promise<void> {
    if (!this.appProcess) {
      await this.startApp();
      return;
    }

    const requestId = this.requestId++;
    const grpcPayload = {
      id: requestId,
      method: "app.restart",
      params: {
        appId: this.appId,
        fullRestart: true,
        pause: false,
        reason: "manual",
      },
    };

    try {
      const message = JSON.stringify([grpcPayload]);
      await this.appProcess.writeInput(message + "\n");
    } catch (error) {
      throw error;
    }
  }

  async lint(options?: ExecuteCommandOptions): Promise<string> {
    if (!this.commandsTemplate.lint) {
      throw new Error("No lint command provided");
    }

    return this.executeCommand(this.commandsTemplate.lint, options);
  }

  async format(options?: ExecuteCommandOptions): Promise<string> {
    if (!this.commandsTemplate.format) {
      throw new Error("No format command provided");
    }

    return this.executeCommand(this.commandsTemplate.format, options);
  }

  async install(options?: ExecuteCommandOptions): Promise<string> {
    if (!this.commandsTemplate.install) {
      throw new Error("No install command provided");
    }

    return this.executeCommand(this.commandsTemplate.install, options);
  }

  private flushErrors(messages: string[]): void {
    this.broadcaster.broadcast({
      event: "app:error",
      params: {
        error: messages.join(""),
      },
    });
  }

  private parseFlutterEvents(stdoutData: string): FlutterEventArray | null {
    try {
      return flutterEventArraySchema.parse(JSON.parse(stdoutData));
    } catch (error) {
      return null;
    }
  }

  private async executeCommand(command: string, options?: ExecuteCommandOptions): Promise<string> {
    const result = await this.processController.startAndWait({
      cmd: command,
      cwd: this.workingDirectory,
    });

    console.log(JSON.stringify(result));

    if (result.exitCode !== 0) {
      if (options?.captureErrors) {
        return result.stdout + result.stderr;
      }

      throw new Error(`Command failed with exit code ${result.exitCode}`);
    }

    return result.stdout;
  }
}
