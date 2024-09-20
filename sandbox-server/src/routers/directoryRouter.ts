import { Router, json as jsonParser } from "express";
import { z } from "zod";
import { listOptionsSchema } from "~/models/fs";
import { asyncHandler } from "~/utils/asyncHandler";

import type { IDirectoryService } from "~/services/directoryService";

const dirsSchema = listOptionsSchema.extend({
  path: z.string(),
});

const renameMoveSchema = z.object({
  oldPath: z.string(),
  newPath: z.string(),
});

const directoryPathSchema = z.object({
  path: z.string(),
});

export default class DirectoryRouter {
  public readonly router: Router;

  constructor(private directoryService: IDirectoryService) {
    this.router = Router();
    this.router.use(jsonParser());
    this.routes();
  }

  private routes() {
    this.router.get(
      "/list",
      asyncHandler(async (req, res) => {
        const { path, includePatterns, excludePatterns, recursive } = dirsSchema.parse(req.query);
        const directories = await this.directoryService.listDirectories(path, {
          includePatterns,
          excludePatterns,
          recursive,
        });

        res.json(directories);
      }),
    );

    this.router.post(
      "/create",
      asyncHandler(async (req, res) => {
        const { path } = directoryPathSchema.parse(req.body);
        await this.directoryService.createDirectory(path);
        res.json({ message: `Directory ${path} created successfully` });
      }),
    );

    this.router.post(
      "/rename",
      asyncHandler(async (req, res) => {
        const { oldPath, newPath } = renameMoveSchema.parse(req.body);
        await this.directoryService.renameDirectory(oldPath, newPath);
        res.json({ message: `Directory ${oldPath} renamed to ${newPath} successfully` });
      }),
    );

    this.router.post(
      "/move",
      asyncHandler(async (req, res) => {
        const { oldPath, newPath } = renameMoveSchema.parse(req.body);
        await this.directoryService.moveDirectory(oldPath, newPath);
        res.json({ message: `Directory ${oldPath} moved to ${newPath} successfully` });
      }),
    );

    this.router.delete(
      "/delete",
      asyncHandler(async (req, res) => {
        const { path } = directoryPathSchema.parse(req.body);
        await this.directoryService.deleteDirectory(path);
        res.json({ message: `Directory ${path} deleted successfully` });
      }),
    );
  }
}
