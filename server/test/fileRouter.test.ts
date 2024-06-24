/* eslint-disable @typescript-eslint/unbound-method */

import express from "express";
import request from "supertest";
import FileRouter from "~/routers/fileRouter";

import { z } from "zod";

import type { IFileService } from "~/services/fileService";

const mockFileService: jest.Mocked<IFileService> = {
  listFiles: jest.fn().mockResolvedValue(["file1.txt", "file2.txt"]),
  createFile: jest.fn().mockResolvedValue(undefined),
  updateFile: jest.fn().mockResolvedValue(undefined),
  renameFile: jest.fn().mockResolvedValue(undefined),
  moveFile: jest.fn().mockResolvedValue(undefined),
  deleteFile: jest.fn().mockResolvedValue(undefined),
};

const filesResponseSchema = z.array(z.string());
const messageResponseSchema = z.object({
  message: z.string(),
});

describe("FileRouter", () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    const fileRouter = new FileRouter(mockFileService);
    app.use("/api/file", fileRouter.router);
  });

  test("GET /list should list files", async () => {
    const response = await request(app)
      .get("/api/file/list")
      .query({ directory: ".", recursive: true });
    expect(response.status).toBe(200);

    const parsedResponse = filesResponseSchema.parse(response.body);
    expect(parsedResponse).toEqual(["file1.txt", "file2.txt"]);
    expect(mockFileService.listFiles).toHaveBeenCalledWith(".", { recursive: true });
  });

  test("POST /create should create a file", async () => {
    const response = await request(app)
      .post("/api/file/create")
      .send({ filePath: "file1.txt", content: "Hello, World!" });
    expect(response.status).toBe(200);

    const parsedResponse = messageResponseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("File file1.txt created successfully");
    expect(mockFileService.createFile).toHaveBeenCalledWith("file1.txt", "Hello, World!");
  });

  test("PUT /update should update a file", async () => {
    const response = await request(app)
      .put("/api/file/update")
      .send({ filePath: "file1.txt", content: "Updated content" });
    expect(response.status).toBe(200);

    const parsedResponse = messageResponseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("File file1.txt updated successfully");
    expect(mockFileService.updateFile).toHaveBeenCalledWith("file1.txt", "Updated content");
  });

  test("POST /rename should rename a file", async () => {
    const response = await request(app)
      .post("/api/file/rename")
      .send({ oldPath: "file1.txt", newPath: "file2.txt" });
    expect(response.status).toBe(200);

    const parsedResponse = messageResponseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("File file1.txt renamed to file2.txt successfully");
    expect(mockFileService.renameFile).toHaveBeenCalledWith("file1.txt", "file2.txt");
  });

  test("POST /move should move a file", async () => {
    const response = await request(app)
      .post("/api/file/move")
      .send({ oldPath: "file1.txt", newPath: "new/file1.txt" });
    expect(response.status).toBe(200);

    const parsedResponse = messageResponseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("File file1.txt moved to new/file1.txt successfully");
    expect(mockFileService.moveFile).toHaveBeenCalledWith("file1.txt", "new/file1.txt");
  });

  test("DELETE /remove should delete a file", async () => {
    const response = await request(app).delete("/api/file/remove").send({ filePath: "file1.txt" });
    expect(response.status).toBe(200);

    const parsedResponse = messageResponseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("File file1.txt deleted successfully");
    expect(mockFileService.deleteFile).toHaveBeenCalledWith("file1.txt");
  });
});
