/* eslint-disable @typescript-eslint/unbound-method */

import express from "express";
import request from "supertest";
import AppRouter from "~/routers/appRouter";

import { z } from "zod";
import { AppError } from "~/errors/appError";
import { useMiddleware } from "~/middleware";

import type { IAppService } from "~/services/appService";
import type { ProcessOutput } from "~/utils/process";

const mockAppService = {
  status: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  reload: jest.fn(),
} as unknown as jest.Mocked<IAppService>;

const responseSchema = z.object({
  message: z.string(),
  output: z
    .object({
      stdout: z.string().array(),
      stderr: z.string().array(),
      exitCode: z.number().optional(),
      finished: z.boolean(),
    })
    .optional(),
});

describe("AppRouter", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    const appRouter = new AppRouter(mockAppService);
    app.use("/api/app", appRouter.router);
    useMiddleware(app);
  });

  test("GET /status should return app status", async () => {
    mockAppService.status.mockResolvedValue("running");

    const response = await request(app).get("/api/app/status");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "running" });
  });

  test("POST /start should start the app", async () => {
    mockAppService.start.mockResolvedValue({
      stdout: ["Started"],
      stderr: [],
      exitCode: undefined,
      finished: false,
    } as unknown as ProcessOutput);

    const response = await request(app).post("/api/app/start").query({ wait: "true" });

    expect(response.status).toBe(200);
    const parsedResponse = responseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("App started and ready");
    expect(parsedResponse.output?.stdout).toEqual(["Started"]);
    expect(mockAppService.start).toHaveBeenCalledWith({ wait: true });
  });

  test("POST /stop should stop the app", async () => {
    mockAppService.stop.mockResolvedValue({
      stdout: ["Stopped"],
      stderr: [],
      exitCode: 0,
      finished: true,
    } as unknown as ProcessOutput);

    const response = await request(app).post("/api/app/stop").query({ wait: "true" });

    expect(response.status).toBe(200);
    const parsedResponse = responseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("App stopped");
    expect(parsedResponse.output?.stdout).toEqual(["Stopped"]);
    expect(mockAppService.stop).toHaveBeenCalledWith({ wait: true });
  });

  test("POST /reload should reload the app", async () => {
    mockAppService.reload.mockResolvedValue({
      stdout: ["Reloaded"],
      stderr: [],
      exitCode: undefined,
      finished: false,
    } as unknown as ProcessOutput);

    const response = await request(app).post("/api/app/reload").query({ wait: "true" });

    expect(response.status).toBe(200);
    const parsedResponse = responseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("App reloaded and ready");
    expect(parsedResponse.output?.stdout).toEqual(["Reloaded"]);
    expect(mockAppService.reload).toHaveBeenCalledWith({ wait: true });
  });

  test("should handle AppError", async () => {
    mockAppService.start.mockRejectedValue(
      new AppError(400, "APP_ALREADY_RUNNING", "Another app is already running", {}),
    );

    const response = await request(app).post("/api/app/start").query({ wait: "true" });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        domain: "APP_ERROR",
        code: "APP_ALREADY_RUNNING",
        message: "Another app is already running",
        details: {},
      },
    });
  });

  test("should handle unexpected errors", async () => {
    mockAppService.start.mockRejectedValue(new Error("Unexpected error"));

    const response = await request(app).post("/api/app/start").query({ wait: "true" });

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
