import { WebSocket, type WebSocketServer } from "ws";

type BroadcastData = {
  type: string;
  data: string;
};

export interface IBroadcaster {
  broadcast(data: BroadcastData): void;
}

export class Broadcaster implements IBroadcaster {
  private wss: WebSocketServer | null = null;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
  }

  broadcast(data: BroadcastData) {
    this.wss?.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        console.log(`Broadcasting message: ${JSON.stringify(data)}`);
        client.send(JSON.stringify(data));
      }
    });
  }
}
