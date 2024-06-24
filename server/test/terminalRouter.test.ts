/* eslint-disable @typescript-eslint/unbound-method */

import express from "express";
import request from "supertest";
import TerminalRouter from "~/routers/terminalRouter";

import { z } from "zod";

import type { ITerminalService } from "~/services/terminalService";
import type { Broadcaster } from "~/utils/broadcaster";

const mockTerminalService: jest.Mocked<ITerminalService> = {
  listTerminals: jest.fn().mockReturnValue(["1", "2"]),
  getTerminal: jest.fn().mockReturnValue({ id: "1", shell: "bash" }),
  createTerminal: jest.fn().mockReturnValue(undefined),
  deleteTerminal: jest.fn().mockReturnValue(undefined),
  sendCommand: jest.fn().mockReturnValue(undefined),
  onTerminalOutput: jest.fn(),
  onTerminalClose: jest.fn(),
};

const mockBroadcaster = {
  broadcast: jest.fn(),
} as unknown as jest.Mocked<Broadcaster>;

const listResponseSchema = z.object({
  terminals: z.array(z.string()),
});

const getResponseSchema = z.object({
  terminal: z.object({
    id: z.string(),
    shell: z.string(),
  }),
});

const messageResponseSchema = z.object({
  message: z.string(),
});

describe("TerminalRouter", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    const terminalRouter = new TerminalRouter(mockTerminalService, mockBroadcaster);
    app.use("/api/terminal", terminalRouter.router);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("GET /list should list terminals", async () => {
    const response = await request(app).get("/api/terminal/list");
    expect(response.status).toBe(200);

    const parsedResponse = listResponseSchema.parse(response.body);
    expect(parsedResponse.terminals).toEqual(["1", "2"]);
    expect(mockTerminalService.listTerminals).toHaveBeenCalled();
  });

  test("GET /get should return terminal details", async () => {
    const response = await request(app).get("/api/terminal/get").query({ id: "1" });
    expect(response.status).toBe(200);

    const parsedResponse = getResponseSchema.parse(response.body);
    expect(parsedResponse.terminal).toEqual({ id: "1", shell: "bash" });
    expect(mockTerminalService.getTerminal).toHaveBeenCalledWith("1");
  });

  test("POST /create should create a terminal", async () => {
    const response = await request(app)
      .post("/api/terminal/create")
      .send({ id: "1", shell: "bash" });
    expect(response.status).toBe(200);

    const parsedResponse = messageResponseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("Terminal 1 created successfully");
    expect(mockTerminalService.createTerminal).toHaveBeenCalledWith("1", "bash");
    expect(mockTerminalService.onTerminalOutput).toHaveBeenCalledWith("1", expect.any(Function));
    expect(mockTerminalService.onTerminalClose).toHaveBeenCalledWith("1", expect.any(Function));
  });

  test("DELETE /delete should delete a terminal", async () => {
    const response = await request(app).delete("/api/terminal/delete").send({ id: "1" });
    expect(response.status).toBe(200);

    const parsedResponse = messageResponseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("Terminal 1 deleted successfully");
    expect(mockTerminalService.deleteTerminal).toHaveBeenCalledWith("1");
  });

  test("POST /send should send a command to the terminal", async () => {
    const response = await request(app)
      .post("/api/terminal/send")
      .send({ id: "1", command: "echo Hello" });
    expect(response.status).toBe(200);

    const parsedResponse = messageResponseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("Command sent to terminal 1");
    expect(mockTerminalService.sendCommand).toHaveBeenCalledWith("1", "echo Hello");
  });
});
