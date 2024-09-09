import fs from "fs-extra";
import mock from "mock-fs";

import { DirectoryService } from "~/services/directoryService";

describe("DirectoryService", () => {
  let directoryService: DirectoryService;

  beforeEach(() => {
    directoryService = new DirectoryService();
    mock({
      "/test": {
        dir1: {},
        dir2: {},
        "file.txt": "file content",
        nested: {
          dir3: {},
          dir4: {},
        },
      },
    });
  });

  afterEach(() => {
    mock.restore();
  });

  test("listDirectories should list directories in the directory", async () => {
    const directories = await directoryService.listDirectories("/test");
    expect(directories).toContain("/test/dir1");
    expect(directories).toContain("/test/dir2");
    expect(directories).toContain("/test/nested");
  });

  test("listDirectories should list directories recursively", async () => {
    const directories = await directoryService.listDirectories("/test", { recursive: true });
    expect(directories).toContain("/test/dir1");
    expect(directories).toContain("/test/dir2");
    expect(directories).toContain("/test/nested");
    expect(directories).toContain("/test/nested/dir3");
    expect(directories).toContain("/test/nested/dir4");
  });

  test("createDirectory should create a directory", async () => {
    await directoryService.createDirectory("/test/newdir");
    const exists = await fs.promises
      .access("/test/newdir")
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });

  test("renameDirectory should rename the directory", async () => {
    await directoryService.renameDirectory("/test/dir1", "/test/dirRenamed");
    const existsOld = await fs.promises
      .access("/test/dir1")
      .then(() => true)
      .catch(() => false);
    const existsNew = await fs.promises
      .access("/test/dirRenamed")
      .then(() => true)
      .catch(() => false);
    expect(existsOld).toBe(false);
    expect(existsNew).toBe(true);
  });

  test("moveDirectory should move the directory", async () => {
    await directoryService.moveDirectory("/test/dir2", "/test/nested/dir2Moved");
    const existsOld = await fs.promises
      .access("/test/dir2")
      .then(() => true)
      .catch(() => false);
    const existsNew = await fs.promises
      .access("/test/nested/dir2Moved")
      .then(() => true)
      .catch(() => false);
    expect(existsOld).toBe(false);
    expect(existsNew).toBe(true);
  });

  test("deleteDirectory should delete the directory", async () => {
    await directoryService.deleteDirectory("/test/dir1");
    const exists = await fs.promises
      .access("/test/dir1")
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(false);
  });
});
