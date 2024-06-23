import AppRouter from "./routers/appRouter";
import FileRouter from "./routers/fileRouter";
import GitRouter from "./routers/gitRouter";
import TerminalRouter from "./routers/terminalRouter";

import { FileService } from "./services/fileService";
import { GitService } from "./services/gitService";
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

  public configureRoutes() {
    this.appRegistry.registerRouter("/api", (app) => {
      const template = loadTemplate();
      const processService = new ProcessService(template.commands, app.broadcaster);
      const appRouter = new AppRouter(processService);
      return appRouter.router;
    });

    this.appRegistry.registerRouter("/api", () => {
      const fileService = new FileService();
      const fileRouter = new FileRouter(fileService);
      return fileRouter.router;
    });

    this.appRegistry.registerRouter("/api", () => {
      const gitService = new GitService(this.config.repoPath);
      const gitRouter = new GitRouter(gitService);
      return gitRouter.router;
    });

    this.appRegistry.registerRouter("/api", (app) => {
      const terminalService = new TerminalService();
      const terminalRouter = new TerminalRouter(terminalService, app.broadcaster);
      return terminalRouter.router;
    });
  }
}
