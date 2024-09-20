import { WebSocket, type WebSocketServer } from "ws";
import { BufferedStream } from "~/utils/stream";

type BroadcastEvent =
  | "app:error" //
  | "app:info"
  | "app:exit"
  | "terminal:stdout"
  | "terminal:exit";

type BroadcastMessage = {
  id?: number;
  event: BroadcastEvent;
  params: Record<string, unknown>;
};

export interface IBroadcaster {
  broadcast(message: BroadcastMessage): void;
  bufferedBroadcast(message: BroadcastMessage): void;
}

export class Broadcaster implements IBroadcaster {
  private wss: WebSocketServer | null = null;
  private bufferedStream: BufferedStream<BroadcastMessage>;

  constructor(wss: WebSocketServer, cooldownPeriod = 500) {
    this.wss = wss;
    this.bufferedStream = new BufferedStream(cooldownPeriod, this.flush.bind(this));
  }

  broadcast(message: BroadcastMessage) {
    this.wss?.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify([message]));
      }
    });
  }

  bufferedBroadcast(message: BroadcastMessage): void {
    this.bufferedStream.add(message);
  }

  private flush(messages: BroadcastMessage[]): void {
    this.wss?.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(messages));
      }
    });
  }
}
