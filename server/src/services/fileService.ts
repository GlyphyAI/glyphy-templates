import fg from "fast-glob";
import fs from "fs-extra";
import type { ListOptions } from "~/models/fs";
import { unwrapErrorMessage } from "~/utils/zodErrors";

export interface IFileService {
  listFiles(directory: string, options?: ListOptions): Promise<string[]>;
  createFile(filePath: string, content: string): Promise<void>;
  deleteFile(filePath: string): Promise<void>;
  updateFile(filePath: string, content: string): Promise<void>;
  renameFile(oldPath: string, newPath: string): Promise<void>;
  moveFile(oldPath: string, newPath: string): Promise<void>;
}

export class FileService implements IFileService {
  async listFiles(directory: string, options: ListOptions = {}): Promise<string[]> {
    try {
      const patterns = options.includePatterns ?? ["*"];
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

  async createFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.outputFile(filePath, content);
    } catch (error) {
      throw new Error(unwrapErrorMessage(error));
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      throw new Error(unwrapErrorMessage(error));
    }
  }

  async updateFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.outputFile(filePath, content);
    } catch (error) {
      throw new Error(unwrapErrorMessage(error));
    }
  }

  async renameFile(oldPath: string, newPath: string): Promise<void> {
    try {
      await fs.rename(oldPath, newPath);
    } catch (error) {
      throw new Error(unwrapErrorMessage(error));
    }
  }

  async moveFile(oldPath: string, newPath: string): Promise<void> {
    try {
      await fs.move(oldPath, newPath);
    } catch (error) {
      throw new Error(unwrapErrorMessage(error));
    }
  }
}
