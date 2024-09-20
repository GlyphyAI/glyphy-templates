import express from "express";

import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { useMiddleware } from "~/middleware";
import { Broadcaster, type IBroadcaster } from "~/utils/broadcaster";

import type { Application, Router } from "express";
import type { Promisable } from "~/utils/types";

export interface IAppRegistry<T> {
  registerRouter(path: string, builder: (app: T) => Promisable<Router>): Promisable<void>;
}

export class App implements IAppRegistry<App> {
  private app: Application;
  private server: Server;
  private wss: WebSocketServer;
  public broadcaster: IBroadcaster;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.broadcaster = new Broadcaster(this.wss);
  }

  private setupMiddleware() {
    useMiddleware(this.app);
  }

  private setupWebSocket() {
    this.wss.on("connection", (ws) => {
      ws.on("message", (message: string) => {
        console.log(`Received message: ${message}`);
      });

      ws.send("Welcome to the WebSocket server!");
    });
  }

  public async registerRouter(path: string, builder: (app: App) => Router | Promise<Router>) {
    const router = await builder(this);
    this.app.use(path, router);
  }

  public start(port: number) {
    this.setupMiddleware();
    this.setupWebSocket();
    this.server.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  }
}
