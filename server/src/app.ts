import express from "express";
import appRouter from "./routers/appRouter";
import fileRouter from "./routers/fileRouter";
import gitRouter from "./routers/gitRouter";
import terminalRouter from "./routers/terminalRouter";

import { createServer } from "http";
import { WebSocketServer } from "ws";
import { Broadcaster } from "./utils/broadcaster";
import { unwrapErrorMessage } from "./utils/zodErrors";

import type { NextFunction, Request, Response } from "express";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });
const broadcaster = new Broadcaster(wss);

// Inject broadcaster into the app
app.set("broadcaster", broadcaster);

app.use(express.json());

app.use("/api", appRouter);
app.use("/api", fileRouter);
app.use("/api", gitRouter);
app.use("/api", terminalRouter);

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send(unwrapErrorMessage(err));
});

wss.on("connection", (ws) => {
  ws.on("message", (message: string) => {
    console.log(`Received message: ${message}`);
  });

  ws.send("Welcome to the WebSocket server!");
});

export { app, server };
