import { Router } from "express";
import { z } from "zod";
import { FileService } from "~/services/fileService";
import { asyncHandler } from "~/utils/asyncHandler";

import type { Request, Response } from "express";

const router = Router();
const fileService = new FileService();

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

// MARK: - Files routes

router.get(
  "/files/list",
  asyncHandler(async (req: Request, res: Response) => {
    const {
      directory,
      includePatterns: globs,
      excludePatterns: ignore,
      recursive,
    } = listingSchema.parse(req.query);
    const files = await fileService.listFiles(directory, {
      includePatterns: globs,
      excludePatterns: ignore,
      recursive,
    });
    res.json(files);
  }),
);

router.post(
  "/files/create",
  asyncHandler(async (req: Request, res: Response) => {
    const { filePath, content } = fileSchema.parse(req.body);
    await fileService.createFile(filePath, content ?? "");
    res.json({ message: `File ${filePath} created successfully` });
  }),
);

router.put(
  "/files/update",
  asyncHandler(async (req: Request, res: Response) => {
    const { filePath, content } = fileSchema.parse(req.body);
    await fileService.updateFile(filePath, content ?? "");
    res.json({ message: `File ${filePath} updated successfully` });
  }),
);

router.post(
  "/files/rename",
  asyncHandler(async (req: Request, res: Response) => {
    const { oldPath, newPath } = renameMoveSchema.parse(req.body);
    await fileService.renameFile(oldPath, newPath);
    res.json({ message: `File ${oldPath} renamed to ${newPath} successfully` });
  }),
);

router.post(
  "/files/move",
  asyncHandler(async (req: Request, res: Response) => {
    const { oldPath, newPath } = renameMoveSchema.parse(req.body);
    await fileService.moveFile(oldPath, newPath);
    res.json({ message: `File ${oldPath} moved to ${newPath} successfully` });
  }),
);

router.delete(
  "/files/remove",
  asyncHandler(async (req: Request, res: Response) => {
    const { filePath } = fileSchema.parse(req.body);
    await fileService.deleteFile(filePath);
    res.json({ message: `File ${filePath} deleted successfully` });
  }),
);

// MARK: - Directories routes

router.get(
  "/directories/list",
  asyncHandler(async (req: Request, res: Response) => {
    const {
      directory,
      includePatterns: globs,
      excludePatterns: ignore,
      recursive,
    } = listingSchema.parse(req.query);
    const directories = await fileService.listDirectories(directory, {
      includePatterns: globs,
      excludePatterns: ignore,
      recursive,
    });
    res.json(directories);
  }),
);

router.post(
  "/directories/create",
  asyncHandler(async (req: Request, res: Response) => {
    const { directoryPath } = directoryPathSchema.parse(req.body);
    await fileService.createDirectory(directoryPath);
    res.json({ message: `Directory ${directoryPath} created successfully` });
  }),
);

router.post(
  "/directories/rename",
  asyncHandler(async (req: Request, res: Response) => {
    const { oldPath, newPath } = renameMoveSchema.parse(req.body);
    await fileService.renameFile(oldPath, newPath);
    res.json({ message: `Directory ${oldPath} renamed to ${newPath} successfully` });
  }),
);

router.post(
  "/directories/move",
  asyncHandler(async (req: Request, res: Response) => {
    const { oldPath, newPath } = renameMoveSchema.parse(req.body);
    await fileService.moveFile(oldPath, newPath);
    res.json({ message: `Directory ${oldPath} moved to ${newPath} successfully` });
  }),
);

router.delete(
  "/directories/remove",
  asyncHandler(async (req: Request, res: Response) => {
    const { directoryPath } = directoryPathSchema.parse(req.body);
    await fileService.deleteDirectory(directoryPath);
    res.json({ message: `Directory ${directoryPath} deleted successfully` });
  }),
);

export default router;
