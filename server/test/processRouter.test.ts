/* eslint-disable @typescript-eslint/unbound-method */

import express from "express";
import request from "supertest";
import ProcessRouter from "~/routers/processRouter";

import { z } from "zod";

import type { IProcessService } from "~/services/processService";

const mockProcessService: jest.Mocked<IProcessService> = {
  startProcess: jest.fn().mockResolvedValue(undefined),
  stopProcess: jest.fn().mockResolvedValue(undefined),
  reloadProcess: jest.fn().mockResolvedValue(undefined),
  lint: jest.fn().mockResolvedValue('{"version":1,"diagnostics":[]}'),
  format: jest.fn().mockResolvedValue("Formatted 2 files (0 changed) in 0.08 seconds."),
  install: jest.fn().mockResolvedValue("Got dependencies!"),
};

const messageResponseSchema = z.object({
  message: z.string(),
});

const resultResponseSchema = z.object({
  result: z.string(),
});

describe("ProcessRouter", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    const processRouter = new ProcessRouter(mockProcessService);
    app.use("/api/process", processRouter.router);
  });

  test("POST /start should start the process", async () => {
    const response = await request(app).post("/api/process/start");
    expect(response.status).toBe(200);

    const { message } = messageResponseSchema.parse(response.body);
    expect(message).toBe("Process started");
    expect(mockProcessService.startProcess).toHaveBeenCalled();
  });

  test("POST /stop should stop the process", async () => {
    const response = await request(app).post("/api/process/stop");
    expect(response.status).toBe(200);

    const { message } = messageResponseSchema.parse(response.body);
    expect(message).toBe("Process stopped");
    expect(mockProcessService.stopProcess).toHaveBeenCalled();
  });

  test("POST /reload should reload the process", async () => {
    const response = await request(app).post("/api/process/reload");
    expect(response.status).toBe(200);

    const { message } = messageResponseSchema.parse(response.body);
    expect(message).toBe("Process reloaded");
    expect(mockProcessService.reloadProcess).toHaveBeenCalled();
  });

  test("POST /lint should lint the process", async () => {
    const response = await request(app).post("/api/process/lint");
    expect(response.status).toBe(200);

    const { result } = resultResponseSchema.parse(response.body);
    expect(result).toBe('{"version":1,"diagnostics":[]}');
    expect(mockProcessService.lint).toHaveBeenCalled();
  });

  test("POST /format should format the process", async () => {
    const response = await request(app).post("/api/process/format");
    expect(response.status).toBe(200);

    const { result } = resultResponseSchema.parse(response.body);
    expect(result).toBe("Formatted 2 files (0 changed) in 0.08 seconds.");
    expect(mockProcessService.format).toHaveBeenCalled();
  });

  test("POST /install should install dependencies", async () => {
    const response = await request(app).post("/api/process/install");
    expect(response.status).toBe(200);

    const { result } = resultResponseSchema.parse(response.body);
    expect(result).toBe("Got dependencies!");
    expect(mockProcessService.install).toHaveBeenCalled();
  });
});
