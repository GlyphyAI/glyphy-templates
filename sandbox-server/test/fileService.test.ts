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

  test("readFiles should read multiple files", async () => {
    const files = await fileService.readFiles([
      { path: "/test/file1.txt" },
      { path: "/test/file2.txt" },
    ]);
    expect(files).toEqual([
      { path: "/test/file1.txt", content: "Hello, World!" },
      { path: "/test/file2.txt", content: "Hello, Jest!" },
    ]);
  });

  test("updateFiles should update multiple files", async () => {
    await fileService.updateFiles([
      { path: "/test/file1.txt", content: "Updated content 1" },
      { path: "/test/file2.txt", content: "Updated content 2" },
    ]);
    const content1 = await fs.readFile("/test/file1.txt", "utf-8");
    const content2 = await fs.readFile("/test/file2.txt", "utf-8");
    expect(content1).toBe("Updated content 1");
    expect(content2).toBe("Updated content 2");
  });

  test("deleteFiles should delete multiple files", async () => {
    await fileService.deleteFiles([{ path: "/test/file1.txt" }, { path: "/test/file2.txt" }]);
    const exists1 = await fs.pathExists("/test/file1.txt");
    const exists2 = await fs.pathExists("/test/file2.txt");
    expect(exists1).toBe(false);
    expect(exists2).toBe(false);
  });

  test("moveFiles should move multiple files", async () => {
    await fileService.moveFiles([
      { oldPath: "/test/file1.txt", newPath: "/test/dir/file1.txt" },
      { oldPath: "/test/file2.txt", newPath: "/test/dir/file2.txt" },
    ]);
    const existsOld1 = await fs.pathExists("/test/file1.txt");
    const existsOld2 = await fs.pathExists("/test/file2.txt");
    const existsNew1 = await fs.pathExists("/test/dir/file1.txt");
    const existsNew2 = await fs.pathExists("/test/dir/file2.txt");
    expect(existsOld1).toBe(false);
    expect(existsOld2).toBe(false);
    expect(existsNew1).toBe(true);
    expect(existsNew2).toBe(true);
  });

  test("renameFiles should rename multiple files", async () => {
    await fileService.renameFiles([
      { oldPath: "/test/file1.txt", newPath: "/test/file1_renamed.txt" },
      { oldPath: "/test/file2.txt", newPath: "/test/file2_renamed.txt" },
    ]);
    const existsOld1 = await fs.pathExists("/test/file1.txt");
    const existsOld2 = await fs.pathExists("/test/file2.txt");
    const existsNew1 = await fs.pathExists("/test/file1_renamed.txt");
    const existsNew2 = await fs.pathExists("/test/file2_renamed.txt");
    expect(existsOld1).toBe(false);
    expect(existsOld2).toBe(false);
    expect(existsNew1).toBe(true);
    expect(existsNew2).toBe(true);
  });
});
