import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "~/utils/asyncHandler";

import type { IFileService } from "~/services/fileService";

const parseCommaSeparated = (val: unknown) => (typeof val === "string" ? val.split(",") : val);

const listingSchema = z.object({
  directory: z.string(),
  includePatterns: z.preprocess(parseCommaSeparated, z.array(z.string()).optional()),
  excludePatterns: z.preprocess(parseCommaSeparated, z.array(z.string()).optional()),
  recursive: z.preprocess((val) => val === "true", z.boolean().optional()),
});

const fileSchema = z.object({
  filePath: z.string(),
  content: z.string().optional(),
});

const renameMoveSchema = z.object({
  oldPath: z.string(),
  newPath: z.string(),
});

const directoryPathSchema = z.object({
  directoryPath: z.string(),
});

class FileRouter {
  public router: Router;

  constructor(private fileService: IFileService) {
    this.router = Router();
    this.routes();
  }

  private routes() {
    this.filesRoutes();
    this.directoriesRoutes();
  }

  private filesRoutes() {
    this.router.get(
      "/files/list",
      asyncHandler(async (req, res) => {
        const {
          directory,
          includePatterns: globs,
          excludePatterns: ignore,
          recursive,
        } = listingSchema.parse(req.query);
        const files = await this.fileService.listFiles(directory, {
          includePatterns: globs,
          excludePatterns: ignore,
          recursive,
        });
        res.json(files);
      }),
    );

    this.router.post(
      "/files/create",
      asyncHandler(async (req, res) => {
        const { filePath, content } = fileSchema.parse(req.body);
        await this.fileService.createFile(filePath, content ?? "");
        res.json({ message: `File ${filePath} created successfully` });
      }),
    );

    this.router.put(
      "/files/update",
      asyncHandler(async (req, res) => {
        const { filePath, content } = fileSchema.parse(req.body);
        await this.fileService.updateFile(filePath, content ?? "");
        res.json({ message: `File ${filePath} updated successfully` });
      }),
    );

    this.router.post(
      "/files/rename",
      asyncHandler(async (req, res) => {
        const { oldPath, newPath } = renameMoveSchema.parse(req.body);
        await this.fileService.renameFile(oldPath, newPath);
        res.json({ message: `File ${oldPath} renamed to ${newPath} successfully` });
      }),
    );

    this.router.post(
      "/files/move",
      asyncHandler(async (req, res) => {
        const { oldPath, newPath } = renameMoveSchema.parse(req.body);
        await this.fileService.moveFile(oldPath, newPath);
        res.json({ message: `File ${oldPath} moved to ${newPath} successfully` });
      }),
    );

    this.router.delete(
      "/files/remove",
      asyncHandler(async (req, res) => {
        const { filePath } = fileSchema.parse(req.body);
        await this.fileService.deleteFile(filePath);
        res.json({ message: `File ${filePath} deleted successfully` });
      }),
    );
  }

  private directoriesRoutes() {
    this.router.get(
      "/directories/list",
      asyncHandler(async (req, res) => {
        const {
          directory,
          includePatterns: globs,
          excludePatterns: ignore,
          recursive,
        } = listingSchema.parse(req.query);
        const directories = await this.fileService.listDirectories(directory, {
          includePatterns: globs,
          excludePatterns: ignore,
          recursive,
        });
        res.json(directories);
      }),
    );

    this.router.post(
      "/directories/create",
      asyncHandler(async (req, res) => {
        const { directoryPath } = directoryPathSchema.parse(req.body);
        await this.fileService.createDirectory(directoryPath);
        res.json({ message: `Directory ${directoryPath} created successfully` });
      }),
    );

    this.router.post(
      "/directories/rename",
      asyncHandler(async (req, res) => {
        const { oldPath, newPath } = renameMoveSchema.parse(req.body);
        await this.fileService.renameFile(oldPath, newPath);
        res.json({ message: `Directory ${oldPath} renamed to ${newPath} successfully` });
      }),
    );

    this.router.post(
      "/directories/move",
      asyncHandler(async (req, res) => {
        const { oldPath, newPath } = renameMoveSchema.parse(req.body);
        await this.fileService.moveFile(oldPath, newPath);
        res.json({ message: `Directory ${oldPath} moved to ${newPath} successfully` });
      }),
    );

    this.router.delete(
      "/directories/remove",
      asyncHandler(async (req, res) => {
        const { directoryPath } = directoryPathSchema.parse(req.body);
        await this.fileService.deleteDirectory(directoryPath);
        res.json({ message: `Directory ${directoryPath} deleted successfully` });
      }),
    );
  }
}

export default FileRouter;
