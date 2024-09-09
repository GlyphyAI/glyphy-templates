/* eslint-disable @typescript-eslint/unbound-method */

import express from "express";
import request from "supertest";
import DirectoryRouter from "~/routers/directoryRouter";

import { z } from "zod";

import type { IDirectoryService } from "~/services/directoryService";

const mockDirectoryService: jest.Mocked<IDirectoryService> = {
  listDirectories: jest.fn().mockResolvedValue(["/test/dir1", "/test/dir2"]),
  createDirectory: jest.fn().mockResolvedValue(undefined),
  renameDirectory: jest.fn().mockResolvedValue(undefined),
  moveDirectory: jest.fn().mockResolvedValue(undefined),
  deleteDirectory: jest.fn().mockResolvedValue(undefined),
};

const directoriesResponseSchema = z.array(z.string());
const messageResponseSchema = z.object({
  message: z.string(),
});

describe("DirectoryRouter", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    const directoryRouter = new DirectoryRouter(mockDirectoryService);
    app.use("/api/directory", directoryRouter.router);
  });

  test("GET /list should list directories", async () => {
    const response = await request(app)
      .get("/api/directory/list")
      .query({ directory: ".", recursive: true });
    expect(response.status).toBe(200);

    const parsedResponse = directoriesResponseSchema.parse(response.body);
    expect(parsedResponse).toEqual(["/test/dir1", "/test/dir2"]);
    expect(mockDirectoryService.listDirectories).toHaveBeenCalledWith(".", { recursive: true });
  });

  test("POST /create should create a directory", async () => {
    const response = await request(app)
      .post("/api/directory/create")
      .send({ directoryPath: "/test/newdir" });
    expect(response.status).toBe(200);

    const parsedResponse = messageResponseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("Directory /test/newdir created successfully");
    expect(mockDirectoryService.createDirectory).toHaveBeenCalledWith("/test/newdir");
  });

  test("POST /rename should rename a directory", async () => {
    const response = await request(app)
      .post("/api/directory/rename")
      .send({ oldPath: "/test/dir1", newPath: "/test/dirRenamed" });
    expect(response.status).toBe(200);

    const parsedResponse = messageResponseSchema.parse(response.body);
    expect(parsedResponse.message).toBe(
      "Directory /test/dir1 renamed to /test/dirRenamed successfully",
    );
    expect(mockDirectoryService.renameDirectory).toHaveBeenCalledWith(
      "/test/dir1",
      "/test/dirRenamed",
    );
  });

  test("POST /move should move a directory", async () => {
    const response = await request(app)
      .post("/api/directory/move")
      .send({ oldPath: "/test/dir2", newPath: "/test/dir2Moved" });
    expect(response.status).toBe(200);

    const parsedResponse = messageResponseSchema.parse(response.body);
    expect(parsedResponse.message).toBe(
      "Directory /test/dir2 moved to /test/dir2Moved successfully",
    );
    expect(mockDirectoryService.moveDirectory).toHaveBeenCalledWith(
      "/test/dir2",
      "/test/dir2Moved",
    );
  });

  test("DELETE /remove should delete a directory", async () => {
    const response = await request(app)
      .delete("/api/directory/remove")
      .send({ directoryPath: "/test/dir1" });
    expect(response.status).toBe(200);

    const parsedResponse = messageResponseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("Directory /test/dir1 deleted successfully");
    expect(mockDirectoryService.deleteDirectory).toHaveBeenCalledWith("/test/dir1");
  });
});
