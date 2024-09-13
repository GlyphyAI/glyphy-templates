/* eslint-disable @typescript-eslint/unbound-method */

import express from "express";
import request from "supertest";
import AppRouter from "~/routers/appRouter";

import { z } from "zod";

import type { IAppService } from "~/services/appService";

const mockAppService = {
  start: jest.fn().mockResolvedValue("Started"),
  stop: jest.fn().mockResolvedValue("Stopped"),
  reload: jest.fn().mockResolvedValue("Reloaded"),
} as unknown as jest.Mocked<IAppService>;

const responseSchema = z.object({
  message: z.string(),
  output: z.string(),
});

describe("AppRouter", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    const appRouter = new AppRouter(mockAppService);
    app.use("/api/app", appRouter.router);
  });

  test("POST /start should start the app", async () => {
    const response = await request(app).post("/api/app/start").query({ wait: "true" });

    expect(response.status).toBe(200);
    const parsedResponse = responseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("App started and ready");
    expect(parsedResponse.output).toBe("Started");
    expect(mockAppService.start).toHaveBeenCalledWith({ wait: true, timeout: 30000 });
  });

  test("POST /start without wait should start the app asynchronously", async () => {
    const response = await request(app).post("/api/app/start").query({ wait: "false" });

    expect(response.status).toBe(200);
    const parsedResponse = responseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("App started");
    expect(parsedResponse.output).toBe("Started");
    expect(mockAppService.start).toHaveBeenCalledWith({ wait: false, timeout: 30000 });
  });

  test("POST /stop should stop the app", async () => {
    const response = await request(app).post("/api/app/stop").query({ wait: "true" });

    expect(response.status).toBe(200);
    const parsedResponse = responseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("App stopped");
    expect(parsedResponse.output).toBe("Stopped");
    expect(mockAppService.stop).toHaveBeenCalledWith({ wait: true, timeout: 30000 });
  });

  test("POST /stop without wait should stop the app asynchronously", async () => {
    const response = await request(app).post("/api/app/stop").query({ wait: "false" });

    expect(response.status).toBe(200);
    const parsedResponse = responseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("App stopping");
    expect(parsedResponse.output).toBe("Stopped");
    expect(mockAppService.stop).toHaveBeenCalledWith({ wait: false, timeout: 30000 });
  });

  test("POST /reload should reload the app", async () => {
    const response = await request(app).post("/api/app/reload").query({ wait: "true" });

    expect(response.status).toBe(200);
    const parsedResponse = responseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("App reloaded and ready");
    expect(parsedResponse.output).toBe("Reloaded");
    expect(mockAppService.reload).toHaveBeenCalledWith({ wait: true, timeout: 30000 });
  });

  test("POST /reload without wait should reload the app asynchronously", async () => {
    const response = await request(app).post("/api/app/reload").query({ wait: "false" });

    expect(response.status).toBe(200);
    const parsedResponse = responseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("App reloaded");
    expect(parsedResponse.output).toBe("Reloaded");
    expect(mockAppService.reload).toHaveBeenCalledWith({ wait: false, timeout: 30000 });
  });

  test("should handle errors", async () => {
    mockAppService.start.mockRejectedValueOnce(new Error("Test error"));

    const response = await request(app).post("/api/app/start").query({ wait: "true" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      message: "App failed to start",
      error: "Test error",
    });
  });
});
