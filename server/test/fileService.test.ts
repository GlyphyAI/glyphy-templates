import fs from "fs-extra";
import mock from "mock-fs";

import { FileService } from "~/services/fileService";

describe("FileService", () => {
  let fileService: FileService;

  beforeEach(() => {
    fileService = new FileService();
    mock({
      "/test": {
        "file1.txt": "Hello, World!",
        "file2.txt": "Hello, Jest!",
        dir: {},
      },
    });
  });

  afterEach(() => {
    mock.restore();
  });

  test("listFiles should list files in the directory", async () => {
    const files = await fileService.listFiles("/test");
    expect(files).toContain("/test/file1.txt");
    expect(files).toContain("/test/file2.txt");
  });

  test("createFile should create a file with content", async () => {
    await fileService.createFile("/test/newfile.txt", "New file content");
    const content = await fs.promises.readFile("/test/newfile.txt", "utf-8");
    expect(content).toBe("New file content");
  });

  test("deleteFile should delete the specified file", async () => {
    await fileService.deleteFile("/test/file1.txt");
    const exists = await fs.promises
      .access("/test/file1.txt")
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(false);
  });

  test("updateFile should update the file content", async () => {
    await fileService.updateFile("/test/file1.txt", "Updated content");
    const content = await fs.promises.readFile("/test/file1.txt", "utf-8");
    expect(content).toBe("Updated content");
  });

  test("renameFile should rename the file", async () => {
    await fileService.renameFile("/test/file1.txt", "/test/file3.txt");
    const existsOld = await fs.promises
      .access("/test/file1.txt")
      .then(() => true)
      .catch(() => false);
    const existsNew = await fs.promises
      .access("/test/file3.txt")
      .then(() => true)
      .catch(() => false);
    expect(existsOld).toBe(false);
    expect(existsNew).toBe(true);
  });

  test("moveFile should move the file", async () => {
    await fileService.moveFile("/test/file1.txt", "/test/dir/file1.txt");
    const existsOld = await fs.promises
      .access("/test/file1.txt")
      .then(() => true)
      .catch(() => false);
    const existsNew = await fs.promises
      .access("/test/dir/file1.txt")
      .then(() => true)
      .catch(() => false);
    expect(existsOld).toBe(false);
    expect(existsNew).toBe(true);
  });
});
