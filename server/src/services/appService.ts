import { parseFlutterEvents } from "~/utils/parser";
import { ProcessController } from "~/utils/process";
import { BufferedStream, type IBufferedStream } from "~/utils/stream";

import type { IBroadcaster } from "~/utils/broadcaster";
import type { IProcessController, Process, ProcessOutput } from "~/utils/process";

interface AppServiceOptions {
  runCommand: string | undefined;
  broadcaster: IBroadcaster;
  workingDirectory: string;
  processController: IProcessController;
  stderrBufferedStream: IBufferedStream<string>;
}

interface WaitOptions {
  wait?: boolean;
  timeout?: number;
}

export interface IAppService {
  init(): Promise<void>;
  start(options?: WaitOptions): Promise<ProcessOutput>;
  reload(options?: WaitOptions): Promise<ProcessOutput>;
  stop(options?: WaitOptions): Promise<ProcessOutput>;
}

export class AppService implements IAppService {
  private appProcess: Process | null = null;
  private appId: string | null = null;
  private requestId = 1;

  private readonly runCommand: string | undefined;
  private readonly broadcaster: IBroadcaster;
  private readonly workingDirectory: string;
  private readonly processController: IProcessController;
  private readonly stderrBufferedStream: IBufferedStream<string>;

  constructor({
    runCommand,
    broadcaster,
    workingDirectory,
    processController = new ProcessController(),
    stderrBufferedStream = new BufferedStream(3000),
  }: AppServiceOptions) {
    this.runCommand = runCommand;
    this.broadcaster = broadcaster;
    this.workingDirectory = workingDirectory;
    this.processController = processController;
    this.stderrBufferedStream = stderrBufferedStream;
    this.stderrBufferedStream.flushCallback = this.flushErrors.bind(this);
  }

  async init(): Promise<void> {
    if (!this.appProcess) {
      await this.start();
    }
  }

  async start(options?: WaitOptions): Promise<ProcessOutput> {
    if (this.appProcess) {
      throw new Error("Another app is already running");
    }

    if (!this.runCommand) {
      throw new Error("No run command provided");
    }

    const stdoutHandler = (data: Buffer) => {
      console.log("stdout:", data.toString());
      const message = data.toString();
      const flutterEvents = parseFlutterEvents(message);
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
      cmd: this.runCommand,
      cwd: this.workingDirectory,
      onStdout: stdoutHandler,
      onStderr: stderrHandler,
      onExit: exitHandler,
    });

    if (options?.wait) {
      try {
        await this.appProcess.waitForEvent({
          timeout: options?.timeout,
          condition: (payload: string) => {
            const flutterEvents = parseFlutterEvents(payload);
            if (!flutterEvents) {
              return false;
            }

            return flutterEvents.some((event) => event.event === "app.started");
          },
        });
      } catch (error) {
        await this.stop();
        throw error;
      }
    }

    return this.appProcess.output;
  }

  async reload(options?: WaitOptions): Promise<ProcessOutput> {
    if (!this.appProcess) {
      return await this.start();
    }

    const output = this.appProcess.output;
    const requestId = this.requestId++;
    const message = JSON.stringify([
      {
        id: requestId,
        method: "app.restart",
        params: {
          appId: this.appId,
          fullRestart: true,
          pause: false,
          reason: "manual",
        },
      },
    ]);

    this.appProcess.writeInput(message + "\n");

    if (options?.wait) {
      try {
        await this.appProcess.waitForEvent({
          timeout: options?.timeout,
          condition: (payload: string) => {
            const flutterEvents = parseFlutterEvents(payload);
            if (!flutterEvents) {
              return false;
            }

            return flutterEvents.some(
              (event) => event.event === "app.progress" && event.params.finished === true,
            );
          },
        });
      } catch (error) {
        await this.stop();
        throw error;
      }
    }

    return output;
  }

  async stop(options?: WaitOptions): Promise<ProcessOutput> {
    if (!this.appProcess) {
      throw new Error("No app is running");
    }

    const output = this.appProcess.output;
    const requestId = this.requestId++;
    const message = JSON.stringify([
      {
        id: requestId,
        method: "app.stop",
        params: { appId: this.appId },
      },
    ]);

    this.appProcess.writeInput(message + "\n");

    if (options?.wait) {
      try {
        await this.appProcess.wait(options?.timeout);
      } catch (error) {
        this.appProcess.kill();
        throw error;
      }
    } else {
      this.appProcess.kill();
    }

    this.appProcess = null;
    this.appId = null;

    return output;
  }

  private flushErrors(messages: string[]): void {
    this.broadcaster.broadcast({
      event: "app:error",
      params: {
        error: messages.join(""),
      },
    });
  }
}
