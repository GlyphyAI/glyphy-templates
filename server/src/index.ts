import { App } from "./app";
import { config } from "./config";
import { AppRoutes } from "./routes";

const app = new App();
const appRoutes = new AppRoutes(app, config);

appRoutes.configureRoutes();

app.start(config.port);
