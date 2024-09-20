/* eslint-disable @typescript-eslint/unbound-method */

import express from "express";
import request from "supertest";
import CommandRouter from "~/routers/commandRouter";

import { CommandError } from "~/errors/commandError";
import { useMiddleware } from "~/middleware";

import type { ICommandService } from "~/services/commandService";
import type { ProcessOutput } from "~/utils/process";

const mockCommandService: jest.Mocked<ICommandService> = {
  execute: jest.fn(),
};

describe("CommandRouter", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    const commandRouter = new CommandRouter(mockCommandService);
    app.use("/api/execute", commandRouter.router);
    useMiddleware(app);
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

  test("POST / should return 422 for empty command", async () => {
    const response = await request(app).post("/api/execute").send({ command: "" });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      error: {
        domain: "VALIDATION_ERROR",
        code: "INVALID_INPUT",
        message: "Invalid input data",
        details: expect.arrayContaining([
          expect.objectContaining({
            path: "command",
            message: expect.stringContaining("String must contain at least 1 character") as string,
          }) as { path: string; message: string },
        ]) as Array<{ path: string; message: string }>,
      },
    });
  });

  test("POST / should return 422 for missing command", async () => {
    const response = await request(app).post("/api/execute").send({});

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      error: {
        domain: "VALIDATION_ERROR",
        code: "INVALID_INPUT",
        message: "Invalid input data",
        details: expect.arrayContaining([
          expect.objectContaining({
            path: "command",
            message: expect.stringContaining("Required") as string,
          }) as { path: string; message: string },
        ]) as Array<{ path: string; message: string }>,
      },
    });
  });

  test("POST / should handle CommandError from command execution", async () => {
    const commandError = new CommandError(408, "COMMAND_TIMEOUT", "Command execution timed out", {
      errorType: "timeout",
      command: "failing command",
    });
    mockCommandService.execute.mockRejectedValue(commandError);

    const response = await request(app).post("/api/execute").send({ command: "failing command" });

    expect(response.status).toBe(408);
    expect(response.body).toEqual({
      error: {
        domain: "COMMAND_ERROR",
        code: "COMMAND_TIMEOUT",
        message: "Command execution timed out",
        details: {
          errorType: "timeout",
          command: "failing command",
        },
      },
    });
  });

  test("POST / should handle generic errors from command execution", async () => {
    mockCommandService.execute.mockRejectedValue(new Error("Unexpected error"));

    const response = await request(app).post("/api/execute").send({ command: "failing command" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: {
        domain: "INTERNAL_SERVER_ERROR",
        code: "INTERNAL_SERVER_ERROR",
        message: "Unexpected error",
        details: {},
      },
    });
  });
});
