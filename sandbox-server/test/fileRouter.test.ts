/* eslint-disable @typescript-eslint/unbound-method */

import express from "express";
import request from "supertest";
import FileRouter from "~/routers/fileRouter";

import { z } from "zod";

import type { IFileService } from "~/services/fileService";

const mockFileService: jest.Mocked<IFileService> = {
  listFiles: jest.fn().mockResolvedValue(["file1.txt", "file2.txt"]),
  readFiles: jest.fn().mockResolvedValue([
    { path: "file1.txt", content: "Content 1" },
    { path: "file2.txt", content: "Content 2" },
  ]),
  updateFiles: jest.fn().mockResolvedValue(undefined),
  deleteFiles: jest.fn().mockResolvedValue(undefined),
  moveFiles: jest.fn().mockResolvedValue(undefined),
  renameFiles: jest.fn().mockResolvedValue(undefined),
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

  test("POST /read should read multiple files", async () => {
    const response = await request(app)
      .post("/api/file/read")
      .send([{ path: "file1.txt" }, { path: "file2.txt" }]);
    expect(response.status).toBe(200);

    const parsedResponse = z
      .array(z.object({ path: z.string(), content: z.string() }))
      .parse(response.body);
    expect(parsedResponse).toEqual([
      { path: "file1.txt", content: "Content 1" },
      { path: "file2.txt", content: "Content 2" },
    ]);
    expect(mockFileService.readFiles).toHaveBeenCalledWith([
      { path: "file1.txt" },
      { path: "file2.txt" },
    ]);
  });

  test("PUT /update should update multiple files", async () => {
    const response = await request(app)
      .put("/api/file/update")
      .send([
        { path: "file1.txt", content: "Updated content 1" },
        { path: "file2.txt", content: "Updated content 2" },
      ]);
    expect(response.status).toBe(200);

    const parsedResponse = messageResponseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("Files updated successfully");
    expect(mockFileService.updateFiles).toHaveBeenCalledWith([
      { path: "file1.txt", content: "Updated content 1" },
      { path: "file2.txt", content: "Updated content 2" },
    ]);
  });

  test("DELETE /delete should delete multiple files", async () => {
    const response = await request(app)
      .delete("/api/file/delete")
      .send([{ path: "file1.txt" }, { path: "file2.txt" }]);
    expect(response.status).toBe(200);

    const parsedResponse = messageResponseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("Files deleted successfully");
    expect(mockFileService.deleteFiles).toHaveBeenCalledWith([
      { path: "file1.txt" },
      { path: "file2.txt" },
    ]);
  });

  test("POST /move should move multiple files", async () => {
    const response = await request(app)
      .post("/api/file/move")
      .send([
        { oldPath: "file1.txt", newPath: "new/file1.txt" },
        { oldPath: "file2.txt", newPath: "new/file2.txt" },
      ]);
    expect(response.status).toBe(200);

    const parsedResponse = messageResponseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("Files moved successfully");
    expect(mockFileService.moveFiles).toHaveBeenCalledWith([
      { oldPath: "file1.txt", newPath: "new/file1.txt" },
      { oldPath: "file2.txt", newPath: "new/file2.txt" },
    ]);
  });

  test("POST /rename should rename multiple files", async () => {
    const response = await request(app)
      .post("/api/file/rename")
      .send([
        { oldPath: "file1.txt", newPath: "file1_renamed.txt" },
        { oldPath: "file2.txt", newPath: "file2_renamed.txt" },
      ]);
    expect(response.status).toBe(200);

    const parsedResponse = messageResponseSchema.parse(response.body);
    expect(parsedResponse.message).toBe("Files renamed successfully");
    expect(mockFileService.renameFiles).toHaveBeenCalledWith([
      { oldPath: "file1.txt", newPath: "file1_renamed.txt" },
      { oldPath: "file2.txt", newPath: "file2_renamed.txt" },
    ]);
  });
});
