import AppRouter from "./routers/appRouter";
import CommandRouter from "./routers/commandRouter";
import DirectoryRouter from "./routers/directoryRouter";
import FileRouter from "./routers/fileRouter";
import GitRouter from "./routers/gitRouter";
import HealthRouter from "./routers/healthRouter";
import ProcessRouter from "./routers/processRouter";
import TerminalRouter from "./routers/terminalRouter";

import { EventEmitter } from "node:events";
import { AppService } from "./services/appService";
import { CommandService } from "./services/commandService";
import { DirectoryService } from "./services/directoryService";
import { FileService } from "./services/fileService";
import { createGitService } from "./services/gitServiceFactory";
import { ProcessService } from "./services/processService";
import { TerminalService } from "./services/terminalService";
import { loadTemplate } from "./utils/loadTemplate";
import { ProcessController } from "./utils/process";
import { BufferedStream } from "./utils/stream";

import type { App, IAppRegistry } from "./app";
import type { Config } from "./config";

export class AppRoutes {
  constructor(
    private appRegistry: IAppRegistry<App>,
    public config: Config,
  ) {}

  public async configureRoutes() {
    const template = loadTemplate(this.config.templatePath);

    await this.appRegistry.registerRouter("/api/health", () => {
      const healthRouter = new HealthRouter();
      return healthRouter.router;
    });

    await this.appRegistry.registerRouter("/api/execute", () => {
      const processController = new ProcessController();
      const commandService = new CommandService({
        workingDirectory: this.config.workingDirectory,
        processController: processController,
      });
      const commandRouter = new CommandRouter(commandService);
      return commandRouter.router;
    });

    await this.appRegistry.registerRouter("/api/app", (app) => {
      const processController = new ProcessController();
      const stderrBufferedStream = new BufferedStream(3000);
      const appService = new AppService({
        runCommand: template.previews.web?.command,
        workingDirectory: this.config.workingDirectory,
        processController: processController,
        broadcaster: app.broadcaster,
        stderrBufferedStream: stderrBufferedStream,
      });
      const appRouter = new AppRouter(appService);
      return appRouter.router;
    });

    await this.appRegistry.registerRouter("/api/process", async (app) => {
      const processService = new ProcessService({
        commandsTemplate: template.commands,
        broadcaster: app.broadcaster,
        workingDirectory: this.config.workingDirectory,
      });
      const processRouter = new ProcessRouter(processService);
      await processService.init(this.config.startProcessOnBoot);
      return processRouter.router;
    });

    await this.appRegistry.registerRouter("/api/files", () => {
      const fileService = new FileService();
      const fileRouter = new FileRouter(fileService);
      return fileRouter.router;
    });

    await this.appRegistry.registerRouter("/api/directories", () => {
      const directoryService = new DirectoryService();
      const directoryRouter = new DirectoryRouter(directoryService);
      return directoryRouter.router;
    });

    await this.appRegistry.registerRouter("/api/git", async () => {
      try {
        const gitService = await createGitService(this.config.repoPath);
        const gitRouter = new GitRouter(gitService);
        return gitRouter.router;
      } catch (error) {
        if (error instanceof Error) {
          console.error("Failed to create git service:", error.message);
        }

        throw error;
      }
    });

    await this.appRegistry.registerRouter("/api/terminals", (app) => {
      const eventEmitter = new EventEmitter();
      const terminalService = new TerminalService(eventEmitter);
      const terminalRouter = new TerminalRouter(terminalService, app.broadcaster);
      return terminalRouter.router;
    });
  }
}
