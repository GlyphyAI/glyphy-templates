import EventEmitter from "events";

import { AppService, type IAppService } from "~/services/appService";
import { CommandService, type ICommandService } from "~/services/commandService";
import { DirectoryService, type IDirectoryService } from "~/services/directoryService";
import { FileService, type IFileService } from "~/services/fileService";
import { createGitService } from "~/services/gitServiceFactory";
import { type ITerminalService, TerminalService } from "~/services/terminalService";
import { ProcessController } from "~/utils/process";
import { BufferedStream } from "~/utils/stream";

import type { Config } from "~/config";
import type { IGitService } from "~/services/gitService";
import type { IBroadcaster } from "~/utils/broadcaster";

export class ServiceContainer {
  private services = new Map<string, { instance: unknown; ready: Promise<void> }>();

  constructor(private config: Config) {}

  public async getAppService(options: {
    runCommand: string | undefined;
    broadcaster: IBroadcaster;
  }): Promise<IAppService> {
    return this.getOrCreateService("app", () => {
      const processController = new ProcessController();
      const stderrBufferedStream = new BufferedStream(3000);
      return new AppService({
        runCommand: options.runCommand,
        workingDirectory: this.config.workingDirectory,
        processController: processController,
        broadcaster: options.broadcaster,
        stderrBufferedStream: stderrBufferedStream,
      });
    });
  }

  public async getCommandService(): Promise<ICommandService> {
    return this.getOrCreateService("command", () => {
      const processController = new ProcessController();
      return new CommandService({
        workingDirectory: this.config.workingDirectory,
        processController: processController,
      });
    });
  }

  public async getFileService(): Promise<IFileService> {
    return this.getOrCreateService("file", () => new FileService());
  }

  public async getDirectoryService(): Promise<IDirectoryService> {
    return this.getOrCreateService("directory", () => new DirectoryService());
  }

  public async getGitService(): Promise<IGitService> {
    return this.getOrCreateService("git", () => createGitService(this.config.workingDirectory));
  }

  public async getTerminalService(): Promise<ITerminalService> {
    return this.getOrCreateService("terminal", () => {
      const eventEmitter = new EventEmitter();
      return new TerminalService(eventEmitter);
    });
  }

  private async getOrCreateService<T>(
    key: string,
    creator: () => T | Promise<T>,
    initializer?: (service: T) => Promise<void>,
  ): Promise<T> {
    if (!this.services.has(key)) {
      const instance = await creator();
      const ready = initializer ? initializer(instance) : Promise.resolve();
      this.services.set(key, { instance, ready });
    }

    const { instance, ready } = this.services.get(key)!;
    await ready;
    return instance as T;
  }
}
