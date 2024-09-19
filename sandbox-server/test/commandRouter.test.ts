/* eslint-disable @typescript-eslint/unbound-method */

import express from "express";
import request from "supertest";
import CommandRouter from "~/routers/commandRouter";

import type { ICommandService } from "~/services/commandService";
import type { ProcessOutput } from "~/utils/process";

const mockCommandService: jest.Mocked<ICommandService> = {
  execute: jest.fn(),
};

describe("CommandRouter", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    const commandRouter = new CommandRouter(mockCommandService);
    app.use("/api/execute", commandRouter.router);
  });

  test("POST / should execute a command", async () => {
    mockCommandService.execute.mockResolvedValue({
      output: "Command executed successfully",
    } as unknown as ProcessOutput);

    const response = await request(app).post("/api/execute").send({ command: "test command" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ output: "Command executed successfully" });
    expect(mockCommandService.execute).toHaveBeenCalledWith("test command");
  });

  test("POST / should return 400 for empty command", async () => {
    const response = await request(app).post("/api/execute").send({ command: "" });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  test("POST / should return 400 for missing command", async () => {
    const response = await request(app).post("/api/execute").send({});

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error");
  });

  test("POST / should handle errors from command execution", async () => {
    mockCommandService.execute.mockRejectedValue(new Error("Command execution failed"));

    const response = await request(app).post("/api/execute").send({ command: "failing command" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Command execution failed" });
  });
});
