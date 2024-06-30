import DirectoryRouter from "./routers/directoryRouter";
import FileRouter from "./routers/fileRouter";
import GitRouter from "./routers/gitRouter";
import ProcessRouter from "./routers/processRouter";
import TerminalRouter from "./routers/terminalRouter";

import { EventEmitter } from "node:events";
import { DirectoryService } from "./services/directoryService";
import { FileService } from "./services/fileService";
import { createGitService } from "./services/gitServiceFactory";
import { ProcessService } from "./services/processService";
import { TerminalService } from "./services/terminalService";
import { loadTemplate } from "./utils/loadTemplate";

import type { App, IAppRegistry } from "./app";
import type { Config } from "./config";

export class AppRoutes {
  constructor(
    private appRegistry: IAppRegistry<App>,
    public config: Config,
  ) {}

  public async configureRoutes() {
    await this.appRegistry.registerRouter("/api/process", (app) => {
      const template = loadTemplate(this.config);
      const processService = new ProcessService(template.commands, app.broadcaster);
      const processRouter = new ProcessRouter(processService);
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
      const gitService = await createGitService(this.config.repoPath);
      const gitRouter = new GitRouter(gitService);
      return gitRouter.router;
    });

    await this.appRegistry.registerRouter("/api/terminals", (app) => {
      const eventEmitter = new EventEmitter();
      const terminalService = new TerminalService(eventEmitter);
      const terminalRouter = new TerminalRouter(terminalService, app.broadcaster);
      return terminalRouter.router;
    });
  }
}
