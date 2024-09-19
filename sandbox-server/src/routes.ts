import AppRouter from "./routers/appRouter";
import CommandRouter from "./routers/commandRouter";
import DirectoryRouter from "./routers/directoryRouter";
import FileRouter from "./routers/fileRouter";
import GitRouter from "./routers/gitRouter";
import HealthRouter from "./routers/healthRouter";
import TerminalRouter from "./routers/terminalRouter";

import { ServiceContainer } from "./services/serviceContainer";
import { loadTemplate } from "./utils/loadTemplate";

import type { App, IAppRegistry } from "./app";
import type { Config } from "./config";
import type { ICommandService } from "./services/commandService";

export class AppRoutes {
  constructor(
    private appRegistry: IAppRegistry<App>,
    public config: Config,
  ) {}

  public async configureRoutes() {
    const serviceContainer = new ServiceContainer(this.config);
    const template = loadTemplate(this.config.workingDirectory, this.config.templatePath);

    await this.appRegistry.registerRouter("/api/health", () => {
      const healthRouter = new HealthRouter();
      return healthRouter.router;
    });

    await this.appRegistry.registerRouter("/api/execute", async () => {
      const commandService = await serviceContainer.getCommandService();
      const commandRouter = new CommandRouter(commandService);
      return commandRouter.router;
    });

    await this.appRegistry.registerRouter("/api/app", async (app) => {
      const appService = await serviceContainer.getAppService({
        runCommand: template.previews.web?.command,
        broadcaster: app.broadcaster,
      });

      if (this.config.appStartOnBoot) {
        try {
          const commandService = await serviceContainer.getCommandService();
          await installDependencies(this.config.appRuntime, commandService);
          await appService.init({
            wait: this.config.appStartAwait,
            timeout: this.config.appStartTimeout,
          });
        } catch (error) {
          console.error(error);
        }
      }

      const appRouter = new AppRouter(appService);
      return appRouter.router;
    });

    await this.appRegistry.registerRouter("/api/files", async () => {
      const fileService = await serviceContainer.getFileService();
      const fileRouter = new FileRouter(fileService);
      return fileRouter.router;
    });

    await this.appRegistry.registerRouter("/api/directories", async () => {
      const directoryService = await serviceContainer.getDirectoryService();
      const directoryRouter = new DirectoryRouter(directoryService);
      return directoryRouter.router;
    });

    await this.appRegistry.registerRouter("/api/git", async () => {
      const gitService = await serviceContainer.getGitService();
      const gitRouter = new GitRouter(gitService);
      return gitRouter.router;
    });

    await this.appRegistry.registerRouter("/api/terminals", async (app) => {
      const terminalService = await serviceContainer.getTerminalService();
      const terminalRouter = new TerminalRouter(terminalService, app.broadcaster);
      return terminalRouter.router;
    });
  }
}

function installDependencies(runtime: Config["processRuntime"], commandService: ICommandService) {
  switch (runtime) {
    case "flutter":
      return commandService.execute("flutter pub get");
    case "dart":
      return commandService.execute("dart pub get");
    default:
      throw new Error(`Unsupported runtime.`);
  }
}
