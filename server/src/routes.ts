import DirectoryRouter from "./routers/directoryRouter";
import FileRouter from "./routers/fileRouter";
import GitRouter from "./routers/gitRouter";
import ProcessRouter from "./routers/processRouter";
import TerminalRouter from "./routers/terminalRouter";

import { DirectoryService } from "./services/directoryService";
import { FileService } from "./services/fileService";
import { GitService } from "./services/gitService";
import { ProcessService } from "./services/processService";
import { TerminalService } from "./services/terminalService";
import { loadTemplate } from "./utils/loadTemplate";

import { EventEmitter } from "stream";
import type { App, IAppRegistry } from "./app";
import type { Config } from "./config";

export class AppRoutes {
  constructor(
    private appRegistry: IAppRegistry<App>,
    public config: Config,
  ) {}

  public configureRoutes() {
    this.appRegistry.registerRouter("/api/process", (app) => {
      const template = loadTemplate(this.config);
      const processService = new ProcessService(template.commands, app.broadcaster);
      const processRouter = new ProcessRouter(processService);
      return processRouter.router;
    });

    this.appRegistry.registerRouter("/api/file", () => {
      const fileService = new FileService();
      const fileRouter = new FileRouter(fileService);
      return fileRouter.router;
    });

    this.appRegistry.registerRouter("/api/directory", () => {
      const directoryService = new DirectoryService();
      const directoryRouter = new DirectoryRouter(directoryService);
      return directoryRouter.router;
    });

    this.appRegistry.registerRouter("/api/git", () => {
      const gitService = new GitService(this.config.repoPath);
      const gitRouter = new GitRouter(gitService);
      return gitRouter.router;
    });

    this.appRegistry.registerRouter("/api/terminal", (app) => {
      const eventEmitter = new EventEmitter();
      const terminalService = new TerminalService(eventEmitter);
      const terminalRouter = new TerminalRouter(terminalService, app.broadcaster);
      return terminalRouter.router;
    });
  }
}
