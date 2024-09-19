import fg from "fast-glob";
import fs from "fs-extra";

import { unwrapErrorMessage } from "~/utils/zodErrors";

import type { ListOptions } from "~/models/fs";

export interface FileOperation {
  path: string;
  content?: string;
}

export interface MoveOperation {
  oldPath: string;
  newPath: string;
}

export interface IFileService {
  listFiles(directory: string, options?: ListOptions): Promise<string[]>;
  readFiles(files: FileOperation[]): Promise<FileOperation[]>;
  updateFiles(files: FileOperation[]): Promise<void>;
  deleteFiles(files: FileOperation[]): Promise<void>;
  moveFiles(operations: MoveOperation[]): Promise<void>;
  renameFiles(operations: MoveOperation[]): Promise<void>;
}

export class FileService implements IFileService {
  async listFiles(directory: string, options: ListOptions = {}): Promise<string[]> {
    try {
      const patterns = options.includePatterns ?? ["**/*"];
      const ignore = options.excludePatterns ?? [];
      const files: string[] = [];

      for (const pattern of patterns) {
        const entries = await fg(pattern, {
          cwd: directory,
          onlyFiles: true,
          absolute: true,
          dot: true,
          ignore,
          deep: options.recursive ? Infinity : 1,
        });

        files.push(...entries);
      }

      return files;
    } catch (error) {
      throw new Error(unwrapErrorMessage(error));
    }
  }

  async readFiles(files: FileOperation[]): Promise<FileOperation[]> {
    try {
      return await Promise.all(
        files.map(async (file) => ({
          path: file.path,
          content: await fs.readFile(file.path, "utf-8"),
        })),
      );
    } catch (error) {
      throw new Error(unwrapErrorMessage(error));
    }
  }

  async updateFiles(files: FileOperation[]): Promise<void> {
    try {
      await Promise.all(files.map((file) => fs.outputFile(file.path, file.content ?? "")));
    } catch (error) {
      throw new Error(unwrapErrorMessage(error));
    }
  }

  async deleteFiles(files: FileOperation[]): Promise<void> {
    try {
      await Promise.all(files.map((file) => fs.unlink(file.path)));
    } catch (error) {
      throw new Error(unwrapErrorMessage(error));
    }
  }

  async moveFiles(operations: MoveOperation[]): Promise<void> {
    try {
      await Promise.all(operations.map((op) => fs.move(op.oldPath, op.newPath)));
    } catch (error) {
      throw new Error(unwrapErrorMessage(error));
    }
  }

  async renameFiles(operations: MoveOperation[]): Promise<void> {
    try {
      await Promise.all(operations.map((op) => fs.rename(op.oldPath, op.newPath)));
    } catch (error) {
      throw new Error(unwrapErrorMessage(error));
    }
  }
}
