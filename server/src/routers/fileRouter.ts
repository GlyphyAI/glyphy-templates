import { Router } from "express";
import { z } from "zod";
import { listOptionsSchema } from "~/models/fs";
import { asyncHandler } from "~/utils/asyncHandler";

import type { IFileService } from "~/services/fileService";

const filesSchema = listOptionsSchema.extend({
  directory: z.string(),
});

const fileSchema = z.object({
  filePath: z.string(),
  content: z.string().optional(),
});

const renameMoveSchema = z.object({
  oldPath: z.string(),
  newPath: z.string(),
});

class FileRouter {
  public router: Router;

  constructor(private fileService: IFileService) {
    this.router = Router();
    this.routes();
  }

  private routes() {
    this.router.get(
      "/list",
      asyncHandler(async (req, res) => {
        const {
          directory,
          includePatterns: globs,
          excludePatterns: ignore,
          recursive,
        } = filesSchema.parse(req.query);
        const files = await this.fileService.listFiles(directory, {
          includePatterns: globs,
          excludePatterns: ignore,
          recursive,
        });
        res.json(files);
      }),
    );

    this.router.post(
      "/create",
      asyncHandler(async (req, res) => {
        const { filePath, content } = fileSchema.parse(req.body);
        await this.fileService.createFile(filePath, content ?? "");
        res.json({ message: `File ${filePath} created successfully` });
      }),
    );

    this.router.put(
      "/update",
      asyncHandler(async (req, res) => {
        const { filePath, content } = fileSchema.parse(req.body);
        await this.fileService.updateFile(filePath, content ?? "");
        res.json({ message: `File ${filePath} updated successfully` });
      }),
    );

    this.router.post(
      "/rename",
      asyncHandler(async (req, res) => {
        const { oldPath, newPath } = renameMoveSchema.parse(req.body);
        await this.fileService.renameFile(oldPath, newPath);
        res.json({ message: `File ${oldPath} renamed to ${newPath} successfully` });
      }),
    );

    this.router.post(
      "/move",
      asyncHandler(async (req, res) => {
        const { oldPath, newPath } = renameMoveSchema.parse(req.body);
        await this.fileService.moveFile(oldPath, newPath);
        res.json({ message: `File ${oldPath} moved to ${newPath} successfully` });
      }),
    );

    this.router.delete(
      "/remove",
      asyncHandler(async (req, res) => {
        const { filePath } = fileSchema.parse(req.body);
        await this.fileService.deleteFile(filePath);
        res.json({ message: `File ${filePath} deleted successfully` });
      }),
    );
  }
}

export default FileRouter;
