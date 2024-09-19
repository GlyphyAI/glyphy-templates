import { Router } from "express";
import { z } from "zod";
import { listOptionsSchema } from "~/models/fs";
import { asyncHandler } from "~/utils/asyncHandler";

import type { IFileService } from "~/services/fileService";

const filesSchema = listOptionsSchema.extend({
  directory: z.string(),
});

const fileOperationSchema = z.object({
  path: z.string(),
  content: z.string().optional(),
});

const moveOperationSchema = z.object({
  oldPath: z.string(),
  newPath: z.string(),
});

export default class FileRouter {
  public readonly router: Router;

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
      "/read",
      asyncHandler(async (req, res) => {
        const files = z.array(fileOperationSchema).parse(req.body);
        const contents = await this.fileService.readFiles(files);
        res.json(contents);
      }),
    );

    this.router.put(
      "/update",
      asyncHandler(async (req, res) => {
        const files = z.array(fileOperationSchema).parse(req.body);
        await this.fileService.updateFiles(files);
        res.json({ message: "Files updated successfully" });
      }),
    );

    this.router.delete(
      "/delete",
      asyncHandler(async (req, res) => {
        const files = z.array(fileOperationSchema).parse(req.body);
        await this.fileService.deleteFiles(files);
        res.json({ message: "Files deleted successfully" });
      }),
    );

    this.router.post(
      "/move",
      asyncHandler(async (req, res) => {
        const operations = z.array(moveOperationSchema).parse(req.body);
        await this.fileService.moveFiles(operations);
        res.json({ message: "Files moved successfully" });
      }),
    );

    this.router.post(
      "/rename",
      asyncHandler(async (req, res) => {
        const operations = z.array(moveOperationSchema).parse(req.body);
        await this.fileService.renameFiles(operations);
        res.json({ message: "Files renamed successfully" });
      }),
    );
  }
}
