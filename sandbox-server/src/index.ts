import { App } from "~/app";
import { config } from "~/config";
import { AppRoutes } from "~/routes";

export async function startServer() {
  const app = new App();
  const appRoutes = new AppRoutes(app, config);

  await appRoutes.configureRoutes();

  app.start(config.port);
}

await startServer();
